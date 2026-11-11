import "server-only";
import { apisHost, productHost, type ZohoRow } from "../../../../lib/zoho";
import { arr, dot, obj, q, remembered, str, zoho, type Ctx, type J } from "./api";

/**
 * What each Zoho service shows in a chat card: a short list of the person's own records. Every reader returns plain rows
 * (title, detail, link) so the card is the same for all of them. At most `LIMIT` rows, newest first where Zoho allows it.
 * Services marked beta in lib/zoho follow Zoho's naming but are not yet verified against a live account; their readers parse
 * defensively and say so when Zoho answers in a shape we don't know.
 */
export const LIMIT = 6;
type Reader = (ctx: Ctx, view: string, query: string) => Promise<ZohoRow[]>;

const row = (id: string, title: string, subtitle: string, url: string | null): ZohoRow => ({ id: id || title, title: title || "Untitled", subtitle, url });
const money = (cur: unknown, n: unknown) => (n === undefined || n === null || n === "" ? "" : `${str(cur)} ${str(n)}`.trim());

/* ------------------------------ CRM ------------------------------ */

const CRM: Record<string, { module: string; fields: string; map: (r: J, web: string) => ZohoRow }> = {
  leads: {
    module: "Leads",
    fields: "First_Name,Last_Name,Company,Email,Lead_Status",
    map: (r, web) => row(str(r.id), dot(str(r.First_Name), str(r.Last_Name)).replace(" · ", " "), dot(str(r.Company), str(r.Lead_Status), str(r.Email)), `${web}/Leads/${str(r.id)}`),
  },
  contacts: {
    module: "Contacts",
    fields: "First_Name,Last_Name,Email,Phone,Account_Name",
    map: (r, web) => row(str(r.id), dot(str(r.First_Name), str(r.Last_Name)).replace(" · ", " "), dot(str(obj(r.Account_Name).name), str(r.Email), str(r.Phone)), `${web}/Contacts/${str(r.id)}`),
  },
  accounts: {
    module: "Accounts",
    fields: "Account_Name,Website,Phone,Industry",
    map: (r, web) => row(str(r.id), str(r.Account_Name), dot(str(r.Industry), str(r.Website), str(r.Phone)), `${web}/Accounts/${str(r.id)}`),
  },
  deals: {
    module: "Deals",
    fields: "Deal_Name,Stage,Amount,Closing_Date,Account_Name",
    map: (r, web) => row(str(r.id), str(r.Deal_Name), dot(str(r.Stage), money("", r.Amount), str(obj(r.Account_Name).name), str(r.Closing_Date)), `${web}/Deals/${str(r.id)}`),
  },
};

const crm: Reader = async (ctx, view, query) => {
  const m = CRM[view] ?? CRM.leads;
  const base = `${apisHost(ctx.zone)}/crm/v8/${m.module}`;
  // Searching needs the search scope as well; a plain list is the newest records first (v8 requires the field list).
  const url = query ? `${base}/search?word=${q(query)}&per_page=${LIMIT}` : `${base}?fields=${m.fields}&sort_by=Created_Time&sort_order=desc&per_page=${LIMIT}`;
  const j = obj(await zoho(ctx, url));
  const web = `${productHost("crm", ctx.zone)}/crm/tab`;
  return arr(j.data).slice(0, LIMIT).map((r) => m.map(obj(r), web));
};

/* ------------------------------ Mail ------------------------------ */

export const mailAccount = (ctx: Ctx) =>
  remembered(ctx, "mail-account", async () => {
    const first = obj(arr(obj(await zoho(ctx, `${productHost("mail", ctx.zone)}/api/accounts`)).data)[0]);
    return str(first.accountId);
  });

const clock = (ms: unknown) => {
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "";
};

const mail: Reader = async (ctx, view, query) => {
  const host = productHost("mail", ctx.zone);
  const id = await mailAccount(ctx);
  const url = query
    ? `${host}/api/accounts/${id}/messages/search?searchKey=${q(`entire:${query}`)}&limit=${LIMIT}`
    : `${host}/api/accounts/${id}/messages/view?limit=${LIMIT}&status=${view === "unread" ? "unread" : "all"}`;
  const j = obj(await zoho(ctx, url));
  return arr(j.data)
    .slice(0, LIMIT)
    .map((m) => {
      const r = obj(m);
      return row(str(r.messageId), str(r.subject) || "(no subject)", dot(str(r.sender) || str(r.fromAddress), clock(r.receivedTime ?? r.receivedtime)), `${host}/zm/#mail/folder/inbox`);
    });
};

