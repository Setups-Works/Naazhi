"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faAddressCard, faBookOpen, faCalendarDays, faComments, faEnvelope, faListCheck, faPenToSquare, faRss, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { eventTimeLabel, isComposioDraft, stripRefs, type ChatAction, type ChatProposal } from "../../../lib/chat-actions";
import { qk } from "../../../lib/query/keys";
import { draftDue, recurrenceLabel } from "../../../lib/tasks";

const ICON: Record<ChatAction["kind"], IconDefinition> = {
  journal: faBookOpen,
  task: faListCheck,
  note: faPenToSquare,
  feed: faRss,
  zoho_crm: faAddressCard,
  zoho_mail: faEnvelope,
  zoho_cliq: faComments,
  gmail_send: faEnvelope,
  gcal_event: faCalendarDays,
  edit_item: faPenToSquare,
  delete_item: faTrashCan,
};
const LABEL: Record<ChatAction["kind"], string> = {
  task: "to-do",
  journal: "journal entry",
  note: "note",
  feed: "feed",
  zoho_crm: "record",
  zoho_mail: "email",
  zoho_cliq: "message",
  gmail_send: "email",
  gcal_event: "event",
  edit_item: "change",
  delete_item: "deletion",
};
const WHERE: Record<ChatAction["kind"], string> = {
  task: "To-do",
  journal: "Journal",
  note: "Notes",
  feed: "Reader",
  zoho_crm: "Zoho CRM",
  zoho_mail: "Zoho Mail",
  zoho_cliq: "Zoho Cliq",
  gmail_send: "Gmail",
  gcal_event: "Google Calendar",
  edit_item: "Change",
  delete_item: "Delete",
};
/** What the button says for each draft: Zoho actions say exactly what will happen, because they reach outside the app. */
const CREATE: Record<ChatAction["kind"], string> = {
  task: "Create to-do",
  journal: "Create journal entry",
  note: "Create note",
  feed: "Create feed",
  zoho_crm: "Create in Zoho CRM",
  zoho_mail: "Send with Zoho Mail",
  zoho_cliq: "Post in Zoho Cliq",
  gmail_send: "Send with Gmail",
  gcal_event: "Add to Google Calendar",
  edit_item: "Apply change",
  delete_item: "Delete",
};
const OPEN: Record<ChatAction["kind"], string> = {
  task: "Open to-do",
  journal: "Open journal entry",
  note: "Open note",
  feed: "Open feed",
  zoho_crm: "Open in Zoho",
  zoho_mail: "Open Sent in Zoho",
  zoho_cliq: "Open Zoho Cliq",
  gmail_send: "Open Sent in Gmail",
  gcal_event: "Open in Google Calendar",
  edit_item: "Open it",
  delete_item: "Open the list",
};
const THING = { task: "to-do", note: "note", journal: "journal entry" } as const;
const isChange = (k: ChatAction["kind"]) => k === "edit_item" || k === "delete_item";
type Target = { id: string; title: string; hint: string };

const isoLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const isZoho = (k: ChatAction["kind"]) => k.startsWith("zoho_");
/** Drafts that act in another app: their button says exactly what will happen, and a finished one opens that app in a new tab. */
const isExternal = (k: ChatAction["kind"]) => isZoho(k) || isComposioDraft(k);

/** The heading and body a draft card shows (journal entries have no heading). */
function look(a: ChatAction): { title: string; preview: string } {
  switch (a.kind) {
    case "delete_item":
      return { title: `Delete ${THING[a.target]}: “${a.target === "journal" ? isoLabel(a.match) : a.match}”`, preview: a.target === "note" ? "It moves to Trash, where you can restore it for 30 days." : "This can’t be undone." };
    case "edit_item": {
      const lines = [
        a.title !== undefined && `Title → ${a.title}`,
        a.due_date !== undefined && `Due → ${a.due_date ? isoLabel(a.due_date) : "no date"}`,
        a.recurrence !== undefined && `Repeats → ${a.recurrence ? recurrenceLabel(a.recurrence) : "no"}`,
        a.done !== undefined && (a.done ? "Mark as done" : "Mark as not done"),
        a.text !== undefined && `${a.append ? "Add" : "New text"}: ${a.text}`,
      ].filter(Boolean);
      return { title: `Change ${THING[a.target]}: “${a.target === "journal" ? isoLabel(a.match) : a.match}”`, preview: lines.join("\n") };
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
      return {
        title: `${a.module.slice(0, -1)}: ${name}`,
        preview: Object.entries(a.fields)
          .filter(([k, v]) => v && k !== "Account_Name")
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
          .join("\n"),
      };
    }
    case "zoho_mail":
      return { title: a.subject, preview: `To ${a.to}\n\n${a.body}` };
    case "zoho_cliq":
      return { title: `#${a.channel.replace(/^#/, "")}`, preview: a.text };
    case "gmail_send":
      return { title: a.subject, preview: `To ${a.to}\n\n${a.body}` };
    case "gcal_event":
      return { title: a.title, preview: [`${dateLabel(a.date)}, ${eventTimeLabel(a)}`, a.location, a.description].filter(Boolean).join("\n") };
  }
}

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

