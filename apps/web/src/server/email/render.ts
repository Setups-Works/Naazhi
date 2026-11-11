import "server-only";
import { serverEnv } from "../../config/env";

/**
 * The one email layout. Every transactional email (sign-in and account emails, invitations, receipts, payment problems) is described as
 * an `EmailContent` and drawn here, so they all look the same and a change to the look is made once. Plain-text and HTML versions come
 * from the same content. Mail clients ignore CSS variables and external styles, so the paper-and-ink palette is spelled out below once.
 */
export type EmailContent = {
  subject: string;
  /** The grey line mail apps show after the subject. */
  preheader?: string;
  heading: string;
  paragraphs?: string[];
  /** A small table of facts (invoice number, date…). */
  rows?: [label: string, value: string][];
  /** Invoice lines with a total under them. */
  items?: { label: string; detail?: string; amount: string }[];
  total?: { label: string; amount: string };
  action?: { label: string; url: string };
  /** Small print under the card's button (the "button not working" line is added automatically). */
  footnote?: string;
  /** Why the person got this email; replaces the default footer sentence. */
  reason?: string;
};

/** The paper-and-ink palette for email (`:root` in globals.css): mail clients can't read CSS variables, so the values live here, once. */
const C = {
  paper: "#ffffff", // design-ok: email can't use CSS variables; mirrors --paper
  ink: "#242424", // design-ok: mirrors --ink
  ink2: "#5c5c5c", // design-ok: mirrors --ink-2
  ink3: "#707070", // design-ok: mirrors --ink-3
  line: "#ebebeb", // design-ok: mirrors --line
  wash: "#f7f7f7", // design-ok: mirrors --side
} as const;
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const DEFAULT_REASON = "You received this because someone used this address on Naazhi. If that wasn’t you, you can ignore this email.";

export function renderEmail(c: EmailContent): { subject: string; html: string; text: string } {
  // Mail clients can only load an absolute https URL, so the Naazhi mark comes from the site itself.
  const logoUrl = `${serverEnv().authUrl.replace(/\/$/, "")}/brand/naazhi-mark.png`;
  const agencyUrl = `${serverEnv().authUrl.replace(/\/$/, "")}/brand/setups-works.png`;
  const cell = `padding:9px 0;border-bottom:1px solid ${C.line};font-size:14.5px;line-height:1.45`;

  const rows = c.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px">${c.rows
        .map(([k, v]) => `<tr><td style="${cell};color:${C.ink3}">${esc(k)}</td><td align="right" style="${cell};color:${C.ink}">${esc(v)}</td></tr>`)
        .join("")}</table>`
    : "";
  const items = c.items?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${C.wash};border-radius:10px"><tr><td style="padding:6px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${c.items
          .map(
            (i) =>
              `<tr><td style="${cell};color:${C.ink}">${esc(i.label)}${i.detail ? `<br><span style="font-size:12.5px;color:${C.ink3}">${esc(i.detail)}</span>` : ""}</td><td align="right" valign="top" style="${cell};color:${C.ink}">${esc(i.amount)}</td></tr>`,
          )
          .join("")}${
          c.total
            ? `<tr><td style="padding:12px 0 8px;font-size:15px;font-weight:600;color:${C.ink}">${esc(c.total.label)}</td><td align="right" style="padding:12px 0 8px;font-size:17px;font-weight:600;color:${C.ink}">${esc(c.total.amount)}</td></tr>`
            : ""
        }</table></td></tr></table>`
    : "";
  const paragraphs = (c.paragraphs ?? [])
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.ink2}">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const action = c.action
    ? `<p style="margin:6px 0 20px"><a href="${esc(c.action.url)}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:${C.ink};color:${C.paper};text-decoration:none;font-weight:600;font-size:14px">${esc(c.action.label)}</a></p>
       <p style="margin:0;padding-top:16px;border-top:1px solid ${C.line};font-size:12.5px;line-height:1.5;color:${C.ink3}">Button not working? Paste this link into your browser:<br><span style="word-break:break-all">${esc(c.action.url)}</span></p>`
    : "";
  const footnote = c.footnote ? `<p style="margin:14px 0 0;font-size:12.5px;line-height:1.5;color:${C.ink3}">${esc(c.footnote)}</p>` : "";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${C.paper}">
  ${c.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper}">${esc(c.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="padding:0 4px 16px;font-family:${SANS};font-size:17px;font-weight:600;color:${C.ink}">
        <img src="${esc(logoUrl)}" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0"><span style="vertical-align:middle">Naazhi</span>
      </td></tr>
      <tr><td style="background:${C.paper};border:1px solid ${C.line};border-radius:14px;padding:28px 28px 26px;font-family:${SANS};color:${C.ink}">
        <p style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.01em;color:${C.ink}">${esc(c.heading)}</p>
        ${paragraphs}${rows}${items}${action}${footnote}
      </td></tr>
      <tr><td style="padding:16px 4px 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.ink3}">
        ${esc(c.reason ?? DEFAULT_REASON)}
      </td></tr>
      <tr><td style="padding:14px 4px 0;font-family:${SANS};font-size:12px;color:${C.ink3}">
        <span style="vertical-align:middle">Backed by</span>&nbsp;<img src="${esc(agencyUrl)}" width="72" height="26" alt="Setups Works" style="display:inline-block;vertical-align:middle;border:0;height:26px;width:auto">
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const text = [
    c.heading,
    ...(c.paragraphs ?? []),
    ...(c.rows ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(c.items ?? []).map((i) => `${i.label}${i.detail ? ` (${i.detail})` : ""}: ${i.amount}`),
    ...(c.total ? [`${c.total.label}: ${c.total.amount}`] : []),
    ...(c.action ? [`${c.action.label}: ${c.action.url}`] : []),
    ...(c.footnote ? [c.footnote] : []),
    "",
    c.reason ?? DEFAULT_REASON,
    "Backed by Setups Works.",
  ].join("\n\n");
  return { subject: c.subject, html, text };
}
