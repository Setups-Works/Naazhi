import "server-only";
import { notesMatching, previewOf, tasksMatching, type ShowNote, type ShowTask } from "@untitled/logic";
import {
  describeItem,
  itemPath,
  markCreated,
  parseChatActions,
  resolveRefs,
  type ChatAction,
  type ChatProposal,
  type CreatedItem,
} from "../../../lib/chat-actions";
import { draftDue } from "../../../lib/tasks";
import { userDb } from "../../db/builders";
import { getMessageBody, replaceMessageBody } from "../../repositories/chat-messages.repository";
import { createJournalEntry, setJournalBody } from "../../repositories/journal.repository";
import { createNote } from "../../repositories/notes.repository";
import { createTask } from "../../repositories/tasks.repository";
import { ValidationError } from "../../errors";
import { addFeed } from "../rss/rss.service";
import { createCrmRecord, postZohoCliq, sendZohoMail } from "../integrations/zoho";
import { createCalendarEvent, sendGmail } from "../composio";

type Db = ReturnType<typeof userDb>;
type ChangeAction = Extract<ChatAction, { kind: "edit_item" | "delete_item" }>;
const isChange = (a: ChatAction): a is ChangeAction => a.kind === "edit_item" || a.kind === "delete_item";
type Links = Map<string, { path: string; tip: string }>;

/** The to-dos and notes of this message that exist now, by the short `ref` the journal draft uses to point at them. */
function linksOf(proposals: ChatProposal[]): Links {
  const m: Links = new Map();
  for (const p of proposals) {
    const a = p.action;
    if (p.created && (a.kind === "task" || a.kind === "note") && a.ref) m.set(a.ref, { path: p.created.path, tip: describeItem(a) });
  }
  return m;
}

/** One real item a change draft might mean, shown to the person so they pick the right one. */
export type Target = { id: string; title: string; hint: string };
const MAX_TARGETS = 6;
const LISTS = { task: "/dashboard/todo", note: "/dashboard/notes", journal: "/dashboard/journal" } as const;

/**
 * The person's own items that a change draft could mean. The assistant only named them in words; this reads the real ones as the
 * signed-in person (Row-Level Security applies), so nothing about them ever went to the AI provider.
 */
