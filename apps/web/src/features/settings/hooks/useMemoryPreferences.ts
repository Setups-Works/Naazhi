"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../../lib/query/keys";

export interface MemoryPreferenceData {
  enabled: boolean;
  paused: boolean;
  updatedAt: string;
  available: boolean;
}

async function fetchPreferences(): Promise<MemoryPreferenceData> {
  const res = await fetch("/api/v1/memory/preferences");
  if (!res.ok) throw new Error("Failed to load memory preferences.");
  return res.json() as Promise<MemoryPreferenceData>;
}

export function useMemoryPreferences() {
  return useQuery({
    queryKey: qk.memory.preferences,
    queryFn: fetchPreferences,
  });
}

export function useMemoryActions() {
  const qc = useQueryClient();

  const enable = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/memory/enable", { method: "POST" });
      if (!res.ok) throw new Error("Failed to enable memory.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.memory.preferences });
    },
  });

  const pause = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/memory/pause", { method: "POST" });
      if (!res.ok) throw new Error("Failed to pause memory.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.memory.preferences });
    },
  });

  const resume = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/memory/resume", { method: "POST" });
      if (!res.ok) throw new Error("Failed to resume memory.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.memory.preferences });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/memory/all", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear memories.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.memory.preferences });
    },
  });

  return { enable, pause, resume, clearAll };
}
