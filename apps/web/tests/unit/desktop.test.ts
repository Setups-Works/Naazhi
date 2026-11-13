import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESKTOP, DESKTOP_SECTIONS, deepLinkPath } from "@untitled/types";

const link = (s: string) => deepLinkPath(new URL(s));

describe("desktop deep links", () => {
  it("opens a section, a page inside it and keeps the query", () => {
    expect(link(`${DESKTOP.scheme}://todo`)).toBe("/dashboard/todo");
    expect(link(`${DESKTOP.scheme}://notes/abc-123?x=1`)).toBe("/dashboard/notes/abc-123?x=1");
    expect(link(`${DESKTOP.scheme}://home`)).toBe("/dashboard");
  });

  it("refuses other schemes, unknown sections and path tricks", () => {
    expect(link("https://todo/")).toBeNull();
    expect(link(`${DESKTOP.scheme}://admin`)).toBeNull();
    // The URL parser collapses ".." itself, so a link can never climb out of its section.
    expect(link(`${DESKTOP.scheme}://notes/../../admin`)).toBe("/dashboard/notes/admin");
    expect(link(`${DESKTOP.scheme}://notes//evil.example`)).toBeNull();
  });

  it("only points at pages inside the dashboard", () => {
    for (const s of DESKTOP_SECTIONS) expect(s.path.startsWith("/dashboard")).toBe(true);
  });
});

describe("desktop identity", () => {
  it("is the one place the installer and the web app read from", () => {
    const file = JSON.parse(readFileSync(new URL("../../../../packages/types/src/desktop.json", import.meta.url), "utf8"));
    expect(file).toEqual(DESKTOP);
  });
});
