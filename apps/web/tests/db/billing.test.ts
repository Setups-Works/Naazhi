import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool, withUser } from "../../src/server/db/pool";
import { ConflictError, ForbiddenError, ValidationError } from "../../src/server/errors";
import { applyCredit, getCredit, recentLedger } from "../../src/server/repositories/billing.repository";
import { createInvoice, getInvoice, listInvoices } from "../../src/server/repositories/invoices.repository";
import { invoiceLink, issueInvoice, recordRefund, verifyInvoiceLink } from "../../src/server/services/billing/invoices.service";
import {
  adminSetUserPlan,
  adminUpdatePlan,
  aiAccessFor,
  cancelPlan,
  choosePlan,
  getMyBilling,
  resumePlan,
  saveByoKey,
  startTopup,
  adminAdjustCredit,
  adminSaveSettings,
  getTopupLimits,
} from "../../src/server/services/billing/billing.service";

/**
 * Plans, metering and the own-key plan against the real PostgreSQL with Row-Level Security.
 * Run with `corepack pnpm test:db` (needs `docker compose up -d` and `corepack pnpm db:migrate`).
 */
const run = Date.now().toString(36);
const user = { a: "", b: "" };
let original: { included_tokens: number } | undefined;

beforeAll(async () => {
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-the-vault-0123456789";
  for (const tag of ["a", "b"] as const) {
    const { rows } = await pool().query<{ id: string }>("insert into auth.users (name, email) values ($1, $2) returning id", [
      `bill ${tag}`,
      `bill-${tag}-${run}@example.test`,
    ]);
    user[tag] = rows[0].id;
  }
  original = (await pool().query<{ included_tokens: number }>("select included_tokens::int from public.billing_plans where id = 'subscription'")).rows[0];
});

afterAll(async () => {
  await pool().query("update public.billing_plans set included_tokens = $1 where id = 'subscription'", [original?.included_tokens ?? 1_000_000]);
  await pool().query("delete from auth.users where email like $1", [`bill-%-${run}@example.test`]);
  await pool().end();
});

describe("plans", () => {
  it("starts with no plan and AI as before", async () => {
    const b = await getMyBilling(user.a);
    expect(b).toMatchObject({ plan: null, status: "none", payments_connected: false });
    expect(b.plans.map((p) => p.id)).toEqual(["subscription", "payg", "byo"]);
    expect((await aiAccessFor(user.a)).mode).toBe("server");
  });

  it("chooses a subscription with a period, and refuses choosing it twice", async () => {
    const b = await choosePlan(user.a, "subscription");
    expect(b.plan?.id).toBe("subscription");
    expect(b.period_end).not.toBeNull();
    await expect(choosePlan(user.a, "subscription")).rejects.toBeInstanceOf(ConflictError);
  });

  it("cancels a subscription at the end of its period and can resume it", async () => {
    const cancelled = await cancelPlan(user.a);
    expect(cancelled.cancel_at_period_end).toBe(true);
    expect(cancelled.plan?.id).toBe("subscription");
    await expect(cancelPlan(user.a)).rejects.toBeInstanceOf(ConflictError);
    expect((await resumePlan(user.a)).cancel_at_period_end).toBe(false);
  });

  it("lapses a cancelled subscription once its period has ended", async () => {
    await cancelPlan(user.a);
    await pool().query("update public.user_billing set period_end = now() - interval '1 day' where user_id = $1", [user.a]);
    const b = await getMyBilling(user.a);
    expect(b).toMatchObject({ plan: null, status: "canceled" });
  });

  it("renews a subscription whose period ended without a cancellation", async () => {
    await choosePlan(user.a, "subscription");
    await pool().query("update public.user_billing set period_end = now() - interval '2 days' where user_id = $1", [user.a]);
    const b = await getMyBilling(user.a);
    expect(b.plan?.id).toBe("subscription");
    expect(new Date(b.period_end!).getTime()).toBeGreaterThan(Date.now());
  });

  it("stops pay as you go at once when cancelled", async () => {
    await choosePlan(user.a, "payg");
    expect((await cancelPlan(user.a)).status).toBe("canceled");
  });
});

