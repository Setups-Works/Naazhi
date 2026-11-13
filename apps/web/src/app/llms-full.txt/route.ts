import { CAPABILITIES, FAQS } from "../../components/site/content";
import { RELEASES } from "../../features/changelog/releases";
import { llmsFullText } from "../../lib/seo";

export const dynamic = "force-static";

/** /llms-full.txt: llms.txt plus every feature in detail and every FAQ answer, as plain text for AI assistants and crawlers. */
export function GET() {
  const body = llmsFullText(FAQS, { capabilities: CAPABILITIES, releases: RELEASES });
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
