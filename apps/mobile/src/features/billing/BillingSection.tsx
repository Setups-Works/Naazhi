import { openWeb } from "@/lib/webSheet";
import { BYO_PROVIDERS, byoProvider, formatBalance, formatMoney, formatTokens, needsCheckout, toDate } from "@untitled/logic";
import type { MyBilling } from "@untitled/types";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConfirm } from "@/components/ui/Confirm";
import { PickerField } from "@/components/ui/PickerField";
import { TextField } from "@/components/ui/TextField";
import { Palette, Radius, themedStyles } from "@/constants/theme";
import { PlanCard } from "./PlanCard";
import { usePlanPicker, useTopUp } from "./checkout";
import { invoiceLink, useBilling, useBillingActions, useInvoices } from "./queries";

const day = (iso: string) => toDate(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

/** One line about where the current plan stands: when it renews or ends, or what this period has used. */
function standing(b: MyBilling): string {
  if (!b.plan) return b.status === "canceled" ? "Your last plan has ended. Choose a plan below to start again." : "You haven’t chosen a plan yet. AI works as it always has until you do.";
  if (b.plan.id === "subscription" && b.period_end)
    return b.cancel_at_period_end ? `Cancels on ${day(b.period_end)}. You keep everything until then.` : `Renews on ${day(b.period_end)}.`;
  if (b.plan.id === "payg") return `${formatTokens(b.tokens_used)} tokens used this period${b.cost_cents > 0 ? `, about ${formatMoney(b.cost_cents, b.plan.currency)}` : ""}.`;
  return b.byo.hint ? "Your own key is saved." : "Add your API key to start using AI.";
}

/** Billing history: one row per payment (subscription charges and credit top-ups); "Invoice" opens the printable invoice in the browser. */
function BillingHistory({ onError }: { onError: (m: string) => void }) {
  const q = useInvoices();
  const [opening, setOpening] = useState<string | null>(null);
  const open = async (id: string) => {
    setOpening(id);
    try {
      openWeb((await invoiceLink(id)).url, { title: "Invoice" });
    } catch {
      onError("Couldn’t open that invoice. Try again in a moment.");
    } finally {
      setOpening(null);
    }
  };
  const rows = q.data ?? [];
  return (
    <View style={styles.history}>
      <AppText variant="bodyStrong">Billing history</AppText>
      {q.isError ? <Banner kind="error">Couldn’t load your invoices. Try again in a moment.</Banner> : null}
      {q.isPending ? <AppText variant="small" color={Palette.fgMuted}>Loading…</AppText> : null}
      {!q.isPending && !q.isError && rows.length === 0 ? (
        <AppText variant="small" color={Palette.fgMuted}>No payments yet. Invoices for subscription charges and credit top-ups appear here.</AppText>
      ) : null}
      {rows.map((r) => (
        <View key={r.id} style={styles.invoice}>
          <View style={styles.flex}>
            <AppText variant="body">{r.description}</AppText>
            <AppText variant="small" color={Palette.fgMuted}>
              {toDate(r.issued_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {r.number}
              {r.status !== "paid" ? ` · ${r.status === "refunded" ? "Refunded" : `Refunded ${formatBalance(r.refunded_cents, r.currency)}`}` : ""}
            </AppText>
          </View>
          <View style={styles.invoiceRight}>
            <AppText variant="bodyStrong">{formatBalance(r.amount_cents, r.currency)}</AppText>
            <Button title="Invoice" kind="ghost" loading={opening === r.id} disabled={opening !== null} onPress={() => void open(r.id)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function KeyForm({ billing, onError }: { billing: MyBilling; onError: (m: string) => void }) {
  const { saveKey, removeKey } = useBillingActions(onError);
  const { ask, dialog } = useConfirm();
  const [provider, setProvider] = useState<string>(billing.byo.provider ?? BYO_PROVIDERS[0].id);
  const [model, setModel] = useState(billing.byo.model ?? BYO_PROVIDERS[0].model);
  const [apiKey, setApiKey] = useState("");
  const saved = billing.byo.hint;

  return (
    <View style={styles.key}>
      {dialog}
      <AppText variant="bodyStrong">Your AI provider</AppText>
      <PickerField
        label="Provider"
        value={provider}
        options={BYO_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
        onChange={(id) => {
          setProvider(id);
          setModel(byoProvider(id)?.model ?? model);
        }}
      />
      <TextField label="Model" value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false} maxLength={100} />
      <TextField
        label={saved ? `API key (saved, ending ${saved})` : "API key"}
        value={apiKey}
        onChangeText={setApiKey}
        password
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={saved ? "Enter a new key to replace it" : "Paste your key"}
      />
      <AppText variant="small" color={Palette.fgSubtle}>Your key is stored encrypted and only used to answer your own requests. It is never shown again.</AppText>
      <Button
        title={saved ? "Replace key" : "Save key"}
        loading={saveKey.isPending}
        disabled={!apiKey.trim() || !model.trim()}
        onPress={() => saveKey.mutate({ provider, model: model.trim(), apiKey: apiKey.trim() }, { onSuccess: () => setApiKey("") })}
      />
      {saved ? (
        <Button
          title="Remove key"
          kind="secondary"
          onPress={async () => {
            if (await ask({ title: "Remove your API key?", body: "AI stops working on this plan until you add a key again.", confirmLabel: "Remove key", danger: true })) removeKey.mutate();
          }}
        />
      ) : null}
    </View>
  );
}

/** Settings → Plan and billing: where you stand, the plans on offer, your own key, and cancelling. */
export function BillingSection() {
  const [err, setErr] = useState("");
  const q = useBilling();
  const { cancel, resume } = useBillingActions(setErr);
  const { ask, dialog } = useConfirm();
  const b = q.data;
  const picker = usePlanPicker(b, setErr);
  const credit = useTopUp(setErr);
  const busy = picker.busy || cancel.isPending || resume.isPending;

  return (
    <Card style={styles.card}>
      {dialog}
      <AppText variant="heading" accessibilityRole="header">Plan and billing</AppText>
      {q.isError ? <Banner kind="error">Couldn’t load your plan. Try again in a moment.</Banner> : null}
      {!b && !q.isError ? <AppText variant="small">Loading your plan…</AppText> : null}
      {err ? <Banner kind="error">{err}</Banner> : null}
      {b ? (
        <>
          <View>
            <AppText variant="bodyStrong">{b.plan ? b.plan.name : "No plan chosen"}</AppText>
            <AppText variant="small" color={Palette.fgMuted}>{standing(b)}</AppText>
            {b.plan?.id === "subscription" && b.plan.included_tokens > 0 ? (
              <AppText variant="small" color={Palette.fgSubtle}>{formatTokens(b.tokens_used)} of {formatTokens(b.plan.included_tokens)} tokens used this period</AppText>
            ) : null}
          </View>
          {b.plan?.id === "payg" && b.payments_connected ? (
            <View>
              <AppText variant="small" color={Palette.fgMuted}>AI balance</AppText>
              <AppText variant="heading">{formatBalance(b.credit_cents, b.plan.currency)}</AppText>
              <AppText variant="small" color={Palette.fgSubtle}>{b.credit_cents > 0 ? "Tokens come off this balance as you use AI." : "AI is paused until you add credit."}</AppText>
              {b.topup.options_cents.map((o) => (
                <Button key={o} title={`Add ${formatMoney(o, b.plan?.currency)}`} kind="secondary" disabled={credit.busy} onPress={() => void credit.topUp(o)} />
              ))}
            </View>
          ) : null}
          {!b.payments_connected ? <Banner kind="info">Payments aren’t connected yet, so choosing or changing a plan doesn’t charge you.</Banner> : null}

          {b.plans.map((p) => (
            <PlanCard key={p.id} plan={p} current={b.plan?.id === p.id} busy={busy} loading={picker.loadingId === p.id} autopay={needsCheckout(b, p)} onChoose={() => void picker.pick(p)} />
          ))}
          <BillingHistory onError={setErr} />
          <Button title="Compare plans" kind="ghost" icon="arrow-up-right-from-square" onPress={() => router.push("/pricing")} />


          {b.plan?.id === "byo" ? <KeyForm billing={b} onError={setErr} /> : null}

          {b.plan ? (
            b.cancel_at_period_end ? (
              <Button title="Keep my plan" kind="secondary" disabled={busy} onPress={() => resume.mutate()} />
            ) : (
              <Button
                title="Cancel plan"
                kind="secondary"
                disabled={busy}
                onPress={async () => {
                  const ends = b.plan?.id === "subscription" && b.period_end ? `It ends on ${day(b.period_end)}.` : "It stops right away.";
                  if (await ask({ title: `Cancel ${b.plan?.name}?`, body: `${ends} You can choose a plan again whenever you like.`, confirmLabel: "Cancel plan", danger: true })) cancel.mutate();
                }}
              />
            )
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = themedStyles(() => ({
  card: { gap: 12 },
  flex: { flex: 1 },
  key: { gap: 12, padding: 14, borderRadius: Radius.r3, backgroundColor: Palette.surfaceMuted },
  history: { gap: 10 },
  invoice: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Palette.line },
  invoiceRight: { alignItems: "flex-end", gap: 2 },
}));
