// design-ok-file: a share picture is rendered outside the page (no CSS variables), so it carries the brand's own colours as literals; they match BRAND.md.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** The picture shown when a link to the site is shared: the mark, the name in the brand serif and the tagline. See docs/BRAND.md. */
export const alt = "Naazhi — one workspace, any AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#f9f4e5";
const INK = "#235340";
const MUTED = "#5f8070";

export default async function OpenGraphImage() {
  const brand = join(process.cwd(), "public", "brand");
  const [serif, sans, mark] = await Promise.all([
    readFile(join(brand, "fonts", "InstrumentSerif-Regular.ttf")),
    readFile(join(brand, "fonts", "Geist-Regular.ttf")),
    readFile(join(brand, "naazhi-mark.png")),
  ]);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 72, background: CREAM }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a picture, not shown in a page */}
        <img src={markSrc} width={440} height={440} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: "Instrument Serif", fontSize: 200, lineHeight: 1, letterSpacing: -4, color: INK }}>Naazhi</div>
          <div style={{ fontFamily: "Geist", fontSize: 44, color: MUTED }}>One workspace, any AI.</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
        { name: "Geist", data: sans, style: "normal", weight: 400 },
      ],
    },
  );
}
