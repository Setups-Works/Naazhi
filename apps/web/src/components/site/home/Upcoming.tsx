import Image from "next/image";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import Phone from "../Phone";
import { R, Reveal } from "../Reveal";
import { Section, SectionHead } from "../ui";

/**
 * The features this section lists. Add one per line ({ title, text }); with none, the section shows only the devices.
 * Swap the pictures by pointing IPAD_SCREEN (a landscape screen) and PHONE_SCREEN at other files in /public/mobile.
 */
const FEATURES: readonly { title: string; text: string }[] = [];
const IPAD_SCREEN = { src: "/mobile/ipad-screen.png", alt: "Home with the sidebar in the Naazhi app on an iPad" };
const PHONE_SCREEN = { src: "/mobile/home-2.png", alt: "Home in the Naazhi app on an iPhone" };

/** The iPad frame (landscape, 1524×1096) and where its screen opening sits, as a share of the frame. */
const SCREEN = "top-[4.38%] left-[3.15%] h-[91.24%] w-[93.7%] rounded-[2.4%/3.3%]";

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
          <div className="relative mx-auto w-full max-w-[760px]">
            <div className="relative aspect-[1143/822]">
              <div className={`absolute overflow-hidden bg-surface ${SCREEN}`}>
                <Image src={IPAD_SCREEN.src} alt={IPAD_SCREEN.alt} fill sizes="760px" unoptimized className="object-cover object-top" />
              </div>
              <Image
                src="/mobile/ipad-frame.png"
                alt=""
                width={1524}
                height={1096}
                aria-hidden
                unoptimized
                className="absolute inset-0 size-full"
              />
              {/* The phone sits in front of the iPad's lower right corner, its visible bottom edge level with the iPad's (the phone image has a ~2% transparent margin, hence the small offset). */}
              <div className="absolute right-[-5%] bottom-[-1.5%] w-[26%]">
                <Phone src={PHONE_SCREEN.src} alt={PHONE_SCREEN.alt} className="w-full" />
              </div>
            </div>
          </div>
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
