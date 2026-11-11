import { useState } from "react";

import { dbQuery } from "@/features/chat/db";
import { applyLook } from "@/constants/theme";
import type { SettingsPrefs } from "@/lib/preferences";
import { useAppState } from "@/providers/AppState";

/** The person's preferences for a Settings page: the current values and a way to change some (saved to the account, like the web). */
export function usePrefsSave() {
  const { user, preferences, setPreferences } = useAppState();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function change(patch: Partial<SettingsPrefs>) {
    if (!user) return;
    const before = preferences;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setSaving(true);
    setError("");
    try {
      const rows = await dbQuery<{ user_id: string }[]>({
        table: "profiles",
        op: "update",
        values: { preferences: next },
        filters: [{ column: "user_id", op: "eq", value: user.id }],
        returning: "user_id",
      });
      if (!rows?.length) throw new Error("not saved");
      if (patch.scheme !== undefined || patch.accent !== undefined) applyLook({ scheme: next.scheme, accent: next.accent });
    } catch {
      setPreferences(before);
      setError("Couldn’t save that preference.");
    } finally {
      setSaving(false);
    }
  }
  return { prefs: preferences, change, saving, error };
}
