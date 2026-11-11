import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { INBOX_POLL_MS, type AppNotification, type Inbox } from "@untitled/logic";

import { api } from "@/lib/api";

export type { AppNotification };

const KEY = ["notifications"] as const;

export const useInbox = () => useQuery({ queryKey: KEY, queryFn: async () => (await api.get<{ data: Inbox }>("/api/v1/notifications")).data, refetchInterval: INBOX_POLL_MS });

export function useInboxActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const read = useMutation({ mutationFn: (id: string | null) => api.post("/api/v1/notifications/read", { id }), onSettled: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/api/v1/notifications/${id}`), onSettled: refresh });
  return { read, remove };
}
