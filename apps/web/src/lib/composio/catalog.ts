/**
 * The accounts a person can connect and the services each one covers, in the groups the connect dialog shows. `access` is the plain
 * sentence under "What Naazhi can see". One list, shared by the Settings pages and the connection service once it exists.
 */
export type ProviderId = "google" | "microsoft" | "zoho";

export type ProviderService = { id: string; name: string; description: string; access: string };
export type ProviderGroup = { label: string; services: ProviderService[] };
export type Provider = {
  id: ProviderId;
  name: string;
  /** The Settings page subtitle. */
  blurb: string;
  /** What the Accounts header says beside "Accounts". */
  covers: string;
  /** Empty-state sentence under "No … account connected". */
  invite: string;
  /** Where sign-in happens, for the reassurance line. */
  signIn: string;
  groups: ProviderGroup[];
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  google: {
    id: "google",
    name: "Google",
    blurb: "The Google accounts Naazhi works with.",
    covers: "Gmail, Calendar and Drive",
    invite: "Connect one so Naazhi can help with email, calendar and Drive.",
    signIn: "Google’s own page",
    groups: [
      {
        label: "Communication",
        services: [
          { id: "gmail", name: "Gmail", description: "Search, sort and draft replies to your email", access: "Read, search and label your email, and send it when you ask. It can’t permanently delete mail." },
          { id: "calendar", name: "Google Calendar", description: "Check your schedule and book events", access: "See every calendar on the account and create, change or cancel events." },
        ],
      },
      { label: "Work", services: [{ id: "drive", name: "Google Drive", description: "Find, read and create files, Docs and Sheets", access: "Open, search, create and edit files in your Drive, including Docs and Sheets." }] },
    ],
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    blurb: "Outlook mail, calendar, OneDrive and To Do.",
    covers: "Mail, Calendar, To Do and OneDrive connect separately",
    invite: "Connect one so Naazhi can help with Outlook, your calendar, OneDrive and Microsoft To Do.",
    signIn: "Microsoft’s own page",
    groups: [
      {
        label: "Communication",
        services: [
          { id: "outlook", name: "Outlook mail", description: "Search, sort and draft replies to your email", access: "Read, search and label your email, and send it when you ask." },
          { id: "outlook-calendar", name: "Outlook calendar", description: "Check your schedule and book events", access: "See your calendars and create, change or cancel events." },
        ],
      },
      {
        label: "Work",
        services: [
          { id: "onedrive", name: "OneDrive", description: "Find and read your files", access: "Open and search files in your OneDrive." },
          { id: "todo", name: "Microsoft To Do", description: "See and add tasks", access: "Read your lists and add or complete tasks." },
        ],
      },
    ],
  },
  zoho: {
    id: "zoho",
    name: "Zoho",
    blurb: "Zoho Mail, Calendar, WorkDrive and more.",
    covers: "One Zoho sign-in covers every service you pick",
    invite: "Connect one sign-in and pick the Zoho services you use.",
    signIn: "Zoho’s own page",
    groups: [
      {
        label: "Communication",
        services: [
          { id: "mail", name: "Zoho Mail", description: "Email", access: "Read, search and draft email." },
          { id: "calendar", name: "Zoho Calendar", description: "Events and schedules", access: "See and create events." },
          { id: "cliq", name: "Zoho Cliq", description: "Team chat", access: "Read and send chat messages when you ask." },
        ],
      },
      {
        label: "Work",
        services: [
          { id: "workdrive", name: "Zoho WorkDrive", description: "Files and folders", access: "Open and search files." },
          { id: "projects", name: "Zoho Projects", description: "Projects and tasks", access: "Read projects and add tasks." },
          { id: "sign", name: "Zoho Sign", description: "Documents to sign", access: "See documents waiting for a signature." },
        ],
      },
      {
        label: "Business",
        services: [
          { id: "crm", name: "Zoho CRM", description: "Leads and deals", access: "Read leads and deals." },
          { id: "books", name: "Zoho Books", description: "Accounting", access: "Read invoices, bills and products." },
          { id: "billing", name: "Zoho Billing", description: "Subscriptions and invoices", access: "Read subscriptions and invoices." },
          { id: "expense", name: "Zoho Expense", description: "Expenses and reports", access: "Read expense reports." },
          { id: "desk", name: "Zoho Desk", description: "Support tickets", access: "Read and reply to tickets when you ask." },
        ],
      },
      {
        label: "People and hiring",
        services: [
          { id: "people", name: "Zoho People", description: "HR and time off", access: "Read time-off and team information." },
          { id: "recruit", name: "Zoho Recruit", description: "Hiring", access: "Read job openings and candidates." },
        ],
      },
    ],
  },
};
