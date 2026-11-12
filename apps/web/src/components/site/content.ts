import {
  faBookOpen,
  faCalendarDays,
  faClockRotateLeft,
  faComments,
  faDesktop,
  faFileImport,
  faHeartPulse,
  faLayerGroup,
  faRss,
  faWallet,
  faEnvelope,
  faFileExport,
  faFingerprint,
  faKey,
  faPaperclip,
  faListCheck,
  faLock,
  faMagnifyingGlass,
  faMicrophone,
  faMobileScreen,
  faPlug,
  faPenToSquare,
  faRoute,
  faShareNodes,
  faShieldHalved,
  faTableColumns,
  faUserGroup,
  faUserLock,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { Status } from "./ui";
import type { Tone } from "../../lib/tones";

/**
 * Landing-page copy that makes factual claims about the product. Every `status` here must match docs/CURRENT_STATE.md —
 * "live" only for what ships today. When something ships, flip its status; don't reword the claim.
 */

/** `pts` are the short check-marked lines on a card (taken from what `d` already says); `shot` is an app screen under /public/mobile, shown at the top of the card. */
export type Capability = { icon: IconDefinition; t: string; d: string; tone: Tone; status: Status; pts: readonly string[]; shot?: string };

export const CAPABILITIES: Capability[] = [
  {
    icon: faPenToSquare,
    t: "Notes",
    d: "Rich notes with colours, slash commands, voice, attachments, version history, a Trash you can restore from, and an Atlas that maps how notes connect.",
    tone: "blue",
    status: "live",
    pts: [
      "Colours, slash commands, voice and attachments",
      "Version history and a Trash you can restore from",
      "An Atlas that maps how notes connect",
    ],
    shot: "/mobile/notes-2.png",
  },
  {
    icon: faListCheck,
    t: "Tasks",
    d: "Lists, priorities, repeats, and list, board or calendar views.",
    tone: "amber",
    status: "live",
    pts: ["Lists and priorities from urgent to low", "Repeats: daily, weekly or the 2nd Wednesday", "List, board or calendar views"],
    shot: "/mobile/todo-2.png",
  },
  {
    icon: faBookOpen,
    t: "Journal",
    d: "Many entries a day, private to you, with voice and attachments.",
    tone: "violet",
    status: "live",
    pts: ["Many entries a day", "Private to you", "Voice and attachments"],
    shot: "/mobile/journal-2.png",
  },
  {
    icon: faCalendarDays,
    t: "Calendar",
    d: "Month, week, day and agenda views with your tasks laid over them.",
    tone: "green",
    status: "live",
    pts: ["Month, week, day and agenda views", "Your tasks laid over your events", "Eight colours for your events"],
    shot: "/mobile/calendar.png",
  },
  {
    icon: faComments,
    t: "Chat with AI",
    d: "Folders, pinned chats, share links, and drafts you confirm before anything is saved.",
    tone: "mint",
    status: "live",
    pts: [
      "Folders, pinned chats and unread markers",
      "Drafts you confirm before anything is saved",
      "Share one chat with a read-only link",
    ],
    shot: "/mobile/chat-2.png",
  },
  {
    icon: faPlug,
    t: "Your apps in chat",
    d: "Type @ and pick a connected app, like Zoho Books. Chat shows what it is doing, reads your real records, and drafts wait for you to press Create.",
    tone: "clay",
    status: "live",
    pts: [
      "Type @ and pick a connected app, like Zoho Books",
      "Chat shows what it is doing and reads your real records",
      "Drafts wait for you to press Create",
    ],
    shot: "/mobile/connect.png",
  },
  {
    icon: faMagnifyingGlass,
    t: "Universal search",
    d: "One search box across tasks, notes, journal and chats. Press ⌘K anywhere.",
    tone: "gold",
    status: "live",
    pts: ["One search across tasks, notes, journal and chats", "Press ⌘K anywhere"],
  },
  {
    icon: faUserGroup,
    t: "Shared journals",
    d: "Write a journal together with people you invite, as an editor or a viewer.",
    tone: "violet",
    status: "live",
    pts: ["Write together with people you invite", "Invite by username or email", "Editor or viewer, and you can change it any time"],
  },
  {
    icon: faLayerGroup,
    t: "Library",
    d: "Every file from your notes, journal and chats in one place, with search and preview.",
    tone: "sand",
    status: "live",
    pts: ["Every file from your notes, journal and chats", "Search and preview in one place"],
  },
  {
    icon: faRss,
    t: "Reader",
    d: "Follow feeds and read articles beside your notes. The app tells you about new ones.",
    tone: "amber",
    status: "live",
    pts: ["Follow feeds", "Read articles beside your notes", "The app tells you about new ones"],
  },
  {
    icon: faMobileScreen,
    t: "Android app",
    d: "The same workspace on your phone, in the same look: a floating navbar, light, cream or charcoal, and sign-in with Google or a passkey.",
    tone: "mint",
    status: "live",
    pts: ["The same workspace on your phone", "A floating navbar in light, cream or charcoal", "Sign in with Google or a passkey"],
    shot: "/mobile/home-2.png",
  },
  {
    icon: faHeartPulse,
    t: "Health",
    d: "Steps, sleep and heart rate from your phone, on the web and available to the chat.",
    tone: "clay",
    status: "live",
    pts: ["Steps, sleep and heart rate from your phone", "On the web, and available to the chat"],
    shot: "/mobile/health.png",
  },
  {
    icon: faKey,
    t: "Your own AI",
    d: "Pick the model for each chat and add your own OpenAI, Anthropic, Google or OpenRouter key.",
    tone: "blue",
    status: "live",
    pts: ["Pick the model for each chat", "Add your own OpenAI, Anthropic, Google or OpenRouter key"],
  },
  {
    icon: faWallet,
    t: "Pay your way",
    d: "An autopay subscription, prepaid credit you top up, or your own key, all in rupees.",
    tone: "green",
    status: "live",
    pts: ["An autopay subscription", "Prepaid credit you top up", "Or your own key, all in rupees"],
  },
  {
    icon: faFileImport,
    t: "Import and export",
    d: "Bring an Obsidian vault in as notes, and export your notes as Markdown.",
    tone: "mint",
    status: "live",
    pts: ["Bring an Obsidian vault in as notes", "Export your notes as Markdown"],
  },
  {
    icon: faComments,
    t: "ChatGPT sign-in",
    d: "Use the ChatGPT plan you already pay for inside Naazhi’s chat.",
    tone: "gold",
    status: "building",
    pts: ["Use the ChatGPT plan you already pay for", "Right inside Naazhi’s chat"],
  },
  {
    icon: faDesktop,
    t: "Desktop apps and extension",
    d: "Mac and Windows apps, and a browser extension that turns a meeting into a note.",
    tone: "sand",
    status: "soon",
    pts: ["Mac and Windows apps", "A browser extension that turns a meeting into a note"],
  },
  {
    icon: faEnvelope,
    t: "Email",
    d: "Gmail and Outlook threads beside your notes. Compose, reply and forward.",
    tone: "clay",
    status: "soon",
    pts: ["Gmail and Outlook threads beside your notes", "Compose, reply and forward"],
  },
  {
    icon: faMicrophone,
    t: "Meetings",
    d: "Capture, transcribe and turn a meeting into follow-ups.",
    tone: "sand",
    status: "soon",
    pts: ["Capture and transcribe a meeting", "Turn it into follow-ups"],
  },
  {
    icon: faRoute,
    t: "Automations",
    d: "Rules that handle the repetitive parts for you.",
    tone: "violet",
    status: "soon",
    pts: ["Rules that handle the repetitive parts for you"],
  },
];

export const NOTE_POINTS: [IconDefinition, string, string][] = [
  [faPenToSquare, "Rich notes", "Give each note a colour and drag them into the order you want."],
  [faWandMagicSparkles, "Slash commands", "Type / to format as you write, without reaching for a toolbar."],
  [faMicrophone, "Dictate", "Speak and watch it turn into text."],
  [faPaperclip, "Attachments", "Keep the files and images a note needs inside the note."],
  [faClockRotateLeft, "Version history", "Go back to an earlier version whenever you need to."],
  [faFileExport, "Export as Markdown", "Your notes are yours to take with you, from Settings."],
];

export const TASK_POINTS: [IconDefinition, string, string][] = [
  [faListCheck, "Lists and priorities", "Sort work into lists and set priority from urgent to low."],
  [faClockRotateLeft, "Repeats", "Daily, weekly or on the 2nd Wednesday. Finish one and the next appears."],
  [faTableColumns, "Three ways to look", "List, board or calendar, whichever suits the day."],
  [faMagnifyingGlass, "Keyboard first", "Q to add, G then T for today, 1 to 4 for priority."],
];

export const JOURNAL_POINTS: [IconDefinition, string, string][] = [
  [faBookOpen, "Many entries a day", "Write as often as you think of something."],
  [faLock, "Private to you", "Your journal is kept apart from the rest of the workspace."],
  [faMicrophone, "Voice and attachments", "Dictate an entry or attach a photo or file."],
  [faCalendarDays, "Browse by calendar", "Jump to any day and see what you wrote."],
];

export const COLLAB_POINTS: [IconDefinition, string, string][] = [
  [faUserGroup, "Write together", "Start a shared journal and write in it with the people you invite."],
  [faEnvelope, "Invite by username or email", "They join when they accept, and an email lets them know they were invited."],
  [faPenToSquare, "Editor or viewer", "Choose who can write and who can only read. The owner can change it at any time."],
  [faPaperclip, "Photos and files", "Everyone can add entries with photos and files, and see who wrote what."],
];

export const CALENDAR_POINTS: [IconDefinition, string, string][] = [
  [faCalendarDays, "Four views", "Month, week, day and agenda. Your phone opens on the agenda."],
  [faListCheck, "Tasks on the calendar", "Tasks with a due date appear beside your events. Toggle them off any time."],
  [faWandMagicSparkles, "Eight colours", "Tint each event to match the way you think about it."],
  [faMagnifyingGlass, "One key for everything", "T for today, M, W, D and A for the views, C for a new event."],
];

export const CHAT_POINTS: [IconDefinition, string, string][] = [
  [faComments, "Organised", "Folders, pinned chats and unread markers keep it tidy."],
  [faWandMagicSparkles, "You approve every save", "The AI can draft a note, journal entry or to-do. Nothing is saved until you confirm."],
  [faShareNodes, "Share one chat", "Send a read-only link to a single conversation, and stop sharing whenever you like."],
  [faFileExport, "Export", "Take a conversation with you."],
];

export const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { keys: ["⌘", "K"], label: "Search everything", group: "Anywhere" },
  { keys: ["?"], label: "Show all shortcuts", group: "Anywhere" },
  { keys: ["Q"], label: "Quick add a task", group: "Tasks" },
  { keys: ["G", "T"], label: "Go to Today", group: "Tasks" },
  { keys: ["1"], label: "Set priority to urgent", group: "Tasks" },
  { keys: ["E"], label: "Edit the focused task", group: "Tasks" },
  { keys: ["T"], label: "Jump to today", group: "Calendar" },
  { keys: ["W"], label: "Week view", group: "Calendar" },
  { keys: ["C"], label: "New event", group: "Calendar" },
];

