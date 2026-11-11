"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";
import { BrandLogo, brandOf } from "@/components/ui/BrandLogo";
import { Logo, hasLogo } from "../../../components/site/Logo";
import { Actions, Card, Lead, Soon, Tile, Title, type Ctx } from "../ui";

/**
 * Mail and calendar connections are not built yet (docs/CURRENT_STATE.md), so this screen says so instead of pretending:
 * every service is listed with what it will do, marked "Soon", and nothing here can be pressed to connect.
 */
const ACCOUNTS: { name: string; covers: string; will: string[] }[] = [
  { name: "Google Workspace", covers: "Gmail, Calendar and Drive", will: ["Read your inbox and tell the real mail from the noise", "Show your calendar next to your to-dos", "Draft replies that you review before anything is sent"] },
  { name: "Microsoft 365", covers: "Outlook and Calendar", will: ["Read your Outlook inbox and flag what needs you", "Show your events beside your tasks", "Draft replies that you review before anything is sent"] },
  { name: "Zoho Workplace", covers: "Mail and Calendar", will: ["Bring Zoho Mail into the same inbox view", "Show your Zoho calendar with everything else", "Draft replies that you review before anything is sent"] },
];

export function Accounts({ ctx }: { ctx: Ctx }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-8">
      <Title>Connect the tools you use every day.</Title>
      <Lead>Naazhi will use them to understand what’s going on and help you stay on top of things.</Lead>
      <Lead className="mt-3">Nothing gets sent, booked or shared without your say.</Lead>

      <div className="mt-8 grid gap-3">
        {ACCOUNTS.map((a) => {
          const on = open === a.name;
          return (
            <Card key={a.name} className="overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <Tile className="text-[17px] font-semibold">{brandOf(a.name) ? <BrandLogo name={brandOf(a.name)!} size={22} wide={false} /> : a.name.charAt(0)}</Tile>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? null : a.name)}
                >
                  <span className="min-w-0 flex-1">
                    <b className="block text-[16.5px] font-semibold text-fg">{a.name}</b>
                    <span className="block text-[14.5px] text-fg-muted">{a.covers}</span>
                  </span>
                  <FA icon={faChevronDown} className={cn("text-[13px] text-fg-subtle transition-transform", on && "rotate-180")} />
                </button>
                <Soon />
              </div>
              {on && (
                <ul className="m-0 grid list-none gap-2 border-t px-5 py-4 text-[14.5px] text-fg-muted">
                  {a.will.map((w) => (
                    <li key={w}>· {w}</li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Actions ctx={ctx} hideSkip note="Connections aren’t open yet, so there’s nothing to connect today. Everything else in Naazhi works without them, and they’ll show up in Settings the day they’re ready." />
    </div>
  );
}

const APPS: [string, string][] = [
  ["GitHub", "Issues and pull requests"],
  ["Slack", "Channels and messages"],
  ["Notion", "Pages and databases"],
  ["Linear", "Issues and cycles"],
  ["HubSpot", "Contacts and deals"],
  ["Eventbrite", "Events and tickets"],
  ["Cloudflare", "Sites and DNS"],
  ["Zoom", "Meetings and recordings"],
];

export function Apps({ ctx }: { ctx: Ctx }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <Title>Want Naazhi to connect to other apps?</Title>
      <Lead>These are completely optional. Naazhi already has the essentials, and you can add apps whenever you need them.</Lead>
      <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
        {APPS.map(([name, what]) => (
          <li key={name}>
            <Card className="flex items-center gap-3.5 px-4 py-3.5">
              <Tile className="font-semibold">{hasLogo(name) ? <Logo name={name} size={22} /> : name.charAt(0)}</Tile>
              <span className="min-w-0 flex-1">
                <b className="block text-[15.5px] font-semibold text-fg">{name}</b>
                <span className="block truncate text-[13.5px] text-fg-subtle">{what}</span>
              </span>
              <Soon />
            </Card>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-4 text-[14px] text-fg-subtle">And many more. They’ll all be listed in Settings → Other apps.</p>
      <Actions ctx={ctx} hideSkip />
    </div>
  );
}
