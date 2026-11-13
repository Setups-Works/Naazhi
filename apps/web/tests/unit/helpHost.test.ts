import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The proxy and the address helpers read NEXT_PUBLIC_* at import time, so each case sets them first and imports a fresh copy. */
async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://naazhi.app");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://dashboard.naazhi.app");
  vi.stubEnv("NEXT_PUBLIC_HELP_URL", "https://help.naazhi.app");
  const [{ proxy }, hosts, seo, help] = await Promise.all([
    import("../../src/proxy"),
    import("../../src/lib/hosts"),
    import("../../src/lib/seo"),
    import("../../src/features/help/seo"),
  ]);
  return { proxy, hosts, seo, help };
}
const req = (host: string, path: string) => new NextRequest(`https://${host}${path}`, { headers: { host } });
const rewritten = (r: Response) => r.headers.get("x-middleware-rewrite");
const redirected = (r: Response) => r.headers.get("location");

afterEach(() => vi.unstubAllEnvs());

describe("help.naazhi.app", () => {
  it("serves the help center from the root of its own host", async () => {
    const { proxy } = await load();
    expect(rewritten(proxy(req("help.naazhi.app", "/")))).toBe("https://help.naazhi.app/help-center");
    expect(rewritten(proxy(req("help.naazhi.app", "/troubleshooting/cant-sign-in")))).toBe("https://help.naazhi.app/help-center/troubleshooting/cant-sign-in");
    expect(rewritten(proxy(req("help.naazhi.app", "/search?q=x")))).toContain("/help-center/search");
  });

  it("sends sign-in and app pages to the app host, not a 404 on the help host", async () => {
    const { proxy } = await load();
    expect(redirected(proxy(req("help.naazhi.app", "/login")))).toBe("https://dashboard.naazhi.app/login");
  });

  it("hands /help on the website over to the help host without the /help prefix", async () => {
    const { proxy } = await load();
    expect(redirected(proxy(req("naazhi.app", "/help")))).toBe("https://help.naazhi.app/");
    expect(redirected(proxy(req("naazhi.app", "/help/apps/install-the-android-app")))).toBe("https://help.naazhi.app/apps/install-the-android-app");
  });

  it("never answers at the internal address, except for the share picture", async () => {
    const { proxy } = await load();
    expect(redirected(proxy(req("help.naazhi.app", "/help-center/apps")))).toBe("https://help.naazhi.app/apps");
    expect(redirected(proxy(req("naazhi.app", "/help-center/apps")))).toBe("https://help.naazhi.app/apps");
    expect(redirected(proxy(req("help.naazhi.app", "/help-center/opengraph-image")))).toBeNull();
  });

  it("builds every address on the help host, for links, canonicals and structured data", async () => {
    const { hosts, seo, help } = await load();
    expect(hosts.isHelpSplit()).toBe(true);
    expect(hosts.helpHref("/")).toBe("https://help.naazhi.app/");
    expect(hosts.helpHref("/apps/x")).toBe("https://help.naazhi.app/apps/x");
    expect(hosts.helpPath("/apps/x")).toBe("/apps/x");
    expect(seo.absoluteUrl("/help/apps/x")).toBe("https://help.naazhi.app/apps/x");
    expect(seo.absoluteUrl("/pricing")).toBe("https://naazhi.app/pricing");
    expect(help.helpUrl("/apps/x")).toBe("https://help.naazhi.app/apps/x");
    const meta = help.helpMeta({ title: "t", description: "d", path: "/apps/x" });
    expect(meta.alternates?.canonical).toBe("/apps/x");
  });
});
