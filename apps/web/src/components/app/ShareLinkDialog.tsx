"use client";
import { useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faCopy, faEarthAmericas, faLink, faLock, faXmark } from "@fortawesome/free-solid-svg-icons";
import Modal from "../ui/Modal";

type Props = {
  /** Dialog title, e.g. "Share note". */
  title: string;
  /** The link, or null while the item is private. */
  url: string | null;
  busy: boolean;
  err: string;
  /** What the link opens, e.g. "this note"; used in the private-state text. */
  noun: string;
  /** Extra line under the link while it is on (what the link shows). */
  detail: string;
  onToggle: (on: boolean) => void;
  onClose: () => void;
  /** Extra sections under the link (the journal's picture export). */
  children?: ReactNode;
};

/**
 * The one share dialog every page uses (notes, journal, chat): a state row, the link with Copy, and Stop sharing. A link is always
 * an explicit step; nothing is public until someone presses Create link.
 */
export default function ShareLinkDialog({ title, url, busy, err, noun, detail, onToggle, onClose, children }: Props) {
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState("");
  const on = !!url;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyErr("");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyErr("Couldn’t copy. Select the link and copy it by hand.");
    }
  }

  return (
    <Modal label={title} onClose={onClose} size="md">
      <div className="td">
        <div className="td-head">
          <h2 className="h3">{title}</h2>
          <button type="button" className="ne-btn" aria-label="Close" onClick={onClose}>
            <FA icon={faXmark} />
          </button>
        </div>

        <div className="sh-state" data-on={on}>
          <span>
            <FA icon={on ? faEarthAmericas : faLock} aria-hidden />
          </span>
          <div>
            <b>{on ? "Anyone with the link can view" : `Only you can see ${noun}`}</b>
            <small>{on ? detail : `Create a link to share ${noun}. Nothing else is shared.`}</small>
          </div>
        </div>

        {on ? (
          <div className="sh-link">
            <label className="sh-field">
              <FA icon={faLink} aria-hidden />
              <input readOnly value={url} aria-label="Public link" onFocus={(e) => e.currentTarget.select()} />
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void copy()}>
              <FA icon={copied ? faCheck : faCopy} aria-hidden /> {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        ) : null}

        {children}

        {(err || copyErr) && (
          <p className="form-err" role="alert">
            {err || copyErr}
          </p>
        )}

        <div className="tf-foot sh-foot">
          {on ? (
            <button type="button" className="btn btn-secondary btn-sm td-del" disabled={busy} onClick={() => onToggle(false)}>
              Stop sharing
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onToggle(true)}>
              {busy ? "Creating…" : "Create link"}
            </button>
          )}
          <span className="tf-acts">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Done
            </button>
          </span>
        </div>
      </div>
    </Modal>
  );
}
