import type { ReactNode } from "react";
import { PageHero } from "./kit";
import { Section } from "./ui";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** A plain reading page for policies: a hero, then numbered sections in a narrow column. */
export default function LegalPage({
  eyebrow,
  title,
  lead,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main>
      <PageHero eyebrow={eyebrow} title={title} lead={lead} />
      <Section tight>
        <div className="mx-auto max-w-[720px]">
          <p className="mb-8 text-[13px] text-fg-subtle">Last updated {updated}</p>
          <div className="flex flex-col gap-9">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="font-serif text-[24px] tracking-[-0.01em] text-fg">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 flex flex-col gap-3 text-[15.5px] leading-relaxed text-fg-muted">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
