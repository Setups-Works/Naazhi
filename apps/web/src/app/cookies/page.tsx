import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faBan, faCheck, faCookieBite, faDatabase, faUserLock } from "@fortawesome/free-solid-svg-icons";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { Section, Surface } from "../../components/site/ui";
import { LEGAL_UPDATED, LEGAL_UPDATED_ISO } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Cookies & Storage",
  title: "Cookies & Storage — Naazhi",
  description: "The few cookies and browser storage Naazhi uses, why, and how to clear them. No advertising or tracking cookies.",
  path: "/cookies",
};
export const metadata: Metadata = pageMeta(SEO);

const ITEMS = [
  {
    name: "Sign-in cookie",
    kind: "Cookie · strictly necessary",
    why: "Keeps you signed in as you move between pages. Without it you would be asked to sign in on every page.",
    when: "Set when you sign in, removed when you sign out or the session ends.",
  },
  {
    name: "Last sign-in method",
    kind: "Cookie · convenience",
    why: "Remembers whether you last used Google, a passkey, email or a username, so the sign-in page can show it first.",
    when: "Set when you sign in. Holds only the name of the method.",
  },
  {
    name: "Where you came from",
    kind: "Cookie · convenience",
    why: "If you arrive from a link with a source on it (for example from our Instagram) or from another site, it remembers that name, so we can tell which link brought someone who signs up. It holds four short words and nothing about you, and it is never shared.",
    when: "Set only when there is a source to remember. Kept for 30 days.",
  },
  {
    name: "Your settings and layout",
    kind: "Browser storage · convenience",
    why: "Remembers things like your chosen AI provider, whether a sidebar is open, dismissed tips and your look. They stay on your device.",
    when: "Kept until you clear your browser data or change the setting.",
  },
];

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas({ ...SEO, dateModified: LEGAL_UPDATED_ISO })} />
      <PageHero
        eyebrow="Cookies & Storage"
        title="Only what keeps you"
        quiet="signed in."
        lead="Naazhi uses a small number of cookies and browser storage items to work. None of them are for advertising, and none follow you to other sites."
      />

      <Section tight>
        <SectionHead kicker="At a glance" title="Plain and" quiet="short." />
        <FeatureCards
          items={[
            { icon: faBan, t: "No advertising cookies", d: "We don’t show ads and we don’t let advertisers set cookies here.", tone: "clay" },
            { icon: faDatabase, t: "No analytics on this site", d: "No analytics or tracking scripts on the public pages. Inside the signed-in app, anonymous usage (never your content) can be turned off in Settings → Privacy.", tone: "blue" },
            { icon: faUserLock, t: "Needed to sign in", d: "The one cookie we can’t work without keeps you signed in. The rest are conveniences.", tone: "green" },
          ]}
        />
      </Section>

      <Section tight>
        <SectionHead kicker="The list" title="What is" quiet="stored." lead="Every item, what it does and how long it stays." />
        <Reveal className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-3">
          {ITEMS.map((i) => (
            <Surface key={i.name} lift className="flex h-full flex-col gap-3 p-6">
              <span className="grid size-11 place-items-center rounded-r3 bg-green-bg text-green-fg">
                <FA icon={faCookieBite} className="text-[16px]" />
              </span>
              <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-fg">{i.name}</h3>
              <p className="text-[12.5px] font-medium text-green-fg">{i.kind}</p>
              <p className="text-[15px] leading-relaxed text-fg-muted">{i.why}</p>
              <p className="mt-auto border-t border-line pt-3 text-[13.5px] leading-relaxed text-fg-subtle">{i.when}</p>
            </Surface>
          ))}
        </Reveal>
      </Section>

      <Section tight>
        <div className="mx-auto grid max-w-[920px] gap-4 md:grid-cols-2">
          <Surface variant="soft" className="flex flex-col gap-3 p-6 sm:p-8">
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">Clearing them</h3>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              You can delete cookies and site data in your browser’s settings at any time. Signing out removes the sign-in cookie. If you clear them, you will be
              signed out and your local settings reset. Your notes and other content are stored in your account, not in the browser, so they are not affected.
            </p>
          </Surface>
          <Surface className="flex flex-col gap-3 p-6 sm:p-8">
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">If this changes</h3>
            <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-fg-muted">
              {[
                "We will update this page and its date before we add any cookie that isn’t strictly necessary.",
                "Where the law requires it, we will ask for your consent first.",
                "The Privacy Policy covers what the Android and iOS apps store on your phone.",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                  {x}
                </li>
              ))}
            </ul>
          </Surface>
        </div>
        <p className="mx-auto mt-6 max-w-[920px] text-[13px] text-fg-subtle">
          Last updated {LEGAL_UPDATED}. See also the{" "}
          <Link className="text-green-fg underline underline-offset-2" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <CtaPanel title="Questions about" quiet="your data?" lead="Ask us what is stored, or ask for it to be deleted." primary={["Contact us", "/contact"]} secondary={["Privacy Policy", "/privacy"]} />
    </main>
  );
}
