import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AboutStep, AccountsStep, AppsStep, AskStep, PlanStep, PrefsStep, TourStep, Head, type StepCtx } from "./steps";
import { FLOW, OB, resumeAt, type Milestone } from "./state";
import { dbQuery } from "@/features/chat/db";
import { normalizePhone } from "@untitled/logic";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { GiftCard, captureGiftCard } from "@/components/ui/GiftCard";
import { mobileEnv } from "@/config/env";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { errorMessage } from "@/lib/api";
import { shareImageWithText } from "@/lib/shareImage";
import { useLayout } from "@/lib/layout";
import { useAppState, useAuth } from "@/providers/AppState";

/** The steps with a free-text box: the keyboard needs the room, so the buttons wait until it closes. */
const TYPING = new Set<number>([OB.about, OB.see, OB.task, OB.tour]);

/**
 * First-run setup after sign-up, the phone's version of the web's /onboarding: who you are, your preferences, a first chat with the
 * assistant, a tour of Journal, Notes and To-do, other apps, plans, and a welcome card. Progress is saved to the account after every
 * screen (the web reads the same record), so closing the app resumes where the person left off.
 */
export function SetupScreen() {
  const auth = useAuth();
  const layout = useLayout();
  const { user, preferences, setPreferences, setupState, updateSetup } = useAppState();
  const [step, setStep] = useState(() => resumeAt(setupState?.step ?? 0));
  const [name, setName] = useState(user?.name ?? "");
  const [prefs, setPrefs] = useState(preferences);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [typing, setTyping] = useState(false);
  const savedName = useRef(user?.name ?? "");
  const savedPhone = useRef("");
  const savedPrefs = useRef(JSON.stringify(preferences));
  const doneRef = useRef<Milestone[]>(setupState?.done ?? []);
  const card = useRef<Parameters<typeof captureGiftCard>[0] | null>(null);
  const first = name.trim().split(/\s+/)[0] || "there";
  const at = FLOW.indexOf(step);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setTyping(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setTyping(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // A number saved earlier (here or on the web) fills the field again.
  useEffect(() => {
    if (!user) return;
    void dbQuery<{ phone: string | null } | null>({ table: "profiles", op: "select", columns: "phone", filters: [{ column: "user_id", op: "eq", value: user.id }], single: "maybe" })
      .then((row) => {
        if (!row?.phone) return;
        savedPhone.current = row.phone;
        setPhone((p) => p || row.phone!);
      })
      .catch(() => undefined);
  }, [user]);

  const mark = (m: Milestone) => {
    if (doneRef.current.includes(m)) return;
    doneRef.current = [...doneRef.current, m];
  };

  /** Writes the name and preferences when they changed, then the progress. Returns whether it worked. */
  async function save(to: number, patch: { completed?: boolean; skippedAt?: string | null } = {}) {
    try {
      const newName = name.trim();
      if (newName && newName !== savedName.current) {
        const { error } = await auth.updateUser({ name: newName });
        if (error) return false;
        savedName.current = newName;
      }
      const now = JSON.stringify(prefs);
      if (now !== savedPrefs.current && user) {
        const rows = await dbQuery<{ user_id: string }[]>({
          table: "profiles",
          op: "update",
          values: { preferences: prefs },
          filters: [{ column: "user_id", op: "eq", value: user.id }],
          returning: "user_id",
        });
        if (!rows?.length) return false;
        savedPrefs.current = now;
        setPreferences(prefs);
      }
      // The mobile number, in international form, only once it is valid (the About step won't continue without one).
      const e164 = normalizePhone(phone);
      if (e164 && e164 !== savedPhone.current && user) {
        const rows = await dbQuery<{ user_id: string }[]>({
          table: "profiles",
          op: "update",
          values: { phone: e164 },
          filters: [{ column: "user_id", op: "eq", value: user.id }],
          returning: "user_id",
        });
        if (!rows?.length) return false;
        savedPhone.current = e164;
        setPhone(e164);
      }
      return await updateSetup({ completed: patch.completed ?? false, step: to, skippedAt: patch.skippedAt ?? null, done: doneRef.current });
    } catch {
      return false;
    }
  }

  async function go(to: number) {
    setErr("");
    setBusy(true);
    const ok = await save(to);
    setBusy(false);
    if (!ok) return setErr("Couldn’t save that. Check your connection and try again.");
    setStep(to);
  }

  const next = () => void go(FLOW[Math.min(at + 1, FLOW.length - 1)]);
  const back = () => {
    setErr("");
    const to = FLOW[Math.max(at - 1, 0)];
    setStep(to);
    void save(to);
  };
  /** "Finish later": leave now, ask again in a few days. The route guard moves on once the snooze is saved. */
  async function later() {
    if (!(await save(step, { skippedAt: new Date().toISOString() }))) setErr("Couldn’t save that. Check your connection and try again.");
  }
  async function finish() {
    setBusy(true);
    const ok = await save(OB.done, { completed: true });
    setBusy(false);
    if (!ok) return setErr("Couldn’t save that. Check your connection and try again.");
    router.replace("/");
  }
  async function shareCard() {
    try {
      if (!card.current) return;
      const imageUri = await captureGiftCard(card.current);
      await shareImageWithText({ title: "Welcome to Naazhi", message: `I just joined Naazhi. ${mobileEnv.apiBaseUrl ?? ""}`.trim(), imageUri });
    } catch (e) {
      setErr(errorMessage(e, "Couldn’t share the card."));
    }
  }

  const ctx: StepCtx = { first, name, setName, phone, setPhone, prefs, setPrefs, mark, setErr };
  const chat = step === OB.see || step === OB.task;
  const hideActions = typing && TYPING.has(step);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.col, { maxWidth: layout.contentWidth, paddingHorizontal: layout.padding }]}>
        <View style={styles.top}>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityLabel={`Step ${at + 1} of ${FLOW.length}`}>
            {FLOW.map((s, i) => (
              <View key={s} style={[styles.seg, i <= at ? styles.segOn : null]} />
            ))}
          </View>
          {step < OB.done ? <Button title="Finish later" kind="ghost" onPress={() => void later()} style={styles.later} /> : null}
        </View>

        {chat ? (
          <View style={styles.flex}>
            <AskStep key={step} ctx={ctx} mode={step === OB.see ? "see" : "task"} />
          </View>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {step === OB.about ? <AboutStep ctx={ctx} /> : null}
            {step === OB.prefs ? <PrefsStep ctx={ctx} /> : null}
            {step === OB.connect ? <AccountsStep /> : null}
            {step === OB.tour ? <TourStep ctx={ctx} /> : null}
            {step === OB.apps ? <AppsStep /> : null}
            {step === OB.plan ? <PlanStep ctx={ctx} /> : null}
            {step === OB.done ? (
              <View style={styles.gap}>
                <Head title={`A little gift for you, ${first}.`} lead="You’re all set. Your card is ready. Everything you chose here can be changed later in Settings." />
                <GiftCard ref={card} name={name.trim() || "Welcome"} />
                <Button title="Share card" kind="secondary" icon="gift" onPress={() => void shareCard()} />
              </View>
            ) : null}
          </ScrollView>
        )}

        {err ? (
          <AppText variant="small" color={Palette.clayFg} accessibilityRole="alert" style={styles.err}>
            {err}
          </AppText>
        ) : null}

        {hideActions ? null : (
          <View style={styles.actions}>
            {step === OB.done ? (
              <Button title="Open my dashboard" icon="arrow-right" loading={busy} onPress={() => void finish()} />
            ) : (
              <>
                <Button title="Continue" icon="arrow-right" loading={busy} disabled={step === OB.about && (!name.trim() || !normalizePhone(phone))} onPress={next} />
                <View style={styles.sub}>
                  {at > 0 ? <Button title="Back" kind="ghost" onPress={back} style={styles.subBtn} /> : null}
                  {step !== OB.about && step !== OB.prefs && step !== OB.tour && step !== OB.apps && step !== OB.connect ? <Button title="Skip for now" kind="ghost" onPress={next} style={styles.subBtn} /> : null}
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: Palette.page, alignItems: "center" },
  col: { flex: 1, width: "100%" },
  flex: { flex: 1 },
  gap: { gap: Space.lg },
  top: { flexDirection: "row", alignItems: "center", gap: Space.md, minHeight: 48, paddingTop: Space.sm },
  progress: { flex: 1, flexDirection: "row", gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: Radius.pill, backgroundColor: Palette.line },
  segOn: { backgroundColor: Palette.fillDark },
  later: { minHeight: 36, paddingHorizontal: 8 },
  body: { flexGrow: 1, paddingVertical: Space.xl },
  err: { paddingVertical: Space.sm },
  actions: { gap: 4, paddingBottom: Space.lg },
  sub: { flexDirection: "row", justifyContent: "center" },
  subBtn: { minHeight: 40, paddingHorizontal: 12 },
}));