export async function findTargets(db: Db, a: ChangeAction): Promise<Target[]> {
  if (a.target === "journal") {
    const { data } = await db.from("journal_entries").select("id,entry_date,body").eq("entry_date", a.match).order("created_at");
    return ((data as { id: string; entry_date: string; body: string }[] | null) ?? []).slice(0, MAX_TARGETS).map((e) => ({ id: e.id, title: `Journal · ${e.entry_date}`, hint: previewOf(e.body, 90) }));
  }
  if (a.target === "note") {
    const { data } = await db.from("notes").select("id,title,body,updated_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(500);
    return notesMatching((data as ShowNote[] | null) ?? [], a.match, MAX_TARGETS).items.map((n) => ({ id: n.id, title: n.title || "Untitled", hint: previewOf(n.body, 90) }));
  }
  const { data } = await db.from("tasks").select("id,title,description,due_date,done,archived,created_at").order("created_at", { ascending: false }).limit(500);
  return tasksMatching((data as (ShowTask & { description: string | null; created_at: string })[] | null) ?? [], a.match, MAX_TARGETS).items.map((t) => ({
    id: t.id,
    title: t.title,
    hint: t.done ? "Done" : t.due_date ? `Due ${t.due_date}` : "No due date",
  }));
}

/** The targets for the `which`-th draft of one of the caller's own assistant messages (null when it is not a change draft). */
export async function listChatTargets(userId: string, messageId: string, which: number): Promise<Target[] | null> {
  const db = userDb(userId);
  const text = await getMessageBody(db, messageId);
  if (text === null) return null;
  const p = parseChatActions(text).proposals.find((x) => x.index === which && !x.created);
  return p && isChange(p.action) ? findTargets(db, p.action) : null;
}

/** Applies a change draft to the one item the person picked (re-checked against the targets, so only an item the card offered can be changed). */
async function change(db: Db, a: ChangeAction, targetId: string | undefined): Promise<CreatedItem> {
  const target = (await findTargets(db, a)).find((t) => t.id === targetId);
  if (!target) throw new ValidationError("That item isn’t there any more. Pick it again.");
  const table = a.target === "task" ? "tasks" : a.target === "note" ? "notes" : "journal_entries";
  const kind = a.kind;
  const path = a.target === "task" ? itemPath("task", target.id) : a.target === "note" ? itemPath("note", target.id) : LISTS.journal;

  if (a.kind === "delete_item") {
    // Notes go to the Trash (restorable for 30 days); to-dos and journal entries are removed, as the Delete button on the page does.
    const q = a.target === "note" ? db.from(table).update({ deleted_at: new Date().toISOString() }) : db.from(table).delete();
    const { error } = await q.eq("id", target.id);
    if (error) throw new Error("Could not delete");
    return { kind, id: target.id, path: LISTS[a.target] };
  }

  const current = a.append ? await db.from(table).select(a.target === "task" ? "description" : "body").eq("id", target.id).single() : null;
  const old = current?.data ? String((current.data as Record<string, unknown>).description ?? (current.data as Record<string, unknown>).body ?? "") : "";
  const text = a.text === undefined ? undefined : a.append && old ? `${old}\n\n${a.text}` : a.text;
  const set: Record<string, unknown> = {};
  if (a.target === "task") {
    if (a.title !== undefined) set.title = a.title;
    if (text !== undefined) set.description = text;
    if (a.due_date !== undefined) set.due_date = a.due_date;
    if (a.recurrence !== undefined) set.recurrence = a.recurrence;
    if (a.done !== undefined) Object.assign(set, { done: a.done, done_at: a.done ? new Date().toISOString() : null });
    // A repeating to-do needs a date (a database rule), so one asked for without any date starts today.
    if (a.recurrence && a.due_date === undefined) {
      const row = (await db.from("tasks").select("due_date").eq("id", target.id).single()).data as { due_date: string | null } | null;
      if (!row?.due_date) set.due_date = draftDue(null, a.recurrence);
    }
    if (a.due_date === null) set.recurrence = null;
  } else if (a.target === "note") {
    if (a.title !== undefined) set.title = a.title;
    if (text !== undefined) set.body = text;
    set.updated_at = new Date().toISOString();
  } else {
    if (text !== undefined) set.body = text;
    set.updated_at = new Date().toISOString();
  }
  const { error } = await db.from(table).update(set).eq("id", target.id);
  if (error) throw new Error("Could not update");
  return { kind, id: target.id, path };
}

async function create(userId: string, db: Db, action: ChatAction, links: Links, targetId?: string): Promise<CreatedItem> {
  if (isChange(action)) return change(db, action, targetId);
  if (action.kind === "note") {
    const n = await createNote(db, { title: action.title, body: action.body });
    return { kind: "note", id: n.id, path: itemPath("note", n.id) };
  }
  if (action.kind === "journal") {
    // The journal text links to the to-dos and notes made from the same message (those that exist so far).
    const j = await createJournalEntry(db, { body: resolveRefs(action.body, links), entry_date: action.entry_date });
    return { kind: "journal", id: j.id, path: itemPath("journal", j.id, j.entry_date) };
  }
  if (action.kind === "feed") {
    const f = await addFeed(userId, action.url);
    return { kind: "feed", id: f.id, path: itemPath("feed", f.id) };
  }
  // Zoho: sent only now, because the person pressed Create. The service re-checks every field before calling Zoho.
  if (action.kind === "zoho_crm") {
    const r = await createCrmRecord(userId, action.module, action.fields);
    return { kind: action.kind, id: r.id || undefined, path: r.url };
  }
  if (action.kind === "zoho_mail") return { kind: action.kind, path: (await sendZohoMail(userId, action)).url };
  if (action.kind === "zoho_cliq") return { kind: action.kind, path: (await postZohoCliq(userId, action)).url };
  // Gmail, Google Calendar and Google Drive (Google sign-in): also only now, after the button press, and checked again by the service.
  if (action.kind === "gmail_send") return { kind: action.kind, path: (await sendGmail(userId, action)).url };
  if (action.kind === "gcal_event") {
    const r = await createCalendarEvent(userId, action);
    return { kind: action.kind, id: r.id || undefined, path: r.url };
  }
  // A repeating to-do needs a first date that fits its rule ("every 2nd Wednesday" starts on the next 2nd Wednesday).
  const recurrence = action.recurrence ?? null;
  const t = await createTask(db, {
    title: action.title,
    description: action.description,
    due_date: draftDue(action.due_date, recurrence),
    recurrence,
  });
  return { kind: "task", id: t.id, path: itemPath("task", t.id) };
}

/**
 * Creates drafts the assistant proposed in one of its messages, but only because the user pressed Create in the chat.
 * `which` is one draft (its position in the message) or "all" for every draft not yet created. Each created draft is marked
 * in the message, so pressing a button twice can never create the same item twice. Returns the items created now.
 *
 * To-dos and notes are created before the journal entry, so the entry can link to them. If the journal entry was saved earlier
 * and a to-do or note is created later, the entry is updated to link to it too.
 */
export async function createChatItems(userId: string, messageId: string, which: number | "all", targetId?: string) {
  const db = userDb(userId);
  let text = await getMessageBody(db, messageId); // null unless it is the caller's own assistant message
  if (text === null) return null;
  let proposals = parseChatActions(text).proposals;
  const todo = proposals
    // "Create all" never changes or deletes anything: those drafts need the person to pick the item and press their own button.
    .filter((p) => !p.created && (which === "all" ? !isChange(p.action) : p.index === which))
    .sort((a, b) => Number(a.action.kind === "journal") - Number(b.action.kind === "journal") || a.index - b.index);
  if (!todo.length) return null;

  const made: CreatedItem[] = [];
  for (const p of todo) {
    const item = await create(userId, db, p.action, linksOf(proposals), targetId);
    text = markCreated(text, p.index, item, p.action);
    made.push(item);
    // Save after every item so a failure part-way keeps what was already created marked as created.
    await replaceMessageBody(db, messageId, text);
    proposals = parseChatActions(text).proposals;
  }

  // A journal entry saved before these items existed gets its links now.
  if (made.some((m) => m.kind !== "journal")) {
    const links = linksOf(proposals);
    for (const p of proposals) {
      if (p.action.kind === "journal" && p.created?.id && !todo.some((t) => t.index === p.index))
        await setJournalBody(db, p.created.id, resolveRefs(p.action.body, links));
    }
  }
  return made;
}
