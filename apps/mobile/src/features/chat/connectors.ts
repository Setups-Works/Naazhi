import { useQuery } from "@tanstack/react-query";

import type { LogoName } from "@/components/ui/AppLogo";
import { api } from "@/lib/api";
import { GOOGLE_KEY, googleApi } from "@/features/integrations/connect";

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

const GOOGLE_APPS: Record<string, Connector> = {
  gmail: { id: "google-gmail", label: "Gmail", logo: "gmail" },
  googlecalendar: { id: "google-googlecalendar", label: "Google Calendar", logo: "google-calendar" },
  googledrive: { id: "google-googledrive", label: "Google Drive", logo: "google-drive" },
};

/** Every name chat can show in bold in a sent message (the Zoho services and the Google apps). */
export const ALL_MENTION_LABELS: string[] = [...Object.values(ZOHO_NAMES), ...Object.values(GOOGLE_APPS).map((c) => c.label)];

/** One connector per connected Google app and per connected Zoho service, each with its own logo (the statuses Settings reads). */
export function useConnectors(): Connector[] {
  const google = useQuery({ queryKey: GOOGLE_KEY, staleTime: 60_000, queryFn: googleApi.status });
  const q = useQuery({
    queryKey: ["zoho", "status"],
    staleTime: 60_000,
    queryFn: async () => (await api.get<{ data: { connected: boolean; services: string[] } }>("/api/v1/integrations/zoho")).data,
  });
  const googles = (google.data?.apps ?? []).filter((a) => a.state === "connected" && a.app in GOOGLE_APPS).map((a) => GOOGLE_APPS[a.app]!);
  const zohos = q.data?.connected ? q.data.services.filter((s) => s in ZOHO_NAMES).map((s) => ({ id: `zoho-${s}`, label: ZOHO_NAMES[s]!, logo: `zoho-${s}` as LogoName })) : [];
  return [...googles, ...zohos];
}

/** What follows an "@" at the end of the text (the part of a name typed so far), or null when no mention is being typed. */
export function mentionAt(text: string): { start: number; query: string } | null {
  const m = /(^|\s)@([\w ]{0,30})$/.exec(text);
  return m ? { start: m.index + m[1]!.length, query: m[2]!.trim().toLowerCase() } : null;
}

export const matchConnectors = (all: Connector[], query: string) =>
  all.filter((c) => c.label.toLowerCase().includes(query) || c.label.toLowerCase().replace(/^(zoho|google) /, "").startsWith(query));

/** The connectors a message names. */
export const mentionedConnectors = (all: Connector[], text: string) => all.filter((c) => text.includes(`@${c.label}`));
