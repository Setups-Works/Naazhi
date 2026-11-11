import { openWeb } from "@/lib/webSheet";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { stripRefs, type ChatAction, type ChatProposal, type ShowItem } from "@untitled/validation";

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
} as const;

/** The heading and body of a draft card (journal entries have no heading). */
function look(a: ChatAction): { title: string; preview: string } {
  switch (a.kind) {
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
  }
}

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

/**
 * The drafts the assistant prepared (journal entry, to-dos, notes). Nothing is saved until the person taps Create; the server
 * (POST /api/v1/ai/actions) does the creating, exactly as for the web chat.
 */
function Drafts({ proposals, messageId, chatId }: { proposals: ChatProposal[]; messageId: string; chatId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | "all" | null>(null);
  const [error, setError] = useState("");
  const pending = proposals.filter((p) => !p.created);

  async function create(which: number | "all") {
    setBusy(which);
    setError("");
    try {
      await api.post("/api/v1/ai/actions", { messageId, which });
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
                {p.created ? `Saved to ${k.where}` : `${k.where} · draft`}
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
            {p.created ? (
              <Button
                title={k.href ? `Open ${k.label}` : "Open in Zoho"}
                kind="secondary"
                onPress={() => (k.href ? router.navigate(k.href) : openWeb(p.created!.path))}
                style={styles.draftBtn}
              />
            ) : (
              <Button
                title={"create" in k ? k.create : `Create ${k.label}`}
                loading={busy === p.index}
                disabled={busy !== null}
                onPress={() => void create(p.index)}
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
  draftBtn: { alignSelf: "flex-start", minHeight: 40, marginTop: 4 },
}));