export const TRUST: { icon: IconDefinition; t: string; d: string; tip: string; tone: Tone }[] = [
  {
    icon: faFingerprint,
    t: "Passkeys",
    d: "Sign in with your fingerprint, face or device, with no password to leak.",
    tip: "Passkeys use WebAuthn. Your device holds the secret; we never see it.",
    tone: "violet",
  },
  {
    icon: faKey,
    t: "Google or email",
    d: "Continue with Google (including One Tap), or use a username and password.",
    tip: "We show a “Last used” hint so you can find the way you signed in before.",
    tone: "blue",
  },
  {
    icon: faShieldHalved,
    t: "Safe password resets",
    d: "Six-digit codes that expire in five minutes, stored hashed, with limited attempts.",
    tip: "The reset form gives the same answer whether or not an account exists, so it can’t be used to look people up.",
    tone: "green",
  },
  {
    icon: faUserLock,
    t: "A private journal",
    d: "Your journal entries belong to you alone, even inside a shared workspace.",
    tip: "Journal entries are scoped to their author at the database level.",
    tone: "amber",
  },
  {
    icon: faLock,
    t: "Protected at the database",
    d: "Every table has row-level security, so the database itself checks who may see a row.",
    tip: "Permissions aren’t only enforced in the interface; they’re enforced where the data lives.",
    tone: "mint",
  },
  {
    icon: faFileExport,
    t: "Export and delete",
    d: "Export your data, reset your workspace, or delete your account and its files.",
    tip: "Account deletion removes your rows and your stored files.",
    tone: "clay",
  },
];