/* ------------------------------ Calendar ------------------------------ */

/** "20261112T150000+0530" → "12 Nov · 15:00" (the event's own wall-clock time, no time-zone conversion needed). */
const eventTime = (s: string) => {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(s);
  if (!m) return "";
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1] ?? "";
  return dot(`${Number(m[3])} ${month}`, m[4] ? `${m[4]}:${m[5]}` : "All day");
};
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const calendar: Reader = async (ctx, _view, query) => {
  const host = `${productHost("calendar", ctx.zone)}/api/v1`;
  const cals = arr(obj(await zoho(ctx, `${host}/calendars`)).calendars).map(obj).slice(0, 3);
  const now = new Date();
  const range = encodeURIComponent(JSON.stringify({ start: stamp(now), end: stamp(new Date(now.getTime() + 14 * 86_400_000)) }));
  const lists = await Promise.all(cals.map(async (c) => arr(obj(await zoho(ctx, `${host}/calendars/${str(c.uid)}/events?range=${range}`)).events).map(obj)));
  const needle = query.toLowerCase();
  return lists
    .flat()
    .filter((e) => !needle || str(e.title).toLowerCase().includes(needle))
    .sort((a, b) => str(obj(a.dateandtime).start || a.start).localeCompare(str(obj(b.dateandtime).start || b.start)))
    .slice(0, LIMIT)
    .map((e) => row(str(e.uid), str(e.title), eventTime(str(obj(e.dateandtime).start || e.start)), `${productHost("calendar", ctx.zone)}/`));
};

/* ------------------------------ Cliq ------------------------------ */

const cliq: Reader = async (ctx, _view, query) => {
  const host = productHost("cliq", ctx.zone);
  const j = obj(await zoho(ctx, `${host}/api/v2/channels?joined=true&limit=${LIMIT}${query ? `&name=${q(query)}` : ""}`));
  return arr(j.channels)
    .slice(0, LIMIT)
    .map((c) => {
      const r = obj(c);
      return row(str(r.channel_id), str(r.name), dot(`#${str(r.unique_name)}`, r.participant_count !== undefined ? `${str(r.participant_count)} members` : ""), `${host}/`);
    });
};

/* ------------------------------ Books ------------------------------ */

const booksOrg = (ctx: Ctx) =>
  remembered(ctx, "books-org", async () => {
    const orgs = arr(obj(await zoho(ctx, `${apisHost(ctx.zone)}/books/v3/organizations`)).organizations).map(obj);
    return str((orgs.find((o) => o.is_default_org === true) ?? orgs[0])?.organization_id);
  });

/** One invoice or bill in full: who and when, each line, then the totals. `number` is what is printed on it (INV-000010). */
async function booksDetail(ctx: Ctx, org: string, kind: "invoices" | "bills", number: string, app: string): Promise<ZohoRow[]> {
  const one = kind === "bills" ? "bill" : "invoice";
  const find = obj(await zoho(ctx, `${apisHost(ctx.zone)}/books/v3/${kind}?organization_id=${q(org)}&per_page=5&search_text=${q(number.slice(0, 100))}`));
  const hits = arr(find[kind]).map(obj);
  const hit = hits.find((r) => str(r[`${one}_number`]).toLowerCase() === number.trim().toLowerCase()) ?? hits[0];
  const id = str(hit?.[`${one}_id`]);
  if (!id) return [];
  const d = obj(obj(await zoho(ctx, `${apisHost(ctx.zone)}/books/v3/${kind}/${q(id)}?organization_id=${q(org)}`))[one]);
  const url = `${app}#/${kind}/${id}`;
  const cur = d.currency_code;
  const party = str(d.customer_name) || str(d.vendor_name);
  const rows: ZohoRow[] = [
    row(id, dot(str(d[`${one}_number`]), party), dot(str(d.status), str(d.date) && `dated ${str(d.date)}`, str(d.due_date) && `due ${str(d.due_date)}`), url),
  ];
  arr(d.line_items)
    .map(obj)
    .slice(0, LIMIT)
    .forEach((l, i) =>
      rows.push(row(`${id}-line-${i}`, `${str(l.name) || str(l.description) || "Item"}${l.quantity !== undefined ? ` × ${str(l.quantity)}` : ""}`, dot(l.rate !== undefined ? `${money(cur, l.rate)} each` : "", money(cur, l.item_total)), url)),
    );
  const total = (label: string, v: unknown, key: string) => (v === undefined || v === null || v === "" ? [] : [row(`${id}-${key}`, label, money(cur, v), url)]);
  rows.push(...total("Subtotal", d.sub_total, "sub"), ...total("Tax", d.tax_total, "tax"), ...total("Total", d.total, "total"), ...total("Balance due", d.balance, "balance"));
  return rows;
}

