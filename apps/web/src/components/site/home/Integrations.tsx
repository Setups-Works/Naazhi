import { isLive } from "../../../lib/logos";
import { ALL_INTEGRATIONS, GROUPS } from "../content";
import { Logo } from "../Logo";
import { Marquee } from "../Marquee";
import { R, Reveal } from "../Reveal";
import { Section, SectionHead, Surface } from "../ui";
import { Tip } from "../Tip";
import NoteRef from "../NoteRef";

const note = (n: string) => (isLive(n) ? `${n} works with your workspace.` : `${n} is planned. We’ll mark it live when it ships.`);

/** A slim ticker of the services, to sit right under the hero. */
export function IntegrationsTicker() {
  return (
    <section aria-label="Integrations" className="py-8">
      <Marquee>
        {ALL_INTEGRATIONS.map((n) => (
          <Tip key={n} content={note(n)}>
            <span
              className={`inline-flex items-center gap-2.5 rounded-pill bg-surface px-4 py-2.5 text-[14px] text-fg ring-1 ring-line ${isLive(n) ? "" : "opacity-60"}`}
            >
              <Logo name={n} size={18} />
              {n}
            </span>
          </Tip>
        ))}
      </Marquee>
    </section>
  );
}

/** The services by group, each marked live or soon. */
export default function Integrations() {
  return (
    <Section id="integrations">
      <SectionHead
        kicker="Integrations"
        title="Connect the tools"
        quiet="you already use."
        lead="From inbox to issue tracker, and a model that can grow to the rest. Each one says whether it’s live."
      />
      <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,48px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <R key={g.name}>
            <Surface className="h-full p-6">
              <h3 className="text-[12px] font-semibold tracking-[0.1em] text-fg-faint uppercase">{g.name}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {g.items.map((x) => (
                  <li key={x.name} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-r2 bg-surface-muted">
                      <Logo name={x.name} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15px] font-medium text-fg">{x.name}</b>
                      <small className="block text-[13px] text-fg-muted">{x.use}</small>
                    </span>
                    {!isLive(x.name) && (
                      <em className="rounded-pill bg-surface-sunken px-2 py-0.5 text-[11px] text-fg-muted not-italic">Soon</em>
                    )}
                  </li>
                ))}
              </ul>
            </Surface>
          </R>
        ))}
      </Reveal>
      <p className="mx-auto mt-8 max-w-[640px] text-center text-[13px] leading-relaxed text-fg-faint">
        Names and logos belong to their owners.
        <NoteRef n={1} /> Apps marked Soon are not available yet.
        <NoteRef n={2} />
      </p>
    </Section>
  );
}
