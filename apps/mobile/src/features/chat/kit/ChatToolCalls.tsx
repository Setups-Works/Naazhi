import { openWeb } from "@/lib/webSheet";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { recurrenceLabel } from "@untitled/logic";
import { eventTimeLabel, stripRefs, type ChatAction, type ChatProposal, type ShowItem } from "@untitled/validation";

import { ShownItems } from "../shown/ShownItems";
import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Markdown } from "@/components/ui/Markdown";
import { Palette, Radius, themedStyles, Neutral } from "@/constants/theme";
import { api, errorMessage } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

/** What the assistant did besides talking: cards showing the person's own items, and drafts waiting for them to tap Create. */
export function ChatToolCalls({
  shows,
  proposals,
  messageId,
  chatId,
}: {
  shows: ShowItem[];
  proposals: ChatProposal[];
  messageId?: string;
  chatId?: string | null;
}) {
  return (
    <>
      {shows.length ? <ShownItems shows={shows} /> : null}
      {proposals.length && messageId && chatId ? <Drafts proposals={proposals} messageId={messageId} chatId={chatId} /> : null}
    </>
  );
}

const KIND = {
  journal: { tone: "violet", icon: "book-open", label: "journal entry", where: "Journal", href: "/journal" },
  task: { tone: "amber", icon: "list-check", label: "to-do", where: "To-do", href: "/todo" },
  note: { tone: "blue", icon: "pen-to-square", label: "note", where: "Notes", href: "/notes" },
  feed: { tone: "sand", icon: "rss", label: "feed", where: "Reader", href: "/workspace" },
  // Zoho drafts act outside the app, so their button says what will happen and a finished one opens the Zoho page (an address, not a screen).
  zoho_crm: { tone: "clay", icon: "address-card", label: "record", where: "Zoho CRM", href: "", create: "Create in Zoho CRM" },
  zoho_mail: { tone: "clay", icon: "envelope", label: "email", where: "Zoho Mail", href: "", create: "Send with Zoho Mail" },
  zoho_cliq: { tone: "clay", icon: "comments", label: "message", where: "Zoho Cliq", href: "", create: "Post in Zoho Cliq" },
  // Gmail, Google Calendar and Google Drive (Google sign-in) also act outside the app, the same way.
  gmail_send: { tone: "blue", icon: "envelope", label: "email", where: "Gmail", href: "", create: "Send with Gmail", open: "Open Sent in Gmail" },
  gcal_event: { tone: "blue", icon: "calendar-days", label: "event", where: "Google Calendar", href: "", create: "Add to Google Calendar", open: "Open in Google Calendar" },
  // Changing or deleting what the person already has: they pick the real item on the card, then press their own button.
  edit_item: { tone: "sand", icon: "pen-to-square", label: "change", where: "Change", href: "", create: "Apply change" },
  delete_item: { tone: "clay", icon: "trash-can", label: "deletion", where: "Delete", href: "", create: "Delete" },
} as const;
// Where "Open it" goes in the app after a change (the app has the lists; a single item opens from there).
const TARGET_HREF = { task: "/todo", note: "/notes", journal: "/journal" } as const;
const THING = { task: "to-do", note: "note", journal: "journal entry" } as const;
const isChange = (k: ChatAction["kind"]) => k === "edit_item" || k === "delete_item";
type Target = { id: string; title: string; hint: string };

