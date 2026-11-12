"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { appHref, isSplit } from "../../lib/hosts";

/**
 * "Continue the conversation" on a shared chat: copies it into the visitor's own chats and opens it there. Someone who isn't signed
 * in is sent to sign in first and brought back to this page.
 */
export default function ContinueChat({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/v1/shared-chats/${token}/continue`, { method: "POST", credentials: "same-origin" });
      if (res.status === 401) {
        window.location.href = appHref(`/login?next=${encodeURIComponent(`/share/${token}`)}`);
        return;
      }
      const j = (await res.json().catch(() => ({}))) as { data?: { id?: string }; error?: string };
      if (!res.ok || !j.data?.id) throw new Error(j.error ?? "Couldn’t copy this chat. Try again.");
      window.location.href = appHref(isSplit() ? `/chat?c=${j.data.id}` : `/dashboard/chat?c=${j.data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t copy this chat. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid justify-items-center gap-2">
      <button type="button" className="btn btn-primary" onClick={() => void go()} disabled={busy}>
        {busy ? "Copying…" : "Continue the conversation"} <FA icon={faArrowRight} />
      </button>
      <p className="m-0 max-w-[420px] text-center text-[13px] text-fg-subtle">Copies this chat into your own chats so you can carry on. The original stays as it is.</p>
      {err && (
        <p className="form-err" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
