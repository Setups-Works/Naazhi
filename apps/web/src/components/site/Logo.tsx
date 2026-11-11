import { ICONS } from "../../lib/logos";

const FILE: Record<string, string> = {
  Gmail: "gmail.svg",
  "Google Calendar": "google-calendar.svg",
  "Google Meet": "google-meet.svg",
  "Google Drive": "google-drive.svg",
  "Google Sheets": "google-sheets.svg",
  Maps: "maps.svg",
  Outlook: "outlook.svg",
  OneDrive: "onedrive.svg",
  "Microsoft To Do": "microsoft-todo.svg",
  Microsoft: "microsoft.svg",
  Google: "google.svg",
  Zoho: "zoho.svg",
  "Zoho Mail": "zoho-mail.svg",
  "Zoho Calendar": "zoho-calendar.svg",
  "Zoho Cliq": "zoho-cliq.svg",
  "Zoho WorkDrive": "zoho-workdrive.svg",
  "Zoho Projects": "zoho-projects.svg",
  "Zoho Sign": "zoho-sign.svg",
  "Zoho CRM": "zoho-crm.svg",
  "Zoho Books": "zoho-books.svg",
  "Zoho Billing": "zoho-billing.svg",
  "Zoho Expense": "zoho-expense.svg",
  "Zoho Desk": "zoho-desk.svg",
  "Zoho People": "zoho-people.svg",
  "Zoho Recruit": "zoho-recruit.svg",
  "Microsoft Teams": "microsoft-teams.svg",
  Slack: "slack.svg",
  Zoom: "zoom.svg",
  Notion: "notion.svg",
  GitHub: "github.svg",
  Linear: "linear.svg",
  Cloudflare: "cloudflare.svg",
  Eventbrite: "eventbrite.png",
};

/** True when `Logo` has a real logo for this name (otherwise it would draw the initial). */
export const hasLogo = (name: string) => name in FILE || name in ICONS;

/** A service's logo: an image from /public/logos, an inline brand mark, or its initial. */
export function Logo({ name, size = 24 }: { name: string; size?: number }) {
  const f = FILE[name];
  if (f)
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/logos/${f}`}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 object-contain ${f.endsWith(".png") ? "rounded-[6px]" : ""}`}
      />
    );
  const ic = ICONS[name];
  if (ic)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={ic.hex} aria-hidden className="shrink-0">
        <path d={ic.path} />
      </svg>
    );
  return <span className="font-semibold">{name[0]}</span>;
}
