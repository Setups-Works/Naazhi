"use client";
import Link from "next/link";
import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from "react";
import { faArrowUp, faBookOpen, faListCheck, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { Icon as FA } from "@/components/ui/Icon";
import { useDraftText } from "../../hooks/useDraft";

export type QuickMode = "task" | "journal";
export type QuickAddHandle = { open: (mode: QuickMode) => void };

const MODES = {
  task: { label: "To-do", icon: faListCheck, placeholder: "Add a to-do…", done: "Added to today’s to-dos.", max: 300 },
  journal: { label: "Entry", icon: faBookOpen, placeholder: "Write an entry…", done: "Saved to today’s journal.", max: 50000 },
} as const;

/**
 * Home's one-line capture bar: add a to-do for today or a line in today's journal without leaving Home. Asking the assistant is a
 * button to the chat page (which has its own start screen), so Home stays a dashboard. Each mode keeps its own unsent draft; the
 * journal draft is shared with today's Journal page. `onTask` / `onJournal` are Home's existing actions.
 */
const QuickAdd = forwardRef<QuickAddHandle, { today: string; onTask: (title: string) => void; onJournal: (body: string) => void; disabled?: boolean }>(
  function QuickAdd({ today, onTask, onJournal, disabled = false }, ref) {
    const input = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<QuickMode>("task");
    const [status, setStatus] = useState("");
    const drafts = { task: useDraftText("home:task"), journal: useDraftText(`journal:${today}`) };
    const [text, setText] = drafts[mode];
    const m = MODES[mode];

    const pick = (next: QuickMode) => {
      setMode(next);
      setStatus("");
      input.current?.focus();
    };
    useImperativeHandle(ref, () => ({ open: pick }));

    function submit(e: FormEvent) {
      e.preventDefault();
      const v = text.trim();
      if (!v || disabled) return;
      setText("");
      if (mode === "task") onTask(v.slice(0, m.max));
      else onJournal(v);
      setStatus(m.done);
    }

    return (
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center gap-2">
          <form
            onSubmit={submit}
            className="flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-ctl bg-raised pr-1.5 pl-1.5 shadow-[inset_0_0_0_1px_var(--line-2)] transition-shadow duration-(--control) ease-(--ease) focus-within:shadow-[inset_0_0_0_1px_var(--line-3)]"
          >
            <div role="radiogroup" aria-label="Add as" className="flex shrink-0 items-center gap-[3px] rounded-tab bg-hover p-[3px]">
              {(Object.keys(MODES) as QuickMode[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={k === mode}
                  onClick={() => pick(k)}
                  aria-label={MODES[k].label}
                  className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-tab px-2 text-[12.5px] font-medium text-fg-muted transition-colors duration-(--control) ease-(--ease) hover:text-fg aria-checked:bg-raised aria-checked:text-fg aria-checked:shadow-e1 max-[560px]:w-8 max-[560px]:justify-center max-[560px]:px-0"
                >
                  <FA icon={MODES[k].icon} className="text-[12px]" />
                  {/* On a phone the switch shows icons only, so the text field keeps its room. */}
                  <span className="max-[560px]:sr-only">{MODES[k].label}</span>
                </button>
              ))}
            </div>
            <label htmlFor="home-quick-add" className="sr-only">
              {m.placeholder}
            </label>
            <input
              id="home-quick-add"
              ref={input}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (status) setStatus("");
              }}
              placeholder={m.placeholder}
              maxLength={m.max}
              autoComplete="off"
              className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-2 text-[14.5px] max-[700px]:text-[16px] text-fg shadow-none [font:inherit] outline-none placeholder:text-fg-faint"
            />
            <button
              type="submit"
              aria-label={mode === "task" ? "Add to-do" : "Save entry"}
              disabled={!text.trim() || disabled}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-tab bg-fill-dark text-[12px] text-on-dark transition-opacity duration-(--control) ease-(--ease) disabled:cursor-default disabled:opacity-25"
            >
              <FA icon={faArrowUp} />
            </button>
          </form>
          <Link
            href="/dashboard/chat?new=1"
            aria-label="Ask Naazhi"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-ctl bg-raised px-4 text-[13.5px] font-medium text-fg shadow-[inset_0_0_0_1px_var(--line-2)] transition-colors duration-(--control) ease-(--ease) hover:bg-hover max-[560px]:w-11 max-[560px]:px-0"
          >
            <FA icon={faWandMagicSparkles} className="text-[14px]" />
            <span className="max-[560px]:sr-only">Ask Naazhi</span>
          </Link>
        </div>
        <p className="m-0 mt-1.5 px-1 text-[12.5px] text-fg-subtle empty:mt-0" role="status">
          {status}
        </p>
      </div>
    );
  },
);

export default QuickAdd;
