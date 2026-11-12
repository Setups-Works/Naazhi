import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "../config/env";
import { renderEmail, type EmailContent } from "./email/render";

const g = globalThis as unknown as { __mailer?: Transporter };

function smtpUser(url: string) {
  try {
    const u = decodeURIComponent(new URL(url).username);
    return u.includes("@") ? u : null;
  } catch {
    return null;
  }
}

/**
 * Sends one transactional email described by an `EmailContent` (see server/email/templates.ts). In development SMTP_URL points at
 * Mailpit (http://localhost:8025) so nothing real is sent. Never log the content: it can hold names, amounts and links.
 */
export async function sendEmail(to: string, content: EmailContent) {
  const url = serverEnv().smtpUrl;
  if (!url) {
    console.warn("[mail] SMTP_URL is not set; outbound email was not sent.");
    return;
  }
  g.__mailer ??= nodemailer.createTransport(url);
  const { subject, html, text } = renderEmail(content);
  try {
    await g.__mailer.sendMail({
      // Most SMTP servers only accept a sender they own, so default to the SMTP login when it is an address.
      from: process.env.MAIL_FROM?.trim() || `Naazhi <${smtpUser(url) ?? "no-reply@localhost"}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (e) {
    // Callers swallow mail errors so a payment or a sign-up never fails over an email; this line is how an operator finds out why
    // none arrive (wrong login, a sender the server refuses, a blocked port). Only the codes: messages can quote the address.
    const err = e as { code?: string; responseCode?: number; command?: string };
    console.error("[mail] send failed", { code: err.code ?? null, responseCode: err.responseCode ?? null, command: err.command ?? null });
    throw e;
  }
}

/** The older, simpler form: a subject, a paragraph and an optional button. New emails should be templates. */
export const sendMail = (to: string, subject: string, text: string, action?: { label: string; url: string }) =>
  sendEmail(to, { subject, heading: subject, paragraphs: [text], action });
