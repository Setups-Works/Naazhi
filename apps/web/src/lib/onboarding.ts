/** Onboarding progress lives in the account's profile (`profiles.onboarding`), next to preferences. */

/** Every screen of the first-run flow, in order. The numbers are stored, so only ever append. */
export const OB = {
  welcome: 0,
  start: 1,
  about: 2,
  prefs: 3,
  connect: 4,
  access: 5,
  see: 6,
  task: 7,
  tour: 8,
  apps: 9,
  import: 10,
  plan: 11,
  done: 12,
} as const;
export const ONBOARDING_STEPS = 13;

/** The address of each screen: /onboarding/welcome, /onboarding/about… (the names are the keys of OB, so they cannot drift). */
export const SLUGS = Object.keys(OB) as (keyof typeof OB)[];
export const stepPath = (step: number) => `/onboarding/${SLUGS[step] ?? SLUGS[0]}`;
/** The screen an address names, or null when it names none. */
export const stepOfSlug = (slug: string | undefined): number | null => (slug && slug in OB ? OB[slug as keyof typeof OB] : null);

/** The things Naazhi (and you) have got done during setup; they fill the "What's done" list. */
export const MILESTONES = ["profile", "access", "ask", "task", "journal", "note", "import"] as const;
export type Milestone = (typeof MILESTONES)[number];

export type Onboarding = {
  completed: boolean;
  /** Last screen the user reached, so we resume where they left off. */
  step: number;
  /** ISO time the user chose "Finish later"; we ask again after SNOOZE_DAYS. */
  skippedAt: string | null;
  /** Milestones reached so far. */
  done: Milestone[];
};

const SNOOZE_DAYS = 3;

export function cleanOnboarding(v: unknown): Onboarding {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Onboarding>;
  const step = typeof o.step === "number" && o.step >= 0 && o.step < ONBOARDING_STEPS ? Math.floor(o.step) : 0;
  return {
    completed: o.completed === true,
    step,
    skippedAt: typeof o.skippedAt === "string" && !Number.isNaN(Date.parse(o.skippedAt)) ? o.skippedAt : null,
    done: Array.isArray(o.done) ? MILESTONES.filter((m) => o.done!.includes(m)) : [],
  };
}

/** New users and existing users who never finished see it; "Finish later" hides it for a few days. */
export function shouldShowOnboarding(o: Onboarding, now = Date.now()) {
  if (o.completed) return false;
  if (!o.skippedAt) return true;
  return now - Date.parse(o.skippedAt) > SNOOZE_DAYS * 86_400_000;
}

/** The seven groups in the left list. A group can span several screens. */
export const RAIL: { id: string; title: string; hint: string; steps: number[] }[] = [
  { id: "about", title: "Get set", hint: "Tell Naazhi your name, role and how you want it to sound.", steps: [OB.about, OB.prefs] },
  { id: "connect", title: "Connect your accounts", hint: "Mail and calendar, and what Naazhi may use on this device.", steps: [OB.connect, OB.access] },
  { id: "see", title: "See Naazhi in action", hint: "Ask it something and watch it answer in your voice.", steps: [OB.see] },
  { id: "task", title: "Give Naazhi a task", hint: "Say what you need done and confirm what it drafts.", steps: [OB.task] },
  { id: "tour", title: "See how it all fits together", hint: "Take a quick tour of your journal, notes and to-do.", steps: [OB.tour] },
  { id: "apps", title: "Connect more apps", hint: "The other tools Naazhi will work with.", steps: [OB.apps] },
  { id: "import", title: "Bring your notes", hint: "Import your Obsidian vault. Notion is coming.", steps: [OB.import] },
];
