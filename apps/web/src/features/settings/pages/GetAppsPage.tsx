import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faDesktop, faMobileScreen } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PHONE = ["Quick notes, tasks and journal entries on the go", "Voice notes you can record in one tap", "Your workspace, in sync with the web"];
const BROWSER = ["Record a meeting in your browser and get a transcript", "It lands in a Naazhi note, where you can read and edit it", "Share it with your workspace and turn action items into tasks"];

/** A small drawn preview at the top of a card: a phone with today's tasks, or a browser window with a transcript. */
function Preview({ kind }: { kind: "phone" | "browser" }) {
  return (
    <div className="grid h-[200px] place-items-center overflow-hidden rounded-t-r3 bg-side" aria-hidden>
      {kind === "phone" ? (
        <div className="h-[170px] w-[120px] translate-y-8 rounded-t-[22px] border-2 border-ink bg-raised p-3">
          <div className="mx-auto mb-2 h-1.5 w-8 rounded-pill bg-ink" />
          <div className="rounded-r2 border p-2 text-[11px] leading-tight">
            <b className="block">Today’s tasks</b>
            {["Call the dentist", "Send the revised deck", "Pick up groceries"].map((t, i) => (
              <span key={t} className="mt-1 flex items-center gap-1.5">
                <i className={`size-2 rounded-full border ${i === 0 ? "bg-ink" : ""}`} /> <span className={i === 0 ? "line-through opacity-60" : ""}>{t}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-[230px] rounded-r2 border bg-raised p-2">
          <div className="mb-2 flex gap-1">
            {[0, 1, 2].map((i) => (
              <i key={i} className="size-1.5 rounded-full bg-line-2" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {["P", "A", "M", "R"].map((l) => (
              <span key={l} className="grid h-10 place-items-center rounded-r1 bg-hover text-[12px] font-semibold text-ink-2">
                {l}
              </span>
            ))}
          </div>
          <p className="m-0 mt-2 rounded-r1 border p-1.5 text-[11px]">
            <b className="text-blue-fg">Priya</b> · Let’s ship the beta on Friday.
          </p>
        </div>
      )}
    </div>
  );
}

function Card({ kind, label, icon, title, items, children }: { kind: "phone" | "browser"; label: string; icon: typeof faMobileScreen; title: string; items: string[]; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-r3 border bg-raised">
      <Preview kind={kind} />
      <div className="p-5">
        <p className="m-0 flex items-center gap-2 text-[13.5px] text-ink-3">
          <FA icon={icon} /> {label}
        </p>
        <h2 className="m-0 mt-2 text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
        <ul className="m-0 mt-4 grid list-none gap-2.5 p-0 text-[14.5px]">
          {items.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <FA icon={faCheck} className="mt-1 text-[12px] text-ink-2" /> {b}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">{children}</div>
      </div>
    </section>
  );
}

export default function GetAppsPage() {
  return (
    <div className="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
      <Card kind="phone" label="iPhone and Android" icon={faMobileScreen} title="Naazhi, one tap away." items={PHONE}>
        <Button asChild size="lg">
          <Link href="/download">Get the Android app</Link>
        </Button>
        <span className="flex items-center gap-2 text-[14px] text-ink-3">
          iPhone <Badge variant="secondary">Coming soon</Badge>
        </span>
      </Card>
      <Card kind="browser" label="Browser extension" icon={faDesktop} title="Every meeting, written down." items={BROWSER}>
        <span className="flex items-center gap-2 text-[14px] text-ink-3">
          Extension <Badge variant="secondary">Coming soon</Badge>
        </span>
      </Card>
    </div>
  );
}
