import { describe, expect, it } from "vitest";
import { browserOf, clientOf } from "../../src/lib/userAgent";

describe("clientOf", () => {
  it("tells the apps from browsers", () => {
    expect(clientOf("okhttp/4.12.0")).toBe("android");
    expect(clientOf("Naazhi/7.2.0 CFNetwork/1568.100.1 Darwin/24.0.0")).toBe("ios");
    expect(clientOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe("web");
    expect(clientOf(null)).toBe("unknown");
  });
  it("labels browsers", () => {
    expect(browserOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBe("Chrome on macOS");
  });
});
