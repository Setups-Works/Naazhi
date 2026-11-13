import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { Tone } from "../../lib/tones";

/** One piece of an article's body. Kept to a few shapes so every article reads the same way. */
export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "steps"; items: readonly string[] }
  | { type: "list"; items: readonly string[] }
  | { type: "note"; tone: "info" | "warn"; text: string };

export type HelpCategory = {
  slug: string;
  title: string;
  description: string;
  icon: IconDefinition;
  tone: Tone;
};

export type HelpArticle = {
  slug: string;
  category: string;
  title: string;
  /** One sentence: what the article answers. Also the search snippet and the page description. */
  summary: string;
  /** Extra words people type that the title doesn't contain. */
  keywords: readonly string[];
  blocks: readonly Block[];
  /** Slugs of other articles worth reading next. */
  related?: readonly string[];
  /** ISO day the article was last checked against the product. */
  updated: string;
  /** Shown first on the front page. */
  popular?: boolean;
};
