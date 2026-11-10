// Builds every logo file from the one source picture, brand/source/naazhi-logo.jpg: the web icons and logo images, the app icons
// (iOS icon, Android adaptive icon, splash, favicon) and print-size exports in brand/exports.
//   node scripts/brand/build-assets.mjs        (needs the `sharp` package, found in the pnpm store)
// The mark is cut out of its cream background by turning "how far from the background" into transparency, so it can sit on any
// colour; the light-green details (the star and the lines) come out as a lighter tint of the same green.
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const store = join(root, "node_modules", ".pnpm");
const sharpDir = readdirSync(store).find((d) => d.startsWith("sharp@"));
if (!sharpDir) throw new Error("sharp is not installed (pnpm install first).");
const sharp = createRequire(import.meta.url)(join(store, sharpDir, "node_modules", "sharp"));

const SOURCE = join(root, "brand", "source", "naazhi-logo.jpg");
const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// The background is the corner colour; the ink colour is the average of the darkest pixels.
const avg = (list) => list[0].map((_, c) => Math.round(list.reduce((s, p) => s + p[c], 0) / list.length));
const corner = [];
for (let y = 10; y < 110; y += 5) for (let x = 10; x < 110; x += 5) corner.push(px(x, y));
const BG = avg(corner);
const watermark = (x, y) => x > W * 0.78 && y > H * 0.78; // the generator's own sparkle in the bottom-right corner is not part of the logo
const dark = [];
const lums = [];
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (!watermark(x, y)) lums.push(lum(px(x, y)));
lums.sort((a, b) => a - b);
const darkCut = lums[Math.floor(lums.length * 0.02)];
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (!watermark(x, y) && lum(px(x, y)) <= darkCut) dark.push(px(x, y));
const INK = avg(dark);
const LBG = lum(BG);
const LINK = lum(INK);
const hex = (c) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
console.log("background", hex(BG), "ink", hex(INK));

// One alpha channel for the whole picture: 0 on the background, 1 on the ink, in between for the lighter details and soft edges.
const alpha = Buffer.alloc(W * H);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    if (watermark(x, y)) continue;
    const t = Math.min(1, Math.max(0, (LBG - lum(px(x, y))) / (LBG - LINK)));
    const a = t < 0.05 ? 0 : t;
    alpha[y * W + x] = Math.round(a * 255);
    if (a > 0.3) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
console.log("mark box", box);

const cropOf = (channel) => sharp(channel, { raw: { width: W, height: H, channels: 1 } }).extract(box).png().toBuffer();
const cropAlpha = await cropOf(alpha);

// The launch animation draws the mark in pieces: the star and the three lines of the bubble are cut out of the rest (rectangles as a
// fraction of the picture, around those details only), so each can move on its own while the body is drawn in.
const STAR_AREA = [0.632, 0.255, 0.72, 0.34];
const LINES_AREA = [0.39, 0.65, 0.555, 0.755];
const inArea = (x, y, r) => x >= r[0] * W && x <= r[2] * W && y >= r[1] * H && y <= r[3] * H;
const part = (keep) => {
  const a = Buffer.alloc(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (keep(x, y)) a[y * W + x] = alpha[y * W + x];
  return a;
};
const bodyAlpha = await cropOf(part((x, y) => !inArea(x, y, STAR_AREA) && !inArea(x, y, LINES_AREA)));
const starAlpha = await cropOf(part((x, y) => inArea(x, y, STAR_AREA)));
const linesAlpha = await cropOf(part((x, y) => inArea(x, y, LINES_AREA)));
// Where the star's centre is on the finished square, as a fraction, so the app can spin and pulse it around its own middle.
let sx = 0, sy = 0, sw = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inArea(x, y, STAR_AREA)) { const a = alpha[y * W + x]; sx += x * a; sy += y * a; sw += a; }
const SPLASH_MARGIN = 0.08;
const fit = (1 - SPLASH_MARGIN * 2) / Math.max(box.width, box.height);
const starCenter = {
  x: +(0.5 + (sx / sw - box.left - box.width / 2) * fit).toFixed(4),
  y: +(0.5 + (sy / sw - box.top - box.height / 2) * fit).toFixed(4),
};
console.log("star centre", starCenter);

