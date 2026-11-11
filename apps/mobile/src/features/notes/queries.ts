import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemResponse, ListResponse, Note, Tone } from "@untitled/types";

import { dbQuery } from "@/features/chat/db";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

export function useNotes() {
  return useQuery({
    queryKey: qk.notes,
    queryFn: async () => {
      const { data } = await api.get<ListResponse<Note>>("/api/v1/notes?limit=500");
      // Match the web's default manual order while keeping pinned notes at the top.
      return [...data].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.sort_order - a.sort_order);
    },
  });
}

export function useNote(id: string | undefined) {
  const enabled = !!id && id !== "new";
  return useQuery({
    queryKey: [...qk.notes, id],
    enabled,
    queryFn: async () => (await api.get<ItemResponse<Note>>(`/api/v1/notes/${id}`)).data,
  });
}

export type NoteInput = { title: string; body: string; pinned?: boolean; color?: Tone | null; category?: string; attachments?: Note["attachments"]; sort_order?: number };

export function useNoteActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.notes });
  const create = useMutation({ mutationFn: (n: NoteInput) => api.post<ItemResponse<Note>>("/api/v1/notes", n), onSettled: refresh });
  const update = useMutation({
    mutationFn: ({ id, ...changes }: Partial<NoteInput> & { id: string }) => api.patch<ItemResponse<Note>>(`/api/v1/notes/${id}`, changes),
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.delete<{ ok: true }>(`/api/v1/notes/${id}`), onSettled: refresh });
  return { create, update, remove };
}

/** Days a note stays in the Trash before it is deleted for good (the same as the web). */
export const TRASH_DAYS = 30;
export type TrashedNote = Note & { deleted_at: string };

const TRASH_KEY = [...qk.notes, "trash"] as const;
const COLUMNS = "id,title,body,category,pinned,color,kind,attachments,updated_at,created_at,sort_order,labels,folder_id,deleted_at";

/** Notes moved to the Trash, newest first. */
export function useTrashedNotes() {
  return useQuery({
    queryKey: TRASH_KEY,
    queryFn: async () =>
      ((await dbQuery<TrashedNote[]>({
        table: "notes",
        op: "select",
        columns: COLUMNS,
        filters: [{ column: "deleted_at", op: "is", value: null, not: true }],
        order: [{ column: "deleted_at", ascending: false }],
        limit: 1000,
      })) ?? []),
  });
}

/** Trash, restore and delete-forever. A trashed note leaves the list and its public link stops working until it is restored. */
export function useTrashActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: qk.notes });
  const trash = useMutation({
    mutationFn: (ids: string[]) =>
      dbQuery({ table: "notes", op: "update", values: { deleted_at: new Date().toISOString() }, filters: [{ column: "id", op: "in", value: ids }], returning: null }),
    onSettled: refresh,
  });
  const restore = useMutation({
    mutationFn: (ids: string[]) => dbQuery({ table: "notes", op: "update", values: { deleted_at: null }, filters: [{ column: "id", op: "in", value: ids }], returning: null }),
    onSettled: refresh,
  });
  /** Deletes notes for good: their files first, then the rows. */
  const erase = useMutation({
    mutationFn: async (list: Note[]) => {
      if (!list.length) return;
      const paths = list.flatMap((n) => (n.attachments ?? []).map((a) => a.path));
      if (paths.length) await api.post("/api/v1/storage/remove", { bucket: "note-files", paths });
      await dbQuery({ table: "notes", op: "delete", filters: [{ column: "id", op: "in", value: list.map((n) => n.id) }], returning: null });
    },
    onSettled: refresh,
  });
  return { trash, restore, erase };
}
