import { afterEach, describe, expect, it, vi } from "vitest";

/** `publicEnv` is read when the module loads, so each case sets the environment first and imports fresh. */
async function load(site?: string, app?: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", site ?? "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", app ?? "");
  return import("../../src/lib/hosts");
}

afterEach(() => vi.unstubAllEnvs());

describe("hosts", () => {
  it("does nothing until both addresses are set and different", async () => {
    for (const [site, app] of [
      [undefined, undefined],
      ["https://naazhi.app", undefined],
      ["https://naazhi.app", "https://naazhi.app"],
    ] as const) {
      const h = await load(site, app);
      expect(h.isSplit()).toBe(false);
      expect(h.appHref("/login")).toBe("/login");
      expect(h.siteHref("/pricing")).toBe("/pricing");
    }
  });

  it("sends app links to the app host when the website and the app are apart", async () => {
    const h = await load("https://naazhi.app", "https://dashboard.naazhi.app/");
    expect(h.isSplit()).toBe(true);
    expect(h.appHref("/signup")).toBe("https://dashboard.naazhi.app/signup");
    expect(h.siteHref("/pricing")).toBe("https://naazhi.app/pricing");
  });

  it("lands signed-in people on /home on the app host and /dashboard otherwise", async () => {
    expect((await load("https://naazhi.app", "https://dashboard.naazhi.app")).homePath()).toBe("/home");
    expect((await load()).homePath()).toBe("/dashboard");
  });

  it("knows which paths belong to the app", async () => {
    const h = await load();
    for (const p of ["/dashboard", "/home", "/dashboard/notes", "/admin/users", "/login", "/signup", "/share/abc"]) expect(h.isAppPath(p)).toBe(true);
    for (const p of ["/", "/pricing", "/download", "/how-it-works", "/dashboards", "/loginx"]) expect(h.isAppPath(p)).toBe(false);
  });
});
