import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faBookOpen, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import type { SharedJournal } from "../types";
import RolePill from "./RolePill";

/** One shared journal in the list: who it belongs to, how busy it is, and the two things you can do with it. */
export default function JournalCard({ journal, onManage }: { journal: SharedJournal; onManage: () => void }) {
  const mine = journal.role === "owner";
  return (
    <li className="flex flex-col gap-3 rounded-r3 border bg-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 min-w-0 text-[18px] leading-[1.25] font-semibold tracking-[-0.015em] text-balance [overflow-wrap:anywhere]">
          {journal.name}
        </h3>
        <RolePill role={journal.role} />
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <FA icon={faUserGroup} aria-hidden /> {journal.member_count} {journal.member_count === 1 ? "person" : "people"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FA icon={faBookOpen} aria-hidden /> {journal.entry_count} {journal.entry_count === 1 ? "entry" : "entries"}
        </span>
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Link href={`/dashboard/journal/shared/${journal.id}`} className="btn btn-primary btn-sm">
          Open
        </Link>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onManage}>
          {mine ? "Manage" : "People"}
        </button>
      </div>
    </li>
  );
}
