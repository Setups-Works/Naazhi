import { beforeEach, describe, expect, it, vi } from "vitest";

/* Tested without a database or a network: the repositories and the Composio SDK are replaced by fakes. */
const sdk = vi.hoisted(() => ({ execute: vi.fn() }));
const integrations = vi.hoisted(() => ({ getIntegration: vi.fn(), saveIntegration: vi.fn(), deleteIntegration: vi.fn() }));
const notes = vi.hoisted(() => ({ createNote: vi.fn() }));

vi.mock("../../src/server/repositories/integrations.repository", () => integrations);
vi.mock("../../src/server/repositories/notes.repository", () => notes);
vi.mock("../../src/server/db/builders", () => ({ userDb: () => ({}) }));
vi.mock("../../src/server/rateLimit", () => ({ underLimit: async () => true }));
vi.mock("../../src/server/services/notion/client", () => ({ notionSession: async () => ({ execute: sdk.execute }) }));
vi.mock("../../src/server/services/notion/connection", () => ({ requireNotion: async () => undefined }));
vi.mock("../../src/server/services/billing/keyVault", () => ({ sealKey: (s: string) => `sealed:${s}` }));

const { listNotionPages, importNotionPages } = await import("../../src/server/services/notion/pages");

const ID1 = "11111111-1111-1111-1111-111111111111";
const ID2 = "22222222-2222-2222-2222-222222222222";
const ok = (data: Record<string, unknown>) => ({ error: null, data });

beforeEach(() => {
  vi.clearAllMocks();
  integrations.getIntegration.mockResolvedValue({ provider: "notion", secret_cipher: "sealed", label: "", services: ["connected"], scopes: "", meta: { imported: { [ID2]: "note-9" } } });
});

describe("Notion pages", () => {
  it("lists pages with their titles, marks the ones already imported and passes the cursor on", async () => {
    sdk.execute.mockResolvedValue(
      ok({
        response_data: {
          results: [
            { id: ID1, url: "https://www.notion.so/a", last_edited_time: "2026-11-01T10:00:00.000Z", properties: { Name: { type: "title", title: [{ plain_text: "Trip " }, { plain_text: "plan" }] } } },
            { id: ID2, title: "Done already" },
            { id: "not-an-id", title: "Junk" },
          ],
          next_cursor: "abc",
        },
      }),
    );
    const r = await listNotionPages("user-1", "cur", "trip");
    expect(sdk.execute.mock.calls[0][0]).toBe("NOTION_FETCH_DATA");
    expect(sdk.execute.mock.calls[0][1]).toMatchObject({ fetch_type: "pages", start_cursor: "cur", query: "trip" });
    expect(r.pages).toEqual([
      { id: ID1, title: "Trip plan", edited: "2026-11-01T10:00:00.000Z", url: "https://www.notion.so/a", imported: false },
      { id: ID2, title: "Done already", edited: "", url: null, imported: true },
    ]);
    expect(r.next).toBe("abc");
  });
});

describe("Notion import", () => {
  it("makes a note from each page, skips pages already imported, counts a page that can't be read, and remembers what it did", async () => {
    const bad = "33333333-3333-3333-3333-333333333333";
    const page = (a: { page_id: string }) => a.page_id;
    sdk.execute.mockImplementation(async (tool: string, args: { page_id: string }) => {
      if (page(args) === bad) return { error: "404 not found", data: {} };
      if (tool === "NOTION_GET_PAGE_MARKDOWN") return ok({ markdown: `# Hello\n\nBody of ${args.page_id.slice(0, 1)}` });
      return ok({ properties: { Title: { type: "title", title: [{ plain_text: "Hello page" }] } } });
    });
    notes.createNote.mockResolvedValue({ id: "note-1" });
    const r = await importNotionPages("user-1", [ID1, ID2, bad]);
    expect(r).toEqual({ imported: 1, skipped: 1, failed: 1 });
    expect(notes.createNote).toHaveBeenCalledTimes(1);
    expect(notes.createNote.mock.calls[0][1]).toMatchObject({ title: "Hello page" });
    const meta = integrations.saveIntegration.mock.calls[0][1].meta;
    expect(Object.keys(meta.imported).sort()).toEqual([ID1, ID2].sort());
  });

  it("refuses an id that isn't a Notion page and more than 20 pages at once", async () => {
    await expect(importNotionPages("user-1", ["../x"])).rejects.toThrow("isn’t a Notion page");
    await expect(importNotionPages("user-1", Array.from({ length: 21 }, (_, i) => `${String(i).padStart(8, "0")}-1111-1111-1111-111111111111`))).rejects.toThrow("at most 20");
    expect(sdk.execute).not.toHaveBeenCalled();
  });
});
