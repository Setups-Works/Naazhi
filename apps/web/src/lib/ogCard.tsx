// design-ok-file: a share picture is rendered outside the page (no CSS variables), so it carries the paper-and-ink palette as literals; they mirror :root in globals.css.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** The picture shown when a link is shared: the mark, the name and a two-line headline on flat paper, in the app's paper-and-ink look. See docs/BRAND.md. One layout for every page, so each page can have its own headline. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

// Mirrors the tokens in globals.css (--paper, --side, --ink, --ink-2, --ink-3, --line, --line-2).
const PAPER = "#ffffff";
const SIDE = "#f7f7f7";
const INK = "#242424";
const INK_2 = "#5c5c5c";
const INK_3 = "#707070";
const LINE = "#ebebeb";
const LINE_2 = "#dedede";

export const OG_SECTIONS = ["Notes", "Tasks", "Journal", "Chat", "Calendar", "Health"];

export async function ogCard({
  line1,
  line2,
  sub,
  chips = OG_SECTIONS,
}: {
  line1: string;
  line2: string;
  sub: string;
  chips?: readonly string[];
}) {
  // The server may start from the app folder (production) or the repository root (monorepo dev), so look in both.
  const brand =
    [join(process.cwd(), "public", "brand"), join(process.cwd(), "apps", "web", "public", "brand")].find((d) => existsSync(d)) ??
    join(process.cwd(), "public", "brand");
  const [sans, mark] = await Promise.all([readFile(join(brand, "fonts", "Geist-Regular.ttf")), readFile(join(brand, "naazhi-mark.png"))]);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: SIDE, padding: 40, fontFamily: "Geist" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          border: `2px solid ${LINE}`,
          borderRadius: 28,
          padding: "44px 56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              border: `2px solid ${LINE_2}`,
              borderRadius: 18,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a picture, not shown in a page */}
            <img src={markSrc} width={52} height={52} alt="" />
          </div>
          <div style={{ fontSize: 34, color: INK, letterSpacing: -1 }}>Naazhi</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 92, lineHeight: 1, letterSpacing: -3, color: INK }}>{line1}</div>
          <div style={{ fontSize: 92, lineHeight: 1, letterSpacing: -3, color: INK_3 }}>{line2}</div>
          <div style={{ fontSize: 28, color: INK_2, marginTop: 14 }}>{sub}</div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {chips.map((s) => (
            <div
              key={s}
              style={{ display: "flex", padding: "8px 20px", fontSize: 22, color: INK_2, border: `2px solid ${LINE_2}`, borderRadius: 12 }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: [{ name: "Geist", data: sans, style: "normal", weight: 400 }] },
  );
}
