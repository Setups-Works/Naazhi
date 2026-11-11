import { useQuery } from "@tanstack/react-query";

import type { LogoName } from "@/components/ui/AppLogo";
import { api } from "@/lib/api";

/** An app the person connected, which they can point chat at by typing @ and its name. */
export type Connector = { id: string; label: string; logo: LogoName };

const ZOHO_NAMES: Record<string, string> = {
  crm: "Zoho CRM",
  mail: "Zoho Mail",
  calendar: "Zoho Calendar",
  cliq: "Zoho Cliq",
  workdrive: "Zoho WorkDrive",
  projects: "Zoho Projects",
  sign: "Zoho Sign",
  books: "Zoho Books",
  billing: "Zoho Billing",
  expense: "Zoho Expense",
  desk: "Zoho Desk",
  people: "Zoho People",
  recruit: "Zoho Recruit",
};

/** One connector per connected Zoho service, each with its own logo (the status is the one Settings → Zoho reads). */
export function useConnectors(): Connector[] {
  const q = useQuery({
    queryKey: ["zoho", "status"],
    staleTime: 60_000,
    queryFn: async () => (await api.get<{ data: { connected: boolean; services: string[] } }>("/api/v1/integrations/zoho")).data,
  });
  return q.data?.connected ? q.data.services.filter((s) => s in ZOHO_NAMES).map((s) => ({ id: `zoho-${s}`, label: ZOHO_NAMES[s]!, logo: `zoho-${s}` as LogoName })) : [];
}

/** What follows an "@" at the end of the text (the part of a name typed so far), or null when no mention is being typed. */
export function mentionAt(text: string): { start: number; query: string } | null {
  const m = /(^|\s)@([\w ]{0,30})$/.exec(text);
  return m ? { start: m.index + m[1]!.length, query: m[2]!.trim().toLowerCase() } : null;
}

export const matchConnectors = (all: Connector[], query: string) =>
  all.filter((c) => c.label.toLowerCase().includes(query) || c.label.toLowerCase().replace(/^zoho /, "").startsWith(query));

/** The connectors a message names. */
export const mentionedConnectors = (all: Connector[], text: string) => all.filter((c) => text.includes(`@${c.label}`));
