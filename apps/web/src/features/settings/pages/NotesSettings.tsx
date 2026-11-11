"use client";
import { Switch } from "@/components/ui/switch";
import type { Prefs } from "../../../lib/prefs";
import { SettingsRow, SettingsSection } from "../ui";
import { usePrefsSave } from "../usePrefsSave";

export default function NotesSettings({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change, error } = usePrefsSave(initial);
  return (
    <>
      <SettingsSection title="Editor">
        <SettingsRow title="Open new notes in full screen" description="Instead of beside your notes.">
          <Switch checked={prefs.notesFullScreen} onCheckedChange={(v) => change({ notesFullScreen: v })} aria-label="Open new notes in full screen" />
        </SettingsRow>
      </SettingsSection>
      {error && <p className="form-err" role="alert">{error}</p>}
    </>
  );
}
