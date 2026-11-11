import { afterEach, describe, expect, it, vi } from "vitest";
import { ZOHO_SERVICE_IDS as CHAT_IDS, parseChatActions } from "@untitled/validation";
import {
  ZOHO_ACCOUNTS_SERVERS,
  ZOHO_PROFILE_SCOPE,
  ZOHO_SERVICES,
  ZOHO_SERVICE_IDS,
  apisHost,
  isZohoAccountsServer,
  productHost,
  scopesFor,
  zoneOf,
} from "../../src/lib/zoho";
import { READERS } from "../../src/server/services/integrations/zoho/products";
import type { Ctx } from "../../src/server/services/integrations/zoho/api";
import { zohoLine } from "../../src/server/services/ai/prompts/chat";

const ctx = (service: Ctx["service"], zone = "zoho.eu"): Ctx => ({ token: "tok", zone, accounts: `https://accounts.${zone}`, services: [service], userId: "u1", service });

afterEach(() => vi.unstubAllGlobals());

function mockFetch(...answers: unknown[]) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const a = answers.shift();
    return a === null ? new Response(null, { status: 204 }) : new Response(JSON.stringify(a), { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", f);
  return calls;
}

describe("Zoho vocabulary", () => {
  it("lists the same services for chat blocks as for the app", () => {
    expect([...CHAT_IDS]).toEqual([...ZOHO_SERVICE_IDS]);
    expect(Object.keys(ZOHO_SERVICES).sort()).toEqual([...ZOHO_SERVICE_IDS].sort());
  });

  it("asks only for the scopes of the picked services, plus the profile scope, without repeats", () => {
    const s = scopesFor(["crm", "workdrive"]);
    expect(s[0]).toBe(ZOHO_PROFILE_SCOPE);
    expect(s).toContain("ZohoCRM.modules.leads.READ");
    expect(s).toContain("WorkDrive.files.READ");
    expect(s).not.toContain("Desk.tickets.READ");
    expect(s.filter((x) => x === "ZohoSearch.securesearch.READ")).toHaveLength(1);
  });

  it("only trusts the data centers Zoho lists, so a crafted callback can't point the server elsewhere", () => {
    expect(isZohoAccountsServer("https://accounts.zoho.in")).toBe(true);
    expect(isZohoAccountsServer("https://accounts.zoho.in/")).toBe(true);
    expect(isZohoAccountsServer("https://accounts.zoho.com.evil.test")).toBe(false);
    expect(isZohoAccountsServer("http://accounts.zoho.com")).toBe(false);
    expect(isZohoAccountsServer(null)).toBe(false);
    expect(ZOHO_ACCOUNTS_SERVERS.every((s) => s.startsWith("https://accounts."))).toBe(true);
  });

  it("builds each service's address from the person's data center", () => {
    expect(zoneOf("https://accounts.zoho.eu")).toBe("zoho.eu");
    expect(zoneOf("https://accounts.zohocloud.ca")).toBe("zohocloud.ca");
    expect(productHost("desk", "zoho.in")).toBe("https://desk.zoho.in");
    expect(apisHost("zoho.com")).toBe("https://www.zohoapis.com");
    expect(apisHost("zoho.com.au")).toBe("https://www.zohoapis.com.au");
    expect(apisHost("zohocloud.ca")).toBe("https://www.zohoapis.ca");
  });
});

describe("Zoho in chat blocks", () => {
  it("reads a Zoho card request and a CRM draft from an assistant reply", () => {
    const text =
      'Here are your leads.<show-item>{"kind":"zoho","service":"crm","view":"leads","query":"acme"}</show-item>' +
      '<create-item>{"kind":"zoho_crm","module":"Leads","fields":{"Last_Name":"Rao","Company":"Acme"}}</create-item>';
    const r = parseChatActions(text);
    expect(r.shows).toEqual([{ kind: "zoho", service: "crm", view: "leads", query: "acme" }]);
    expect(r.proposals).toHaveLength(1);
    expect(r.proposals[0].action).toMatchObject({ kind: "zoho_crm", module: "Leads" });
  });

  it("drops Zoho blocks that are malformed or ask for something that doesn't exist", () => {
    const r = parseChatActions(
      '<show-item>{"kind":"zoho","service":"nope"}</show-item>' +
        '<create-item>{"kind":"zoho_mail","to":"not-an-email","subject":"Hi","body":"x"}</create-item>' +
        '<create-item>{"kind":"zoho_crm","module":"Deals","fields":{}}</create-item>',
    );
    expect(r.shows).toEqual([]);
    expect(r.proposals).toEqual([]);
  });
});

describe("Zoho prompt", () => {
  it("only offers the connected services, and writes only where a write is possible", () => {
    const some = zohoLine(["crm", "desk"]);
    expect(some).toContain("crm (leads|contacts|accounts|deals)");
    expect(some).toContain("zoho_crm");
    expect(some).not.toContain("zoho_mail");
    expect(some).not.toContain("books");
    expect(zohoLine([])).toContain("has not connected Zoho");
  });
});

describe("Zoho readers", () => {
  it("lists CRM leads newest first with the mandatory field list, in the person's data center", async () => {
    const calls = mockFetch({ data: [{ id: "1", First_Name: "Asha", Last_Name: "Rao", Company: "Acme", Lead_Status: "Contacted", Email: "a@acme.test" }] });
    const rows = await READERS.crm(ctx("crm"), "leads", "");
    expect(calls[0].url).toContain("https://www.zohoapis.eu/crm/v8/Leads?fields=");
    expect(calls[0].url).toContain("sort_by=Created_Time");
    expect(calls[0].headers.authorization).toBe("Zoho-oauthtoken tok");
    expect(rows).toEqual([{ id: "1", title: "Asha Rao", subtitle: "Acme · Contacted · a@acme.test", url: "https://crm.zoho.eu/crm/tab/Leads/1" }]);
  });

  it("searches CRM with the search endpoint and treats 204 (nothing found) as an empty list", async () => {
    const calls = mockFetch(null);
    const rows = await READERS.crm(ctx("crm"), "contacts", "john smith");
    expect(calls[0].url).toContain("/crm/v8/Contacts/search?word=john%20smith");
    expect(rows).toEqual([]);
  });

  it("reads Desk tickets for the person's organisation", async () => {
    const calls = mockFetch({ data: [{ id: "9", isDefault: true }] }, { data: [{ id: "t1", ticketNumber: "101", subject: "Printer", status: "Open", email: "c@x.test", webUrl: "https://desk.zoho.eu/t/1" }] });
    const rows = await READERS.desk(ctx("desk"), "tickets", "");
    expect(calls[1].url).toContain("https://desk.zoho.eu/api/v1/tickets?limit=6");
    expect(calls[1].headers.orgId).toBe("9");
    expect(rows[0]).toMatchObject({ title: "#101 Printer", subtitle: "Open · c@x.test", url: "https://desk.zoho.eu/t/1" });
  });

  it("finds the mail account first, then lists the inbox", async () => {
    const calls = mockFetch({ data: [{ accountId: "77" }] }, { data: [{ messageId: "5", subject: "Hello", sender: "Sam", receivedTime: "1700000000000" }] });
    const rows = await READERS.mail(ctx("mail", "zoho.com"), "unread", "");
    expect(calls[1].url).toBe("https://mail.zoho.com/api/accounts/77/messages/view?limit=6&status=unread");
    expect(rows[0]).toMatchObject({ title: "Hello" });
  });

  it("explains a rejected connection instead of showing an error code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    await expect(READERS.crm(ctx("crm"), "leads", "")).rejects.toThrow(/Reconnect Zoho/);
  });
});
