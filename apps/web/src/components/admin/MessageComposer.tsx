"use client";
import { useState, useTransition } from "react";
import { sendMessageToUsers } from "../../app/admin/actions";
import { useConfirm } from "../ui/Confirm";
import RecipientPicker, { type Person } from "./RecipientPicker";

/** Write a message that lands in people's inbox in the app and, when push is set up, on their phone. */
export default function MessageComposer({ push, people }: { push: boolean; people: Person[] }) {
  const { ask, dialog } = useConfirm();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Ask outside the transition: state set inside one isn't shown until it ends.
    const yes = await ask({
      title: picked.size ? `Send this to ${picked.size} ${picked.size === 1 ? "person" : "people"}?` : `Send this to all ${people.length} users?`,
      body: "It can’t be taken back once sent.",
      confirmLabel: "Send",
    });
    if (!yes) return;
    start(async () => {
      const r = await sendMessageToUsers(title, body, [...picked]);
      setNote({ ok: r.ok, text: r.ok ? (r.message ?? "Sent.") : r.error });
      if (r.ok) {
        setTitle("");
        setBody("");
      }
    });
  }

  return (
    <>
      {dialog}
      <form className="dash-card adm-compose" onSubmit={submit}>
        <h4>New message</h4>
        <p className="meta">
          It appears in the Notifications inbox in the app.{" "}
          {push ? "People with the app also get a push notification." : "Push notifications aren’t set up yet (add FCM_SERVICE_ACCOUNT), so it only shows in the inbox."}
        </p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title" aria-label="Title" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} placeholder="Message" aria-label="Message" />
        <RecipientPicker people={people} picked={picked} onChange={setPicked} />
        <div className="adm-compose-row">
          <small className="meta">{body.length}/1000</small>
          <button className="btn btn-primary btn-sm" disabled={pending || !title.trim() || !body.trim()}>
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
        {note && (
          <p className={note.ok ? "meta" : "form-err"} role={note.ok ? "status" : "alert"}>
            {note.text}
          </p>
        )}
      </form>
    </>
  );
}
