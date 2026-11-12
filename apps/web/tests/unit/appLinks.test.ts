import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_LINK_PREFIXES, APP_LINK_SECTIONS } from "@untitled/logic";
import { DASHBOARD_SECTIONS } from "../../src/lib/hosts";

const require = createRequire(import.meta.url);

describe("app links stay in step", () => {
  it("claims exactly the dashboard sections the website serves on the app address", () => {
    expect([...APP_LINK_SECTIONS].sort()).toEqual([...DASHBOARD_SECTIONS].sort());
  });

  it("is the same list the Android intent filters use", () => {
    const old = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = "https://dashboard.example.test";
    try {
      const config = require(join(process.cwd(), "..", "mobile", "app.config.js")) as (a: { config: Record<string, unknown> }) => {
        android: { intentFilters: { data: { host: string; pathPrefix: string }[] }[] };
      };
      const data = config({ config: { ios: {}, android: {}, plugins: [] } }).android.intentFilters[0]!.data;
      expect(data.map((d) => d.pathPrefix).sort()).toEqual([...APP_LINK_PREFIXES].sort());
      expect(new Set(data.map((d) => d.host))).toEqual(new Set(["dashboard.example.test"]));
    } finally {
      if (old === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = old;
    }
  });
});
