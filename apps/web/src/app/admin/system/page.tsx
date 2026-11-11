import { countRows, serverConfigured, adminDb } from "../../../server/session";
import SetupNotice from "../../../components/admin/SetupNotice";

// Row counts only — admins never see user content (see app/admin/AGENTS.md).
const TABLES: [string, string][] = [
  ["profiles", "Profiles"],
  ["notes", "Notes"],
  ["tasks", "Tasks"],
  ["journal_entries", "Journal entries"],
  ["chats", "Chats"],
  ["chat_messages", "Chat messages"],
  ["notifications", "Notifications"],
  ["admin_audit", "Audit entries"],
];

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const t0 = Date.now();
  const ping = await adminDb().from("profiles").select("id").limit(1);
  const latency = Date.now() - t0;
  const counts = await Promise.all(TABLES.map(async ([t]) => countRows(t).catch(() => null)));
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">System</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            Health and storage
          </h1>
          <p className="meta">Read-only. Counts only, never content.</p>
        </div>
      </div>
      <div className="dash-stats">
        <div className="dash-stat">
          <b>{ping.error ? "Down" : "Up"}</b>
          <small>Database</small>
        </div>
        <div className="dash-stat">
          <b>{latency} ms</b>
          <small>Query latency</small>
        </div>
      </div>
      <div className="dash-table">
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th>Rows</th>
            </tr>
          </thead>
          <tbody>
            {TABLES.map(([, label], i) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{counts[i] ?? "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
