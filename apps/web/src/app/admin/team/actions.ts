"use server";
import { revalidatePath } from "next/cache";
import { assertAdmin, audit } from "../../../server/session";
import { createTeamMember, removeTeamMember, saveTeamMember } from "../../../server/services/team/team.service";

type Result = { ok: true } | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;

/** The public page and the sitemap both list the team, so a change refreshes them. */
function refresh() {
  revalidatePath("/admin/team");
  revalidatePath("/team");
}

/** Add a person (`id` null) or save changes to one. `input` is validated by the service; it is untrusted here. */
export async function saveMember(id: string | null, input: unknown): Promise<Result> {
  try {
    const me = await assertAdmin();
    if (id !== null && !UUID.test(id)) return { ok: false, error: "Bad id." };
    const result = id === null ? await createTeamMember(input) : await saveTeamMember(id, input);
    if (!result.ok) return result;
    const slug = typeof input === "object" && input !== null && "slug" in input ? String((input as { slug: unknown }).slug).slice(0, 60) : "";
    await audit(me, id === null ? "team.create" : "team.update", slug || id);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "Not allowed." };
  }
}

export async function deleteMember(id: string): Promise<Result> {
  try {
    const me = await assertAdmin();
    if (!UUID.test(id)) return { ok: false, error: "Bad id." };
    const result = await removeTeamMember(id);
    if (!result.ok) return result;
    await audit(me, "team.delete", id);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "Not allowed." };
  }
}
