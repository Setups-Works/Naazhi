"use client";
import Link from "next/link";
import { useState } from "react";
import { BYO_PROVIDERS, byoProvider } from "@untitled/logic/billing";
import type { Prefs } from "../../../lib/prefs";
import { useConfirm } from "../../../components/ui/Confirm";
import { useBilling, useBillingActions } from "../../billing/queries";
import { usePrefsSave } from "../usePrefsSave";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faArrowUpRightFromSquare, faClock, faEnvelope, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AppRow, SettingsEmpty, SettingsNotice, SettingsRow, SettingsSection, Tag } from "../ui";

const SOON = "Not available yet";
const later = (what: string) => `${what} isn’t available yet. This page shows what you’ll be able to do.`;

const EXAMPLES: { title: string; body: string; when: string; mail?: boolean }[] = [
  { title: "Morning read", body: "Reads your inbox and calendar and tells you only what needs you.", when: "Every weekday at 8:00" },
  { title: "Week ahead", body: "Your week’s calendar in one read: the busiest day, clashes, what to prepare.", when: "Every Monday at 9:00" },
  { title: "Invoices to To-do", body: "Adds a task to To-do with the vendor, amount and due date.", when: "When an invoice email arrives", mail: true },
  { title: "Someone proposes a time", body: "Checks your calendar and drafts a reply for you to approve.", when: "When an email suggests a meeting time", mail: true },
  { title: "Friday wrap-up", body: "What got done, what slipped, and what to start on Monday.", when: "Every Friday at 17:00" },
  { title: "File newsletters, quietly", body: "Archives newsletters as they land. No notifications.", when: "When a newsletter arrives", mail: true },
];

/** YouDo: automations that run on a schedule or when an email arrives. The layout is final; running them needs the automation service. */
export function YouDoPage() {
  return (
    <>
      <SettingsNotice>{later("Automations")}</SettingsNotice>
      <div className="mt-5 flex items-start justify-between gap-4 max-[600px]:flex-wrap">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-ink-2">
          <span className="flex items-center gap-3">
            <Progress value={0} className="w-16" aria-label="Running" /> 0 of 3 running
          </span>
          <span className="flex items-center gap-3">
            <Progress value={0} className="w-16" aria-label="Runs this month" /> 0 of 100 runs this month
          </span>
          <span>Free plan</span>
        </div>
        <Button disabled title={SOON}>
          <FA icon={faPlus} /> New YouDo
        </Button>
      </div>
      <SettingsSectionLabel>Describe a YouDo</SettingsSectionLabel>
      <div className="flex items-center gap-2 rounded-r3 border bg-raised p-1.5 pl-4">
        <Input disabled placeholder="Every Friday at 5pm, tell me what slipped this week" aria-label="Describe a YouDo" className="h-9 flex-1 border-0 bg-transparent px-0 shadow-none" />
        <Button variant="outline" disabled title={SOON}>
          Continue <FA icon={faArrowRight} />
        </Button>
      </div>
      <p className="m-0 mt-2 text-[13.5px] text-ink-3">Say what Naazhi should do and when. You’ll check the details before anything is set up.</p>

      <SettingsSectionLabel note="Each one opens ready to set up">Start from an example</SettingsSectionLabel>
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
        {EXAMPLES.map((x) => (
          <li key={x.title} className="flex flex-col gap-2 rounded-r3 border bg-raised p-4">
            <FA icon={x.mail ? faEnvelope : faClock} className="text-[13px] text-ink-3" />
            <b className="mt-3 text-[16px] font-semibold">{x.title}</b>
            <p className="m-0 flex-1 text-[14px] text-ink-2">{x.body}</p>
            <span className="mt-2 flex items-center gap-2 text-[13px] text-ink-3">
              <FA icon={x.mail ? faEnvelope : faClock} className="text-[11px]" /> {x.when}
            </span>
          </li>
        ))}
      </ul>

      <SettingsSectionLabel>How it works</SettingsSectionLabel>
      <ol className="m-0 grid list-none grid-cols-3 gap-6 p-0 text-[14px] max-[600px]:grid-cols-1">
        {[
          ["You say what and when", "In a sentence, or pick an example."],
          ["Naazhi does it on its own", "On a schedule or when an email arrives."],
          ["You get the result", "A short note in your chat or your notes."],
        ].map(([t, d], i) => (
          <li key={t}>
            <span className="mb-1 block text-[12.5px] text-ink-3">{i + 1}</span>
            <b className="block font-semibold">{t}</b>
            <span className="text-ink-2">{d}</span>
          </li>
        ))}
      </ol>
      <p className="m-0 mt-6 text-[14px] text-ink-2">
        Prefer to talk it through?{" "}
        <Link href="/dashboard/chat" className="underline underline-offset-2">
          Ask Naazhi in chat
        </Link>
      </p>
    </>
  );
}

