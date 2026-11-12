// Seeds one collaborative (shared) journal with a few entries for screenshots.
//   SEED_OWNER_EMAIL=nitheeshdr@gmail.com DATABASE_URL=postgres://… node scripts/db/seed-shared-journal.mjs
// The owner account must already exist. A collaborator is taken from SEED_COLLABORATOR_EMAIL, or created as a
// sign-in-less demo user (no password, no session) so nobody can log in as them. Re-running does nothing if the
// journal already exists. Remove it afterwards by deleting the journal named below (entries/members cascade).
import { createRequire } from "node:module";

const pg = createRequire(new URL("../../apps/web/package.json", import.meta.url))("pg");

const ownerEmail = process.env.SEED_OWNER_EMAIL;
const collabEmail = process.env.SEED_COLLABORATOR_EMAIL ?? "demo.collaborator@example.invalid";
const JOURNAL = "Trip planning — Kerala";

if (!process.env.DATABASE_URL || !ownerEmail) {
  console.error("Set DATABASE_URL and SEED_OWNER_EMAIL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  const owner = (await client.query("select id from auth.users where email = $1", [ownerEmail])).rows[0];
  if (!owner) throw new Error(`No account for ${ownerEmail}`);

  let collab = (await client.query("select id from auth.users where email = $1", [collabEmail])).rows[0];
  if (!collab) {
    collab = (
      await client.query("insert into auth.users (name, email, email_verified) values ('Meera', $1, true) returning id", [collabEmail])
    ).rows[0];
  }

  const existing = await client.query("select 1 from public.shared_journals where owner_id = $1 and name = $2", [owner.id, JOURNAL]);
  if (existing.rowCount) {
    console.log("Already seeded — nothing to do.");
  } else {
    const j = (await client.query("insert into public.shared_journals (owner_id, name) values ($1, $2) returning id", [owner.id, JOURNAL])).rows[0];
    await client.query("insert into public.shared_journal_members (journal_id, user_id, role) values ($1, $2, 'editor')", [j.id, collab.id]);
    const entries = [
      [owner.id, 3, "Booked the houseboat in Alleppey for the 14th. Two nights, breakfast included."],
      [collab.id, 2, "Found a small homestay near Munnar with tea-garden views. Sharing the link tonight!"],
      [owner.id, 1, "Packing list started: rain jackets, power bank, offline maps. Can you add sunscreen?"],
      [collab.id, 0, "Added sunscreen and mosquito repellent. Excited — only two weeks to go."],
    ];
    for (const [uid, daysAgo, body] of entries) {
      await client.query(
        "insert into public.shared_journal_entries (journal_id, user_id, entry_date, body) values ($1, $2, current_date - $3::int, $4)",
        [j.id, uid, daysAgo, body],
      );
    }
    console.log(`Seeded "${JOURNAL}" for ${ownerEmail}.`);
  }
  await client.query("commit");
} catch (e) {
  await client.query("rollback");
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.end();
}
