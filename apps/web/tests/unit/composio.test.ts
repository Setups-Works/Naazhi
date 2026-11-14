import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPOSIO_APP_IDS as TYPE_IDS } from "@untitled/types";
import { COMPOSIO_APP_IDS as CHAT_IDS, parseChatActions } from "@untitled/validation";
import { COMPOSIO_APPS, composioAppFor } from "../../src/lib/composio/apps";
import { composioLine } from "../../src/server/services/ai/prompts/composio";
import { dayAndTime } from "../../src/server/services/composio/json";

/*
 * The service is tested without a database or a network: Google's API calls are replaced by a fake, so each test says exactly
 * what Google answers and what was asked of it.
 */
const api = vi.hoisted(() => ({ googleApi: vi.fn() }));
const journal = vi.hoisted(() => ({ createJournalEntry: vi.fn() }));
vi.mock("../../src/server/repositories/journal.repository", () => journal);
vi.mock("../../src/server/db/builders", () => ({ userDb: () => ({}) }));
vi.mock("../../src/server/services/composio/api", () => api);
vi.mock("../../src/server/services/composio/google", () => ({ appsFor: (g: string) => g.split(" ") }));

const { createCalendarEvent, sendGmail } = await import("../../src/server/services/composio/drafts");
const { listComposioItems } = await import("../../src/server/services/composio/readers");
const { saveEventToJournal } = await import("../../src/server/services/composio/eventToJournal");
const { listGoogleCalendarEvents } = await import("../../src/server/services/composio/calendarImport");

beforeEach(() => vi.clearAllMocks());

describe("Composio vocabulary", () => {
  it("lists the same apps in the types, the chat blocks and the app details", () => {
    expect([...CHAT_IDS]).toEqual([...TYPE_IDS]);
    expect(Object.keys(COMPOSIO_APPS).sort()).toEqual([...TYPE_IDS].sort());
  });

  it("finds the app behind a service on a Settings page", () => {
    expect(composioAppFor("google", "gmail")).toBe("gmail");
    expect(composioAppFor("google", "calendar")).toBe("googlecalendar");
    expect(composioAppFor("google", "drive")).toBe("googledrive");
    expect(composioAppFor("zoho", "mail")).toBeNull();
  });

  it("formats a date and time from the text itself, never shifted into another zone", () => {
    expect(dayAndTime("2026-11-20T14:30:00+05:30")).toBe("20 Nov 2026, 14:30");
    expect(dayAndTime("2026-11-20")).toBe("20 Nov 2026");
    expect(dayAndTime("not a date")).toBe("");
  });
});

describe("Composio blocks in chat", () => {
  it("reads a card request, an email draft and an event draft from an assistant reply", () => {
    const r = parseChatActions(
      'Here is your inbox.<show-item>{"kind":"composio","app":"gmail","view":"unread"}</show-item>' +
        '<create-item>{"kind":"gmail_send","to":"ada@example.com","subject":"Hello","body":"Hi Ada"}</create-item>' +
        '<create-item>{"kind":"gcal_event","title":"Dentist","date":"2026-11-20","start_time":"09:30"}</create-item>',
    );
    expect(r.shows).toEqual([{ kind: "composio", app: "gmail", view: "unread" }]);
    expect(r.proposals.map((p) => p.action.kind)).toEqual(["gmail_send", "gcal_event"]);
  });

  it("drops blocks that are malformed or name an app Naazhi doesn't connect", () => {
    const r = parseChatActions(
      '<show-item>{"kind":"composio","app":"dropbox"}</show-item>' +
        '<create-item>{"kind":"gmail_send","to":"not-an-email","subject":"Hi","body":"x"}</create-item>' +
        '<create-item>{"kind":"gcal_event","title":"Call","date":"2026-11-20","start_time":"10:00","end_time":"09:00"}</create-item>' +
        '<create-item>{"kind":"gcal_event","title":"Call","date":"2026-11-20","end_time":"09:00"}</create-item>',
    );
    expect(r.shows).toEqual([]);
    expect(r.proposals).toEqual([]);
  });
});

