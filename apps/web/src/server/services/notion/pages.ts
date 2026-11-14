import "server-only";
import type { NotionImportResult, NotionPage, NotionPages } from "@untitled/types";
import { userDb } from "../../db/builders";
import { ConflictError, RateLimitError, ValidationError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as integrations from "../../repositories/integrations.repository";
import { createNote } from "../../repositories/notes.repository";
import { arr, obj, str, type J } from "../composio/json";
import { composio } from "./client";
import { notionConnectionId } from "./connection";

/**
 * Reading a person's Notion pages (through Composio, as that person) and turning chosen ones into notes. Nothing is stored but the
 * notes and a list of which pages were imported. Notion's answers are never trusted: every field is read defensively, and a page that
 * can't be read is counted as failed, not as an error for the whole import. Page text is never logged.
 */
const CALLS_PER_MINUTE = 200;
const TIMEOUT_MS = 30_000;
const PAGE_SIZE = 25;
const MAX_PER_IMPORT = 20;
const PARALLEL = 3;
const MAX_REMEMBERED = 5000;
const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const TITLE_MAX = 300;
const BODY_MAX = 200_000;

async function run(userId: string, tool: string, args: J): Promise<J> {
  const connectionId = await notionConnectionId(userId);
  if (!(await underLimit(`notion:${userId}`, CALLS_PER_MINUTE, 60))) throw new RateLimitError();
  let result: Awaited<ReturnType<ReturnType<typeof composio>["tools"]["execute"]>>;
  try {
    result = await composio().tools.execute(
      tool,
      { userId, connectedAccountId: connectionId, arguments: args, dangerouslySkipVersionCheck: true },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
  } catch (e) {
    console.error("notion call failed", e instanceof Error ? e.name : "unknown error");
    throw new ConflictError("We couldn’t reach Notion. Try again in a moment.");
  }
  if (result.successful) return obj(result.data);
  const reason = (result.error ?? "").slice(0, 160);
  if (/\b(401|unauthori[sz]ed|invalid_grant|revoked)\b/i.test(reason)) {
    await integrations.deleteIntegration(userId, "notion");
    throw new ConflictError("Your Notion connection expired. Connect it again in Settings → Imports & backup.");
  }
  throw new ConflictError(/\b404\b|not found|could not find/i.test(reason) ? "Notion can’t see that page. Share it with the connection in Notion first." : "Notion couldn’t do that.");
}

/** The first value found under any of these keys, looking at the answer and one or two levels of wrapping (`data`, `response_data`). */
function pick(d: J, keys: string[], depth = 0): unknown {
  for (const k of keys) if (d[k] !== undefined && d[k] !== null) return d[k];
  if (depth >= 2) return undefined;
  for (const wrap of ["data", "response_data", "result"]) {
    const inner = obj(d[wrap]);
    if (Object.keys(inner).length) {
      const v = pick(inner, keys, depth + 1);
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

const plain = (rich: unknown) => arr(rich).map((r) => str(obj(r).plain_text) || str(obj(obj(r).text).content)).join("");

/** A page's title: `title` as text, or the property of type "title" in `properties`. */
function titleOf(p: J): string {
  if (typeof p.title === "string" && p.title.trim()) return p.title.trim();
  if (Array.isArray(p.title)) return plain(p.title).trim();
  for (const prop of Object.values(obj(p.properties))) {
    const o = obj(prop);
    if (o.type === "title" || Array.isArray(o.title)) {
      const t = plain(o.title).trim();
      if (t) return t;
    }
  }
  return "";
}

const imported = (meta: Record<string, unknown>): Record<string, string> => {
  const m = obj(meta.imported);
  return Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "string")) as Record<string, string>;
};

/** One page of the person's Notion pages (newest edits first as Notion returns them), with which ones are already notes. */
export async function listNotionPages(userId: string, cursor?: string, query?: string): Promise<NotionPages> {
  const args: J = { fetch_type: "pages", page_size: PAGE_SIZE };
  if (cursor) args.start_cursor = cursor.slice(0, 200);
  if (query?.trim()) args.query = query.trim().slice(0, 100);
  const data = await run(userId, "NOTION_FETCH_DATA", args);
  const row = await integrations.getIntegration(userId, "notion");
  const done = imported(row?.meta ?? {});
  const list = pick(data, ["results", "pages", "values", "items"]);
  const pages: NotionPage[] = arr(list)
    .map(obj)
    .filter((p) => NOTION_ID.test(str(p.id)))
    .map((p) => ({
      id: str(p.id),
      title: titleOf(p).slice(0, TITLE_MAX) || "Untitled",
      edited: str(p.last_edited_time).slice(0, 40),
      url: /^https:\/\//.test(str(p.url)) ? str(p.url) : null,
      imported: str(p.id) in done,
    }));
  const next = pick(data, ["next_cursor", "nextCursor"]);
  return { pages, next: typeof next === "string" && next ? next.slice(0, 200) : null };
}

/** A page's text as Markdown. */
async function markdownOf(userId: string, id: string): Promise<{ title: string; body: string }> {
  const [md, meta] = await Promise.all([run(userId, "NOTION_GET_PAGE_MARKDOWN", { page_id: id }), run(userId, "NOTION_RETRIEVE_PAGE", { page_id: id }).catch(() => ({}) as J)]);
  const raw = pick(md, ["markdown", "content", "text", "body"]);
  const body = (typeof raw === "string" ? raw : "").slice(0, BODY_MAX);
  const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? "";
  const title = (titleOf(meta) || titleOf(obj(meta.data)) || titleOf(obj(meta.response_data)) || titleOf(obj(meta.page)) || heading || "Untitled").slice(0, TITLE_MAX);
  return { title, body };
}

/** Turns the chosen pages into notes (at most 20 at a time). A page already imported is skipped, so importing again adds no copies. */
export async function importNotionPages(userId: string, ids: string[]): Promise<NotionImportResult> {
  const unique = [...new Set(ids)];
  if (!unique.length) throw new ValidationError("Pick at least one page.");
  if (unique.length > MAX_PER_IMPORT) throw new ValidationError(`Import at most ${MAX_PER_IMPORT} pages at a time.`);
  if (unique.some((id) => !NOTION_ID.test(id))) throw new ValidationError("That isn’t a Notion page.");
  const row = await integrations.getIntegration(userId, "notion");
  if (!row) throw new ConflictError("Connect Notion in Settings → Imports & backup first.");
  const done = imported(row.meta);
  const todo = unique.filter((id) => !(id in done));
  const result: NotionImportResult = { imported: 0, skipped: unique.length - todo.length, failed: 0 };
  const db = userDb(userId);
  for (let i = 0; i < todo.length; i += PARALLEL) {
    await Promise.all(
      todo.slice(i, i + PARALLEL).map(async (id) => {
        try {
          const { title, body } = await markdownOf(userId, id);
          const note = await createNote(db, { title, body: body || title });
          done[id] = note.id;
          result.imported += 1;
        } catch (e) {
          // A lost connection or a busy server stops the whole import; a single unreadable page does not.
          if (e instanceof RateLimitError || (e instanceof ConflictError && /expired|Connect Notion/.test(e.message))) throw e;
          result.failed += 1;
        }
      }),
    );
  }
  const kept = Object.fromEntries(Object.entries(done).slice(-MAX_REMEMBERED));
  await integrations.updateIntegrationTokens(userId, "notion", row.secret_cipher, { ...row.meta, imported: kept });
  return result;
}
