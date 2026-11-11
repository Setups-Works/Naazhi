"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api/client";
import { writePrefs, type Prefs } from "../../lib/prefs";

/** The person's preferences for a Settings page: the current values, a way to change some, and whether the last save worked. */
export function usePrefsSave(initial: Prefs) {
  const sb = useMemo(api, []);
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState("");

  async function change(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    writePrefs(next);
    const { error: e } = await sb.from("profiles").upsert({ preferences: next }, { onConflict: "user_id" });
    setError(e ? "Couldn’t save that preference." : "");
    if (!e) router.refresh();
  }
  return { prefs, change, error };
}
