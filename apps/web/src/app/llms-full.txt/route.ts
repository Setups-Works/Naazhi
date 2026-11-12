import { FAQS } from "../../components/site/content";
import { llmsFullText } from "../../lib/seo";

export const dynamic = "force-static";

/** /llms-full.txt — llms.txt plus every FAQ answer, as plain text for AI assistants and crawlers. */
export function GET() {
  return new Response(llmsFullText(FAQS), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
