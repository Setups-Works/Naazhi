import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export type ToolCallState = "running" | "done" | "error";

/**
 * One line of the assistant's activity log, shown above what it fetched: the app's logo, what it is doing ("Getting data from Zoho
 * Books…") and how it ended (a spinner, a tick, or a warning). It speaks to screen readers as a polite status.
 */
export default function ToolCallLog({ logo, state, text }: { logo: string; state: ToolCallState; text: string }) {
  return (
    <p role="status" aria-live="polite" className="m-0 flex items-center gap-2.5 rounded-ctl bg-hover px-3 py-2 text-[13px] text-ink-2">
      <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-ctl border bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={14} height={14} className="object-contain" />
      </span>
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {state === "running" ? (
        <FA icon={faSpinner} className="animate-spin text-[12px] text-ink-3 motion-reduce:animate-none" aria-hidden />
      ) : state === "done" ? (
        <FA icon={faCheck} className="text-[12px] text-ink-3" aria-hidden />
      ) : (
        <FA icon={faTriangleExclamation} className="text-[12px] text-critical" aria-hidden />
      )}
    </p>
  );
}
