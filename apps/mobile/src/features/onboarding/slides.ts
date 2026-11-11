import type { IconName } from "@/components/ui/Icon";

export type Feature = { key: string; icon: IconName; title: string; body: string };

/** What the app does, as the web sidebar lists it. Shown as one grid on the second onboarding step. */
export const FEATURES: Feature[] = [
  { key: "journal", icon: "book-open", title: "Journal", body: "Timestamped entries, private to you, shareable when you choose." },
  { key: "ai", icon: "comments", title: "Naazhi AI", body: "Ask about your notes, tasks and day. Confirm before it changes anything." },
  { key: "notes", icon: "note-sticky", title: "Notes", body: "Colour-coded notes with files and voice." },
  { key: "todo", icon: "list-check", title: "To-do", body: "Priorities, due dates and lists." },
  { key: "calendar", icon: "calendar-days", title: "Calendar", body: "Your days and events in one view." },
  { key: "health", icon: "heart-pulse", title: "Health", body: "Steps, sleep and more from your phone." },
  { key: "library", icon: "layer-group", title: "Library", body: "Every file you attached, together." },
  { key: "workspace", icon: "briefcase", title: "Workspace", body: "Feeds and shared spaces." },
];

export const PRIVACY_POINTS: { icon: IconName; text: string }[] = [
  { icon: "lock", text: "Journal entries are visible only to you." },
  { icon: "server", text: "Runs on your own self-hosted stack." },
  { icon: "robot", text: "AI is optional, swappable, and never acts without asking." },
];
