import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, PageHero } from "../../components/site/kit";
import { Section, Surface } from "../../components/site/ui";
import { OPERATOR } from "../../lib/legal";
import { pageMeta, teamMemberPath, teamSchemas } from "../../lib/seo";
import { listPublicTeam } from "../../server/services/team/team.service";

const SEO = {
  name: "Team",
  title: "Team — Naazhi",
  description: `Meet the people behind Naazhi, the calm workspace for notes, to-dos, journal and chat, built by ${OPERATOR.name}.`,
  path: "/team",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

// The people come from the admin panel at request time, so this page can't be built ahead of the database.
export const dynamic = "force-dynamic";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export default async function Page() {
  const team = await listPublicTeam();
  return (
    <main>
      <JsonLd data={teamSchemas(team)} />
      <PageHero
        eyebrow="Team"
        title="The people behind"
        quiet="Naazhi."
        lead={`Naazhi is built by ${OPERATOR.name}, a small team that cares about calm, private software.`}
      />
      <Section tight>
        {team.length === 0 ? (
          <p className="mx-auto max-w-[560px] text-center text-[16px] text-fg-muted">We’re updating this page. Meanwhile, you can reach us through the contact page.</p>
        ) : (
          <ul className="mx-auto grid max-w-[1000px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
            {team.map((p) => (
              <li key={p.id}>
                <Surface as="article" id={p.slug} className="flex h-full flex-col gap-4 p-6 scroll-mt-24" aria-label={p.name}>
                  <div className="flex items-center gap-4">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a small portrait from an address the admin entered
                      <img src={p.photoUrl} alt={p.name} width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-green-bg text-[20px] font-semibold text-green-fg">
                        {initials(p.name)}
                      </span>
                    )}
                    <div>
                      <h2 className="font-serif text-[22px] font-semibold leading-tight text-fg">
                        <Link href={teamMemberPath(p.slug)} className="hover:underline">
                          {p.name}
                        </Link>
                      </h2>
                      <p className="mt-0.5 text-[14.5px] text-fg-muted">{p.role}</p>
                    </div>
                  </div>
                  {p.bio && <p className="text-[15px] leading-relaxed text-fg-muted">{p.bio}</p>}
                  <Link href={teamMemberPath(p.slug)} className="mt-auto text-[14px] font-medium text-green-fg underline" aria-label={`View ${p.name}’s profile`}>
                    View profile
                  </Link>
                  {p.links.length > 0 && (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[14px]">
                      {p.links.map((l) => (
                        <li key={l.url}>
                          <a className="text-green-fg underline" href={l.url} rel="me noopener noreferrer" target="_blank">
                            {l.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section tight>
        <CtaPanel title="Want to talk to us?" lead="Questions, feedback or ideas are welcome." primary={["Contact us", "/contact"]} />
      </Section>
    </main>
  );
}
