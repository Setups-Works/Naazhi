"use client";
import { noteShareUrl, setNoteShared } from "@untitled/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faCopy, faLink, faLinkSlash, faXmark } from "@fortawesome/free-solid-svg-icons";
import Modal from "../ui/Modal";
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
  const [copied, setCopied] = useState(false);
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
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Couldn’t copy. Select the link and copy it by hand.");
    }
  }

  return (
    <Modal label="Share note" onClose={onClose} size="md">
      <div className="td">
        <div className="td-head">
          <h2 className="h3">Share note</h2>
          <button type="button" className="ne-btn" aria-label="Close" onClick={onClose}>
            <FA icon={faXmark} />
          </button>
        </div>
        <section className="flex flex-col gap-2.5">
          {token ? (
            <>
              <p className="m-0 text-[13.5px] text-ink-3">Anyone with this link can read “{note.title.trim() || "Untitled"}”. It shows no name, and you can switch it off at any time.</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="tf-pill min-w-[200px] flex-1">
                  <FA icon={faLink} aria-hidden />
                  <input className="w-full cursor-text" readOnly value={url} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} />
                </label>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => void copy()}>
                  <FA icon={copied ? faCheck : faCopy} aria-hidden /> {copied ? "Copied" : "Copy link"}
                </button>
              </div>
              <button type="button" className="btn btn-secondary btn-sm w-fit" disabled={busy} onClick={() => void toggle(false)}>
                <FA icon={faLinkSlash} aria-hidden /> Stop sharing
              </button>
            </>
          ) : (
            <>
              <p className="m-0 text-[13.5px] text-ink-3">Make a secret link to this one note. Nothing else in your notes is shared.</p>
              <button type="button" className="btn btn-secondary btn-sm w-fit" disabled={busy} onClick={() => void toggle(true)}>
                <FA icon={faLink} aria-hidden /> Create link
              </button>
            </>
          )}
          {err && (
            <p className="form-err" role="alert">
              {err}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
