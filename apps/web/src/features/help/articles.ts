import {
  faBookOpen,
  faCircleNodes,
  faCreditCard,
  faListCheck,
  faLock,
  faMobileScreen,
  faPenToSquare,
  faPlug,
  faRocket,
  faScrewdriverWrench,
  faUserLock,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import type { HelpArticle, HelpCategory } from "./types";

/*
 * The help center's content. Every article describes only what the product does today (the same rule as the rest of the site: a feature
 * is mentioned as available only when its status in components/site/content.ts is "live"). When a screen or a setting changes, change
 * the article and its `updated` day. Settings names match the labels in the app.
 */

export const HELP_UPDATED = "2026-11-13";

export const CATEGORIES: readonly HelpCategory[] = [
  { slug: "getting-started", title: "Getting started", description: "Make an account, find your way around and decide how much AI you want.", icon: faRocket, tone: "green" },
  { slug: "write-and-plan", title: "Notes, tasks and journal", description: "Write, plan your days, keep a private journal or share one.", icon: faPenToSquare, tone: "blue" },
  { slug: "chat-and-ai", title: "Chat and AI", description: "Chat with an assistant you control, choose the model, bring your own key.", icon: faWandMagicSparkles, tone: "violet" },
  { slug: "find-and-read", title: "Search, Library and Reader", description: "Find anything fast, keep every file in one place, follow feeds.", icon: faBookOpen, tone: "amber" },
  { slug: "account", title: "Account and sign-in", description: "Passkeys, Google, passwords and what to do when you can’t get in.", icon: faUserLock, tone: "clay" },
  { slug: "plans-billing", title: "Plans and billing", description: "Subscriptions, credit, your own key, cancelling and refunds.", icon: faCreditCard, tone: "mint" },
  { slug: "apps", title: "Apps and devices", description: "The Android app, Health, and what works on a computer.", icon: faMobileScreen, tone: "sand" },
  { slug: "integrations", title: "Connected apps", description: "Connect Zoho and ask about your records from chat.", icon: faPlug, tone: "blue" },
  { slug: "privacy-data", title: "Privacy and your data", description: "Who can see what, exporting, and deleting your account.", icon: faLock, tone: "violet" },
  { slug: "troubleshooting", title: "Troubleshooting", description: "Something not working? Start here.", icon: faScrewdriverWrench, tone: "clay" },
];

export const ARTICLES: readonly HelpArticle[] = [
  // ── Getting started ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "what-is-naazhi",
    category: "getting-started",
    title: "What Naazhi is, and what you can use today",
    summary: "Naazhi is one workspace for notes, tasks, journal, chat and calendar, with AI that is optional.",
    keywords: ["overview", "features", "about", "what works", "live"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Naazhi keeps your notes, tasks, journal, chat and calendar in one place. What you write lives in your workspace, not inside an AI provider, so changing the AI never moves your content." },
      { type: "h", text: "Live today" },
      { type: "list", items: ["Notes, tasks and a calendar", "A private journal, and shared journals you write with others", "Chat with AI, universal search, Library and Reader", "Health from your phone, imports and exports", "The Android app, the Mac and Windows apps, and the web app in any browser"] },
      { type: "h", text: "Not available yet" },
      { type: "p", text: "Email, meetings, automations, signing in with ChatGPT, the iPhone and iPad app and a browser extension are planned or being built. The roadmap shows where each one stands." },
      { type: "note", tone: "info", text: "A feature marked Coming soon or Building is not available yet. We change a label only when the feature ships." },
    ],
    related: ["use-naazhi-without-ai", "take-a-tour"],
  },
  {
    slug: "create-an-account",
    category: "getting-started",
    title: "Create an account and sign in",
    summary: "Sign up with a passkey, Google or a username and password, then sign in the same way.",
    keywords: ["sign up", "register", "login", "log in", "passkey", "google", "username"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open the app and choose Get started.", "Pick how you want to sign in: a passkey, Google, or a username and password.", "Follow the prompts. You land on your Home page."] },
      { type: "p", text: "You can sign in with a passkey, with Google (including One Tap), or with a username and password. Your notes, tasks and journal are the same on the web and in the Android app." },
      { type: "note", tone: "info", text: "A passkey is tied to the address it was made on. If you made one on an older address, make a new one on the current address." },
    ],
    related: ["reset-your-password", "cant-sign-in"],
  },
  {
    slug: "take-a-tour",
    category: "getting-started",
    title: "Find your way around",
    summary: "Where Home, Notes, To-do, Journal, Chat, Calendar, Library, Reader and Health are.",
    keywords: ["navigation", "menu", "sidebar", "home", "tour", "where is"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "On the web, the sidebar lists your sections. In the Android app, the Menu opens Notes, Library, Calendar, Health and Reader." },
      { type: "list", items: ["Home: today at a glance", "Notes and To-do: writing and planning", "Journal: a private record of your days", "Chat: an assistant you control", "Calendar: events with your tasks laid over them", "Library: every file from your notes, journal and chats", "Reader: feeds you follow", "Health: steps, sleep and heart rate from your phone"] },
      { type: "p", text: "Press ⌘K anywhere to search across tasks, notes, journal and chats." },
    ],
    related: ["search-everything", "what-is-naazhi"],
  },
  {
    slug: "use-naazhi-without-ai",
    category: "getting-started",
    title: "Use Naazhi with AI switched off",
    summary: "You never have to use AI. The workspace works the same without it.",
    keywords: ["no ai", "disable ai", "turn off ai", "ai free", "privacy"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "AI is optional. Notes, tasks, journal and calendar work the same whether or not you ever open Chat. If you don’t use AI, nothing is sent to an AI provider." },
      { type: "list", items: ["AI helps only when you ask for it", "When the assistant drafts something, you see a preview and confirm before it is saved", "You can switch the model, add your own key, or stop using AI at any time without losing anything"] },
    ],
    related: ["ai-confirms-before-saving", "choose-a-model"],
  },

  // ── Notes, tasks and journal ──────────────────────────────────────────────────────────────────────────────────
  {
    slug: "write-a-note",
    category: "write-and-plan",
    title: "Write a note: colours, slash commands, voice and files",
    summary: "Give notes a colour, format with /, dictate, and keep attachments inside the note.",
    keywords: ["notes", "slash commands", "dictate", "voice", "attachments", "colour", "color", "format"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open Notes and create a new note.", "Type / to format as you write: headings, lists and more, without a toolbar.", "Use dictate to speak a note and watch it become text.", "Attach files and images so they stay inside the note.", "Give the note a colour, and drag notes into the order you want."] },
      { type: "p", text: "Notes can be kept in folders and viewed as a gallery or a list." },
    ],
    related: ["restore-a-note", "notes-atlas", "export-your-notes"],
  },
  {
    slug: "restore-a-note",
    category: "write-and-plan",
    title: "Go back to an earlier version, or restore a deleted note",
    summary: "Version history lets you return to an earlier version, and the Trash keeps deleted notes until you empty it.",
    keywords: ["undo", "version history", "trash", "deleted", "recover", "restore"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Open a note’s version history to go back to how it looked earlier. Deleted notes go to the Trash, where you can restore them." },
      { type: "note", tone: "warn", text: "Emptying the Trash removes notes for good. Restore anything you need first." },
    ],
    related: ["write-a-note"],
  },
  {
    slug: "notes-atlas",
    category: "write-and-plan",
    title: "See how your notes connect with the Atlas",
    summary: "The Atlas maps how your notes connect, so related ideas are easy to find.",
    keywords: ["atlas", "graph", "backlinks", "connections", "map"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "The Atlas shows how your notes link to each other. Use it to find ideas that belong together and to see which notes your thinking keeps returning to." },
      { type: "p", text: "It is mainly visual. Search and the Library give you other ways to reach the same notes." },
    ],
    related: ["search-everything", "write-a-note"],
  },
  {
    slug: "plan-your-tasks",
    category: "write-and-plan",
    title: "Plan tasks with lists, priorities and repeats",
    summary: "Organise to-dos in lists, set priorities from urgent to low, repeat them, and switch between list, board and calendar views.",
    keywords: ["tasks", "to-do", "todo", "priority", "repeat", "recurring", "board", "calendar view"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open To-do and add a task.", "Set a priority, from urgent to low.", "Add a repeat if it comes round again: daily, weekly, or something like the 2nd Wednesday.", "Switch the view to list, board or calendar to see your work the way you plan it."] },
      { type: "p", text: "Tasks with a due date also appear on your calendar." },
    ],
    related: ["calendar-views"],
  },
  {
    slug: "private-journal",
    category: "write-and-plan",
    title: "Keep a private journal",
    summary: "Write as often as you like. Journal entries are private to you, with voice and attachments.",
    keywords: ["journal", "diary", "private", "entries", "voice"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "You can write many entries a day, dictate them by voice and attach files. Journal entries are private to their author and kept apart from the rest of the workspace." },
      { type: "note", tone: "info", text: "Our administrators work with counts and ids. Their tools are built so they cannot show your notes, journal or chats." },
    ],
    related: ["shared-journal", "who-can-see-what"],
  },
  {
    slug: "shared-journal",
    category: "write-and-plan",
    title: "Write a journal together",
    summary: "Start a shared journal and invite people as editors or viewers. They join after they accept.",
    keywords: ["shared journal", "collaborate", "invite", "editor", "viewer", "together"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Create a shared journal.", "Invite people by username or email.", "Choose for each person whether they can edit or only view.", "They join after they accept the invitation."] },
      { type: "p", text: "Your own journal stays private to you. Only the shared journal is visible to the people you invite." },
    ],
    related: ["private-journal"],
  },

  // ── Chat and AI ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "chat-basics",
    category: "chat-and-ai",
    title: "Chat basics: folders, pins, sharing and drafts",
    summary: "Organise chats in folders, pin the ones you need, share a read-only link, and confirm drafts.",
    keywords: ["chat", "folders", "pin", "share link", "drafts", "assistant"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "list", items: ["Keep chats in folders and pin the ones you return to", "Share a chat with a read-only link, and stop sharing to make the link stop working", "When the assistant drafts a note, a journal entry or a to-do, you see a preview first"] },
    ],
    related: ["ai-confirms-before-saving", "choose-a-model"],
  },
  {
    slug: "ai-confirms-before-saving",
    category: "chat-and-ai",
    title: "The assistant asks before it changes anything",
    summary: "Drafts wait for you. Nothing is saved until you confirm.",
    keywords: ["confirm", "draft", "preview", "safe", "create", "permission"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "When the assistant drafts a note, a journal entry or a to-do, you see a preview and decide whether to save it. The same applies to connected apps: drafts wait until you press Create." },
      { type: "note", tone: "warn", text: "AI can be wrong. Check anything important before you rely on it." },
    ],
    related: ["ask-connected-apps"],
  },
  {
    slug: "choose-a-model",
    category: "chat-and-ai",
    title: "Choose a model, or bring your own key",
    summary: "Pick the model for each chat, or add your own OpenAI, Anthropic, Google or OpenRouter key.",
    keywords: ["model", "api key", "byok", "openai", "anthropic", "google", "openrouter", "provider"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "You can choose the model for each chat. To use your own account with a provider, add its API key in Settings → API keys. You pay that provider directly, and Naazhi doesn’t charge or count that usage." },
      { type: "list", items: ["Supported providers: OpenAI, Anthropic, Google and OpenRouter", "Changing model or provider never moves your notes, tasks or journal", "Signing in with a ChatGPT plan is being built and is not available yet"] },
    ],
    related: ["how-ai-is-paid", "use-naazhi-without-ai"],
  },
  {
    slug: "ask-connected-apps",
    category: "chat-and-ai",
    title: "Ask about a connected app from chat",
    summary: "Type @ and pick a connected app. Chat reads your real records, and drafts wait for you.",
    keywords: ["@", "zoho", "connected apps", "books", "crm", "ask"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Connect the app first (see Connect Zoho).", "In a chat, type @ and pick the app, for example Zoho Books.", "Ask your question. Chat shows what it is doing and reads your real records.", "If it drafts something, check it and press Create."] },
    ],
    related: ["connect-zoho", "ai-confirms-before-saving"],
  },

  // ── Search, Library and Reader ────────────────────────────────────────────────────────────────────────────────
  {
    slug: "search-everything",
    category: "find-and-read",
    title: "Search everything from one box",
    summary: "Press ⌘K to search across tasks, notes, journal and chats.",
    keywords: ["search", "find", "command k", "cmd k", "universal search"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Press ⌘K anywhere to open search. It looks across your tasks, notes, journal and chats at once. It works without AI." },
    ],
    related: ["library-files", "notes-atlas"],
  },
  {
    slug: "library-files",
    category: "find-and-read",
    title: "Find any file in the Library",
    summary: "Every file from your notes, journal and chats is in the Library, with search and preview.",
    keywords: ["library", "files", "attachments", "images", "documents"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "The Library gathers the files and images you attached to notes, journal entries and chats. Search it by name and open a preview without leaving the page." },
    ],
    related: ["search-everything"],
  },
  {
    slug: "follow-feeds-in-reader",
    category: "find-and-read",
    title: "Follow feeds and read in the Reader",
    summary: "Follow feeds and read articles beside your notes. The app tells you about new ones.",
    keywords: ["reader", "rss", "feeds", "articles", "follow"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Add the feeds you want to follow and read their articles in the Reader, next to your notes. The app lets you know when there is something new." },
    ],
    related: ["take-a-tour"],
  },
  {
    slug: "calendar-views",
    category: "find-and-read",
    title: "Use the calendar",
    summary: "Month, week, day and agenda views, with your tasks laid over your events.",
    keywords: ["calendar", "events", "agenda", "week", "month", "day"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Switch between month, week, day and agenda views. Tasks that have a due date appear on the calendar beside your events." },
      { type: "p", text: "Zoho Calendar events can be asked about from chat once Zoho is connected. Google Calendar is planned and not available yet." },
    ],
    related: ["plan-your-tasks", "connect-zoho"],
  },

  // ── Account ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "reset-your-password",
    category: "account",
    title: "Reset a forgotten password",
    summary: "Ask for a six-digit code by email and use it to choose a new password.",
    keywords: ["forgot password", "reset", "code", "email", "login"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["On the sign-in page, choose Forgot password.", "Enter the email on your account.", "Enter the six-digit code we email you.", "Choose a new password."] },
      { type: "note", tone: "info", text: "If the email doesn’t arrive, check your spam folder, and make sure you used the address you signed up with." },
    ],
    related: ["cant-sign-in", "create-an-account"],
  },
  {
    slug: "passkeys-and-google",
    category: "account",
    title: "Sign in with a passkey or Google",
    summary: "Passkeys and Google sign-in work on the web and in the Android app.",
    keywords: ["passkey", "google", "one tap", "biometric", "fingerprint"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "A passkey lets you sign in with your device’s unlock, such as a fingerprint or face, instead of a password. Google sign-in (including One Tap) uses your Google account; we receive only what Google confirms, such as your name and email, never your Google password." },
      { type: "list", items: ["You can use the same account on the web and in the Android app", "Passkeys are tied to the address they were made on", "Security options are in Settings → Security"] },
    ],
    related: ["create-an-account", "cant-sign-in"],
  },

  // ── Plans and billing ─────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "how-ai-is-paid",
    category: "plans-billing",
    title: "Three ways to pay for AI",
    summary: "An autopay subscription, prepaid credit you top up, or your own key. All in rupees.",
    keywords: ["pricing", "plans", "credit", "subscription", "autopay", "razorpay", "upi", "rupees", "own key"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "list", items: ["Subscribe with autopay for a monthly AI allowance (UPI AutoPay, cards and more, through Razorpay)", "Top up prepaid credit, in whole rupees, and pay only for the tokens you use", "Add your own API key and pay that provider directly"] },
      { type: "p", text: "Your notes, tasks and journal don’t depend on any of these. If your credit reaches zero, AI pauses until you top up, and everything else keeps working." },
    ],
    related: ["cancel-your-plan", "choose-a-model"],
  },
  {
    slug: "cancel-your-plan",
    category: "plans-billing",
    title: "Cancel a plan or ask for a refund",
    summary: "Cancel in Settings → Plans & billing. Refunds follow the refund policy.",
    keywords: ["cancel", "refund", "stop", "subscription", "money back", "billing"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open Settings → Plans & billing.", "Choose to cancel.", "A subscription keeps working until the end of the period you already paid for, then stops renewing."] },
      { type: "p", text: "Pay-as-you-go and bring-your-own-key plans stop at once, and you are not charged again. When you can get a refund, and how to ask, is set out in the refund policy." },
    ],
    related: ["how-ai-is-paid"],
  },

  // ── Apps and devices ──────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "install-the-android-app",
    category: "apps",
    title: "Install the Android app",
    summary: "Get the Android app on Google Play, or install the file from the Download page, then sign in.",
    keywords: ["android", "apk", "install", "download", "app", "google play", "play store"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open Naazhi on Google Play and choose Install.", "Open Naazhi and sign in with your passkey, Google or username."] },
      { type: "h", text: "Installing the file directly" },
      { type: "p", text: "If you can’t use Google Play, open the Download page and choose the direct download. Android may ask you to allow installs from your browser or Files app; you can switch that permission off again afterwards. Only install apps you trust." },
      { type: "list", items: ["Google Play updates the app for you", "For a direct install, download the newest file and open it over the version you have; your data stays in your account"] },
      { type: "note", tone: "info", text: "An iPhone and iPad app is planned and not available yet." },
    ],
    related: ["connect-health", "cant-install-android"],
  },
  {
    slug: "connect-health",
    category: "apps",
    title: "Bring Health into Naazhi",
    summary: "Connect Health Connect on Android to see steps, sleep and heart rate on the web and in chat.",
    keywords: ["health", "steps", "sleep", "heart rate", "health connect", "apple health"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Connect Health from the Naazhi app on your phone. Health data stays on your phone until you allow it, so it can’t be connected from the web." },
      { type: "list", items: ["Android: Google Health Connect (steps, sleep, activity, resting heart rate and weight)", "iPhone: Apple Health, when the iPhone app is available", "You choose what to share, and you can delete stored health summaries at any time"] },
      { type: "note", tone: "info", text: "Health in Naazhi is for your own reference. It is not a medical device and gives no medical advice." },
    ],
    related: ["install-the-android-app", "delete-your-account"],
  },
  {
    slug: "naazhi-on-a-computer",
    category: "apps",
    title: "Use Naazhi on a Mac or Windows PC",
    summary: "Download the Mac or Windows app, or open Naazhi in any modern browser. A browser extension is not available yet.",
    keywords: ["mac", "windows", "desktop", "computer", "browser", "extension", "ipad", "iphone"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Download the Mac (.dmg) or Windows (.exe, x64 or ARM64) app from the download page; every version is also on the GitHub releases page. It opens the same workspace in its own window and updates itself. The apps aren’t signed with a paid certificate yet, so the first time you open one your computer asks you to confirm: on a Mac, right-click the app and choose Open; on Windows, choose More info, then Run anyway." },
      { type: "p", text: "You can also open Naazhi in any modern browser on a Mac or a Windows PC. A browser extension is planned and marked Coming soon." },
    ],
    related: ["install-the-android-app"],
  },

  // ── Connected apps ────────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "connect-zoho",
    category: "integrations",
    title: "Connect Zoho",
    summary: "Connect Zoho apps such as Books, Mail, CRM and Calendar, then ask about them from chat.",
    keywords: ["zoho", "connect", "books", "crm", "mail", "calendar", "desk", "cliq", "integration"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open Settings → Zoho.", "Follow the prompts to connect your Zoho account.", "In chat, type @ and pick the app you connected."] },
      { type: "p", text: "You can disconnect at any time from the same place. Gmail, Outlook and Google Calendar are planned and not available yet, and each app is marked live or coming soon on the integrations list." },
      { type: "note", tone: "info", text: "Names and logos of other companies belong to their owners. Naazhi is not affiliated with or endorsed by them." },
    ],
    related: ["ask-connected-apps"],
  },

  // ── Privacy and data ──────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "who-can-see-what",
    category: "privacy-data",
    title: "Who can see what",
    summary: "Your notes, tasks and chats are yours, your journal is private to you, and admins can’t read your content.",
    keywords: ["privacy", "security", "visible", "admin", "share", "private"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "list", items: ["Your notes, tasks and chats: you", "Your journal: only you (a shared journal: the people you invite)", "A chat you share: anyone with the link, until you stop sharing", "Your files: you, through short-lived links", "An AI provider: only what you send it, and nothing if you don’t use AI"] },
      { type: "p", text: "The Privacy and Security page has the full picture." },
    ],
    related: ["export-your-notes", "delete-your-account"],
  },
  {
    slug: "import-an-obsidian-vault",
    category: "privacy-data",
    title: "Import an Obsidian vault",
    summary: "Bring an Obsidian vault in as notes. Folders stay folders and duplicates are skipped.",
    keywords: ["import", "obsidian", "vault", "markdown", "migrate", "notion"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open Settings → Imports & backup.", "Choose your Obsidian vault.", "Review the import. Folders stay folders, and notes you already have are skipped."] },
      { type: "note", tone: "info", text: "Importing from Notion is planned and not available yet." },
    ],
    related: ["export-your-notes"],
  },
  {
    slug: "export-your-notes",
    category: "privacy-data",
    title: "Export your notes and data",
    summary: "Export your notes as Markdown, and your data, from Settings. You are never locked in.",
    keywords: ["export", "download my data", "backup", "markdown", "take with me"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Open Settings → Your data to export your notes as Markdown and your data. Do this before you delete your account." },
    ],
    related: ["delete-your-account", "import-an-obsidian-vault"],
  },
  {
    slug: "delete-your-account",
    category: "privacy-data",
    title: "Delete your content or your account",
    summary: "Delete everything you wrote and keep your account, or delete the account itself. This can’t be undone.",
    keywords: ["delete account", "remove data", "close account", "erase", "gdpr"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "steps", items: ["Open Settings → Delete account.", "Choose whether to delete all your content and keep your account, or to delete the account.", "To delete the account, type your account email to confirm."] },
      { type: "note", tone: "warn", text: "Deleting your account permanently removes it with everything in it. It cannot be undone. Export first if you want a copy." },
      { type: "p", text: "If you can’t sign in, email us from your account address and ask us to delete your account and data." },
    ],
    related: ["export-your-notes", "who-can-see-what"],
  },

  // ── Troubleshooting ───────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "cant-sign-in",
    category: "troubleshooting",
    title: "I can’t sign in",
    summary: "Things to try when sign-in fails: the sign-in method, the address, and a password reset.",
    keywords: ["can't login", "cannot sign in", "error", "locked out", "password", "passkey not working"],
    popular: true,
    updated: HELP_UPDATED,
    blocks: [
      { type: "list", items: ["Use the method you signed up with: passkey, Google or username and password", "A passkey made on an older address won’t work on the current one; use another method and make a new passkey", "Forgot your password? Reset it with the six-digit code we email you", "If the server is unreachable, wait a minute and try again"] },
      { type: "p", text: "Still stuck? Write to us from the email on your account and tell us what you see." },
    ],
    related: ["reset-your-password", "passkeys-and-google"],
  },
  {
    slug: "ai-is-not-answering",
    category: "troubleshooting",
    title: "AI isn’t answering",
    summary: "Common reasons chat is quiet: no credit, a key that has been removed, or AI switched off.",
    keywords: ["ai not working", "chat error", "no reply", "credit", "key", "paused"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "list", items: ["Prepaid credit at zero: AI pauses until you top up; your notes, tasks and journal are unaffected", "Your own API key: check it is still valid with the provider, and that you have credit there", "AI switched off for this chat: choose a model", "A temporary problem: try again in a minute, and check the Status page"] },
    ],
    related: ["how-ai-is-paid", "choose-a-model"],
  },
  {
    slug: "cant-install-android",
    category: "troubleshooting",
    title: "The Android app won’t install",
    summary: "Android may block installs from your browser or Files app until you allow them.",
    keywords: ["apk", "install blocked", "unknown sources", "android", "parse error"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "list", items: ["Allow installs from the app you used to open the file (your browser or Files app) when Android asks", "Download the file again if it was interrupted", "Make sure you downloaded the Android file (the one ending in .apk)", "You can switch the permission off again afterwards"] },
    ],
    related: ["install-the-android-app"],
  },
  {
    slug: "feature-not-available",
    category: "troubleshooting",
    title: "A feature says Coming soon or Building",
    summary: "Those features are not available yet. See the roadmap, and tell us what you need.",
    keywords: ["coming soon", "building", "not available", "missing", "roadmap", "feature request"],
    updated: HELP_UPDATED,
    blocks: [
      { type: "p", text: "Features marked Coming soon or Building are planned or in development and are not available yet. We mark something live only when you can use it today." },
      { type: "p", text: "The roadmap shows what is being built and what is planned. If something you need is missing, tell us what you were trying to do." },
    ],
    related: ["what-is-naazhi"],
  },
];

export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const articleBySlug = (category: string, slug: string) => ARTICLES.find((a) => a.category === category && a.slug === slug);
export const articlesIn = (category: string) => ARTICLES.filter((a) => a.category === category);
/** An article by slug alone (slugs are unique across the center). */
export const findArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);
