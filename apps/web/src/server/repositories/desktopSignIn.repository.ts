import "server-only";
import { pool } from "../db/pool";

/** Data access for `desktop_sign_ins` (server-only table: no policies, owner role). Rules live in the service. */

export async function deleteExpired(): Promise<void> {
  await pool().query("delete from public.desktop_sign_ins where expires_at < now()");
}

/** False when the code is already taken (a one-in-a-billion clash); the service then tries another. */
export async function insertRequest(code: string, secretHash: string, minutes: number): Promise<boolean> {
  const { rowCount } = await pool().query(
    "insert into public.desktop_sign_ins (code, secret_hash, expires_at) values ($1, $2, now() + make_interval(mins => $3)) on conflict do nothing",
    [code, secretHash, minutes],
  );
  return rowCount === 1;
}

/** Attaches the person and their token to an open, unapproved, unexpired request. */
export async function approve(code: string, userId: string, token: string): Promise<boolean> {
  const { rowCount } = await pool().query(
    "update public.desktop_sign_ins set user_id = $2, token = $3 where code = $1 and expires_at > now() and token is null",
    [code, userId, token],
  );
  return rowCount === 1;
}

export type RequestRow = { secret_hash: string; token: string | null; expired: boolean };

export async function findRequest(code: string): Promise<RequestRow | null> {
  const { rows } = await pool().query<RequestRow>(
    "select secret_hash, token, expires_at < now() as expired from public.desktop_sign_ins where code = $1",
    [code],
  );
  return rows[0] ?? null;
}

export async function removeRequest(code: string): Promise<void> {
  await pool().query("delete from public.desktop_sign_ins where code = $1", [code]);
}

export async function codeIsOpen(code: string): Promise<boolean> {
  const { rowCount } = await pool().query("select 1 from public.desktop_sign_ins where code = $1 and expires_at > now() and token is null", [code]);
  return rowCount === 1;
}
