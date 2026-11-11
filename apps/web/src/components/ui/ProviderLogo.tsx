"use client";
import { BrandLogo } from "./BrandLogo";

/**
 * The logo of an AI provider in the model picker. The single-colour marks (downloaded from Wikimedia Commons and simple-icons) are
 * drawn as a mask so they follow the ink colour in every scheme; Google keeps its colours.
 */
const FILE: Record<string, string> = {
  chatgpt: "ai-openai.svg",
  openai: "ai-openai.svg",
  anthropic: "ai-anthropic.svg",
  openrouter: "ai-openrouter.svg",
};

export function ProviderLogo({ id, size = 18 }: { id: string; size?: number }) {
  if (id === "google") return <BrandLogo name="google" size={size} />;
  const f = FILE[id];
  if (!f) return <span aria-hidden className="font-semibold">{id.charAt(0).toUpperCase()}</span>;
  const url = `url(/logos/${f})`;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 bg-ink-2"
      style={{ width: size, height: size, WebkitMask: `${url} center / contain no-repeat`, mask: `${url} center / contain no-repeat` }}
    />
  );
}
