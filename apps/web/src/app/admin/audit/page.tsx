import Link from "next/link";
import { serverConfigured, adminDb } from "../../../server/session";
import SetupNotice from "../../../components/admin/SetupNotice";
import AuditExport, { type AuditRow } from "../../../components/admin/AuditExport";

const LABELS: Record<string, string> = {
  "user.make_admin": "Made admin",
  "user.remove_admin": "Removed admin",
  "user.ban": "Banned user",
  "user.unban": "Unbanned user",
  "user.delete": "Deleted user",
  "user.set_plan": "Changed plan",
  "user.password_reset": "Sent password reset",
  "user.resend_confirmation": "Resent confirmation",
  "user.invite": "Invited user",
  "plan.update": "Edited a plan",
  "message.send": "Sent a message",
  "announcement.create": "Created announcement",
  "announcement.show": "Showed announcement",
  "announcement.hide": "Hid announcement",
  "announcement.delete": "Deleted announcement",
};
const LIMIT = 500;
const PERIODS: Record<string, [label: string, days: number]> = { today: ["Today", 1], "7d": ["Last 7 days", 7], "30d": ["Last 30 days", 30] };
type Row = { id: string; admin_email: string; action: string; target: string | null; meta: Record<string, unknown> | null; created_at: string };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const describe = (m: Record<string, unknown> | null) =>
  Object.keys(m ?? {}).length
    ? Object.entries(m!)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";

/** The admin action log: filter by action, person or day range, and export what is shown. Read-only; entries can't be edited or deleted here. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!serverConfigured()) return <SetupNotice />;
  const sp = await searchParams;
  const action = one(sp.action);
  const q = one(sp.q).trim().toLowerCase();
  const period = PERIODS[one(sp.period)] ? one(sp.period) : "";

  let query = adminDb().from("admin_audit").select("id,admin_email,action,target,meta,created_at").order("created_at", { ascending: false }).limit(LIMIT);
  if (action && LABELS[action]) query = query.eq("action", action);
  if (period) query = query.gte("created_at", new Date(Date.now() - PERIODS[period][1] * 86_400_000).toISOString());
  const { data, error } = await query;
  const rows = ((data ?? []) as Row[]).filter((r) => !q || `${r.admin_email} ${r.target ?? ""}`.toLowerCase().includes(q));
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const filtered = !!(action || q || period);

  const exportRows: AuditRow[] = rows.map((r) => ({
    when: new Date(r.created_at).toISOString(),
    admin: r.admin_email,
    action: LABELS[r.action] ?? r.action,
    target: r.target ?? "",
    details: describe(r.meta),
  }));

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Audit log</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            What admins did
          </h1>
          <p className="meta">The latest {LIMIT} matching actions. Entries can’t be edited or deleted from the app.</p>
        </div>
        <AuditExport rows={exportRows} />
      </div>

      <form method="get" className="adm-filters" aria-label="Filter the audit log">
        <label>
          <span>Action</span>
          <select name="action" defaultValue={action}>
            <option value="">All actions</option>
            {Object.entries(LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Admin or target</span>
          <input name="q" type="search" defaultValue={one(sp.q)} placeholder="name@example.com" />
        </label>
        <label>
          <span>Period</span>
          <select name="period" defaultValue={period}>
            <option value="">All time</option>
            {Object.entries(PERIODS).map(([k, [label]]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="adm-filters-acts">
          <button type="submit" className="btn btn-primary btn-sm">
            Apply
          </button>
          {filtered && (
            <Link href="/admin/audit" className="btn btn-secondary btn-sm">
              Clear
            </Link>
          )}
        </span>
      </form>

      {error && (
        <p className="form-err" role="alert">
          Couldn’t load the audit log. Make sure the latest database migration has been applied.
        </p>
      )}
      <div className="dash-table">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{when(r.created_at)}</td>
                <td>{r.admin_email}</td>
                <td>
                  <span className="adm-pill" data-k={r.action.includes("delete") || r.action.includes("ban") ? "ban" : undefined}>
                    {LABELS[r.action] ?? r.action}
                  </span>
                </td>
                <td className="wrap">{r.target || "—"}</td>
                <td className="wrap">{describe(r.meta) || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {filtered ? "No actions match these filters." : "No admin actions recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
