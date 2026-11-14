/**
 * Notion's Markdown has a few tags of its own that a note would show as raw text (`<empty-block/>`, `<callout>`, `<columns>`…). They are
 * turned into plain Markdown here: blank lines, quotes, bold titles and the page's name. Anything else is left exactly as Notion wrote it.
 */
export function cleanNotionMarkdown(md: string): string {
  return (
    md
      .replace(/\r\n/g, "\n")
      // An empty paragraph is just a blank line.
      .replace(/<empty-block\s*\/?>/gi, "")
      // Layout wrappers carry no text.
      .replace(/<\/?(?:columns|column|synced_block|synced-block|table_of_contents|table-of-contents|toc)\b[^>]*\/?>/gi, "")
      // A callout becomes a quote.
      .replace(/<callout\b[^>]*>\s*/gi, "\n> ")
      .replace(/\s*<\/callout>/gi, "\n")
      // A toggle becomes its bold title followed by its content.
      .replace(/<summary>([\s\S]*?)<\/summary>/gi, "**$1**\n")
      .replace(/<\/?details\b[^>]*>/gi, "")
      // Links to other pages and people become their names.
      .replace(/<(?:page|database|mention-page|mention-database|mention-user|mention-date)\b[^>]*>([\s\S]*?)<\/(?:page|database|mention-page|mention-database|mention-user|mention-date)>/gi, "$1")
      .replace(/<(?:mention-page|mention-database|mention-user|mention-date|page|database)\b[^>]*\/>/gi, "")
      // Tidy: no trailing spaces, and at most one blank line in a row.
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
