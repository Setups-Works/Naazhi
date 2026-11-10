import { faBan, faEye, faHandPointer, faKey, faPlug, faWallet } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { R, Reveal } from "../Reveal";
import { IconBadge, Section, SectionHead } from "../ui";

const OPTIONS: { icon: IconDefinition; t: string; d: string }[] = [
  { icon: faPlug, t: "Use a supported AI account", d: "Connect an AI account you already have." },
  { icon: faKey, t: "Bring your own API key", d: "Choose your model provider and connect it directly." },
  { icon: faWallet, t: "Pay for usage when you need it", d: "Top up only when you need AI. No bundled AI subscription." },
  { icon: faBan, t: "Or keep it AI-free", d: "Switch AI off completely. The workspace works the same." },
];

const RULES: { icon: IconDefinition; t: string; d: string }[] = [
  { icon: faHandPointer, t: "You approve every save", d: "A drafted note, journal entry or to-do shows a preview. Nothing is saved until you confirm." },
  { icon: faEye, t: "Outside content is untrusted", d: "Emails, web pages and transcripts are treated as data, never as instructions for the AI." },
];

/** Switchable AI: four ways to power it (one of them "off") and the two rules that hold whichever you choose. */
export default function Ai() {
  return (
    <Section id="ai" band="ink">
      <SectionHead
        dark
        kicker="AI on your terms"
        title="Pick the AI."
        quiet="Keep the workspace."
        lead="Your notes, tasks and journal never depend on one provider. Change the model, change the account, or turn it all off."
      />
      <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((o) => (
          <R key={o.t}>
            <div className="flex h-full flex-col gap-3 rounded-r4 bg-on-dark/5 p-6 text-on-dark ring-1 ring-on-dark/15">
              <IconBadge icon={o.icon} />
              <h3 className="text-[17px] font-semibold">{o.t}</h3>
              <p className="text-[14.5px] leading-relaxed text-on-dark/70">{o.d}</p>
            </div>
          </R>
        ))}
      </Reveal>
      <Reveal stagger={0.1} className="mt-4 grid gap-4 md:grid-cols-2">
        {RULES.map((o) => (
          <R key={o.t}>
            <div className="flex h-full items-start gap-4 rounded-r4 bg-on-dark/5 p-6 text-on-dark ring-1 ring-on-dark/15">
              <IconBadge icon={o.icon} />
              <div>
                <h3 className="text-[17px] font-semibold">{o.t}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-on-dark/70">{o.d}</p>
              </div>
            </div>
          </R>
        ))}
      </Reveal>
    </Section>
  );
}
