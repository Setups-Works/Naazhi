import { OPERATOR } from "../../../lib/legal";
import { absoluteUrl } from "../../../lib/seo";

export const dynamic = "force-dynamic";

/**
 * /.well-known/security.txt (RFC 9116): where to report a vulnerability. `Expires` is required by the standard and must not pass,
 * so it is computed a year ahead on every request and the file can never go stale.
 */
export function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const canonical = absoluteUrl("/.well-known/security.txt");
  const policy = absoluteUrl("/responsible-disclosure");
  const lines = [
    `Contact: mailto:${OPERATOR.email}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    ...(canonical ? [`Canonical: ${canonical}`] : []),
    ...(policy ? [`Policy: ${policy}`] : []),
  ];
  return new Response(`${lines.join("\n")}\n`, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
