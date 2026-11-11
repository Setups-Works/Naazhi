import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faUsers,
  faUserPlus,
  faEnvelopeCircleCheck,
  faBolt,
  faPenToSquare,
  faListCheck,
  faBookOpen,
  faComments,
  faMessage,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";
import { countRows, isAdmin, listAllUsers, serverConfigured, adminDb } from "../../server/session";
import SetupNotice from "../../components/admin/SetupNotice";

const DAY = 86_400_000;

function Bars({ title, tone, data, note }: { title: string; tone: string; data: { label: string; n: number }[]; note: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="dash-card">
      <h4>{title}</h4>
      <div className="adm-chart" role="img" aria-label={title}>
        {data.map((d) => (
          <div key={d.label} title={`${d.label}: ${d.n}`}>
            <i style={{ height: `${(d.n / max) * 100}%` }} />
            <small>{d.label.split(" ")[0]}</small>
          </div>
        ))}
      </div>
      <p className="meta" style={{ marginTop: 12 }}>
        {note}
      </p>
    </div>
  );
}

export default async function Page() {
  if (!serverConfigured()) return <SetupNotice />;
  const [users, notes, tasks, journal, chats, messages, profiles, recentAudit] = await Promise.all([
    listAllUsers(),
    countRows("notes"),
    countRows("tasks"),
    countRows("journal_entries"),
    countRows("chats"),
    countRows("chat_messages"),
    adminDb().from("profiles").select("plan"),
    adminDb().from("admin_audit").select("id,admin_email,action,target,created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const now = Date.now();
  const since = (iso?: string | null, days = 7) => !!iso && now - new Date(iso).getTime() < days * DAY;
  const pro = (profiles.data ?? []).filter((p) => p.plan === "pro").length;

  const stats = [
    [faUsers, "Total users", users.length, "violet"],
    [faUserPlus, "New this week", users.filter((u) => since(u.createdAt)).length, "amber"],
    [faBolt, "Active this week", users.filter((u) => since(u.lastSignIn)).length, "blue"],
    [faEnvelopeCircleCheck, "Email confirmed", users.filter((u) => u.emailVerified).length, "green"],
  ] as const;
  const content = [
    [faPenToSquare, "Notes", notes, "violet"],
    [faListCheck, "Tasks", tasks, "blue"],
    [faBookOpen, "Journal entries", journal, "amber"],
    [faComments, "Chats", chats, "mint"],
    [faMessage, "Messages", messages, "clay"],
    [faCrown, "Pro users", pro, "gold"],
  ] as const;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toDateString();
    return {
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      joined: users.filter((u) => new Date(u.createdAt).toDateString() === key).length,
      seen: users.filter((u) => u.lastSignIn && new Date(u.lastSignIn).toDateString() === key).length,
    };
  });
  const recent = [...users].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6);
  const google = users.filter((u) => u.providers.includes("google")).length;
  const planCounts = (profiles.data ?? []).reduce<Record<string, number>>((m, p) => {
    const k = String(p.plan ?? "free");
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const stale = users.filter((u) => !u.emailVerified && now - new Date(u.createdAt).getTime() > 3 * DAY).length;
  const dormant = users.filter((u) => !since(u.lastSignIn, 30)).length;
  const attention = [
    [stale, "Email not confirmed after 3 days", "/admin/users"],
    [users.filter((u) => u.banned).length, "Banned accounts", "/admin/users"],
    [dormant, "Not seen in 30 days", "/admin/users"],
  ] as const;
  const avgNotes = users.length ? (notes / users.length).toFixed(1) : "0";

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Overview</div>
          <h1 className="h2" style={{ marginTop: 8 }}>
            How it’s going
          </h1>
        </div>
      </div>
      <div className="dash-stats">
        {stats.map(([ic, l, n, t]) => (
          <div className={`dash-stat`} key={l}>
            <span className="adm-ico">
              <FA icon={ic} />
            </span>
            <b>{n}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>
      <div className="dash-stats adm-six">
        {content.map(([ic, l, n, t]) => (
          <div className={`dash-stat`} key={l}>
            <span className="adm-ico">
              <FA icon={ic} />
            </span>
            <b>{n}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <Bars
          title="Sign-ups, last 14 days"
          tone="violet"
          data={days.map((d) => ({ label: d.label, n: d.joined }))}
          note={`${google} with Google · ${users.length - google} with email`}
        />
        <Bars
          title="Users last seen, per day"
          tone="blue"
          data={days.map((d) => ({ label: d.label, n: d.seen }))}
          note="Counts each user on the day of their latest sign-in."
        />
        <div className="dash-card">
          <h4>Latest sign-ups</h4>
          {recent.length === 0 && <p className="meta">No users yet.</p>}
          {recent.map((u) => (
            <blockquote key={u.id} style={{ fontStyle: "normal" }}>
              {u.name || u.email}
              {isAdmin(u) && <b> · admin</b>}
              <small>
                {u.email} · {new Date(u.createdAt).toLocaleDateString()}
              </small>
            </blockquote>
          ))}
        </div>
        <div className="dash-card">
          <h4>At a glance</h4>
          <dl className="st-facts">
            <div>
              <dt>Notes per user</dt>
              <dd>{avgNotes}</dd>
            </div>
            <div>
              <dt>Pro share</dt>
              <dd>{users.length ? Math.round((pro / users.length) * 100) : 0}%</dd>
            </div>
            <div>
              <dt>Admins</dt>
              <dd>{users.filter(isAdmin).length}</dd>
            </div>
            <div>
              <dt>Banned</dt>
              <dd>{users.filter((u) => u.banned).length}</dd>
            </div>
            <div>
              <dt>Unconfirmed</dt>
              <dd>{users.filter((u) => !u.emailVerified).length}</dd>
            </div>
          </dl>
        </div>
        <div className="dash-card">
          <h4>Needs attention</h4>
          {attention.map(([n, label, href]) => (
            <blockquote key={label} style={{ fontStyle: "normal" }}>
              <Link href={href}>
                <b>{n}</b> {label}
              </Link>
            </blockquote>
          ))}
        </div>
        <div className="dash-card">
          <h4>Plans</h4>
          <dl className="st-facts">
            {Object.entries(planCounts).map(([k, n]) => (
              <div key={k}>
                <dt>{k.charAt(0).toUpperCase() + k.slice(1)}</dt>
                <dd>{n}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="dash-card" style={{ gridColumn: "1 / -1" }}>
          <h4>Recent admin activity</h4>
          {(recentAudit.data ?? []).length === 0 && <p className="meta">Nothing yet.</p>}
          {(recentAudit.data ?? []).map((r) => (
            <blockquote key={String(r.id)} style={{ fontStyle: "normal" }}>
              {String(r.action)}
              <small>
                {String(r.admin_email)}
                {r.target ? ` · ${String(r.target)}` : ""} · {new Date(String(r.created_at)).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </small>
            </blockquote>
          ))}
          <Link href="/admin/audit" className="meta">
            Open the full audit log
          </Link>
        </div>
      </div>
    </div>
  );
}
