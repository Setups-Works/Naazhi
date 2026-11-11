"use client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faCheck, faDownload, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";
import { BrandMark } from "@/components/BrandMark";
import { api } from "../../lib/api/client";
import { authClient } from "../../lib/auth/client";
import { MILESTONES, OB, RAIL, stepOfSlug, stepPath, type Milestone, type Onboarding as State } from "../../lib/onboarding";
import { homePath } from "../../lib/hosts";
import { writePrefs, type Prefs } from "../../lib/prefs";
import GiftCard, { saveGiftCard, shareGiftCard } from "../../components/app/GiftCard";
import { Welcome, Start } from "./screens/Intro";
import { About, Prefs as PrefsScreen } from "./screens/Profile";
import { Accounts, Apps } from "./screens/Connect";
import { AccessScreen } from "./screens/Access";
import { Ask } from "./screens/Ask";
import { Tour } from "./screens/Tour";
import { ImportScreen } from "./screens/Import";
import { PlanScreen } from "./screens/Plan";
import { Lead, Title, type Ctx } from "./ui";

const DONE_LABEL: Record<Milestone, string> = {
  profile: "Learned about you",
  access: "Set what it may use",
  ask: "Answered a question",
  task: "Took a task",
  journal: "Opened your journal",
  note: "Saved a note",
  import: "Brought your notes",
};

/**
 * First-run flow at /onboarding/<screen>, full screen. New accounts and existing ones that never finished it are sent here.
 * The address says which screen is showing, so the browser's Back button, a refresh and a shared link all work.
 * Progress is saved to the account after every screen, so closing the tab resumes where the person left off.
 * The screens are real: preferences are saved, the assistant answers, drafts and notes are created, a vault is imported, a plan is chosen.
 * Anything that is not built yet (mail, calendar and app connections, Notion, location) is shown as "Soon" and does nothing.
 */
