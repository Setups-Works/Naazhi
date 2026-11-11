"use client";
import { useState } from "react";
import type { ApiClient } from "../../../lib/api/client";
import type { Chat } from "../../../lib/workspace";
import ShareLinkDialog from "../ShareLinkDialog";

/** Turn a public, read-only link for a chat on or off. */
export default function ShareDialog({
  chat,
  sb,
  onClose,
  onChange,
}: {
  chat: Chat;
  sb: ApiClient;
  onClose: () => void;
  onChange: (token: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const link = chat.share_token ? `${location.origin}/share/${chat.share_token}` : "";

  async function setShared(on: boolean) {
    setBusy(true);
    setErr("");
    const token = on ? crypto.randomUUID().replaceAll("-", "") : null;
    const { error } = await sb
      .from("chats")
      .update({ share_token: token, shared_at: on ? new Date().toISOString() : null })
      .eq("id", chat.id);
    setBusy(false);
    if (error) return setErr("Couldn’t change sharing. Please try again.");
    onChange(token);
  }

  return (
    <ShareLinkDialog
      title="Share chat"
      noun="this chat"
      url={chat.share_token ? link : null}
      busy={busy}
      err={err}
      detail="They can read every message and attachment, including ones you add later, but not change it. Your name and email aren’t shown."
      onToggle={(on) => void setShared(on)}
      onClose={onClose}
    />
  );
}