const books: Reader = async (ctx, view, query) => {
  const org = await booksOrg(ctx);
  // "invoice" / "bill" (singular) with the printed number as the query: that one document in full. Without a number they list as usual.
  if ((view === "invoice" || view === "bill") && query.trim()) {
    return booksDetail(ctx, org, view === "bill" ? "bills" : "invoices", query.trim(), `${productHost("books", ctx.zone)}/app/${org}`);
  }
  // "items" are the products and services you sell (the Items module sits under the same settings permission the connection already has).
  const kind = view === "bills" || view === "bill" ? "bills" : view === "items" ? "items" : "invoices";
  const j = obj(await zoho(ctx, `${apisHost(ctx.zone)}/books/v3/${kind}?organization_id=${q(org)}&per_page=${LIMIT}${query ? `&search_text=${q(query.slice(0, 100))}` : ""}`));
  // Each row opens that very record in the Books app (https://books.zoho.in/app/<organization>#/invoices/<id>), not Books' front page.
  const app = `${productHost("books", ctx.zone)}/app/${org}`;
  const link = (section: string, id: unknown) => (str(id) ? `${app}#/${section}/${str(id)}` : `${app}#/home`);
  return arr(j[kind])
    .slice(0, LIMIT)
    .map((x) => {
      const r = obj(x);
      if (kind === "items") return row(str(r.item_id), str(r.name), dot(str(r.sku), r.rate !== undefined ? `Rate ${str(r.rate)}` : "", str(r.unit), str(r.status)), link("items", r.item_id));
      return kind === "bills"
        ? row(str(r.bill_id), dot(str(r.bill_number), str(r.vendor_name)), dot(str(r.status), money(r.currency_code, r.total), str(r.due_date) && `due ${str(r.due_date)}`), link("bills", r.bill_id))
        : row(str(r.invoice_id), dot(str(r.invoice_number), str(r.customer_name)), dot(str(r.status), money(r.currency_code, r.total), str(r.due_date) && `due ${str(r.due_date)}`), link("invoices", r.invoice_id));
    });
};

/* ------------------------------ Expense ------------------------------ */

const expenseOrg = (ctx: Ctx) =>
  remembered(ctx, "expense-org", async () => str(obj(arr(obj(await zoho(ctx, `${apisHost(ctx.zone)}/expense/v1/organizations`)).organizations)[0]).organization_id));

const expense: Reader = async (ctx, _view, query) => {
  const org = await expenseOrg(ctx);
  const j = obj(await zoho(ctx, `${apisHost(ctx.zone)}/expense/v1/expensereports?per_page=${LIMIT}${query ? `&search_text=${q(query)}` : ""}`, { headers: { "X-com-zoho-expense-organizationid": org } }));
  return arr(j.expense_reports)
    .slice(0, LIMIT)
    .map((x) => {
      const r = obj(x);
      return row(str(r.report_id), str(r.report_name), dot(str(r.status), money(r.currency_code, r.total), str(r.report_number)), `${productHost("expense", ctx.zone)}/`);
    });
};

/* ------------------------------ Desk ------------------------------ */

const deskOrg = (ctx: Ctx) =>
  remembered(ctx, "desk-org", async () => {
    const orgs = arr(obj(await zoho(ctx, `${productHost("desk", ctx.zone)}/api/v1/organizations`)).data).map(obj);
    return str((orgs.find((o) => o.isDefault === true) ?? orgs[0])?.id);
  });

