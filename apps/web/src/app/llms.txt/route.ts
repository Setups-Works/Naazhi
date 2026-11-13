import { CAPABILITIES } from "../../components/site/content";
import { RELEASES } from "../../features/changelog/releases";
import { llmsText } from "../../lib/seo";

export const dynamic = "force-static";

/** /llms.txt: a plain, structured guide to the public site for AI assistants and crawlers. Built from the same lists the pages use (features with their status, releases, navigation), so it can't drift from the site. */
export function GET() {
  const body = llmsText({ capabilities: CAPABILITIES, releases: RELEASES });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
