"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBolt,
  faBriefcase,
  faDatabase,
  faEnvelope,
  faEnvelopeOpen,
  faFileImport,
  faFileLines,
  faHeartPulse,
  faChevronLeft,
  faGear,
  faTableCellsLarge,
  faKey,
  faLayerGroup,
  faListCheck,
  faMagnifyingGlass,
  faMobileScreen,
  faNoteSticky,
  faPalette,
  faPlug,
  faShieldHalved,
  faSliders,
  faTag,
  faTerminal,
  faTrash,
  faUser,
  faUserPlus,
  faWallet,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Badge } from "@/components/ui/badge";
import NotesSettings from "../../features/settings/pages/NotesSettings";
import { HealthPage, ImportsPage, InvitesPage, OtherAppsPage } from "../../features/settings/pages/ConnectionPages";
import { GooglePage, MicrosoftPage, ZohoPage } from "../../features/settings/pages/ProviderPages";
import { ApiKeysPage, EmailPage, LabelsPage, YouDoPage } from "../../features/settings/pages/AssistantPages";
import SidebarPortal from "./SidebarPortal";
import GeneralPage from "../../features/settings/pages/GeneralPage";
import TodoSettings from "../../features/settings/pages/TodoSettings";
import SkillsPage from "../../features/settings/pages/SkillsPage";
import LegalPage from "../../features/settings/pages/LegalPage";
import GetAppsPage from "../../features/settings/pages/GetAppsPage";
import ComingSoonPage from "../../features/settings/pages/ComingSoonPage";
import type { Prefs } from "../../lib/prefs";
import type { SettingsSection, SettingsTab } from "../../features/settings/tabs";
import SettingsView from "./SettingsView";

type Account = {
  name: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  hasPassword: boolean;
  providers: string[];
  createdAt: string;
  avatarUrl: string | null;
  lastSignIn: string | null;
};

/** `soon` lists what a page will do once it exists; such a tile opens a "Coming soon" page. */
type Tile = { k: SettingsSection; label: string; desc: string; icon: IconDefinition; soon?: string[] };

