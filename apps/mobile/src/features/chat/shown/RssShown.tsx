import { feedsMatching, rssAge, rssFeedName, SHOW_LIMITS } from "@untitled/logic";
import type { RssFilter } from "@untitled/types";
import { router } from "expo-router";
import type { ReactNode } from "react";

import { ShownEmpty, ShownGroup, ShownRow } from "./ShownGroup";
import { AppText } from "@/components/ui/AppText";
import { useArticles, useFeeds } from "@/features/rss/queries";

const FILTER: Record<"latest" | "starred" | "unread", RssFilter> = { latest: "all", starred: "starred", unread: "unread" };
const TITLE = { latest: "Latest articles", starred: "Starred articles", unread: "Unread articles" } as const;
type View = keyof typeof FILTER;

const openReader = () => router.navigate("/workspace");

/** Articles from the person's Reader: latest, starred or unread, optionally from one site they follow. */
export function RssShown({ view = "latest", site, query }: { view?: View; site?: string; query?: string }) {
  const feedsQ = useFeeds();
  if (feedsQ.isPending) return <Frame title={TITLE[view]}>{<ShownEmpty>Loading…</ShownEmpty>}</Frame>;
  if (feedsQ.isError) return <Frame title={TITLE[view]}>{<ShownEmpty>Couldn’t load your feeds.</ShownEmpty>}</Frame>;
  if (feedsQ.data.length === 0) return <Frame title={TITLE[view]}>{<ShownEmpty>You don’t follow any feeds yet.</ShownEmpty>}</Frame>;
  if (site) {
    const feed = feedsMatching(feedsQ.data, site)[0];
    if (!feed) return <Frame title={`Latest from ${site}`}>{<ShownEmpty>{`You don’t follow ${site} yet.`}</ShownEmpty>}</Frame>;
    return <Articles view={view} feedId={feed.id} query={query} title={`${view === "latest" ? "Latest" : TITLE[view]} · ${rssFeedName(feed)}`} />;
  }
  return <Articles view={view} query={query} title={query ? `Articles about “${query}”` : TITLE[view]} />;
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ShownGroup tone="sand" icon="rss" title={title} openLabel="Open Reader" onOpen={openReader}>
      {children}
    </ShownGroup>
  );
}

function Articles({ view, feedId, query, title }: { view: View; feedId?: string; query?: string; title: string }) {
  const q = useArticles({ feed: feedId, filter: FILTER[view], q: query ?? "" });
  const all = q.data?.pages.flatMap((p) => p.items) ?? [];
  const items = all.slice(0, SHOW_LIMITS.items);
  return (
    <ShownGroup tone="sand" icon="rss" title={title} openLabel="Open Reader" onOpen={openReader} note={all.length > items.length ? "More in your Reader" : undefined}>
      {q.isPending ? <ShownEmpty>Loading…</ShownEmpty> : null}
      {q.isError ? <ShownEmpty>Couldn’t load your articles.</ShownEmpty> : null}
      {q.data && items.length === 0 ? <ShownEmpty>{view === "starred" ? "No starred articles yet." : "No articles found."}</ShownEmpty> : null}
      {items.map((a) => (
        <ShownRow key={a.id} label={`Open article: ${a.title}`} onPress={() => router.push({ pathname: "/reader/[id]", params: { id: a.id } })}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {a.title}
          </AppText>
          <AppText variant="small" numberOfLines={1}>
            {a.feed_title} · {rssAge(a.published_at)}
          </AppText>
        </ShownRow>
      ))}
    </ShownGroup>
  );
}
