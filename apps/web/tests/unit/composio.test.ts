import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPOSIO_APP_IDS as TYPE_IDS } from "@untitled/types";
import { COMPOSIO_APP_IDS as CHAT_IDS, parseChatActions } from "@untitled/validation";
import { COMPOSIO_APPS, composioAppFor } from "../../src/lib/composio/apps";
import { composioLine } from "../../src/server/services/ai/prompts/composio";
import { dayAndTime } from "../../src/server/services/composio/json";

/*
 * The service is tested without a database or a network: the repository and the SDK client are replaced by the fakes below, so
 * each test says exactly what is stored and what Composio answers.
 */
const repo = vi.hoisted(() => ({
  getConnection: vi.fn(),
  listConnections: vi.fn(),
  saveConnection: vi.fn(),
  setConnectionStatus: vi.fn(),
  deleteConnection: vi.fn(),
  findConnectionOwner: vi.fn(),
  recordEvent: vi.fn(),
}));
const sdk = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("../../src/server/repositories/composioConnections.repository", () => repo);
vi.mock("../../src/server/services/composio/client", () => ({
  composio: () => ({ tools: { execute: sdk.execute } }),
  composioConfigured: () => true,
  appAvailable: () => true,
  authConfigId: () => "ac_test",
  toolkitVersion: () => undefined,
  webhookSecret: () => "whsec_test",
}));

const { executeTool } = await import("../../src/server/services/composio/tools");
const { createCalendarEvent, sendGmail } = await import("../../src/server/services/composio/drafts");
const { connectionState } = await import("../../src/server/services/composio/connections");
const { handleComposioEvent } = await import("../../src/server/services/composio/webhook");
const { listComposioItems } = await import("../../src/server/services/composio/readers");

const connected = { app: "gmail", connection_id: "ca_1", status: "connected", label: "ada@example.com" };
const ok = (data: Record<string, unknown>) => ({ successful: true, error: null, data });

beforeEach(() => {
  vi.clearAllMocks();
  repo.getConnection.mockResolvedValue(connected);
});

describe("Composio vocabulary", () => {
  it("lists the same apps in the types, the chat blocks and the app details", () => {
    expect([...CHAT_IDS]).toEqual([...TYPE_IDS]);
    expect(Object.keys(COMPOSIO_APPS).sort()).toEqual([...TYPE_IDS].sort());
  });

  it("finds the app behind a service on a Settings page", () => {
    expect(composioAppFor("google", "gmail")).toBe("gmail");
    expect(composioAppFor("google", "calendar")).toBe("googlecalendar");
    expect(composioAppFor("google", "drive")).toBeNull();
    expect(composioAppFor("zoho", "mail")).toBeNull();
  });

  it("maps Composio's connection states to ours", () => {
    expect(connectionState("ACTIVE")).toBe("connected");
    expect(connectionState("INITIATED")).toBe("pending");
    expect(connectionState("EXPIRED")).toBe("expired");
    expect(connectionState("REVOKED")).toBe("error");
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
    expect(composioLine([])).toContain("has not connected Gmail or Google Calendar");
  });
});

describe("Running a tool", () => {
  it("runs as the person, with their own connection", async () => {
    sdk.execute.mockResolvedValue(ok({ messages: [] }));
    await executeTool("user-1", "gmail", "GMAIL_FETCH_EMAILS", { query: "x" });
    expect(sdk.execute).toHaveBeenCalledWith(
      "GMAIL_FETCH_EMAILS",
      expect.objectContaining({ userId: "user-1", connectedAccountId: "ca_1", arguments: { query: "x" } }),
      expect.anything(),
    );
  });

  it("never runs another app's tool on a connection", async () => {
    await expect(executeTool("user-1", "gmail", "GOOGLECALENDAR_CREATE_EVENT")).rejects.toThrow("isn’t something Gmail can do");
    expect(sdk.execute).not.toHaveBeenCalled();
  });

  it("asks the person to connect first, or to reconnect a connection that stopped working", async () => {
    repo.getConnection.mockResolvedValueOnce(null);
    await expect(executeTool("user-1", "gmail", "GMAIL_FETCH_EMAILS")).rejects.toThrow("Connect Gmail in Settings → Google first.");
    repo.getConnection.mockResolvedValueOnce({ ...connected, status: "expired" });
    await expect(executeTool("user-1", "gmail", "GMAIL_FETCH_EMAILS")).rejects.toThrow("Reconnect it in Settings → Google.");
    expect(sdk.execute).not.toHaveBeenCalled();
  });

  it("marks the connection as expired when the app no longer accepts it", async () => {
    sdk.execute.mockResolvedValue({ successful: false, error: "401 Unauthorized: invalid_grant", data: {} });
    await expect(executeTool("user-1", "gmail", "GMAIL_FETCH_EMAILS")).rejects.toThrow("Reconnect it");
    expect(repo.setConnectionStatus).toHaveBeenCalledWith("user-1", "gmail", "expired");
  });
});

