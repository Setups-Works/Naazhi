/**
 * Which kind of client a sign-in came from, read from its user-agent. The phone app's network layer identifies itself as okhttp (Android) or
 * CFNetwork/Darwin (iOS) and never as a browser; every browser says "Mozilla/", including phone browsers, which count as the web.
 */
export type Client = "web" | "android" | "ios" | "unknown";

export function clientOf(agent: string | null | undefined): Client {
  if (!agent) return "unknown";
  if (/Mozilla\//.test(agent)) return "web";
  if (/CFNetwork|Darwin/.test(agent)) return "ios";
  if (/okhttp|Dalvik/i.test(agent)) return "android";
  return "unknown";
}

export const CLIENT_LABEL: Record<Client, string> = { web: "Web", android: "Android app", ios: "iPhone app", unknown: "Unknown" };

/** "Chrome on macOS" style label for a browser user-agent. */
export function browserOf(agent: string | null | undefined): string {
  if (!agent) return "Unknown";
  if (clientOf(agent) !== "web") return CLIENT_LABEL[clientOf(agent)];
  const browser = /Edg\//.test(agent) ? "Edge" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Other";
  const os = /Windows/.test(agent) ? "Windows" : /iPhone|iPad/.test(agent) ? "iOS" : /Android/.test(agent) ? "Android" : /Mac OS X/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
