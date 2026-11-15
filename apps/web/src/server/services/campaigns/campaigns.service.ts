import "server-only";
import { getObject, putObject, deleteObjects } from "../../storage";
import { sendCampaignMail } from "../../mail";
import { renderCampaign, unsubscribePage, unsubscribePost } from "../../email/campaign";
import { ServiceError, NotFoundError, ValidationError } from "../../errors";
import * as repo from "../../repositories/campaigns.repository";
import { ATTACHMENT_LIMITS, draftInput, type DraftInput } from "./campaigns.schema";

/** Business rules for email campaigns: validating a draft, queueing the people, sending in batches and keeping the attachments. */

const BATCH = 50;
const key = (adminId: string, campaignId: string, file: string) => `${adminId}/campaigns/${campaignId}/${crypto.randomUUID()}-${file}`;
const safeName = (n: string) => n.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";

export async function saveDraft(adminId: string, id: string | null, raw: unknown): Promise<string> {
  const parsed = draftInput.safeParse(raw);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Check the email.");
  const saved = await repo.saveDraft(adminId, id, parsed.data satisfies DraftInput);
  if (!saved) throw new ValidationError("This campaign was already sent and can’t be edited.");
  return saved;
}

export async function deleteDraft(id: string) {
  const keys = await repo.deleteDraft(id);
  if (!keys) throw new ValidationError("Only a draft can be deleted.");
  await deleteObjects("note-files", keys).catch(() => undefined);
}

export async function addAttachment(adminId: string, campaignId: string, file: { name: string; type: string; bytes: Uint8Array }) {
  const c = await repo.getCampaign(campaignId);
  if (!c) throw new NotFoundError("Campaign not found.");
  if (c.status !== "draft") throw new ValidationError("Files can only be added to a draft.");
  const have = await repo.listAttachments(campaignId);
  if (have.length >= ATTACHMENT_LIMITS.files) throw new ValidationError(`At most ${ATTACHMENT_LIMITS.files} files.`);
  if (file.bytes.byteLength > ATTACHMENT_LIMITS.fileBytes) throw new ValidationError("That file is over 10 MB.");
  if (have.reduce((n, a) => n + a.sizeBytes, file.bytes.byteLength) > ATTACHMENT_LIMITS.totalBytes) throw new ValidationError("The files together can’t be over 20 MB.");
  const name = safeName(file.name);
  const storageKey = key(adminId, campaignId, name);
  await putObject("note-files", storageKey, file.bytes, file.type || "application/octet-stream");
  return repo.addAttachment({ campaignId, name, contentType: file.type || "application/octet-stream", sizeBytes: file.bytes.byteLength, storageKey });
}

export async function removeAttachment(campaignId: string, id: string) {
  const k = await repo.removeAttachment(campaignId, id);
  if (!k) throw new NotFoundError("That file isn’t on a draft.");
  await deleteObjects("note-files", [k]).catch(() => undefined);
}

async function loadFiles(campaignId: string) {
  const out: { filename: string; content: Buffer; contentType: string }[] = [];
  for (const a of await repo.listAttachments(campaignId)) {
    const o = await getObject("note-files", a.storageKey);
    out.push({ filename: a.name, content: Buffer.from(await new Response(o.stream).arrayBuffer()), contentType: a.contentType });
  }
  return out;
}

/** A test copy to the admin's own address (a newsletter shows its unsubscribe link, which does nothing harmful: it only unsubscribes the admin). */
export async function sendTest(adminEmail: string, adminName: string | null, d: { subject: string; preheader?: string; html: string; kind: repo.Kind }, campaignId: string | null) {
  const mail = renderCampaign({ html: d.html, preheader: d.preheader, name: adminName, unsubscribeUrl: d.kind === "newsletter" ? unsubscribePage(adminEmail) : null });
  await sendCampaignMail({
    to: adminEmail,
    subject: `[Test] ${d.subject}`,
    ...mail,
    attachments: campaignId ? await loadFiles(campaignId) : [],
  }).catch(() => {
    throw new ValidationError("The test email couldn’t be sent. Check SMTP_URL and MAIL_FROM.");
  });
}

/** Freezes the audience and starts sending; the first batch goes out straight away (see `processCampaign`). */
export async function start(id: string): Promise<{ queued: number }> {
  const c = await repo.getCampaign(id);
  if (!c) throw new NotFoundError("Campaign not found.");
  if (c.status !== "draft") throw new ValidationError("This campaign was already sent.");
  if (!c.html.trim()) throw new ValidationError("Write the email first.");
  const queued = await repo.queueRecipients(id, c.kind, c.audience, c.picked);
  if (!queued) throw new ValidationError("No one to send to. Everyone picked has unsubscribed or has no email.");
  return { queued };
}

/** Sends up to one batch of the campaign's queued emails. Safe to call from the admin button and the scheduled job at once. */
export async function processCampaign(id: string, limit = BATCH) {
  const c = await repo.getCampaign(id);
  if (!c || c.status !== "sending") return { sent: 0, failed: 0, left: 0 };
  const files = await loadFiles(id);
  return repo.processQueue(id, limit, async (r) => {
    const mail = renderCampaign({ html: c.html, preheader: c.preheader, name: r.name, unsubscribeUrl: c.kind === "newsletter" ? unsubscribePage(r.email) : null });
    try {
      await sendCampaignMail({ to: r.email, subject: c.subject, ...mail, attachments: files, unsubscribePost: c.kind === "newsletter" ? unsubscribePost(r.email) : undefined });
      return null;
    } catch (e) {
      return ((e as { code?: string }).code ?? "ERR").slice(0, 40);
    }
  });
}

/** The scheduled job: a batch for each campaign still sending. */
export async function processPending(perCampaign = BATCH) {
  let sent = 0;
  for (const id of await repo.sendingIds()) sent += (await processCampaign(id, perCampaign)).sent;
  return sent;
}

export const retryFailed = async (id: string) => {
  const n = await repo.requeueFailed(id);
  if (!n) throw new ValidationError("Nothing to retry.");
  return n;
};

export const preview = (d: { html: string; preheader?: string; kind: repo.Kind }) =>
  renderCampaign({ html: d.html, preheader: d.preheader, name: "Asha", unsubscribeUrl: d.kind === "newsletter" ? "#" : null }).html;
