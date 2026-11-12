import { describe, expect, it } from "vitest";
import { APP_LINK_PREFIXES, APP_LINK_SECTIONS, appRouteForWebPath, isAppLink, toPath } from "./appLinks";

describe("app links", () => {
  it("claims the shared chats and every dashboard page, and nothing from the marketing site", () => {
    for (const p of ["/share/abc", "/dashboard", "/dashboard/todo", "/journal/collaborate", "/todo?v=today", "/notes/n1"]) expect(isAppLink(p), p).toBe(true);
    for (const p of ["/", "/pricing", "/features/notes", "/faq", "/login", "/signup", "/sharepoint", "/journals"]) expect(isAppLink(p), p).toBe(false);
  });

  it("reads a full URL by its path", () => {
    expect(toPath("https://dashboard.naazhi.app/journal/collaborate?x=1")).toBe("/journal/collaborate?x=1");
    expect(isAppLink("https://naazhi.app/pricing")).toBe(false);
    expect(isAppLink("https://dashboard.naazhi.app/share/t")).toBe(true);
  });

  it("opens the same screen from both addresses of a page", () => {
    for (const [web, app] of [
      ["/dashboard/journal/collaborate", "/journal/collaborate"],
      ["/journal/collaborate", "/journal/collaborate"],
      ["/dashboard/journal/shared/j1", "/journal/shared/j1"],
      ["/journal/shared/j1", "/journal/shared/j1"],
      ["/dashboard", "/home"],
      ["/home", "/home"],
      ["/dashboard/notes/n1", "/note/n1"],
      ["/notes", "/notes"],
      ["/dashboard/todo?v=today", "/todo?v=today"],
      ["/calendar", "/todo"],
      ["/workspace/reader/r1", "/reader/r1"],
      ["/dashboard/health/steps", "/health/steps"],
      ["/dashboard/settings/billing", "/profile"],
      ["/share/tok", "/share/tok"],
      ["https://dashboard.naazhi.app/journal/collaborate", "/journal/collaborate"],
    ] as const)
      expect(appRouteForWebPath(web), web).toBe(app);
  });

  it("leaves paths the app has no screen for alone", () => {
    expect(appRouteForWebPath("/pricing")).toBeNull();
    expect(appRouteForWebPath("/dashboard/something-new")).toBeNull();
  });

  it("maps every section it claims to a screen", () => {
    for (const s of APP_LINK_SECTIONS) expect(appRouteForWebPath(`/${s}`), s).not.toBeNull();
    expect(APP_LINK_PREFIXES).toContain("/share");
  });
});
