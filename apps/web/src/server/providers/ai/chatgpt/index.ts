import "server-only";
import { AiProviderError, type AiChunk, type AiProvider, type AiRequest } from "../types";

type Event = { type?: string; delta?: string; response?: { usage?: { input_tokens?: number; output_tokens?: number } } };

/**
 * Answers with the person's own ChatGPT plan, using the sign-in they did in the model picker (Settings → connections). It speaks the
 * Responses format: the system message becomes `instructions`, the rest the conversation. The access token, account id and address
 * come in `req.credentials` for this one request (opened by services/ai/connections.service.ts) and are never stored or logged here.
 * It isn't in the picker's server list: the connections catalog offers it once the person has signed in.
 */
export const chatgptProvider: AiProvider = {
  id: "chatgpt",
  label: "ChatGPT",
  note: "Your ChatGPT plan",
  runtime: "server",
  hidden: true,
  isAvailable: () => true,

  async *stream(req: AiRequest): AsyncGenerator<AiChunk> {
    const c = req.credentials;
    if (!c || !req.model) throw new AiProviderError("Connect your ChatGPT account to use it.", "chatgpt", "not_configured");
    const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const input = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        type: "message",
        role: m.role,
        content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }],
      }));

    let res: Response;
    try {
      res = await fetch(`${c.baseUrl}/responses`, {
        method: "POST",
        headers: { authorization: `Bearer ${c.apiKey}`, "content-type": "application/json", accept: "text/event-stream", ...(c.headers ?? {}) },
        body: JSON.stringify({ model: req.model, instructions: system, input, stream: true, store: false }),
        signal: req.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      throw new AiProviderError("Couldn’t reach ChatGPT.", "chatgpt", "failed");
    }
    if (!res.ok || !res.body) {
      // ChatGPT's response body is never passed on: it can echo parts of the request.
      const msg =
        res.status === 401 || res.status === 403
          ? "ChatGPT didn’t accept the connection. Reconnect it from the model picker."
          : res.status === 429
            ? "Your ChatGPT plan is rate limited right now. Try again later."
            : "ChatGPT couldn’t answer that.";
      throw new AiProviderError(msg, "chatgpt", res.status === 429 ? "rate_limited" : "failed");
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let usage: { inputTokens: number; outputTokens: number } | undefined;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          let ev: Event;
          try {
            ev = JSON.parse(line.slice(5).trim()) as Event;
          } catch {
            continue;
          }
          if (ev.type === "response.output_text.delta" && ev.delta) yield { type: "text", text: ev.delta };
          if (ev.type === "response.completed" && ev.response?.usage)
            usage = { inputTokens: ev.response.usage.input_tokens ?? 0, outputTokens: ev.response.usage.output_tokens ?? 0 };
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      throw new AiProviderError("The reply was interrupted.", "chatgpt", "failed");
    } finally {
      reader.releaseLock();
    }
    yield { type: "done", usage };
  },
};
