"use client";
import { noteShareUrl, setNoteShared } from "@untitled/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ShareLinkDialog from "./ShareLinkDialog";
import { http, restMessage } from "../../lib/api/rest";
import { qk } from "../../lib/query/keys";

/**
 * Share one note: a secret link anyone can open (read-only, no name), switched off any time. The link is the only way a note leaves
 * your private notes, so turning it on is always an explicit step. While a note is in the Trash its link stops working; restore it and the same link works again.
 */
export default function ShareNoteDialog({ note, onClose }: { note: { id: string; title: string; share_token: string | null }; onClose: () => void }) {
  const qc = useQueryClient();
  const [token, setToken] = useState(note.share_token);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const url = token ? noteShareUrl(window.location.origin, token) : "";

  async function toggle(on: boolean) {
    setBusy(true);
    setErr("");
    try {
      setToken(await setNoteShared(http, note.id, on));
      await qc.invalidateQueries({ queryKey: qk.notes.all });
    } catch (e) {
      setErr(restMessage(e, "Couldn’t change sharing."));
    }
    setBusy(false);
  }
  return (
    <ShareLinkDialog
      title="Share note"
      noun="this note"
      url={token ? url : null}
      busy={busy}
      err={err}
      detail={`It shows “${note.title.trim() || "Untitled"}” without your name, and you can switch it off at any time.`}
      onToggle={(on) => void toggle(on)}
      onClose={onClose}
    />
  );
}
