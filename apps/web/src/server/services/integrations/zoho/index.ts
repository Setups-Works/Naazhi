import "server-only";
import { z } from "zod";
import { apisHost, isZohoService, productHost, ZOHO_SERVICES, type ZohoItems, type ZohoServiceId } from "../../../../lib/zoho";
import { ConflictError, ValidationError } from "../../../errors";
import { arr, dot, obj, q, str, zoho, type Ctx } from "./api";
import { zohoAccess } from "./oauth";
import { mailAccount, READERS } from "./products";

export { disconnectZoho, finishZohoConnect, startZohoConnect, zohoConfigured, zohoStatus } from "./oauth";

const context = async (userId: string, service: ZohoServiceId): Promise<Ctx> => ({ ...(await zohoAccess(userId, service)), userId, service });

/**
 * The records a chat card shows for one Zoho service. Read as the signed-in person with their own Zoho token, so Zoho's own
 * permissions decide what they may see. `view` picks a list (leads, inbox, invoices…); anything unknown falls back to the first.
 */
export async function listZoho(userId: string, serviceId: string, view?: string, query?: string): Promise<ZohoItems> {
  if (!isZohoService(serviceId)) throw new ValidationError("That isn’t a Zoho service Naazhi knows.");
  const def = ZOHO_SERVICES[serviceId];
  const picked = view && def.views.includes(view) ? view : def.views[0];
  const text = (query ?? "").trim().slice(0, 100);
  const ctx = await context(userId, serviceId);
  const rows = await READERS[serviceId](ctx, picked, text);
  return {
    service: serviceId,
    view: picked,
    title: dot(def.name, picked === def.views[0] && def.views.length === 1 ? "" : picked[0].toUpperCase() + picked.slice(1)) + (text ? ` matching “${text}”` : ""),
    rows,
    openUrl: `${productHost(def.web, ctx.zone)}/`,
  };
}

/* ------------------------------ writes (only after the person presses Create in chat) ------------------------------ */

/** The fields a draft may set for each CRM module (Zoho API names). Anything else the model writes is dropped. */
export const CRM_CREATE_FIELDS = {
  Leads: ["Last_Name", "First_Name", "Company", "Email", "Phone", "Lead_Source", "Description"],
  Contacts: ["Last_Name", "First_Name", "Email", "Phone", "Title", "Description"],
  Accounts: ["Account_Name", "Website", "Phone", "Industry", "Description"],
} as const;
export type CrmModule = keyof typeof CRM_CREATE_FIELDS;

const REQUIRED: Record<CrmModule, string> = { Leads: "Last_Name", Contacts: "Last_Name", Accounts: "Account_Name" };

export type Created = { id: string; url: string };

export async function createCrmRecord(userId: string, module: CrmModule, fields: Record<string, string>): Promise<Created> {
  const ctx = await context(userId, "crm");
  const allowed: readonly string[] = CRM_CREATE_FIELDS[module];
  const record = Object.fromEntries(
    Object.entries(fields)
      .filter(([k, v]) => allowed.includes(k) && v.trim())
      .map(([k, v]) => [k, v.trim().slice(0, k === "Description" ? 2000 : 255)]),
  );
  if (!record[REQUIRED[module]]) throw new ValidationError(`A ${module.slice(0, -1).toLowerCase()} needs ${REQUIRED[module].replace("_", " ").toLowerCase()}.`);
  const j = obj(await zoho(ctx, `${apisHost(ctx.zone)}/crm/v8/${module}`, { method: "POST", body: { data: [record] } }));
  const first = obj(arr(j.data)[0]);
  if (str(first.code) !== "SUCCESS") throw new ConflictError(str(first.message) ? `Zoho CRM said: ${str(first.message)}` : "Zoho CRM couldn’t save that.");
  const id = str(obj(first.details).id);
  return { id, url: `${productHost("crm", ctx.zone)}/crm/tab/${module}/${id}` };
}

const email = z.string().trim().email();

export async function sendZohoMail(userId: string, p: { to: string; subject: string; body: string }): Promise<Created> {
  const to = email.safeParse(p.to);
  if (!to.success) throw new ValidationError("That email address doesn’t look right.");
  const ctx = await context(userId, "mail");
  const host = productHost("mail", ctx.zone);
  const id = await mailAccount(ctx);
  const me = obj(arr(obj(await zoho(ctx, `${host}/api/accounts`)).data).map(obj).find((a) => str(a.accountId) === id));
  const from = str(me.primaryEmailAddress) || str(obj(arr(me.emailAddress)[0]).mailId);
  if (!from) throw new ConflictError("Zoho Mail didn’t tell us which address to send from.");
  await zoho(ctx, `${host}/api/accounts/${id}/messages`, {
    method: "POST",
    // Plain text: the model's words are never interpreted as HTML.
    body: { fromAddress: from, toAddress: to.data, subject: p.subject.slice(0, 300), content: p.body.slice(0, 20_000), mailFormat: "plaintext" },
  });
  return { id: "", url: `${host}/zm/#mail/folder/sent` };
}

export async function postZohoCliq(userId: string, p: { channel: string; text: string }): Promise<Created> {
  const ctx = await context(userId, "cliq");
  const name = p.channel.trim().replace(/^#/, "").toLowerCase();
  if (!/^[a-z0-9_-]{1,100}$/.test(name)) throw new ValidationError("Use the channel’s short name, like “general”.");
  const host = productHost("cliq", ctx.zone);
  await zoho(ctx, `${host}/api/v2/channelsbyname/${q(name)}/message`, { method: "POST", body: { text: p.text.slice(0, 4000) } });
  return { id: "", url: `${host}/` };
}
