import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "../config/env";

const g = globalThis as unknown as { __mailer?: Transporter };

function smtpUser(url: string) {
  try {
    const u = decodeURIComponent(new URL(url).username);
    return u.includes("@") ? u : null;
  } catch {
    return null;
  }
}

/** The paper-and-ink palette for email (`:root` in globals.css): mail clients can't read CSS variables, so the values live here, once. */
const MAIL_COLOURS = {
  paper: "#ffffff", // design-ok: email can't use CSS variables; mirrors --paper
  ink: "#242424", // design-ok: mirrors --ink
  ink2: "#5c5c5c", // design-ok: mirrors --ink-2
  ink3: "#707070", // design-ok: mirrors --ink-3
  line: "#ebebeb", // design-ok: mirrors --line
} as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Sends one transactional email. In development SMTP_URL points at Mailpit (http://localhost:8025) so nothing real is sent. */
export async function sendMail(to: string, subject: string, text: string, action?: { label: string; url: string }) {
  const url = serverEnv().smtpUrl;
  if (!url) {
    console.warn("[mail] SMTP_URL is not set; outbound email was not sent.");
    return;
  }
  g.__mailer ??= nodemailer.createTransport(url);
  // Mail clients can only load an absolute https URL, so the Naazhi mark comes from the site itself.
  const logoUrl = `${serverEnv().authUrl.replace(/\/$/, "")}/brand/naazhi-mark.png`;
  // Same paper-and-ink look as the app: white page, hairline-bordered card, sans headline, dark rectangular button. Mail clients ignore
  // CSS variables, so the palette is spelled out once in MAIL_COLOURS and mirrors the tokens in globals.css.
  const c = MAIL_COLOURS;
  const sans = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${c.paper}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.paper}"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="padding:0 4px 16px;font-family:${sans};font-size:17px;font-weight:600;color:${c.ink}">
        <img src="${esc(logoUrl)}" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0"><span style="vertical-align:middle">Naazhi</span>
      </td></tr>
      <tr><td style="background:${c.paper};border:1px solid ${c.line};border-radius:14px;padding:28px 28px 26px;font-family:${sans};color:${c.ink}">
        <p style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;color:${c.ink}">${esc(subject)}</p>
        <p style="margin:0 0 ${action ? "24" : "0"}px;font-size:15px;line-height:1.6;color:${c.ink2}">${esc(text).replace(/\n/g, "<br>")}</p>
        ${action ? `<p style="margin:0 0 22px"><a href="${esc(action.url)}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:${c.ink};color:${c.paper};text-decoration:none;font-weight:600;font-size:14px">${esc(action.label)}</a></p><p style="margin:0;padding-top:16px;border-top:1px solid ${c.line};font-size:12.5px;line-height:1.5;color:${c.ink3}">Button not working? Paste this link into your browser:<br><span style="word-break:break-all">${esc(action.url)}</span></p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 4px 0;font-family:${sans};font-size:12px;line-height:1.5;color:${c.ink3}">
        You received this because someone used this address on Naazhi. If that wasn’t you, you can ignore this email.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  await g.__mailer.sendMail({
    // Most SMTP servers only accept a sender they own, so default to the SMTP login when it is an address.
    from: process.env.MAIL_FROM?.trim() || `Naazhi <${smtpUser(url) ?? "no-reply@localhost"}>`,
    to,
    subject,
    text: action ? `${text}\n\n${action.label}: ${action.url}` : text,
    html,
  });
}