/** The heading and body of a draft card (journal entries have no heading). */
function look(a: ChatAction): { title: string; preview: string } {
  switch (a.kind) {
    case "delete_item":
      return { title: `Delete ${THING[a.target]}: “${a.target === "journal" ? dateLabel(a.match) : a.match}”`, preview: a.target === "note" ? "It moves to Trash, where you can restore it for 30 days." : "This can’t be undone." };
    case "edit_item": {
      const lines = [
        a.title !== undefined && `Title → ${a.title}`,
        a.due_date !== undefined && `Due → ${a.due_date ? dateLabel(a.due_date) : "no date"}`,
        a.recurrence !== undefined && `Repeats → ${a.recurrence ? recurrenceLabel(a.recurrence) : "no"}`,
        a.done !== undefined && (a.done ? "Mark as done" : "Mark as not done"),
        a.text !== undefined && `${a.append ? "Add" : "New text"}: ${a.text}`,
      ].filter(Boolean);
      return { title: `Change ${THING[a.target]}: “${a.target === "journal" ? dateLabel(a.match) : a.match}”`, preview: lines.join("\n\n") };
    }
    case "task":
      return { title: a.title, preview: a.description };
    case "journal":
      return { title: "", preview: stripRefs(a.body) };
    case "feed":
      return { title: a.title, preview: a.url };
    case "note":
      return { title: a.title, preview: a.body };
    case "zoho_crm": {
      const name = a.fields.Account_Name || [a.fields.First_Name, a.fields.Last_Name].filter(Boolean).join(" ");
      const lines = Object.entries(a.fields).filter(([k, v]) => v && k !== "Account_Name").map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
      return { title: `${a.module.slice(0, -1)}: ${name}`, preview: lines.join("\n\n") };
    }
    case "zoho_mail":
      return { title: a.subject, preview: `To ${a.to}\n\n${a.body}` };
    case "zoho_cliq":
      return { title: `#${a.channel.replace(/^#/, "")}`, preview: a.text };
    case "gmail_send":
      return { title: a.subject, preview: `To ${a.to}\n\n${a.body}` };
    case "gcal_event":
      return { title: a.title, preview: [`${dateLabel(a.date)}, ${eventTimeLabel(a)}`, a.location, a.description].filter(Boolean).join("\n\n") };
  }
}

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

