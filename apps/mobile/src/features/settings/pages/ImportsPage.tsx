import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Palette, themedStyles } from "@/constants/theme";
import { useNoteActions, useNotes } from "@/features/notes/queries";
import { Empty, Group, Row } from "./ui";
import { usePrefsSave } from "../usePrefsSave";

const titleOf = (name: string) => name.replace(/\.(md|markdown|txt)$/i, "").trim() || "Untitled";

/** Imports: bring Markdown or text files in as notes (duplicates by title are skipped), and see the last few imports. */
export function ImportsPage() {
  const { prefs, change } = usePrefsSave();
  const notes = useNotes();
  const { create } = useNoteActions();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["text/markdown", "text/plain", "text/*"], multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    setBusy(true);
    setMsg(null);
    try {
      const have = new Set((notes.data ?? []).map((n) => n.title.trim().toLowerCase()));
      let added = 0;
      let skipped = 0;
      for (const f of res.assets) {
        const title = titleOf(f.name);
        if (have.has(title.toLowerCase())) {
          skipped++;
          continue;
        }
        const body = await (await fetch(f.uri)).text();
        await create.mutateAsync({ title, body, category: prefs.defaultCategory });
        have.add(title.toLowerCase());
        added++;
      }
      setMsg({ kind: "success", text: `Imported ${added} ${added === 1 ? "note" : "notes"}${skipped ? `, skipped ${skipped} that already exist` : ""}.` });
      if (added > 0) await change({ recentImports: [{ at: new Date().toISOString(), source: "Files", notes: added, folders: 0 }, ...prefs.recentImports].slice(0, 10) });
    } catch {
      setMsg({ kind: "error", text: "Couldn’t finish that import. Some notes may already have been added." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}
      <Group title="Import notes">
        <View style={styles.pad}>
          <AppText variant="small" color={Palette.fgSubtle}>
            Pick Markdown or text files. Each becomes a note named after the file, in your default category.
          </AppText>
          <Button title={busy ? "Importing…" : "Choose files"} icon="file-import" loading={busy} onPress={() => void pick()} />
        </View>
      </Group>
      <Group title="Recent imports">
        {prefs.recentImports.length === 0 ? (
          <Empty>Nothing imported yet.</Empty>
        ) : (
          prefs.recentImports.map((r, i) => (
            <Row key={r.at} title={`${r.source} · ${r.notes} ${r.notes === 1 ? "note" : "notes"}`} description={new Date(r.at).toLocaleString()} last={i === prefs.recentImports.length - 1} />
          ))
        )}
      </Group>
      <AppText variant="small" color={Palette.fgFaint}>
        Back up everything from Your data. Importing from other services needs connections, which aren’t available yet.
      </AppText>
    </>
  );
}

const styles = themedStyles(() => ({ pad: { gap: 12, padding: 14 } }));
