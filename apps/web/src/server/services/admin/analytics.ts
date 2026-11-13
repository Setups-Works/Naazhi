import "server-only";
import { pool } from "../../db/pool";
import { clientOf, browserOf, type Client } from "../../../lib/userAgent";

/**
 * Admin analytics from our own database: counts only, never content. "Platform" comes from the user-agent saved with each sign-in
 * (auth.sessions), so it shows where people signed in, not every screen they opened (Firebase Analytics has that).
 */

/** Which clients each person has signed in from, and the one they signed in from last. */
export async function clientsByUser(): Promise<Map<string, { all: Exclude<Client, "unknown">[]; last: Client }>> {
  const { rows } = await pool().query<{ user_id: string; user_agent: string | null; last: Date }>(
    "select user_id, user_agent, max(created_at) as last from auth.sessions group by user_id, user_agent",
  );
  const acc = new Map<string, { set: Set<Exclude<Client, "unknown">>; last: Client; at: number }>();
  for (const r of rows) {
    const c = clientOf(r.user_agent);
    const e = acc.get(r.user_id) ?? { set: new Set<Exclude<Client, "unknown">>(), last: c, at: 0 };
    if (c !== "unknown") e.set.add(c);
    if (new Date(r.last).getTime() >= e.at) Object.assign(e, { last: c, at: new Date(r.last).getTime() });
    acc.set(r.user_id, e);
  }
  return new Map([...acc].map(([id, e]) => [id, { all: [...e.set], last: e.last }]));
}

export type Series = { label: string; n: number }[];

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
function fill(days: number, counts: Map<string, number>): Series {
  const out: Series = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = day(new Date(Date.now() - i * 86_400_000));
    out.push({ label: new Date(k).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), n: counts.get(k) ?? 0 });
  }
  return out;
}

export async function adminAnalytics(days = 30) {
  const q = <T extends object>(sql: string) => pool().query<T>(sql, [days]).then((r) => r.rows);
  // The source tables come from a newer migration; until it has been applied they read as empty instead of failing the whole page.
  const soft = <T extends object>(sql: string) => q<T>(sql).catch(() => [] as T[]);
  const [signins, active, signups, providers, tokens, plans, adoption, totals, sources, campaigns, visitSources, landing, untracked] = await Promise.all([
    q<{ d: Date; user_agent: string | null; n: string }>(
      "select date_trunc('day', created_at) d, user_agent, count(*) n from auth.sessions where created_at > now() - make_interval(days => $1) group by 1, 2",
    ),
    q<{ d: Date; n: string }>("select date_trunc('day', created_at) d, count(distinct user_id) n from auth.sessions where created_at > now() - make_interval(days => $1) group by 1"),
    q<{ d: Date; n: string }>("select date_trunc('day', created_at) d, count(*) n from auth.users where created_at > now() - make_interval(days => $1) group by 1"),
    q<{ provider_id: string; n: string }>("select provider_id, count(distinct user_id) n from auth.accounts where $1::int > 0 group by 1"),
    q<{ d: Date; n: string }>(
      "select date_trunc('day', created_at) d, sum(input_tokens + output_tokens) n from public.ai_usage where created_at > now() - make_interval(days => $1) group by 1",
    ),
    q<{ plan_id: string; n: string }>("select plan_id, count(*) n from public.user_billing where status = 'active' and $1::int > 0 group by 1"),
    q<{ feature: string; n: string }>(
      `select 'Notes' feature, count(distinct user_id) n from public.notes where $1::int > 0
       union all select 'Tasks', count(distinct user_id) from public.tasks where $1::int > 0
       union all select 'Journal', count(distinct user_id) from public.journal_entries where $1::int > 0
       union all select 'Chat', count(distinct user_id) from public.chats where $1::int > 0
       union all select 'AI replies', count(distinct user_id) from public.ai_usage where $1::int > 0`,
    ),
    q<{ users: string; wau: string; mau: string }>(
      `select (select count(*) from auth.users where $1::int > 0) users,
              (select count(distinct user_id) from auth.sessions where created_at > now() - interval '7 days') wau,
              (select count(distinct user_id) from auth.sessions where created_at > now() - interval '30 days') mau`,
    ),
    soft<{ source: string; n: string }>(
      "select source, count(*) n from public.user_acquisition where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc, 1 limit 12",
    ),
    soft<{ label: string; n: string }>(
      "select source || ' / ' || campaign as label, count(*) n from public.user_acquisition where campaign <> '' and created_at > now() - make_interval(days => $1) group by 1 order by 2 desc, 1 limit 10",
    ),
    soft<{ source: string; n: string }>(
      "select source, count(*) n from public.site_visits where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc, 1 limit 12",
    ),
    soft<{ path: string; n: string }>(
      "select landing_path path, count(*) n from public.site_visits where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc, 1 limit 8",
    ),
    soft<{ n: string }>("select count(*) n from auth.users u where $1::int > 0 and not exists (select 1 from public.user_acquisition a where a.user_id = u.id)"),
  ]);

  const perDay = (rows: { d: Date; n: string }[]) => fill(days, new Map(rows.map((r) => [day(r.d), Number(r.n)])));
  const byClient = new Map<Client, number>();
  const byBrowser = new Map<string, number>();
  const dayClient = { web: new Map<string, number>(), app: new Map<string, number>() };
  for (const r of signins) {
    const n = Number(r.n);
    const c = clientOf(r.user_agent);
    byClient.set(c, (byClient.get(c) ?? 0) + n);
    const b = browserOf(r.user_agent);
    byBrowser.set(b, (byBrowser.get(b) ?? 0) + n);
    const m = c === "web" ? dayClient.web : dayClient.app;
    m.set(day(r.d), (m.get(day(r.d)) ?? 0) + n);
  }
  const top = (m: Map<string, number>, k = 8) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([label, n]) => ({ label, n }));
  const t = totals[0];
  return {
    days,
    users: Number(t?.users ?? 0),
    wau: Number(t?.wau ?? 0),
    mau: Number(t?.mau ?? 0),
    signinsWeb: fill(days, dayClient.web),
    signinsApp: fill(days, dayClient.app),
    activeUsers: perDay(active),
    signups: perDay(signups),
    tokens: perDay(tokens),
    clients: top(byClient as Map<string, number>),
    browsers: top(byBrowser),
    providers: providers.map((r) => ({ label: r.provider_id === "credential" ? "email" : r.provider_id, n: Number(r.n) })),
    plans: plans.map((r) => ({ label: r.plan_id, n: Number(r.n) })),
    adoption: adoption.map((r) => ({ label: r.feature, n: Number(r.n) })),
    sources: sources.map((r) => ({ label: r.source, n: Number(r.n) })),
    campaigns: campaigns.map((r) => ({ label: r.label, n: Number(r.n) })),
    untracked: Number(untracked[0]?.n ?? 0),
    visits: visitSources.map((r) => ({ label: r.source, n: Number(r.n) })),
    visitsTotal: visitSources.reduce((a, r) => a + Number(r.n), 0),
    landing: landing.map((r) => ({ label: r.path, n: Number(r.n) })),
    // visits and sign-ups for the same source, side by side
    conversion: (() => {
      const signups = new Map(sources.map((r) => [r.source, Number(r.n)]));
      return visitSources.map((r) => {
        const v = Number(r.n), su = signups.get(r.source) ?? 0;
        return { label: r.source, visits: v, signups: su, rate: v ? Math.round((su / v) * 1000) / 10 : 0 };
      });
    })(),
  };
}
