"use client";
import { deleteNotification, fetchInbox, markNotificationRead } from "@untitled/api-client";
import { INBOX_POLL_MS } from "@untitled/logic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "../../lib/api/rest";
import { qk } from "../../lib/query/keys";

/** The inbox. The same server route and polling interval as the phone app (shared in packages/logic and packages/api-client). */
export const useInbox = () =>
  useQuery({ queryKey: qk.notifications, queryFn: () => fetchInbox(http), refetchInterval: INBOX_POLL_MS, refetchOnWindowFocus: true });

export function useInboxActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.notifications });
  const read = useMutation({ mutationFn: (id: string | null) => markNotificationRead(http, id), onSettled: refresh });
  const remove = useMutation({ mutationFn: (id: string) => deleteNotification(http, id), onSettled: refresh });
  return { read, remove };
}
