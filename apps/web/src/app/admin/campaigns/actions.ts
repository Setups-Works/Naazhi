"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { assertAdmin, audit } from "../../../server/session";
import { ServiceError, ValidationError } from "../../../server/errors";
import * as svc from "../../../server/services/campaigns/campaigns.service";
import type { Draft } from "../../../server/repositories/campaigns.repository";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof ServiceError) return { ok: false, error: e.message };
    if (e instanceof Error && e.message === "Not allowed") return { ok: false, error: "Not allowed." };
    console.error("campaign action failed", e instanceof Error ? e.name : "unknown error", (e as { code?: string }).code ?? "");
    return { ok: false, error: "That didn’t work. Has the latest database migration been applied?" };
  }
}
const idOk = (id: string) => {
  if (!UUID.test(id)) throw new ValidationError("Bad campaign id.");
  return id;
};

export async function saveCampaign(id: string | null, draft: Draft) {
  return run(async () => {
    const me = await assertAdmin();
    const saved = await svc.saveDraft(me.id, id ? idOk(id) : null, draft);
    if (!id) await audit(me, "campaign.create", saved, { subject: draft.subject.slice(0, 60) });
    revalidatePath("/admin/campaigns");
    return { id: saved };
  });
}

export async function sendTestCampaign(id: string | null, draft: Draft) {
  return run(async () => {
    const me = await assertAdmin();
    await svc.sendTest(me.email, me.name ?? null, draft, id ? idOk(id) : null);
    return { message: `Test sent to ${me.email}.` };
  });
}

export async function previewCampaign(draft: Pick<Draft, "html" | "preheader" | "kind">) {
  return run(async () => {
    await assertAdmin();
    return { html: svc.preview(draft) };
  });
}

/** Freezes the audience, sends the first batch in the background and leaves the rest to the scheduled job (or "Send next batch"). */
export async function sendCampaign(id: string) {
  return run(async () => {
    const me = await assertAdmin();
    const { queued } = await svc.start(idOk(id));
    await audit(me, "campaign.send", id, { queued });
    after(() => svc.processCampaign(id).then(() => undefined, () => undefined));
    revalidatePath("/admin/campaigns");
    return { message: `Sending to ${queued} ${queued === 1 ? "person" : "people"}.`, queued };
  });
}

export async function sendNextBatch(id: string) {
  return run(async () => {
    await assertAdmin();
    const r = await svc.processCampaign(idOk(id));
    revalidatePath("/admin/campaigns");
    return { message: `Sent ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}. ${r.left} still waiting.` };
  });
}

export async function retryCampaign(id: string) {
  return run(async () => {
    const me = await assertAdmin();
    const n = await svc.retryFailed(idOk(id));
    await audit(me, "campaign.retry", id, { n });
    revalidatePath("/admin/campaigns");
    return { message: `${n} queued to try again.` };
  });
}

export async function deleteCampaign(id: string) {
  return run(async () => {
    const me = await assertAdmin();
    await svc.deleteDraft(idOk(id));
    await audit(me, "campaign.delete", id);
    revalidatePath("/admin/campaigns");
    return {};
  });
}
