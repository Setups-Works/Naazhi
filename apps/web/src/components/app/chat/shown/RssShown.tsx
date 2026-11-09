"use client";
import { faRss } from "@fortawesome/free-solid-svg-icons";
import { feedsMatching, rssAge, rssFeedName, SHOW_LIMITS } from "@untitled/logic";
import type { RssFilter } from "@untitled/types";
import { useArticles, useFeeds } from "../../../../features/rss/queries";
import ShownGroup, { ShownEmpty, ShownRow } from "./ShownGroup";

const FILTER: Record<"latest" | "starred" | "unread", RssFilter> = { latest: "all", starred: "starred", unread: "unread" };
const TITLE = { latest: "Latest articles", starred: "Starred articles", unread: "Unread articles" } as const;
const READER = "/dashboard/workspace/reader";

type View = keyof typeof FILTER;

/** Articles from the person's Reader: latest, starred or unread, optionally from one site they follow. */
export default function RssShown({ view = "latest", site }: { view?: View; site?: string }) {
  const feedsQ = useFeeds();
  if (feedsQ.isPending) return <Frame title={TITLE[view]}><ShownEmpty>Loading…</ShownEmpty></Frame>;
  if (feedsQ.isError) return <Frame title={TITLE[view]}><ShownEmpty>Couldn’t load your feeds.</ShownEmpty></Frame>;
  if (feedsQ.data.length === 0) return <Frame title={TITLE[view]}><ShownEmpty>You don’t follow any feeds yet.</ShownEmpty></Frame>;
  if (site) {
    const feed = feedsMatching(feedsQ.data, site)[0];
    if (!feed) return <Frame title={`Latest from ${site}`}><ShownEmpty>You don’t follow {site} yet.</ShownEmpty></Frame>;
    return <Articles view={view} feedId={feed.id} title={`${view === "latest" ? "Latest" : TITLE[view]} · ${rssFeedName(feed)}`} />;
  }
  return <Articles view={view} title={TITLE[view]} />;
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ShownGroup tone="sand" icon={faRss} title={title} openLabel="Open Reader" openHref={READER}>
      {children}
    </ShownGroup>
  );
}

function Articles({ view, feedId, title }: { view: View; feedId?: string; title: string }) {
  const q = useArticles({ feed: feedId, filter: FILTER[view], q: "" });
  const all = q.data?.pages.flatMap((p) => p.items) ?? [];
  const items = all.slice(0, SHOW_LIMITS.items);
  return (
    <ShownGroup tone="sand" icon={faRss} title={title} openLabel="Open Reader" openHref={READER} note={all.length > items.length ? "More in your Reader" : undefined}>
      {q.isPending && <ShownEmpty>Loading…</ShownEmpty>}
      {q.isError && <ShownEmpty>Couldn’t load your articles.</ShownEmpty>}
      {q.data && items.length === 0 && <ShownEmpty>{view === "starred" ? "No starred articles yet." : "No articles found."}</ShownEmpty>}
      {items.map((a) => (
        <ShownRow key={a.id} href={`${READER}/${a.id}`} label={`Open article: ${a.title}`}>
          <span className="line-clamp-2 text-[14.5px] font-medium">{a.title}</span>
          <span className="line-clamp-1 text-[12.5px] text-fg-muted">
            {a.feed_title} · {rssAge(a.published_at)}
          </span>
        </ShownRow>
      ))}
    </ShownGroup>
  );
}
