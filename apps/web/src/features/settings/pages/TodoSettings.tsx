"use client";
import { Switch } from "@/components/ui/switch";
import type { Prefs } from "../../../lib/prefs";
import { SettingsRow, SettingsSection } from "../ui";
import { usePrefsSave } from "../usePrefsSave";

export default function TodoSettings({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change, error } = usePrefsSave(initial);
  return (
    <>
      <SettingsSection title="Finished tasks">
        <SettingsRow title="Archive completed tasks" description="Tick a task and it moves to the archive. Find it under Filters → Archived.">
          <Switch checked={prefs.archiveCompleted} onCheckedChange={(v) => change({ archiveCompleted: v })} aria-label="Archive completed tasks" />
        </SettingsRow>
        <SettingsRow title="Archive cancelled tasks" description="Cancel a task and it moves to the archive.">
          <Switch checked={prefs.archiveCancelled} onCheckedChange={(v) => change({ archiveCancelled: v })} aria-label="Archive cancelled tasks" />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Repeating tasks">
        <SettingsRow title="Show every repeat" description="List all upcoming repeats of a task in Upcoming, not just the next one.">
          <Switch checked={prefs.showEveryRepeat} onCheckedChange={(v) => change({ showEveryRepeat: v })} aria-label="Show every repeat" />
        </SettingsRow>
      </SettingsSection>
      {error && <p className="form-err" role="alert">{error}</p>}
    </>
  );
}
