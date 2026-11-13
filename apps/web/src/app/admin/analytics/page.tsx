import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import { Icon as FA } from "@/components/ui/Icon";
import SetupNotice from "../../../components/admin/SetupNotice";
import { serverConfigured } from "../../../server/session";
import { adminAnalytics, type Series } from "../../../server/services/admin/analytics";
import { CLIENT_LABEL, type Client } from "../../../lib/userAgent";

export const dynamic = "force-dynamic";

function Bars({ title, data, note }: { title: string; data: Series; note: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="dash-card">
      <h4>{title}</h4>
      <div className="adm-chart" role="img" aria-label={title}>
        {data.map((d, i) => (
          <div key={i} title={`${d.label}: ${d.n.toLocaleString()}`}>
            <i style={{ height: `${(d.n / max) * 100}%` }} />
            <small>{i % 5 === 0 ? d.label.split(" ")[0] : ""}</small>
          </div>
        ))}
      </div>
      <p className="meta" style={{ marginTop: 12 }}>
        {note}
      </p>
    </div>
  );
}

function Split({ title, data, note }: { title: string; data: Series; note?: string }) {
  const total = data.reduce((a, d) => a + d.n, 0) || 1;
  return (
    <div className="dash-card">
      <h4>{title}</h4>
      <table>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td className="empty">Nothing yet.</td>
            </tr>
          )}
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td style={{ textAlign: "right" }}>{d.n.toLocaleString()}</td>
              <td style={{ textAlign: "right" }} className="meta">
                {Math.round((d.n / total) * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && (
        <p className="meta" style={{ marginTop: 12 }}>
          {note}
        </p>
      )}
    </div>
  );
}

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const a = await adminAnalytics(30);
  const sum = (s: Series) => s.reduce((x, d) => x + d.n, 0);
  const tiles: [string, number][] = [
    ["Total users", a.users],
    ["Active, last 7 days", a.wau],
    ["Active, last 30 days", a.mau],
    ["Sign-ins on the web (30 days)", sum(a.signinsWeb)],
    ["Sign-ins in the app (30 days)", sum(a.signinsApp)],
    ["AI tokens (30 days)", sum(a.tokens)],
  ];
  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">
            <FA icon={faChartLine} /> Analytics
          </div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            How Naazhi is used
          </h1>
          <p className="meta">
            Counts only, never anyone’s content. Where people use it comes from the device they signed in with, so it shows web versus the
            phone app, not every screen opened. Screen-level detail is in Firebase Analytics.
          </p>
        </div>
      </div>

      <div className="dash-stats adm-six">
        {tiles.map(([l, n]) => (
          <div key={l} className="dash-stat">
            <b>{n.toLocaleString()}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <Bars title="Active people per day" data={a.activeUsers} note="People who signed in that day, last 30 days." />
        <Bars title="New sign-ups per day" data={a.signups} note="Accounts created, last 30 days." />
        <Bars title="Web sign-ins per day" data={a.signinsWeb} note="Sign-ins from a browser." />
        <Bars title="App sign-ins per day" data={a.signinsApp} note="Sign-ins from the Android or iPhone app." />
        <Bars title="AI tokens per day" data={a.tokens} note="Input plus output tokens used across all plans." />
        <Split
          title="Where people sign in"
          data={a.clients.map((c) => ({ label: CLIENT_LABEL[c.label as Client] ?? c.label, n: c.n }))}
          note="Sign-ins in the last 30 days."
        />
        <Split title="Browsers and devices" data={a.browsers} />
        <Split title="Sign-in method" data={a.providers} note="People per method (one person can have several)." />
        <Split title="Plans" data={a.plans} note="People on each active plan." />
        <Split title="Features used" data={a.adoption} note="People who have used each feature at least once, ever." />
      </div>
    </div>
  );
}