describe("AI access and metering", () => {
  it("counts tokens on pay as you go and prices them from the plan's rate", async () => {
    await choosePlan(user.b, "payg");
    const access = await aiAccessFor(user.b);
    expect(access.mode).toBe("server");
    await access.record({ inputTokens: 400_000, outputTokens: 600_000 }, "groq");
    const b = await getMyBilling(user.b);
    expect(b.tokens_used).toBe(1_000_000);
    expect(b.cost_cents).toBe(b.plan!.token_price_cents_per_million);
  });

  it("stops a subscription at its allowance", async () => {
    await adminUpdatePlan("subscription", { included_tokens: 1000 });
    await choosePlan(user.b, "subscription");
    await (await aiAccessFor(user.b)).record({ inputTokens: 600, outputTokens: 600 }, "groq");
    await expect(aiAccessFor(user.b)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("needs a key on the own-key plan, then uses it without counting anything", async () => {
    await choosePlan(user.b, "byo");
    await expect(aiAccessFor(user.b)).rejects.toBeInstanceOf(ForbiddenError);
    await saveByoKey(user.b, { provider: "openai", model: "gpt-4o-mini", apiKey: "sk-test-1234567890" });
    const access = await aiAccessFor(user.b);
    expect(access).toMatchObject({ mode: "byo", byo: { apiKey: "sk-test-1234567890", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" } });
    const before = (await getMyBilling(user.b)).tokens_used;
    await access.record({ inputTokens: 500, outputTokens: 500 }, "custom");
    expect((await getMyBilling(user.b)).tokens_used).toBe(before);
    const stored = (await pool().query<{ key_cipher: string; key_hint: string }>("select key_cipher, key_hint from public.user_ai_keys where user_id = $1", [user.b])).rows[0];
    expect(stored.key_cipher).not.toContain("sk-test");
    expect(stored.key_hint).toBe("7890");
    expect(JSON.stringify(await getMyBilling(user.b))).not.toContain("sk-test");
  });

  it("only lets a key be saved on the own-key plan", async () => {
    await choosePlan(user.a, "payg");
    await expect(saveByoKey(user.a, { provider: "openai", model: "m", apiKey: "sk-test-1234567890" })).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("row-level security", () => {
  it("lets people read only their own plan and usage", async () => {
    const mine = await withUser(user.b, (c) => c.query("select user_id from public.user_billing"));
    expect(mine.rows.map((r) => r.user_id)).toEqual([user.b]);
    const usage = await withUser(user.a, (c) => c.query("select 1 from public.ai_usage where user_id = $1", [user.b]));
    expect(usage.rowCount).toBe(0);
  });

  it("does not let people write their own plan, usage or plan prices", async () => {
    await expect(withUser(user.a, (c) => c.query("update public.user_billing set plan_id = 'byo' where user_id = $1", [user.a]))).rejects.toThrow();
    await expect(withUser(user.a, (c) => c.query("insert into public.ai_usage (user_id) values ($1)", [user.a]))).rejects.toThrow();
    await expect(withUser(user.a, (c) => c.query("update public.billing_plans set price_cents = 0"))).rejects.toThrow();
  });

  it("keeps the saved keys away from every signed-in user, including their owner", async () => {
    await expect(withUser(user.b, (c) => c.query("select key_cipher from public.user_ai_keys"))).rejects.toThrow();
  });

  it("lets an admin put someone on a plan and take them off", async () => {
    await adminSetUserPlan(user.a, "byo");
    expect((await getMyBilling(user.a)).plan?.id).toBe("byo");
    await adminSetUserPlan(user.a, null);
    expect((await getMyBilling(user.a)).status).toBe("none");
  });
});

describe("AI credit (Pay as you go)", () => {
  const saved = { ...process.env };
  afterAll(() => {
    process.env = { ...saved };
  });

  it("adds a top-up once per payment, even if it is reported twice", async () => {
    expect(await applyCredit(user.b, 10_000, "topup", { ref: `pay_${run}_1` })).toBe(10_000);
    expect(await applyCredit(user.b, 10_000, "topup", { ref: `pay_${run}_1` })).toBeNull();
    expect(await getCredit(user.b)).toBe(10_000);
    expect((await recentLedger(user.b)).filter((l) => l.kind === "topup")).toHaveLength(1);
  });

  it("takes tokens off the balance and pauses AI at zero once payments are live", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "key-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "hook-secret";
    await adminUpdatePlan("payg", { token_price_cents_per_million: 20_000 });
    await choosePlan(user.b, "payg").catch(() => adminSetUserPlan(user.b, "payg"));
    await adminSetUserPlan(user.b, "payg");
    const before = await getCredit(user.b);
    const access = await aiAccessFor(user.b);
    await access.record({ inputTokens: 60, outputTokens: 40 }, "test"); // 100 tokens = 2 paise
    expect(await getCredit(user.b)).toBe(before - 2);
    await applyCredit(user.b, -(await getCredit(user.b)), "adjust");
    await expect(aiAccessFor(user.b)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await getMyBilling(user.b)).credit_cents).toBe(0);
  });

  it("refuses top-ups outside the limits and for anyone not on Pay as you go", async () => {
    await expect(startTopup(user.b, 100)).rejects.toBeInstanceOf(ValidationError);
    await adminSetUserPlan(user.b, "byo");
    await expect(startTopup(user.b, 10_000)).rejects.toBeInstanceOf(ConflictError);
  });

  it("lets people read only their own balance and ledger", async () => {
    const mine = await withUser(user.b, (c) => c.query("select user_id from public.user_ai_credit"));
    expect(mine.rows.every((r) => r.user_id === user.b)).toBe(true);
    await expect(withUser(user.b, (c) => c.query("update public.user_ai_credit set balance_cents = 999999 where user_id = $1", [user.b]))).rejects.toThrow();
    await expect(withUser(user.b, (c) => c.query("insert into public.ai_credit_ledger (user_id, kind, amount_cents) values ($1, 'topup', 1)", [user.b]))).rejects.toThrow();
  });
});

describe("admin: credit settings and adjustments", () => {
  it("saves top-up limits that the billing state and validation then use, and restores the defaults", async () => {
    const before = await getTopupLimits();
    await adminSaveSettings({ topup_min_cents: 10_000, topup_max_cents: 200_000, topup_options_cents: [50_000, 10_000, 10_000] });
    const b = await getMyBilling(user.a);
    expect(b.topup).toEqual({ min_cents: 10_000, max_cents: 200_000, options_cents: [10_000, 50_000] });
    await adminSaveSettings({ topup_min_cents: before.minCents, topup_max_cents: before.maxCents, topup_options_cents: [...before.optionsCents] });
    expect((await getTopupLimits()).minCents).toBe(before.minCents);
  });

  it("adds and removes a person's credit as ledger adjustments", async () => {
    const start = await getCredit(user.a);
    expect(await adminAdjustCredit(user.a, 25_000)).toBe(start + 25_000);
    expect(await adminAdjustCredit(user.a, -10_000)).toBe(start + 15_000);
    const lines = (await recentLedger(user.a)).filter((l) => l.kind === "adjust").map((l) => l.amount_cents);
    expect(lines).toEqual(expect.arrayContaining([25_000, -10_000]));
  });
});

describe("invoices", () => {
  const pay = (n: number) => `pay_inv_${run}_${n}`;
  it("makes one numbered invoice per payment, even if the payment is reported twice", async () => {
    const a = await issueInvoice({ userId: user.a, kind: "topup", description: "AI credit top-up", amountCents: 25_000, paymentId: pay(1), ref: "order_x" });
    expect(a?.number).toMatch(/^NZ-\d{4}-\d{6}$/);
    expect(a?.amount_cents).toBe(25_000);
    expect(await issueInvoice({ userId: user.a, kind: "topup", description: "AI credit top-up", amountCents: 25_000, paymentId: pay(1) })).toBeNull();
    const b = await issueInvoice({ userId: user.a, kind: "subscription", description: "Subscription, monthly", amountCents: 74_900, paymentId: pay(2), periodStart: "2026-11-11T00:00:00Z", periodEnd: "2026-12-11T00:00:00Z" });
    expect(b?.number).not.toBe(a?.number);
    const mine = await listInvoices(user.a);
    expect(mine.map((i) => i.number)).toEqual(expect.arrayContaining([a!.number, b!.number]));
    expect(mine[0].issued_at >= mine[mine.length - 1].issued_at).toBe(true);
  });

  it("lets a person read only their own invoices and never write one", async () => {
    const inv = (await listInvoices(user.a))[0];
    expect(await getInvoice(user.b, inv.id)).toBeNull();
    expect((await listInvoices(user.b)).some((i) => i.id === inv.id)).toBe(false);
    await expect(
      withUser(user.a, (c) => c.query("insert into public.billing_invoices (number, user_id, kind, description, amount_cents, provider_payment_id) values ('X', $1, 'topup', 'x', 1, 'p')", [user.a])),
    ).rejects.toThrow();
    await expect(withUser(user.a, (c) => c.query("update public.billing_invoices set amount_cents = 1 where user_id = $1", [user.a]))).rejects.toThrow();
  });

  it("refuses two invoices for one payment id at the database", async () => {
    await createInvoice({ userId: user.b, kind: "topup", description: "x", amountCents: 100, paymentId: pay(9), ref: null, periodStart: null, periodEnd: null, billToName: "", billToEmail: "" });
    expect(await createInvoice({ userId: user.b, kind: "topup", description: "x", amountCents: 100, paymentId: pay(9), ref: null, periodStart: null, periodEnd: null, billToName: "", billToEmail: "" })).toBeNull();
  });
});

describe("refunds and invoice links", () => {
  const pay = (n: number) => `pay_ref_${run}_${n}`;

  it("records a partial then a full refund against the invoice, and takes a refunded top-up off the credit once", async () => {
    await applyCredit(user.b, 30_000, "topup", { ref: pay(1) });
    const inv = await issueInvoice({ userId: user.b, kind: "topup", description: "AI credit top-up", amountCents: 30_000, paymentId: pay(1), ref: "order_r" });
    const before = await getCredit(user.b);
    expect(await recordRefund(`rfnd_${run}_a`, pay(1), 10_000)).toBe(true);
    expect(await getCredit(user.b)).toBe(before - 10_000);
    expect((await getInvoice(user.b, inv!.id))).toMatchObject({ status: "partially_refunded", refunded_cents: 10_000 });
    // The same refund reported again (webhook after the admin's own call) changes nothing.
    expect(await recordRefund(`rfnd_${run}_a`, pay(1), 10_000)).toBe(false);
    expect(await getCredit(user.b)).toBe(before - 10_000);
    expect(await recordRefund(`rfnd_${run}_b`, pay(1), 20_000)).toBe(true);
    expect((await getInvoice(user.b, inv!.id))).toMatchObject({ status: "refunded", refunded_cents: 30_000 });
    // Nothing is left to refund, and a refund for a payment with no invoice is ignored.
    expect(await recordRefund(`rfnd_${run}_c`, pay(1), 100)).toBe(false);
    expect(await recordRefund(`rfnd_${run}_d`, "pay_unknown", 100)).toBe(false);
  });

  it("opens one invoice for one person for a short time with a signed link, and refuses tampering", async () => {
    const inv = (await listInvoices(user.a))[0];
    const { url } = await invoiceLink(user.a, inv.id);
    const token = new URL(url, "http://x").searchParams.get("t")!;
    expect(verifyInvoiceLink(token, inv.id)).toBe(user.a);
    expect(verifyInvoiceLink(token, "00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(verifyInvoiceLink(`${token}x`, inv.id)).toBeNull();
    expect(verifyInvoiceLink(undefined, inv.id)).toBeNull();
    await expect(invoiceLink(user.b, inv.id)).rejects.toThrow();
  });
});
