import { llmsText } from "../../lib/seo";

export const dynamic = "force-static";

/** /llms.txt — a short, plain guide to the public site for AI assistants and crawlers. Built from the same page list as the sitemap. */
export function GET() {
  return new Response(llmsText(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
