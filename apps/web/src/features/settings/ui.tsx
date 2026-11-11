import type { ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";

/** A small bold label above a bordered card of rows (the template's section pattern). */
export function SettingsSection({ title, note, children, className }: { title: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-7", className)}>
      <h2 className="m-0 mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
        {title}
        {note && <small className="text-[13px] font-normal text-ink-3">{note}</small>}
      </h2>
      <div className="divide-y divide-line overflow-hidden rounded-r3 border bg-raised">{children}</div>
    </section>
  );
}

/** One row: bold title and muted description on the left, the control on the right. */
export function SettingsRow({ title, description, children }: { title: ReactNode; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 max-[600px]:flex-wrap">
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] font-semibold">{title}</b>
        {description && <p className="m-0 mt-0.5 text-[14px] text-ink-2">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** A single centred muted sentence inside a card. */
export function SettingsEmpty({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      {title && <b className="block text-[15px] font-semibold">{title}</b>}
      <p className="m-0 mt-1 text-[14px] text-ink-3">{children}</p>
    </div>
  );
}

/** A quiet banner under the page title: what is (not) available yet, in one line. */
export function SettingsNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-r3 bg-side px-4 py-3 text-[14px] text-ink-2", className)} role="note">
      <FA icon={faLock} className="shrink-0 text-[12px] text-ink-3" />
      <span>{children}</span>
    </div>
  );
}

/** A 40px rounded tile with the app's first letter, standing in for its logo. */
export function LogoTile({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-r2 border bg-raised text-[15px] font-semibold text-ink-2", className)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** A small grey tag next to a title or beside a control ("Not connected", "Short transcription"). */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-xs bg-hover px-2 py-0.5 text-[12.5px] text-ink-2">{children}</span>;
}

/** A row with a logo tile on the left, name and description, and actions on the right. */
export function AppRow({ name, description, extra, logo, children }: { name: string; description?: ReactNode; extra?: ReactNode; logo?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 max-[600px]:flex-wrap">
      {logo ?? <LogoTile name={name} />}
      <div className="min-w-0 flex-1 max-[600px]:basis-[60%]">
        <b className="block text-[15px] font-semibold">{name}</b>
        {description && <p className="m-0 mt-0.5 text-[14px] text-ink-2">{description}</p>}
        {extra}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2 max-[600px]:basis-full">{children}</div>}
    </div>
  );
}