export const FAQS: [string, string][] = [
  ["Do I have to use AI?", "No. Use AI when it helps, or keep your workspace fully AI-free. The workspace works the same either way."],
  [
    "What happens if I switch AI provider or model?",
    "Nothing happens to your content. Your notes, tasks, journal and everything you’ve built stay exactly where they are. The workspace is separate from the AI you choose.",
  ],
  [
    "What can I use today, and what is still coming?",
    "Notes, tasks, journal (including shared journals), calendar, chat with AI, universal search, Library, Reader, Health, imports and plans with autopay are live. Email, meetings, automations, the ChatGPT sign-in, the desktop apps and the browser extension are still being built, and the page says so wherever they appear.",
  ],
  [
    "Can the AI change my things without asking?",
    "No. When the assistant drafts a note, a journal entry or a to-do, you see a preview and confirm before anything is saved.",
  ],
  [
    "How do I sign in?",
    "With a passkey, with Google (including One Tap), or with a username and password. If you forget a password, a six-digit code to your email lets you reset it.",
  ],
  ["Is my journal private?", "Yes. Journal entries are private to their author, kept apart from the rest of the workspace."],
  [
    "Can I write a journal with someone else?",
    "Yes. Start a shared journal and invite people by username or email. Each person can be an editor or a viewer, and they join only after they accept. Your personal journal stays private to you.",
  ],
  [
    "Can I bring my existing notes, and take them out again?",
    "Yes. Bring an Obsidian vault in as notes (folders stay folders, and duplicates are skipped), and export your notes as Markdown or your data from Settings. Importing from Notion is planned.",
  ],
  [
    "Which email and calendar services will connect?",
    "Zoho Mail and Zoho Calendar are live now, and you can ask chat about them. Gmail and Outlook for email, and Google Calendar for events, are planned. With Pro you can connect up to 5 email accounts and up to 5 calendars.",
  ],
  [
    "Does it connect to the tools my team already uses?",
    "That is the direction: Slack, Google Drive, Docs and Sheets, Notion, GitHub, Linear, HubSpot, Zoom, Google Meet and Microsoft Teams, plus Cloudflare, Eventbrite and Maps. Each one is marked live or coming soon on the integrations list.",
  ],
  [
    "How do I pay for AI?",
    "Three ways, all in rupees. Subscribe with autopay for a monthly AI allowance, top up prepaid credit and pay only for the tokens you use, or add your own API key (OpenAI, Anthropic, Google or OpenRouter) and pay that provider directly. Using your ChatGPT plan is on the way. The pricing page has a calculator to compare them.",
  ],
  [
    "Is there an app for my computer?",
    "Not yet. Naazhi works in any browser on a Mac or a Windows PC, and Mac and Windows apps and a browser extension are marked “Coming soon” on the download page. The Android app is available now; the iPhone app is coming.",
  ],
  [
    "Does it work on my phone?",
    "Yes. Every page is built mobile-first, and the Android app gives you the same workspace in the same look, with a Menu for Notes, Library, Calendar, Health and Reader, and sign-in with Google or a passkey.",
  ],
];