describe("Composio prompt", () => {
  it("only offers the apps the person connected", () => {
    const mail = composioLine(["gmail"]);
    expect(mail).toContain("gmail (inbox|unread|sent)");
    expect(mail).toContain("gmail_send");
    expect(mail).not.toContain("gcal_event");
    expect(composioLine(["gmail", "googlecalendar"])).toContain("gcal_event");
    expect(composioLine(["googledrive"])).not.toContain("GOOGLE ACTIONS");
    expect(composioLine([])).toContain("has not connected Google");
  });
});

describe("Chat cards", () => {
  it("turns Gmail's answers into rows, searching the list the card asked for", async () => {
    api.googleApi
      .mockResolvedValueOnce({ messages: [{ id: "m1" }] })
      .mockResolvedValueOnce({ id: "m1", threadId: "t1", internalDate: String(Date.parse("2026-11-14T08:00:00Z")), payload: { headers: [{ name: "Subject", value: "Invoice" }, { name: "From", value: "Bob <bob@x.com>" }] } });
    const items = await listComposioItems("user-1", "gmail", "unread", "invoice");
    expect(decodeURIComponent(String(api.googleApi.mock.calls[0][2]).replace(/\+/g, " "))).toContain("q=in:inbox is:unread invoice");
    expect(items.rows).toEqual([{ id: "t1", title: "Invoice", subtitle: "Bob <bob@x.com> · 14 Nov 2026, 08:00", url: "https://mail.google.com/mail/#all/t1" }]);
  });

  it("lists Drive files, escaping quotes in the search", async () => {
    api.googleApi.mockResolvedValueOnce({ files: [{ id: "f1", name: "Plan", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-11-14T08:00:00Z", webViewLink: "https://docs.google.com/d/f1" }] });
    const items = await listComposioItems("user-1", "googledrive", "recent", "it's");
    expect(decodeURIComponent(String(api.googleApi.mock.calls[0][2]).replace(/\+/g, " "))).toContain("name contains 'it\\'s'");
    expect(items.rows[0]).toMatchObject({ id: "f1", title: "Plan", subtitle: "Doc · 14 Nov 2026, 08:00" });
  });

  it("searches past events too, retrying with the longest word when the whole phrase finds nothing", async () => {
    api.googleApi
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [{ id: "k", summary: "Kaber Vasuki - Live", start: { dateTime: "2026-03-22T18:00:00+05:30" }, htmlLink: "https://calendar.google.com/e/k" }] });
    const items = await listComposioItems("user-1", "googlecalendar", "upcoming", "kaber vasuki concert");
    const first = new URL(String(api.googleApi.mock.calls[0][2])).searchParams;
    expect(Date.parse(first.get("timeMin") ?? "")).toBeLessThan(Date.now() - 300 * 24 * 3_600_000);
    expect(new URL(String(api.googleApi.mock.calls[1][2])).searchParams.get("q")).toBe("kaber vasuki concert".split(" ").sort((a, b) => b.length - a.length)[0]);
    expect(items.rows).toEqual([{ id: "k", title: "Kaber Vasuki - Live", subtitle: "22 Mar 2026, 18:00", url: "https://calendar.google.com/e/k" }]);
    expect(items.title).toBe("Google Calendar matching “kaber vasuki concert”");
  });

  it("refuses an app Naazhi doesn't connect", async () => {
    await expect(listComposioItems("user-1", "dropbox")).rejects.toThrow("isn’t an app Naazhi can connect");
  });
});

describe("Drafts", () => {
  it("adds an all-day event with the day after as its end", async () => {
    api.googleApi.mockResolvedValue({ id: "ev1", htmlLink: "https://calendar.google.com/event?eid=1" });
    const done = await createCalendarEvent("user-1", { title: "Holiday", date: "2026-12-31" });
    expect(api.googleApi.mock.calls[0][3].body).toMatchObject({ summary: "Holiday", start: { date: "2026-12-31" }, end: { date: "2027-01-01" } });
    expect(done).toEqual({ id: "ev1", url: "https://calendar.google.com/event?eid=1" });
  });

  it("adds a timed event in the calendar's own time zone, one hour long without an end", async () => {
    api.googleApi.mockResolvedValueOnce({ timeZone: "Asia/Kolkata", items: [] }).mockResolvedValueOnce({ id: "ev2" });
    await createCalendarEvent("user-1", { title: "Call", date: "2026-11-20", start_time: "23:30" });
    expect(api.googleApi.mock.calls[1][3].body).toMatchObject({
      start: { dateTime: "2026-11-20T23:30:00", timeZone: "Asia/Kolkata" },
      end: { dateTime: "2026-11-21T00:30:00", timeZone: "Asia/Kolkata" },
    });
  });

  it("adds nothing when the calendar's time zone can't be read", async () => {
    api.googleApi.mockResolvedValueOnce({ items: [] });
    await expect(createCalendarEvent("user-1", { title: "Call", date: "2026-11-20", start_time: "10:00" })).rejects.toThrow("time zone");
    expect(api.googleApi).toHaveBeenCalledTimes(1);
  });

  it("checks an email again before sending it, as plain text with no way to inject headers", async () => {
    await expect(sendGmail("user-1", { to: "nope", subject: "Hi", body: "x" })).rejects.toThrow("doesn’t look right");
    api.googleApi.mockResolvedValue({ id: "sent1" });
    await sendGmail("user-1", { to: "ada@example.com", subject: "Hi\r\nBcc: spy@example.com", body: "<b>x</b>" });
    const raw = Buffer.from(String(api.googleApi.mock.calls[0][3].body.raw), "base64url").toString("utf8");
    expect(raw).toContain("To: ada@example.com");
    expect(raw).toContain("Content-Type: text/plain");
    expect(raw).not.toMatch(/\r\nBcc:/);
  });
});

describe("Calendar import", () => {
  it("turns Google events into plain rows: all-day ends on the last day, cancelled ones are left out, every page is read", async () => {
    api.googleApi
      .mockResolvedValueOnce({
        nextPageToken: "p2",
        items: [
          { id: "a", summary: "Holiday", start: { date: "2026-12-24" }, end: { date: "2026-12-27" } },
          { id: "b", status: "cancelled", summary: "Gone", start: { date: "2026-12-01" }, end: { date: "2026-12-02" } },
        ],
      })
      .mockResolvedValueOnce({ items: [{ id: "c", start: { dateTime: "2026-11-20T10:00:00+05:30" }, end: { dateTime: "2026-11-20T11:00:00+05:30" } }] });
    const { events, truncated } = await listGoogleCalendarEvents("user-1");
    expect(truncated).toBe(false);
    expect(events).toEqual([
      { external_id: "a", title: "Holiday", description: "", location: "", all_day: true, start: "2026-12-24", end: "2026-12-26" },
      { external_id: "c", title: "(no title)", description: "", location: "", all_day: false, start: "2026-11-20T10:00:00+05:30", end: "2026-11-20T11:00:00+05:30" },
    ]);
    expect(String(api.googleApi.mock.calls[1][2])).toContain("pageToken=p2");
  });
});

describe("Calendar event → journal", () => {
  it("writes the event, read again from Google, into the journal on the event's own day", async () => {
    api.googleApi.mockResolvedValue({ summary: "Kaber Vasuki concert", location: "Chennai", start: { dateTime: "2026-03-22T18:00:00+05:30" }, end: { dateTime: "2026-03-22T21:00:00+05:30" } });
    journal.createJournalEntry.mockResolvedValue({ id: "j1", entry_date: "2026-03-22" });
    const r = await saveEventToJournal("user-1", "ev_1");
    expect(journal.createJournalEntry.mock.calls[0][1]).toEqual({
      entry_date: "2026-03-22",
      body: "Kaber Vasuki concert\n\n22 Mar 2026, 18:00 · until 21:00\n\nWhere: Chennai",
    });
    expect(r.entry_date).toBe("2026-03-22");
  });

  it("refuses an event id that isn't one", async () => {
    await expect(saveEventToJournal("user-1", "../x")).rejects.toThrow("isn’t an event");
    expect(api.googleApi).not.toHaveBeenCalled();
  });
});
