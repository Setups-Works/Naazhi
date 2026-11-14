import "server-only";
import type { adminDb } from "../db/builders";

type Db = ReturnType<typeof adminDb>;

export const TEAM_COLUMNS = "id,slug,name,role,bio,photo_url,profile_links,sort_order,published,updated_at,alternate_names,knows_about,awards,location,alumni_of,alumni_url";

export type TeamRow = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photo_url: string | null;
  profile_links: unknown;
  sort_order: number;
  published: boolean;
  updated_at?: string;
  alternate_names?: unknown;
  knows_about?: unknown;
  awards?: unknown;
  location?: string;
  alumni_of?: string;
  alumni_url?: string | null;
};

export type TeamWrite = Omit<TeamRow, "id" | "updated_at">;

/** Everyone, or only the published people, in the order the admin set. */
export async function listTeam(db: Db, onlyPublished: boolean) {
  let q = db.from<TeamRow>("team_members").select(TEAM_COLUMNS);
  if (onlyPublished) q = q.eq("published", true);
  return q.order("sort_order", { ascending: true }).order("created_at", { ascending: true });
}

export async function insertTeamMember(db: Db, row: TeamWrite) {
  return db.from("team_members").insert(row);
}

export async function updateTeamMember(db: Db, id: string, row: TeamWrite) {
  return db.from("team_members").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteTeamMember(db: Db, id: string) {
  return db.from("team_members").delete().eq("id", id);
}
