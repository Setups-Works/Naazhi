import { notFound } from "next/navigation";
import { Suspense } from "react";
import ClientOnly from "../../../../../components/app/ClientOnly";
import { FEATURES } from "../../../../../config/features";
import ArticleView from "../../../../../features/rss/components/ArticleView";

export const metadata = {
  title: "Article — untitled project",
  description: "Read an article from your feeds.",
};

export default function ArticlePage() {
  if (!FEATURES.rssReader) notFound();
  return (
    <ClientOnly>
      <Suspense fallback={<div className="p-6 text-xs text-fg-muted">Loading article...</div>}>
        <ArticleView />
      </Suspense>
    </ClientOnly>
  );
}
