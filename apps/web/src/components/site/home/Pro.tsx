import { faBan, faCalendarDays, faCheck, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { Count } from "../Count";
import { Logo } from "../Logo";
import { R, Reveal } from "../Reveal";
import { IconBadge, Section, SectionHead, Surface } from "../ui";

const STATS: { n: number; up?: boolean; icon: IconDefinition; t: string; d: string; chips: string[] }[] = [
  { n: 5, up: true, icon: faEnvelope, t: "Email accounts", d: "Connect up to 5 Gmail or Outlook accounts and manage them all from one place.", chips: ["Gmail", "Outlook"] },
  { n: 5, up: true, icon: faCalendarDays, t: "Calendars", d: "Keep work and personal schedules together in one unified view of your time.", chips: ["Google Calendar"] },
  { n: 0, icon: faBan, t: "Bundled AI subscriptions", d: "Bring your own key or top up only when you need AI. Or keep the workspace AI-free.", chips: ["BYOK", "Pay as you go", "AI-free"] },
];
const WITH_LOGO = ["Gmail", "Outlook", "Google Calendar"];

export default function Pro() {
  return (
    <Section id="pro" band="soft">
      <SectionHead kicker="Pro" title="Room for every inbox," quiet="every calendar." lead="Work and personal don’t have to live in separate worlds. Go further with Pro, and never pay for AI you don’t use." />
      <Reveal stagger={0.12} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-3">
        {STATS.map((x) => (
          <R key={x.t}>
            <Surface lift className="flex h-full flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <IconBadge icon={x.icon} />
                {x.up && <span className="rounded-pill bg-surface-muted px-3 py-1 text-[12px] font-medium text-fg-muted">Up to</span>}
              </div>
              <div className="font-serif text-[clamp(64px,8vw,96px)] leading-[0.9] tracking-[-0.045em] text-fg">
                <Count to={x.n} />
              </div>
              <h3 className="text-[17px] font-semibold text-fg">{x.t}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted">{x.d}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {x.chips.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1 text-[12.5px] text-fg-muted">
                    {WITH_LOGO.includes(c) && <Logo name={c} size={15} />}
                    {c}
                  </span>
                ))}
              </div>
            </Surface>
          </R>
        ))}
      </Reveal>
      <Reveal className="mt-6">
        <ul className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-x-6 gap-y-2 rounded-r3 bg-surface px-6 py-3.5 text-[14px] text-fg-muted ring-1 ring-line">
          {["Multiple email accounts", "Multiple calendars", "Switch AI providers anytime", "Your workspace stays put"].map((x) => (
            <li key={x} className="flex items-center gap-2">
              <FA icon={faCheck} className="text-green-fg" />
              {x}
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
