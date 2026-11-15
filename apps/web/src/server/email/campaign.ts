import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { serverEnv } from "../../config/env";
import { esc } from "./render";

/**
 * Campaign emails (Admin → Campaigns): the admin's HTML is cleaned here, placed in the standard Naazhi layout and given an unsubscribe
 * link. Mail clients ignore scripts and external styles, so only inline-styled, table-safe markup is kept.
 */

const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
// design-ok: email can't use CSS variables; these mirror --paper, --ink, --ink-3 and --line (see render.ts)
const C = { paper: "#ffffff", ink: "#242424", ink2: "#5c5c5c", ink3: "#707070", line: "#ebebeb" } as const;

/** Everything an editor can produce that is safe in a mail client. Scripts, forms, iframes, event handlers and javascript: links are dropped. */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "div", "span", "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "b", "em", "i", "u", "s", "blockquote", "hr", "img", "table", "thead", "tbody", "tr", "td", "th", "pre", "code", "small", "center"],
    allowedAttributes: {
      a: ["href", "title", "target", "style"],
      img: ["src", "alt", "width", "height", "style"],
      td: ["align", "valign", "colspan", "rowspan", "width", "style"],
      th: ["align", "valign", "colspan", "rowspan", "width", "style"],
      table: ["width", "cellpadding", "cellspacing", "border", "align", "style"],
      "*": ["style", "align"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https", "http", "data"] },
    allowedStyles: {
      "*": {
        color: [/^[#a-z0-9(),.\s%-]+$/i],
        "background-color": [/^[#a-z0-9(),.\s%-]+$/i],
        "font-size": [/^[\d.]+(px|em|rem|%)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "text-decoration": [/^(none|underline|line-through)$/],
        "line-height": [/^[\d.]+(px|em|%)?$/],
        padding: [/^[\d.\spxem%]+$/],
        margin: [/^[\d.\spxem%-]+$/],
        border: [/^[\w\s#.(),%-]+$/],
        "border-radius": [/^[\d.\spxem%]+$/],
        width: [/^[\d.]+(px|%)$/],
        "max-width": [/^[\d.]+(px|%)$/],
        height: [/^[\d.]+(px|%)$/],
        display: [/^(block|inline|inline-block)$/],
      },
    },
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }),
    },
    allowedClasses: {},
  });
}

/** `{{name}}` becomes the person's first name (HTML-escaped), or "there". */
export function personalise(html: string, name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] || "there";
  return html.replace(/\{\{\s*name\s*\}\}/gi, esc(first));
}

/** A plain-text version of the cleaned HTML: paragraphs and line breaks kept, links written out. */
export function toText(html: string): string {
  const withLinks = html.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]+>/g, "")} (${href})`);
  const breaks = withLinks.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n\n");
  return sanitizeHtml(breaks, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ---- unsubscribe links: the address plus a signature, so nobody can unsubscribe someone else ---- */

const sig = (email: string) => createHmac("sha256", serverEnv().authSecret ?? "").update(`unsubscribe\n${email.toLowerCase()}`).digest("base64url");

export function unsubscribeQuery(email: string): string {
  return `e=${Buffer.from(email.toLowerCase()).toString("base64url")}&t=${sig(email)}`;
}

/** The address a valid link names, or null. */
export function verifyUnsubscribe(e: string | null, t: string | null): string | null {
  if (!e || !t || !serverEnv().authSecret) return null;
  try {
    const email = Buffer.from(e, "base64url").toString("utf8").toLowerCase();
    const want = Buffer.from(sig(email));
    const got = Buffer.from(t);
    return want.length === got.length && timingSafeEqual(want, got) ? email : null;
  } catch {
    return null;
  }
}

const base = () => serverEnv().authUrl.replace(/\/$/, "");
export const unsubscribePage = (email: string) => `${base()}/unsubscribe?${unsubscribeQuery(email)}`;
export const unsubscribePost = (email: string) => `${base()}/api/v1/unsubscribe?${unsubscribeQuery(email)}`;

export type Rendered = { html: string; text: string };

/** The finished email. `unsubscribeUrl` is set for newsletters; a direct email carries only a short reason line. */
export function renderCampaign(input: { html: string; preheader?: string; name?: string | null; unsubscribeUrl?: string | null }): Rendered {
  const body = personalise(cleanHtml(input.html), input.name);
  const logo = `${base()}/brand/naazhi-mark.png`;
  const footer = input.unsubscribeUrl
    ? `You are getting this because you have a Naazhi account. <a href="${esc(input.unsubscribeUrl)}" style="color:${C.ink3};text-decoration:underline">Unsubscribe</a> from newsletters any time.`
    : "You are getting this email because you have a Naazhi account.";
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:${C.paper}">
  ${input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper}">${esc(input.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="padding:0 4px 16px;font-family:${SANS};font-size:17px;font-weight:600;color:${C.ink}">
        <img src="${esc(logo)}" width="24" height="24" alt="" style="display:inline-block;vertical-align:middle;margin-right:8px;border:0"><span style="vertical-align:middle">Naazhi</span>
      </td></tr>
      <tr><td style="background:${C.paper};border:1px solid ${C.line};border-radius:14px;padding:28px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink2}">${body}</td></tr>
      <tr><td style="padding:16px 4px 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.ink3}">${footer}</td></tr>
    </table>
  </td></tr></table></body></html>`;
  const text = [toText(body), "", input.unsubscribeUrl ? `Unsubscribe: ${input.unsubscribeUrl}` : "You are getting this email because you have a Naazhi account."].join("\n");
  return { html, text };
}
