"use client";
import { useEffect } from "react";

/** The first time a signed-in person opens the app on this browser, tell the server where they came from (it reads the cookie itself). */
export default function AcquisitionSync({ userId }: { userId: string }) {
  useEffect(() => {
    const key = `nz_acq_${userId}`;
    try {
      if (window.localStorage.getItem(key)) return;
    } catch {
      /* storage blocked: try each visit, the server ignores repeats */
    }
    fetch("/api/v1/acquisition", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then((r) => {
        if (!r.ok) return;
        try {
          window.localStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      })
      .catch(() => undefined);
  }, [userId]);
  return null;
}
