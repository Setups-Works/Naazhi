#!/usr/bin/env node
/**
 * Draws the Google Play QR code shown when someone hovers "Get it on Google Play": rounded modules and finder squares in the brand black,
 * a white rounded plate and the Naazhi mark in the middle (error correction level Q, so the mark never stops it scanning).
 * The result is a static file, apps/web/public/brand/google-play-qr.svg; run this again only when GOOGLE_PLAY_URL changes.
 *
 *   npm i --no-save qrcode            (once, outside the lockfile: the site itself does not ship a QR library)
 *   node scripts/make-play-qr.mjs <path to a small PNG of the Naazhi mark, about 160 px>
 */
import { readFileSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";

const URL = "https://play.google.com/store/apps/details?id=com.setupsworks.naazhi";
const INK = "#242424"; // the brand ink (--ink); the same black as the buttons
const markPath = process.argv[2];
if (!markPath) throw new Error("Pass the path to a small PNG of the Naazhi mark.");
const mark = readFileSync(markPath).toString("base64");

const qr = QRCode.create(URL, { errorCorrectionLevel: "Q" });
const n = qr.modules.size;
const get = (r, c) => r >= 0 && c >= 0 && r < n && c < n && qr.modules.get(r, c) === 1;
const Q = 3; // quiet zone, in modules
const S = 10; // pixels per module
const size = (n + Q * 2) * S;
const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
const logo = Math.round(n * 0.22); // modules covered in the middle
const lo = Math.floor((n - logo) / 2);
const inLogo = (r, c) => r >= lo - 1 && r < lo + logo + 1 && c >= lo - 1 && c < lo + logo + 1;

const out = [];
// data modules: soft rounded squares, merged into rounded blobs with their neighbours
for (let r = 0; r < n; r++)
  for (let c = 0; c < n; c++) {
    if (!get(r, c) || inFinder(r, c) || inLogo(r, c)) continue;
    const x = (c + Q) * S, y = (r + Q) * S, R = S * 0.5;
    const up = get(r - 1, c), dn = get(r + 1, c), lf = get(r, c - 1), rt = get(r, c + 1);
    // each corner is rounded only when neither neighbour touching it is dark
    const tl = !up && !lf ? R : 0, tr = !up && !rt ? R : 0, br = !dn && !rt ? R : 0, bl = !dn && !lf ? R : 0;
    out.push(`<path d="M${x + tl} ${y}H${x + S - tr}${tr ? `A${tr} ${tr} 0 0 1 ${x + S} ${y + tr}` : ""}V${y + S - br}${br ? `A${br} ${br} 0 0 1 ${x + S - br} ${y + S}` : ""}H${x + bl}${bl ? `A${bl} ${bl} 0 0 1 ${x} ${y + S - bl}` : ""}V${y + tl}${tl ? `A${tl} ${tl} 0 0 1 ${x + tl} ${y}` : ""}Z"/>`);
  }
// finder squares: rounded, but still a ring around a block with straight sides, so scanners read the 1:1:3:1:1 pattern
for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
  const x = (c0 + Q) * S, y = (r0 + Q) * S;
  out.push(`<rect x="${x}" y="${y}" width="${7 * S}" height="${7 * S}" rx="${1.0 * S}"/>`);
  out.push(`<rect x="${x + S}" y="${y + S}" width="${5 * S}" height="${5 * S}" rx="${0.3 * S}" fill="#fff" stroke="#fff"/>`);
  out.push(`<rect x="${x + 2 * S}" y="${y + 2 * S}" width="${3 * S}" height="${3 * S}" rx="${0.5 * S}"/>`);
}
const lx = (lo + Q) * S, ly = (lo + Q) * S, ls = logo * S;
const plate = `<rect x="${lx - S * 0.6}" y="${ly - S * 0.6}" width="${ls + S * 1.2}" height="${ls + S * 1.2}" rx="${S * 2.2}" fill="#fff"/>`;
const img = `<image href="data:image/png;base64,${mark}" x="${lx + ls * 0.12}" y="${ly + ls * 0.12}" width="${ls * 0.76}" height="${ls * 0.76}"/>`;

writeFileSync(
  "apps/web/public/brand/google-play-qr.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR code: Naazhi on Google Play"><rect width="${size}" height="${size}" rx="${S * 3}" fill="#fff"/><g fill="${INK}" stroke="${INK}" stroke-width="0.9" stroke-linejoin="round">${out.join("")}</g>${plate}${img}</svg>\n`,
);
console.log(`google-play-qr.svg: ${n}x${n} modules, ${size}px`);
