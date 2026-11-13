import "server-only";
import { pingCache, pingDatabase } from "../../repositories/status.repository";

export type ServiceState = "up" | "down";
export type ServiceStatus = { id: string; name: string; description: string; state: ServiceState };
export type StatusReport = { overall: "operational" | "disrupted"; checkedAt: string; services: ServiceStatus[] };

/** A service that doesn't answer in time counts as down; the page must never hang because something behind it did. */
async function check(run: () => Promise<unknown>, ms = 3000): Promise<ServiceState> {
  try {
    await Promise.race([run(), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
    return "up";
  } catch {
    return "down";
  }
}

/** The state of what Naazhi runs on. The website is up by definition (this page was served); the rest are checked now. */
export async function getStatusReport(): Promise<StatusReport> {
  const [database, cacheConfigured] = await Promise.all([
    check(pingDatabase),
    pingCache().then(
      (configured) => (configured ? ("up" as const) : null),
      () => "down" as const,
    ),
  ]);
  const services: ServiceStatus[] = [
    { id: "website", name: "Website", description: "These pages and the web app.", state: "up" },
    { id: "accounts", name: "Sign-in and your workspace", description: "Your account, notes, tasks, journal and chats.", state: database },
  ];
  if (cacheConfigured) services.push({ id: "realtime", name: "Live updates", description: "Chat and shared journals updating as they change.", state: cacheConfigured });
  return {
    overall: services.every((s) => s.state === "up") ? "operational" : "disrupted",
    checkedAt: new Date().toISOString(),
    services,
  };
}