export const GROUPS = [
  {
    name: "Communication",
    items: [
      { name: "Gmail", use: "Fetch & send mail" },
      { name: "Outlook", use: "Draft follow-ups" },
      { name: "Slack", use: "Send recaps" },
    ],
  },
  {
    name: "Calendar & meetings",
    items: [
      { name: "Google Calendar", use: "Sync events" },
      { name: "Google Meet", use: "Meetings" },
      { name: "Microsoft Teams", use: "Meetings" },
      { name: "Zoom", use: "Meetings" },
    ],
  },
  {
    name: "Data",
    items: [
      { name: "Google Drive", use: "Backup files" },
      { name: "Google Docs", use: "Documents" },
      { name: "Google Sheets", use: "Answer from data" },
      { name: "Notion", use: "Import notes" },
    ],
  },
  {
    name: "Work",
    items: [
      { name: "GitHub", use: "Track issues" },
      { name: "Linear", use: "Move tickets" },
      { name: "HubSpot", use: "Log CRM activity" },
    ],
  },
  {
    name: "Zoho",
    items: [
      { name: "Zoho CRM", use: "Leads, deals, add records" },
      { name: "Zoho Mail", use: "Read and send mail" },
      { name: "Zoho Desk", use: "Support tickets" },
      { name: "Zoho Cliq", use: "Post to channels" },
      { name: "Zoho Books", use: "Invoices, bills and products" },
      { name: "Zoho Calendar", use: "Upcoming events" },
    ],
  },
  {
    name: "More",
    items: [
      { name: "Cloudflare", use: "Watch your sites" },
      { name: "Eventbrite", use: "Manage events" },
      { name: "Maps", use: "Location workflows" },
    ],
  },
] as const;
export const ALL_INTEGRATIONS = GROUPS.flatMap((g) => g.items.map((x) => x.name));
