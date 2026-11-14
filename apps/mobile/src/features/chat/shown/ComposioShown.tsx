import { openWeb } from "@/lib/webSheet";
import { useQuery } from "@tanstack/react-query";
import { createComposioApi } from "@untitled/api-client";
import type { ComposioAppId } from "@untitled/types";

import { ShownEmpty, ShownGroup, ShownRow } from "./ShownGroup";
import { ToolCallLog } from "../kit/ToolCallLog";
import type { LogoName } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import type { IconName } from "@/components/ui/Icon";
import { api, errorMessage } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

const composio = createComposioApi(api);

/** What the card needs to know about each app. The web keeps the full details in apps/web/src/lib/composio/apps.ts. */
const APPS: Record<ComposioAppId, { name: string; icon: IconName; logo: LogoName; web: string }> = {
  gmail: { name: "Gmail", icon: "envelope", logo: "gmail", web: "https://mail.google.com/" },
  googlecalendar: { name: "Google Calendar", icon: "calendar-days", logo: "google-calendar", web: "https://calendar.google.com/" },
  googledrive: { name: "Google Drive", icon: "folder-open", logo: "google-drive", web: "https://drive.google.com/" },
};

/**
 * Emails or events from the person's own connected app (Google sign-in), read by our server with their own connection, so the
 * assistant never sees them. Connecting happens in Settings → Google on the web; here the card only explains that when it is missing.
 */
export function ComposioShown({ app, view = "", query = "" }: { app: ComposioAppId; view?: string; query?: string }) {
  const def = APPS[app];
  const q = useQuery({
    queryKey: qk.composioItems(app, view, query),
    queryFn: () => composio.items(app, view, query),
    staleTime: 60_000,
    retry: false,
  });
  const n = q.data?.rows.length ?? 0;
  const about = query ? ` for “${query}”` : "";
  // The activity log: what the assistant is doing with the connection, then how it ended.
  const log = q.isPending
    ? { state: "running" as const, text: query ? `Searching ${def.name}${about}…` : `Getting data from ${def.name}…` }
    : q.isError
      ? { state: "error" as const, text: `Couldn’t read ${def.name}` }
      : { state: "done" as const, text: n ? `Got ${n} ${n === 1 ? "result" : "results"}${about} from ${def.name}` : `Nothing found${about} in ${def.name}` };
  return (
    <ShownGroup tone="blue" icon={def.icon} logo={def.logo} title={q.data?.title ?? def.name} openLabel={`Open ${def.name}`} onOpen={() => openWeb(q.data?.openUrl ?? def.web)}>
      <ToolCallLog logo={def.logo} state={log.state} text={log.text} />
      {q.isError ? <ShownEmpty>{errorMessage(q.error, `Couldn’t load ${def.name}.`)}</ShownEmpty> : null}
      {q.data?.rows.map((r, i) => (
        <ShownRow key={`${r.id}-${i}`} label={`Open in ${def.name}: ${r.title}`} onPress={() => openWeb(r.url ?? q.data.openUrl)}>
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
