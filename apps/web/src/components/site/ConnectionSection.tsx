import type { ReactNode } from "react";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { Icon as FA } from "@/components/ui/Icon";
import { Logo } from "./Logo";
import { R, Reveal } from "./Reveal";
import { Section, StatusChip, Surface } from "./ui";
import { isLive } from "../../lib/logos";

export type Connection = {
  id: string;
  /** The brand names whose marks sit next to the heading (they must exist in Logo.tsx). */
  logos: string[];
  kicker: string;
  title: string;
  quiet: string;
  lead: string;
  points: string[];
  /** Where in Naazhi to start, in one sentence. */
  how: string;
  /** Apps listed under the points; each is marked live or soon from lib/logos.isLive. */
  apps?: { name: string; use: string }[];
  after?: ReactNode;
};

/** One connection explained on the integrations page: what it brings in, how to start, and which parts are live. */
export default function ConnectionSection({ c, band }: { c: Connection; band?: "soft" | "plain" }) {
  return (
    <Section id={c.id} tight band={band}>
      <div className="mx-auto grid max-w-5xl items-start gap-[clamp(24px,5vw,64px)] md:grid-cols-[1.1fr_0.9fr]">
        <Reveal stagger={0.08} className="flex flex-col gap-4">
          <R>
            <p className="m-0 flex items-center gap-2 text-[12.5px] font-semibold tracking-[0.1em] text-green-fg uppercase">
              {c.logos.map((l) => (
                <span key={l} className="grid size-8 place-items-center rounded-r2 bg-surface-muted">
                  <Logo name={l} size={18} />
                </span>
              ))}
              {c.kicker}
            </p>
          </R>
          <R>
            <h2 className="m-0 font-serif text-[clamp(30px,3.6vw,46px)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance">
              {c.title} <span className="text-fg-faint">{c.quiet}</span>
            </h2>
          </R>
          <R>
            <p className="m-0 text-[17px] leading-relaxed text-fg-muted">{c.lead}</p>
          </R>
          <R>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {c.points.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-fg-muted">
                  <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                  {p}
                </li>
              ))}
            </ul>
          </R>
          <R>
            <p className="m-0 text-[14.5px] leading-relaxed text-fg-subtle">
              <b className="font-semibold text-fg">How to start:</b> {c.how}
            </p>
          </R>
          {c.after && <R>{c.after}</R>}
        </Reveal>
        {c.apps && (
          <Reveal>
            <Surface className="p-6">
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {c.apps.map((a) => (
                  <li key={a.name} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-r2 bg-surface-muted">
                      <Logo name={a.name} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15px] font-medium text-fg">{a.name}</b>
                      <small className="block text-[13px] text-fg-muted">{a.use}</small>
                    </span>
                    <StatusChip status={isLive(a.name) || a.name === "Notion" ? "live" : "soon"} />
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
