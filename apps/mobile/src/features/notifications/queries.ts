import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type AppNotification = { id: string; kind: "admin" | "invite" | "reader"; title: string; body: string; url: string | null; read_at: string | null; created_at: string };
type Inbox = { items: AppNotification[]; unread: number };

const KEY = ["notifications"] as const;
/** The app has no realtime, so the inbox re-reads now and then while it is on screen. */
const POLL_MS = 60_000;

export const useInbox = () => useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Inbox }>("/api/v1/notifications")).data, refetchInterval: POLL_MS });

export function useInboxActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const read = useMutation({ mutationFn: (id: string | null) => api.post("/api/v1/notifications/read", { id }), onSettled: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/api/v1/notifications/${id}`), onSettled: refresh });
  return { read, remove };
}
