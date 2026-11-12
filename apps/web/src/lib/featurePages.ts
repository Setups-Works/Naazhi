import {
  faBookOpen,
  faCalendarDays,
  faClockRotateLeft,
  faFileExport,
  faListCheck,
  faLock,
  faMagnifyingGlass,
  faMicrophone,
  faPaperclip,
  faPenToSquare,
  faShareNodes,
  faTableColumns,
  faUserGroup,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

/*
 * The words and pictures of the feature pages (/features/notes, /features/tasks, /features/journal). Each claim here restates what the
 * landing content already says about the product (components/site/content.ts, docs/CURRENT_STATE.md); change the product first, then this.
 */

export type Shot = { src: string; alt: string };
export type FeatureSlug = "notes" | "tasks" | "journal";

export type FeaturePageData = {
  slug: FeatureSlug;
  /** The path of the page. */
  path: `/features/${FeatureSlug}`;
  name: string;
  seo: { title: string; description: string };
  hero: { title: string; quiet: string; lead: string; screens: readonly [string, string, string] };
  /** The "what you get" cards. */
  points: readonly { icon: IconDefinition; t: string; d: string }[];
  /** Two device sections, text beside a picture. */
  showcase: readonly { kicker: string; title: string; quiet: string; lead: string; bullets: readonly string[]; shot: Shot }[];
  /** Keyboard shortcut group to list (see SHORTCUTS), when the feature has one. */
  shortcutGroup?: string;
  faq: readonly (readonly [string, string])[];
  related: readonly FeatureSlug[];
};

export const FEATURE_PAGES: Record<FeatureSlug, FeaturePageData> = {
  notes: {
    slug: "notes",
    path: "/features/notes",
    name: "Notes",
    seo: {
      title: "Notes — Naazhi",
      description:
        "Rich notes with colours, slash commands, voice and attachments, version history, a Trash you can restore from, and an Atlas that shows how your notes connect.",
    },
    hero: {
      title: "Notes that",
      quiet: "keep up with you.",
      lead: "Write with colours and slash commands, dictate instead of typing, and keep the files a note needs inside the note. Every version is kept, and nothing is gone for good until you say so.",
      screens: ["/mobile/notes-2.png", "/mobile/home-2.png", "/mobile/calendar.png"],
    },
    points: [
      { icon: faPenToSquare, t: "Rich notes", d: "Give each note a colour and drag them into the order you want." },
      { icon: faWandMagicSparkles, t: "Slash commands", d: "Type / to format as you write, without reaching for a toolbar." },
      { icon: faMicrophone, t: "Dictate", d: "Speak and watch it turn into text." },
      { icon: faPaperclip, t: "Attachments", d: "Keep the files and images a note needs inside the note." },
      { icon: faClockRotateLeft, t: "Version history", d: "Go back to an earlier version whenever you need to." },
      { icon: faFileExport, t: "Export as Markdown", d: "Your notes are yours to take with you, from Settings." },
    ],
    showcase: [
      {
        kicker: "Write",
        title: "Everything a note needs,",
        quiet: "in the note.",
        lead: "A note is more than text. Colour it, attach to it, speak into it, and find it again from one search box.",
        bullets: [
          "Colours, slash commands, voice and attachments",
          "Pin a note to keep it at the top of your Notes",
          "Search it with ⌘K, together with your tasks, journal and chats",
        ],
        shot: { src: "/mobile/notes-2.png", alt: "The Notes page in the Naazhi app" },
      },
      {
        kicker: "Keep",
        title: "Nothing is lost,",
        quiet: "and it can come back.",
        lead: "Deleted notes wait in a Trash you can restore from, and version history lets you step back to an earlier draft.",
        bullets: [
          "A Trash you can restore from",
          "Version history for every note",
          "An Atlas that maps how your notes connect",
          "Bring an Obsidian vault in, and export as Markdown",
        ],
        shot: { src: "/mobile/home-2.png", alt: "Recent notes on Home in the Naazhi app" },
      },
    ],
    faq: [
      [
        "Can I get an older version of a note back?",
        "Yes. Version history lets you go back to an earlier version whenever you need to, and deleted notes wait in a Trash you can restore from.",
      ],
      [
        "Can I bring my existing notes in, and take them out again?",
        "Yes. Bring an Obsidian vault in as notes (folders stay folders, and duplicates are skipped), and export your notes as Markdown from Settings. Importing from Notion is planned.",
      ],
      ["Can I write notes by voice?", "Yes. Dictate a note and watch it turn into text, instead of typing."],
      ["What is the Atlas?", "A map of how your notes connect, so you can see what a note links to and what links back to it."],
    ],
    related: ["tasks", "journal"],
  },

  tasks: {
    slug: "tasks",
    path: "/features/tasks",
    name: "Tasks",
    seo: {
      title: "Tasks — Naazhi",
      description:
        "Lists, priorities and repeats, in a list, board or calendar view, with keyboard shortcuts for everything. Plan your day, then do it.",
    },
    hero: {
      title: "Plan your day.",
      quiet: "Then do it.",
      lead: "Sort work into lists, set a priority from urgent to low, and repeat what repeats. See it as a list, a board or a calendar, whichever suits the day.",
      screens: ["/mobile/calendar.png", "/mobile/todo-2.png", "/mobile/home-2.png"],
    },
    points: [
      { icon: faListCheck, t: "Lists and priorities", d: "Sort work into lists and set priority from urgent to low." },
      { icon: faClockRotateLeft, t: "Repeats", d: "Daily, weekly or on the 2nd Wednesday. Finish one and the next appears." },
      { icon: faTableColumns, t: "Three ways to look", d: "List, board or calendar, whichever suits the day." },
      { icon: faMagnifyingGlass, t: "Keyboard first", d: "Q to add, G then T for today, 1 to 4 for priority." },
    ],
    showcase: [
      {
        kicker: "Today",
        title: "Add it in a second,",
        quiet: "tick it off in one more.",
        lead: "Quick add sits at the top of Today, so a task takes one line. Tick it off when it is done.",
        bullets: ["Quick add on Today", "Inbox, Today, Upcoming and Overdue", "Priorities from urgent to low"],
        shot: { src: "/mobile/todo-2.png", alt: "The To-do page in the Naazhi app" },
      },
      {
        kicker: "Calendar",
        title: "Your tasks,",
        quiet: "laid over your month.",
        lead: "Tasks with a due date appear beside your events on the calendar. Switch them off any time.",
        bullets: ["Month, week, day and agenda views", "Tasks beside your events", "A dot marks the days with something due"],
        shot: { src: "/mobile/calendar.png", alt: "The Calendar page in the Naazhi app" },
      },
    ],
    shortcutGroup: "Tasks",
    faq: [
      ["What can repeat, and how?", "Daily, weekly or on the 2nd Wednesday, for example. When you finish one, the next appears."],
      [
        "Can I see my tasks on a calendar?",
        "Yes. Tasks with a due date appear beside your events on the calendar, and you can toggle them off any time.",
      ],
      [
        "Are there keyboard shortcuts?",
        "Yes. Q adds a task, G then T goes to Today, 1 to 4 set the priority and E edits the focused task.",
      ],
      [
        "Does search find my tasks?",
        "Yes. Universal search looks across your tasks, notes, journal and chats from one box. Press ⌘K anywhere.",
      ],
    ],
    related: ["notes", "journal"],
  },

  journal: {
    slug: "journal",
    path: "/features/journal",
    name: "Journal",
    seo: {
      title: "Journal — Naazhi",
      description:
        "A private journal with many entries a day, voice and attachments, browsing by calendar, and shared journals you write together with people you invite.",
    },
    hero: {
      title: "A journal that’s",
      quiet: "only yours.",
      lead: "Write as often as you think of something, by typing or by voice, and keep photos and files with the entry. It is private to you. When you want company, start a shared journal.",
      screens: ["/mobile/journal-2.png", "/mobile/collab-phone.png", "/mobile/home-2.png"],
    },
    points: [
      { icon: faBookOpen, t: "Many entries a day", d: "Write as often as you think of something." },
      { icon: faLock, t: "Private to you", d: "Your journal is kept apart from the rest of the workspace." },
      { icon: faMicrophone, t: "Voice and attachments", d: "Dictate an entry or attach a photo or file." },
      { icon: faCalendarDays, t: "Browse by calendar", d: "Jump to any day and see what you wrote." },
      { icon: faUserGroup, t: "Write together", d: "Start a shared journal and write in it with the people you invite." },
      { icon: faShareNodes, t: "Editor or viewer", d: "Choose who can write and who can only read. The owner can change it at any time." },
    ],
    showcase: [
      {
        kicker: "Personal",
        title: "Write it down,",
        quiet: "as often as you like.",
        lead: "Each entry is stamped with its time, so a day can hold as many as you want. Dictate one, or attach a photo.",
        bullets: ["Many entries a day", "Voice and attachments", "Browse by calendar"],
        shot: { src: "/mobile/journal-2.png", alt: "The Journal page in the Naazhi app" },
      },
      {
        kicker: "Shared",
        title: "A journal you write",
        quiet: "together.",
        lead: "Start a shared journal for a trip, a project or a family. People join only after they accept, and your personal journal stays private to you.",
        bullets: ["Invite by username or email", "Editor or viewer, changeable any time", "Photos and files, and who wrote what"],
        shot: { src: "/mobile/collab-phone.png", alt: "Shared journals in the Naazhi app" },
      },
    ],
    faq: [
      ["Is my journal private?", "Yes. Journal entries are private to their author, kept apart from the rest of the workspace."],
      [
        "Can I write a journal with someone else?",
        "Yes. Start a shared journal and invite people by username or email. Each person can be an editor or a viewer, and they join only after they accept. Your personal journal stays private to you.",
      ],
      ["Can I add photos and voice?", "Yes. Dictate an entry, or attach a photo or file to it."],
      ["Can I find an old entry?", "Yes. Browse by calendar to jump to any day, or search across your journal with ⌘K."],
    ],
    related: ["notes", "tasks"],
  },
};

export const FEATURE_ORDER: readonly FeatureSlug[] = ["notes", "tasks", "journal"];

/** A short line for each page, used by the "related" cards and the menus. */
export const FEATURE_BLURB: Record<FeatureSlug, { icon: IconDefinition; d: string }> = {
  notes: { icon: faPenToSquare, d: "Think, write and organize." },
  tasks: { icon: faListCheck, d: "Plan your day, then do it." },
  journal: { icon: faBookOpen, d: "A private record of your days." },
};
