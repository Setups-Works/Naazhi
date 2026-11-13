import Link from "next/link";
import SetupNotice from "../../../components/admin/SetupNotice";
import { Breakdown, Card, DayChart, Stat, num } from "../../../components/admin/AnalyticsBlocks";
import { serverConfigured } from "../../../server/session";
import { adminAnalytics, type Series } from "../../../server/services/admin/analytics";
import { CLIENT_LABEL, type Client } from "../../../lib/userAgent";
import TrackedLinkBuilder from "../../../components/admin/TrackedLinkBuilder";
import { GOOGLE_PLAY_URL } from "../../../lib/site";
import { siteOrigin } from "../../../lib/seo";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;
const sum = (s: Series) => s.reduce((x, d) => x + d.n, 0);

export default async function Page({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!serverConfigured()) return <SetupNotice />;
  const q = Number((await searchParams).days);
  const days = (RANGES as readonly number[]).includes(q) ? q : 30;
  const a = await adminAnalytics(days);
  const web = sum(a.signinsWeb);
  const app = sum(a.signinsApp);
  const period = `last ${days} days`;

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[clamp(28px,3vw,32px)] leading-[1.1] font-semibold tracking-[-0.022em] text-fg">Analytics</h1>
          <p className="mt-2 max-w-[60ch] text-[14px] text-fg-subtle">
            How Naazhi is used. Counts only, never anyone’s content. Web or app comes from the device each person signed in with; screen-level detail is in Firebase Analytics.
          </p>
        </div>
        <nav aria-label="Time range" className="flex rounded-ctl bg-hover p-[3px]">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?days=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={`rounded-tab px-3 py-1 text-[13px] font-medium ${r === days ? "bg-raised text-fg shadow-e1" : "text-fg-muted hover:text-fg"}`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total people" value={a.users} />
        <Stat label="Active, 7 days" value={a.wau} />
        <Stat label="Active, 30 days" value={a.mau} />
        <Stat label="Web sign-ins" value={web} hint={period} />
        <Stat label="App sign-ins" value={app} hint={period} />
        <Stat label="AI tokens" value={sum(a.tokens)} hint={period} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Active people" note={`People who signed in each day, ${period}.`}>
          <DayChart label="Active people per day" series={[a.activeUsers]} />
        </Card>
        <Card title="New sign-ups" note={`Accounts created each day, ${period}.`}>
          <DayChart label="New sign-ups per day" series={[a.signups]} />
        </Card>
        <Card title="Web and app sign-ins" note={`Sign-ins per day, ${period}.`}>
          <DayChart label="Sign-ins per day, web and app" series={[a.signinsWeb, a.signinsApp]} legend={[`Web · ${num(web)}`, `App · ${num(app)}`]} />
        </Card>
        <Card title="AI tokens" note={`Input plus output, all plans, ${period}.`}>
          <DayChart label="AI tokens per day" series={[a.tokens]} />
        </Card>
        <Card title="Where people sign in" note={`Sign-ins, ${period}.`}>
          <Breakdown data={a.clients.map((c) => ({ label: CLIENT_LABEL[c.label as Client] ?? c.label, n: c.n }))} />
        </Card>
        <Card title="Browsers and devices" note={`Sign-ins, ${period}.`}>
          <Breakdown data={a.browsers} />
        </Card>
        <Card title="Where sign-ups came from" note={`The link or site each new person arrived from, ${period}.${a.untracked ? ` ${num(a.untracked)} signed up before this was tracked.` : ""}`}>
          <Breakdown data={a.sources} empty="No sign-ups with a source yet. Share a tracked link (below)." />
        </Card>
        <Card title="Visits by source" note={`Visits to the public site (one per browser session, nothing about the visitor is kept), ${period}. Total: ${num(a.visitsTotal)}.`}>
          <Breakdown data={a.visits} empty="No visits counted yet." />
        </Card>
        <Card title="Landing pages" note={`The page each visit started on, ${period}.`}>
          <Breakdown data={a.landing} empty="No visits counted yet." />
        </Card>
        <div className="md:col-span-2">
          <Card title="Visits to sign-ups" note="For each source, how many visits became a sign-up. Sign-ups are noted the first time someone signs in, so recent visits may not have converted yet.">
            {a.conversion.length === 0 ? (
              <p className="text-[13px] text-fg-faint">Nothing to compare yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13.5px]">
                  <thead>
                    <tr className="text-left text-[12px] text-fg-subtle">
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 text-right font-medium">Visits</th>
                      <th className="pb-2 text-right font-medium">Sign-ups</th>
                      <th className="pb-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.conversion.map((r) => (
                      <tr key={r.label} className="border-t border-line">
                        <td className="py-2 text-fg">{r.label}</td>
                        <td className="py-2 text-right text-fg-muted tabular-nums">{num(r.visits)}</td>
                        <td className="py-2 text-right text-fg-muted tabular-nums">{num(r.signups)}</td>
                        <td className="py-2 text-right text-fg tabular-nums">{r.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <Card title="Campaigns" note={`Sign-ups from tagged links, ${period}.`}>
          <Breakdown data={a.campaigns} empty="No campaign tags yet." />
        </Card>
        <Card title="Features used" note="Share of all people who have used each at least once, ever.">
          <Breakdown data={a.adoption} of={a.users} />
        </Card>
        <div className="md:col-span-2">
          <Card title="Make a tracked link" note="Share this link instead of the plain one and the sign-ups it brings show up above, by name.">
            <TrackedLinkBuilder siteUrl={`${siteOrigin()}/`} playUrl={GOOGLE_PLAY_URL} />
          </Card>
        </div>
        <div className="grid gap-4">
          <Card title="Plans" note="People on each active plan.">
            <Breakdown data={a.plans} />
          </Card>
          <Card title="Sign-in method" note="People per method. One person can have several.">
            <Breakdown data={a.providers} of={a.users} />
          </Card>
        </div>
      </div>
    </div>
  );
}