/** The mark in one colour on a transparent square (or on `bg`), the mark filling `1 - 2 * margin` of the side. */
async function mark({ size, margin, color, bg = null, from = cropAlpha }) {
  const inner = Math.round(size * (1 - margin * 2));
  const { data: a, info: ai } = await sharp(from).resize(inner, inner, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(ai.width * ai.height * 4);
  for (let i = 0; i < ai.width * ai.height; i++) {
    rgba[i * 4] = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = a[i * ai.channels];
  }
  const layer = await sharp(rgba, { raw: { width: ai.width, height: ai.height, channels: 4 } }).png().toBuffer();
  const base = sharp({
    create: { width: size, height: size, channels: 4, background: bg ? { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  return base.composite([{ input: layer, gravity: "center" }]).png();
}

const WHITE = [255, 255, 255];
const out = (...p) => join(root, ...p);
for (const dir of ["apps/web/public/brand", "apps/web/src/app", "apps/mobile/assets/images", "brand/exports"]) mkdirSync(out(dir), { recursive: true });

const jobs = [
  // Web: the mark for headers (ink on transparent, and cream for dark backgrounds), the favicon and the Apple touch icon.
  ["apps/web/public/brand/naazhi-mark.png", { size: 1024, margin: 0.06, color: INK }],
  ["apps/web/public/brand/naazhi-mark-light.png", { size: 1024, margin: 0.06, color: BG }],
  ["apps/web/src/app/icon.png", { size: 512, margin: 0.14, color: INK, bg: BG }],
  ["apps/web/src/app/apple-icon.png", { size: 180, margin: 0.16, color: INK, bg: BG }],
  // The web manifest's icons (installing the site as an app).
  ["apps/web/public/brand/icon-192.png", { size: 192, margin: 0.16, color: INK, bg: BG }],
  ["apps/web/public/brand/icon-512.png", { size: 512, margin: 0.16, color: INK, bg: BG }],
  // App: iOS icon (no transparency), Android adaptive icon (foreground inside the safe zone, background, one-colour version),
  // the splash image and the web favicon of the Expo web build.
  ["apps/mobile/assets/images/icon.png", { size: 1024, margin: 0.17, color: INK, bg: BG }],
  ["apps/mobile/assets/images/android-icon-foreground.png", { size: 1024, margin: 0.24, color: INK }],
  // A plain cream square: the "mark" is drawn in the background colour so nothing shows.
  ["apps/mobile/assets/images/android-icon-background.png", { size: 1024, margin: 0.4, color: BG, bg: BG }],
  ["apps/mobile/assets/images/android-icon-monochrome.png", { size: 1024, margin: 0.24, color: WHITE }],
  ["apps/mobile/assets/images/splash-icon.png", { size: 1024, margin: SPLASH_MARGIN, color: INK }],
  // The launch animation's layers: same square and position as splash-icon.png, so they overlay exactly.
  ["apps/mobile/assets/images/splash-mark-body.png", { size: 1024, margin: SPLASH_MARGIN, color: INK, from: bodyAlpha }],
  ["apps/mobile/assets/images/splash-mark-star.png", { size: 1024, margin: SPLASH_MARGIN, color: INK, from: starAlpha }],
  ["apps/mobile/assets/images/splash-mark-lines.png", { size: 1024, margin: SPLASH_MARGIN, color: INK, from: linesAlpha }],
  ["apps/mobile/assets/images/favicon.png", { size: 48, margin: 0.08, color: INK, bg: BG }],
  // Print and design-tool exports.
  ["brand/exports/naazhi-mark-3000.png", { size: 3000, margin: 0.05, color: INK }],
  ["brand/exports/naazhi-mark-cream-3000.png", { size: 3000, margin: 0.05, color: BG }],
  ["brand/exports/naazhi-mark-on-cream-3000.png", { size: 3000, margin: 0.12, color: INK, bg: BG }],
  ["brand/exports/naazhi-app-icon-1024.png", { size: 1024, margin: 0.17, color: INK, bg: BG }],
];
for (const [file, spec] of jobs) {
  await (await mark(spec)).toFile(out(file));
  console.log("wrote", file);
}

// The native launch screen shows only the cream ground (the animated one takes over and draws the mark), so it needs an image that
// shows nothing.
await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .png()
  .toFile(out("apps/mobile/assets/images/splash-blank.png"));

// Numbers the launch animation needs, written next to the picture so the app never has them typed in.
writeFileSync(
  out("apps/mobile/src/components/splashMark.ts"),
  `// Generated by scripts/brand/build-assets.mjs. Do not edit: change the logo source and run the script.\n/** Where the star's middle is on the splash mark's square, as a fraction of its width and height. */\nexport const SPLASH_STAR_CENTER = { x: ${starCenter.x}, y: ${starCenter.y} } as const;\n`,
);
console.log("wrote apps/mobile/src/components/splashMark.ts");
