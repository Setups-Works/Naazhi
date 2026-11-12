import { dbQuery } from "@/features/chat/db";

/**
 * The first-run setup after sign-up. Progress is stored in the account (`profiles.onboarding`), the same record the web's
 * /onboarding flow writes (apps/web/src/lib/onboarding.ts), so someone can start on one and finish on the other.
 * The step numbers are the web's and are stored, so never renumber them. The phone skips the screens that only make sense on a
 * computer (mail and calendar connections, what it may use on this device, importing a vault).
 */
export const OB = { about: 2, prefs: 3, see: 6, task: 7, tour: 8, apps: 9, plan: 11, done: 12 } as const;

/** The screens the phone shows, in order. */
export const FLOW: number[] = [OB.about, OB.prefs, OB.see, OB.task, OB.tour, OB.apps, OB.plan, OB.done];

export const MILESTONES = ["profile", "access", "ask", "task", "journal", "note", "import"] as const;
export type Milestone = (typeof MILESTONES)[number];

export type SetupState = { completed: boolean; step: number; skippedAt: string | null; done: Milestone[] };

const SNOOZE_DAYS = 3;
const TOTAL_STEPS = 13;

export function cleanSetup(v: unknown): SetupState {
  const o = (v && typeof v === "object" ? v : {}) as Partial<SetupState>;
  const step = typeof o.step === "number" && o.step >= 0 && o.step < TOTAL_STEPS ? Math.floor(o.step) : 0;
  return {
    completed: o.completed === true,
    step,
    skippedAt: typeof o.skippedAt === "string" && !Number.isNaN(Date.parse(o.skippedAt)) ? o.skippedAt : null,
    done: Array.isArray(o.done) ? MILESTONES.filter((m) => o.done!.includes(m)) : [],
  };
}

/** New accounts and ones that never finished see it; "Finish later" hides it for a few days. */
export function setupNeeded(s: SetupState, now = Date.now()) {
  if (s.completed) return false;
  if (!s.skippedAt) return true;
  return now - Date.parse(s.skippedAt) > SNOOZE_DAYS * 86_400_000;
}

/** Where to resume: the first screen the phone shows at or after the one the web (or the phone) last reached. */
export const resumeAt = (step: number) => FLOW.find((s) => s >= step) ?? OB.done;

/** A failed read counts as finished, so a bad connection never traps someone in setup. */
export async function loadSetup(userId: string): Promise<SetupState> {
  try {
    const row = await dbQuery<{ onboarding: unknown } | null>({
      table: "profiles",
      op: "select",
      columns: "onboarding",
      filters: [{ column: "user_id", op: "eq", value: userId }],
      single: "maybe",
    });
    return cleanSetup(row?.onboarding);
  } catch {
    return { completed: true, step: 0, skippedAt: null, done: [] };
  }
}

export async function saveSetup(userId: string, state: SetupState): Promise<boolean> {
  try {
    const rows = await dbQuery<{ user_id: string }[]>({
      table: "profiles",
      op: "update",
      values: { onboarding: state },
      filters: [{ column: "user_id", op: "eq", value: userId }],
      returning: "user_id",
    });
    return !!rows?.length;
  } catch {
    return false;
  }
}
