import { Icon as FA } from "@/components/ui/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import DeviceDuo from "../DeviceDuo";
import { R, Reveal } from "../Reveal";
import { Section, SectionHead } from "../ui";

/**
 * The features this section lists. Add one per line ({ title, text }); with none, the section shows only the devices.
 * Swap the pictures by pointing IPAD_SCREEN (a landscape screen) and PHONE_SCREEN at other files in /public/mobile.
 */
const FEATURES: readonly { title: string; text: string }[] = [];
const IPAD_SCREEN = { src: "/mobile/ipad-screen.png", alt: "Home with the sidebar in the Naazhi app on an iPad" };
const PHONE_SCREEN = { src: "/mobile/home-2.png", alt: "Home in the Naazhi app on an iPhone" };

/** An iPad in landscape with an iPhone overlapping its lower corner, placed right above the latest-release section. */
export default function Upcoming() {
  return (
    <Section id="upcoming" band="soft">
      <SectionHead
        kicker="Coming to the app"
        title="Made for iPad"
        quiet="and tablets."
        lead="On an iPad or tablet, Naazhi shows the same sidebar as the website, beside every page, on the web and in the app."
      />
      <div
        className={`mx-auto mt-[clamp(28px,4vw,48px)] grid max-w-5xl items-center gap-[clamp(28px,5vw,64px)] ${FEATURES.length ? "md:grid-cols-[1.4fr_1fr]" : ""}`}
      >
        <Reveal>
          <DeviceDuo ipad={IPAD_SCREEN} phone={PHONE_SCREEN} />
        </Reveal>
        {FEATURES.length > 0 ? (
          <Reveal stagger={0.08} className="flex flex-col gap-4">
            {FEATURES.map((f) => (
              <R key={f.title}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-green-bg text-[11px] text-green-fg">
                    <FA icon={faCheck} />
                  </span>
                  <div>
                    <b className="block text-[16px] font-medium text-fg">{f.title}</b>
                    <p className="m-0 mt-1 text-[15px] leading-relaxed text-fg-muted">{f.text}</p>
                  </div>
                </div>
              </R>
            ))}
          </Reveal>
        ) : null}
      </div>
    </Section>
  );
}
