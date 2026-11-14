import "server-only";
import { z } from "zod";
import { serverEnv } from "../../../config/env";
import { DESKTOP_DOWNLOADS, DESKTOP_RELEASES_PAGE } from "../../../lib/desktopDownloads";
import { templates } from "../../email/templates";
import { ServiceError } from "../../errors";
import { sendEmail } from "../../mail";
import { underLimit } from "../../rateLimit";

export const desktopLinkInput = z.object({ platform: z.enum(["mac", "windows"]) });
export type DesktopLinkInput = z.infer<typeof desktopLinkInput>;

/**
 * Emails the person a download link for the Mac or Windows app, to their own address only (the address is never taken from the request,
 * so this can't be used to send mail to anyone else). Fails loudly when mail isn't set up or the server refuses it, so the app never
 * says "sent" when nothing was.
 */
export async function sendDesktopLink(user: { id: string; email: string }, input: DesktopLinkInput): Promise<{ sentTo: string }> {
  if (!(await underLimit(`desktop-link:${user.id}`, 5, 3600))) throw new ServiceError(429, "You’ve asked for a few of these already. Check your inbox, or try again in an hour.");
  if (!serverEnv().smtpUrl) throw new ServiceError(409, "Email isn’t set up on this server yet.");
  const content =
    input.platform === "mac"
      ? templates.desktopLink({ platform: "mac", url: DESKTOP_DOWNLOADS.mac, releasesUrl: DESKTOP_RELEASES_PAGE })
      : templates.desktopLink({ platform: "windows", url: DESKTOP_DOWNLOADS.winX64, altUrl: DESKTOP_DOWNLOADS.winArm64, releasesUrl: DESKTOP_RELEASES_PAGE });
  try {
    await sendEmail(user.email, content);
  } catch {
    throw new ServiceError(409, "We couldn’t send the email. Try again in a moment.");
  }
  return { sentTo: user.email };
}
