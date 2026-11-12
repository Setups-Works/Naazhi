import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { dbQuery } from "@/features/chat/db";
import { Conversation } from "@/features/chat/ConversationScreen";
import type { Milestone } from "./state";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { Palette, Radius, Space, themedStyles } from "@/constants/theme";
import { isoDate } from "@/lib/dates";
import { NOTE_CATEGORIES, WRITE_TONES, type SettingsPrefs, type WriteTone } from "@/lib/preferences";
import { qk } from "@/lib/queryKeys";

/** What every step can read and change. The shell owns it so progress is saved in one place. */
export type StepCtx = {
  first: string;
  name: string;
  setName: (v: string) => void;
  prefs: SettingsPrefs;
  setPrefs: (p: SettingsPrefs) => void;
  mark: (m: Milestone) => void;
  setErr: (m: string) => void;
};

export const Head = ({ title, lead }: { title: string; lead?: string }) => (
  <View style={styles.head}>
    <AppText variant="title">{title}</AppText>
    {lead ? (
      <AppText variant="body" color={Palette.fgMuted}>
        {lead}
      </AppText>
    ) : null}
  </View>
);

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.pill, on ? styles.pillOn : null]}
    >
      <AppText variant="bodyStrong" color={on ? Palette.onDark : Palette.fgMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="bodyStrong">{label}</AppText>
      <View style={styles.wrap}>
        {options.map(([v, text]) => (
          <Pill key={v} label={text} on={value === v} onPress={() => onChange(v)} />
        ))}
      </View>
    </View>
  );
}

const ROLES = ["Founder", "Engineer", "Designer", "Writer", "Student", "Teacher", "Consultant"];
const TONE_LABEL: Record<(typeof WRITE_TONES)[number], string> = { direct: "Short and direct", warm: "Warm", formal: "Formal" };

/** Name (needed), what you do and how Naazhi should write for you (both optional). The assistant reads the last two. */
export function AboutStep({ ctx }: { ctx: StepCtx }) {
  const { prefs, setPrefs } = ctx;
  return (
    <View style={styles.gap}>
      <Head title="Help Naazhi get to know you." lead="Just three quick things. It’ll take less than a minute." />
      <TextField label="What do people call you?" value={ctx.name} onChangeText={ctx.setName} maxLength={80} autoComplete="given-name" placeholder="Your name" />
      <TextField label="What do you do? (optional)" value={prefs.role} onChangeText={(v) => setPrefs({ ...prefs, role: v.slice(0, 80) })} maxLength={80} placeholder="It helps Naazhi tell what matters to you" />
      <View style={styles.wrap}>
        {ROLES.map((r) => (
          <Pill key={r} label={r} on={prefs.role === r} onPress={() => setPrefs({ ...prefs, role: prefs.role === r ? "" : r })} />
        ))}
      </View>
      <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="How should Naazhi write for you?">
        <AppText variant="bodyStrong">How should Naazhi write for you? (optional)</AppText>
        <View style={styles.wrap}>
          {WRITE_TONES.map((t) => (
            <Pill key={t} label={TONE_LABEL[t]} on={prefs.writeTone === t} onPress={() => setPrefs({ ...prefs, writeTone: (prefs.writeTone === t ? "" : t) as WriteTone })} />
          ))}
        </View>
      </View>
      <AppText variant="small" color={Palette.fgSubtle}>
        Naazhi’s assistant uses these when it writes for you. Change them any time in Settings.
      </AppText>
    </View>
  );
}

