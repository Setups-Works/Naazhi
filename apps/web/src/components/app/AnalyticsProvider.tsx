"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBilling } from "../../features/billing/queries";
import { identify, syncAnalytics, trackPage } from "../../lib/analytics";

/** Page views and the person's plan for Firebase Analytics, inside the signed-in app only. Renders nothing. */
export default function AnalyticsProvider({ userId }: { userId: string }) {
  const pathname = usePathname();
  const plan = useBilling().data?.plan?.id ?? "none";
  useEffect(() => {
    void syncAnalytics().then(() => identify(userId, { plan }));
  }, [userId, plan]);
  useEffect(() => {
    void trackPage(pathname);
  }, [pathname]);
  return null;
}
