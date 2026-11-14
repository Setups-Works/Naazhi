"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Logo } from "../../../components/site/Logo";
import { useConfirm } from "../../../components/ui/Confirm";
import { PROVIDERS, type ProviderId } from "../../../lib/composio/catalog";
import { composioAppFor } from "../../../lib/composio/apps";
import { useComposioStatus, useConnectComposio, useDisconnectComposio } from "../../integrations/composio";
import { SettingsNotice, Tag } from "../ui";

/** One Google sign-in covers every Google app: one Connect, one Disconnect, and the apps it covers listed under it. */
export function ComposioProviderPage({ provider }: { provider: ProviderId }) {
  const def = PROVIDERS[provider];
  const status = useComposioStatus();
  const connect = useConnectComposio();
  const disconnect = useDisconnectComposio();
  const { ask, dialog } = useConfirm();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // The sign-in sends the person back to this page with the outcome in the address; show it once, then tidy the address.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("composio");
    if (!r) return;
    setResult(r === "connected" ? { ok: true, text: "Google is connected." } : { ok: false, text: sp.get("msg") || "Google couldn’t be connected." });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const s = status.data;
  const apps = s?.apps ?? [];
  const connected = apps.filter((a) => a.state === "connected");
  const account = connected[0]?.account;
  const busy = connect.isPending || disconnect.isPending;
  const error = connect.error ?? disconnect.error;
  const services = def.groups.flatMap((g) => g.services);

  return (
    <>
      {result && (
        <p className={result.ok ? "mt-2 text-[14px] text-green-fg" : "form-err mt-2"} role={result.ok ? "status" : "alert"}>
          {result.text}
        </p>
      )}
      {s && !s.configured && (
        <SettingsNotice className="mt-2">Connecting {def.name} isn’t available yet. It will appear here as soon as it is switched on for Naazhi.</SettingsNotice>
      )}
      {status.isError && (
        <p className="form-err mt-2" role="alert">
          {status.error.message}
        </p>
      )}
      <h2 className="m-0 mt-2 flex items-center gap-2 text-[15px] font-semibold">
        <BrandLogo name={provider} size={20} />
        Account <small className="text-[13px] font-normal text-ink-3">{def.covers}</small>
      </h2>
      <div className="mt-3 rounded-r3 border bg-raised p-4">
        <div className="flex items-center justify-between gap-3 max-[600px]:flex-wrap">
          <div className="min-w-0">
            <b className="block truncate text-[15px] font-semibold">{connected.length ? "Google is connected" : "Connect Google"}</b>
            <p className="m-0 mt-0.5 truncate text-[13.5px] text-ink-3">
              {connected.length ? (account ? `Connected as ${account}` : "Connected") : "One sign-in connects Gmail, Google Calendar and Google Drive."}
            </p>
          </div>
          {connected.length ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (
                  await ask({
                    title: "Disconnect Google?",
                    body: "Naazhi will stop using your Gmail, Google Calendar and Google Drive, and its access is removed. You can connect again any time.",
                    confirmLabel: "Disconnect",
                    danger: true,
                  })
                )
                  disconnect.mutate();
              }}
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          ) : (
            <Button disabled={busy || !s?.configured} onClick={() => connect.mutate()}>
              {connect.isPending ? "Opening Google…" : "Connect Google"}
            </Button>
          )}
        </div>
        {error && (
          <p className="form-err mt-3" role="alert">
            {error.message}
          </p>
        )}
      </div>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {services.map((svc) => {
          const app = composioAppFor(provider, svc.id);
          const on = app ? apps.some((a) => a.app === app && a.state === "connected") : false;
          return (
            <li key={svc.id} className="flex items-center justify-between gap-3 rounded-r3 border bg-raised p-4">
              <span className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-r2 border bg-raised">
                  <Logo name={svc.name} size={22} />
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-[15px] font-semibold">{svc.name}</b>
                  <span className="m-0 mt-0.5 block truncate text-[13.5px] text-ink-3">{svc.description}</span>
                </span>
              </span>
              {app ? <Tag>{on ? "Connected" : "Not connected"}</Tag> : <Tag>Coming later</Tag>}
            </li>
          );
        })}
      </ul>
      <p className="m-0 mt-3 text-[13px] text-ink-3">You sign in on {def.signIn}, so Naazhi never sees your password. Disconnect any time from this page.</p>
      {dialog}
    </>
  );
}
