import { TRUST } from "../content";
import { IconBadge, Section, SectionHead, Surface, TextLink } from "../ui";
import { R, Reveal } from "../Reveal";
import { Tip } from "../Tip";

/** The security promises in plain words; hovering one shows the technical detail. */
export default function Trust() {
  return (
    <Section id="trust">
      <SectionHead kicker="Privacy & security" title="Private by design," quiet="not by promise." lead="The database itself checks who may see what, so your data doesn’t depend on a screen hiding a button." />
      <Reveal stagger={0.07} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST.map((x) => (
          <R key={x.t}>
            <Tip content={x.tip} className="flex h-full w-full">
              <Surface lift className="flex h-full w-full flex-col gap-3 p-6">
                <IconBadge icon={x.icon} />
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{x.t}</h3>
                <p className="text-[15px] leading-relaxed text-fg-muted">{x.d}</p>
              </Surface>
            </Tip>
          </R>
        ))}
      </Reveal>
      <Reveal className="mt-8 text-center">
        <TextLink href="/privacy-security">Read how we protect your data</TextLink>
      </Reveal>
    </Section>
  );
}
