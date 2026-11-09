"use client";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowUpRightFromSquare, faEnvelope, faEnvelopeOpen, faShareNodes, faStar } from "@fortawesome/free-solid-svg-icons";
import { rssAge } from "@untitled/logic/rss";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useArticle, useRssActions } from "../queries";
import FeedIcon from "./FeedIcon";

const BACK = "/dashboard/workspace/reader";

/** One article on its own page: source, title, picture and the full text, with star, read state and "open original". */
export default function ArticleView() {
  const { id } = useParams<{ id: string }>();
  const { data: item, isPending, isError } = useArticle(id);
  const [notice, setNotice] = useState("");
  const actions = useRssActions(setNotice);
  const [imageFailed, setImageFailed] = useState(false);
  const opened = item?.id;
  const wasRead = item?.is_read;

  // Opening an article marks it read, once.
  useEffect(() => {
    if (opened && wasRead === false) void actions.setRead(opened, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a different article loads
  }, [opened]);

  /** The phone's share sheet where there is one; otherwise the link is copied. */
  const share = async () => {
    if (!item?.link) return;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url: item.link });
      else {
        await navigator.clipboard.writeText(item.link);
        setNotice("Link copied.");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setNotice("Couldn’t share this article.");
    }
  };

  const back = (
    <Link href={BACK} className="btn btn-secondary btn-sm self-start">
      <FA icon={faArrowLeft} /> Back to Reader
    </Link>
  );

  if (isPending) return <div className="mx-auto w-full max-w-[760px] p-6 text-xs text-fg-muted">Loading article…</div>;
  if (isError || !item)
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 py-10">
        {back}
        <p className="text-[14px] text-fg-muted">This article isn’t available any more.</p>
      </div>
    );

  const paragraphs = (item.content || item.summary).split(/\n{2,}/).filter(Boolean);
  const date = new Date(item.published_at).toLocaleDateString(undefined, { dateStyle: "long" });

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 pb-16 max-[700px]:pb-24">
      <div className="flex items-center justify-between gap-2">
        {back}
        <div className="flex shrink-0 gap-1.5">
          <button type="button" className="ne-btn" data-on={item.is_starred} aria-pressed={item.is_starred} aria-label={item.is_starred ? "Remove star" : "Star article"} onClick={() => void actions.setStarred(item.id, !item.is_starred)}>
            <FA icon={faStar} className={item.is_starred ? "text-amber-fg" : "text-fg-faint"} />
          </button>
          {item.link && (
            <button type="button" className="ne-btn" aria-label="Share article" title="Share" onClick={() => void share()}>
              <FA icon={faShareNodes} />
            </button>
          )}
          <button type="button" className="ne-btn" aria-label={item.is_read ? "Mark as unread" : "Mark as read"} onClick={() => void actions.setRead(item.id, !item.is_read)}>
            <FA icon={item.is_read ? faEnvelope : faEnvelopeOpen} />
          </button>
        </div>
      </div>
      {notice && <p role="alert" className="at-clay tint rounded-r2 px-3 py-2 text-[13px]">{notice}</p>}
      <article className="glass flex flex-col gap-5 rounded-r4 p-5 sm:p-8">
        <p className="flex min-w-0 items-center gap-2 text-[13px] text-fg-muted">
          <FeedIcon src={item.feed_image_url} name={item.feed_title} className="size-5" />
          <span className="truncate">
            {item.feed_title}
            {item.author ? ` · ${item.author}` : ""}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={item.published_at} title={date} className="shrink-0">
            {rssAge(item.published_at)}
          </time>
        </p>
        <h1 className="font-serif text-[clamp(28px,4vw,42px)] leading-[1.06] font-normal tracking-[-0.02em] text-balance">{item.title}</h1>
        {item.image_url && !imageFailed && (
          // eslint-disable-next-line @next/next/no-img-element -- article pictures come from any site
          <img src={item.image_url} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="max-h-[380px] w-full rounded-r3 bg-surface-muted object-cover" />
        )}
        <div className="flex flex-col gap-4 text-[16.5px] leading-[1.7] text-fg">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm self-start">
            Open original <FA icon={faArrowUpRightFromSquare} />
          </a>
        )}
      </article>
    </div>
  );
}
