"use client";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import { faBookOpen, faCheck, faListCheck, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { api } from "../../../lib/api/client";
import { qk } from "../../../lib/query/keys";
import { isoDate } from "../../../lib/dates";
import type { Milestone } from "../../../lib/onboarding";
import { Actions, Card, Lead, Tile, Title, fieldClass, type Ctx } from "../ui";

type Kind = "journal" | "note" | "task";

const PLACES: { kind: Kind; icon: IconDefinition; title: string; text: string; ph: string; ask: string }[] = [
  { kind: "journal", icon: faBookOpen, title: "Journal", text: "Write, speak, edit and reflect on your days.", ph: "Today I’m feeling…", ask: "Write one line about today" },
  { kind: "note", icon: faPenToSquare, title: "Notes", text: "Write ideas down, find them later and keep them organised.", ph: "e.g. Book ideas", ask: "Capture a note" },
  { kind: "task", icon: faListCheck, title: "To-do", text: "Capture tasks, check them off, and let Naazhi draft the rest.", ph: "e.g. Reply to Sam", ask: "Add a task for today" },
];

/** The three places Naazhi works from. Each one is real: what you add here is saved and stays yours. */
export function Tour({ ctx }: { ctx: Ctx }) {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<Kind, string>>({ journal: "", note: "", task: "" });
  const [made, setMade] = useState<Record<Kind, boolean>>({ journal: false, note: false, task: false });
  const [busy, setBusy] = useState<Kind | null>(null);

  async function add(kind: Kind) {
    const text = draft[kind].trim();
    if (!text) return;
    setBusy(kind);
    ctx.setErr("");
    const today = isoDate();
    const { error } =
      kind === "task"
        ? await sb.from("tasks").insert({ title: text.slice(0, 300), due_date: today })
        : kind === "journal"
          ? await sb.from("journal_entries").insert({ entry_date: today, body: text })
          : await sb.from("notes").insert({ title: text.slice(0, 200), body: "", category: ctx.prefs.defaultCategory });
    setBusy(null);
    if (error) return ctx.setErr("Couldn’t save that. Make sure the database migrations have been applied.");
    setMade((m) => ({ ...m, [kind]: true }));
    ctx.mark(kind as Milestone);
    const key = { task: qk.tasks.all, journal: qk.journal.all, note: qk.notes.all }[kind];
    void qc.invalidateQueries({ queryKey: key });
  }

  const count = Object.values(made).filter(Boolean).length;
  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-8">
      <Title>3 places Naazhi works from.</Title>
      <Lead>Try each one now. What you add during the tour is real, stays yours, and you can delete it whenever you like. ({count} of 3 done)</Lead>

      <ul className="m-0 mt-8 grid list-none gap-3 p-0">
        {PLACES.map((p) => (
          <li key={p.kind}>
            <Card className="px-5 py-4">
              <div className="flex items-start gap-4">
                <Tile className={made[p.kind] ? "bg-green-bg text-green-fg" : ""}>
                  <FA icon={made[p.kind] ? faCheck : p.icon} />
                </Tile>
                <div className="min-w-0 flex-1">
                  <b className="block text-[16.5px] font-semibold text-fg">{p.title}</b>
                  <p className="m-0 mt-0.5 text-[14.5px] text-fg-muted">{made[p.kind] ? "Added. Nice." : p.text}</p>
                  {!made[p.kind] && (
                    <form
                      className="mt-3 flex gap-2.5 max-[520px]:flex-col"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void add(p.kind);
                      }}
                    >
                      <input
                        className={`${fieldClass} h-11 text-[15px]`}
                        value={draft[p.kind]}
                        onChange={(e) => setDraft({ ...draft, [p.kind]: e.target.value })}
                        placeholder={p.ph}
                        maxLength={p.kind === "journal" ? 2000 : 200}
                        aria-label={p.ask}
                      />
                      <button className="btn btn-secondary" disabled={!draft[p.kind].trim() || busy === p.kind}>
                        {busy === p.kind ? "Adding…" : "Add"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Actions ctx={ctx} hideSkip label={count === 0 ? "Skip this step" : "Continue"} />
    </div>
  );
}