const desk: Reader = async (ctx, _view, query) => {
  const org = await deskOrg(ctx);
  const host = `${productHost("desk", ctx.zone)}/api/v1`;
  // Desk reads the organisation from the `orgId` header; the published OpenAPI lists it as a query parameter, so both are sent.
  const find = query.length >= 3 ? `/tickets/search?_all=${q(query)}&limit=${LIMIT}&orgId=${q(org)}` : `/tickets?limit=${LIMIT}&sortBy=recentThread&orgId=${q(org)}`;
  const j = obj(await zoho(ctx, `${host}${find}`, { headers: { orgId: org } }));
  return arr(j.data)
    .slice(0, LIMIT)
    .map((x) => {
      const r = obj(x);
      return row(str(r.id), `#${str(r.ticketNumber)} ${str(r.subject)}`.trim(), dot(str(r.status), str(r.email)), str(r.webUrl) || null);
    });
};

/* ------------------------------ beta: WorkDrive ------------------------------ */

const workdrive: Reader = async (ctx, _view, query) => {
  const host = `${apisHost(ctx.zone)}/workdrive/api/v1`;
  const accept = { accept: "application/vnd.api+json" };
  // The person's id, then their team. Zoho's JSON:API answers wrap records as {id, attributes}; flat answers are handled too.
  const flat = (v: unknown): J => {
    const o = obj(v);
    return { id: o.id, ...obj(o.attributes), ...o };
  };
  const team = await remembered(ctx, "workdrive-team", async () => {
    const meRaw = await zoho(ctx, `${host}/users/me`, { headers: accept });
    const me = flat(obj(meRaw).data ?? meRaw);
    const teams = obj(await zoho(ctx, `${host}/users/${str(me.zuid) || str(me.id)}/teams`, { headers: accept }));
    const first = flat(arr(teams.data)[0] ?? arr(teams.teams)[0]);
    return str(first.id) || str(first.team_id);
  });
  const find = query ? `search[all]=${q(query)}` : "filter[type]=allfiles&sort=-last_modified";
  const j = obj(await zoho(ctx, `${host}/teams/${team}/records?${find}&page[limit]=${LIMIT}`, { headers: accept }));
  return arr(j.data)
    .slice(0, LIMIT)
    .map((x) => {
      const r = flat(x);
      const isFolder = r.isFolder === true || r.is_folder === true || str(r.type) === "folder";
      return row(str(r.resourceId) || str(r.id), str(r.name), dot(isFolder ? "Folder" : str(r.extn) || str(r.type), str(r.modifiedTime) || str(r.modified_time)), str(r.urlLink) || str(r.permalink) || null);
    });
};

/* ------------------------------ beta: Projects ------------------------------ */

const projects: Reader = async (ctx, view, query) => {
  // Zoho Projects answers on `projectsapi.<zone>` for its REST paths and `projects.<zone>` for the web app; the API host is tried first.
  const api = productHost("projectsapi", ctx.zone);
  const portal = await remembered(ctx, "projects-portal", async () => {
    const o = obj(await zoho(ctx, `${api}/restapi/portals/`));
    const p = obj(arr(o.portals)[0]);
    return str(p.id_string) || str(p.id);
  });
  const list = async (path: string) => obj(await zoho(ctx, `${api}/api/v3/portal/${portal}${path}`));
  const needle = query.toLowerCase();
  const prj = arr((await list(`/projects?per_page=10`)).projects).map(obj);
  const web = `${productHost("projects", ctx.zone)}/`;
  if (view === "tasks") {
    const perProject = await Promise.all(
      prj.slice(0, 3).map(async (p) => ({ p, tasks: arr((await list(`/projects/${str(p.id)}/tasks?per_page=4`)).tasks).map(obj) })),
    );
    return perProject
      .flatMap(({ p, tasks }) => tasks.map((t) => row(str(t.id), str(t.name), dot(str(p.name), str(obj(t.status).name), str(t.due_date)), web)))
      .filter((r) => !needle || r.title.toLowerCase().includes(needle))
      .slice(0, LIMIT);
  }
  return prj
    .filter((p) => !needle || str(p.name).toLowerCase().includes(needle))
    .slice(0, LIMIT)
    .map((p) => row(str(p.id), str(p.name), dot(str(obj(p.status).name) || str(p.status), str(p.owner_name)), web));
};

/* ------------------------------ beta: Sign ------------------------------ */

