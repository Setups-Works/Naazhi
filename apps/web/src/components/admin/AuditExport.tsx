"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faDownload } from "@fortawesome/free-solid-svg-icons";

export type AuditRow = { when: string; admin: string; action: string; target: string; details: string };

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

/** Downloads the rows on screen as a CSV file, built in the browser from what the page already shows. Nothing is sent anywhere. */
export default function AuditExport({ rows }: { rows: AuditRow[] }) {
  function download() {
    const head = ["When", "Admin", "Action", "Target", "Details"];
    const csv = [head, ...rows.map((r) => [r.when, r.admin, r.action, r.target, r.details])].map((r) => r.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button type="button" className="btn btn-secondary btn-sm" disabled={rows.length === 0} onClick={download}>
      <FA icon={faDownload} aria-hidden /> Export CSV
    </button>
  );
}