function SettingsSectionLabel({ children, note }: { children: string; note?: string }) {
  return (
    <h2 className="m-0 mt-8 mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
      {children}
      {note && <small className="text-[13px] font-normal text-ink-3">· {note}</small>}
    </h2>
  );
}

/** API keys: bring your own AI provider key. Saved through the same encrypted vault as Plan and billing; needs the "Bring your own key" plan. */
export function ApiKeysPage() {
  const [err, setErr] = useState("");
  const billing = useBilling().data;
  const { choose, saveKey, removeKey } = useBillingActions(setErr);
  const { ask, dialog } = useConfirm();
  const [adding, setAdding] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const onByoPlan = billing?.plan?.id === "byo" && billing.status === "active";
  const saved = billing?.byo.hint ? byoProvider(billing.byo.provider ?? "") : null;

  function open(id: string) {
    setAdding(id);
    setModel(byoProvider(id)?.model ?? "");
    setApiKey("");
    setErr("");
  }
  return (
    <>
      {dialog}
      {billing && !onByoPlan && (
        <SettingsNotice className="justify-between">
          <span>Using your own key is a plan. Until you choose it, Naazhi uses your plan’s credit.</span>
          <Button size="sm" disabled={choose.isPending} onClick={() => choose.mutate("byo")}>
            Use my own key
          </Button>
        </SettingsNotice>
      )}
      {err && (
        <p className="form-err mt-3" role="alert">
          {err}
        </p>
      )}
      <SettingsSection title="Your keys">
        {saved ? (
          <AppRow name={saved.label} description={billing?.byo.model} extra={<p className="m-0 mt-0.5 font-mono text-[13px] text-ink-3">{billing?.byo.hint}</p>}>
            <Button
              variant="outline"
              onClick={async () => {
                if (await ask({ title: "Remove this key?", body: `Naazhi stops using your ${saved.label} key. The saved key is deleted.`, confirmLabel: "Remove key", danger: true })) removeKey.mutate();
              }}
            >
              Remove
            </Button>
          </AppRow>
        ) : (
          <SettingsEmpty>No keys yet. Naazhi uses your plan’s credit for everything. Add a key below to use your own.</SettingsEmpty>
        )}
      </SettingsSection>
      <h2 className="m-0 mt-8 mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
        Available providers <small className="text-[13px] font-normal text-ink-3">{BYO_PROVIDERS.length} providers</small>
      </h2>
      <h3 className="m-0 mb-2 text-[13.5px] font-medium">
        Chat &amp; writing <span className="font-normal text-ink-3">· Models Naazhi can run on your own key</span>
      </h3>
      <div className="divide-y divide-line overflow-hidden rounded-r3 border bg-raised">
        {BYO_PROVIDERS.map((p) => (
          <div key={p.id}>
            <AppRow name={p.label} description={p.model} extra={<p className="m-0 mt-0.5 text-[13.5px] text-ink-3">Used for chat, writing and other model calls</p>}>
              <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 text-[14px] text-ink-2 hover:text-ink">
                Get a key <FA icon={faArrowUpRightFromSquare} className="text-[11px]" />
              </a>
              <Button variant="outline" disabled={!onByoPlan} title={onByoPlan ? undefined : "Choose the Bring your own key plan first"} onClick={() => open(p.id)}>
                {saved?.id === p.id ? "Replace key" : "Add key"}
              </Button>
            </AppRow>
            {adding === p.id && (
              <form
                className="grid gap-3 bg-side px-4 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveKey.mutate({ provider: p.id, model: model.trim(), apiKey: apiKey.trim() }, { onSuccess: () => setAdding(null) });
                }}
              >
                <label className="grid gap-1 text-[13.5px] text-ink-2">
                  Model
                  <Input value={model} onChange={(e) => setModel(e.target.value)} maxLength={100} />
                </label>
                <label className="grid gap-1 text-[13.5px] text-ink-2">
                  API key
                  <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your key" />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" disabled={!apiKey.trim() || !model.trim() || saveKey.isPending}>
                    Save key
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setAdding(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 px-1 text-[13.5px] text-ink-3">Your key is stored encrypted and only the last few characters are shown.</p>
    </>
  );
}

const MAIL_SERVICES = ["Gmail", "Outlook", "Zoho Mail"];

/** Excluded labels: mail labels Naazhi never reads, saved with your preferences. */
export function LabelsPage({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change, error } = usePrefsSave(initial);
  const [name, setName] = useState("");
  const [account, setAccount] = useState(MAIL_SERVICES[0]);
  const list = prefs.excludedLabels;
  const clean = name.trim().slice(0, 80);
  const dupe = list.some((l) => l.account === account && l.name.toLowerCase() === clean.toLowerCase());
  const canAdd = clean.length > 0 && !dupe && list.length < 100;
  return (
    <>
      <SettingsSection title="Labels">
        {list.length === 0 ? (
          <SettingsEmpty>No labels excluded. Naazhi reads every label in your connected email.</SettingsEmpty>
        ) : (
          list.map((l) => (
            <SettingsRow key={`${l.account}:${l.name}`} title={l.name} description={l.account}>
              <Button variant="ghost" onClick={() => change({ excludedLabels: list.filter((x) => x !== l) })}>
                Remove
              </Button>
            </SettingsRow>
          ))
        )}
        <form
          className="bg-side p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canAdd) return;
            void change({ excludedLabels: [...list, { name: clean, account }] });
            setName("");
          }}
        >
          <div className="flex items-center gap-3 max-[600px]:flex-wrap">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Label name, like SPAM or Receipts" aria-label="Label name" className="h-10 min-w-0 flex-1" />
            <select value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Applies to" className="h-10 rounded-ctl border bg-raised px-3 text-[14px]">
              {MAIL_SERVICES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <Button type="submit" disabled={!canAdd}>
              <FA icon={faPlus} /> Exclude
            </Button>
          </div>
          <p className="m-0 mt-3 text-[13.5px] text-ink-3">{dupe ? "That label is already excluded." : "Common labels: INBOX, SENT, DRAFT, SPAM, TRASH, UNREAD, Promotions"}</p>
        </form>
      </SettingsSection>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

const UNDO = [5, 10, 15, 20, 30, 45, 60];

/** Email: undo send, reply alerts and one signature, saved with your preferences and used by email once it is connected. */
export function EmailPage({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change, error } = usePrefsSave(initial);
  const [sig, setSig] = useState(prefs.emailSignature);
  const [custom, setCustom] = useState(String(prefs.undoSendSecs));
  const secs = prefs.undoSendSecs;
  return (
    <>
      <SettingsSection title="Undo send">
        <div className="px-4 py-4">
          <b className="block text-[15px] font-semibold">Time to take it back</b>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Undo send time">
            {UNDO.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={secs === n}
                className="h-8 rounded-pill px-3 text-[13px] text-ink-2 hover:bg-hover aria-checked:bg-ink aria-checked:text-paper"
                onClick={() => {
                  setCustom(String(n));
                  void change({ undoSendSecs: n });
                }}
              >
                {n}s
              </button>
            ))}
            <span className="text-[13px] text-ink-3">or</span>
            <Input
              inputMode="numeric"
              value={custom}
              aria-label="Seconds"
              className="h-8 w-16 text-center"
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 2))}
              onBlur={() => {
                const n = Math.min(60, Math.max(2, Number(custom) || 15));
                setCustom(String(n));
                if (n !== secs) void change({ undoSendSecs: n });
              }}
            />
            <span className="text-[13px] text-ink-3">seconds (2–60)</span>
          </div>
          <div className="mt-4 inline-flex items-center gap-3 rounded-pill bg-ink px-4 py-2 text-[13.5px] text-paper" aria-hidden>
            Email sent <span className="text-paper/70">· Undo {secs}s</span>
          </div>
        </div>
      </SettingsSection>
      <SettingsSection title="Replies">
        <SettingsRow title="Reply alerts" description="A chat message if someone replies or it bounces.">
          <Switch checked={prefs.replyAlerts} onCheckedChange={(v) => change({ replyAlerts: v })} aria-label="Reply alerts" />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Signature" note="One signature for every account">
        <div className="p-4">
          <Textarea value={sig} onChange={(e) => setSig(e.target.value.slice(0, 2000))} rows={5} placeholder="Your signature" aria-label="Signature" />
          <Button className="mt-3" disabled={sig === prefs.emailSignature} onClick={() => change({ emailSignature: sig })}>
            Save signature
          </Button>
        </div>
      </SettingsSection>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
