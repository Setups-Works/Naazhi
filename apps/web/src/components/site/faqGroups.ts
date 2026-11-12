import { FAQS } from "./content";

type Qa = readonly [string, string];
export type FaqGroup = { id: string; title: string; lead: string; items: readonly Qa[] };

/** The question's own text, as a URL-safe anchor (`do-i-have-to-use-ai`), so one answer can be linked to and cited. */
export const faqSlug = (q: string) =>
  q
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * The FAQ page's sections. The answers are the ones in `FAQS` (content.ts), picked by question so there is one copy of each answer;
 * a test checks that every question appears in exactly one section.
 */
const PLAN: { id: string; title: string; lead: string; questions: string[] }[] = [
  {
    id: "ai",
    title: "AI",
    lead: "Optional, replaceable, and never in charge.",
    questions: [
      "Do I have to use AI?",
      "What happens if I switch AI provider or model?",
      "Can the AI change my things without asking?",
      "How do I pay for AI?",
    ],
  },
  {
    id: "workspace",
    title: "Your workspace",
    lead: "What you can use today, and how private it is.",
    questions: [
      "What can I use today, and what is still coming?",
      "Is my journal private?",
      "Can I write a journal with someone else?",
      "Can I bring my existing notes, and take them out again?",
    ],
  },
  {
    id: "connections",
    title: "Apps and connections",
    lead: "Email, calendar and the tools your team already uses.",
    questions: ["Which email and calendar services will connect?", "Does it connect to the tools my team already uses?"],
  },
  {
    id: "accounts",
    title: "Accounts and devices",
    lead: "Signing in, and where Naazhi runs.",
    questions: ["How do I sign in?", "Does it work on my phone?", "Is there an app for my computer?"],
  },
];

export const FAQ_GROUPS: readonly FaqGroup[] = PLAN.map((g) => ({
  id: g.id,
  title: g.title,
  lead: g.lead,
  items: g.questions.map((q) => {
    const found = FAQS.find(([question]) => question === q);
    if (!found) throw new Error(`faqGroups: no FAQ with the question "${q}"`);
    return found;
  }),
}));
