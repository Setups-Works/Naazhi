import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { TextField } from "@/components/ui/TextField";
import { Palette } from "@/constants/theme";
import { dbQuery } from "@/features/chat/db";
import { Empty, Group, Panel, Row } from "./ui";

type Skill = { id: string; name: string; description: string; prompt: string };
const KEY = ["skills"] as const;

/** Saved prompts you run in chat by typing /name (the web's Skills page; same `skills` table). */
export function SkillsPage() {
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const q = useQuery({ queryKey: KEY, queryFn: async () => (await dbQuery<Skill[]>({ table: "skills", op: "select", columns: "id,name,description,prompt", order: [{ column: "created_at", ascending: true }] })) ?? [] });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = name.trim().toLowerCase().replace(/^\//, "");
  const valid = /^[a-z0-9][a-z0-9-]{0,29}$/.test(clean) && prompt.trim().length > 0;
  const skills = q.data ?? [];

  async function add() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await dbQuery({ table: "skills", op: "insert", values: { name: clean, description: description.trim(), prompt: prompt.trim() }, returning: null });
      setName("");
      setDescription("");
      setPrompt("");
      await qc.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      setError(/duplicate|unique/i.test(e instanceof Error ? e.message : "") ? "You already have a skill with that name." : "Couldn’t save that skill.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(s: Skill) {
    if (!(await ask({ title: "Delete this skill?", body: `“/${s.name}” will be deleted.`, confirmLabel: "Delete skill", danger: true }))) return;
    await dbQuery({ table: "skills", op: "delete", filters: [{ column: "id", op: "eq", value: s.id }], returning: null }).catch(() => setError("Couldn’t delete that skill."));
    await qc.invalidateQueries({ queryKey: KEY });
  }

  return (
    <>
      {dialog}
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Group title="Your skills" note={skills.length ? String(skills.length) : undefined}>
        {!q.isPending && skills.length === 0 ? (
          <Empty>No skills yet. Add one below, then type / in chat to run it.</Empty>
        ) : (
          skills.map((s, i) => (
            <Row key={s.id} title={`/${s.name}`} description={s.description || s.prompt} last={i === skills.length - 1}>
              <Button title="Delete" kind="ghost" onPress={() => void remove(s)} />
            </Row>
          ))
        )}
      </Group>
      <Panel title="New skill">
        <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="none" placeholder="follow-up" maxLength={31} />
        <TextField label="Description" value={description} onChangeText={setDescription} placeholder="Draft a polite follow-up" maxLength={120} />
        <TextField label="Prompt" value={prompt} onChangeText={setPrompt} multiline minHeight={110} placeholder="What should Naazhi do when you run this?" />
        <Button title="Add skill" icon="plus" loading={busy} disabled={!valid} onPress={() => void add()} />
        <AppText variant="small" color={Palette.fgFaint}>
          Names use lowercase letters, numbers and dashes.
        </AppText>
      </Panel>
    </>
  );
}

