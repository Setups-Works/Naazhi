"use client";
import { useState } from "react";
import { DESKTOP } from "@untitled/types";
import { authClient } from "../../lib/auth/client";
import { PrimaryButton } from "./ui";

/**
 * Makes a one-time token for the signed-in session and opens the desktop app with it (`naazhi://auth?token=…`). The app trades the token
 * for its own session. A button rather than an automatic redirect, because browsers only open an app after a click.
 */
export default function DesktopSignIn({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [err, setErr] = useState("");

  async function open() {
    setErr("");
    setBusy(true);
    try {
      const { data, error } = await authClient.oneTimeToken.generate();
      if (error || !data?.token) throw new Error(error?.message);
      window.location.assign(`${DESKTOP.scheme}://auth?token=${encodeURIComponent(data.token)}`);
      setOpened(true);
    } catch {
      setErr("Couldn’t start that. Reload the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-4 text-center">
      <h1 className="m-0 font-serif text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-fg">Open Naazhi on your computer</h1>
      <p className="m-0 text-[15px] text-fg-muted">
        You’re signed in as <strong className="font-medium text-fg">{email}</strong>. Press the button to finish signing in on the desktop app.
      </p>
      <PrimaryButton type="button" onClick={open} disabled={busy}>
        {busy ? "Opening…" : "Open Naazhi"}
      </PrimaryButton>
      {opened && <p className="m-0 text-[14px] text-fg-subtle">If nothing happened, make sure the Naazhi desktop app is installed, then press the button again.</p>}
      {err && (
        <p role="alert" className="at-clay tint m-0 rounded-r2 px-4 py-3 text-[13.5px] leading-snug">
          {err}
        </p>
      )}
    </div>
  );
}
