import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faHeart, faHeartPulse } from "@fortawesome/free-solid-svg-icons";
import type { HealthDay } from "@untitled/types";

export type HealthSource = {
  /** Matches `health_daily.source`. */
  id: Exclude<HealthDay["source"], "unknown">;
  name: string;
  description: string;
  icon: IconDefinition;
  tone: string;
  /** What to do on the phone, in order. */
  steps: string[];
};

/** Where health data can come from. Both are read on the phone (Apple and Google keep it there); the web only shows what was synced. */
export const HEALTH_SOURCES: HealthSource[] = [
  {
    id: "health_connect",
    name: "Google Health Connect",
    description: "Android phones. Steps, sleep, activity, resting heart rate and weight.",
    icon: faHeartPulse,
    tone: "text-blue-fg",
    steps: [
      "Open the Naazhi app on your Android phone and sign in with this account.",
      "Open the Health tab and choose Connect Health Connect.",
      "Allow Naazhi to read steps, distance, calories, heart rate and sleep.",
    ],
  },
  {
    id: "healthkit",
    name: "Apple Health",
    description: "iPhone. Steps, sleep, workouts, heart rate, weight, mood and more.",
    icon: faHeart,
    tone: "text-critical",
    steps: [
      "Open the Naazhi app on your iPhone and sign in with this account.",
      "Open the Health tab and choose Connect Apple Health.",
      "Allow Naazhi to read steps, distance, calories, heart rate and sleep.",
    ],
  },
];
