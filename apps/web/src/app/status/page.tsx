import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faCircleCheck, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { CtaPanel, PageHero } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { Section, Surface } from "../../components/site/ui";
import { helpHref } from "../../lib/hosts";
import { pageMeta } from "../../lib/seo";
import { getStatusReport } from "../../server/services/status/status.service";

const SEO = {
  name: "Status",
  title: "Status — Naazhi",
  description: "Whether Naazhi is working right now: the website, sign-in and your workspace, checked live.",
  path: "/status",
};
// A live reading is out of date as soon as it is cached, so it stays out of search results.
export const metadata: Metadata = { ...pageMeta(SEO), robots: { index: false, follow: true } };

// A status page that shows a build-time answer would be worse than none: it is checked on every visit.
export const dynamic = "force-dynamic";

export default async function Page() {
  const report = await getStatusReport();
  const ok = report.overall === "operational";
  return (
    <main>
      
      <PageHero
        eyebrow="Status"
        title={ok ? "Everything is" : "Something is"}
        quiet={ok ? "working." : "not right."}
        lead={ok ? "Naazhi is running normally. These checks run each time you open this page." : "Part of Naazhi isn’t responding right now. Try again in a minute, and write to us if it keeps happening."}
      />
      <Section tight>
        <Reveal>
          <Surface variant={ok ? "soft" : "card"} className="mx-auto max-w-[720px] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line px-6 py-5">
              <FA icon={ok ? faCircleCheck : faTriangleExclamation} className={`text-[20px] ${ok ? "text-green-fg" : "text-amber-fg"}`} />
              <p className="text-[17px] font-medium text-fg">{ok ? "All systems operational" : "Some systems are not responding"}</p>
            </div>
            <ul className="divide-y divide-line bg-surface">
              {report.services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="text-[15.5px] font-medium text-fg">{s.name}</p>
                    <p className="text-[13.5px] text-fg-muted">{s.description}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-3 py-1 text-[12.5px] font-medium ${s.state === "up" ? "bg-green-bg text-green-fg" : "bg-amber-bg text-amber-fg"}`}
                  >
                    {s.state === "up" ? "Operational" : "Not responding"}
                  </span>
                </li>
              ))}
            </ul>
          </Surface>
          <p className="mx-auto mt-4 max-w-[720px] text-[13px] leading-relaxed text-fg-subtle">
            Checked just now. This shows live checks of our own services only. It doesn’t cover Google, your AI provider or other connected apps, and it keeps no history. For
            news of releases see the{" "}
            <Link className="text-green-fg underline underline-offset-2" href="/changelog">
              changelog
            </Link>
            .
          </p>
        </Reveal>
      </Section>
      <CtaPanel title="Seeing a problem" quiet="we don’t?" lead="Tell us what happened and we will look into it." primary={["Contact us", "/contact"]} secondary={["Help center", helpHref("/")]} />
    </main>
  );
}
