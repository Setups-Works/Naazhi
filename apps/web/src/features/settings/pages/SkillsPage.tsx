"use client";
import { useEffect, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faInfo, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useConfirm } from "../../../components/ui/Confirm";
import { SettingsEmpty, SettingsRow, SettingsSection } from "../ui";
import { useSkills } from "../useSkills";

const TEMPLATES = [
  { label: "Meeting follow-up", name: "follow-up", description: "Turn meeting notes into a follow-up email", prompt: "Write a short, friendly follow-up email from these meeting notes. List decisions and who does what by when:\n\n" },
  { label: "Weekly review", name: "weekly-review", description: "Review the week and plan the next", prompt: "Help me review my week: what got done, what slipped, and the three things to focus on next week. Ask me questions one at a time." },
  { label: "Summarize", name: "summarize", description: "Summarize pasted text", prompt: "Summarize the following in five bullet points, then give one sentence on what to do next:\n\n" },
];

const DEMO = { name: "follow-up", description: "Draft follow-ups from meeting notes" };

/** True when the person asked for less motion (the device setting, or Naazhi's own "Reduce motion"). */
function wantsStill() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
}

/**
 * The "In chat" preview. With a name typed it shows that skill as the / menu would; with an empty form it plays a short loop
 * (type "/follow-up", the Commands menu rises, hold, start over) so it is clear what a skill does. Still when motion is reduced.
 */
function ChatPreview({ name, description }: { name: string; description: string }) {
  const live = name.length > 0;
  const [typed, setTyped] = useState(DEMO.name.length);
  const [still, setStill] = useState(true);
  useEffect(() => setStill(wantsStill()), []);
  useEffect(() => {
    if (live || still) {
      setTyped(DEMO.name.length);
      return;
    }
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    // Types one letter at a time, holds on the finished command, then clears and begins again.
    const tick = () => {
      if (n <= DEMO.name.length) {
        setTyped(n++);
        timer = setTimeout(tick, n === 1 ? 500 : 110);
      } else {
        timer = setTimeout(() => {
          n = 0;
          setTyped(0);
          timer = setTimeout(tick, 700);
        }, 2200);
      }
    };
    setTyped(0);
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [live, still]);

  const shownName = live ? name : DEMO.name.slice(0, typed);
  const shownDesc = live ? description : DEMO.description;
  const menuOpen = live || typed > 0;
  return (
    <aside className="flex min-h-[200px] flex-col justify-between gap-6 bg-side p-4 max-[800px]:min-h-0" aria-label="Preview in chat">
      <p className="m-0 text-[13.5px] text-ink-2">In chat</p>
      <div className="grid gap-2" aria-hidden>
        <div
          className={`rounded-r2 border bg-raised p-1.5 shadow-pop transition-[opacity,transform] duration-200 ease-(--ease) motion-reduce:transition-none ${menuOpen ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}
        >
          <p className="m-0 px-2 py-1 text-[12.5px] text-ink-3">Commands</p>
          <p className="m-0 flex items-baseline gap-2 rounded-r1 bg-hover px-2 py-1.5 text-[13px]">
            <span className="font-mono font-medium">/{shownName}</span>
            <span className="min-w-0 truncate text-ink-3">{shownDesc.trim()}</span>
          </p>
        </div>
        <div className="rounded-r2 border bg-raised px-3 py-2 font-mono text-[13px]">
          {menuOpen ? `/${shownName}` : <span className="text-ink-4">Type / for skills</span>}
          <i className="ml-px inline-block h-3.5 w-px translate-y-0.5 bg-ink motion-safe:animate-pulse" />
        </div>
      </div>
    </aside>
  );
}

export default function SkillsPage() {
  const { skills, loading, refresh, sb } = useSkills();
  const { ask, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cleanName = name.trim().toLowerCase().replace(/^\//, "");
  const valid = /^[a-z0-9][a-z0-9-]{0,29}$/.test(cleanName) && prompt.trim().length > 0;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await sb.from("skills").insert({ name: cleanName, description: description.trim(), prompt: prompt.trim() });
    setBusy(false);
    if (err) return setError(/duplicate|unique/i.test(err.message) ? "You already have a skill with that name." : "Couldn’t save that skill.");
    setName("");
    setDescription("");
    setPrompt("");
    refresh();
  }
  async function remove(id: string, skillName: string) {
    const yes = await ask({ title: "Delete this skill?", body: <>“/{skillName}” will be deleted.</>, confirmLabel: "Delete skill", danger: true });
    if (!yes) return;
    await sb.from("skills").delete().eq("id", id);
    refresh();
  }

  return (
    <>
      {dialog}
      <SettingsSection title="Your skills" note={skills.length ? `${skills.length}` : undefined}>
        {!loading && skills.length === 0 ? (
          <SettingsEmpty title="No skills yet">Add one below, then type / in a chat to use it.</SettingsEmpty>
        ) : (
          skills.map((s) => (
            <SettingsRow key={s.id} title={<span className="font-mono">/{s.name}</span>} description={s.description || s.prompt.slice(0, 90)}>
              <Button variant="ghost" size="icon" aria-label={`Delete /${s.name}`} onClick={() => remove(s.id, s.name)}>
                <FA icon={faTrash} />
              </Button>
            </SettingsRow>
          ))
        )}
      </SettingsSection>

      <SettingsSection title="New skill">
        <div className="grid grid-cols-[minmax(0,1fr)_260px] max-[800px]:grid-cols-1">
          <form onSubmit={add} className="grid content-start gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-ink-3">Start from</span>
              {TEMPLATES.map((t) => (
                <Button
                  key={t.name}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-pill font-normal"
                  onClick={() => {
                    setName(t.name);
                    setDescription(t.description);
                    setPrompt(t.prompt);
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
              <div className="grid gap-1.5">
                <Label htmlFor="skill-name" className="gap-1.5">
                  Name
                  <span title="Lowercase letters, numbers and dashes, up to 30." className="inline-grid size-4 cursor-help place-items-center rounded-full border text-[11px] text-ink-3" aria-label="Lowercase letters, numbers and dashes, up to 30.">
                    <FA icon={faInfo} />
                  </span>
                </Label>
                <Input id="skill-name" className="font-mono" value={name} onChange={(e) => setName(e.target.value)} placeholder="/weekly-review" maxLength={31} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="skill-desc">Description</Label>
                <Input id="skill-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A note for the / menu" maxLength={120} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="skill-prompt">Prompt</Label>
              <Textarea id="skill-prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Tell Naazhi what to do when you run this skill…" maxLength={4000} />
            </div>
            {error && (
              <p className="form-err" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button disabled={!valid || busy}>Add skill</Button>
            </div>
          </form>
          <ChatPreview name={cleanName} description={description} />
        </div>
      </SettingsSection>
    </>
  );
}