export default function Onboarding({ name, prefs: initial, state }: { name: string; prefs: Prefs; state: State }) {
  const router = useRouter();
  const sb = useMemo(api, []);
  const step = stepOfSlug(usePathname().split("/")[2]) ?? OB.welcome;
  const [display, setDisplay] = useState(name);
  const [prefs, setPrefs] = useState(initial);
  const [done, setDone] = useState<Milestone[]>(state.done);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // What is already saved, so a screen only writes what changed.
  const doneRef = useRef<Milestone[]>(state.done);
  const savedPrefs = useRef(JSON.stringify(initial));
  const savedName = useRef(name);
  const completed = useRef(state.completed);

  // A new screen starts at its heading, for keyboard and screen-reader users (unless a field on it already took focus).
  useEffect(() => {
    if (document.activeElement === document.body) document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
  }, [step]);

  const mark = useCallback((m: Milestone) => {
    if (doneRef.current.includes(m)) return;
    doneRef.current = [...doneRef.current, m];
    setDone(doneRef.current);
  }, []);

  /** Writes progress, and the name and preferences when they changed. Returns whether it worked. */
  async function save(to: number, patch: Partial<State> = {}): Promise<boolean> {
    const newName = display.trim() && display.trim() !== savedName.current ? display.trim() : null;
    const now = JSON.stringify(prefs);
    const prefsChanged = now !== savedPrefs.current;
    if (newName) {
      const { error } = await authClient.updateUser({ name: newName });
      if (error) return false;
      savedName.current = newName;
    }
    const onboarding: State = { completed: completed.current, step: to, skippedAt: null, done: doneRef.current, ...patch };
    const { error } = await sb
      .from("profiles")
      .upsert({ onboarding, ...(prefsChanged ? { preferences: prefs } : {}) }, { onConflict: "user_id" });
    if (error) return false;
    if (prefsChanged) {
      savedPrefs.current = now;
      writePrefs(prefs);
    }
    if (patch.completed) completed.current = true;
    return true;
  }

  async function go(to: number) {
    setErr("");
    setBusy(true);
    const ok = await save(to, to >= OB.done ? { completed: true } : {});
    setBusy(false);
    if (!ok) return setErr("Couldn’t save that. Check your connection and try again.");
    router.push(stepPath(to));
  }

  const next = () => void go(Math.min(step + 1, OB.done));
  const back = () => {
    setErr("");
    const to = Math.max(step - 1, OB.welcome);
    router.push(stepPath(to));
    void save(to);
  };

  /** "Finish later": leave now, ask again in a few days. */
  async function later() {
    await save(step, { skippedAt: new Date().toISOString() });
    router.push(homePath());
  }

  const finish = () => router.push(homePath());

  // Once setup is finished it is closed: every address but the final gift screen sends the person to their dashboard.
  const leave = state.completed && step !== OB.done;
  useEffect(() => {
    if (leave) router.replace(homePath());
  }, [leave, router]);

  const first = display.trim().split(" ")[0] || "there";
  const ctx: Ctx = { first, display, setDisplay, prefs, setPrefs, done, mark, next, back, busy, err, setErr };
  const group = RAIL.findIndex((g) => g.steps.includes(step));
  const inFlow = group >= 0;

  if (leave) return null;

  return (
    <div className="flex min-h-dvh bg-page text-fg">
      {inFlow && (
        <nav aria-label="Setup progress" className="sticky top-0 hidden h-dvh w-[340px] shrink-0 flex-col border-r bg-side px-4 py-7 lg:flex">
          <div className="mb-8 flex items-center gap-2 px-3">
            <BrandMark size={26} />
            <span className="font-brand text-[22px] tracking-[-0.02em]">Naazhi</span>
          </div>
          <ol className="m-0 grid list-none gap-1 p-0">
            {RAIL.map((g, i) => {
              const state = i < group ? "done" : i === group ? "now" : "todo";
              return (
                <li key={g.id} aria-current={state === "now" ? "step" : undefined} className={cn("flex gap-3.5 rounded-r3 px-3 py-3", state === "now" && "bg-hover")}>
                  <i
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-pill border text-[13px] font-medium not-italic",
                      state === "done" ? "border-fg bg-fill-dark text-on-dark" : "bg-raised text-ink-2",
                    )}
                  >
                    {state === "done" ? <FA icon={faCheck} className="text-[11px]" /> : i + 1}
                  </i>
                  <span className="min-w-0">
                    <b className={cn("block text-[15.5px] font-medium", state === "todo" ? "text-fg-muted" : "text-fg")}>{g.title}</b>
                    <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-subtle">{g.hint}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-6 pt-5 lg:px-8">
          {inFlow ? (
            <div className="min-w-0 flex-1 lg:hidden">
              <p className="m-0 text-[13px] text-fg-subtle">
                Step {group + 1} of {RAIL.length}
              </p>
              <div className="mt-1.5 h-1 w-full max-w-[220px] overflow-hidden rounded-pill bg-hover" aria-hidden>
                <div className="h-full rounded-pill bg-fill-dark transition-[width]" style={{ width: `${((group + 1) / RAIL.length) * 100}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <BrandMark size={26} />
              <span className="font-brand text-[22px] tracking-[-0.02em]">Naazhi</span>
            </div>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {step < OB.done && (
              <button type="button" className="cursor-pointer rounded-ctl px-2 py-1 text-[14px] text-fg-muted hover:text-fg" onClick={() => void later()}>
                Finish later
              </button>
            )}
            <span aria-hidden className="grid size-10 place-items-center rounded-pill border bg-raised text-[14px] font-medium text-ink-2">
              {first.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        <div className="flex flex-1">
          <main key={step} className="min-w-0 flex-1">
            {step === OB.welcome && <Welcome ctx={ctx} />}
            {step === OB.start && <Start ctx={ctx} />}
            {step === OB.about && <About ctx={ctx} />}
            {step === OB.prefs && <PrefsScreen ctx={ctx} />}
            {step === OB.connect && <Accounts ctx={ctx} />}
            {step === OB.access && <AccessScreen ctx={ctx} />}
            {step === OB.see && <Ask ctx={ctx} mode="see" />}
            {step === OB.task && <Ask ctx={ctx} mode="task" />}
            {step === OB.tour && <Tour ctx={ctx} />}
            {step === OB.apps && <Apps ctx={ctx} />}
            {step === OB.import && <ImportScreen ctx={ctx} />}
            {step === OB.plan && <PlanScreen ctx={ctx} />}
            {step === OB.done && (
              <div className="mx-auto grid w-full max-w-[460px] justify-items-center gap-5 px-6 py-10 text-center">
                <Title>A little gift for you, {first}.</Title>
                <GiftCard name={display.trim() || "Welcome"} />
                <Lead className="mt-0">You’re all set. Your card is ready: tilt it around, it catches the light.</Lead>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <button className="btn btn-secondary" onClick={() => void saveGiftCard(display.trim() || "Welcome")}>
                    <FA icon={faDownload} /> Download card
                  </button>
                  <button className="btn btn-secondary" onClick={() => void shareGiftCard(display.trim() || "Welcome")}>
                    <FA icon={faShareNodes} /> Share
                  </button>
                  <button className="btn btn-primary" onClick={finish} autoFocus>
                    Open my dashboard <FA icon={faArrowRight} />
                  </button>
                </div>
                <p className="m-0 text-[13.5px] text-fg-subtle">Everything you chose here can be changed later in Settings.</p>
              </div>
            )}
          </main>

          {inFlow && (
            <aside aria-label="What’s done so far" className="hidden w-[300px] shrink-0 px-6 pt-24 pb-10 xl:block">
              <h2 className="m-0 text-[14px] font-semibold text-fg-muted">What’s done so far</h2>
              <ul className="m-0 mt-3 grid list-none p-0">
                {MILESTONES.map((m) => {
                  const yes = done.includes(m);
                  return (
                    <li key={m} className="flex items-center gap-3 border-b py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <b className={cn("block text-[14.5px] font-medium", yes ? "text-fg" : "text-fg-muted")}>{DONE_LABEL[m]}</b>
                        <span className="block text-[13px] text-fg-subtle">{yes ? "Done" : "Up next"}</span>
                      </div>
                      <span
                        aria-hidden
                        className={cn("grid size-5 shrink-0 place-items-center rounded-pill border text-[11px]", yes ? "border-fg bg-fill-dark text-on-dark" : "border-dashed text-transparent")}
                      >
                        <FA icon={faCheck} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
