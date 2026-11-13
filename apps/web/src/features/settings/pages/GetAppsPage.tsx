import Link from "next/link";
import { DESKTOP_DOWNLOADS, DESKTOP_RELEASES_PAGE } from "../../../lib/desktopDownloads";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faDesktop, faMobileScreen } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppPreview, type PreviewKind } from "@/components/ui/AppPreview";

const PHONE = ["Quick notes, tasks and journal entries on the go", "Voice notes you can record in one tap", "Your workspace, in sync with the web"];
const DESKTOP = ["The whole workspace in its own window, with your notes, tasks and journal", "A menu bar or tray icon and keyboard shortcuts", "Updates itself, and always matches the web"];
const BROWSER = ["Record a meeting in your browser and get a transcript", "It lands in a Naazhi note, where you can read and edit it", "Share it with your workspace and turn action items into tasks"];

function Card({ kind, label, icon, title, items, children }: { kind: PreviewKind; label: string; icon: typeof faMobileScreen; title: string; items: string[]; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-r3 border bg-raised">
      <AppPreview kind={kind} />
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
          iPhone and iPad <Badge variant="secondary">Coming soon</Badge>
        </span>
      </Card>
      <Card kind="desktop" label="Desktop app" icon={faDesktop} title="Naazhi on your computer." items={DESKTOP}>
        <Button asChild size="lg">
          <a href={DESKTOP_DOWNLOADS.mac}>Download for Mac</a>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <a href={DESKTOP_DOWNLOADS.winX64}>Windows x64</a>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <a href={DESKTOP_DOWNLOADS.winArm64}>Windows ARM64</a>
        </Button>
        <a href={DESKTOP_RELEASES_PAGE} target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-ink-3 underline underline-offset-2">
          More downloads on GitHub
        </a>
      </Card>
      <Card kind="browser" label="Browser extension" icon={faDesktop} title="Every meeting, written down." items={BROWSER}>
        <span className="flex items-center gap-2 text-[14px] text-ink-3">
          Extension <Badge variant="secondary">Coming soon</Badge>
        </span>
      </Card>
    </div>
  );
}
