import { R, Reveal } from "../Reveal";
import { Section, SectionHead, Surface } from "../ui";

const SOURCES: { name: string; logo: string; where: string; d: string }[] = [
  { name: "Apple Health", logo: "/brand/health-apple.png", where: "iPhone", d: "Steps, sleep, workouts, heart rate, weight, mood and more." },
  { name: "Google Health Connect", logo: "/brand/health-google.png", where: "Android", d: "Steps, sleep, activity, resting heart rate and weight." },
];

/** Connect health data from the phone: the two sources, each with its logo. Sits before "The workspace". */
export default function HealthConnect() {
  return (
    <Section id="health" tight>
      <SectionHead
        kicker="Health"
        title="Connect for"
        quiet="health."
        lead="Bring your steps, sleep and heart rate into Naazhi from your phone. Only daily totals are kept, and the assistant sees them only if you allow it."
      />
      <Reveal stagger={0.1} className="mx-auto mt-[clamp(28px,4vw,52px)] grid max-w-[820px] gap-4 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <R key={s.name}>
            <Surface className="flex h-full items-start gap-4 p-6">
              <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-r3 border bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.logo} alt="" width={36} height={36} className="size-9 object-contain" />
              </span>
              <div>
                <p className="m-0 text-[12.5px] font-medium tracking-[0.06em] text-fg-subtle uppercase">{s.where}</p>
                <h3 className="m-0 mt-0.5 text-[18px] font-semibold">{s.name}</h3>
                <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-fg-muted">{s.d}</p>
              </div>
            </Surface>
          </R>
        ))}
      </Reveal>
      <p className="mx-auto mt-5 max-w-[620px] text-center text-[13.5px] text-fg-subtle">
        Connect from the Naazhi app: Apple and Google keep health data on your phone, so it can’t be done on the web.
      </p>
    </Section>
  );
}
