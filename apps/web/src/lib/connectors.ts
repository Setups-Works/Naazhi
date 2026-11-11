import { ZOHO_SERVICES, type ZohoServiceId } from "./zoho";

/** An app the person connected, which they can point chat at by typing @ and its name. */
export type Connector = { id: string; label: string; logo: string };

/** One connector per connected Zoho service (Zoho Books, Zoho CRM…), each with its own logo. */
export const zohoConnectors = (services: readonly ZohoServiceId[]): Connector[] =>
  services.map((id) => ({ id: `zoho-${id}`, label: ZOHO_SERVICES[id].name, logo: `/logos/zoho-${id}.svg` }));

/** What follows an "@" at the end of the text (the part of a name typed so far), or null when no mention is being typed. */
export function mentionAt(text: string): { start: number; query: string } | null {
  const m = /(^|\s)@([\w ]{0,30})$/.exec(text);
  return m ? { start: m.index + m[1].length, query: m[2].trim().toLowerCase() } : null;
}

export const matchConnectors = (all: Connector[], query: string) => all.filter((c) => c.label.toLowerCase().includes(query) || c.label.toLowerCase().replace(/^zoho /, "").startsWith(query));

/** The connectors a message names, in the order the text names them. */
export const mentionedConnectors = (all: Connector[], text: string) => all.filter((c) => text.includes(`@${c.label}`));

/** Every name chat can show with a logo in a sent message ("@Zoho Books"), longest first so "Zoho Billing" is not read as "Zoho Bi…". */
export const ALL_MENTIONS: Connector[] = zohoConnectors(Object.keys(ZOHO_SERVICES) as ZohoServiceId[]).sort((a, b) => b.label.length - a.label.length);
