"use client";
import { useMemo, useState } from "react";
import { trackedLink } from "@untitled/logic/acquisition";

const SOURCES = ["instagram", "x", "reddit", "youtube", "whatsapp", "linkedin", "facebook", "telegram", "github", "newsletter", "qr", "other"] as const;
const MEDIUMS = ["social", "video", "email", "referral", "qr", "ads", "post"] as const;

const field =
  "w-full rounded-ctl bg-hover px-3 py-2 text-[14px] text-fg outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--data)]";

/** Builds a link that tells you where a sign-up came from. For Google Play the tags travel in the `referrer` parameter and the app reads them after install. */
export default function TrackedLinkBuilder({ siteUrl, playUrl }: { siteUrl: string; playUrl: string }) {
  const [kind, setKind] = useState<"web" | "play">("web");
  const [source, setSource] = useState<string>("instagram");
  const [custom, setCustom] = useState("");
  const [medium, setMedium] = useState<string>("social");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);
  const name = source === "other" ? custom : source;
  const link = useMemo(
    () => (name.trim() ? trackedLink(kind === "web" ? siteUrl : playUrl, { source: name, medium, campaign }, kind) : ""),
    [kind, name, medium, campaign, siteUrl, playUrl],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the link is selectable below */
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex rounded-ctl bg-hover p-[3px] sm:w-fit" role="group" aria-label="Where the link goes">
        {([["web", "Website"], ["play", "Google Play"]] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-tab px-3 py-1 text-[13px] font-medium ${kind === k ? "bg-raised text-fg shadow-e1" : "text-fg-muted hover:text-fg"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-[12.5px] text-fg-subtle">
          Where you will share it
          <select className={field} value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12.5px] text-fg-subtle">
          Type
          <select className={field} value={medium} onChange={(e) => setMedium(e.target.value)}>
            {MEDIUMS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12.5px] text-fg-subtle">
          Campaign (optional)
          <input className={field} value={campaign} maxLength={80} onChange={(e) => setCampaign(e.target.value)} placeholder="launch-week" />
        </label>
      </div>
      {source === "other" && (
        <label className="grid gap-1 text-[12.5px] text-fg-subtle sm:max-w-xs">
          Name it
          <input className={field} value={custom} maxLength={60} onChange={(e) => setCustom(e.target.value)} placeholder="newsletter-nov" />
        </label>
      )}
      <div className="grid gap-2">
        <textarea readOnly rows={3} aria-label="Your tracked link" value={link} placeholder="Choose where you will share it" className={`${field} resize-none font-mono text-[12.5px]`} onFocus={(e) => e.currentTarget.select()} />
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-primary btn-sm" disabled={!link} onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
          <span className="text-[12.5px] text-fg-faint">
            {kind === "play" ? "Sign-ups from the app are counted after the first sign-in on a build that includes this tracking." : "Sign-ups are counted the first time the person signs in."}
          </span>
        </div>
      </div>
    </div>
  );
}
