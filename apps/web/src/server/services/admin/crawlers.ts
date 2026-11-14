import "server-only";
import type { QueryResultRow } from "pg";
import { pool } from "../../db/pool";
import type { CrawlerKind } from "../../../lib/crawlers";

/**
 * Crawler visits for Admin → Crawlers. Written by the proxy (`recordCrawl`), read by the admin page (`crawlStats`). Never throws into the
 * request that triggered it; a failed count is just a missed count.
 */
const KEEP_DAYS = 90;

export async function recordCrawl(hit: { bot: string; kind: CrawlerKind; path: string; host: string }): Promise<void> {
  try {
    const path = hit.path.split("?")[0]!.slice(0, 200) || "/";
    await pool().query("insert into public.crawler_hits (bot, kind, path, host) values ($1, $2, $3, $4)", [hit.bot.slice(0, 60), hit.kind, path, hit.host.slice(0, 120)]);
    // Housekeeping on about one write in a hundred, so the table never needs a separate job.
    if (Math.random() < 0.01) await pool().query("delete from public.crawler_hits where created_at < now() - make_interval(days => $1)", [KEEP_DAYS]);
  } catch {
    /* a missed count is fine */
  }
}

export type Series = { label: string; n: number }[];
export type BotRow = { bot: string; kind: CrawlerKind; hits: number; pages: number; first: string; last: string };

export type CrawlStats = {
  days: number;
  total: number;
  today: number;
  kinds: Record<CrawlerKind, number>;
  perDay: Record<CrawlerKind, Series>;
  bots: BotRow[];
  paths: { path: string; hits: number; bots: number }[];
  hosts: Series;
  recent: { bot: string; kind: CrawlerKind; path: string; at: string }[];
  since: string | null;
};

const KINDS: CrawlerKind[] = ["search", "ai", "social", "seo", "other"];
const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export async function crawlStats(days: number): Promise<CrawlStats> {
  const q = <T extends QueryResultRow>(sql: string, p: unknown[] = [days]) => pool().query<T>(sql, p).then((r) => r.rows, () => [] as T[]);
  const where = "created_at > now() - make_interval(days => $1)";
  const [perDay, bots, paths, hosts, recent, today, since] = await Promise.all([
    q<{ d: Date; kind: CrawlerKind; n: string }>(`select date_trunc('day', created_at) d, kind, count(*) n from public.crawler_hits where ${where} group by 1, 2`),
    q<{ bot: string; kind: CrawlerKind; hits: string; pages: string; first: Date; last: Date }>(
      `select bot, kind, count(*) hits, count(distinct path) pages, min(created_at) "first", max(created_at) "last" from public.crawler_hits where ${where} group by 1, 2 order by 3 desc, 1`,
    ),
    q<{ path: string; hits: string; bots: string }>(`select path, count(*) hits, count(distinct bot) bots from public.crawler_hits where ${where} group by 1 order by 2 desc, 1 limit 15`),
    q<{ host: string; n: string }>(`select host, count(*) n from public.crawler_hits where ${where} group by 1 order by 2 desc limit 8`),
    q<{ bot: string; kind: CrawlerKind; path: string; created_at: Date }>(`select bot, kind, path, created_at from public.crawler_hits order by created_at desc limit 25`, []),
    q<{ n: string }>("select count(*) n from public.crawler_hits where created_at >= date_trunc('day', now())", []),
    q<{ d: Date | null }>("select min(created_at) d from public.crawler_hits", []),
  ]);

  const series = Object.fromEntries(KINDS.map((k) => [k, new Map<string, number>()])) as Record<CrawlerKind, Map<string, number>>;
  const kinds = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<CrawlerKind, number>;
  for (const r of perDay) {
    series[r.kind].set(dayKey(r.d), Number(r.n));
    kinds[r.kind] += Number(r.n);
  }
  const fill = (m: Map<string, number>): Series =>
    Array.from({ length: days }, (_, i) => {
      const k = dayKey(new Date(Date.now() - (days - 1 - i) * 86_400_000));
      return { label: new Date(k).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), n: m.get(k) ?? 0 };
    });

  return {
    days,
    total: KINDS.reduce((a, k) => a + kinds[k], 0),
    today: Number(today[0]?.n ?? 0),
    kinds,
    perDay: Object.fromEntries(KINDS.map((k) => [k, fill(series[k])])) as Record<CrawlerKind, Series>,
    bots: bots.map((b) => ({ bot: b.bot, kind: b.kind, hits: Number(b.hits), pages: Number(b.pages), first: new Date(b.first).toISOString(), last: new Date(b.last).toISOString() })),
    paths: paths.map((p) => ({ path: p.path, hits: Number(p.hits), bots: Number(p.bots) })),
    hosts: hosts.map((h) => ({ label: h.host || "(unknown)", n: Number(h.n) })),
    recent: recent.map((r) => ({ bot: r.bot, kind: r.kind, path: r.path, at: new Date(r.created_at).toISOString() })),
    since: since[0]?.d ? new Date(since[0].d).toISOString() : null,
  };
}
