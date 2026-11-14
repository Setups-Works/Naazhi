"use client";
import { useState } from "react";
import { PrimaryButton } from "./ui";

/** The browser half: shows the desktop app's code so the person can check it matches, and approves it on press. */
export default function DesktopAuthorize({ email, code }: { email: string; code: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "gone" | "failed">("idle");

  async function authorize() {
    setState("busy");
    try {
      const res = await fetch("/api/v1/desktop-auth/authorize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      setState(res.ok ? "done" : res.status === 410 ? "gone" : "failed");
    } catch {
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <div className="flex w-full max-w-[380px] flex-col gap-3 text-center">
        <h1 className="m-0 font-serif text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-fg">You’re authorized</h1>
        <p className="m-0 text-[15px] text-fg-muted">Go back to the Naazhi desktop app. It signs in by itself in a moment, and you can close this tab.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-4 text-center">
      <h1 className="m-0 font-serif text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-fg">Authorize the desktop app</h1>
      <p className="m-0 text-[15px] text-fg-muted">
        Check that this is the code shown in the Naazhi desktop app. Only authorize if you just started signing in there.
      </p>
      <p className="m-0 rounded-r3 bg-surface py-5 font-mono text-[40px] font-semibold tracking-[0.3em] text-fg ring-1 ring-line-strong">{code}</p>
      <p className="m-0 text-[14px] text-fg-subtle">
        It will sign in as <strong className="font-medium text-fg">{email}</strong>.
      </p>
      <PrimaryButton type="button" onClick={authorize} disabled={state === "busy"}>
        {state === "busy" ? "Authorizing…" : "Authorize"}
      </PrimaryButton>
      {(state === "gone" || state === "failed") && (
        <p role="alert" className="at-clay tint m-0 rounded-r2 px-4 py-3 text-[13.5px] leading-snug">
          {state === "gone" ? "That code expired. Go back to the desktop app and ask for a new one." : "Couldn’t authorize. Reload the page and try again."}
        </p>
      )}
    </div>
  );
}
