"use client";
import { CATEGORIES } from "../../../lib/notes";
import { WRITE_TONES, type WriteTone } from "../../../lib/prefs";
import { Actions, Choice, Lead, Title, fieldClass, pill, type Ctx } from "../ui";

const ROLES = ["Founder", "Engineer", "Designer", "Writer", "Student", "Teacher", "Consultant"];
const TONE_LABEL: Record<(typeof WRITE_TONES)[number], string> = { direct: "Short and direct", warm: "Warm", formal: "Formal" };

/** Name (needed), what you do and how Naazhi should write for you (both optional). The assistant reads the last two. */
export function About({ ctx }: { ctx: Ctx }) {
  const { prefs, setPrefs, display, setDisplay } = ctx;
  const go = () => {
    ctx.mark("profile");
    ctx.next();
  };
  return (
    <div className="mx-auto w-full max-w-[620px] px-6 py-8">
      <Title>Help Naazhi get to know you.</Title>
      <Lead>Just three quick things. It’ll take less than a minute.</Lead>

      <div className="mt-8 grid gap-7">
        <label className="grid gap-2">
          <span className="text-[14.5px] font-medium text-fg">What do people call you?</span>
          <input
            className={fieldClass}
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            maxLength={80}
            placeholder="Your name"
            autoComplete="given-name"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && display.trim() && go()}
          />
        </label>

        <div className="grid gap-2">
          <label htmlFor="ob-role" className="text-[14.5px] font-medium text-fg">
            What do you do? <span className="font-normal text-fg-subtle">(optional)</span>
          </label>
          <input
            id="ob-role"
            className={fieldClass}
            value={prefs.role}
            onChange={(e) => setPrefs({ ...prefs, role: e.target.value.slice(0, 80) })}
            maxLength={80}
            placeholder="It helps Naazhi tell what matters to you"
          />
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button key={r} type="button" className={pill(prefs.role === r)} onClick={() => setPrefs({ ...prefs, role: prefs.role === r ? "" : r })}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div role="radiogroup" aria-label="How should Naazhi write for you?" className="grid gap-2">
          <span className="text-[14.5px] font-medium text-fg">
            How should Naazhi write for you? <span className="font-normal text-fg-subtle">(optional)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {WRITE_TONES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={prefs.writeTone === t}
                className={pill(prefs.writeTone === t)}
                onClick={() => setPrefs({ ...prefs, writeTone: (prefs.writeTone === t ? "" : t) as WriteTone })}
              >
                {TONE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Actions ctx={ctx} onContinue={go} disabled={!display.trim()} hideSkip hideBack note="Naazhi’s assistant uses these when it writes for you. Change them any time in Settings." />
    </div>
  );
}

/** The everyday choices that used to be the old second step: clock, week, density, where To-do opens, default note category. */
export function Prefs({ ctx }: { ctx: Ctx }) {
  const { prefs, setPrefs } = ctx;
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <Title>Make it yours, {ctx.first}.</Title>
      <Lead>Pick how things should look and behave. You can change any of this later in Settings.</Lead>
      <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <Choice label="Time format" value={prefs.timeFormat} onChange={(v) => setPrefs({ ...prefs, timeFormat: v })} options={[["12h", "12-hour"], ["24h", "24-hour"]]} />
        <Choice label="Week starts on" value={prefs.weekStart} onChange={(v) => setPrefs({ ...prefs, weekStart: v })} options={[["mon", "Monday"], ["sun", "Sunday"]]} />
        <Choice label="Layout density" value={prefs.density} onChange={(v) => setPrefs({ ...prefs, density: v })} options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} />
        <Choice label="Opens To-do on" value={prefs.todoView} onChange={(v) => setPrefs({ ...prefs, todoView: v })} options={[["today", "Today"], ["upcoming", "Upcoming"], ["inbox", "Inbox"]]} />
        <label className="grid content-start gap-2">
          <span className="text-[14px] font-medium text-fg">Default note category</span>
          <select className={`${fieldClass} max-w-[280px]`} value={prefs.defaultCategory} onChange={(e) => setPrefs({ ...prefs, defaultCategory: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-[15px] text-fg sm:col-span-2">
          <input type="checkbox" className="size-4 accent-[var(--accent-color)]" checked={prefs.reduceMotion} onChange={(e) => setPrefs({ ...prefs, reduceMotion: e.target.checked })} />
          Reduce motion
        </label>
      </div>
      <Actions ctx={ctx} hideSkip />
    </div>
  );
}
