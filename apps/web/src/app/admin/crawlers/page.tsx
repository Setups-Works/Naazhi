import Link from "next/link";
import SetupNotice from "../../../components/admin/SetupNotice";
import { Breakdown, Card, DayChart, Stat, num } from "../../../components/admin/AnalyticsBlocks";
import { CRAWLER_KIND_LABEL, type CrawlerKind } from "../../../lib/crawlers";
import { crawlStats } from "../../../server/services/admin/crawlers";
import { serverConfigured } from "../../../server/session";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
const KINDS: CrawlerKind[] = ["search", "ai", "social", "seo", "other"];
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!serverConfigured()) return <SetupNotice />;
  const q = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(q) ? q : 30;
  const s = await crawlStats(days);
  const period = `last ${days} days`;

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[clamp(28px,3vw,32px)] leading-[1.1] font-semibold tracking-[-0.022em] text-fg">Crawlers</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] text-fg-subtle">
            Visits to the public site from search engines, AI assistants and link previews, found by the name each one gives itself. A name can be faked, so treat
            these as claims. Only the bot, the page and the time are kept, with no address. Counting began {s.since ? when(s.since) : "when the first visit arrives"}; Google’s own crawl numbers are in Search Console.
          </p>
        </div>
        <nav aria-label="Time range" className="flex rounded-ctl bg-hover p-[3px]">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/crawlers?days=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={`rounded-tab px-3 py-1 text-[13px] font-medium ${r === days ? "bg-raised text-fg shadow-e1" : "text-fg-muted hover:text-fg"}`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Visits, all bots" value={s.total} hint={period} />
        <Stat label="Today" value={s.today} />
        {KINDS.slice(0, 4).map((k) => (
          <Stat key={k} label={CRAWLER_KIND_LABEL[k]} value={s.kinds[k]} hint={period} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Visits per day" note={`Search engines and AI assistants, ${period}.`}>
          <DayChart
            label="Crawler visits per day"
            series={[s.perDay.search, s.perDay.ai, s.perDay.social]}
            legend={[`Search · ${num(s.kinds.search)}`, `AI · ${num(s.kinds.ai)}`, `Link previews · ${num(s.kinds.social)}`]}
          />
        </Card>
        <Card title="By kind" note={`Visits, ${period}.`}>
          <Breakdown data={KINDS.map((k) => ({ label: CRAWLER_KIND_LABEL[k], n: s.kinds[k] })).filter((d) => d.n > 0)} of={s.total} empty="No crawler visits yet." />
        </Card>

        <Card title="Every crawler" note={`All the bots seen, ${period}.`}>
          {s.bots.length === 0 ? (
            <p className="m-0 text-[13.5px] text-fg-faint">No crawler visits yet. They appear here as bots read the site.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-fg-subtle">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Bot</th>
                    <th className="py-1.5 pr-3 font-medium">Kind</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Visits</th>
                    <th className="py-1.5 pr-3 text-right font-medium">Pages</th>
                    <th className="py-1.5 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {s.bots.map((b) => (
                    <tr key={`${b.bot}-${b.kind}`} className="border-t border-line">
                      <td className="py-1.5 pr-3 font-medium text-fg">{b.bot}</td>
                      <td className="py-1.5 pr-3 text-fg-muted">{CRAWLER_KIND_LABEL[b.kind]}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{num(b.hits)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{num(b.pages)}</td>
                      <td className="py-1.5 whitespace-nowrap text-fg-muted" suppressHydrationWarning>
                        {when(b.last)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card title="Most crawled pages" note={`Visits, ${period}.`}>
            <Breakdown data={s.paths.map((p) => ({ label: p.path, n: p.hits }))} empty="No pages yet." />
          </Card>
          <Card title="By host" note={`Which address was crawled, ${period}.`}>
            <Breakdown data={s.hosts} empty="No hosts yet." />
          </Card>
        </div>

        <Card title="Latest visits" note="The 25 most recent.">
          {s.recent.length === 0 ? (
            <p className="m-0 text-[13.5px] text-fg-faint">Nothing yet.</p>
          ) : (
            <ul className="m-0 grid list-none gap-1.5 p-0 text-[13px]">
              {s.recent.map((r, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <b className="font-medium text-fg">{r.bot}</b> <span className="text-fg-muted">{r.path}</span>
                  </span>
                  <span className="shrink-0 text-fg-faint" suppressHydrationWarning>
                    {when(r.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
