import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "../../../components/site/JsonLd";
import { CtaPanel } from "../../../components/site/kit";
import { Section, Surface } from "../../../components/site/ui";
import { OPERATOR } from "../../../lib/legal";
import { pageMeta, SITE_NAME, teamMemberDescription, teamMemberPath, teamMemberSchemas } from "../../../lib/seo";
import { getPublicMember } from "../../../server/services/team/team.service";

// People are edited in the admin panel, so each page is made when it is asked for.
export const dynamic = "force-dynamic";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublicMember((await params).slug);
  // A page that doesn't exist must not be indexed; Next also answers it with a 404.
  if (!found) return { title: "Not found — Naazhi", robots: { index: false, follow: false } };
  const { member: m } = found;
  const meta = pageMeta({ title: `${m.name}, ${m.role} — ${SITE_NAME}`, description: teamMemberDescription(m), path: teamMemberPath(m.slug), ownImage: true });
  return { ...meta, openGraph: { ...meta.openGraph, type: "profile" } };
}

export default async function Page({ params }: Props) {
  const found = await getPublicMember((await params).slug);
  if (!found) notFound();
  const { member: m, others } = found;

  return (
    <main>
      <JsonLd data={teamMemberSchemas(m)} />
      <Section tight>
        <nav aria-label="Breadcrumb" className="mx-auto mb-8 max-w-[760px] text-[14px] text-fg-muted">
          <Link href="/team" className="underline-offset-4 hover:underline">
            Team
          </Link>
          <span aria-hidden> / </span>
          <span aria-current="page" className="text-fg">
            {m.name}
          </span>
        </nav>

        <article className="mx-auto flex max-w-[760px] flex-col gap-8" aria-label={m.name}>
          <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {m.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a portrait from an address the admin entered
              <img src={m.photoUrl} alt={`Portrait of ${m.name}`} width={144} height={144} fetchPriority="high" className="size-36 shrink-0 rounded-full object-cover" />
            ) : (
              <span aria-hidden className="grid size-36 shrink-0 place-items-center rounded-full bg-green-bg text-[44px] font-semibold text-green-fg">
                {initials(m.name)}
              </span>
            )}
            <div>
              <p className="m-0 text-[12px] font-semibold tracking-[0.1em] text-green-fg uppercase">Team</p>
              <h1 className="m-0 mt-1 font-serif text-[clamp(32px,5vw,48px)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg">{m.name}</h1>
              <p className="m-0 mt-2 text-[18px] text-fg-muted">
                {m.role} at {SITE_NAME}
              </p>
            </div>
          </header>

          <Surface className="flex flex-col gap-4 p-6">
            <h2 className="m-0 font-serif text-[22px] font-semibold text-fg">About {m.name.split(/\s+/)[0]}</h2>
            {m.bio ? (
              m.bio.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="m-0 text-[16px] leading-relaxed text-fg-muted">
                  {para}
                </p>
              ))
            ) : (
              <p className="m-0 text-[16px] leading-relaxed text-fg-muted">
                {m.name} is {m.role} at {SITE_NAME}, built by {OPERATOR.name}.
              </p>
            )}
            {(m.location || m.alumniOf || m.alternateNames.length > 0 || m.knowsAbout.length > 0) && (
              <dl className="m-0 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[auto_1fr]">
                {m.location && (
                  <>
                    <dt className="text-fg-subtle">Based in</dt>
                    <dd className="m-0 text-fg">{m.location}</dd>
                  </>
                )}
                {m.alumniOf && (
                  <>
                    <dt className="text-fg-subtle">Studied at</dt>
                    <dd className="m-0 text-fg">
                      {m.alumniUrl ? (
                        <a className="text-green-fg underline" href={m.alumniUrl} rel="noopener noreferrer" target="_blank">
                          {m.alumniOf}
                        </a>
                      ) : (
                        m.alumniOf
                      )}
                    </dd>
                  </>
                )}
                {m.alternateNames.length > 0 && (
                  <>
                    <dt className="text-fg-subtle">Also known as</dt>
                    <dd className="m-0 text-fg">{m.alternateNames.join(", ")}</dd>
                  </>
                )}
                {m.knowsAbout.length > 0 && (
                  <>
                    <dt className="text-fg-subtle">Works on</dt>
                    <dd className="m-0 text-fg">{m.knowsAbout.join(", ")}</dd>
                  </>
                )}
              </dl>
            )}
            {m.awards.length > 0 && (
              <div className="grid gap-1.5">
                <h3 className="m-0 text-[15px] font-semibold text-fg">Recognition</h3>
                <ul className="m-0 grid gap-1 pl-5 text-[15px] leading-relaxed text-fg-muted">
                  {m.awards.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="m-0 text-[15px] leading-relaxed text-fg-muted">
              {SITE_NAME} is the calm workspace for notes, to-dos, journal and chat. <Link href="/about" className="text-green-fg underline">Read about Naazhi</Link>.
            </p>
          </Surface>

          {m.links.length > 0 && (
            <section aria-labelledby="find-them" className="flex flex-col gap-3">
              <h2 id="find-them" className="m-0 font-serif text-[22px] font-semibold text-fg">
                Find {m.name.split(/\s+/)[0]} elsewhere
              </h2>
              <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[15px]">
                {m.links.map((l) => (
                  <li key={l.url}>
                    <a className="text-green-fg underline" href={l.url} rel="me noopener noreferrer" target="_blank">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </Section>

      {others.length > 0 && (
        <Section tight>
          <h2 className="mx-auto mb-5 max-w-[760px] font-serif text-[22px] font-semibold text-fg">More of the team</h2>
          <ul className="mx-auto grid max-w-[760px] list-none gap-4 p-0 sm:grid-cols-2">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={teamMemberPath(o.slug)} className="block rounded-r3 ring-1 ring-line p-5 hover:bg-hover">
                  <b className="block text-[16px] text-fg">{o.name}</b>
                  <span className="text-[14px] text-fg-muted">{o.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section tight>
        <CtaPanel title="Want to talk to us?" lead="Questions, feedback or ideas are welcome." primary={["Contact us", "/contact"]} />
      </Section>
    </main>
  );
}