const sign: Reader = async (ctx, _view, query) => {
  const host = productHost("sign", ctx.zone);
  const data = encodeURIComponent(JSON.stringify({ page_context: { row_count: query ? 50 : LIMIT, start_index: 1, sort_column: "created_time", sort_order: "DESC" } }));
  const j = obj(await zoho(ctx, `${host}/api/v1/requests?data=${data}`));
  const needle = query.toLowerCase();
  return arr(j.requests)
    .map(obj)
    .filter((r) => !needle || str(r.request_name).toLowerCase().includes(needle))
    .slice(0, LIMIT)
    .map((r) => row(str(r.request_id), str(r.request_name), dot(str(r.request_status), str(r.owner_email)), `${host}/`));
};

/* ------------------------------ beta: Billing ------------------------------ */

const billingOrg = (ctx: Ctx) =>
  remembered(ctx, "billing-org", async () => str(obj(arr(obj(await zoho(ctx, `${apisHost(ctx.zone)}/billing/v1/organizations`)).organizations)[0]).organization_id));

const billing: Reader = async (ctx, view, query) => {
  const org = await billingOrg(ctx);
  const kind = view === "invoices" ? "invoices" : "subscriptions";
  const j = obj(await zoho(ctx, `${apisHost(ctx.zone)}/billing/v1/${kind}?per_page=${LIMIT}`, { headers: { "X-com-zoho-subscriptions-organizationid": org } }));
  const needle = query.toLowerCase();
  const web = `${productHost("billing", ctx.zone)}/`;
  return arr(j[kind])
    .map(obj)
    .map((r) =>
      kind === "invoices"
        ? row(str(r.invoice_id), dot(str(r.number) || str(r.invoice_number), str(r.customer_name)), dot(str(r.status), money(r.currency_code, r.total)), web)
        : row(str(r.subscription_id), dot(str(r.customer_name), str(obj(r.plan).name) || str(r.name)), dot(str(r.status), money(r.currency_code, r.amount)), web),
    )
    .filter((r) => !needle || `${r.title} ${r.subtitle}`.toLowerCase().includes(needle))
    .slice(0, LIMIT);
};

/* ------------------------------ beta: People ------------------------------ */

const people: Reader = async (ctx, _view, query) => {
  const host = productHost("people", ctx.zone);
  const j = obj(await zoho(ctx, `${host}/people/api/forms/employee/getRecords?sIndex=1&limit=${query ? 100 : LIMIT}`));
  // Zoho People wraps each record as {"<record id>": [ {fields} ]} inside response.result.
  const records = arr(obj(j.response).result).flatMap((item) => Object.values(obj(item)).flatMap((v) => arr(v).map(obj)));
  const needle = query.toLowerCase();
  return records
    .map((r) => row(str(r["Zoho_ID"]) || str(r["EmployeeID"]), dot(str(r["FirstName"]), str(r["LastName"])).replace(" · ", " "), dot(str(r["Department"]), str(r["Designation"]), str(r["EmailID"])), `${host}/`))
    .filter((r) => !needle || `${r.title} ${r.subtitle}`.toLowerCase().includes(needle))
    .slice(0, LIMIT);
};

/* ------------------------------ beta: Recruit ------------------------------ */

const recruit: Reader = async (ctx, view, query) => {
  const jobs = view !== "candidates";
  const module = jobs ? "Job_Openings" : "Candidates";
  const base = `${productHost("recruit", ctx.zone)}/recruit/v2/${module}`;
  const j = obj(await zoho(ctx, query ? `${base}/search?word=${q(query)}&per_page=${LIMIT}` : `${base}?sort_by=Created_Time&sort_order=desc&per_page=${LIMIT}`));
  const web = `${productHost("recruit", ctx.zone)}/`;
  return arr(j.data)
    .slice(0, LIMIT)
    .map((x) => {
      const r = obj(x);
      return jobs
        ? row(str(r.id), str(r.Posting_Title) || str(r.Job_Opening_Name), dot(str(r.Job_Opening_Status), str(r.City)), web)
        : row(str(r.id), dot(str(r.First_Name), str(r.Last_Name)).replace(" · ", " "), dot(str(r.Candidate_Status), str(r.Email)), web);
    });
};

export const READERS: Record<string, Reader> = { crm, mail, calendar, cliq, books, expense, desk, workdrive, projects, sign, billing, people, recruit };
