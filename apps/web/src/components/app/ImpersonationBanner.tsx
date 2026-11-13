"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faUserSecret } from "@fortawesome/free-solid-svg-icons";
import { authClient } from "../../lib/auth/client";

/** Shown only while an admin is viewing the app as another person (a session with `impersonatedBy`). */
export default function ImpersonationBanner() {
  const { data } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const session = data?.session as { impersonatedBy?: string | null } | undefined;
  if (!session?.impersonatedBy) return null;

  const stop = async () => {
    setBusy(true);
    try {
      await authClient.admin.stopImpersonating();
    } finally {
      window.location.href = "/admin/users";
    }
  };
  return (
    <div className="bg-amber-bg text-amber-fg flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-sm" role="status">
      <FA icon={faUserSecret} />
      <span>
        You are viewing as <strong>{data?.user.email}</strong>. What you do here is done as them.
      </span>
      <button className="btn btn-secondary btn-sm" disabled={busy} onClick={stop}>
        Stop viewing
      </button>
    </div>
  );
}
