import { formatTokens, priceLine, trialButtonLabel, trialLine } from "@untitled/logic";
import type { BillingPlan } from "@untitled/types";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Palette, Radius, themedStyles } from "@/constants/theme";

/** One plan as the server describes it: name, price, what it includes and a button to choose it. Shared by Settings and the pricing screen. */
export function PlanCard({
  plan,
  current,
  busy,
  loading,
  autopay = false,
  trial = false,
  onChoose,
}: {
  plan: BillingPlan;
  current: boolean;
  busy: boolean;
  loading: boolean;
  /** Paying through Razorpay autopay: the button says so. */
  autopay?: boolean;
  /** A free trial applies to this person and plan: the price line and the button say so. */
  trial?: boolean;
  onChoose: () => void;
}) {
  return (
    <View style={[styles.plan, current ? styles.planCurrent : null]}>
      <View style={styles.head}>
        <AppText variant="bodyStrong">{plan.name}</AppText>
        {current ? <AppText variant="label" color={Palette.greenFg}>Current</AppText> : null}
      </View>
      {autopay && trial ? <AppText variant="label" color={Palette.greenFg}>{plan.trial_days} {plan.trial_days === 1 ? "day" : "days"} free</AppText> : null}
      <AppText variant="heading">{autopay && trial ? trialLine(plan) : priceLine(plan)}</AppText>
      <AppText variant="small" color={Palette.fgMuted}>{plan.tagline}</AppText>
      {plan.id === "subscription" && plan.included_tokens > 0 ? (
        <AppText variant="small" color={Palette.fgSubtle}>{formatTokens(plan.included_tokens)} AI tokens included each month</AppText>
      ) : null}
      {plan.features.map((f) => (
        <View key={f} style={styles.feature}>
          <Icon name="check" size={12} color={Palette.greenFg} />
          <AppText variant="small" style={styles.flex}>{f}</AppText>
        </View>
      ))}
      <Button title={current ? "Your plan" : autopay ? ((trial ? trialButtonLabel(plan, true) : null) ?? "Subscribe with autopay") : "Choose this plan"} kind={current ? "secondary" : "primary"} disabled={current || busy} loading={loading} onPress={onChoose} />
    </View>
  );
}

const styles = themedStyles(() => ({
  flex: { flex: 1 },
  plan: { gap: 8, padding: 14, borderRadius: Radius.r3, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.glassHi },
  planCurrent: { borderColor: Palette.greenFg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  feature: { flexDirection: "row", alignItems: "center", gap: 8 },
}));
