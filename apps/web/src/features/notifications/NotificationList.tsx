"use client";
import { NOTIFICATION_KINDS, ago, notificationTarget } from "@untitled/logic";
import type { AppNotification, NotificationKind } from "@untitled/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faBullhorn, faNewspaper, faUserGroup, faXmark } from "@fortawesome/free-solid-svg-icons";
import { publicPath } from "../../lib/hosts";
import { useInbox, useInboxActions } from "./queries";

/** The icon for each kind; the names come from packages/logic, the icons are the web's. */
const ICON: Record<NotificationKind, IconDefinition> = { admin: faBullhorn, invite: faUserGroup, reader: faNewspaper };

/** A notification's in-app path becomes a web address: the web app lives under /dashboard. */
const webHref = (path: string) => publicPath(`/dashboard${path}`);

/**
 * The inbox as a list: the same messages the phone shows. Opening it marks what is there as read (like the phone does), a row opens
 * the place it points at, and Dismiss deletes it. `onNavigate` lets a panel close itself when a row sends you elsewhere.
 */
export default function NotificationList({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const inbox = useInbox();
  const { read, remove } = useInboxActions();
  const unread = inbox.data?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) read.mutate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per arrival of new unread items
  }, [unread]);

  if (inbox.isPending) return <p className="m-0 py-10 text-center text-[14px] text-ink-3">Loading…</p>;
  if (inbox.isError)
    return (
      <p className="form-err" role="alert">
        Couldn’t load your notifications.{" "}
        <button type="button" className="underline" onClick={() => void inbox.refetch()}>
          Try again
        </button>
      </p>
    );
  if (inbox.data.items.length === 0)
    return <p className="m-0 py-10 text-center text-[14px] text-ink-3">Nothing yet. Messages from the team, shared-journal invitations and new articles show up here.</p>;

  const open = (n: AppNotification) => {
    const target = notificationTarget(n);
    if (!target) return;
    onNavigate?.();
    router.push(webHref(target));
  };

  return (
    <ul className="m-0 list-none divide-y divide-line p-0">
      {inbox.data.items.map((n) => (
        <li key={n.id} className="flex items-start gap-3 py-3.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-ctl bg-hover text-[13px] text-ink-2" aria-hidden>
            <FA icon={ICON[n.kind]} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 flex items-baseline gap-2 text-[12.5px] text-ink-3">
              <span>{NOTIFICATION_KINDS[n.kind].label}</span>
              <span aria-hidden>·</span>
              <time dateTime={n.created_at}>{ago(n.created_at)}</time>
            </p>
            {notificationTarget(n) ? (
              <button type="button" className="mt-0.5 block text-left text-[15px] font-semibold hover:underline" onClick={() => open(n)}>
                {n.title}
              </button>
            ) : (
              <b className="mt-0.5 block text-[15px] font-semibold">{n.title}</b>
            )}
            {n.body && <p className="m-0 mt-0.5 text-[14px] text-ink-2 [overflow-wrap:anywhere]">{n.body}</p>}
          </div>
          <button type="button" className="ne-btn" aria-label={`Dismiss “${n.title}”`} title="Dismiss" onClick={() => remove.mutate(n.id)}>
            <FA icon={faXmark} />
          </button>
        </li>
      ))}
    </ul>
  );
}
