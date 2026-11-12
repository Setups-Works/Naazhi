"use client";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api/client";
import { qk } from "../../../lib/query/keys";
import { readPrefs, type Prefs } from "../../../lib/prefs";
import { usePrefsSave } from "../usePrefsSave";
import { Icon as FA } from "@/components/ui/Icon";
import { faCopy, faFolderOpen, faHeart, faHeartPulse, faLink, faMagnifyingGlass, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import Modal from "../../../components/ui/Modal";
import { useHealthDays } from "../../health/queries";
import { HEALTH_SOURCES, type HealthSource } from "../../health/sources";
import { Logo } from "../../../components/site/Logo";
import ConnectHealthDialog from "../../health/components/ConnectHealthDialog";
import { fromFileList, importSummary, importVault } from "../importVault";
import { AppRow, LogoTile, SettingsEmpty, SettingsNotice, SettingsRow, SettingsSection, Tag } from "../ui";

const SOON = "Not available yet";
const later = (what: string) => `${what} isn’t available yet. This page shows what you’ll be able to do.`;

/** Invites & earnings: the layout of the referral page; nothing is tracked until invite links exist. */
export function InvitesPage() {
  return (
    <>
      <SettingsNotice>{later("Invite links")}</SettingsNotice>
      <section className="mt-5 rounded-r3 border bg-raised p-6">
        <h2 className="m-0 text-[24px] leading-tight font-bold tracking-[-0.02em]">Invite friends</h2>
        <p className="m-0 mt-2 max-w-[520px] text-[15px] text-ink-2">Share your link and see who joined. Your link shows up here once invites open.</p>
        <div className="mt-5 flex items-center gap-3 rounded-r2 border bg-side py-1.5 pr-1.5 pl-3">
          <FA icon={faLink} className="text-[13px] text-ink-3" />
          <code className="min-w-0 flex-1 truncate font-mono text-[14px] text-ink-4">Your invite link will appear here</code>
          <Button disabled title={SOON}>
            <FA icon={faCopy} /> Copy
          </Button>
        </div>
        <Button variant="outline" className="mt-3" disabled title={SOON}>
          <FA icon={faShareNodes} /> Share
        </Button>
      </section>
      <div className="mt-5 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-r3 border bg-raised max-[600px]:grid-cols-1 max-[600px]:divide-x-0 max-[600px]:divide-y">
        {["Ready to withdraw", "In review", "Paid out so far"].map((l) => (
          <div key={l} className="px-5 py-4">
            <b className="block text-[26px] font-bold tracking-[-0.02em]">$0.00</b>
            <span className="text-[14px] text-ink-3">{l}</span>
          </div>
        ))}
      </div>
      <SettingsSection title="People you invited" note="0 counted">
        <SettingsEmpty>No one has signed up on your link yet.</SettingsEmpty>
      </SettingsSection>
      <SettingsSection title="Payouts">
        <SettingsRow title="Withdraw" description="Nothing to withdraw yet.">
          <Button disabled title={SOON}>
            Withdraw
          </Button>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Earnings">
        <SettingsEmpty>No earnings yet.</SettingsEmpty>
      </SettingsSection>
    </>
  );
}

/** Health: where your health data comes from (the phone app writes it) and whether the assistant may use it. Status is read from what has synced. */
export function HealthPage({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change, error } = usePrefsSave(initial);
  const { days, isPending } = useHealthDays(60);
  const [help, setHelp] = useState<HealthSource | null>(null);
  const last = (src: string) => days.find((d) => d.source === src)?.synced_at;
  const any = days.length > 0;
  return (
    <>
      {!any && !isPending && <SettingsNotice>Health data is read on your phone. Once you connect from the Naazhi phone app, it shows here and in Health.</SettingsNotice>}
      <SettingsSection title="Sources" note="Connected from the phone app">
        {HEALTH_SOURCES.map((s) => {
          const at = last(s.id);
          return (
            <AppRow
              key={s.id}
              name={s.name}
              description={s.description}
              logo={
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-r2 border bg-raised">
                  <Logo name={s.name} size={34} />
                </span>
              }
              extra={at ? <p className="m-0 mt-0.5 text-[13px] text-ink-3">Last synced {new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p> : undefined}
            >
              {at ? <span className="rounded-xs bg-green-bg px-2 py-0.5 text-[12.5px] text-green-fg">● Connected</span> : <Tag>Not connected</Tag>}
              <Button variant="outline" onClick={() => setHelp(s)}>
                How to connect
              </Button>
            </AppRow>
          );
        })}
      </SettingsSection>
      <SettingsSection title="Privacy">
        <SettingsRow
          title="Naazhi can use health data"
          description={prefs.healthAssistant ? "On. The chat assistant can read your last 30 days to answer questions and write about them. Turn it off any time." : "Off. Health still shows your numbers; the chat assistant can’t see them."}
        >
          <Switch checked={prefs.healthAssistant} onCheckedChange={(v) => change({ healthAssistant: v })} aria-label="Naazhi can use health data" />
        </SettingsRow>
      </SettingsSection>
      <p className="m-0 mt-3 px-1 text-[13.5px] text-ink-3">Apple and Google keep health data on your phone, so connecting can’t happen on the web.</p>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
      {help && <ConnectHealthDialog source={help} onClose={() => setHelp(null)} />}
    </>
  );
}

type App = [name: string, description: string, noSignIn?: boolean];
const APPS: [string, App[]][] = [
  ["Productivity", [["Airtable", "Bases, tables and records"], ["Asana", "Projects and tasks"], ["Box", "Files and folders in Box"], ["ClickUp", "Tasks, lists and spaces"], ["Confluence", "Pages and spaces"], ["Dropbox", "Files and folders in Dropbox"], ["Google Classroom", "Classes and coursework"], ["Jira", "Issues and projects"], ["Miro", "Boards and diagrams"], ["Notion", "Pages and databases"], ["SharePoint", "Sites and documents"], ["Trello", "Boards and cards"]]],
  ["Communication", [["Microsoft Teams", "Chats and channels"], ["Slack", "Channels and messages"], ["Slackbot", "Reminders and replies"], ["Zoom", "Meetings and recordings"]]],
  ["Business", [["Google Ads", "Campaigns and spend"], ["Google Search Console", "Search performance"], ["HubSpot", "Contacts and deals"], ["Intercom", "Conversations"], ["Salesforce", "Accounts and opportunities"], ["Zendesk", "Support tickets"]]],
  ["Finance", [["Gumroad", "Products and sales"], ["QuickBooks", "Books and invoices"], ["Stripe", "Payments and customers"]]],
  ["Developer", [["Bitbucket", "Repositories and pull requests"], ["Cloudflare", "Sites and DNS"], ["GitHub", "Repositories, issues and pull requests"], ["GitLab", "Projects and merge requests"], ["Linear", "Issues and cycles"], ["Sentry", "Errors and releases"]]],
  ["Media & lifestyle", [["Eventbrite", "Events and tickets"], ["Hacker News", "Top stories", true], ["OpenWeatherMap", "Weather anywhere", true], ["Reddit", "Subreddits and posts"]]],
];

export function OtherAppsPage() {
  const [q, setQ] = useState("");
  const total = APPS.reduce((n, [, a]) => n + a.length, 0);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return APPS.map(([g, apps]) => [g, apps.filter(([n, d]) => !t || n.toLowerCase().includes(t) || d.toLowerCase().includes(t))] as const).filter(([, a]) => a.length);
  }, [q]);
  return (
    <>
      <SettingsNotice>{later("Connecting apps")}</SettingsNotice>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="App categories">
        {APPS.map(([g, a]) => (
          <a key={g} href={`#apps-${g}`} className="inline-flex items-center gap-2 rounded-pill bg-hover px-3 py-1 text-[13.5px] text-ink-2 hover:text-ink">
            {g} <small className="text-ink-3">{a.length}</small>
          </a>
        ))}
      </nav>
      <div className="mt-4 flex items-center gap-4 max-[600px]:flex-wrap">
        <label className="relative min-w-0 flex-1">
          <FA icon={faMagnifyingGlass} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps" aria-label="Search apps" className="h-10 pl-9" />
        </label>
        <span className="text-[14px] text-ink-2">0 of {total} apps connected</span>
      </div>
      {shown.map(([g, apps]) => (
        <SettingsSection key={g} title={g} note={String(apps.length)}>
          <div id={`apps-${g}`} className="scroll-mt-4" />
          {apps.map(([n, d, free]) => (
            <AppRow key={n} name={n} description={d}>
              {free ? <span className="text-[13.5px] text-ink-3">No sign-in needed</span> : (
                <Button variant="outline" disabled title={SOON}>
                  Connect
                </Button>
              )}
            </AppRow>
          ))}
        </SettingsSection>
      ))}
      {shown.length === 0 && <p className="mt-6 text-center text-[14px] text-ink-3">No apps match “{q.trim()}”.</p>}
    </>
  );
}

