"use client";
import { useEffect, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowUpRightFromSquare, faCheck, faKey, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { AiCatalogGroup, DeviceLoginStart } from "@untitled/types";
import Modal from "../../ui/Modal";
import { ProviderLogo } from "../../ui/ProviderLogo";
import { aiConnectionsApi, useAiCatalog, useAiConnectionActions } from "../../../features/ai/connections";
import { restMessage } from "../../../lib/api/rest";

/** Where ChatGPT keeps the switch that lets other apps sign in with a code. */
const CHATGPT_SETTINGS = "https://chatgpt.com/settings/security";

const STEPS = ["Enable", "Authorize", "Done"] as const;

/** The three-step "Sign in with ChatGPT": allow device logins on ChatGPT, approve a short code, done. */
function ChatgptFlow({ group, onClose, onError }: { group: AiCatalogGroup; onClose: () => void; onError: (m: string) => void }) {
  const [step, setStep] = useState(group.connected ? 3 : 1);
  const [login, setLogin] = useState<DeviceLoginStart | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAiConnectionActions(onError);
  const stopped = useRef(false);

  // While the code is on screen, ask whether it has been approved, as often as ChatGPT allows.
  useEffect(() => {
    if (step !== 2 || !login) return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await aiConnectionsApi.pollChatgpt();
        if (stopped.current) return;
        if (r.status === "connected") {
          await refresh();
          setStep(3);
          return;
        }
        if (r.status === "expired") {
          setLogin(null);
          setStep(1);
          onError("That code ran out. Start again to get a new one.");
          return;
        }
      } catch (e) {
        if (stopped.current) return;
        onError(restMessage(e, "Couldn’t check the sign-in. Try again."));
        setStep(1);
        return;
      }
      timer = setTimeout(tick, login.interval_seconds * 1000);
    };
    timer = setTimeout(tick, login.interval_seconds * 1000);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
  }, [step, login, onError, refresh]);

  async function start() {
    setBusy(true);
    onError("");
    try {
      setLogin(await aiConnectionsApi.startChatgpt());
      setStep(2);
    } catch (e) {
      onError(restMessage(e, "Couldn’t start the sign-in. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t">
      <ol className="m-0 flex list-none items-center gap-3 p-4 pb-3" aria-label="Sign-in steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-3 last:flex-none">
            <span className="flex items-center gap-2 text-[14px]" aria-current={step === i + 1 ? "step" : undefined}>
              <span
                className={`grid size-6 place-items-center rounded-full border text-[12px] ${step > i + 1 ? "border-ink bg-ink text-paper" : step === i + 1 ? "border-ink text-ink" : "text-ink-3"}`}
              >
                {step > i + 1 ? <FA icon={faCheck} className="text-[10px]" /> : i + 1}
              </span>
              <span className={step === i + 1 ? "font-medium text-ink" : "text-ink-3"}>{label}</span>
            </span>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="grid gap-4 p-4 pt-2">
          <div>
            <h3 className="m-0 text-[17px] font-semibold">First, allow device logins on your ChatGPT account</h3>
            <p className="m-0 mt-1.5 text-[14px] text-ink-3">
              ChatGPT blocks code sign-in until you switch it on. This is a one-time change on your ChatGPT account, not on Naazhi.
            </p>
          </div>
          <div className="rounded-r3 border p-3.5 text-[14px]">
            <p className="m-0 flex items-center gap-2 font-medium text-amber-fg">
              <FA icon={faTriangleExclamation} className="text-[12px]" /> Without this, the next step will fail
            </p>
            <p className="m-0 mt-1.5">
              Open ChatGPT’s security settings and turn on <b>“Allow device code login”</b>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a className="btn btn-secondary btn-sm" href={CHATGPT_SETTINGS} target="_blank" rel="noopener noreferrer">
              Open ChatGPT settings <FA icon={faArrowUpRightFromSquare} className="text-[11px]" />
            </a>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !group.configured} onClick={start}>
              {busy ? "Starting…" : "I’ve turned it on"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && login && (
        <div className="grid gap-4 p-4 pt-2">
          <div>
            <h3 className="m-0 text-[17px] font-semibold">Enter this code on ChatGPT</h3>
            <p className="m-0 mt-1.5 text-[14px] text-ink-3">Open the page below, sign in if asked, and type the code. This window finishes on its own.</p>
          </div>
          <p className="m-0 rounded-r3 bg-hover px-4 py-3 text-center font-mono text-[28px] font-semibold tracking-[0.18em]" aria-label={`Your code is ${login.user_code}`}>
            {login.user_code}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a className="btn btn-primary btn-sm" href={login.verification_url} target="_blank" rel="noopener noreferrer">
              Open ChatGPT to enter the code <FA icon={faArrowUpRightFromSquare} className="text-[11px]" />
            </a>
            <span className="text-[13.5px] text-ink-3" role="status">
              Waiting for you to approve…
            </span>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-3 p-4 pt-2">
          <h3 className="m-0 flex items-center gap-2 text-[17px] font-semibold">
            <FA icon={faCheck} className="text-[13px]" /> ChatGPT is connected
          </h3>
          <p className="m-0 text-[14px] text-ink-3">Pick a ChatGPT model in the model picker. Replies use your own ChatGPT allowance.</p>
          <div className="flex justify-end">
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KeyRow({ group, onError }: { group: AiCatalogGroup; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const { saveKey, disconnect } = useAiConnectionActions(onError);
  return (
    <li className="border-t first:border-t-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-r2 bg-hover">
          <ProviderLogo id={group.id} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[15px] font-medium">{group.label}</b>
          <small className="block text-[13px] text-ink-3">{group.connected ? `Key saved, ending ${group.hint ?? "••••"}` : "Billed by the provider"}</small>
        </span>
        {group.connected ? (
          <button type="button" className="btn btn-secondary btn-sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate(group.id)}>
            Remove
          </button>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            Add key
          </button>
        )}
      </div>
      {open && !group.connected && (
        <form
          className="grid gap-2.5 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            onError("");
            saveKey.mutate({ provider: group.id, apiKey: key.trim() }, { onSuccess: () => { setKey(""); setOpen(false); } });
          }}
        >
          <label className="grid gap-1.5 text-[13.5px] text-ink-2">
            <span>{group.label} API key</span>
            <input
              className="h-10 rounded-ctl border bg-paper px-3 font-mono text-[14px] text-ink outline-none focus:border-ink"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your key"
              autoComplete="off"
              spellCheck={false}
              maxLength={400}
            />
          </label>
          <p className="m-0 text-[12.5px] text-ink-3">
            We check it with {group.label}, then store it encrypted. It’s only used to answer your own messages and is never shown again.
            {group.keyUrl && (
              <>
                {" "}
                <a className="underline" href={group.keyUrl} target="_blank" rel="noopener noreferrer">
                  Get a key
                </a>
                .
              </>
            )}
          </p>
          <div>
            <button className="btn btn-primary btn-sm" disabled={key.trim().length < 8 || saveKey.isPending}>
              {saveKey.isPending ? "Checking…" : "Save key"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

/** "Connect an AI": use the ChatGPT plan you already pay for (sign in once), or add your own API keys. */
export default function ConnectAiDialog({ onClose, start = "chatgpt" }: { onClose: () => void; start?: "chatgpt" | "keys" }) {
  const q = useAiCatalog();
  const [err, setErr] = useState("");
  const [chatgptOpen, setChatgptOpen] = useState(start === "chatgpt");
  const groups = q.data?.groups ?? [];
  const chatgpt = groups.find((g) => g.kind === "chatgpt");
  const keys = groups.filter((g) => g.kind === "key");

  return (
    <Modal label="Connect an AI" onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="m-0 text-[24px] font-semibold tracking-[-0.02em]">Connect an AI</h2>
        <p className="m-0 mt-1.5 text-[14.5px] text-ink-3">Your plan pays for the app. The models are yours to choose: use AI you already pay for, or add your own keys.</p>
        {err && (
          <p className="form-err mt-3" role="alert">
            {err}
          </p>
        )}
        {q.isError && (
          <p className="form-err mt-3" role="alert">
            Couldn’t load your connections. Try again in a moment.
          </p>
        )}

        {chatgpt && (
          <>
            <h3 className="m-0 mt-6 mb-2 text-[15px] font-semibold">Use AI you already pay for</h3>
            <div className="overflow-hidden rounded-r3 border">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-r2 bg-hover">
                  <ProviderLogo id="chatgpt" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[16px] font-semibold">Your ChatGPT subscription</b>
                  <small className="block text-[13.5px] text-ink-3">
                    {chatgpt.configured ? "Sign in once. Uses your existing ChatGPT allowance." : "Not set up on this server yet."}
                  </small>
                </span>
                {chatgpt.connected && !chatgptOpen ? (
                  <ChatgptDisconnect onError={setErr} />
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" disabled={!chatgpt.configured} aria-expanded={chatgptOpen} onClick={() => setChatgptOpen(!chatgptOpen)}>
                    {chatgptOpen ? "Close" : "Connect"}
                  </button>
                )}
              </div>
              {chatgptOpen && chatgpt.configured && <ChatgptFlow group={chatgpt} onClose={() => setChatgptOpen(false)} onError={setErr} />}
            </div>
          </>
        )}

        <h3 className="m-0 mt-6 mb-2 flex items-center gap-2 text-[15px] font-semibold">
          <FA icon={faKey} className="text-[12px]" /> Your own API keys
        </h3>
        <ul className="m-0 list-none overflow-hidden rounded-r3 border p-0">
          {keys.map((g) => (
            <KeyRow key={g.id} group={g} onError={setErr} />
          ))}
        </ul>
        <p className="m-0 mt-3 text-[13px] text-ink-3">Keys are billed by the provider at their rates. Naazhi never counts them against your plan.</p>
      </div>
    </Modal>
  );
}

function ChatgptDisconnect({ onError }: { onError: (m: string) => void }) {
  const { disconnect } = useAiConnectionActions(onError);
  return (
    <button type="button" className="btn btn-secondary btn-sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate("chatgpt")}>
      Disconnect
    </button>
  );
}
