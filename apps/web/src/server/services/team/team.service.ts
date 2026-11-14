import "server-only";
import { adminDb } from "../../db/builders";
import { serverConfigured } from "../../session";
import { deleteTeamMember, insertTeamMember, listTeam, updateTeamMember, type TeamRow, type TeamWrite } from "../../repositories/team.repository";
import { teamLink, teamMemberInput, type TeamLink, type TeamMember } from "./team.schema";

type Result = { ok: true } | { ok: false; error: string };

/** The stored links are admin-entered JSON; keep only the entries that are still valid so a bad row can never break the page. */
function cleanLinks(value: unknown): TeamLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    const parsed = teamLink.safeParse(v);
    return parsed.success ? [parsed.data] : [];
  });
}

/** A stored list of short texts (admin-entered JSON): keep only the strings, so a bad row can never break the page. */
const cleanList = (value: unknown, max: number): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim()).slice(0, max) : [];

const toMember = (r: TeamRow): TeamMember => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  role: r.role,
  bio: r.bio,
  photoUrl: r.photo_url,
  links: cleanLinks(r.profile_links),
  sortOrder: r.sort_order,
  published: r.published,
  updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  alternateNames: cleanList(r.alternate_names, 6),
  knowsAbout: cleanList(r.knows_about, 12),
  awards: cleanList(r.awards, 5),
  location: r.location ?? "",
  alumniOf: r.alumni_of ?? "",
  alumniUrl: r.alumni_url ?? null,
});

/**
 * The published team for the public page. Reads on the server with the owner connection, which is safe here because the query is fixed:
 * published rows only, and only the columns the page shows. If the database isn't reachable the page shows its empty state.
 */
export async function listPublicTeam(): Promise<TeamMember[]> {
  if (!serverConfigured()) return [];
  const { data, error } = await listTeam(adminDb(), true);
  return error ? [] : (data ?? []).map(toMember);
}

/** One published person by the name in their address, or null. The team is small, so this reads the published list and picks. */
export async function getPublicMember(slug: string): Promise<{ member: TeamMember; others: TeamMember[] } | null> {
  const all = await listPublicTeam();
  const member = all.find((m) => m.slug === slug);
  return member ? { member, others: all.filter((m) => m.slug !== slug) } : null;
}

/** Everyone, hidden people included, for the admin editor. Admin code only. */
export async function listAllTeam(): Promise<{ members: TeamMember[]; error: boolean }> {
  const { data, error } = await listTeam(adminDb(), false);
  return { members: (data ?? []).map(toMember), error: Boolean(error) };
}

function toWrite(raw: unknown): { ok: true; row: TeamWrite } | { ok: false; error: string } {
  const parsed = teamMemberInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const v = parsed.data;
  return {
    ok: true,
    row: {
      slug: v.slug,
      name: v.name,
      role: v.role,
      bio: v.bio,
      photo_url: v.photoUrl || null,
      profile_links: v.links,
      sort_order: v.sortOrder,
      published: v.published,
      alternate_names: v.alternateNames,
      knows_about: v.knowsAbout,
      awards: v.awards,
      location: v.location,
      alumni_of: v.alumniOf,
      alumni_url: v.alumniUrl || null,
    },
  };
}

const failure = (message: string): Result =>
  /duplicate key|unique/i.test(message) ? { ok: false, error: "Another person already uses that URL name." } : { ok: false, error: "Couldn’t save. Please try again." };

export async function createTeamMember(raw: unknown): Promise<Result> {
  const w = toWrite(raw);
  if (!w.ok) return w;
  const { error } = await insertTeamMember(adminDb(), w.row);
  return error ? failure(error.message) : { ok: true };
}

export async function saveTeamMember(id: string, raw: unknown): Promise<Result> {
  const w = toWrite(raw);
  if (!w.ok) return w;
  const { error } = await updateTeamMember(adminDb(), id, w.row);
  return error ? failure(error.message) : { ok: true };
}

export async function removeTeamMember(id: string): Promise<Result> {
  const { error } = await deleteTeamMember(adminDb(), id);
  return error ? { ok: false, error: "Couldn’t delete. Please try again." } : { ok: true };
}
