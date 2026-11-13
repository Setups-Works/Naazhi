import "server-only";
import type { userDb } from "../db/builders";

type Db = ReturnType<typeof userDb>;

export type AcquisitionRow = {
  user_id: string;
  source: string;
  medium: string;
  campaign: string;
  referrer_host: string;
  platform: "web" | "android" | "ios";
};

export async function hasAcquisition(db: Db): Promise<boolean> {
  const { data, error } = await db.from<{ user_id: string }>("user_acquisition").select("user_id").limit(1);
  if (error) throw new Error("Could not read where the person came from");
  return (data?.length ?? 0) > 0;
}

/** Written once; a second write for the same person is refused by the primary key and treated as already done. */
export async function insertAcquisition(db: Db, row: AcquisitionRow): Promise<void> {
  const { error } = await db.from("user_acquisition").insert(row);
  if (error && !/duplicate|unique|23505/i.test(String((error as { message?: string; code?: string }).message ?? "") + String((error as { code?: string }).code ?? "")))
    throw new Error("Could not save where the person came from");
}
