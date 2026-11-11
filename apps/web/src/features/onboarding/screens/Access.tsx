"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faBell, faCircleCheck, faLocationDot, faMicrophone } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Actions, Card, Lead, Soon, Tile, Title, type Ctx } from "../ui";

type Access = "checking" | "off" | "on" | "blocked" | "unsupported";

/** The microphone's state in this browser, and a way to ask for it. Asking opens the browser's own prompt; we keep no audio. */
function useMicrophone(): [Access, () => Promise<void>] {
  const [state, setState] = useState<Access>("checking");
  const read = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    try {
      const p = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setState(p.state === "granted" ? "on" : p.state === "denied" ? "blocked" : "off");
      p.onchange = () => setState(p.state === "granted" ? "on" : p.state === "denied" ? "blocked" : "off");
    } catch {
      setState("off"); // this browser can't tell us until we ask
    }
  }, []);
  useEffect(() => {
    void read();
  }, [read]);
  const ask = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // the permission is all we wanted
      setState("on");
    } catch {
      await read();
      setState((s) => (s === "on" ? s : "blocked"));
    }
  }, [read]);
  return [state, ask];
}

function useNotifications(): [Access, () => Promise<boolean>] {
  const [state, setState] = useState<Access>("checking");
  useEffect(() => {
    if (typeof Notification === "undefined") return setState("unsupported");
    setState(Notification.permission === "granted" ? "on" : Notification.permission === "denied" ? "blocked" : "off");
  }, []);
  const ask = useCallback(async () => {
    if (typeof Notification === "undefined") return false;
    const r = await Notification.requestPermission();
    setState(r === "granted" ? "on" : r === "denied" ? "blocked" : "off");
    return r === "granted";
  }, []);
  return [state, ask];
}

function Row({
  icon,
  title,
  text,
  state,
  action,
  blocked,
  soon,
}: {
  icon: IconDefinition;
  title: string;
  text: string;
  state?: Access;
  action?: { label: string; run: () => void };
  blocked?: string;
  soon?: boolean;
}) {
  return (
    <Card className={`px-5 py-3 ${state === "blocked" ? "border-critical" : ""}`}>
      <div className="flex items-start gap-4">
        <Tile>
          <FA icon={icon} />
        </Tile>
        <div className="min-w-0 flex-1">
          <b className="block text-[16.5px] font-semibold text-fg">{title}</b>
          <p className="m-0 mt-1 text-[14.5px] leading-relaxed text-fg-muted">{text}</p>
          {state === "blocked" && <p className="m-0 mt-2 text-[14px] leading-relaxed text-critical">{blocked}</p>}
        </div>
        <div className="shrink-0 pt-0.5">
          {soon ? (
            <Soon />
          ) : state === "on" ? (
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-green-fg">
              <FA icon={faCircleCheck} /> On
            </span>
          ) : state === "blocked" ? (
            <span className="text-[14px] font-medium text-critical">Blocked</span>
          ) : state === "unsupported" ? (
            <span className="text-[13.5px] text-fg-subtle">Not supported here</span>
          ) : (
            action && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={action.run} disabled={state === "checking"}>
                {action.label}
              </button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

/** What this browser may do for Naazhi. Microphone and notifications are real browser permissions; location is not used yet. */
export function AccessScreen({ ctx }: { ctx: Ctx }) {
  const [mic, askMic] = useMicrophone();
  const [note, askNote] = useNotifications();
  const briefOn = note === "on" && ctx.prefs.webBrief;
  const go = () => {
    ctx.mark("access");
    ctx.next();
  };
  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-8">
      <Title>3 things Naazhi can use.</Title>
      <Lead>Nothing is on until you allow it, and you can change it any time.</Lead>

      <div className="mt-6 grid gap-2.5">
        <Row
          icon={faLocationDot}
          title="Location"
          text="For things like “what’s the weather tomorrow?”. Naazhi doesn’t ask for your location today."
          soon
        />
        <Row
          icon={faMicrophone}
          title="Microphone"
          text="Talk instead of type. Use your voice for notes, journal entries and tasks."
          state={mic}
          action={{ label: "Allow", run: () => void askMic() }}
          blocked="Your browser is blocking this. Open the padlock in the address bar to turn it back on."
        />
        <Row
          icon={faBell}
          title="Notifications"
          text="Get a short morning brief of what’s due today. It shows while Naazhi is open in a tab."
          state={note === "on" && !briefOn ? "off" : note}
          action={{
            label: note === "on" ? "Turn on" : "Allow",
            run: () =>
              void (async () => {
                const ok = note === "on" ? true : await askNote();
                if (ok) ctx.setPrefs({ ...ctx.prefs, webBrief: true });
              })(),
          }}
          blocked="Your browser is blocking this. Open the padlock in the address bar to turn it back on."
        />
        {briefOn && (
          <button type="button" className="justify-self-start text-[14px] text-fg-subtle underline underline-offset-2 hover:text-fg" onClick={() => ctx.setPrefs({ ...ctx.prefs, webBrief: false })}>
            Turn the morning brief off
          </button>
        )}
      </div>

      <Actions ctx={ctx} onContinue={go} note="Recording a conversation? Make sure everyone is comfortable with it. You’re responsible for the recording." />
    </div>
  );
}
