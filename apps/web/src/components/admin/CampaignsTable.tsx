"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { retryCampaign, sendNextBatch } from "../../app/admin/campaigns/actions";
import type { CampaignSummary } from "../../server/repositories/campaigns.repository";

const LABEL = { draft: "Draft", sending: "Sending", sent: "Sent", failed: "Failed" } as const;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Every campaign with its progress. A campaign that is still sending can be pushed along by hand; failed emails can be retried. */
export default function CampaignsTable({ rows }: { rows: CampaignSummary[] }) {
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setNote(r.ok ? (r.message ?? "Done.") : (r.error ?? "That didn’t work."));
    });

  if (!rows.length) return <p className="meta">No campaigns yet. Write your first one.</p>;
  return (
    <div className="dash-card">
      {note && (
        <p className="meta" role="status">
          {note}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="text-fg-subtle">
              <th className="py-2 pr-3 font-medium">Subject</th>
              <th className="py-2 pr-3 font-medium">Kind</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Delivered</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-2.5 pr-3">
                  <Link className="font-medium text-fg hover:underline" href={`/admin/campaigns/${c.id}`}>
                    {c.subject}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 text-fg-muted">{c.kind === "newsletter" ? "Newsletter" : "Direct"}</td>
                <td className="py-2.5 pr-3">{LABEL[c.status]}</td>
                <td className="py-2.5 pr-3 text-fg-muted">
                  {c.status === "draft" ? "—" : `${c.sent} sent${c.failed ? `, ${c.failed} failed` : ""}${c.queued ? `, ${c.queued} waiting` : ""}`}
                </td>
                <td className="py-2.5 pr-3 text-fg-muted">{day(c.sentAt ?? c.createdAt)}</td>
                <td className="py-2.5 text-right">
                  {c.status === "sending" && (
                    <button className="btn btn-sm" disabled={pending} onClick={() => run(() => sendNextBatch(c.id))}>
                      Send next batch
                    </button>
                  )}
                  {c.failed > 0 && c.status !== "draft" && (
                    <button className="btn btn-sm ml-2" disabled={pending} onClick={() => run(() => retryCampaign(c.id))}>
                      Retry failed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
