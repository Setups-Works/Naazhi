import { CAPABILITIES } from "../content";
import Glass from "../Glass";
import { IconTile, Section, StatusChip } from "../Kit";
import { R, Reveal } from "../Reveal";
import { Title } from "../Title";

/**
 * Everything the workspace does, in one grid: what it is in a sentence, and whether you can use it today. Built things say Live;
 * the rest say Building or Coming soon, so nothing here promises more than ships.
 */
export default function Capabilities() {
  return (
    <Section id="capabilities">
      <div className="mx-auto flex max-w-[760px] flex-col items-center gap-4 text-center">
        <Title quiet="in one grid.">All of it,</Title>
        <Reveal delay={120}>
          <p className="text-[clamp(17px,1.7vw,21px)] leading-relaxed text-fg-muted">What you can use today, and what is on the way.</p>
        </Reveal>
      </div>
      <Reveal stagger={0.07} className="mt-[clamp(32px,5vw,64px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c) => (
          <R key={c.t}>
            <Glass variant="flat" radius="r4" tone={c.tone} lift className="flex h-full flex-col gap-3 p-6">
              <div className="flex items-start justify-between">
                <IconTile icon={c.icon} />
                <StatusChip status={c.status} />
              </div>
              <h3 className="mt-1 font-serif text-[26px] leading-tight tracking-[-0.022em]">{c.t}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted">{c.d}</p>
            </Glass>
          </R>
        ))}
      </Reveal>
    </Section>
  );
}