/** Which of the person's own items a change or delete draft means. The list is read by the server as them; nothing about it went to the AI. */
function TargetPicker({ messageId, index, picked, onPick }: { messageId: string; index: number; picked: string | null; onPick: (id: string | null) => void }) {
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    api
      .post<{ targets: Target[] }>("/api/v1/ai/actions/targets", { messageId, which: index })
      .then((j) => {
        if (!live) return;
        setTargets(j.targets);
        if (j.targets.length === 1) onPick(j.targets[0]!.id);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- looked up once per card
  }, [messageId, index]);
  if (failed) return <AppText variant="small" color={Palette.clayFg}>Couldn’t look that up. Try again in a moment.</AppText>;
  if (!targets) return <AppText variant="small" color={Palette.fgMuted}>Looking for it…</AppText>;
  if (!targets.length) return <AppText variant="small" color={Palette.fgMuted}>I couldn’t find a match in your items. Say which one you mean and ask again.</AppText>;
  return (
    <View style={styles.targets} accessibilityRole="radiogroup">
      <AppText variant="small" color={Palette.fgMuted}>{targets.length === 1 ? "This one:" : "Which one?"}</AppText>
      {targets.map((t) => (
        <Pressable
          key={t.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: picked === t.id }}
          onPress={() => onPick(t.id)}
          style={[styles.target, { borderColor: picked === t.id ? Palette.fg : Neutral.line }]}
        >
          <AppText variant="bodyStrong" numberOfLines={1}>{t.title}</AppText>
          <AppText variant="small" color={Palette.fgMuted} numberOfLines={1}>{t.hint}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The drafts the assistant prepared (journal entry, to-dos, notes). Nothing is saved until the person taps Create; the server
 * (POST /api/v1/ai/actions) does the creating, exactly as for the web chat.
 */
function Drafts({ proposals, messageId, chatId }: { proposals: ChatProposal[]; messageId: string; chatId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [chosen, setChosen] = useState<Record<number, string | null>>({});
  const [error, setError] = useState("");
  // "Create all" skips changes and deletions: those need the person to pick the item and press their own button.
  const pending = proposals.filter((p) => !p.created && !isChange(p.action.kind));

  async function create(which: number | "all", targetId?: string) {
    setBusy(which);
    setError("");
    try {
      await api.post("/api/v1/ai/actions", { messageId, which, ...(targetId ? { targetId } : {}) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["chat-messages", chatId] }),
        qc.invalidateQueries({ queryKey: qk.notes }),
        qc.invalidateQueries({ queryKey: qk.tasks }),
        qc.invalidateQueries({ queryKey: qk.journal }),
      ]);
    } catch (e) {
      setError(errorMessage(e, "Couldn’t create that item."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.drafts} accessibilityLabel="Drafts to review">
      {proposals.map((p) => {
        const a = p.action;
        const k = KIND[a.kind];
        const t = Neutral;
        const { title, preview } = look(a);
        return (
          <View
            key={p.index}
            accessibilityLabel={`${k.label} draft`}
            style={[styles.draft, { backgroundColor: t.bg, borderColor: t.line }]}
          >
            <View style={styles.draftHead}>
              <View style={styles.draftIcon}>
                <Icon name={k.icon} size={12} color={t.fg} />
              </View>
              <AppText variant="label" color={t.fg}>
                {isChange(a.kind) ? (p.created ? (a.kind === "edit_item" ? "Changed" : "Deleted") : `${k.where} · needs your OK`) : p.created ? `Saved to ${k.where}` : `${k.where} · draft`}
              </AppText>
            </View>
            {title ? <AppText variant="bodyStrong">{title}</AppText> : null}
            {preview ? <Markdown text={preview.length > 600 ? `${preview.slice(0, 600)}…` : preview} color={Palette.fgMuted} /> : null}
            {a.kind === "task" ? (
              <AppText variant="small" color={t.fg}>
                {a.due_date ? `${a.recurrence ? "Starts" : "Due"} ${dateLabel(a.due_date)}` : "No due date"}
                {a.recurrence ? `  ·  Repeats ${a.recurrence.replace(/^nth:.*/, "monthly")}` : ""}
              </AppText>
            ) : null}
            {a.kind === "journal" ? (
              <AppText variant="small" color={t.fg}>
                For {dateLabel(a.entry_date)}
              </AppText>
            ) : null}
            {isChange(a.kind) && !p.created ? (
              <TargetPicker messageId={messageId} index={p.index} picked={chosen[p.index] ?? null} onPick={(id) => setChosen((c) => ({ ...c, [p.index]: id }))} />
            ) : null}
            {p.created && a.kind === "delete_item" ? null : p.created ? (
              <Button
                title={isChange(a.kind) ? "Open it" : k.href ? `Open ${k.label}` : "open" in k ? k.open : "Open in Zoho"}
                kind="secondary"
                onPress={() => (a.kind === "edit_item" ? router.navigate(TARGET_HREF[a.target]) : k.href ? router.navigate(k.href) : openWeb(p.created!.path))}
                style={styles.draftBtn}
              />
            ) : (
              <Button
                title={"create" in k ? k.create : `Create ${k.label}`}
                loading={busy === p.index}
                disabled={busy !== null || (isChange(a.kind) && !chosen[p.index])}
                onPress={() => void create(p.index, chosen[p.index] ?? undefined)}
                style={styles.draftBtn}
              />
            )}
          </View>
        );
      })}
      {pending.length > 1 ? (
        <Button
          title={`Create all ${pending.length}`}
          loading={busy === "all"}
          disabled={busy !== null}
          onPress={() => void create("all")}
        />
      ) : null}
      {error ? <Banner kind="error">{error}</Banner> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  drafts: { gap: 10, marginTop: 4 },
  draft: { gap: 6, padding: 14, borderRadius: Radius.r2, borderWidth: 1 },
  draftHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  draftIcon: { width: 24, height: 24, borderRadius: Radius.pill, backgroundColor: Palette.glassHi, alignItems: "center", justifyContent: "center" },
  targets: { gap: 6, marginTop: 4 },
  target: { gap: 2, padding: 10, borderRadius: Radius.r2, borderWidth: 1 },
  draftBtn: { alignSelf: "flex-start", minHeight: 40, marginTop: 4 },
}));
