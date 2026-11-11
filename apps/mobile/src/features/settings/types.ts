import type { LogoName } from "@/components/ui/AppLogo";
import type { IconName } from "@/components/ui/Icon";

export { NOTE_CATEGORIES } from "@/lib/preferences";
export type { SettingsPrefs } from "@/lib/preferences";

export type AccountSettings = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username: string | null;
  displayUsername: string | null;
  providers: string[];
  hasPassword: boolean;
  createdAt: string;
  lastSignIn: string | null;
  preferences: unknown;
};

export type SettingsSection =
  | "profile" | "billing" | "invites"
  | "google" | "microsoft" | "zoho" | "health" | "integrations" | "imports"
  | "youdo" | "skills" | "keys"
  | "prefs" | "appearance" | "notifications" | "notes" | "todo" | "email" | "labels"
  | "security" | "data" | "danger"
  | "apps" | "legal" | "about";

export type SettingsSectionInfo = { key: SettingsSection; title: string; desc: string; icon: IconName; soon?: boolean; logo?: LogoName };

/** The same groups, labels and descriptions as the web Settings home (`GROUPS` in SettingsPage.tsx). Notifications and About are the phone's own. */
export const SETTINGS_GROUPS: { label: string; sections: SettingsSectionInfo[] }[] = [
  {
    label: "Account",
    sections: [
      { key: "profile", title: "My account", desc: "Your name, photo, email and username.", icon: "user" },
      { key: "billing", title: "Plans & billing", desc: "Your plan, payments and AI access.", icon: "wallet" },
      { key: "invites", title: "Invites & earnings", desc: "Invite friends and see what you’ve earned.", icon: "user-plus", soon: true },
    ],
  },
  {
    label: "Connections",
    sections: [
      { key: "google", title: "Google", desc: "Gmail, Calendar and Drive accounts.", icon: "envelope", soon: true, logo: "google" },
      { key: "microsoft", title: "Microsoft", desc: "Outlook mail, calendar, OneDrive and To Do.", icon: "briefcase", soon: true, logo: "microsoft" },
      { key: "zoho", title: "Zoho", desc: "Zoho Mail, Calendar, WorkDrive and more.", icon: "layer-group", logo: "zoho" },
      { key: "health", title: "Health", desc: "Steps, sleep and heart data from your phone.", icon: "heart-pulse" },
      { key: "integrations", title: "Other apps", desc: "Slack, GitHub, Notion and other connected apps.", icon: "plug", soon: true },
      { key: "imports", title: "Imports & backup", desc: "Bring in notes and tasks, and back up your data.", icon: "file-import" },
    ],
  },
  {
    label: "Naazhi",
    sections: [
      { key: "youdo", title: "YouDo", desc: "Automations that run on a schedule or when an email arrives.", icon: "bolt", soon: true },
      { key: "skills", title: "Skills", desc: "Slash commands and saved prompts.", icon: "terminal" },
      { key: "keys", title: "API keys", desc: "Use your own AI provider keys.", icon: "key", logo: "ai-openai" },
    ],
  },
  {
    label: "Preferences",
    sections: [
      { key: "prefs", title: "General", desc: "Time format, week start and defaults for new items.", icon: "sliders" },
      { key: "appearance", title: "Appearance", desc: "Color scheme, accent, density and motion.", icon: "palette" },
      { key: "notifications", title: "Notifications", desc: "Reminders and what you hear about.", icon: "bell" },
      { key: "notes", title: "Notes", desc: "How new notes open.", icon: "note-sticky" },
      { key: "todo", title: "To-do", desc: "What happens to finished and cancelled tasks.", icon: "list-check" },
      { key: "email", title: "Email", desc: "Undo send, signatures and footers.", icon: "envelope-open" },
      { key: "labels", title: "Excluded labels", desc: "Mail labels Naazhi should ignore.", icon: "tag" },
    ],
  },
  {
    label: "Privacy & security",
    sections: [
      { key: "security", title: "Security", desc: "Password and signed-in devices.", icon: "shield-halved" },
      { key: "data", title: "Your data", desc: "Download a copy of everything you’ve written.", icon: "database" },
      { key: "danger", title: "Delete account", desc: "Permanently delete your account and data.", icon: "trash" },
    ],
  },
  {
    label: "About",
    sections: [
      { key: "apps", title: "Get apps & extension", desc: "Naazhi on your phone and the web.", icon: "mobile-screen" },
      { key: "about", title: "About & updates", desc: "Version and app updates.", icon: "circle-info" },
      { key: "legal", title: "Legal", desc: "Terms, privacy and refund policy.", icon: "file-lines" },
    ],
  },
];

export const SETTINGS_SECTIONS: SettingsSectionInfo[] = SETTINGS_GROUPS.flatMap((g) => g.sections);