/** The everyday choices: clock, week, density, where To-do opens, default note category. */
export function PrefsStep({ ctx }: { ctx: StepCtx }) {
  const { prefs, setPrefs } = ctx;
  return (
    <View style={styles.gap}>
      <Head title={`Make it yours, ${ctx.first}.`} lead="Pick how things should look and behave. You can change any of this later in Settings." />
      <Choice label="Time format" value={prefs.timeFormat} onChange={(v) => setPrefs({ ...prefs, timeFormat: v })} options={[["12h", "12-hour"], ["24h", "24-hour"]]} />
      <Choice label="Week starts on" value={prefs.weekStart} onChange={(v) => setPrefs({ ...prefs, weekStart: v })} options={[["mon", "Monday"], ["sun", "Sunday"]]} />
      <Choice label="Layout density" value={prefs.density} onChange={(v) => setPrefs({ ...prefs, density: v })} options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} />
      <Choice label="Opens To-do on" value={prefs.todoView} onChange={(v) => setPrefs({ ...prefs, todoView: v })} options={[["today", "Today"], ["upcoming", "Upcoming"], ["inbox", "Inbox"]]} />
      <Choice
        label="Default note category"
        value={prefs.defaultCategory}
        onChange={(v) => setPrefs({ ...prefs, defaultCategory: v })}
        options={NOTE_CATEGORIES.map((c) => [c, c] as [string, string])}
      />
      <Choice label="Reduce motion" value={prefs.reduceMotion ? "on" : "off"} onChange={(v) => setPrefs({ ...prefs, reduceMotion: v === "on" })} options={[["off", "Off"], ["on", "On"]]} />
    </View>
  );
}

const COPY = {
  see: {
    title: "See Naazhi in action.",
    lead: "Ask something and watch it answer. It writes the way you said you like.",
    chips: ["Write a two-line hello in my voice", "What can you help me with?", "Give me a one-sentence reason to start a journal"],
    milestone: "ask" as const,
  },
  task: {
    title: "Give Naazhi a task.",
    lead: "Say what you need done. Naazhi drafts it, and you decide whether to keep it.",
    chips: ["Remind me to call Mum on Friday", "Add a to-do: buy printer paper", "Plan a short to-do list for tomorrow morning"],
    milestone: "task" as const,
  },
};