/** The Settings home: sections grouped under small labels, as tiles. Descriptions say what each page really holds. */
const GROUPS: { label: string; tiles: Tile[] }[] = [
  {
    label: "Account",
    tiles: [
      { k: "profile", label: "My account", desc: "Your name, photo, email and username.", icon: faUser },
      { k: "billing", label: "Plans & billing", desc: "Your plan, payments and AI access.", icon: faWallet },
      {
        k: "invites",
        label: "Invites & earnings",
        desc: "Invite friends and track what you’ve earned.",
        icon: faUserPlus,
        soon: ["Get a personal invite link to share", "See who signed up and what you’ve earned", "Withdraw your earnings once you pass the minimum"],
      },
    ],
  },
  {
    label: "Connections",
    tiles: [
      { k: "google", label: "Google", desc: "Gmail, Calendar and Drive accounts.", icon: faEnvelope, soon: ["Connect Gmail, Google Calendar and Drive", "Choose a primary account", "Disconnect an account at any time"] },
      { k: "microsoft", label: "Microsoft", desc: "Outlook mail, calendar, OneDrive and To Do.", icon: faBriefcase, soon: ["Connect Outlook mail and calendar", "Link OneDrive and Microsoft To Do"] },
      { k: "zoho", label: "Zoho", desc: "Zoho Mail, Calendar, WorkDrive and more.", icon: faLayerGroup, soon: ["Sign in once and pick the Zoho services you use"] },
      { k: "health", label: "Health", desc: "Steps, sleep and heart data from your phone.", icon: faHeartPulse },
      { k: "integrations", label: "Other apps", desc: "Slack, GitHub, Notion and other connected apps.", icon: faPlug, soon: ["Connect Slack, GitHub, Notion, Linear and more", "See which apps are connected"] },
      { k: "imports", label: "Imports & backup", desc: "Bring in notes and tasks, and back up your data.", icon: faFileImport },
    ],
  },
  {
    label: "Naazhi",
    tiles: [
      { k: "youdo", label: "YouDo", desc: "Automations that run on a schedule or when an email arrives.", icon: faBolt, soon: ["Describe an automation in a sentence", "Start from examples like a morning read or a Friday wrap-up", "See how many runs you have left this month"] },
      { k: "skills", label: "Skills", desc: "Slash commands and saved prompts.", icon: faTerminal },
      { k: "keys", label: "API keys", desc: "Use your own AI and transcription provider keys.", icon: faKey },
    ],
  },
  {
    label: "Preferences",
    tiles: [
      { k: "prefs", label: "General", desc: "Time format, week start and defaults for new items.", icon: faSliders },
      { k: "appearance", label: "Appearance", desc: "Color scheme, accent, density and motion.", icon: faPalette },
      { k: "notes", label: "Notes", desc: "How new notes open.", icon: faNoteSticky },
      { k: "todo", label: "To-do", desc: "What happens to finished and cancelled tasks.", icon: faListCheck },
      { k: "email", label: "Email", desc: "Undo send, signatures and footers.", icon: faEnvelopeOpen },
      { k: "labels", label: "Excluded labels", desc: "Mail labels Naazhi should ignore.", icon: faTag },
    ],
  },
  {
    label: "Privacy & security",
    tiles: [
      { k: "security", label: "Security", desc: "Password, passkeys and signed-in devices.", icon: faShieldHalved },
      { k: "data", label: "Your data", desc: "Download a copy of everything you’ve written.", icon: faDatabase },
      { k: "danger", label: "Delete account", desc: "Permanently delete your account and data.", icon: faTrash },
    ],
  },
  {
    label: "About",
    tiles: [
      { k: "apps", label: "Get apps & extension", desc: "Naazhi on your phone.", icon: faMobileScreen },
      { k: "legal", label: "Legal", desc: "Terms, privacy and refund policy.", icon: faFileLines },
    ],
  },
];
const TILES = GROUPS.flatMap((g) => g.tiles.map((t) => ({ ...t, group: g.label })));

/**
 * Settings, as a full-page layer over the app (the sidebar rail stays in view). Its home is a searchable grid of sections;
 * a section opens as its own page with a "Settings / Group / Section" breadcrumb. Radix Dialog handles the focus trap,
 * Escape (including when a confirm dialog is stacked on top), scroll lock and focus restore.
 */
