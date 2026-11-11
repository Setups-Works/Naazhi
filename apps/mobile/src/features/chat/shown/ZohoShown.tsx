import { openWeb } from "@/lib/webSheet";
import { useQuery } from "@tanstack/react-query";

import { ShownEmpty, ShownGroup, ShownRow } from "./ShownGroup";
import { ToolCallLog } from "../kit/ToolCallLog";
import type { LogoName } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import type { IconName } from "@/components/ui/Icon";
import { api, errorMessage } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

type Items = { title: string; openUrl: string; rows: { id: string; title: string; subtitle: string; url: string | null }[] };

const ICON: Record<string, IconName> = {
  crm: "address-card",
  mail: "envelope",
  calendar: "calendar-days",
  cliq: "comments",
  workdrive: "folder-open",
  projects: "diagram-project",
  sign: "pen-nib",
  books: "receipt",
  billing: "file-invoice-dollar",
  expense: "money-bill-wave",
  desk: "headset",
  people: "user-group",
  recruit: "user-tie",
};

const NAMES: Record<string, string> = {
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

/**
 * Records from the person's own Zoho account, read by our server with their Zoho connection (the assistant never sees them).
 * Connecting Zoho happens in Settings on the web; here the card only explains that when it is missing.
 */
export function ZohoShown({ service, view = "", query = "" }: { service: string; view?: string; query?: string }) {
  const q = useQuery({
    queryKey: qk.zohoItems(service, view, query),
    queryFn: async () =>
      (await api.get<{ data: Items }>(`/api/v1/integrations/zoho/items?${new URLSearchParams({ service, ...(view ? { view } : {}), ...(query ? { q: query } : {}) })}`)).data,
    staleTime: 60_000,
    retry: false,
  });
  const open = (url: string) => openWeb(url);
  const app = NAMES[service] ?? "Zoho";
  const n = q.data?.rows.length ?? 0;
  const about = query ? ` for “${query}”` : "";
  const logo = `zoho-${service}` as LogoName;
  // The activity log: what the assistant is doing with the Zoho connection, then how it ended.
  const log = q.isPending
    ? { state: "running" as const, text: query ? `Searching ${app}${about}…` : `Getting data from ${app}…` }
    : q.isError
      ? { state: "error" as const, text: `Couldn’t read ${app}` }
      : { state: "done" as const, text: n ? `Got ${n} ${n === 1 ? "result" : "results"}${about} from ${app}` : `Nothing found${about} in ${app}` };
  return (
    <ShownGroup
      tone="clay"
      icon={ICON[service] ?? "address-card"}
      logo={logo}
      title={q.data?.title ?? "Zoho"}
      openLabel="Open in Zoho"
      onOpen={() => (q.data ? open(q.data.openUrl) : undefined)}
    >
      <ToolCallLog logo={logo} state={log.state} text={log.text} />
      {q.isError ? <ShownEmpty>{errorMessage(q.error, "Couldn’t load Zoho.")}</ShownEmpty> : null}
      {q.data?.rows.map((r, i) => (
        <ShownRow key={`${r.id}-${i}`} label={`Open in Zoho: ${r.title}`} onPress={() => (r.url ? open(r.url) : open(q.data.openUrl))}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {r.title}
          </AppText>
          {r.subtitle ? (
            <AppText variant="small" numberOfLines={1}>
              {r.subtitle}
            </AppText>
          ) : null}
        </ShownRow>
      ))}
    </ShownGroup>
  );
}
