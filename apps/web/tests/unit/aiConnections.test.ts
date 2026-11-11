import { describe, expect, it } from "vitest";
import { chatgptChoice, connectProvider, ownChoice, parseChatgptChoice, parseOwnChoice } from "@untitled/logic/aiConnections";

describe("model picker ids", () => {
  it("round-trips an own-key model, including ids with slashes and colons", () => {
    expect(parseOwnChoice(ownChoice("openrouter", "openai/gpt-4o:free"))).toEqual({ provider: "openrouter", model: "openai/gpt-4o:free" });
    expect(parseOwnChoice(ownChoice("anthropic", "claude-sonnet-5-5"))).toEqual({ provider: "anthropic", model: "claude-sonnet-5-5" });
  });
  it("round-trips a ChatGPT model and keeps the two kinds apart", () => {
    expect(parseChatgptChoice(chatgptChoice("gpt-5"))).toBe("gpt-5");
    expect(parseOwnChoice(chatgptChoice("gpt-5"))).toBeNull();
    expect(parseChatgptChoice("own:openai:gpt-4o")).toBeNull();
    expect(parseOwnChoice("groq")).toBeNull();
  });
});

describe("connect providers", () => {
  it("only knows the fixed list, with https addresses", () => {
    expect(connectProvider("https://evil.example")).toBeNull();
    for (const id of ["openai", "anthropic", "google", "openrouter"]) expect(connectProvider(id)?.baseUrl).toMatch(/^https:\/\//);
  });
  it("filters live model lists to chat models", () => {
    const o = connectProvider("openai")!;
    expect(o.keep.test("gpt-4o-mini")).toBe(true);
    expect(o.keep.test("text-embedding-3-small")).toBe(false);
    expect(o.keep.test("gpt-4o-audio-preview")).toBe(false);
    expect(connectProvider("google")!.keep.test("gemini-2.0-flash")).toBe(true);
    expect(connectProvider("google")!.keep.test("gemini-embedding-001")).toBe(false);
  });
});