/** Two steps share the real chat: a real conversation, saved in Chat like any other. Nothing is created until a draft is confirmed. */
export function AskStep({ ctx, mode }: { ctx: StepCtx; mode: "see" | "task" }) {
  const c = COPY[mode];
  const [seed, setSeed] = useState<string | undefined>();
  const [run, setRun] = useState(0);
  return (
    <View style={styles.chat}>
      <Head title={c.title} lead={c.lead} />
      {!seed ? (
        <View style={styles.wrap}>
          {c.chips.map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => { setSeed(s); setRun((r) => r + 1); }} style={styles.chip}>
              <AppText variant="small" color={Palette.fgMuted}>
                {s}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.conversation}>
        <Conversation key={run} chatId={null} seed={seed} embedded onSeeded={() => ctx.mark(c.milestone)} onCreated={() => ctx.mark(c.milestone)} />
      </View>
    </View>
  );
}

type Kind = "journal" | "note" | "task";
const PLACES: { kind: Kind; icon: IconName; title: string; text: string; ph: string }[] = [
  { kind: "journal", icon: "book-open", title: "Journal", text: "Write, speak, edit and reflect on your days.", ph: "Today I’m feeling…" },
  { kind: "note", icon: "note-sticky", title: "Notes", text: "Write ideas down, find them later and keep them organised.", ph: "e.g. Book ideas" },
  { kind: "task", icon: "list-check", title: "To-do", text: "Capture tasks, check them off, and let Naazhi draft the rest.", ph: "e.g. Reply to Sam" },
];

/** The three places Naazhi works from. Each one is real: what you add here is saved and stays yours. */
export function TourStep({ ctx }: { ctx: StepCtx }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<Kind, string>>({ journal: "", note: "", task: "" });
  const [made, setMade] = useState<Record<Kind, boolean>>({ journal: false, note: false, task: false });
  const [busy, setBusy] = useState<Kind | null>(null);

  async function add(kind: Kind) {
    const text = draft[kind].trim();
    if (!text) return;
    setBusy(kind);
    ctx.setErr("");
    const today = isoDate();
    try {
      await dbQuery({
        table: kind === "task" ? "tasks" : kind === "journal" ? "journal_entries" : "notes",
        op: "insert",
        values:
          kind === "task"
            ? { title: text.slice(0, 300), due_date: today }
            : kind === "journal"
              ? { entry_date: today, body: text }
              : { title: text.slice(0, 200), body: "", category: ctx.prefs.defaultCategory },
        returning: null,
      });
      setMade((m) => ({ ...m, [kind]: true }));
      ctx.mark(kind);
      void qc.invalidateQueries({ queryKey: { task: qk.tasks, journal: qk.journal, note: qk.notes }[kind] });
    } catch {
      ctx.setErr("Couldn’t save that. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const count = Object.values(made).filter(Boolean).length;
  return (
    <View style={styles.gap}>
      <Head title="3 places Naazhi works from." lead={`Try each one now. What you add during the tour is real, stays yours, and you can delete it whenever you like. (${count} of 3 done)`} />
      {PLACES.map((p) => (
        <View key={p.kind} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.tile, made[p.kind] ? styles.tileOn : null]}>
              <Icon name={made[p.kind] ? "check" : p.icon} size={15} color={made[p.kind] ? Palette.greenFg : Palette.fg} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{p.title}</AppText>
              <AppText variant="small">{made[p.kind] ? "Added. Nice." : p.text}</AppText>
            </View>
          </View>
          {!made[p.kind] ? (
            <>
              <TextField label={`Add to ${p.title}`} value={draft[p.kind]} onChangeText={(v) => setDraft({ ...draft, [p.kind]: v })} placeholder={p.ph} maxLength={p.kind === "journal" ? 2000 : 200} />
              <Button title={busy === p.kind ? "Adding…" : "Add"} kind="secondary" disabled={!draft[p.kind].trim() || busy === p.kind} onPress={() => void add(p.kind)} />
            </>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const APPS: [string, string][] = [
  ["GitHub", "Issues and pull requests"],
  ["Slack", "Channels and messages"],
  ["Notion", "Pages and databases"],
  ["Linear", "Issues and cycles"],
  ["HubSpot", "Contacts and deals"],
  ["Eventbrite", "Events and tickets"],
  ["Cloudflare", "Sites and DNS"],
  ["Zoom", "Meetings and recordings"],
];

/** Other apps Naazhi will work with. None are built yet, so each is marked "Soon" and does nothing. */
export function AppsStep() {
  return (
    <View style={styles.gap}>
      <Head title="Want Naazhi to connect to other apps?" lead="These are completely optional. Naazhi already has the essentials, and you can add apps whenever you need them." />
      {APPS.map(([name, what]) => (
        <View key={name} style={[styles.card, styles.row]}>
          <View style={styles.tile}>
            <AppText variant="bodyStrong">{name.charAt(0)}</AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{name}</AppText>
            <AppText variant="small">{what}</AppText>
          </View>
          <View style={styles.soon}>
            <AppText variant="small" color={Palette.fgMuted}>
              Soon
            </AppText>
          </View>
        </View>
      ))}
      <AppText variant="small" color={Palette.fgSubtle}>
        And many more. They’ll all be listed in Settings.
      </AppText>
    </View>
  );
}

export function PlanStep({ onCompare }: { onCompare: () => void }): ReactNode {
  return (
    <View style={styles.gap}>
      <Head
        title="Naazhi already knows you. Keep it your way."
        lead="Your notes, tasks and journal stay yours on any plan. A plan only decides how Naazhi’s AI is paid for, and you can switch whenever you like."
      />
      <Button title="Compare plans" icon="arrow-right" kind="secondary" onPress={onCompare} />
      <AppText variant="small" color={Palette.fgSubtle}>
        You can also choose later in Settings → Plan and billing.
      </AppText>
    </View>
  );
}

const styles = themedStyles(() => ({
  head: { gap: Space.sm },
  gap: { gap: Space.lg },
  group: { gap: Space.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: Space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: Space.md },
  flex: { flex: 1, gap: 2 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: Radius.r2, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: Palette.fillDark, borderColor: Palette.fillDark },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface },
  card: { gap: Space.md, padding: Space.md, borderWidth: 1, borderColor: Palette.line, borderRadius: Radius.r2, backgroundColor: Palette.surface },
  tile: { width: 36, height: 36, borderRadius: Radius.r1, backgroundColor: Palette.surfaceMuted, alignItems: "center", justifyContent: "center" },
  tileOn: { backgroundColor: Palette.greenBg },
  soon: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: Radius.pill, backgroundColor: Palette.surfaceMuted },
  chat: { flex: 1, gap: Space.md },
  conversation: { flex: 1, marginHorizontal: -Space.lg },
}));
