/**
 * The "Naazhi vs …" pages. One shape, two pages, so the layout and the honesty rules are the same. Wording follows docs/BRAND.md. Rules for the
 * text: say what the other product is good at, say what Naazhi does not do yet, claim nothing about the other product we can't
 * check on its public pages, and keep numbers and prices out (they go stale). The date below is when the claims were last checked.
 */
export const COMPARED_ON_ISO = "2026-11-15";

export type Row = { label: string; naazhi: string; other: string };

export type Comparison = {
  slug: "notion" | "obsidian";
  /** The other product's name, as it writes it. */
  other: string;
  path: string;
  seo: { title: string; description: string };
  hero: { title: string; quiet: string; lead: string };
  /** One sentence each: what the other product is, and what Naazhi is next to it. */
  summary: { other: string; naazhi: string };
  rows: Row[];
  chooseOther: string[];
  chooseNaazhi: string[];
  /** The honest list of what Naazhi does not do (yet). */
  gaps: string[];
  faqs: [string, string][];
  og: { line1: string; line2: string; sub: string; chips: string[] };
};

export const COMPARISONS: Record<Comparison["slug"], Comparison> = {
  notion: {
    slug: "notion",
    other: "Notion",
    path: "/compare/notion",
    seo: {
      title: "Naazhi vs Notion — an honest comparison",
      description: "Naazhi and Notion side by side: notes, tasks, journal, calendar, AI and connected apps, where each is stronger, and how to move your Notion pages over.",
    },
    hero: {
      title: "Naazhi vs Notion,",
      quiet: "side by side.",
      lead: "Both keep your notes and plans in one place. Notion is a build-your-own workspace for teams. Naazhi is a ready-made personal workspace where the AI is yours to choose. Here is how they differ, including where Notion is the better pick.",
    },
    summary: {
      other: "Notion is a flexible workspace of pages and databases, strong for team wikis, projects and anything you want to design yourself.",
      naazhi: "Naazhi is one workspace for notes, to-dos, journal, calendar and chat that works the moment you open it, with AI you can swap, bring your own key to, or switch off.",
    },
    rows: [
      { label: "Notes and pages", naazhi: "Rich notes with colours, slash commands, voice, attachments, version history, Trash and an Atlas that maps how notes connect.", other: "Pages with blocks, nested pages and a very wide set of block types." },
      { label: "Tasks, journal and calendar", naazhi: "Built in and ready: repeating to-dos with reminders, a private journal and a calendar, without setting anything up.", other: "You build them from databases and views, which is powerful and takes setup." },
      { label: "Databases and wikis", naazhi: "Not a database tool. There are no custom tables or relations.", other: "A strength: databases, relations, views and team wikis." },
      { label: "AI", naazhi: "Your choice: a built-in provider, your own key, a provider account you already pay for, or no AI at all. The workspace works the same with it off. Your journal and health data are never sent to an AI provider.", other: "Built-in AI features from Notion itself." },
      { label: "Connected apps", naazhi: "Gmail, Google Calendar and Google Drive with one sign-in, and Zoho apps, asked about from chat. Drafts wait for your button press.", other: "A large set of integrations and an open API." },
      { label: "Working with other people", naazhi: "Shared journals by invitation, and public links to notes and chats. Shared team workspaces are planned, not built.", other: "A strength: shared workspaces, permissions and comments for teams." },
      { label: "Where you use it", naazhi: "Web, Android, and Mac and Windows apps. The iPhone and iPad app is planned.", other: "Web, desktop and mobile apps on the main platforms." },
      { label: "Moving over", naazhi: "Import your Notion pages as notes from Settings, then Imports and backup. Pages you already imported are skipped. Databases and images are planned.", other: "Notion can export your content." },
    ],
    chooseOther: [
      "You run a team that works in shared wikis, databases and project boards.",
      "You like designing your own system out of databases and views.",
      "You need fine-grained sharing and permissions with many people.",
    ],
    chooseNaazhi: [
      "You want notes, to-dos, journal and calendar working together without building them first.",
      "You want to choose, bring or turn off the AI, and keep your journal out of it.",
      "You want to ask about your Gmail, Calendar, Drive or Zoho from the same chat as your notes.",
    ],
    gaps: ["Custom databases and relations.", "Shared team workspaces with permissions (planned).", "An iPhone and iPad app (planned)."],
    faqs: [
      ["Can I move my Notion pages to Naazhi?", "Yes. In Naazhi open Settings, then Imports and backup, and press Connect Notion. You sign in on Notion’s own page and choose which pages to share, then pick the ones to import. Each becomes a note. Importing again skips pages you already brought over. Notion databases and the pictures on your pages are planned."],
      ["Is Naazhi a replacement for Notion?", "For one person’s notes, to-dos, journal and calendar, it can be. For team wikis and custom databases, Notion is the stronger tool today, and we say so."],
      ["Does Naazhi use AI like Notion does?", "Naazhi has an AI chat, but it is optional and yours to choose: a built-in provider, your own key or no AI. With AI off the workspace works the same."],
      ["Will Notion still work after I import?", "Yes. Naazhi only reads the pages you share and never changes anything in Notion."],
    ],
    og: { line1: "Naazhi vs", line2: "Notion.", sub: "An honest comparison, and how to move your pages over.", chips: ["Notes", "Tasks", "AI your way", "Import"] },
  },
  obsidian: {
    slug: "obsidian",
    other: "Obsidian",
    path: "/compare/obsidian",
    seo: {
      title: "Naazhi vs Obsidian — an honest comparison",
      description: "Naazhi and Obsidian side by side: where your notes live, plugins, graph, tasks, journal, calendar, AI and sync. Where each is stronger.",
    },
    hero: {
      title: "Naazhi vs Obsidian,",
      quiet: "side by side.",
      lead: "Obsidian keeps notes as plain Markdown files on your computer and grows through plugins. Naazhi keeps your notes, to-dos, journal and calendar in one account that follows you between devices. Here is how they differ, including where Obsidian is the better pick.",
    },
    summary: {
      other: "Obsidian is a local-first Markdown editor: your notes are files in a folder you own, extended by a large community of plugins.",
      naazhi: "Naazhi is an account-based workspace for notes, to-dos, journal, calendar and chat, with the same data on web, phone and desktop, and AI you can swap or switch off.",
    },
    rows: [
      { label: "Where your notes live", naazhi: "In your Naazhi account, in sync on web, Android, and Mac and Windows. You can download your notes, tasks and journal from Settings.", other: "As Markdown files in a folder on your own device, which you can open with any other tool." },
      { label: "Works offline", naazhi: "The web, app and desktop apps need a connection to load and save your data.", other: "A strength: it works fully offline on your files." },
      { label: "Extending it", naazhi: "No plugin system. Features come from us, and you can ask for one on the feature-request page.", other: "A strength: a large community plugin library and themes." },
      { label: "Links and graph", naazhi: "Notes link to each other and an Atlas maps how they connect.", other: "A strength: backlinks and a mature graph view." },
      { label: "Tasks, journal and calendar", naazhi: "Built in: repeating to-dos with reminders, a private journal and a calendar, on the phone too.", other: "Through plugins and your own setup." },
      { label: "AI", naazhi: "A chat that can create to-dos, notes and journal entries after you confirm, with a provider of your choice, your own key, or none. Your journal and health data never go to an AI provider.", other: "Through community plugins that you configure." },
      { label: "Connected apps", naazhi: "Gmail, Google Calendar and Google Drive with one sign-in, and Zoho apps, asked about from chat.", other: "Through plugins." },
      { label: "Syncing devices", naazhi: "Included: sign in on any device.", other: "Through Obsidian’s own paid sync or a method you set up yourself." },
      { label: "Where you use it", naazhi: "Web, Android, and Mac and Windows apps. The iPhone and iPad app is planned.", other: "Desktop and mobile apps on the main platforms." },
    ],
    chooseOther: [
      "You want your notes as plain files you fully own and can open anywhere.",
      "You need to work offline, or want to tune everything with plugins and themes.",
      "You already have a vault you love and a sync method that works.",
    ],
    chooseNaazhi: [
      "You want notes, to-dos, journal and calendar working together with nothing to configure.",
      "You want the same data on your phone, your computer and the web without setting up sync.",
      "You want an AI chat you can choose, bring your own key to, or switch off, next to your Gmail, Calendar and Drive.",
    ],
    gaps: ["Plugins and themes.", "Working fully offline.", "Notes as plain files in a folder you hold (you can download an export).", "An iPhone and iPad app (planned)."],
    faqs: [
      ["Can I move my Obsidian notes to Naazhi?", "Naazhi imports from Notion today. For Obsidian, copy a note’s text into a new note for now, or tell us on the feature-request page that a Markdown import would help you."],
      ["Which is better for privacy?", "Obsidian keeps your files on your own device, which is the strongest form of ownership. Naazhi stores your data in your account, keeps your journal private by design, never sends your journal or health data to an AI provider, and lets you turn AI off completely."],
      ["Does Naazhi sync between my phone and computer?", "Yes. It is one account, so your notes, to-dos, journal and calendar are the same on the web, the Android app and the Mac and Windows apps."],
      ["Can I use both?", "Yes. Many people keep long-term files in Obsidian and use Naazhi for daily notes, to-dos, the journal and the calendar."],
    ],
    og: { line1: "Naazhi vs", line2: "Obsidian.", sub: "Local Markdown files, or one account on every device.", chips: ["Notes", "Journal", "Sync", "AI your way"] },
  },
};

export const COMPARISON_ORDER = ["notion", "obsidian"] as const;
