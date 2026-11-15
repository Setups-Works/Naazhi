"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { deleteCampaign, previewCampaign, saveCampaign, sendCampaign, sendTestCampaign } from "../../app/admin/campaigns/actions";
import type { Audience, Draft, Kind } from "../../server/repositories/campaigns.repository";
import { useConfirm } from "../ui/Confirm";
import HtmlEditor from "./HtmlEditor";
import RecipientPicker, { type Person } from "./RecipientPicker";

export type AttachmentInfo = { id: string; name: string; sizeBytes: number };
type Props = { id: string | null; initial: Draft; people: Person[]; audienceSize: number; attachments: AttachmentInfo[] };

const mb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Write, preview, test and send a campaign: a newsletter to everyone who hasn't unsubscribed, or a direct email to the people picked. */
export default function CampaignEditor({ id: initialId, initial, people, audienceSize, attachments: initialFiles }: Props) {
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const [id, setId] = useState(initialId);
  const [subject, setSubject] = useState(initial.subject);
  const [preheader, setPreheader] = useState(initial.preheader);
  const [html, setHtml] = useState(initial.html);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [audience, setAudience] = useState<Audience>(initial.audience);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial.picked));
  const [files, setFiles] = useState(initialFiles);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const draft = (): Draft => ({ subject, preheader, html, kind, audience: kind === "direct" ? "picked" : audience, picked: [...picked] });
  const say = (ok: boolean, text: string) => setNote({ ok, text });

  /** Saves the draft (creating it the first time) and returns its id, or null with the reason shown. */
  async function save(): Promise<string | null> {
    const r = await saveCampaign(id, draft());
    if (!r.ok) return say(false, r.error), null;
    setId(r.id);
    if (!id) router.replace(`/admin/campaigns/${r.id}`);
    return r.id;
  }

  const onSave = () =>
    start(async () => {
      const saved = await save();
      if (saved) say(true, "Draft saved.");
    });

  const onTest = () =>
    start(async () => {
      const r = await sendTestCampaign(id, draft());
      say(r.ok, r.ok ? r.message : r.error);
    });

  async function onSend() {
    const count = kind === "direct" || audience === "picked" ? picked.size : audienceSize;
    const yes = await ask({
      title: `Send this to ${count} ${count === 1 ? "person" : "people"}?`,
      body: kind === "newsletter" ? "It can’t be taken back once sent. People who unsubscribed are skipped." : "It can’t be taken back once sent. Direct emails ignore unsubscribes, so use them only for one-to-one or support mail.",
      confirmLabel: "Send",
    });
    if (!yes) return;
    start(async () => {
      const saved = await save();
      if (!saved) return;
      const r = await sendCampaign(saved);
      if (!r.ok) return say(false, r.error);
      router.push("/admin/campaigns");
    });
  }

  async function onFile(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const target = id ?? (await save());
      if (!target) return;
      for (const file of Array.from(list)) {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch(`/api/v1/admin/campaigns/${target}/attachments`, { method: "POST", body });
        const j = (await res.json().catch(() => null)) as { data?: AttachmentInfo; error?: string } | null;
        if (!res.ok || !j?.data) return say(false, j?.error ?? "Couldn’t add that file.");
        setFiles((f) => [...f, j.data!]);
      }
      say(true, "File added.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function dropFile(fileId: string) {
    if (!id) return;
    const res = await fetch(`/api/v1/admin/campaigns/${id}/attachments?file=${fileId}`, { method: "DELETE" });
    if (res.ok) setFiles((f) => f.filter((x) => x.id !== fileId));
    else say(false, "Couldn’t remove that file.");
  }

  async function onDelete() {
    if (!id) return router.push("/admin/campaigns");
    if (!(await ask({ title: "Delete this draft?", body: "The text and its files are removed.", confirmLabel: "Delete" }))) return;
    start(async () => {
      const r = await deleteCampaign(id);
      if (r.ok) router.push("/admin/campaigns");
      else say(false, r.error);
    });
  }

  const radio = (on: boolean) => cn("flex cursor-pointer flex-col gap-0.5 rounded-r2 border p-3 text-left", on ? "border-ink bg-hover" : "border-line hover:bg-hover");

  return (
    <>
      {dialog}
      <div className="dash-card adm-compose">
        <h4>{id ? "Edit campaign" : "New campaign"}</h4>

        <fieldset className="m-0 grid gap-2 border-0 p-0 sm:grid-cols-2">
          <legend className="mb-1 text-[13px] text-fg-muted">What kind of email is it?</legend>
          <label className={radio(kind === "newsletter")}>
            <input type="radio" name="kind" className="sr-only" checked={kind === "newsletter"} onChange={() => setKind("newsletter")} />
            <b className="text-[14.5px]">Newsletter</b>
            <small className="text-[12.5px] text-fg-muted">News and updates. Adds an Unsubscribe link and skips people who unsubscribed.</small>
          </label>
          <label className={radio(kind === "direct")}>
            <input type="radio" name="kind" className="sr-only" checked={kind === "direct"} onChange={() => { setKind("direct"); setAudience("picked"); }} />
            <b className="text-[14.5px]">Direct email</b>
            <small className="text-[12.5px] text-fg-muted">To specific people: support, an answer, a one-to-one note. Always delivered.</small>
          </label>
        </fieldset>

        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Subject" aria-label="Subject" />
        <input value={preheader} onChange={(e) => setPreheader(e.target.value)} maxLength={200} placeholder="Preview line (the grey text after the subject, optional)" aria-label="Preview line" />

        <HtmlEditor value={html} onChange={setHtml} preview={async (h) => { const r = await previewCampaign({ html: h, preheader, kind }); return r.ok ? r.html : null; }} />

        <div className="flex flex-col gap-2">
          <b className="text-[14px]">Files</b>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-pill border border-line bg-paper py-1 pr-1 pl-3 text-[13px]">
                {f.name} <span className="text-fg-subtle">{mb(f.sizeBytes)}</span>
                <button type="button" className="rounded-pill px-2 text-fg-muted hover:bg-hover" aria-label={`Remove ${f.name}`} onClick={() => void dropFile(f.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div>
            <input ref={input} type="file" multiple hidden onChange={(e) => void onFile(e.target.files)} aria-label="Attach files" />
            <button type="button" className="btn btn-sm" disabled={busy || files.length >= 5} onClick={() => input.current?.click()}>
              {busy ? "Adding…" : "Attach files"}
            </button>
            <small className="ml-3 text-[12.5px] text-fg-subtle">Up to 5 files, 10 MB each, 20 MB together.</small>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <b className="text-[14px]">Who gets it</b>
          {kind === "newsletter" && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={cn("rounded-pill px-3 py-1 text-[13px]", audience === "all" ? "bg-ink text-paper" : "border border-line")} onClick={() => setAudience("all")}>
                Everyone ({audienceSize})
              </button>
              <button type="button" className={cn("rounded-pill px-3 py-1 text-[13px]", audience === "picked" ? "bg-ink text-paper" : "border border-line")} onClick={() => setAudience("picked")}>
                People I pick
              </button>
            </div>
          )}
          {(kind === "direct" || audience === "picked") && (
            <RecipientPicker people={people} picked={picked} onChange={setPicked} emptyLabel="No one picked yet" />
          )}
          {kind === "newsletter" && audience === "all" && <p className="m-0 text-[13.5px] text-fg-muted">Every active user who hasn’t unsubscribed: {audienceSize} now.</p>}
        </div>

        <div className="adm-compose-row">
          <button type="button" className="btn btn-sm" disabled={pending} onClick={onDelete}>
            {id ? "Delete draft" : "Cancel"}
          </button>
          <span className="ml-auto flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm" disabled={pending || !subject.trim()} onClick={onTest}>
              Send test to me
            </button>
            <button type="button" className="btn btn-sm" disabled={pending || !subject.trim()} onClick={onSave}>
              Save draft
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={pending || !subject.trim() || !html.trim()} onClick={() => void onSend()}>
              {pending ? "Working…" : "Send…"}
            </button>
          </span>
        </div>
        {note && (
          <p className={note.ok ? "meta" : "form-err"} role={note.ok ? "status" : "alert"}>
            {note.text}
          </p>
        )}
      </div>
    </>
  );
}