/** Which of the person's own items a change or delete draft means. The list is read by the server as them; nothing about it went to the AI. */
function TargetPicker({ messageId, index, picked, onPick }: { messageId: string; index: number; picked: string | null; onPick: (id: string | null) => void }) {
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    void fetch("/api/v1/ai/actions/targets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messageId, which: index }) })
      .then((r) => (r.ok ? (r.json() as Promise<{ targets: Target[] }>) : Promise.reject(new Error("no"))))
      .then((j) => {
        if (!live) return;
        setTargets(j.targets);
        if (j.targets.length === 1) onPick(j.targets[0].id);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- looked up once per card
  }, [messageId, index]);
  if (failed) return <p className="mt-2 text-[13px] text-critical">Couldn’t look that up. Try again in a moment.</p>;
  if (!targets) return <p className="mt-2 text-[13px] text-fg-muted">Looking for it…</p>;
  if (!targets.length) return <p className="mt-2 text-[13px] text-fg-muted">I couldn’t find a match in your items. Say which one you mean and ask again.</p>;
  return (
    <fieldset className="m-0 mt-2 flex flex-col gap-1 border-0 p-0">
      <legend className="mb-1 text-[12.5px] text-fg-muted">{targets.length === 1 ? "This one:" : "Which one?"}</legend>
      {targets.map((t) => (
        <label key={t.id} className={`flex cursor-pointer items-start gap-2 rounded-r2 border p-2.5 text-[13.5px] ${picked === t.id ? "border-ink bg-hover" : "border-line"}`}>
          <input type="radio" name={`target-${messageId}-${index}`} checked={picked === t.id} onChange={() => onPick(t.id)} className="mt-1" />
          <span className="min-w-0">
            <b className="block truncate font-medium">{t.title}</b>
            <small className="block truncate text-fg-muted">{t.hint}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The drafts the assistant prepared from one message (a journal entry, to-dos, notes…). Nothing is saved until the person
 * presses Create on a draft, or "Create all". Created drafts turn into links to the saved item.
 */
export default function ChatActionProposal({
  proposals,
  messageId,
  chatId,
}: {
  proposals: ChatProposal[];
  messageId: string;
  chatId: string;
}) {
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
      const res = await fetch("/api/v1/ai/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId, which, ...(targetId ? { targetId } : {}) }),
      });
      const out = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(out?.error ?? "Couldn’t create that item.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.chats.messages(chatId) }),
        qc.invalidateQueries({ queryKey: qk.notes.all }),
        qc.invalidateQueries({ queryKey: qk.tasks.all }),
        qc.invalidateQueries({ queryKey: qk.journal.all }),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create that item.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Drafts to review">
      {proposals.map((p) => {
        const a = p.action;
        const { title, preview } = look(a);
        return (
          <section
            key={p.index}
            className="rounded-r3 border bg-raised p-4 text-ink"
            aria-label={`${LABEL[a.kind]} draft`}
          >
            <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <span className="grid size-7 place-items-center rounded-ctl bg-hover text-[12px] text-ink-2">
                <FA icon={ICON[a.kind]} />
              </span>
              {isChange(a.kind)
                ? p.created
                  ? a.kind === "edit_item"
                    ? "Changed"
                    : "Deleted"
                  : `${WHERE[a.kind]} · needs your OK`
                : p.created
                  ? isExternal(a.kind)
                    ? `Done in ${WHERE[a.kind]}`
                    : `Saved to ${WHERE[a.kind]}`
                  : `${WHERE[a.kind]} · draft`}
            </p>
            {title && <p className="mt-2 font-semibold">{title}</p>}
            {preview && <p className="mt-1 line-clamp-6 whitespace-pre-wrap break-words text-sm text-fg-muted">{preview}</p>}
            {a.kind === "task" && (
              <>
                <p className="mt-2 block w-fit rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] text-ink-2">
                  {(() => {
                    const due = draftDue(a.due_date, a.recurrence ?? null);
                    return due ? `${a.recurrence ? "Starts" : "Due"} ${dateLabel(due)}` : "No due date";
                  })()}
                </p>
                {a.recurrence && (
                  <p className="mt-1.5 block w-fit rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] text-ink-2">
                    ↻ {recurrenceLabel(a.recurrence)}
                  </p>
                )}
              </>
            )}
            {a.kind === "journal" && (
              <p className="mt-2 block w-fit rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] text-ink-2">For {dateLabel(a.entry_date)}</p>
            )}
            {isChange(a.kind) && !p.created && <TargetPicker messageId={messageId} index={p.index} picked={chosen[p.index] ?? null} onPick={(id) => setChosen((c) => ({ ...c, [p.index]: id }))} />}
            {p.created && a.kind === "delete_item" ? null : p.created ? (
              <a
                className="btn btn-secondary btn-sm mt-3 inline-flex h-9 px-4 text-[13px]"
                href={p.created.path}
                {...(isExternal(a.kind) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {OPEN[a.kind]}
              </a>
            ) : (
              <button
                className="btn btn-primary btn-sm mt-3 h-9 px-4 text-[13px]"
                disabled={busy !== null || (isChange(a.kind) && !chosen[p.index])}
                onClick={() => create(p.index, chosen[p.index] ?? undefined)}
              >
                {busy === p.index ? (isChange(a.kind) ? "Working…" : isZoho(a.kind) ? "Sending to Zoho…" : isComposioDraft(a.kind) ? `Sending to ${WHERE[a.kind]}…` : "Creating…") : CREATE[a.kind]}
              </button>
            )}
          </section>
        );
      })}
      {pending.length > 1 && (
        <button className="btn btn-primary self-start" disabled={busy !== null} onClick={() => create("all")}>
          {busy === "all" ? "Creating…" : `Create all ${pending.length}`}
        </button>
      )}
      {error && (
        <p className="text-sm text-critical" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
