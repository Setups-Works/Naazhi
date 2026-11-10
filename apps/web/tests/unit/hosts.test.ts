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

  it("shows dashboard pages without the /dashboard prefix on the app host", async () => {
    const h = await load("https://naazhi.app", "https://dashboard.naazhi.app");
    expect(h.publicPath("/dashboard")).toBe("/home");
    expect(h.publicPath("/dashboard?x=1")).toBe("/home?x=1");
    expect(h.publicPath("/dashboard/workspace")).toBe("/workspace");
    expect(h.publicPath("/dashboard/todo?v=today&add=1")).toBe("/todo?v=today&add=1");
    expect(h.publicPath("/dashboard/workspace/reader/abc")).toBe("/workspace/reader/abc");
    expect(h.publicPath("/dashboardx")).toBe("/dashboardx");
    expect(h.publicPath("/admin/users")).toBe("/admin/users");
  });

  it("leaves addresses alone on a single host", async () => {
    const h = await load();
    expect(h.publicPath("/dashboard/workspace")).toBe("/dashboard/workspace");
    expect(h.publicPath("/dashboard")).toBe("/dashboard");
  });

  it("maps a clean address back to the route that serves it", async () => {
    const h = await load();
    expect(h.internalPath("/home")).toBe("/dashboard");
    expect(h.internalPath("/workspace")).toBe("/dashboard/workspace");
    expect(h.internalPath("/workspace/reader")).toBe("/dashboard/workspace/reader");
    expect(h.internalPath("/dashboard/workspace")).toBe("/dashboard/workspace");
    expect(h.internalPath("/pricing")).toBe("/pricing");
    expect(h.internalPath("/todos")).toBe("/todos");
  });

  it("knows which paths belong to the app", async () => {
    const h = await load();
    for (const p of ["/dashboard", "/home", "/todo", "/workspace/reader", "/dashboard/notes", "/admin/users", "/login", "/signup", "/share/abc"]) expect(h.isAppPath(p)).toBe(true);
    for (const p of ["/", "/pricing", "/download", "/how-it-works", "/dashboards", "/loginx"]) expect(h.isAppPath(p)).toBe(false);
  });
});
