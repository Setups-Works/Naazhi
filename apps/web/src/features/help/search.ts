import { ARTICLES, categoryBySlug } from "./articles";
import type { HelpArticle } from "./types";

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const words = (s: string) => norm(s).split(/[^a-z0-9@⌘]+/).filter((w) => w.length > 1 || w === "@");

/**
 * Ranks articles for a query: a word in the title counts most, then the keywords and summary, then the body. Every word must match
 * somewhere (so "reset password" does not return everything with "password"). Pure and fast, since it runs on every keystroke in the browser
 * and on the server for /search.
 */
export function searchArticles(query: string, limit = 12): HelpArticle[] {
  const terms = words(query);
  if (terms.length === 0) return [];
  const scored = ARTICLES.flatMap((a) => {
    const title = norm(a.title);
    const meta = norm(`${a.summary} ${a.keywords.join(" ")} ${categoryBySlug(a.category)?.title ?? ""}`);
    const body = norm(a.blocks.map((b) => ("text" in b ? b.text : b.items.join(" "))).join(" "));
    let score = 0;
    for (const t of terms) {
      const inTitle = title.includes(t);
      const inMeta = meta.includes(t);
      const inBody = body.includes(t);
      if (!inTitle && !inMeta && !inBody) return [];
      score += (inTitle ? 6 : 0) + (inMeta ? 3 : 0) + (inBody ? 1 : 0);
    }
    if (title.includes(norm(query).trim())) score += 8;
    return [{ a, score }];
  });
  return scored.sort((x, y) => y.score - x.score || x.a.title.localeCompare(y.a.title)).slice(0, limit).map((s) => s.a);
}
