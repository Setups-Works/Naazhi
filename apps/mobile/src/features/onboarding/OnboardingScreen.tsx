import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FEATURES, PRIVACY_POINTS } from "./slides";
import { writeDeviceChoice } from "@/features/notifications/prefs";
import { askPermission } from "@/features/notifications/setup";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Font, Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { useLayout } from "@/lib/layout";
import { useAppState } from "@/providers/AppState";

const STEPS = ["welcome", "features", "ready"] as const;

/** Three steps: who we are, what is inside, privacy and notifications. Finishing marks onboarding done and the route guards move on. */
export function OnboardingScreen() {
  const { completeOnboarding } = useAppState();
  const layout = useLayout();
  const [step, setStep] = useState(0);
  const [allowed, setAllowed] = useState(false);

  async function allowNotifications() {
    const granted = await askPermission();
    await writeDeviceChoice(granted);
    setAllowed(granted);
  }
  async function finish(to: "/signup" | "/login") {
    await completeOnboarding();
    router.replace(to);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.col, { maxWidth: layout.contentWidth, paddingHorizontal: layout.padding }]}>
        <View style={styles.top}>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.seg, i <= step ? styles.segOn : null]} />
            ))}
          </View>
          {step < STEPS.length - 1 ? (
            <Button title="Skip" kind="ghost" onPress={() => void finish("/login")} style={styles.skip} />
          ) : null}
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {step === 0 ? (
            <View style={styles.hero}>
              <AppText style={styles.wordmark}>Naazhi</AppText>
              <AppText variant="display">Everything you keep, in one calm place.</AppText>
              <AppText variant="body" color={Palette.fgMuted}>
                Notes, tasks, journal, calendar and an AI that helps. Same account, same look, on the web and in your pocket.
              </AppText>
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.gap}>
              <AppText variant="title">What’s inside</AppText>
              <View style={styles.grid}>
                {FEATURES.map((f) => (
                  <View key={f.key} style={styles.tile}>
                    <View style={styles.tileIcon}>
                      <Icon name={f.icon} size={15} color={Palette.fg} />
                    </View>
                    <AppText variant="bodyStrong">{f.title}</AppText>
                    <AppText variant="small">{f.body}</AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.gap}>
              <AppText variant="title">Yours, and private</AppText>
              <View style={styles.list}>
                {PRIVACY_POINTS.map((p) => (
                  <View key={p.text} style={styles.point}>
                    <Icon name={p.icon} size={15} color={Palette.fg} />
                    <AppText variant="body" style={styles.flex}>
                      {p.text}
                    </AppText>
                  </View>
                ))}
              </View>
              <Button
                title={allowed ? "Reminders are on" : "Turn on reminders"}
                icon={allowed ? "check" : "bell"}
                kind="secondary"
                disabled={allowed}
                onPress={() => void allowNotifications()}
              />
              <AppText variant="small" color={Palette.fgFaint}>
                A nudge for what is due, your journal streak and messages. Change it any time in Settings.
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          {step < STEPS.length - 1 ? (
            <>
              <Button title="Continue" icon="arrow-right" onPress={() => setStep(step + 1)} />
              {step > 0 ? <Button title="Back" kind="ghost" onPress={() => setStep(step - 1)} /> : null}
            </>
          ) : (
            <>
              <Button title="Create an account" onPress={() => void finish("/signup")} />
              <Button title="I already have an account" kind="ghost" onPress={() => void finish("/login")} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.page, alignItems: "center" },
  col: { flex: 1, width: "100%" },
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: Space.md, minHeight: 48, paddingTop: Space.sm },
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  seg: { flex: 1, height: 3, borderRadius: Radius.pill, backgroundColor: Palette.line },
  segOn: { backgroundColor: Palette.fillDark },
  skip: { minHeight: 36, paddingHorizontal: 8 },
  body: { flexGrow: 1, justifyContent: "center", paddingVertical: Space.xl },
  hero: { gap: Space.lg },
  wordmark: { ...Font.brand, fontSize: 44, lineHeight: 48, color: Palette.fg, marginBottom: Space.xl },
  gap: { gap: Space.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  tile: { width: "48.5%", flexGrow: 1, gap: 6, padding: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r2, backgroundColor: Palette.surface },
  tileIcon: { width: 30, height: 30, borderRadius: Radius.r1, backgroundColor: Palette.surfaceMuted, alignItems: "center", justifyContent: "center" },
  list: { gap: Space.md },
  point: { flexDirection: "row", alignItems: "center", gap: Space.md, padding: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r2 },
  actions: { gap: 4, paddingBottom: Space.lg },
}));
