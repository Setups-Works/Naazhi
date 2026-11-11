"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faAddressCard, faBookOpen, faComments, faEnvelope, faListCheck, faPenToSquare, faRss } from "@fortawesome/free-solid-svg-icons";
import { stripRefs, type ChatAction, type ChatProposal } from "../../../lib/chat-actions";
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
};
const LABEL: Record<ChatAction["kind"], string> = { task: "to-do", journal: "journal entry", note: "note", feed: "feed", zoho_crm: "record", zoho_mail: "email", zoho_cliq: "message" };
const WHERE: Record<ChatAction["kind"], string> = { task: "To-do", journal: "Journal", note: "Notes", feed: "Reader", zoho_crm: "Zoho CRM", zoho_mail: "Zoho Mail", zoho_cliq: "Zoho Cliq" };
/** What the button says for each draft: Zoho actions say exactly what will happen, because they reach outside the app. */
const CREATE: Record<ChatAction["kind"], string> = {
  task: "Create to-do",
  journal: "Create journal entry",
  note: "Create note",
  feed: "Create feed",
  zoho_crm: "Create in Zoho CRM",
  zoho_mail: "Send with Zoho Mail",
  zoho_cliq: "Post in Zoho Cliq",
};
const OPEN: Record<ChatAction["kind"], string> = { task: "Open to-do", journal: "Open journal entry", note: "Open note", feed: "Open feed", zoho_crm: "Open in Zoho", zoho_mail: "Open Sent in Zoho", zoho_cliq: "Open Zoho Cliq" };
const isZoho = (k: ChatAction["kind"]) => k.startsWith("zoho_");

/** The heading and body a draft card shows (journal entries have no heading). */
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
  }
}

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

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
  const [error, setError] = useState("");
  const pending = proposals.filter((p) => !p.created);

  async function create(which: number | "all") {
    setBusy(which);
    setError("");
    try {
      const res = await fetch("/api/v1/ai/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messageId, which }),
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
              {p.created ? (isZoho(a.kind) ? `Done in ${WHERE[a.kind]}` : `Saved to ${WHERE[a.kind]}`) : `${WHERE[a.kind]} · draft`}
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
            {p.created ? (
              <a
                className="btn btn-secondary btn-sm mt-3 inline-flex h-9 px-4 text-[13px]"
                href={p.created.path}
                {...(isZoho(a.kind) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {OPEN[a.kind]}
              </a>
            ) : (
              <button className="btn btn-primary btn-sm mt-3 h-9 px-4 text-[13px]" disabled={busy !== null} onClick={() => create(p.index)}>
                {busy === p.index ? (isZoho(a.kind) ? "Sending to Zoho…" : "Creating…") : CREATE[a.kind]}
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
