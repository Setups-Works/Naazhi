"use client";
import { useEffect, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";
import { BrandLogo, brandOf } from "@/components/ui/BrandLogo";
import { Logo, hasLogo } from "../../../components/site/Logo";
import { Button } from "@/components/ui/button";
import { OB, stepPath } from "../../../lib/onboarding";
import { useComposioStatus, useConnectComposio } from "../../integrations/composio";
import { useConnectNotion, useNotionStatus } from "../../integrations/notion";
import { Actions, Card, Lead, Soon, Tile, Title, type Ctx } from "../ui";

/**
 * Google Workspace and Notion connect right here (the same sign-in as Settings; the person comes back to this step). Everything else is
 * listed with what it will do and marked "Soon", and nothing marked "Soon" can be pressed.
 */
const Connected = () => <span className="rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] font-medium text-green-fg">Connected</span>;

/** The outcome of a sign-in the person just came back from (`?composio=` or `?notion=` in the address), shown once. */
function useSignInResult(param: "composio" | "notion", name: string) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get(param);
    if (!r) return;
    setResult(r === "connected" ? { ok: true, text: `${name} is connected.` } : { ok: false, text: sp.get("msg") || `${name} couldn’t be connected.` });
    window.history.replaceState(null, "", window.location.pathname);
  }, [param, name]);
  return result;
}

const Outcome = ({ result }: { result: { ok: boolean; text: string } | null }) =>
  result && (
    <p className={cn("m-0 mt-5 text-[14.5px]", result.ok ? "text-green-fg" : "text-clay-fg")} role={result.ok ? "status" : "alert"}>
      {result.text}
    </p>
  );

const ACCOUNTS: { name: string; covers: string; will: string[] }[] = [
  { name: "Google Workspace", covers: "Gmail, Calendar and Drive", will: ["Read your inbox and tell the real mail from the noise", "Show your calendar next to your to-dos", "Draft replies that you review before anything is sent"] },
  { name: "Microsoft 365", covers: "Outlook and Calendar", will: ["Read your Outlook inbox and flag what needs you", "Show your events beside your tasks", "Draft replies that you review before anything is sent"] },
  { name: "Zoho Workplace", covers: "Mail and Calendar", will: ["Bring Zoho Mail into the same inbox view", "Show your Zoho calendar with everything else", "Draft replies that you review before anything is sent"] },
];

export function Accounts({ ctx }: { ctx: Ctx }) {
  const [open, setOpen] = useState<string | null>(null);
  const google = useComposioStatus();
  const connect = useConnectComposio();
  const result = useSignInResult("composio", "Google");
  const googleOn = google.data?.apps.some((a) => a.state === "connected") ?? false;
  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-8">
      <Title>Connect the tools you use every day.</Title>
      <Lead>Naazhi will use them to understand what’s going on and help you stay on top of things.</Lead>
      <Lead className="mt-3">Nothing gets sent, booked or shared without your say.</Lead>

      <Outcome result={result} />
      {connect.error && (
        <p className="m-0 mt-5 text-[14.5px] text-clay-fg" role="alert">
          {connect.error.message}
        </p>
      )}
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
                {a.name === "Google Workspace" ? (
                  googleOn ? (
                    <Connected />
                  ) : (
                    <Button size="sm" disabled={connect.isPending || !google.data?.configured} onClick={() => connect.mutate({ returnTo: stepPath(OB.connect) })}>
                      {connect.isPending ? "Opening…" : "Connect"}
                    </Button>
                  )
                ) : (
                  <Soon />
                )}
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

      <Actions ctx={ctx} hideSkip note="Connecting is optional. Everything else in Naazhi works without it, and you can connect or disconnect any time in Settings." />
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
  const notion = useNotionStatus();
  const connect = useConnectNotion();
  const result = useSignInResult("notion", "Notion");
  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8">
      <Title>Want Naazhi to connect to other apps?</Title>
      <Lead>These are completely optional. Naazhi already has the essentials, and you can add apps whenever you need them.</Lead>
      <Outcome result={result} />
      {connect.error && (
        <p className="m-0 mt-5 text-[14.5px] text-clay-fg" role="alert">
          {connect.error.message}
        </p>
      )}
      <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
        {APPS.map(([name, what]) => (
          <li key={name}>
            <Card className="flex items-center gap-3.5 px-4 py-3.5">
              <Tile className="font-semibold">{hasLogo(name) ? <Logo name={name} size={22} /> : name.charAt(0)}</Tile>
              <span className="min-w-0 flex-1">
                <b className="block text-[15.5px] font-semibold text-fg">{name}</b>
                <span className="block truncate text-[13.5px] text-fg-subtle">{what}</span>
              </span>
              {name === "Notion" ? (
                notion.data?.connected ? (
                  <Connected />
                ) : (
                  <Button size="sm" disabled={connect.isPending || !notion.data?.configured} onClick={() => connect.mutate({ returnTo: stepPath(OB.apps) })}>
                    {connect.isPending ? "Opening…" : "Connect"}
                  </Button>
                )
              ) : (
                <Soon />
              )}
            </Card>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-4 text-[14px] text-fg-subtle">And many more. They’ll all be listed in Settings → Other apps.</p>
      <Actions ctx={ctx} hideSkip />
    </div>
  );
}
