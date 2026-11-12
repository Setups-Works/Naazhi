import { faBan, faEye, faHandPointer, faKey, faPlug, faWallet } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { R, Reveal } from "../Reveal";
import NoteRef from "../NoteRef";
import { IconBadge, Section, SectionHead } from "../ui";

const OPTIONS: { icon: IconDefinition; t: string; d: string; soon?: boolean }[] = [
  {
    icon: faWallet,
    t: "Pay for what you use",
    d: "Top up credit in rupees and tokens come off it. Or subscribe with autopay for a monthly allowance.",
  },
  {
    icon: faKey,
    t: "Bring your own API key",
    d: "Add a key for OpenAI, Anthropic, Google or OpenRouter and pick the model for each chat.",
  },
  {
    icon: faPlug,
    t: "Use your ChatGPT plan",
    d: "Sign in once and use the ChatGPT plan you already pay for. We’re building it.",
    soon: true,
  },
  { icon: faBan, t: "Or keep it AI-free", d: "Switch AI off completely. The workspace works the same." },
];

const RULES: { icon: IconDefinition; t: string; d: string }[] = [
  {
    icon: faHandPointer,
    t: "You approve every save",
    d: "A drafted note, journal entry or to-do shows a preview. Nothing is saved until you confirm.",
  },
  {
    icon: faEye,
    t: "Outside content is untrusted",
    d: "Emails, web pages and transcripts are treated as data, never as instructions for the AI.",
  },
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
        lead={
          <>
            Your notes, tasks and journal never depend on one provider. Change the model, bring your own key, or turn it all off.
            <NoteRef n={4} dark />
          </>
        }
      />
      <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OPTIONS.map((o) => (
          <R key={o.t}>
            <div className="flex h-full flex-col gap-3 rounded-r4 bg-on-dark/5 p-6 text-on-dark ring-1 ring-on-dark/15">
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={o.icon} dark />
                {o.soon && (
                  <span className="rounded-pill bg-on-dark/10 px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap text-on-dark/80">
                    Coming soon
                  </span>
                )}
              </div>
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
              <IconBadge icon={o.icon} dark />
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
