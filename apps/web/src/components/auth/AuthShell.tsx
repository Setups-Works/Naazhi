import type { ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import DeviceDuo from "../site/DeviceDuo";
import { WRAP } from "../site/ui";
import { AUTH_PANEL } from "./content";

/**
 * The frame for log in, sign up and password reset: a quiet product panel on the left and the form on the right, centred and card-less (hidden on a phone, where the form fills the screen). One accent only, the brand green on the ticks.
 */
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main>
      <div className={`${WRAP} grid gap-[clamp(24px,4vw,64px)] py-[clamp(20px,3vw,40px)] lg:min-h-[calc(100svh-96px)] lg:grid-cols-2`}>
        <div className="flex items-center justify-center py-[clamp(16px,4vw,48px)] lg:order-2">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <aside className="hidden lg:order-1 flex-col justify-between gap-10 overflow-hidden rounded-r5 bg-surface-muted px-[clamp(28px,4vw,56px)] pt-[clamp(32px,4vw,56px)] pb-[clamp(28px,4vw,48px)] ring-1 ring-line lg:flex">
          <div className="flex flex-col gap-5">
            <h2 className="m-0 max-w-[520px] font-serif text-[clamp(30px,3.4vw,46px)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance text-fg">
              {AUTH_PANEL.title} <span className="text-fg-faint">{AUTH_PANEL.quiet}</span>
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {AUTH_PANEL.points.map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15.5px] text-fg-muted">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-green-bg text-[11px] text-green-fg">
                    <FA icon={faCheck} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <DeviceDuo ipad={AUTH_PANEL.ipad} phone={AUTH_PANEL.phone} />
        </aside>
      </div>
    </main>
  );
}
