"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import { faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import { api } from "../../../lib/api/client";
import { qk } from "../../../lib/query/keys";
import { isoDate } from "../../../lib/dates";
import { NO_AI } from "../../../lib/ai";
import { parseChatActions } from "../../../lib/chat-actions";
import type { Message } from "../../../lib/workspace";
import { useAiProviders } from "../../ai/useAiProviders";
import Markdown from "../../../components/app/Markdown";
import ChatActionProposal from "../../../components/app/chat/ChatActionProposal";
import { Actions, Card, Lead, Title, fieldClass, pill, type Ctx } from "../ui";

const MSG_COLS = "id,role,body,created_at,attachments";

/**
 * Two screens share one real conversation with the assistant, saved in Chat like any other:
 * "see" asks something and shows the answer (written the way the person said they like); "task" says what needs doing and shows the
 * drafts the assistant prepares. Nothing is saved until the person presses Create on a draft, exactly as in Chat.
 */
const COPY = {
  see: {
    title: "See Naazhi in action.",
    lead: "Ask something and watch it answer. It writes the way you said you like.",
    chips: ["Write a two-line hello in my voice", "What can you help me with?", "Give me a one-sentence reason to start a journal"],
    ph: "Ask Naazhi anything",
    milestone: "ask" as const,
  },
  task: {
    title: "Give Naazhi a task.",
    lead: "Say what you need done. Naazhi drafts it, and you decide whether to keep it.",
    chips: ["Remind me to call Mum on Friday", "Add a to-do: buy printer paper", "Plan a short to-do list for tomorrow morning"],
    ph: "e.g. Remind me to send the invoice on Monday",
    milestone: "task" as const,
  },
};

export function Ask({ ctx, mode }: { ctx: Ctx; mode: "see" | "task" }) {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const { provider, loading } = useAiProviders();
  const c = COPY[mode];
  const [text, setText] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [asked, setAsked] = useState("");
  const [live, setLive] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const noAi = provider === NO_AI.id;

  const messages = useQuery({
    queryKey: qk.chats.messages(chatId ?? "none"),
    enabled: !!chatId,
    queryFn: async () => {
      const { data, error } = await sb.from("chat_messages").select(MSG_COLS).eq("chat_id", chatId!).order("created_at");
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });
  const reply = [...(messages.data ?? [])].reverse().find((m) => m.role === "assistant") ?? null;
  const parsed = reply ? parseChatActions(reply.body) : null;
  const created = parsed?.proposals.some((p) => p.created) ?? false;
  const answered = !!reply && live === null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [live, reply?.id]);

  // A draft the person confirmed counts as a task done; an answer counts as asking.
  useEffect(() => {
    if (mode === "task" ? created : answered) ctx.mark(c.milestone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [created, answered]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || live !== null) return;
    setErr("");
    setAsked(q);
    setText("");
    setLive("");
    try {
      const { data: chat, error } = await sb.from("chats").insert({ title: q.slice(0, 60) }).select("id").single();
      if (error || !chat) throw new Error("chat");
      const id = chat.id as string;
      const { error: e2 } = await sb.from("chat_messages").insert({ chat_id: id, role: "user", body: q, attachments: [] });
      if (e2) throw new Error("message");
      setChatId(id);
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: id, provider, localDate: isoDate() }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "reply");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let out = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
        setLive(parseChatActions(out).body);
      }
      await qc.invalidateQueries({ queryKey: qk.chats.messages(id) });
      void qc.invalidateQueries({ queryKey: qk.chats.all });
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setErr(["chat", "message", "reply"].includes(m) || !m ? "Naazhi couldn’t answer that just now. You can try again or skip this step." : m);
    } finally {
      setLive(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-8">
      <Title>{c.title}</Title>
      <Lead>{c.lead}</Lead>

      {noAi && !loading ? (
        <Card className="mt-8 px-5 py-4">
          <p className="m-0 text-[15px] leading-relaxed text-fg-muted">
            The assistant isn’t switched on here, so there’s nothing to ask yet. Naazhi works without it: you can still write, plan and keep everything. You can turn an AI on later in Settings.
          </p>
        </Card>
      ) : (
        <>
          <form
            className="mt-8 flex gap-2.5 max-[520px]:flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
          >
            <input
              className={fieldClass}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={c.ph}
              maxLength={500}
              aria-label={c.ph}
              disabled={live !== null || loading}
              autoFocus
            />
            <button className="btn btn-primary" disabled={!text.trim() || live !== null || loading}>
              {live !== null ? "Thinking…" : "Ask"}
            </button>
          </form>
          {!asked && (
            <div className="mt-4 flex flex-wrap gap-2">
              {c.chips.map((s) => (
                <button key={s} type="button" className={pill(false)} onClick={() => void ask(s)} disabled={live !== null || loading}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {asked && (
            <div className="mt-8 grid gap-4" aria-live="polite">
              <p className="m-0 justify-self-end rounded-r3 bg-hover px-4 py-2.5 text-[15px] text-fg">{asked}</p>
              <div className="flex items-start gap-3">
                <span aria-hidden className="mt-1 grid size-7 shrink-0 place-items-center rounded-pill bg-hover text-[12px] text-ink-2">
                  <FA icon={faWandMagicSparkles} />
                </span>
                <div className="min-w-0 flex-1 text-[15.5px] leading-relaxed text-fg">
                  {live !== null ? (
                    live ? <Markdown text={live} /> : <span className="text-fg-subtle">Naazhi is thinking…</span>
                  ) : parsed ? (
                    <>
                      {parsed.body && <Markdown text={parsed.body} />}
                      {chatId && reply && parsed.proposals.length > 0 && <ChatActionProposal proposals={parsed.proposals} messageId={reply.id} chatId={chatId} />}
                    </>
                  ) : null}
                </div>
              </div>
              <div ref={endRef} />
            </div>
          )}
          {err && (
            <p className="form-err" role="alert">
              {err}
            </p>
          )}
        </>
      )}

      <Actions
        ctx={ctx}
        note={
          mode === "task"
            ? "Drafts appear as cards. Press Create to save one to your To-do, Notes or Journal; until then nothing is saved."
            : "This conversation is kept in Chat, where you can pick it up any time."
        }
      />
    </div>
  );
}
