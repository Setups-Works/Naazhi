import Link from "next/link";
import { RELEASES, type ChangeKind } from "../../../features/changelog/releases";
import { R, Reveal } from "../Reveal";
import { Section, SectionHead, Surface } from "../ui";

const KIND: Record<ChangeKind, string> = { new: "New", improved: "Improved", fixed: "Fixed" };

/** The newest release, straight from the changelog (the page never has its own copy of what shipped, so it can't drift). */
export default function WhatsNew() {
  const r = RELEASES[0];
  if (!r) return null;
  return (
    <Section id="new" band="plain">
      <SectionHead kicker={`New in ${r.appVersion ?? "this release"}`} title={r.title.replace(/^Version [\d.]+: /, "")} quiet="" lead={r.summary} />
      <Reveal stagger={0.06} className="mx-auto mt-[clamp(28px,4vw,48px)] grid max-w-4xl gap-3 sm:grid-cols-2">
        {r.changes.slice(0, 6).map((c) => (
          <R key={c.text}>
            <Surface className="flex h-full flex-col gap-2 p-5">
              <span className="text-[11.5px] font-semibold tracking-[0.08em] text-fg-faint uppercase">
                {KIND[c.kind]} · {c.platform === "web" ? "Web" : "App"}
              </span>
              <p className="m-0 text-[15px] leading-relaxed text-fg">{c.text}</p>
            </Surface>
          </R>
        ))}
      </Reveal>
      <Reveal className="mt-8 text-center">
        <Link href="/changelog" className="text-[15px] font-medium text-fg underline underline-offset-4">
          Read the full changelog
        </Link>
      </Reveal>
    </Section>
  );
}
