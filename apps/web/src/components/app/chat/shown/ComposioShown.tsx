"use client";
import Link from "next/link";
import { faCalendarDays, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { COMPOSIO_APPS, composioSettingsPath, type ComposioAppId } from "../../../../lib/composio/apps";
import { useComposioItems } from "../../../../features/integrations/composio";
import ShownGroup, { ShownEmpty } from "./ShownGroup";
import ToolCallLog from "../kit/ToolCallLog";

const ICON = { gmail: faEnvelope, googlecalendar: faCalendarDays } satisfies Record<ComposioAppId, unknown>;

/**
 * Emails or events from the person's own connected app (through Composio). The assistant only names the app, the list and an
 * optional search; this card reads the real items through our server with the person's own connection, so nothing is invented
 * and no email or event is ever sent to the AI.
 */
export default function ComposioShown({ app, view = "", query = "" }: { app: ComposioAppId; view?: string; query?: string }) {
  const def = COMPOSIO_APPS[app];
  const q = useComposioItems(app, view, query);
  const settings = composioSettingsPath(app);
  const n = q.data?.rows.length ?? 0;
  const about = query ? ` for “${query}”` : "";
  // The activity log: what the assistant is doing with the connection, then how it ended.
  const log = q.isPending
    ? { state: "running" as const, text: query ? `Searching ${def.name}${about}…` : `Getting data from ${def.name}…` }
    : q.isError
      ? { state: "error" as const, text: `Couldn’t read ${def.name}` }
      : { state: "done" as const, text: n ? `Got ${n} ${n === 1 ? "result" : "results"}${about} from ${def.name}` : `Nothing found${about} in ${def.name}` };
  return (
    <ShownGroup
      tone="blue"
      icon={ICON[app]}
      logo={def.logo}
      title={q.data?.title ?? def.name}
      openLabel={q.isError ? `${def.name} settings` : `Open ${def.name}`}
      openHref={q.isError ? settings : def.web}
    >
      <li>
        <ToolCallLog logo={def.logo} state={log.state} text={log.text} />
      </li>
      {q.isError && (
        <ShownEmpty>
          {q.error.message}{" "}
          <Link href={settings} className="underline">
            Settings
          </Link>
        </ShownEmpty>
      )}
      {q.data?.rows.map((r, i) => {
        const body = (
          <>
            <span className="line-clamp-2 text-[14.5px] font-medium">{r.title}</span>
            {r.subtitle && <span className="line-clamp-1 text-[12.5px] text-fg-muted">{r.subtitle}</span>}
          </>
        );
        const cls = "flex flex-col gap-0.5 rounded-ctl bg-hover px-3 py-2 transition-colors hover:bg-press";
        return (
          <li key={`${r.id}-${i}`}>
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`Open in ${def.name}: ${r.title}`} className={cls}>
                {body}
              </a>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ShownGroup>
  );
}
