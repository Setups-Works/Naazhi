"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth/client";
import { PrimaryButton, SecondaryButton } from "./ui";

type Started = { code: string; secret: string };
type Polled = { status: "pending" } | { status: "expired" } | { status: "approved"; token: string };

/**
 * The desktop app's side of signing in with Google. Google refuses sign-in inside the app's window, so the app shows a six-character
 * code, opens the browser, and waits there. The person signs in, checks the same code and presses Authorize; this panel then trades the
 * single-use token for the app's own session. Server side: services/desktopSignIn.
 */
export default function DesktopCodeSignIn({ next, onCancel }: { next: string; onCancel: () => void }) {
  const [started, setStarted] = useState<Started | null>(null);
  const [state, setState] = useState<"starting" | "waiting" | "expired" | "failed">("starting");
  const live = useRef(true);

  const start = useCallback(async () => {
    setState("starting");
    try {
      const res = await fetch("/api/v1/desktop-auth", { method: "POST" });
      const body = (await res.json()) as { data?: Started };
      if (!res.ok || !body.data) throw new Error();
      if (!live.current) return;
      setStarted({ code: body.data.code, secret: body.data.secret });
      setState("waiting");
      void window.naazhiDesktop?.signInWithBrowser(body.data.code);
    } catch {
      if (live.current) setState("failed");
    }
  }, []);

  useEffect(() => {
    live.current = true;
    void start();
    return () => {
      live.current = false;
    };
  }, [start]);

  useEffect(() => {
    if (state !== "waiting" || !started) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/v1/desktop-auth/poll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(started),
        });
        const body = (await res.json()) as { data?: Polled };
        if (stop || !body.data) return;
        if (body.data.status === "expired") return setState("expired");
        if (body.data.status === "approved") {
          stop = true;
          const { error } = await authClient.oneTimeToken.verify({ token: body.data.token });
          if (error) return setState("failed");
          window.location.assign(next);
        }
      } catch {
        /* a dropped request: the next tick tries again */
      }
    };
    const id = window.setInterval(tick, 2000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [state, started, next]);

  return (
    <div className="flex flex-col gap-5 text-center">
      <header className="flex flex-col gap-2">
        <p className="m-0 text-[12px] font-semibold tracking-[0.1em] text-green-fg uppercase">Continue with Google</p>
        <h1 className="m-0 font-serif text-[clamp(28px,4vw,34px)] leading-[1.08] font-semibold tracking-[-0.03em]">Approve in your browser</h1>
      </header>

      {state === "waiting" && started && (
        <>
          <p className="m-0 text-[15px] leading-relaxed text-fg-muted">
            We opened your browser. Sign in there, check that it shows this code, then press <strong className="font-medium text-fg">Authorize</strong>. You’ll
            come straight back here.
          </p>
          <p aria-label={`Your code is ${started.code.split("").join(" ")}`} className="m-0 rounded-r3 bg-surface py-5 font-mono text-[40px] font-semibold tracking-[0.3em] text-fg ring-1 ring-line-strong">
            {started.code}
          </p>
          <p className="m-0 text-[13.5px] text-fg-subtle" role="status">
            Waiting for you to authorize…
          </p>
          <SecondaryButton type="button" onClick={() => void window.naazhiDesktop?.signInWithBrowser(started.code)}>
            Open the browser again
          </SecondaryButton>
        </>
      )}
      {state === "starting" && <p className="m-0 text-[15px] text-fg-muted">Getting your code…</p>}
      {(state === "expired" || state === "failed") && (
        <>
          <p role="alert" className="at-clay tint m-0 rounded-r2 px-4 py-3 text-[13.5px] leading-snug">
            {state === "expired" ? "That code expired." : "Couldn’t sign you in."} Try again for a new code.
          </p>
          <PrimaryButton type="button" onClick={() => void start()}>
            Get a new code
          </PrimaryButton>
        </>
      )}
      <button type="button" onClick={onCancel} className="m-0 cursor-pointer border-0 bg-transparent text-[14px] text-fg-muted underline-offset-4 hover:underline">
        Back to log in
      </button>
    </div>
  );
}