describe("Chat cards", () => {
  it("turns Gmail's answer into rows, searching the list the card asked for", async () => {
    sdk.execute.mockResolvedValue(ok({ messages: [{ threadId: "t1", subject: "Invoice", sender: "Bob <bob@x.com>", messageTimestamp: "2026-11-14T08:00:00Z" }] }));
    const items = await listComposioItems("user-1", "gmail", "unread", "invoice");
    expect(sdk.execute.mock.calls[0][1].arguments.query).toBe("in:inbox is:unread invoice");
    expect(items.rows).toEqual([{ id: "t1", title: "Invoice", subtitle: "Bob <bob@x.com> · 14 Nov 2026, 08:00", url: "https://mail.google.com/mail/#all/t1" }]);
  });

  it("refuses an app Naazhi doesn't connect", async () => {
    await expect(listComposioItems("user-1", "dropbox")).rejects.toThrow("isn’t an app Naazhi can connect");
  });
});

describe("Drafts", () => {
  beforeEach(() => repo.getConnection.mockResolvedValue({ ...connected, app: "googlecalendar" }));

  it("adds an all-day event with the day after as its end", async () => {
    sdk.execute.mockResolvedValue(ok({ id: "ev1", htmlLink: "https://calendar.google.com/event?eid=1" }));
    const done = await createCalendarEvent("user-1", { title: "Holiday", date: "2026-12-31" });
    expect(sdk.execute.mock.calls[0][1].arguments).toMatchObject({ summary: "Holiday", start_date: "2026-12-31", end_date: "2027-01-01" });
    expect(done).toEqual({ id: "ev1", url: "https://calendar.google.com/event?eid=1" });
  });

  it("adds a timed event in the calendar's own time zone, one hour long without an end", async () => {
    sdk.execute.mockResolvedValueOnce(ok({ timeZone: "Asia/Kolkata", items: [] })).mockResolvedValueOnce(ok({ id: "ev2" }));
    await createCalendarEvent("user-1", { title: "Call", date: "2026-11-20", start_time: "23:30" });
    expect(sdk.execute.mock.calls[1][1].arguments).toMatchObject({
      start_datetime: "2026-11-20T23:30:00",
      end_datetime: "2026-11-21T00:30:00",
      timezone: "Asia/Kolkata",
    });
  });

  it("adds nothing when the calendar's time zone can't be read", async () => {
    sdk.execute.mockResolvedValueOnce(ok({ items: [] }));
    await expect(createCalendarEvent("user-1", { title: "Call", date: "2026-11-20", start_time: "10:00" })).rejects.toThrow("time zone");
    expect(sdk.execute).toHaveBeenCalledTimes(1);
  });

  it("checks an email again before sending it, as plain text", async () => {
    repo.getConnection.mockResolvedValue(connected);
    await expect(sendGmail("user-1", { to: "nope", subject: "Hi", body: "x" })).rejects.toThrow("doesn’t look right");
    sdk.execute.mockResolvedValue(ok({}));
    await sendGmail("user-1", { to: "ada@example.com", subject: "Hi", body: "<b>x</b>" });
    expect(sdk.execute.mock.calls[0][1].arguments).toMatchObject({ recipient_email: "ada@example.com", is_html: false });
  });
});

describe("Webhook events", () => {
  const event = { id: "evt_1", userId: "user-1", connectionId: "ca_1", trigger: "GMAIL_NEW_GMAIL_MESSAGE" };

  it("records an event for a known connection once", async () => {
    repo.findConnectionOwner.mockResolvedValue({ user_id: "user-1", app: "gmail" });
    repo.recordEvent.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await handleComposioEvent(event)).toBe("recorded");
    expect(await handleComposioEvent(event)).toBe("duplicate");
  });

  it("ignores an event whose person doesn't match our own record", async () => {
    repo.findConnectionOwner.mockResolvedValue({ user_id: "someone-else", app: "gmail" });
    expect(await handleComposioEvent(event)).toBe("ignored");
    repo.findConnectionOwner.mockResolvedValue(null);
    expect(await handleComposioEvent(event)).toBe("ignored");
    expect(repo.recordEvent).not.toHaveBeenCalled();
  });
});
