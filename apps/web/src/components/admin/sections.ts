import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faChartPie,
  faUsers,
  faChartColumn,
  faWallet,
  faBullhorn,
  faPaperPlane,
  faServer,
  faClipboardList,
  faEnvelope,
  faFileLines,
  faPeopleGroup,
} from "@fortawesome/free-solid-svg-icons";

/** The admin sections, shown in the app's own sidebar while an /admin page is open. Add a line here for every new section (pages live in app/admin/<section>). */
export const ADMIN_SECTIONS: { href: string; t: string; icon: IconDefinition }[] = [
  { href: "/admin", t: "Overview", icon: faChartPie },
  { href: "/admin/users", t: "Users", icon: faUsers },
  { href: "/admin/usage", t: "Usage", icon: faChartColumn },
  { href: "/admin/plans", t: "Plans", icon: faWallet },
  { href: "/admin/invoices", t: "Invoices", icon: faFileLines },
  { href: "/admin/team", t: "Team", icon: faPeopleGroup },
  { href: "/admin/announcements", t: "Announcements", icon: faBullhorn },
  { href: "/admin/messages", t: "Messages", icon: faPaperPlane },
  { href: "/admin/emails", t: "Emails", icon: faEnvelope },
  { href: "/admin/system", t: "System", icon: faServer },
  { href: "/admin/audit", t: "Audit log", icon: faClipboardList },
];

export const adminSectionFor = (path: string) =>
  ADMIN_SECTIONS.find((s) => (s.href === "/admin" ? path === "/admin" : path.startsWith(s.href))) ?? ADMIN_SECTIONS[0];