export default function SettingsModal({
  account,
  prefs,
  tab,
  onTab,
  onClose,
}: {
  account: Account;
  prefs: Prefs;
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return GROUPS;
    return GROUPS.map((g) => ({ ...g, tiles: g.tiles.filter((x) => `${x.label} ${x.desc}`.toLowerCase().includes(t)) })).filter(
      (g) => g.tiles.length,
    );
  }, [q]);
  const here = tab === "home" ? null : TILES.find((t) => t.k === tab);

  return (
    <>
      <SidebarPortal>
        <nav className="sbs-nav sbt" aria-label="Settings sections">
          <label className="sbs-search">
            <FA icon={faMagnifyingGlass} />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (tab !== "home") onTab("home");
              }}
              placeholder="Search settings"
              aria-label="Search settings"
            />
          </label>
          <button type="button" className="sbt-item" data-on={tab === "home"} aria-current={tab === "home" ? "page" : undefined} onClick={() => onTab("home")}>
            <FA icon={faTableCellsLarge} /> <span>All settings</span>
          </button>
          {shown.map((g) => (
            <div key={g.label} className="sbs-group">
              <h3>{g.label}</h3>
              {g.tiles.map((t) => (
                <button key={t.k} type="button" className="sbt-item" data-on={tab === t.k} aria-current={tab === t.k ? "page" : undefined} onClick={() => onTab(t.k)}>
                  <FA icon={t.icon} /> <span>{t.label}</span>
                </button>
              ))}
            </div>
          ))}
          {shown.length === 0 && <p className="sbt-hint">No settings match.</p>}
          <div className="sbs-exit">
            <button type="button" className="sbt-item" onClick={onClose}>
              <FA icon={faChevronLeft} /> <span>Exit settings</span>
            </button>
          </div>
        </nav>
      </SidebarPortal>
    {/* Not modal: the sidebar beside it stays usable (it is the Settings menu while this is open). */}
    <Dialog.Root
      modal={false}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="sm-back">
          <Dialog.Content
            className="sm"
            aria-describedby={undefined}
            onInteractOutside={(e) => e.preventDefault()}
            onFocusOutside={(e) => e.preventDefault()}
          >
            <div className="sm-head">
              {here ? (
                <nav aria-label="Breadcrumb" className="sm-crumbs">
                  <FA icon={faGear} />
                  <button type="button" onClick={() => onTab("home")}>
                    Settings
                  </button>
                  <span aria-hidden>/</span>
                  <button type="button" onClick={() => onTab("home")}>
                    {here.group}
                  </button>
                  <span aria-hidden>/</span>
                  <span aria-current="page">{here.label}</span>
                </nav>
              ) : (
                <nav aria-label="Breadcrumb" className="sm-crumbs">
                  <FA icon={faGear} />
                  <span aria-current="page">Settings</span>
                </nav>
              )}
            </div>
            <div className="sm-body">
              {here ? (
                <div className="sm-page">
                  <Dialog.Title className="sm-h1">{here.label}</Dialog.Title>
                  <p className="sm-sub">{here.desc}</p>
                  {here.k === "invites" ? (
                    <InvitesPage />
                  ) : here.k === "google" ? (
                    <GooglePage />
                  ) : here.k === "microsoft" ? (
                    <MicrosoftPage />
                  ) : here.k === "zoho" ? (
                    <ZohoPage />
                  ) : here.k === "health" ? (
                    <HealthPage prefs={prefs} />
                  ) : here.k === "integrations" ? (
                    <OtherAppsPage />
                  ) : here.k === "imports" ? (
                    <ImportsPage prefs={prefs} />
                  ) : here.k === "youdo" ? (
                    <YouDoPage />
                  ) : here.k === "keys" ? (
                    <ApiKeysPage />
                  ) : here.k === "labels" ? (
                    <LabelsPage prefs={prefs} />
                  ) : here.k === "email" ? (
                    <EmailPage prefs={prefs} />
                  ) : here.soon ? (
                    <ComingSoonPage points={here.soon} />
                  ) : here.k === "skills" ? (
                    <SkillsPage />
                  ) : here.k === "prefs" ? (
                    <GeneralPage prefs={prefs} />
                  ) : here.k === "notes" ? (
                    <NotesSettings prefs={prefs} />
                  ) : here.k === "todo" ? (
                    <TodoSettings prefs={prefs} />
                  ) : here.k === "legal" ? (
                    <LegalPage />
                  ) : here.k === "apps" ? (
                    <GetAppsPage />
                  ) : (
                    <SettingsView account={account} prefs={prefs} tab={here.k} onTab={onTab} />
                  )}
                </div>
              ) : (
                <div className="sm-page sm-home">
                  <Dialog.Title className="sm-h1">Settings</Dialog.Title>
                  <label className="sm-search">
                    <FA icon={faMagnifyingGlass} />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" aria-label="Search settings" />
                  </label>
                  {shown.map((g) => (
                    <section key={g.label} aria-label={g.label}>
                      <h2 className="sm-group">{g.label}</h2>
                      <ul className="sm-tiles">
                        {g.tiles.map((t) => (
                          <li key={t.k}>
                            <button type="button" className="sm-tile" data-danger={t.k === "danger"} onClick={() => onTab(t.k)}>
                              <FA icon={t.icon} />
                              <span>
                                <b>
                                  {t.label} {t.soon && <Badge variant="secondary" className="ml-1 align-middle text-[11px] font-normal">Soon</Badge>}
                                </b>
                                <small>{t.desc}</small>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                  {shown.length === 0 && <p className="sm-none">No settings match “{q.trim()}”.</p>}
                </div>
              )}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