/** Imports & backup: bring an Obsidian vault in as notes (folders kept, duplicates skipped). Other services need connections. */
export function ImportsPage({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change } = usePrefsSave(initial);
  const qc = useQueryClient();
  const sb = useMemo(api, []);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function runImport(list: FileList | null) {
    setBusy(true);
    setMsg("");
    try {
      const r = await importVault(sb, fromFileList(list), readPrefs().defaultCategory);
      setMsg(importSummary(r));
      if (r.imported > 0) {
        await change({ recentImports: [{ at: new Date().toISOString(), source: "Obsidian", notes: r.imported, folders: r.folders }, ...prefs.recentImports].slice(0, 10) });
        qc.invalidateQueries({ queryKey: qk.notes.all });
        qc.invalidateQueries({ queryKey: qk.notes.folders });
      }
    } catch {
      setMsg("Couldn’t finish that import. Some notes may already have been added.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <SettingsSection title="Import from">
        <AppRow name="Obsidian" description="Pick your vault’s root folder. Folders stay folders, [[links]] stay links, and duplicates are skipped.">
          <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>
            <FA icon={faFolderOpen} /> {busy ? "Importing…" : "Choose vault"}
          </Button>
          <input
            ref={input}
            type="file"
            hidden
            multiple
            // A folder picker: the browser hands back every file with its path inside the folder.
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => void runImport(e.target.files)}
          />
        </AppRow>
        <AppRow name="Notion" description="Import pages from Notion as notes.">
          <Button variant="outline" disabled title="Needs a Notion connection">
            Connect
          </Button>
        </AppRow>
      </SettingsSection>
      <p className="m-0 mt-3 px-1 text-[13.5px] text-ink-3" role="status">
        {msg || "Imports only read the files you pick, in your browser, and add them to your notes."}
      </p>
      <SettingsSection title="Recent imports">
        {prefs.recentImports.length === 0 ? (
          <SettingsEmpty>Nothing imported yet.</SettingsEmpty>
        ) : (
          prefs.recentImports.map((r) => (
            <SettingsRow
              key={r.at}
              title={r.source}
              description={`${r.notes} ${r.notes === 1 ? "note" : "notes"}${r.folders ? `, ${r.folders} new ${r.folders === 1 ? "folder" : "folders"}` : ""}`}
            >
              <span className="text-[13.5px] text-ink-3">{new Date(r.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            </SettingsRow>
          ))
        )}
      </SettingsSection>
      <SettingsSection title="Backup">
        <SettingsRow title="Export everything" description="Download your notes, tasks and journal under Your data in Settings. Automatic backup to Notion, Todoist or Google Drive needs those connections." />
      </SettingsSection>
    </>
  );
}
