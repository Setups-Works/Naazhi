// Makes the pictures Android shows in the widget picker (assets/widgets/*.png), so each widget has a real preview instead of a blank
// grid. The colours come from src/constants/theme.ts (the same tokens the widgets use), the words are sample text for the picture only.
//   node scripts/widget-previews.mjs        (needs the `sharp` package, found in the pnpm store)
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");
const store = join(app, "..", "..", "node_modules", ".pnpm");
const sharpDir = readdirSync(store).find((d) => d.startsWith("sharp@"));
if (!sharpDir) throw new Error("sharp is not installed (pnpm install first).");
const sharp = createRequire(import.meta.url)(join(store, sharpDir, "node_modules", "sharp"));

const theme = readFileSync(join(app, "src", "constants", "theme.ts"), "utf8");
const tint = (name) => {
  const m = theme.match(new RegExp(`\\b${name}: \\{ bg: "(#[0-9a-fA-F]{6})", line: "[^"]+", fg: "(#[0-9a-fA-F]{6})" \\}`));
  if (!m) throw new Error(`tint ${name} not found in theme.ts`);
  return { bg: m[1], fg: m[2] };
};
const token = (name) => {
  const m = theme.match(new RegExp(`\\b${name}: "(#[0-9a-fA-F]{6})"`));
  if (!m) throw new Error(`token ${name} not found in theme.ts`);
  return m[1];
};

const ink = token("fg");
const muted = token("fgMuted");
const dark = token("fillDark");
const onDark = token("onDark");
const FONT = "Helvetica, Arial, sans-serif";
const PAD = 40;

const text = (x, y, size, fill, body, weight = 400, anchor = "start") =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${body}</text>`;
const card = (w, h, bg, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="56" fill="${bg}"/>${inner}</svg>`;

const t = { tasks: tint("blue"), quick: tint("sand"), health: tint("mint"), journal: tint("violet") };

const previews = {
  tasks: card(
    540,
    360,
    t.tasks.bg,
    text(PAD, 84, 40, t.tasks.fg, "Today’s tasks", 700) +
      text(540 - PAD, 84, 40, ink, "3", 700, "end") +
      ["Plan the week", "Reply to Sam", "Buy groceries"].map((r, i) => text(PAD, 150 + i * 62, 34, ink, `• ${r}`)).join(""),
  ),
  quick: card(
    720,
    360,
    t.quick.bg,
    text(PAD, 84, 40, t.quick.fg, "Quick write", 700) +
      ["New entry", "New note", "New task"]
        .map((label, i) => {
          const w = (720 - PAD * 2 - 24 * 2) / 3;
          const x = PAD + i * (w + 24);
          return `<rect x="${x}" y="150" width="${w}" height="150" rx="32" fill="${dark}"/>${text(x + w / 2, 240, 32, onDark, label, 600, "middle")}`;
        })
        .join(""),
  ),
  health: card(
    540,
    360,
    t.health.bg,
    text(PAD, 84, 40, t.health.fg, "Health today", 700) +
      text(PAD, 160, 30, muted, "Steps") +
      text(PAD, 232, 64, ink, "6,240", 700) +
      text(PAD, 290, 30, muted, "Sleep 7h 05m"),
  ),
  journal: card(
    720,
    360,
    t.journal.bg,
    text(PAD, 84, 40, t.journal.fg, "Journal", 700) +
      text(720 - PAD, 84, 34, ink, "12 day streak", 700, "end") +
      text(PAD, 170, 34, ink, "Slow morning, good coffee,") +
      text(PAD, 224, 34, ink, "and a long walk after lunch.") +
      text(PAD, 296, 28, muted, "Latest entry · 9:40 am"),
  ),
};

const out = join(app, "assets", "widgets");
if (!existsSync(out)) mkdirSync(out, { recursive: true });
for (const [name, svg] of Object.entries(previews)) {
  await sharp(Buffer.from(svg)).png().toFile(join(out, `${name}.png`));
  console.log("wrote", `assets/widgets/${name}.png`);
}
