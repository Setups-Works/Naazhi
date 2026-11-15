import { forbidden, json, sameOrigin, unauthorized } from "../../../../../../../server/http";
import { currentUser, isAdmin, audit } from "../../../../../../../server/session";
import { ServiceError } from "../../../../../../../server/errors";
import { addAttachment, removeAttachment } from "../../../../../../../server/services/campaigns/campaigns.service";
import { listAttachments } from "../../../../../../../server/repositories/campaigns.repository";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

async function admin(req: Request) {
  if (!sameOrigin(req)) return { res: forbidden() };
  const user = await currentUser();
  if (!user) return { res: unauthorized() };
  if (!isAdmin(user)) return { res: forbidden() };
  return { user };
}

export async function GET(req: Request, { params }: Ctx) {
  const a = await admin(req);
  if (!a.user) return a.res;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Bad id." }, 400);
  return json({ data: (await listAttachments(id)).map(({ storageKey: _k, ...rest }) => rest) });
}

/** Adds one file (multipart field `file`) to a draft campaign. */
export async function POST(req: Request, { params }: Ctx) {
  const a = await admin(req);
  if (!a.user) return a.res;
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "Bad id." }, 400);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return json({ error: "Choose a file." }, 400);
  try {
    const att = await addAttachment(a.user.id, id, { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
    await audit(a.user, "campaign.attach", id, { name: att.name, bytes: att.sizeBytes });
    const { storageKey: _k, ...rest } = att;
    return json({ data: rest });
  } catch (e) {
    return json({ error: e instanceof ServiceError ? e.message : "Couldn’t add that file." }, e instanceof ServiceError ? 400 : 500);
  }
}

/** Removes a file (`?file=<attachment id>`) from a draft. */
export async function DELETE(req: Request, { params }: Ctx) {
  const a = await admin(req);
  if (!a.user) return a.res;
  const { id } = await params;
  const file = new URL(req.url).searchParams.get("file") ?? "";
  if (!UUID.test(id) || !UUID.test(file)) return json({ error: "Bad id." }, 400);
  try {
    await removeAttachment(id, file);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof ServiceError ? e.message : "Couldn’t remove that file." }, 400);
  }
}
