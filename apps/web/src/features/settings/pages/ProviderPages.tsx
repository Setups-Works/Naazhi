"use client";
import { useEffect, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faAddressCard,
  faCalendarDays,
  faChevronDown,
  faChevronUp,
  faCloud,
  faComments,
  faEnvelope,
  faFileInvoiceDollar,
  faFolderOpen,
  faHeadset,
  faListCheck,
  faMoneyBillWave,
  faPenNib,
  faReceipt,
  faUserGroup,
  faUserTie,
  faDiagramProject,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Modal from "../../../components/ui/Modal";
import { PROVIDERS, type Provider, type ProviderId } from "../../../lib/composio/catalog";
import { BrandLogo, brandOf } from "@/components/ui/BrandLogo";
import { Logo } from "../../../components/site/Logo";
import { LogoTile, SettingsNotice, Tag } from "../ui";
import { ZOHO_SERVICES, isZohoService } from "../../../lib/zoho";
import { useConfirm } from "../../../components/ui/Confirm";
import { useConnectZoho, useDisconnectZoho, useZohoStatus } from "../../integrations/zoho";

/** Each service's own icon and colour, so Outlook mail and Outlook calendar (or Zoho's thirteen apps) can be told apart at a glance. */
const LOOK: Record<string, [IconDefinition, string]> = {
  gmail: [faEnvelope, "text-critical"],
  calendar: [faCalendarDays, "text-blue-fg"],
  drive: [faFolderOpen, "text-green-fg"],
  outlook: [faEnvelope, "text-blue-fg"],
  "outlook-calendar": [faCalendarDays, "text-blue-fg"],
  onedrive: [faCloud, "text-blue-fg"],
  todo: [faListCheck, "text-blue-fg"],
  mail: [faEnvelope, "text-clay-fg"],
  cliq: [faComments, "text-blue-fg"],
  workdrive: [faFolderOpen, "text-green-fg"],
  projects: [faDiagramProject, "text-violet-fg"],
  sign: [faPenNib, "text-amber-fg"],
  crm: [faAddressCard, "text-clay-fg"],
  books: [faReceipt, "text-green-fg"],
  billing: [faFileInvoiceDollar, "text-blue-fg"],
  expense: [faMoneyBillWave, "text-amber-fg"],
  desk: [faHeadset, "text-violet-fg"],
  people: [faUserGroup, "text-blue-fg"],
  recruit: [faUserTie, "text-clay-fg"],
};

/** Each service's real logo, by provider and service id. Anything without one keeps its line icon. */
const SERVICE_LOGO: Record<string, string> = {
  "google:gmail": "Gmail",
  "google:calendar": "Google Calendar",
  "google:drive": "Google Drive",
  "microsoft:outlook": "Outlook",
  "microsoft:outlook-calendar": "Outlook",
  "microsoft:onedrive": "OneDrive",
  "microsoft:todo": "Microsoft To Do",
  "zoho:mail": "Zoho Mail",
  "zoho:calendar": "Zoho Calendar",
  "zoho:cliq": "Zoho Cliq",
  "zoho:workdrive": "Zoho WorkDrive",
  "zoho:projects": "Zoho Projects",
  "zoho:sign": "Zoho Sign",
  "zoho:crm": "Zoho CRM",
  "zoho:books": "Zoho Books",
  "zoho:billing": "Zoho Billing",
  "zoho:expense": "Zoho Expense",
  "zoho:desk": "Zoho Desk",
  "zoho:people": "Zoho People",
  "zoho:recruit": "Zoho Recruit",
};

/** The service's logo (or icon) in a rounded tile; a letter for the provider itself. */
function Mark({ provider, id, name, size = "size-10" }: { provider?: ProviderId; id?: string; name: string; size?: string }) {
  const logo = provider && id ? SERVICE_LOGO[`${provider}:${id}`] : undefined;
  if (logo)
    return (
      <span aria-hidden className={`grid shrink-0 place-items-center rounded-r2 border bg-raised ${size}`}>
        <Logo name={logo} size={size === "size-8" ? 18 : 22} />
      </span>
    );
  const look = id ? LOOK[id] : undefined;
  if (!look) return <LogoTile name={name} className={size} />;
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-r2 border bg-raised text-[14px] ${look[1]} ${size}`}>
      <FA icon={look[0]} />
    </span>
  );
}

/** "Connect Google": pick the services Naazhi may use, see exactly what it can see, then continue to the provider's sign-in. */
function ConnectDialog({
  provider,
  onClose,
  onContinue,
  initial,
}: {
  provider: Provider;
  onClose: () => void;
  /** Starts the real sign-in with the picked services (Zoho). Without it the button says the provider isn't set up yet. */
  onContinue?: (ids: string[]) => Promise<void>;
  initial?: string[];
}) {
  const all = provider.groups.flatMap((g) => g.services);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial ?? all.map((s) => s.id)));
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [msg, setMsg] = useState("");
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  return (
    <Modal label={`Connect ${provider.name}`} onClose={onClose} size="lg">
      <div className="p-6">
        {brandOf(provider.name) ? (
          <span aria-hidden className="grid size-11 place-items-center rounded-r2 border bg-raised">
            <BrandLogo name={brandOf(provider.name)!} size={24} />
          </span>
        ) : (
          <Mark name={provider.name.charAt(0)} />
        )}
        <h2 className="m-0 mt-4 text-[22px] font-semibold tracking-[-0.02em]">Connect {provider.name}</h2>
        <p className="m-0 mt-1 text-[14.5px] text-ink-2">Choose what Naazhi can use. You can add more later.</p>
        <div className="mt-5 flex items-center justify-between text-[14px] text-ink-2">
          <span>
            {picked.size} of {all.length} selected
          </span>
          <button type="button" className="hover:text-ink" onClick={() => setPicked(picked.size ? new Set() : new Set(all.map((s) => s.id)))}>
            {picked.size ? "Clear all" : "Select all"}
          </button>
        </div>
        {provider.groups.map((g) => (
          <section key={g.label} className="mt-5">
            <h3 className="m-0 mb-2 text-[13.5px] font-normal text-ink-3">{g.label}</h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-4 p-0 max-[600px]:grid-cols-1">
              {g.services.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <Mark provider={provider.id} id={s.id} name={s.name} size="size-8" />
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15px] font-semibold">
                        {s.name} {provider.id === "zoho" && isZohoService(s.id) && ZOHO_SERVICES[s.id].beta && <Tag>Beta</Tag>}
                      </b>
                      <small className="block text-[13.5px] text-ink-2">{s.description}</small>
                    </span>
                    <Checkbox checked={picked.has(s.id)} onCheckedChange={() => toggle(s.id)} aria-label={s.name} className="mt-1 size-5" />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {details && (
          <div className="mt-5 grid gap-2 rounded-r2 bg-side p-4 text-[13.5px] text-ink-2">
            {all
              .filter((s) => picked.has(s.id))
              .map((s) => (
                <p key={s.id} className="m-0">
                  <b className="font-medium text-ink">{s.name}</b> · {s.access}
                </p>
              ))}
            {picked.size === 0 && <p className="m-0">Pick a service to see what Naazhi can do with it.</p>}
            {provider.id === "zoho" && <p className="m-0 text-ink-3">Beta services follow Zoho’s documentation but haven’t been tried on a live account yet; they start unticked.</p>}
            <p className="m-0 text-ink-3">You sign in on {provider.signIn}, so Naazhi never sees your password. Disconnect any time from this page.</p>
          </div>
        )}
        {msg && (
          <p className="form-err mt-4" role="alert">
            {msg}
          </p>
        )}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" className="inline-flex items-center gap-2 text-[14px] text-ink-2 hover:text-ink" aria-expanded={details} onClick={() => setDetails(!details)}>
            What Naazhi can see <FA icon={details ? faChevronUp : faChevronDown} className="text-[11px]" />
          </button>
          <Button
            size="lg"
            disabled={picked.size === 0 || busy}
            onClick={async () => {
              if (!onContinue) return setMsg(`Signing in with ${provider.name} isn’t set up on this server yet, so nothing was connected. Your choices aren’t saved.`);
              setBusy(true);
              setMsg("");
              try {
                await onContinue([...picked]);
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Couldn’t start the sign-in.");
                setBusy(false);
              }
            }}
          >
            {busy ? "Opening Zoho…" : `Continue with ${provider.name}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** A connection page: the Accounts header with its connect button, then the accounts, or an invitation to add the first. */
function ProviderPage({ id }: { id: ProviderId }) {
  const provider = PROVIDERS[id];
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mt-2 flex items-center justify-between gap-3 max-[600px]:flex-wrap">
        <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold">
          <BrandLogo name={id} size={20} />
          Accounts <small className="text-[13px] font-normal text-ink-3">{provider.covers}</small>
        </h2>
        <Button onClick={() => setOpen(true)}>Connect {provider.name} account</Button>
      </div>
      <div className="mt-3 rounded-r3 border bg-raised px-4 py-10 text-center">
        <b className="block text-[15px] font-semibold">No {provider.name} account connected</b>
        <p className="m-0 mt-1 text-[14px] text-ink-3">{provider.invite}</p>
      </div>
      {open && <ConnectDialog provider={provider} onClose={() => setOpen(false)} />}
    </>
  );
}

export const GooglePage = () => <ProviderPage id="google" />;
export const MicrosoftPage = () => <ProviderPage id="microsoft" />;

/** Zoho: connect once, pick the services, and see which account is connected. Tokens stay on the server. */
export function ZohoPage() {
  const status = useZohoStatus();
  const connect = useConnectZoho();
  const disconnect = useDisconnectZoho();
  const { ask, dialog } = useConfirm();
  const provider = PROVIDERS.zoho;
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  // Zoho sends the person back to this page with the outcome in the address; show it once, then tidy the address.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("zoho");
    if (!r) return;
    setResult(r === "connected" ? { ok: true, text: "Zoho is connected." } : { ok: false, text: sp.get("msg") || "Zoho couldn’t be connected." });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const s = status.data;
  // Beta services start unticked on a first connect; when changing services the current ones stay ticked.
  const initial = s?.connected ? s.services : Object.entries(ZOHO_SERVICES).filter(([, d]) => !d.beta).map(([id]) => id);
  return (
    <>
      {result && (
        <p className={result.ok ? "mt-2 text-[14px] text-green-fg" : "form-err mt-2"} role={result.ok ? "status" : "alert"}>
          {result.text}
        </p>
      )}
      {s && !s.configured && (
        <SettingsNotice className="mt-2">
          Zoho isn’t set up on this server yet. An admin adds the Zoho client id and secret (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET) and registers {s.redirectUri} in the Zoho API console.
        </SettingsNotice>
      )}
      <div className="mt-2 flex items-center justify-between gap-3 max-[600px]:flex-wrap">
        <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold">
          <BrandLogo name="zoho" size={20} />
          Accounts <small className="text-[13px] font-normal text-ink-3">{provider.covers}</small>
        </h2>
        <Button onClick={() => setOpen(true)} disabled={!s?.configured}>
          {s?.connected ? "Change services" : "Connect Zoho account"}
        </Button>
      </div>
      {s?.connected ? (
        <div className="mt-3 rounded-r3 border bg-raised p-4">
          <div className="flex items-center justify-between gap-3 max-[600px]:flex-wrap">
            <div className="min-w-0">
              <b className="block truncate text-[15px] font-semibold">{s.label ?? "Zoho account"}</b>
              <p className="m-0 mt-0.5 text-[13.5px] text-ink-3">Connected. Ask in chat, for example “show my latest Zoho leads”.</p>
            </div>
            <Button
              variant="outline"
              disabled={disconnect.isPending}
              onClick={async () => {
                if (await ask({ title: "Disconnect Zoho?", body: "Naazhi will stop reading your Zoho account and Zoho will be told to cancel the access. You can connect again any time.", confirmLabel: "Disconnect", danger: true })) disconnect.mutate();
              }}
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
            {s.services.map((id) => (
              <li key={id}>
                <Tag>{ZOHO_SERVICES[id].name}</Tag>
              </li>
            ))}
          </ul>
          {disconnect.isError && (
            <p className="form-err mt-3" role="alert">
              {disconnect.error.message}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-r3 border bg-raised px-4 py-10 text-center">
          <b className="block text-[15px] font-semibold">No {provider.name} account connected</b>
          <p className="m-0 mt-1 text-[14px] text-ink-3">{provider.invite}</p>
        </div>
      )}
      {open && <ConnectDialog provider={provider} initial={initial} onClose={() => setOpen(false)} onContinue={(ids) => connect.mutateAsync(ids)} />}
      {dialog}
    </>
  );
}
