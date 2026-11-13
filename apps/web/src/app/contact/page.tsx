import type { Metadata } from "next";
import JsonLd from "../../components/site/JsonLd";
import { PageHero } from "../../components/site/kit";
import { Section, Surface } from "../../components/site/ui";
import { LEGAL_UPDATED_ISO, OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Contact",
  title: "Contact — Naazhi",
  description: "How to reach the team behind Naazhi: email, phone and postal address.",
  path: "/contact",
};
export const metadata: Metadata = pageMeta(SEO);

export default function Page() {
  const rows: [string, string, string?][] = [
    ["Email", OPERATOR.email, `mailto:${OPERATOR.email}`],
    ["Phone", OPERATOR.phone, `tel:${OPERATOR.phone.replace(/\s/g, "")}`],
    ["Address", `${OPERATOR.name}, ${OPERATOR.address}`],
  ];
  return (
    <main>
      <JsonLd data={pageSchemas({ ...SEO, type: "ContactPage", mainEntity: "organization", dateModified: LEGAL_UPDATED_ISO })} />
      <PageHero eyebrow="Contact" title="Talk to a" quiet="person." lead="Support, billing, refunds or feedback: write to us and we reply within 3 working days." />
      <Section tight>
        <Surface className="mx-auto max-w-[720px] p-6 sm:p-8">
          <dl className="flex flex-col gap-5">
            {rows.map(([k, v, href]) => (
              <div key={k}>
                <dt className="text-[12px] font-semibold text-fg-subtle">{k}</dt>
                <dd className="mt-1 text-[16px] text-fg">
                  {href ? (
                    <a className="text-green-fg underline" href={href}>
                      {v}
                    </a>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>
      </Section>
    </main>
  );
}
