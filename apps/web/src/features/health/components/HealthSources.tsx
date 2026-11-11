"use client";
import { useState } from "react";
import type { HealthDay } from "@untitled/types";
import { Icon as FA } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { AppRow, Tag } from "../../settings/ui";
import { HEALTH_SOURCES, type HealthSource } from "../sources";
import ConnectHealthDialog from "./ConnectHealthDialog";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The two places health data can come from, each with its status (read from what has synced) and a How to connect button. */
export default function HealthSources({ days }: { days: HealthDay[] }) {
  const [help, setHelp] = useState<HealthSource | null>(null);
  return (
    <>
      <div className="divide-y divide-line overflow-hidden rounded-r3 border bg-paper">
        {HEALTH_SOURCES.map((s) => {
          const at = days.find((d) => d.source === s.id)?.synced_at;
          return (
            <AppRow
              key={s.id}
              name={s.name}
              description={s.description}
              logo={
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-r2 border bg-paper text-[18px] ${s.tone}`}>
                  <FA icon={s.icon} />
                </span>
              }
              extra={at ? <p className="m-0 mt-0.5 text-[13px] text-ink-3">Last synced {when(at)}</p> : undefined}
            >
              {at ? <span className="rounded-xs bg-hover px-2 py-0.5 text-[12.5px] text-ink">● Connected</span> : <Tag>Not connected</Tag>}
              <Button variant="outline" onClick={() => setHelp(s)}>
                How to connect
              </Button>
            </AppRow>
          );
        })}
      </div>
      {help && <ConnectHealthDialog source={help} onClose={() => setHelp(null)} />}
    </>
  );
}
