import { describe, expect, it } from "vitest";
import { recentItems } from "../../src/features/home/recent";

const notes = [{ id: "n1", title: "Weekly plan", updated_at: "2026-11-17T09:00:00Z" }, { id: "n2", title: "  ", updated_at: "2026-11-15T09:00:00Z" }];
const chats = [{ id: "c1", title: "Plan my week", updated_at: "2026-11-17T10:00:00Z" }];
const entries = [{ id: "j1", body: "\n  Slow morning.\nWalked to the lake.", created_at: "2026-11-17T08:00:00Z" }, { id: "j2", body: "", created_at: "2026-11-16T08:00:00Z" }];

describe("recentItems (Jump back in)", () => {
  it("mixes notes, chats and journal entries, newest first", () =>
    expect(recentItems(notes, chats, entries).map((x) => x.id)).toEqual(["c1", "n1", "j1", "j2", "n2"]));
  it("filters by kind", () => expect(recentItems(notes, chats, entries, "note").map((x) => x.id)).toEqual(["n1", "n2"]));
  it("limits the list", () => expect(recentItems(notes, chats, entries, "all", 2)).toHaveLength(2));
  it("gives each item a title and the address that opens it", () => {
    const [chat, note, entry] = recentItems(notes, chats, entries);
    expect(chat.href).toBe("/dashboard/chat?c=c1");
    expect(note.href).toBe("/dashboard/notes?note=n1");
    expect(entry.title).toBe("Slow morning.");
    expect(recentItems(notes, chats, entries, "note")[1].title).toBe("Untitled");
    expect(recentItems(notes, chats, entries, "journal")[1].title).toBe("Voice or attachment");
  });
});
