"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Logo } from "../../../components/site/Logo";
import { useConfirm } from "../../../components/ui/Confirm";
import { PROVIDERS, type ProviderId } from "../../../lib/composio/catalog";
import { COMPOSIO_APPS, composioAppFor, isComposioApp, type ComposioAppStatus } from "../../../lib/composio/apps";
import { useComposioStatus, useConnectComposio, useDisconnectComposio } from "../../integrations/composio";
import { SettingsNotice, Tag } from "../ui";

/** What a connection's state means to the person, under the app's name. */
function stateLine(s: ComposioAppStatus): string {
  if (s.state === "connected") return s.account ? `Connected as ${s.account}` : "Connected";
  if (s.state === "expired" || s.state === "error") return "Stopped working. Reconnect to use it again.";
  if (s.state === "pending") return "The sign-in didn’t finish.";
  return s.available ? "Not connected" : "Not set up on this server yet";
}

/** One app on the page: its logo, its state and the one button that fits that state. */
function AppConnection({ status, name, logo }: { status: ComposioAppStatus; name: string; logo: string }) {
  const connect = useConnectComposio();
  const disconnect = useDisconnectComposio();
  const { ask, dialog } = useConfirm();
  const connected = status.state === "connected";
  const busy = connect.isPending || disconnect.isPending;
  const error = connect.error ?? disconnect.error;
  return (
    <li className="rounded-r3 border bg-raised p-4">
      <div className="flex items-center justify-between gap-3 max-[600px]:flex-wrap">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-r2 border bg-raised">
            <Logo name={logo} size={22} />
          </span>
          <div className="min-w-0">
            <b className="block truncate text-[15px] font-semibold">{name}</b>
            <p className="m-0 mt-0.5 truncate text-[13.5px] text-ink-3">{stateLine(status)}</p>
          </div>
        </div>
        {connected ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (
                await ask({
                  title: `Disconnect ${name}?`,
                  body: `Naazhi will stop using your ${name} and its access is removed. You can connect again any time.`,
                  confirmLabel: "Disconnect",
                  danger: true,
                })
              )
                disconnect.mutate(status.app);
            }}
          >
            {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
          </Button>
        ) : (
          <Button disabled={busy || !status.available} onClick={() => connect.mutate(status.app)}>
            {connect.isPending ? `Opening ${name}…` : status.state ? "Reconnect" : "Connect"}
          </Button>
        )}
      </div>
      {error && (
        <p className="form-err mt-3" role="alert">
          {error.message}
        </p>
      )}
      {dialog}
    </li>
  );
}

/**
 * A Settings page whose services connect through Composio (today: Google → Gmail and Google Calendar). Each service connects on its
 * own, on the provider's own sign-in page, so Naazhi never sees a password and the tokens stay with Composio. Services that don't
 * connect through Composio yet (Google Drive) are listed as coming later.
 */
export function ComposioProviderPage({ provider }: { provider: ProviderId }) {
  const def = PROVIDERS[provider];
  const status = useComposioStatus();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // The sign-in sends the person back to this page with the outcome in the address; show it once, then tidy the address.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("composio");
    if (!r) return;
    const app = sp.get("app");
    const name = isComposioApp(app) ? COMPOSIO_APPS[app].name : "The app";
    setResult(r === "connected" ? { ok: true, text: `${name} is connected.` } : { ok: false, text: sp.get("msg") || `${name} couldn’t be connected.` });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const services = def.groups.flatMap((g) => g.services);
  const s = status.data;
  return (
    <>
      {result && (
        <p className={result.ok ? "mt-2 text-[14px] text-green-fg" : "form-err mt-2"} role={result.ok ? "status" : "alert"}>
          {result.text}
        </p>
      )}
      {s && !s.configured && (
        <SettingsNotice className="mt-2">
          Connecting {def.name} isn’t set up on this server yet. An admin adds the Composio API key (COMPOSIO_API_KEY) and an auth config for each app.
        </SettingsNotice>
      )}
      {status.isError && (
        <p className="form-err mt-2" role="alert">
          {status.error.message}
        </p>
      )}
      <h2 className="m-0 mt-2 flex items-center gap-2 text-[15px] font-semibold">
        <BrandLogo name={provider} size={20} />
        Accounts <small className="text-[13px] font-normal text-ink-3">{def.covers}</small>
      </h2>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {services.map((svc) => {
          const app = composioAppFor(provider, svc.id);
          const appStatus = app ? s?.apps.find((a) => a.app === app) : undefined;
          if (app && appStatus) return <AppConnection key={svc.id} status={appStatus} name={COMPOSIO_APPS[app].name} logo={svc.name} />;
          return (
            <li key={svc.id} className="flex items-center justify-between gap-3 rounded-r3 border bg-raised p-4">
              <div className="min-w-0">
                <b className="block truncate text-[15px] font-semibold">{svc.name}</b>
                <p className="m-0 mt-0.5 text-[13.5px] text-ink-3">{app ? "Loading…" : svc.description}</p>
              </div>
              {!app && <Tag>Coming later</Tag>}
            </li>
          );
        })}
      </ul>
      <p className="m-0 mt-3 text-[13px] text-ink-3">You sign in on {def.signIn}, so Naazhi never sees your password. Disconnect any time from this page.</p>
    </>
  );
}
