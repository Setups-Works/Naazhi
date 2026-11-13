"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Prefs } from "../../lib/prefs";

export type SettingsAccount = {
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  hasPassword: boolean;
  providers: string[];
  createdAt: string;
  avatarUrl: string | null;
  lastSignIn: string | null;
  /** International form (+919876543210), or empty when none was given. */
  phone: string;
};

type Data = { account: SettingsAccount; prefs: Prefs };
const Ctx = createContext<Data | null>(null);

/** The signed-in person's account and preferences, read once by the dashboard layout, so the Settings page (a normal route) needs no second fetch. */
export function SettingsDataProvider({ value, children }: { value: Data; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettingsData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettingsData must be used inside the dashboard layout.");
  return v;
}
