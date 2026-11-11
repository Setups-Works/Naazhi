"use client";
import { fetchJournalDayShare, journalDayShareUrl, setJournalDayShared } from "@untitled/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ShareLinkDialog from "../../../components/app/ShareLinkDialog";
import { http, restMessage } from "../../../lib/api/rest";
import { qk } from "../../../lib/query/keys";

/**
 * Share one whole day of the journal: a secret link that shows every entry written that day (read-only, no name), including entries
 * added later, until it is switched off. Meant for sending a full day to a team or company.
 */
export default function ShareDayDialog({ date, heading, onClose }: { date: string; heading: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: qk.journal.share(date), queryFn: () => fetchJournalDayShare(http, date) });
  const token = q.data ?? null;

  async function toggle(on: boolean) {
    setBusy(true);
    setErr("");
    try {
      qc.setQueryData(qk.journal.share(date), await setJournalDayShared(http, date, on));
    } catch (e) {
      setErr(restMessage(e, "Couldn’t change sharing."));
    }
    setBusy(false);
  }

  return (
    <ShareLinkDialog
      title="Share this day"
      noun={heading}
      url={token ? journalDayShareUrl(window.location.origin, token) : null}
      busy={busy || q.isPending}
      err={err || (q.isError ? "Couldn’t load sharing for this day." : "")}
      detail={`Every entry from ${heading}, including ones you add later. No name is shown, and you can switch it off at any time.`}
      onToggle={(on) => void toggle(on)}
      onClose={onClose}
    />
  );
}
