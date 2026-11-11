"use client";
import { useEffect, useState } from "react";

/** A time of day in the viewer's own time zone, drawn in the browser so the server and the page never disagree. */
export default function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    setText(Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase());
  }, [iso]);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
