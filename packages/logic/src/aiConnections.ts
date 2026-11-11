/**
 * The AI providers a person can connect from the model picker ("Add key"), and the models each offers. Fixed on purpose: the server
 * only ever calls these addresses (never one taken from user input). Every one speaks the OpenAI chat-completions format
 * (Anthropic and Google through their OpenAI-compatible endpoints). `models` is the list shown before a key is added and the
 * fallback when a provider's own model list can't be fetched; once a key is saved the provider's live list is used where it has one.
 */
export type ConnectProviderId = "openai" | "anthropic" | "google" | "openrouter";

export type ConnectModel = { id: string; label: string; note: string };

export type ConnectProvider = {
  id: ConnectProviderId;
  label: string;
  keyUrl: string;
  baseUrl: string;
  /** Live model ids to keep when listing (the providers return everything, including embeddings and audio models). */
  keep: RegExp;
  models: ConnectModel[];
};

export const CONNECT_PROVIDERS: ConnectProvider[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    baseUrl: "https://api.anthropic.com/v1",
    keep: /^claude-/,
    models: [
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fast and light" },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Balanced" },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Most capable" },
      { id: "claude-fable-5-2", label: "Claude Fable 5.2", note: "Most capable" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "https://api.openai.com/v1",
    keep: /^(gpt-|o\d|chatgpt-)(?!.*(audio|realtime|transcribe|tts|image|embedding|moderation|search|instruct))/,
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o mini", note: "Fast and light" },
      { id: "gpt-4.1", label: "GPT-4.1", note: "Balanced" },
    ],
  },
  {
    id: "google",
    label: "Google",
    keyUrl: "https://aistudio.google.com/apikey",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keep: /^gemini-(?!.*(embedding|tts|image|live|robotics))/,
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", note: "Fast and light" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Most capable" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/keys",
    baseUrl: "https://openrouter.ai/api/v1",
    keep: /^[\w.-]+\/[\w.:-]+$/,
    models: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini", note: "Fast and light" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", note: "Balanced" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", note: "Balanced" },
    ],
  },
];

export const connectProvider = (id: string) => CONNECT_PROVIDERS.find((p) => p.id === id) ?? null;

/** A readable label for a live model id ("claude-sonnet-5-5" → "Claude Sonnet 5 5" is not it: known models keep their curated name). */
export const modelLabel = (p: ConnectProvider, id: string) =>
  p.models.find((m) => m.id === id)?.label ?? id.replace(/^models\//, "").replace(/^[^/]+\//, "");

/**
 * The model picker's ids: "own:<provider>:<model>" for a key the person added, "chatgpt:<model>" for their ChatGPT sign-in.
 * Models can contain ":" and "/" (OpenRouter), so only the first two parts are split off.
 */
export const ownChoice = (provider: string, model: string) => `own:${provider}:${model}`;
export const parseOwnChoice = (id: string): { provider: string; model: string } | null => {
  const m = /^own:([a-z0-9_-]{1,40}):(.{1,160})$/.exec(id);
  return m ? { provider: m[1], model: m[2] } : null;
};
export const chatgptChoice = (model: string) => `chatgpt:${model}`;
export const parseChatgptChoice = (id: string): string | null => /^chatgpt:(.{1,160})$/.exec(id)?.[1] ?? null;
