import { describe, expect, it } from "vitest";
import { cleanNotionMarkdown } from "../../src/server/services/notion/markdown";

describe("Notion markdown cleanup", () => {
  it("turns Notion's own tags into plain Markdown and leaves everything else alone", () => {
    const md = [
      "# Budget",
      "<empty-block/>",
      "<empty-block/>",
      "<empty-block/>",
      '<callout icon="💡" color="gray_bg">Keep it small</callout>',
      "<columns><column>Left</column><column>Right</column></columns>",
      "<details><summary>More</summary>Hidden text</details>",
      'See <page url="https://notion.so/x">Plan</page> and **bold** `code`',
      "| a | b |",
    ].join("\n");
    const out = cleanNotionMarkdown(md);
    expect(out).not.toMatch(/<\/?(empty-block|callout|columns?|details|summary|page)\b/);
    expect(out).toContain("> Keep it small");
    expect(out).toContain("**More**");
    expect(out).toContain("See Plan and **bold** `code`");
    expect(out).toContain("| a | b |");
    expect(out).not.toMatch(/\n{3,}/);
  });
});
