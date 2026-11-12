import { Icon as FA } from "@/components/ui/Icon";
import { COLLAB_POINTS } from "../content";
import DeviceDuo from "../DeviceDuo";
import { R, Reveal } from "../Reveal";
import { Section, SectionHead } from "../ui";

/** Shared journals: what they do (the points are the site's own, from content.ts) beside the iPad and iPhone showing one. */
export default function Collaboration() {
  return (
    <Section id="collaborate" band="soft">
      <SectionHead
        kicker="Journal · Collaborate"
        title="Write a journal"
        quiet="together."
        heart
        lead="Start a shared journal for a trip, a project or a family, and write in it with the people you invite."
      />
      <div className="mx-auto mt-[clamp(28px,4vw,48px)] grid max-w-6xl items-center gap-[clamp(32px,5vw,72px)] lg:grid-cols-[1fr_1.15fr]">
        <Reveal stagger={0.08} className="flex flex-col gap-5 lg:order-1">
          {COLLAB_POINTS.map(([icon, title, text]) => (
            <R key={title}>
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-r2 bg-green-bg text-[17px] text-green-fg">
                  <FA icon={icon} />
                </span>
                <div>
                  <b className="block text-[17px] font-medium text-fg">{title}</b>
                  <p className="m-0 mt-1 text-[15px] leading-relaxed text-fg-muted">{text}</p>
                </div>
              </div>
            </R>
          ))}
        </Reveal>
        <Reveal className="lg:order-2">
          <DeviceDuo
            ipad={{ src: "/mobile/collab-ipad.png", alt: "A shared journal, Trip planning, open on an iPad" }}
            phone={{ src: "/mobile/collab-phone.png", alt: "The Shared journals list on an iPhone" }}
            phoneSide="left"
          />
        </Reveal>
      </div>
    </Section>
  );
}
