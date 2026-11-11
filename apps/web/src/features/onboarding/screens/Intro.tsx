"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faBookOpen, faComments, faListCheck, faMicrophone, faPenToSquare, faHandPointer, faShieldHalved, faRotateLeft, faSliders } from "@fortawesome/free-solid-svg-icons";
import { Lead, Title, type Ctx } from "../ui";

/** A thin ink drawing of a notebook with a ticked line, in the paper-and-ink style (currentColor, no fills). */
function Sketch() {
  return (
    <svg viewBox="0 0 220 220" role="img" aria-label="A notebook with a ticked line" className="w-full max-w-[220px] text-fg-muted" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="44" y="34" width="132" height="156" rx="16" />
      <path d="M70 26v16M110 26v16M150 26v16" />
      <path d="M68 78h40M68 104h30M68 130h44" />
      <rect x="116" y="96" width="42" height="26" rx="13" />
      <path d="m127 109 5 5 10-11" />
      <path d="M68 156h54" />
    </svg>
  );
}

const FEATURES: [typeof faBookOpen, string][] = [
  [faPenToSquare, "Notes that link together"],
  [faListCheck, "To-dos that repeat"],
  [faBookOpen, "A journal for your days"],
  [faComments, "Chat that drafts, you confirm"],
  [faMicrophone, "Voice for notes and tasks"],
];

/** The first screen: what Naazhi is, said once, plainly. */
export function Welcome({ ctx }: { ctx: Ctx }) {
  return (
    <div className="mx-auto grid w-full max-w-[1040px] items-center gap-10 px-6 py-8 lg:grid-cols-[1fr_240px]">
      <div>
        <Title className="text-[clamp(36px,6vw,64px)]">
          Welcome to Naazhi.
          <br />
          <span className="text-fg-subtle">Everything you keep, in one place.</span>
        </Title>
        <Lead className="mt-7">Notes, tasks, a journal and chat, with an AI you can swap or switch off.</Lead>
        <Lead className="mt-4">Most assistants stop at answers. Naazhi drafts the note, the to-do and the journal line, and you decide what gets saved.</Lead>
        <button type="button" className="btn btn-primary mt-8" onClick={ctx.next} autoFocus>
          Get started <FA icon={faArrowRight} />
        </button>
        <ul className="m-0 mt-10 flex max-w-[640px] list-none flex-wrap gap-x-6 gap-y-3 p-0 text-[14.5px] text-fg-muted">
          {FEATURES.map(([icon, label]) => (
            <li key={label} className="flex items-center gap-2">
              <FA icon={icon} className="text-[13px]" /> {label}
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden justify-self-center lg:block">
        <Sketch />
      </div>
    </div>
  );
}

const CONTROL: [typeof faShieldHalved, string][] = [
  [faShieldHalved, "Naazhi can draft things for you, but you decide what gets saved."],
  [faRotateLeft, "Need to stop? Choose Finish later and pick up where you left off."],
  [faSliders, "Everything you choose here can be changed later in Settings."],
];

/** The second screen: what the next few minutes are, and who is in charge. */
export function Start({ ctx }: { ctx: Ctx }) {
  return (
    <div className="mx-auto grid w-full max-w-[640px] justify-items-center px-6 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-pill bg-hover text-[22px] text-ink-2">
        <FA icon={faHandPointer} />
      </span>
      <Title className="mt-6">A few minutes to make Naazhi yours.</Title>
      <Lead className="mx-auto">Tell Naazhi a little about yourself, try it on something real, and bring your notes across. We’ll take it one step at a time.</Lead>
      <div className="mt-10 w-full text-left">
        <b className="text-[15px] font-semibold text-fg">You’re always in control.</b>
        <ul className="m-0 mt-4 grid list-none gap-4 p-0">
          {CONTROL.map(([icon, text]) => (
            <li key={text} className="flex items-start gap-3.5 text-[15.5px] leading-snug text-fg-muted">
              <FA icon={icon} className="mt-0.5 text-[15px] text-fg-subtle" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 flex items-center gap-3">
        <button type="button" className="btn btn-secondary" onClick={ctx.back}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={ctx.next} autoFocus>
          I’m ready <FA icon={faArrowRight} />
        </button>
      </div>
    </div>
  );
}
