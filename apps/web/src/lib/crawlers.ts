/**
 * Which crawler a request's user-agent says it is. Used by the proxy to count visits for Admin → Crawlers. A user-agent can be faked,
 * so these are claims, not proof; the admin page says so.
 */
export type CrawlerKind = "search" | "ai" | "social" | "seo" | "other";
export type Crawler = { bot: string; kind: CrawlerKind };

export const CRAWLER_KIND_LABEL: Record<CrawlerKind, string> = {
  search: "Search engines",
  ai: "AI assistants",
  social: "Link previews",
  seo: "SEO tools",
  other: "Other bots",
};

// Order matters: the first match wins, so a specific name comes before a general one (Googlebot-Image before Googlebot).
const KNOWN: [RegExp, string, CrawlerKind][] = [
  [/Googlebot-Image/i, "Googlebot Image", "search"],
  [/Googlebot-Video/i, "Googlebot Video", "search"],
  [/GoogleOther/i, "GoogleOther", "search"],
  [/Google-InspectionTool/i, "Google Inspection", "search"],
  [/AdsBot-Google/i, "Google Ads", "search"],
  [/Googlebot/i, "Googlebot", "search"],
  [/bingbot|BingPreview/i, "Bingbot", "search"],
  [/DuckDuckBot/i, "DuckDuckBot", "search"],
  [/YandexBot/i, "YandexBot", "search"],
  [/Baiduspider/i, "Baiduspider", "search"],
  [/Applebot-Extended/i, "Applebot Extended", "ai"],
  [/Applebot/i, "Applebot", "search"],
  [/Slurp/i, "Yahoo Slurp", "search"],
  [/SeznamBot/i, "SeznamBot", "search"],
  [/GPTBot/i, "GPTBot", "ai"],
  [/OAI-SearchBot/i, "OAI-SearchBot", "ai"],
  [/ChatGPT-User/i, "ChatGPT-User", "ai"],
  [/ClaudeBot|Claude-Web|Claude-User|Claude-SearchBot|anthropic-ai/i, "Claude", "ai"],
  [/PerplexityBot|Perplexity-User/i, "Perplexity", "ai"],
  [/Google-Extended|Google-CloudVertexBot/i, "Google AI", "ai"],
  [/CCBot/i, "Common Crawl", "ai"],
  [/Bytespider/i, "Bytespider", "ai"],
  [/Amazonbot/i, "Amazonbot", "ai"],
  [/meta-externalagent|meta-externalfetcher|FacebookBot/i, "Meta AI", "ai"],
  [/cohere-ai|YouBot|DuckAssistBot|MistralAI-User|Diffbot/i, "Other AI", "ai"],
  [/facebookexternalhit/i, "Facebook", "social"],
  [/Twitterbot/i, "X (Twitter)", "social"],
  [/LinkedInBot/i, "LinkedIn", "social"],
  [/Slackbot|Slack-ImgProxy/i, "Slack", "social"],
  [/WhatsApp/i, "WhatsApp", "social"],
  [/TelegramBot/i, "Telegram", "social"],
  [/Discordbot/i, "Discord", "social"],
  [/Pinterestbot/i, "Pinterest", "social"],
  [/redditbot/i, "Reddit", "social"],
  [/AhrefsBot|AhrefsSiteAudit/i, "Ahrefs", "seo"],
  [/SemrushBot/i, "Semrush", "seo"],
  [/MJ12bot/i, "Majestic", "seo"],
  [/DotBot/i, "Moz DotBot", "seo"],
  [/Screaming Frog/i, "Screaming Frog", "seo"],
];

/** The crawler a user-agent claims to be, or null for an ordinary browser (or no user-agent). */
export function crawlerOf(agent: string | null | undefined): Crawler | null {
  if (!agent) return null;
  for (const [re, bot, kind] of KNOWN) if (re.test(agent)) return { bot, kind };
  // Anything else that calls itself a bot, crawler or spider (ordinary browsers never do).
  if (/\b(bot|crawler|spider|crawl|scraper)\b|[a-z]bot\b/i.test(agent)) return { bot: "Other bot", kind: "other" };
  return null;
}

/** The page paths worth counting: public pages and the files crawlers fetch first. Never an app page or an API route. */
export const isCountedPath = (path: string) => !/^\/(dashboard|admin|onboarding|invoice|api|share|login|signup|forgot-password|reset-password|desktop-signin)(\/|$)/.test(path);
