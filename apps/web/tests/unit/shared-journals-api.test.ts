import { createSharedJournalsApi, type Http } from "@untitled/api-client";
import { describe, expect, it } from "vitest";

/** A fake HTTP adapter that records what was asked and answers with an empty data envelope. */
function fake() {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const answer = (method: string) => async (path: string, body?: unknown) => {
    calls.push({ method, path, body });
    return { data: method === "GET" ? ([] as unknown[]) : null } as never;
  };
  const http: Http = { get: answer("GET"), post: answer("POST"), patch: answer("PATCH"), delete: answer("DELETE") };
  return { api: createSharedJournalsApi(http), calls };
}

describe("shared journals API client", () => {
  it("asks for one day's entries by date", async () => {
    const { api, calls } = fake();
    await api.entriesOn("j1", "2026-11-12");
    expect(calls[0]).toEqual({ method: "GET", path: "/api/v1/shared-journals/j1/entries?date=2026-11-12" });
  });

  it("asks for the days that have writing", async () => {
    const { api, calls } = fake();
    await api.days("j1");
    expect(calls[0]).toEqual({ method: "GET", path: "/api/v1/shared-journals/j1/days" });
  });

  it("sends an invitation to a username or an email in the same field", async () => {
    const { api, calls } = fake();
    await api.invite("j1", "ada@example.com", "editor");
    expect(calls[0]).toEqual({
      method: "POST",
      path: "/api/v1/shared-journals/j1/invites",
      body: { username: "ada@example.com", role: "editor" },
    });
  });
});
