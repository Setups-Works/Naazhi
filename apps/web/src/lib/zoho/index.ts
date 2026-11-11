/**
 * Zoho vocabulary shared by the server and the browser: which services exist, the OAuth scopes each one needs, the data centers
 * and how a service's address is built from the person's data center. Pure constants and functions; no secrets, no network.
 *
 * Facts here were taken from Zoho's own docs (OAuth, CRM v8, Mail, Cliq, Calendar, Expense) and Zoho's OpenAPI files (Desk, WorkDrive,
 * Mail). Services whose documentation could not be read in full are marked `beta` — their scope names and endpoints follow Zoho's
 * naming but have not been run against a live account yet, and the connect dialog says so. Change a scope or an address here, once.
 */

export const ZOHO_SERVICE_IDS = ["mail", "calendar", "cliq", "workdrive", "projects", "sign", "crm", "books", "billing", "expense", "desk", "people", "recruit"] as const;
export type ZohoServiceId = (typeof ZOHO_SERVICE_IDS)[number];

export const isZohoService = (s: string): s is ZohoServiceId => (ZOHO_SERVICE_IDS as readonly string[]).includes(s);

export type ZohoServiceDef = {
  name: string;
  /** Scopes requested when the person picks this service. Read scopes first, then the ones that let Naazhi write after confirmation. */
  scopes: string[];
  /** The things a card can list for this service; the first is the default. */
  views: string[];
  /** Not yet run against a live account (see the note at the top of this file). */
  beta?: boolean;
  /** Where the service's own web app lives, as a subdomain of the person's Zoho domain. */
  web: string;
};

export const ZOHO_SERVICES: Record<ZohoServiceId, ZohoServiceDef> = {
  crm: {
    name: "Zoho CRM",
    scopes: [
      "ZohoCRM.modules.leads.READ",
      "ZohoCRM.modules.contacts.READ",
      "ZohoCRM.modules.accounts.READ",
      "ZohoCRM.modules.deals.READ",
      "ZohoSearch.securesearch.READ",
      "ZohoCRM.modules.leads.CREATE",
      "ZohoCRM.modules.contacts.CREATE",
      "ZohoCRM.modules.accounts.CREATE",
    ],
    views: ["leads", "contacts", "accounts", "deals"],
    web: "crm",
  },
  mail: { name: "Zoho Mail", scopes: ["ZohoMail.accounts.READ", "ZohoMail.messages.READ", "ZohoMail.messages.CREATE"], views: ["inbox", "unread"], web: "mail" },
  calendar: { name: "Zoho Calendar", scopes: ["ZohoCalendar.calendar.READ", "ZohoCalendar.event.READ"], views: ["upcoming"], web: "calendar" },
  cliq: { name: "Zoho Cliq", scopes: ["ZohoCliq.Channels.READ", "ZohoCliq.Webhooks.CREATE"], views: ["channels"], web: "cliq" },
  books: { name: "Zoho Books", scopes: ["ZohoBooks.settings.READ", "ZohoBooks.invoices.READ", "ZohoBooks.bills.READ"], views: ["invoices", "bills"], web: "books" },
  expense: { name: "Zoho Expense", scopes: ["ZohoExpense.orgsettings.READ", "ZohoExpense.expensereport.READ"], views: ["reports"], web: "expense" },
  desk: { name: "Zoho Desk", scopes: ["Desk.tickets.READ", "Desk.basic.READ", "Desk.search.READ"], views: ["tickets"], web: "desk" },
  workdrive: {
    name: "Zoho WorkDrive",
    scopes: ["WorkDrive.users.READ", "WorkDrive.team.READ", "WorkDrive.files.READ", "ZohoSearch.securesearch.READ"],
    views: ["files"],
    beta: true,
    web: "workdrive",
  },
  projects: { name: "Zoho Projects", scopes: ["ZohoProjects.portals.READ", "ZohoProjects.projects.READ", "ZohoProjects.tasks.ALL"], views: ["projects", "tasks"], beta: true, web: "projects" },
  sign: { name: "Zoho Sign", scopes: ["ZohoSign.documents.READ"], views: ["documents"], beta: true, web: "sign" },
  billing: {
    name: "Zoho Billing",
    scopes: ["ZohoSubscriptions.settings.READ", "ZohoSubscriptions.subscriptions.READ", "ZohoSubscriptions.invoices.READ"],
    views: ["subscriptions", "invoices"],
    beta: true,
    web: "billing",
  },
  people: { name: "Zoho People", scopes: ["ZOHOPEOPLE.forms.READ"], views: ["employees"], beta: true, web: "people" },
  recruit: { name: "Zoho Recruit", scopes: ["ZohoRecruit.modules.candidate.READ", "ZohoRecruit.modules.jobopening.READ"], views: ["jobs", "candidates"], beta: true, web: "recruit" },
};

/** Always asked for, so the connection can show which Zoho account it is (name and email). */
export const ZOHO_PROFILE_SCOPE = "AaaServer.profile.Read";

/** Scopes for a set of services, deduplicated, in a stable order. */
export function scopesFor(services: readonly ZohoServiceId[]): string[] {
  const out = new Set<string>([ZOHO_PROFILE_SCOPE]);
  for (const s of services) for (const scope of ZOHO_SERVICES[s].scopes) out.add(scope);
  return [...out];
}

/**
 * Zoho keeps each customer's data in one data center. These are the sign-in servers Zoho lists at accounts.zoho.com/oauth/serverinfo;
 * an address that is not in this list is never contacted, so a crafted callback cannot make the server call another host.
 */
export const ZOHO_ACCOUNTS_SERVERS = [
  "https://accounts.zoho.com",
  "https://accounts.zoho.eu",
  "https://accounts.zoho.in",
  "https://accounts.zoho.com.au",
  "https://accounts.zoho.jp",
  "https://accounts.zohocloud.ca",
  "https://accounts.zoho.sa",
  "https://accounts.zoho.uk",
  "https://accounts.zoho.ae",
  "https://accounts.zoho.sg",
] as const;

export const isZohoAccountsServer = (s: string | null | undefined): s is (typeof ZOHO_ACCOUNTS_SERVERS)[number] =>
  Boolean(s) && (ZOHO_ACCOUNTS_SERVERS as readonly string[]).includes(String(s).replace(/\/+$/, ""));

/** "https://accounts.zoho.eu" → "zoho.eu"; "https://accounts.zohocloud.ca" → "zohocloud.ca". Services live at `<name>.<zone>`. */
export const zoneOf = (accountsServer: string) => new URL(accountsServer).host.replace(/^accounts\./, "");

/** A product's web/API host in a zone, e.g. productHost("desk", "zoho.eu") → https://desk.zoho.eu. */
export const productHost = (sub: string, zone: string) => `https://${sub}.${zone}`;

/** The shared API gateway used by CRM, Books, Expense and others: zoho.com → zohoapis.com, zohocloud.ca → zohoapis.ca. */
export const apisHost = (zone: string) => `https://www.zohoapis.${zone.replace(/^zoho(cloud)?\./, "")}`;

/** One line of a card: what it is, a second line of detail, and where to open it in Zoho (when known). */
export type ZohoRow = { id: string; title: string; subtitle: string; url: string | null };
export type ZohoItems = { service: ZohoServiceId; view: string; title: string; rows: ZohoRow[]; openUrl: string; note?: string };

export type ZohoStatus = {
  configured: boolean;
  connected: boolean;
  label: string | null;
  services: ZohoServiceId[];
  /** The address an admin registers in the Zoho API console (shown in Settings when Zoho isn't set up yet). */
  redirectUri: string;
};
