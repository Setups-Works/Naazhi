"use client";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api/client";
import { qk } from "../../lib/query/keys";

export type Skill = { id: string; name: string; description: string; prompt: string };

/** The person's saved prompts, newest last, and a way to refresh the list after a change. */
export function useSkills() {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: qk.skills,
    queryFn: async () => {
      const { data, error } = await sb.from("skills").select("id,name,description,prompt").order("created_at");
      if (error) throw error;
      return data as Skill[];
    },
  });
  return { skills: q.data ?? [], loading: q.isPending, refresh: () => qc.invalidateQueries({ queryKey: qk.skills }), sb };
}
