"use client";
import { useState, useTransition } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faEye, faEyeSlash, faTrash } from "@fortawesome/free-solid-svg-icons";
import { createAnnouncement, deleteAnnouncement, toggleAnnouncement } from "../../app/admin/actions";
import { useConfirm } from "../ui/Confirm";

export type Announcement = { id: string; message: string; tone: string; active: boolean; created_at: string; placement: string; link_label: string | null; link_href: string | null };
const PLACES: [string, string][] = [
  ["site", "Landing page"],
  ["app", "Dashboard"],
  ["both", "Both"],
];
const PLACE_LABEL: Record<string, string> = { app: "Dashboard", site: "Landing page", both: "Landing page and dashboard" };
const TONES: [string, string][] = [
  ["info", "Info"],
  ["success", "Good news"],
  ["warning", "Heads-up"],
];

export default function Announcements({ items }: { items: Announcement[] }) {
  const { ask, dialog } = useConfirm();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");
  const [place, setPlace] = useState("site");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr("");
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Something went wrong.");
    });

  return (
    <>
      {dialog}
      <form
        className="dash-card adm-compose"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await createAnnouncement(message, tone, place, linkLabel, linkHref);
            if (r.ok) {
              setMessage("");
              setLinkLabel("");
              setLinkHref("");
            }
            return r;
          });
        }}
      >
        <h4>New announcement</h4>
        <p className="meta">Choose where it shows: the landing page (a bar at the top of the public website; the newest is shown), the dashboard (a banner for signed-in people), or both. People can close it.</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="e.g. Scheduled maintenance tonight at 11 pm."
          aria-label="Announcement message"
        />
        <div className="adm-compose-row">
          <div className="st-seg" role="radiogroup" aria-label="Where to show it">
            {PLACES.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={place === k} data-on={place === k} onClick={() => setPlace(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="adm-compose-row">
          <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} maxLength={40} placeholder="Button label (optional), e.g. See payments" aria-label="Link label" />
          <input value={linkHref} onChange={(e) => setLinkHref(e.target.value)} maxLength={300} placeholder="Link, e.g. /payments or https://…" aria-label="Link address" />
        </div>
        <div className="adm-compose-row">
          <div className="st-seg" role="radiogroup" aria-label="Tone">
            {TONES.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={tone === k} data-on={tone === k} onClick={() => setTone(k)}>
                {l}
              </button>
            ))}
          </div>
          <small className="meta">{message.length}/500</small>
          <button className="btn btn-primary btn-sm" disabled={pending || !message.trim()}>
            Publish
          </button>
        </div>
        {err && (
          <p className="form-err" role="alert">
            {err}
          </p>
        )}
      </form>

      <div className="adm-ann">
        {items.length === 0 && <p className="meta">No announcements yet.</p>}
        {items.map((a) => (
          <article key={a.id} className="ann" data-tone={a.tone} data-active={a.active}>
            <div>
              <p>{a.message}</p>
              {/* The server formats in its own time zone and the browser in the admin's, so the text differs by design. */}
              <small suppressHydrationWarning>
                {new Date(a.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                {a.active ? `Showing: ${PLACE_LABEL[a.placement] ?? "Dashboard"}` : "Hidden"}{a.link_href ? ` · Link: ${a.link_label}` : ""}
              </small>
            </div>
            <span>
              <button
                className="icon-btn"
                disabled={pending}
                aria-label={a.active ? "Hide announcement" : "Show announcement"}
                title={a.active ? "Hide" : "Show"}
                onClick={() => run(() => toggleAnnouncement(a.id, !a.active))}
              >
                <FA icon={a.active ? faEyeSlash : faEye} />
              </button>
              <button
                className="icon-btn"
                disabled={pending}
                aria-label="Delete announcement"
                title="Delete"
                onClick={async () => {
                  // Ask outside the transition: state set inside one isn't shown until it ends, and it would be waiting for this answer.
                  const yes = await ask({
                    title: "Delete this announcement?",
                    body: "It will disappear for everyone.",
                    confirmLabel: "Delete",
                    danger: true,
                  });
                  if (yes) run(() => deleteAnnouncement(a.id));
                }}
              >
                <FA icon={faTrash} />
              </button>
            </span>
          </article>
        ))}
      </div>
    </>
  );
}
