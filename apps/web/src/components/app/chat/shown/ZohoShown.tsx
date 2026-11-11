"use client";
import Link from "next/link";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faAddressCard,
  faCalendarDays,
  faComments,
  faDiagramProject,
  faEnvelope,
  faFileInvoiceDollar,
  faFolderOpen,
  faHeadset,
  faMoneyBillWave,
  faPenNib,
  faReceipt,
  faUserGroup,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import { ZOHO_SERVICES, type ZohoServiceId } from "../../../../lib/zoho";
import { useZohoItems } from "../../../../features/integrations/zoho";
import ShownGroup, { ShownEmpty } from "./ShownGroup";
import ToolCallLog from "../kit/ToolCallLog";

const ICON: Record<ZohoServiceId, IconDefinition> = {
  crm: faAddressCard,
  mail: faEnvelope,
  calendar: faCalendarDays,
  cliq: faComments,
  workdrive: faFolderOpen,
  projects: faDiagramProject,
  sign: faPenNib,
  books: faReceipt,
  billing: faFileInvoiceDollar,
  expense: faMoneyBillWave,
  desk: faHeadset,
  people: faUserGroup,
  recruit: faUserTie,
};
const SETTINGS = "/dashboard/settings/zoho";

/**
 * Records from the person's own Zoho account (leads, inbox, invoices, tickets…). The assistant only names the service, the list and an
 * optional search; this card reads the real records through our server with the person's own Zoho connection, so nothing is invented
 * and no Zoho data is ever sent to the AI.
 */
export default function ZohoShown({ service, view = "", query = "" }: { service: ZohoServiceId; view?: string; query?: string }) {
  const q = useZohoItems(service, view, query);
  const title = q.data?.title ?? ZOHO_SERVICES[service].name;
  const external = q.data?.openUrl;
  const app = ZOHO_SERVICES[service].name;
  const n = q.data?.rows.length ?? 0;
  const about = query ? ` for “${query}”` : "";
  // The activity log: what the assistant is doing with the Zoho connection, then how it ended.
  const log = q.isPending
    ? { state: "running" as const, text: query ? `Searching ${app}${about}…` : `Getting data from ${app}…` }
    : q.isError
      ? { state: "error" as const, text: `Couldn’t read ${app}` }
      : { state: "done" as const, text: n ? `Got ${n} ${n === 1 ? "result" : "results"}${about} from ${app}` : `Nothing found${about} in ${app}` };
  return (
    <ShownGroup tone="clay" icon={ICON[service]} logo={`/logos/zoho-${service}.svg`} title={title} openLabel={external ? `Open ${ZOHO_SERVICES[service].name}` : "Zoho settings"} openHref={external ?? SETTINGS}>
      <li>
        <ToolCallLog logo={`/logos/zoho-${service}.svg`} state={log.state} text={log.text} />
      </li>
      {q.isError && (
        <ShownEmpty>
          {q.error.message} <Link href={SETTINGS} className="underline">Zoho settings</Link>
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
              <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`Open in Zoho: ${r.title}`} className={cls}>
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
