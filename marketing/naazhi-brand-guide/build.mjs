// Builds the Naazhi brand guidelines book: index.html (screen) + Naazhi-Brand-Guidelines.pdf (print).
// Run: node marketing/naazhi-brand-guide/build.mjs   (needs Google Chrome or CHROME_PATH for the PDF)
// Facts come from docs/BRAND.md, docs/DESIGN_LANGUAGE.md and the CSS tokens.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const fa = require("../../apps/web/node_modules/@fortawesome/free-solid-svg-icons");

/* ───────── helpers ───────── */
const ic = (name, size = 22, color = "currentColor") => {
  const d = fa[name];
  if (!d) throw new Error(`Unknown icon ${name}`);
  const [w, h, , , p] = d.icon;
  return `<svg viewBox="0 0 ${w} ${h}" width="${size}" height="${size}" fill="${color}" aria-hidden="true"><path d="${p}"/></svg>`;
};
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
};
const rgb2cmyk = ([r, g, b]) => {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k === 1) return "0, 0, 0, 100";
  const c = (1 - r / 255 - k) / (1 - k), m = (1 - g / 255 - k) / (1 - k), y = (1 - b / 255 - k) / (1 - k);
  return [c, m, y, k].map((v) => Math.round(v * 100)).join(", ");
};
const lum = (h) => {
  const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = hex2rgb(h);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const readableOn = (bg) => (contrast(bg, "#242424") >= contrast(bg, "#ffffff") ? "#242424" : "#ffffff");

const C = {
  // Logo-file colours (kept for logo files and logo pages)
  logoGreen: "#235340",
  logoCream: "#f9f4e5",
  green: "#235340",
  // Foundation paper-and-ink palette
  white: "#ffffff",
  surface: "#ffffff",
  paper: "#f7f7f7",
  muted: "#f7f7f7",
  sunken: "#f0f0f0",
  ink: "#242424",
  dark: "#242424",
  onDark: "#ffffff",
  line: "#ebebeb",
  lineStrong: "#dedede",
  strong: "#242424",
  fgMuted: "#6b6b6b",
  fgSubtle: "#8f8f8f",
  fgFaint: "#ababab",
  // Status & accent colours
  coral: "#e06449",
  critical: "#c13d3d",
  success: "#2d8a5e",
  overdue: "#c26a1a",
  // Aliases for compatibility
  forest: "#242424",
  cream: "#f7f7f7",
  rec: "#c13d3d",
  orange: "#c26a1a",
  accentSurface: "#f0f0f0",
};

// Muted earthy tints for categories (no purple)
const TINTS = [
  ["Green", "#f0f5f0", "#2d8a5e"],
  ["Blue", "#edf2f5", "#4a7085"],
  ["Amber", "#f5f0e5", "#8a6d2a"],
  ["Clay", "#f5ebe8", "#9a5a4a"],
  ["Mint", "#edf5f2", "#3a7a6a"],
  ["Sand", "#f0ece0", "#7a6a3c"],
];

const L = (f) => `assets/logo/${f}`;
const MARK = L("naazhi-mark-1024.png");
const MARK_CREAM = L("naazhi-mark-cream-1024.png");
const mk = (h, cream = false, extra = "") => `<img class="mk" src="${cream ? MARK_CREAM : MARK}" style="height:${h}px;${extra}" alt="Naazhi mark">`;
/** The lockup: mark 1.3× the wordmark size, gap 0.35×, mark on the left. */
const lockup = (fs_, { cream = false, color } = {}) =>
  `<span class="lockup" style="font-size:${fs_}px;gap:${(fs_ * 0.35).toFixed(1)}px;color:${color || (cream ? C.onDark : C.ink)}">${mk(fs_ * 1.3, cream)}<span class="wm">Naazhi</span></span>`;

const swatch = (name, hex, { note = "", detail = true, h = 150 } = {}) => {
  const rgb = hex2rgb(hex), fg = readableOn(hex);
  return `<div class="sw"><div class="chip" style="background:${hex};color:${fg};height:${h}px"><b>${name}</b><span>${hex.toUpperCase()}</span></div>${
    detail
      ? `<dl><dt>HEX</dt><dd>${hex.toUpperCase()}</dd><dt>RGB</dt><dd>${rgb.join(", ")}</dd><dt>CMYK</dt><dd>${rgb2cmyk(rgb)}</dd><dt>HSL</dt><dd>${rgb2hsl(rgb)}</dd></dl>`
      : ""
  }${note ? `<p class="n">${note}</p>` : ""}</div>`;
};
const cards = (items, cols = 3, cls = "") =>
  `<div class="cards c${cols} ${cls}">${items
    .map((i) => `<div class="card">${i.icon ? `<span class="ico">${ic(i.icon, 20)}</span>` : ""}<h4>${i.h}</h4><p>${i.p}</p></div>`)
    .join("")}</div>`;
const lead = (t) => `<p class="lead">${t}</p>`;
const two = (a, b, cls = "") => `<div class="two ${cls}"><div>${a}</div><div>${b}</div></div>`;
const list = (xs, cls = "") => `<ul class="ls ${cls}">${xs.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const dos = (yes, no) =>
  `<div class="two"><div class="card ok"><h4>${ic("faCheck", 16)} Do</h4>${list(yes)}</div><div class="card no"><h4>${ic("faXmark", 16)} Don’t</h4>${list(no)}</div></div>`;
const phone = (img, w = 190) => `<div class="phone" style="width:${w}px"><img src="assets/app/${img}.png" alt=""></div>`;
const btn = (t, k = "primary") => `<span class="btn ${k}">${t}</span>`;
const tint = (t, i) => `<span class="tintchip" style="background:${TINTS[i][1]};color:${TINTS[i][2]};box-shadow:inset 0 0 0 1px ${TINTS[i][2]}33">${t}</span>`;
const dl = (f, label) => `<a class="dl" href="assets/${f}" download>${ic("faDownload", 14)} ${label}<small>${f.split("/").pop()}</small></a>`;

/* ───────── pages ───────── */
const SECTIONS = [
  "Brand introduction", "Brand strategy", "Logo identity", "Color system", "Typography", "Visual identity",
  "Brand communication", "Brand applications", "Digital brand identity", "Brand governance", "Final section",
];
const P = []; // {s, t, html, raw}
const add = (s, t, html, raw = false) => P.push({ s, t, html, raw });

/* 01 Brand introduction */
add(0, "Cover Page", `
<div class="cover">
  <div class="cv-l">
    ${lockup(46)}
    <h1>Brand<br>guidelines</h1>
    <p class="cv-sub">One workspace, any AI.</p>
    <p class="cv-meta">Version 2.0 · November 2026 · Backed by Setups Works</p>
  </div>
  <div class="cv-r"><img src="${L("naazhi-mark-on-cream-3000.png")}" alt="Naazhi mark on cream"></div>
</div>`, true);

add(0, "Table of Contents", "__TOC__", true);

add(0, "About the Brand", `
${lead("Naazhi is one workspace for the days, work and thoughts of one person.")}
${two(
  `<p>Notes, to-dos, journal, chat, calendar and a Reader live together, on the web and on the phone. An AI layer can help, and it can be swapped for another provider, replaced with your own key, or switched off.</p>
   <p>The product is calm on purpose. It uses clean Geist typography, high-contrast ink, crisp hairline borders and flat paper surfaces, and it says what happened and what to do next.</p>`,
  cards([
    { icon: "faNoteSticky", h: "Notes, tasks, journal", p: "The things you write and plan." },
    { icon: "faComments", h: "Chat with an optional AI", p: "Swap it, bring your own, or turn it off." },
    { icon: "faCalendarDays", h: "Calendar and Reader", p: "Your day and what you follow." },
    { icon: "faShieldHalved", h: "Private by design", p: "Row-level security, private storage." },
  ], 2)
)}`);

add(0, "Brand Story", `
${two(
  `<div class="quote"><span class="tm">நாழி</span><p class="serif big">An old Tamil measure of grain, and of time. A small, honest unit you use every day.</p></div>`,
  `<p>The name <b>Naazhi</b> (நாழி, said <i>NAA-zhee</i>) comes from a measure people once used to portion out both grain and time: small, plain, trusted, daily.</p>
   <p>That is the idea behind the product. Our days are scattered across a dozen apps, and each one asks for attention. Naazhi keeps the days, the work and the thoughts of one person in one place, and keeps the loud parts quiet.</p>
   <p>The mark is drawn the way Tamil is written: one hand-drawn line with rounded ends that curls, loops and closes into a speech bubble. It was made to feel personal, not corporate.</p>`
)}`);

add(0, "Brand Vision", `
${lead("A workspace that belongs to the person who uses it.")}
${cards([
  { icon: "faUser", h: "Personal first", p: "Everything a person keeps, in one place that is theirs." },
  { icon: "faKey", h: "Your AI, your terms", p: "The AI layer can change or go away. The workspace stays." },
  { icon: "faLock", h: "Trust by default", p: "Private data stays private, and people can always take it with them." },
], 3)}
<p class="note">Draft statement written from the product principles in docs/ARCHITECTURE.md and docs/SECURITY.md. Brand owner to confirm.</p>`);

add(0, "Brand Mission", `
${lead("Give everyone one calm place for their notes, tasks and days, with an AI they control.")}
${list([
  "Bring writing, planning and reflection together so nothing is lost between apps.",
  "Make AI optional: swap it, bring your own key, or keep the workspace AI-free.",
  "Be honest about what the product does, what it costs and how data is handled.",
  "Work the same on the web and on the phone, in English and with Tamil in mind.",
], "big")}`);

add(0, "Brand Values", cards([
  { icon: "faLeaf", h: "Calm", p: "Quiet screens, short sentences, no hype words, no exclamation marks." },
  { icon: "faHandHoldingHeart", h: "Personal", p: "Hand-drawn mark, calm paper-and-ink surfaces, a voice that sounds like a person." },
  { icon: "faShieldHalved", h: "Private", p: "Your data is yours, scoped in the database and exportable any time." },
  { icon: "faSliders", h: "In control", p: "AI is a layer you choose, swap or switch off." },
  { icon: "faCircleCheck", h: "Honest", p: "Plain claims that match the security docs. We never promise more." },
  { icon: "faUniversalAccess", h: "Accessible", p: "Keyboard, contrast, reduced motion and 375 px screens are required." },
], 3));

add(0, "Brand Positioning", `
${lead("For people who want one calm workspace and decide for themselves how much AI is in it.")}
${two(
  `<div class="card"><h4>Statement</h4><p>Naazhi is the personal workspace that keeps notes, tasks, journal, chat and calendar together, with an AI layer you can swap, bring your own, or switch off.</p></div>`,
  `<div class="card"><h4>Where we sit</h4>
    <div class="axes"><div class="ax"><span>Loud, many features</span><i></i><span>Calm, focused</span><b style="left:88%"></b></div>
    <div class="ax"><span>AI decides</span><i></i><span>You decide</span><b style="left:90%"></b></div>
    <div class="ax"><span>Team first</span><i></i><span>Person first</span><b style="left:84%"></b></div></div></div>`
)}`);

add(0, "Brand Personality", `
${lead("If Naazhi were a person: a thoughtful friend who keeps your diary tidy and never shouts.")}
${cards([
  { icon: "faFaceSmile", h: "Warm", p: "Friendly, plain, a little human." },
  { icon: "faFeatherPointed", h: "Calm", p: "Unhurried. Short sentences. Space to think." },
  { icon: "faBookOpen", h: "Considered", p: "Careful details, not clever gimmicks." },
  { icon: "faHandshake", h: "Trustworthy", p: "Says what it does, does what it says." },
], 4)}
<div class="two"><div class="card ok"><h4>Sounds like</h4><p>“Couldn’t save that. Try again.”</p></div><div class="card no"><h4>Never sounds like</h4><p>“Oops! Something went wrong!!”</p></div></div>`);

add(0, "Brand Promise", `
<div class="promise"><p class="serif huge">Your AI can change.<br><span class="quiet">Your workspace shouldn’t.</span></p></div>
${cards([
  { h: "Your content stays yours", p: "It lives in your workspace, not inside an AI provider." },
  { h: "No surprises", p: "Nothing is sent to a model you haven’t chosen. In AI-free mode nothing is sent at all." },
  { h: "You can leave", p: "Export your data at any time, or delete your account in Settings." },
], 3)}`);

/* 02 Strategy */
add(1, "Target Audience", `
${lead("Individuals who keep their life in text and want it in one tidy place.")}
${cards([
  { icon: "faPenNib", h: "Knowledge workers", p: "Designers, developers, writers and consultants who juggle notes, tasks and a journal." },
  { icon: "faGraduationCap", h: "Students and researchers", p: "Keep notes, deadlines and reading in one workspace." },
  { icon: "faUserShield", h: "Privacy-minded people", p: "Want AI without handing their notes to a provider they didn’t pick." },
  { icon: "faLanguage", h: "Tamil and English speakers", p: "India-first (prices in ₹, Tamil name and script), open to the world." },
], 4)}
<p class="note">Draft audience, written from the product docs. Validate with research before using in paid media.</p>`);

add(1, "Customer Personas", `
<div class="cards c3 personas">
${[
  ["Priya, 29", "Product designer, Chennai", "Notes in one app, tasks in another, a journal on paper.", "Wants one calm place on her phone and laptop. Writes in English and Tamil.", "faPenNib", 0],
  ["Arun, 34", "Freelance developer", "Uses several AI tools and pastes client notes into them.", "Wants AI he controls: his own key, or none. Cares where data lives.", "faCode", 1],
  ["Meera, 41", "Teacher and parent", "Plans lessons, keeps a private journal, shares a family journal.", "Wants it simple, private and AI-free if she chooses.", "faChalkboardUser", 4],
].map(([n, r, pain, want, icon, t]) => `<div class="card persona" style="--tb:${TINTS[t][1]};--tf:${TINTS[t][2]}"><span class="av">${ic(icon, 26)}</span><h4>${n}</h4><small>${r}</small><p><b>Today</b> ${pain}</p><p><b>Needs</b> ${want}</p></div>`).join("")}
</div>
<p class="note">Draft personas, not research findings. Replace with interview-based personas when available.</p>`);

add(1, "Market Positioning", `
${lead("Between the heavy team suites and the single-purpose apps: a personal workspace with AI that is optional.")}
<div class="map"><div class="mx"></div><div class="my"></div>
<span class="l t">AI-led</span><span class="l b">AI optional</span><span class="l lf">Single purpose</span><span class="l r">Whole workspace</span>
<div class="dot a">Single-purpose note apps</div><div class="dot b2">Team suites</div><div class="dot c2">AI chat apps</div>
<div class="dot me">${mk(34)} Naazhi</div></div>`);

add(1, "Unique Selling Proposition (USP)", `
<div class="usp"><p class="serif huge">One workspace, any AI.</p>
<p class="lead">Everything you keep in one place, with an AI you can swap, bring your own, or switch off.</p></div>
${cards([
  { icon: "faLayerGroup", h: "One workspace", p: "Notes, to-dos, journal, chat, calendar and Reader together." },
  { icon: "faRepeat", h: "Any AI", p: "Groq, your own key, Puter, or none. Nothing moves when you switch." },
  { icon: "faMobileScreen", h: "Web and phone", p: "The same workspace on both, with home-screen widgets." },
], 3)}`);

add(1, "Brand Differentiation", `
<table class="tbl"><thead><tr><th></th><th>${lockup(20)}</th><th>Typical AI notes app</th><th>Typical productivity suite</th></tr></thead><tbody>
<tr><td>AI</td><td>Swap, own key, or off</td><td>One built-in model</td><td>Add-on, often paid</td></tr>
<tr><td>Where your content lives</td><td>Your workspace, private</td><td>Often tied to the AI vendor</td><td>Team workspace</td></tr>
<tr><td>Focus</td><td>One person’s days</td><td>Notes</td><td>Teams and projects</td></tr>
<tr><td>Tone</td><td>Calm, plain</td><td>Hype</td><td>Corporate</td></tr>
<tr><td>Leaving</td><td>Export or delete in Settings</td><td>Varies</td><td>Varies</td></tr></tbody></table>
<p class="note">General positioning comparison, not a claim about any named competitor.</p>`);

add(1, "Brand Archetype", `
${two(
  `<div class="card big"><span class="ico">${ic("faBookOpen", 28)}</span><h3>The Sage</h3><p>Knows the value of clarity. Helps you see your own days and thoughts and decide for yourself.</p></div>`,
  `<div class="card big"><span class="ico">${ic("faHandHoldingHeart", 28)}</span><h3>with a touch of the Caregiver</h3><p>Looks after what you keep. Warm, protective, never pushy.</p></div>`
)}
<p class="lead">Sage in substance, Caregiver in manner. Calm authority without lecturing.</p>`);

add(1, "Brand Philosophy", `
${lead("Small, honest units, used every day.")}
${cards([
  { h: "Small", p: "One thing at a time. One headline, one accent, one primary action per view." },
  { h: "Honest", p: "Plain words, real screenshots, claims that match the security docs." },
  { h: "Daily", p: "Built for the habit, not the demo. Fast, quiet, always there." },
  { h: "Yours", p: "The person decides what connects, what AI sees and what leaves." },
], 4)}`);

/* 03 Logo */
add(2, "Primary Logo", `
<div class="stage cream">${lockup(120)}</div>
${two(`<p>The primary logo is the <b>lockup</b>: the mark on the left and the word <b>Naazhi</b> beside it, vertically centred. Use it in headers, footers, emails and covers.</p>`,
`<p class="n">Wordmark: Instrument Serif 400, tracking −0.02em, ink colour. Mark height 1.3× the wordmark size. Gap 0.35×. Never stack them in the product UI.</p>`)}`);

add(2, "Secondary Logo", `
<div class="two"><div class="stage cream sm"><span class="wm" style="font-size:110px">Naazhi</span></div><div class="stage cream sm">${mk(200)}</div></div>
${two(`<p><b>Wordmark alone</b>: when the mark already appears nearby, for example a hero under a top bar that carries the lockup.</p>`,
`<p><b>Mark alone</b>: avatars, favicons, app icons and tight spaces. At least 16 px on screen.</p>`)}`);

add(2, "Logo Variations", `
<div class="grid3">
<div class="stage cream sm">${lockup(54)}<small>Lockup · ink on paper</small></div>
<div class="stage dark sm">${lockup(54, { cream: true })}<small>Lockup · reverse on ink</small></div>
<div class="stage green sm">${lockup(54, { cream: true })}<small>Lockup · reverse on green</small></div>
<div class="stage white sm">${mk(120)}<small>Mark · on white</small></div>
<div class="stage dark sm">${mk(120, true)}<small>Mark · cream version</small></div>
<div class="stage cream sm"><img src="${L("naazhi-app-icon-1024.png")}" style="height:120px;border-radius:26px" alt=""><small>App icon</small></div>
</div>`);

add(2, "Brand Symbol / Icon", `
${two(`<div class="stage cream tall"><img src="${L("naazhi-mark-3000.png")}" style="height:420px" alt=""></div>`,
`<h3 class="serif">One line, three ideas</h3>
${cards([
  { icon: "faNoteSticky", h: "The bubble with three lines", p: "Notes, journal and chat. The things you write." },
  { icon: "faWandMagicSparkles", h: "The star", p: "The AI layer: present, small, optional." },
  { icon: "faPencil", h: "Single weight, round ends", p: "Calm and personal, not corporate." },
], 1)}`)}`);

add(2, "Logo Construction", `
${two(
  `<div class="stage cream tall constr"><img src="${L("naazhi-mark-3000.png")}" style="height:440px" alt="">
    <span class="tag" style="top:12%;left:58%">1 · Curl</span><span class="tag" style="top:40%;left:62%">2 · Loop</span>
    <span class="tag" style="top:12%;left:80%">3 · Star</span><span class="tag" style="top:78%;left:60%">4 · Bubble + lines</span></div>`,
  `<ol class="ls num">
    <li><b>Curl.</b> The small hook at the top, where the stroke begins.</li>
    <li><b>Loop.</b> The round counter in the middle, the heart of the shape.</li>
    <li><b>Star.</b> A four-point spark at about 40 % of the green. Never recolour it separately.</li>
    <li><b>Bubble with three lines.</b> The long tail closes into a speech bubble holding three lines of writing.</li></ol>
   <p class="note">The mark is a hand-drawn master picture, processed into transparent PNGs by <code>scripts/brand/build-assets.mjs</code>. Don’t redraw it from memory.</p>`
)}`);

add(2, "Logo Grid & Proportions", `
${two(
  `<div class="stage cream tall"><div class="gridlock"><div class="ln h1"></div><div class="ln h2"></div><span class="lockup" style="font-size:96px;gap:33.6px;color:${C.ink}">${mk(124.8)}<span class="wm">Naazhi</span></span>
  <i class="mrk a">1.3 × x</i><i class="mrk b">0.35 × x</i><i class="mrk c">x = wordmark size</i></div></div>`,
  `<table class="tbl"><tbody><tr><td>Wordmark</td><td>Instrument Serif 400, size <b>x</b></td></tr><tr><td>Mark height</td><td><b>1.3 × x</b></td></tr><tr><td>Gap</td><td><b>0.35 × x</b></td></tr><tr><td>Alignment</td><td>Vertically centred, mark on the left</td></tr><tr><td>Tracking</td><td>−0.02 em</td></tr></tbody></table>
  <h4 class="mt">Sizes used today</h4>
  <table class="tbl sm"><tbody><tr><td>Top bar (web, app)</td><td>28 px mark</td></tr><tr><td>Hero, shared pages</td><td>26 px</td></tr><tr><td>Footer</td><td>34 px</td></tr><tr><td>Chat welcome</td><td>40 px</td></tr><tr><td>Mobile launch</td><td>160 px with name below</td></tr></tbody></table>`
)}`);

add(2, "Clear Space", `
${two(
  `<div class="stage cream tall"><div class="clear"><div class="cs-box"><div class="cs-in">${lockup(70)}</div></div><i>½ mark width</i></div></div>`,
  `${lead("Keep at least half the mark’s width free on every side.")}
   <p>The loop at the top of the mark is the unit. Nothing enters this space: text, edges of the page, photos or other logos.</p>
   <p>In an app icon the mark fills about 66 % of the square, centred.</p>`
)}`);

add(2, "Minimum Logo Size", `
<div class="grid4">
${[16, 24, 32, 48].map((s) => `<div class="stage white sm">${mk(s)}<small>${s} px mark</small></div>`).join("")}
</div>
${two(
  `<table class="tbl"><tbody><tr><td>Mark alone, screen</td><td><b>16 px</b> (favicon)</td></tr><tr><td>Mark alone, print</td><td><b>8 mm</b></td></tr><tr><td>Mark in a lockup</td><td><b>24 px</b> high</td></tr></tbody></table>`,
  `<p>Below about 24 px the star and the three lines blur. That is fine for a tab icon, but don’t rely on them to carry meaning.</p>`
)}`);

add(2, "Logo Color Variations", `
<div class="grid4">
<div class="stage cream sm">${mk(110)}<small>Naazhi green<br>#235340</small></div>
<div class="stage dark sm">${mk(110, true)}<small>Cream reverse<br>#F9F4E5</small></div>
<div class="stage cream sm"><img src="${L("android-icon-monochrome.png")}" style="height:110px;background:${C.logoGreen};border-radius:12px" alt=""><small>One colour<br>(themed icons)</small></div>
<div class="stage white sm"><img src="${L("icon.png")}" style="height:110px;border-radius:12px" alt=""><small>Mark on cream<br>(app icon)</small></div>
</div>
${two(
  `<table class="tbl"><tbody><tr><td>Ink strokes</td><td>Naazhi green <b>#235340</b></td></tr><tr><td>Details (star, lines)</td><td>Same green at about 40 %</td></tr><tr><td>Ground</td><td>Naazhi cream <b>#F9F4E5</b></td></tr></tbody></table>`,
  `<p>The details get their lighter tone from the file’s own transparency. Never recolour them separately. The UI uses its tokens, never these two hex values.</p>`
)}`);

add(2, "Logo on Different Backgrounds", `
<div class="grid4">
<div class="stage cream sm">${lockup(34)}<small>Paper · ink</small></div>
<div class="stage white sm">${lockup(34)}<small>White card · ink</small></div>
<div class="stage dark sm">${lockup(34, { cream: true })}<small>Ink fill · cream</small></div>
<div class="stage green sm">${lockup(34, { cream: true })}<small>Green · cream</small></div>
</div>
${dos(
  ["Put the logo on paper, white cards or the dark fill.", "Use the cream version on dark and on green.", "Keep 4.5 : 1 contrast between strokes and ground."],
  ["Place it on a busy photo.", "Use a background with less than 4.5 : 1 contrast.", "Mix the ink mark with a cream wordmark."]
)}`);

add(2, "Incorrect Logo Usage", `
<div class="grid4 bad">
${[
  ["Don’t recolour", "filter:hue-rotate(160deg) saturate(2)"],
  ["Don’t stretch", "transform:scaleX(1.6)"],
  ["Don’t rotate", "transform:rotate(25deg)"],
  ["Don’t add effects", "filter:drop-shadow(8px 8px 6px rgba(0,0,0,.5))"],
  ["Don’t outline", "filter:drop-shadow(2px 0 0 #c13d3d) drop-shadow(-2px 0 0 #c13d3d) drop-shadow(0 2px 0 #c13d3d) drop-shadow(0 -2px 0 #c13d3d)"],
  ["Don’t crop", "clip-path:inset(0 0 45% 0)"],
  ["Don’t use low contrast", "opacity:.85;background:#3c7a63"],
  ["Don’t put it on photos", "background:repeating-linear-gradient(45deg,#c9a98a 0 10px,#7d9b7a 10px 22px,#e3d0b5 22px 30px)"],
].map(([t, st]) => `<div class="stage cream sm x"><div class="bx" style="${st.startsWith("background") || st.startsWith("opacity") ? st : ""}"><img class="mk" src="${MARK}" style="height:90px;${st.startsWith("background") || st.startsWith("opacity") ? "" : st}" alt=""></div><small>${ic("faXmark", 12, C.critical)} ${t}</small></div>`).join("")}
</div>
<p class="note">Also never: write the name in all caps or lower case at the start of a sentence, bounce or animate the strokes apart, or use the retired mascot and ghost artwork.</p>`);

/* 04 Color */
add(3, "Primary Brand Colors", `
<div class="swrow big">
${swatch("White", C.white, { note: "Raised surface: cards, dialogs, sheets. Token --surface / --raised.", h: 200 })}
${swatch("Paper", C.paper, { note: "The page canvas & sidebar. Token --page / --paper.", h: 200 })}
${swatch("Ink", C.ink, { note: "Text, headings, primary controls. Token --fg / --ink.", h: 200 })}
${swatch("Hairline", C.line, { note: "1 px crisp card and row borders. Token --line.", h: 200 })}
</div>
<p class="note">The foundation is <b>paper and ink</b>: restrained, near-monochrome surfaces with 1 px hairline borders, no shadows on cards, and no gradients or pastel washes behind whole panels.</p>`);

add(3, "Secondary Brand Colors", `
<div class="swrow big">
${swatch("Coral", C.coral, { note: "Warm accent: selection dots, attention. Token --coral.", h: 200 })}
${swatch("Critical", C.critical, { note: "Errors, destructive actions, alerts. Token --critical.", h: 200 })}
${swatch("Success", C.success, { note: "Completed tasks, positive status. Token --success.", h: 200 })}
${swatch("Overdue", C.overdue, { note: "Overdue items, medium priority. Token --overdue.", h: 200 })}
</div>
<p class="note">The logo’s own green (<code>#235340</code>) and cream (<code>#F9F4E5</code>) stay preserved strictly in the logo files and app icon. The interface uses its own semantic design tokens.</p>`);

add(3, "Accent Colors", `
<div class="tints">${TINTS.map(([n, bg, fg]) => `<div class="tint" style="background:${bg};color:${fg};box-shadow:inset 0 0 0 1px ${fg}33"><b>${n}</b><span>bg ${bg.toUpperCase()}</span><span>fg ${fg.toUpperCase()}</span></div>`).join("")}</div>
<p>Muted earthy tints mark categories, calendar events and label statuses. Each is a pair: a soft background and a strong foreground. In code: <code>at-&lt;tint&gt; tint</code>. No purple or violet.</p>
<div class="swrow">${swatch("Coral", C.coral, { detail: false, h: 70, note: "Warm accent" })}${swatch("Critical", C.critical, { detail: false, h: 70, note: "Errors & danger" })}${swatch("Success", C.success, { detail: false, h: 70, note: "Completed" })}${swatch("Overdue", C.overdue, { detail: false, h: 70, note: "Overdue dates" })}</div>`);

add(3, "Neutral Colors", `
<div class="swrow">
${[["Surface white", C.surface], ["Paper / Side", C.paper], ["Sunken fill", C.sunken], ["Hairline border", C.line]].map(([n, h]) => swatch(n, h, { detail: false, h: 90 })).join("")}
</div>
<div class="swrow">
${[["Ink text", C.ink], ["Text muted", C.fgMuted], ["Text subtle", C.fgSubtle], ["Text faint", C.fgFaint]].map(([n, h]) => swatch(n, h, { detail: false, h: 90 })).join("")}
</div>
<p class="note">Hairlines are 1 px solid borders (<code>--line #ebebeb</code>, <code>--line-strong #dedede</code>). Never use pure #000 or fuzzy grey drop shadows.</p>`);

add(3, "Color Codes (HEX, RGB, CMYK, HSL)", `
<table class="tbl codes"><thead><tr><th>Colour</th><th>Token</th><th>HEX</th><th>RGB</th><th>CMYK*</th><th>HSL</th></tr></thead><tbody>
${[
  ["White", "--surface / --raised", C.white],
  ["Paper", "--page / --paper", C.paper],
  ["Ink", "--fg / --ink", C.ink],
  ["Hairline", "--line", C.line],
  ["Hairline strong", "--line-strong", C.lineStrong],
  ["Coral", "--coral", C.coral],
  ["Critical", "--critical", C.critical],
  ["Success", "--success", C.success],
  ["Overdue", "--overdue", C.overdue],
  ["Logo green", "logo files only", C.logoGreen],
  ["Logo cream", "logo files only", C.logoCream],
].map(([n, tk, h]) => { const r = hex2rgb(h); return `<tr><td><i class="dot" style="background:${h}"></i>${n}</td><td><code>${tk}</code></td><td>${h.toUpperCase()}</td><td>${r.join(", ")}</td><td>${rgb2cmyk(r)}</td><td>${rgb2hsl(r)}</td></tr>`; }).join("")}
</tbody></table>
<p class="note">*CMYK values are straight conversions for reference. Print a proof and match by eye before a production run.</p>`);

add(3, "Color Combinations", `
<div class="combos">
${[
  [C.paper, C.ink, C.ink, "Paper · ink", "Default page canvas"],
  [C.white, C.ink, C.ink, "White · ink", "Flat cards & dialogs"],
  [C.dark, C.onDark, C.fgSubtle, "Dark · on-dark", "Dark panels, primary button"],
  [C.paper, C.ink, C.coral, "Paper · coral", "Warm accent & selection"],
  ["#f0f5f0", "#2d8a5e", "#2d8a5e", "Success tint", "Tasks done, positive status"],
  ["#f5ebe8", "#9a5a4a", "#9a5a4a", "Clay tint", "Errors, warnings, alerts"],
].map(([bg, fg, ac, t, u]) => `<div class="combo" style="background:${bg};color:${fg}"><b style="color:${ac}">Aa</b><span>${t}</span><small>${u}</small></div>`).join("")}
</div>`);

add(3, "Color Usage Ratio", `
<div class="ratio"><div style="flex:60;background:#fff;color:${C.ink};box-shadow:inset 0 0 0 1px #ebebeb">White 60</div><div style="flex:20;background:${C.paper};color:${C.ink}">Paper 20</div><div style="flex:12;background:${C.dark};color:${C.onDark}">Ink 12</div><div style="flex:6;background:${C.coral};color:#fff">Coral 6</div><div style="flex:2;background:#f0f5f0;color:${C.success}">Tint</div></div>
${cards([
  { h: "Mostly white & paper", p: "Restrained, near-monochrome paper surface with 1 px hairline borders." },
  { h: "High-contrast ink", p: "Crisp ink headings, high-contrast readability, and rectangular dark action buttons." },
  { h: "Restrained accents", p: "Coral for attention, status colours (success/critical) for feedback, tints for category chips." },
], 3)}
<p class="note">A guideline for balance, not a measured spec.</p>`);

{
  const pairs = [
    ["Ink on white", C.ink, C.white],
    ["Ink on paper", C.ink, C.paper],
    ["Muted text on white", C.fgMuted, C.white],
    ["Muted text on paper", C.fgMuted, C.paper],
    ["Critical on white", C.critical, C.white],
    ["Success on white", C.success, C.white],
    ["Coral on white", C.coral, C.white],
    ["White on dark fill", C.onDark, C.dark],
    ["Green tint text", "#2d8a5e", "#f0f5f0"],
    ["Clay tint text", "#9a5a4a", "#f5ebe8"],
    ["Logo green on logo cream", C.logoGreen, C.logoCream],
  ];
  const row = ([n, f, b]) => {
    const r = contrast(f, b);
    const lvl = r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "Large only" : "Fail";
    return `<tr><td><span class="pair" style="background:${b};color:${f}">Aa</span> ${n}</td><td>${r.toFixed(2)} : 1</td><td class="${r >= 4.5 ? "pass" : r >= 3 ? "warn" : "fail"}">${lvl}</td></tr>`;
  };
  add(3, "Accessibility & Contrast", `
<table class="tbl sm"><thead><tr><th>Pair</th><th>Ratio</th><th>WCAG</th></tr></thead><tbody>${pairs.map(row).join("")}</tbody></table>
<p class="note">Ratios are computed from the hex values. Faint and subtle text are for labels and hints, never for body copy. Colour is never the only signal: pair it with an icon or text.</p>`);
}

/* 05 Typography */
add(4, "Primary Typeface", `
${two(
  `<div class="spec"><div style="font-size:170px;line-height:1;font-weight:600">Aa</div><h3 style="font-size:40px;font-weight:600">Geist</h3><p>Weights 400, 500, 600, 700 · tracking −0.022em to −0.03em for headings</p></div>`,
  `<p style="font-size:32px;line-height:1.2;font-weight:600;letter-spacing:-.025em">The quick brown fox jumps over the lazy dog.</p>
   <p style="font-size:22px;letter-spacing:-.01em">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 ’ “ ” — &amp;</p>
   <p><b>Geist</b> is the primary typeface for everything in the UI: headings, body copy, controls and buttons. Clean modernist geometry with optical balance and humanist rhythm.</p>`
)}`);

add(4, "Secondary Typeface", `
${two(
  `<div class="spec"><div class="wm" style="font-size:150px;line-height:1">Aa</div><h3 class="wm" style="font-size:38px">Instrument Serif</h3><p>Weight 400 only · reserved strictly for the Naazhi wordmark</p></div>`,
  `<p class="wm" style="font-size:36px;line-height:1.2;letter-spacing:-.02em">Naazhi brand mark and wordmark only.</p>
   <p><b>Instrument Serif</b> is used solely for the brand wordmark in headers, footers and covers. It is never used for general UI page titles, dialogs, cards, or body text.</p>
   <p><b>Geist Mono</b> is used for counters, code and keyboard hints: <code>⌘K</code> <code>12:30</code></p>
   <p><b>Noto Sans Tamil</b> loads automatically for Tamil text: <span style="font-size:26px">நாழி</span></p>`
)}`);

add(4, "Heading Typography", `
<div class="hd">
<div><small>Page title · Geist 600, clamp(28px, 3vw, 42px), −0.025em</small><p style="font-size:52px;line-height:1.05;letter-spacing:-.03em;font-weight:600">Everything you keep, <span class="quiet">in one place.</span></p></div>
<div><small>Dialog title · Geist 600, 24–28px, −0.02em</small><p style="font-size:34px;letter-spacing:-.02em;font-weight:600">New event</p></div>
<div><small>Section label · Geist 11px, semi-bold, +0.1em, uppercase</small><p class="eyebrow">Today</p></div>
</div>
<p>Headings are sentence case. The <b>quiet</b> class is the lower-contrast second half of a two-tone marketing heading (faint ink), not italic green.</p>`);

add(4, "Body Typography", `
${two(
  `<h4>Body · Geist 14–16 px</h4><p style="font-size:16px;line-height:1.55">Naazhi keeps your notes, tasks, journal and chat in one workspace. Write something down and it is there on your phone and your laptop. Switch the AI off and nothing changes about where your words live.</p>
   <h4>Small labels · 12–13.5 px</h4><p style="font-size:13px;color:${C.fgMuted}">Last edited today · 3 notes · Synced</p>`,
  `${cards([
    { h: "Never below 11 px", p: "The smallest text in the product." },
    { h: "Form controls inherit", p: "Always font: inherit, so a textarea never renders in monospace." },
    { h: "Sentence case", p: "“New event”, not “New Event”." },
  ], 1)}`
)}`);

add(4, "Display Typography", `
<div class="display"><p style="font-family:var(--sans);font-weight:700;font-size:96px;line-height:.96;letter-spacing:-.04em">One workspace,<br><span class="quiet">any AI.</span></p></div>
<p>Display sizes are for covers, hero sections and marketing: Geist 600–700 at 64–120 px, tight tracking, balanced lines, one quiet phrase.</p>`);

add(4, "Font Weights & Styles", `
${two(
  `<h4>Geist</h4>${[400, 500, 600, 700].map((w) => `<p style="font-size:24px;font-weight:${w}">${["Regular", "Medium", "Semi-bold", "Bold"][[400, 500, 600, 700].indexOf(w)]} ${w}</p>`).join("")}`,
  `<h4>Instrument Serif</h4><p class="wm" style="font-size:32px">Regular 400 (wordmark lockup only)</p>
   <h4 class="mt">Geist Mono</h4><p style="font-family:var(--mono);font-size:20px">Regular 400 · Medium 500</p>`
)}
<p class="note">Use Regular for body, Medium or Semi-bold for labels, tabs and buttons, Semi-bold (600) for titles, and Bold (700) for display headings.</p>`);

add(4, "Typography Hierarchy", `
<div class="hier">
<div><span>Display</span><p style="font-size:56px;line-height:1;letter-spacing:-.035em;font-weight:700">Calm by default</p></div>
<div><span>Page title</span><p style="font-size:38px;line-height:1.05;letter-spacing:-.025em;font-weight:600">Today’s tasks</p></div>
<div><span>Section label</span><p class="eyebrow">Upcoming</p></div>
<div><span>Body</span><p style="font-size:15px">Plan the week, then write down how it went.</p></div>
<div><span>Small</span><p style="font-size:13px;color:${C.fgMuted}">Due tomorrow · Repeats weekly</p></div>
<div><span>Mono</span><p style="font-family:var(--mono);font-size:13.5px">⌘K · 12:30 · UNT-49</p></div>
</div>`);

add(4, "Line Height & Letter Spacing", `
<table class="tbl"><thead><tr><th>Use</th><th>Font</th><th>Size</th><th>Line height</th><th>Tracking</th></tr></thead><tbody>
<tr><td>Display</td><td>Geist 700</td><td>64–120 px</td><td>0.96–1.02</td><td>−0.035 em</td></tr>
<tr><td>Page title</td><td>Geist 600</td><td>28–42 px</td><td>1.05–1.1</td><td>−0.025 em</td></tr>
<tr><td>Dialog title</td><td>Geist 600</td><td>24–28 px</td><td>1.15</td><td>−0.02 em</td></tr>
<tr><td>Wordmark</td><td>Instrument Serif 400</td><td>any</td><td>1</td><td>−0.02 em</td></tr>
<tr><td>Body</td><td>Geist 400</td><td>14–16 px</td><td>1.5–1.6</td><td>0</td></tr>
<tr><td>Section label</td><td>Geist 600</td><td>11 px</td><td>1.3</td><td>+0.1 em, uppercase</td></tr></tbody></table>`);

add(4, "Typography Do's & Don'ts", dos(
  ["Use Geist for all headings, body text, buttons and controls.", "Reserve Instrument Serif strictly for the Naazhi wordmark.", "Write in sentence case with curly apostrophes (’).", "Keep line length near 60–75 characters."],
  ["Use Instrument Serif for page titles, buttons or body text.", "Use Title Case Buttons or ALL CAPS headings.", "Go below 11 px or use faint text for body copy.", "Add bold or italic to Instrument Serif (it has one weight)."]
));

/* 06 Visual identity */
add(5, "Brand Patterns", `
<div class="grid3 pat">
<div class="pt p1"></div><div class="pt p2"></div><div class="pt p3"></div></div>
<p>Patterns are quiet backgrounds built from the brand’s own forms. They sit at low opacity behind content and never compete with it.</p>
${list(["<b>Marks</b>: the mark repeated on a diagonal grid at 6 % opacity.", "<b>Lines</b>: the three writing lines, repeated.", "<b>Dots</b>: a dot grid on paper for planning surfaces."])}`);

add(5, "Graphic Elements", `
${cards([
  { icon: "faStar", h: "The spark", p: "A four-point star for the AI layer. Small, optional, one per view." },
  { icon: "faGripLines", h: "Three lines", p: "Writing lines from the bubble, used as dividers and bullets." },
  { icon: "faCircle", h: "Soft glow", p: "A blurred neutral glow behind page heroes." },
  { icon: "faTableCells", h: "Hairline grid", p: "1 px gaps over a hairline colour for calendars and tables." },
], 4)}
<div class="stage cream sm glowdemo"><span class="glow"></span>${lockup(50)}</div>`);

add(5, "Shapes & Geometry", `
<div class="shapes">
${[["r1", 8], ["r2", 10], ["r3", 12], ["r4", 16], ["ctl", 8]].map(([n, r]) => `<div><span style="border-radius:${r}px"></span><b>${n === "ctl" ? "ctl" : "r" + n.slice(1)}</b><small>${r + " px"}</small></div>`).join("")}
</div>
${two(`<p>Cards use <b>r3 · 12 px</b>, dialogs <b>r4 · 16 px</b>, buttons <b>8 px (rounded-ctl)</b>. Small chips use 6 px. Controls are rectangular with subtle corner rounding.</p>`,
`<p>Surfaces are flat paper with a 1 px hairline border (<code>--line #ebebeb</code>), not translucent glass. Shadows are reserved for floating layers (<code>shadow-pop</code>).</p>`)}`);

add(5, "Iconography", `
<div class="icons">${["faNoteSticky", "faListCheck", "faBookOpen", "faComments", "faCalendarDays", "faRss", "faHeartPulse", "faMagnifyingGlass", "faShieldHalved", "faKey", "faBell", "faGear", "faUser", "faLock", "faPlus", "faCheck", "faPaperPlane", "faDownload", "faMicrophone", "faPaperclip"].map((n) => `<span>${ic(n, 30)}<small>${n.slice(2)}</small></span>`).join("")}</div>
<p><b>Font Awesome Free, Solid</b> only, drawn in the ink colour. No emoji in the product, no other icon sets. Icon-only buttons need an <code>aria-label</code>.</p>`);

add(5, "Illustration Style", `
${two(
  `${lead("No mascots. The product is the illustration.")}
   <p>Naazhi doesn’t use characters or decorative scenes. Empty states are one quiet line with the next step. When a picture is needed, use the mark, the spark and soft tinted shapes.</p>
   ${list(["The retired mascot and ghost artwork are never used.", "Flat shapes, single weight, round ends.", "Muted tints for categories, ink for lines."])}`,
  `<div class="stage cream tall illus"><div class="blob a"></div><div class="blob b"></div><div class="blob c"></div>${mk(130)}<span class="sparkle">${ic("faStar", 26, C.ink)}</span></div>`
)}`);

add(5, "Photography Style", `
${two(
  `${lead("Real screens, not stock photos.")}
   <p>Naazhi shows the actual app, on a phone, on a clean paper ground. No stock people, no staged desks.</p>
   ${list(["Use screenshots of the real app only.", "Show them in an iPhone frame on paper or white ground.", "Keep one phone or a calm fan of three.", "If a photo is ever needed: natural light, warm, uncluttered, no filters."])}`,
  `<div class="phones">${phone("home", 170)}${phone("notes", 170)}${phone("todo", 170)}</div>`
)}`);

add(5, "Image Treatment", `
${two(
  `<div class="phones one">${phone("journal", 230)}</div>`,
  `${cards([
    { h: "Rounded corners", p: "Screens and cards use the radius scale: 12 px cards, phone-shaped screens." },
    { h: "Hairline border, not shadow", p: "A 1 px hairline border in line colour (#ebebeb). Flat surfaces with no elevation shadow." },
    { h: "Paper ground", p: "Place images on paper, white or neutral grounds. Never over busy textures." },
    { h: "No filters", p: "No duotone, blur or heavy colour grading. Show the product as it is." },
  ], 1)}`
)}`);

add(5, "Background Textures", `
<div class="grid4 tex">
<div class="tx t1"><small>Paper canvas</small></div><div class="tx t2"><small>Soft glow</small></div><div class="tx t3"><small>Flat card</small></div><div class="tx t4"><small>Ink panel</small></div>
</div>
<p>Texture is restrained: flat paper surfaces, clean white cards with hairline borders, and ink panels for dark elements. No blur, no glass, no gradients across the brand colours.</p>`);

add(5, "Visual Composition", `
${two(
  `<div class="comp"><div class="c-h">${lockup(18)}</div><div class="c-b"><p style="font-family:var(--sans);font-weight:600;font-size:40px;line-height:1.05;letter-spacing:-.03em;margin:0">One Geist headline,<br><span class="quiet">one idea.</span></p><p style="font-size:12px;color:${C.fgMuted};margin:10px 0 14px">One plain sentence that says what it is.</p>${btn("Get started")}</div><div class="c-p">${phone("home", 120)}</div></div>`,
  `${list([
    "<b>One idea per section</b>: a short headline, one plain sentence, the real app.",
    "<b>Generous space</b>: let the paper breathe. Margins of at least 16 px on a phone, 32 px on desktop.",
    "<b>One primary action</b> per view, as a rectangular dark button.",
    "<b>Align to a grid</b>: a 12-column web layout, a single column at 375 px.",
    "<b>Hierarchy by size and weight</b>, not by colour or decorative boxes.",
  ])}`
)}`);

/* 07 Communication */
add(6, "Brand Voice", `
${lead("Calm, plain and a little warm.")}
${cards([
  { h: "Short sentences", p: "Say what happened and what to do next." },
  { h: "Plain words", p: "No hype words: “revolutionary”, “supercharge”, “unlock”." },
  { h: "Human", p: "A person talking to a person. No corporate filler." },
  { h: "Honest", p: "Claims match the security docs. We never promise more." },
], 4)}
<table class="tbl"><thead><tr><th>Instead of</th><th>Write</th></tr></thead><tbody>
<tr><td>“Oops! Something went wrong!”</td><td>“Couldn’t save that. Try again.”</td></tr>
<tr><td>“Unlock the power of your workspace”</td><td>“Everything you keep, in one place.”</td></tr>
<tr><td>“Welcome to the future of productivity”</td><td>“Welcome to Naazhi.”</td></tr></tbody></table>`);

add(6, "Brand Tone", `
<table class="tbl"><thead><tr><th>Moment</th><th>Tone</th><th>Example</th></tr></thead><tbody>
<tr><td>Marketing</td><td>Confident, quiet</td><td>“Your AI can change. Your workspace shouldn’t.”</td></tr>
<tr><td>Onboarding</td><td>Warm, brief</td><td>“Welcome to Naazhi. Let’s set up your first note.”</td></tr>
<tr><td>Errors</td><td>Calm, helpful</td><td>“Couldn’t save that change. Try again.”</td></tr>
<tr><td>Destructive actions</td><td>Clear, serious</td><td>“Delete this event? This can’t be undone.”</td></tr>
<tr><td>Empty states</td><td>One quiet line</td><td>“No tasks yet. Add one to get started.”</td></tr>
<tr><td>Notifications</td><td>Plain sentence</td><td>“3 new articles in your Reader.”</td></tr></tbody></table>`);

add(6, "Writing Guidelines", dos(
  ["Use sentence case everywhere except proper names.", "Use curly apostrophes (’) and digits for numbers.", "Name features by what they do: Plan, Journal, Chat, Workspace.", "Say “AI” is a layer you can swap or switch off.", "Format dates the way the person reads them."],
  ["Use exclamation marks or emoji in product text.", "Write NAAZHI, naazhi or Nazhi in running text.", "Show raw error messages to people.", "Sell AI as the product, or promise more than SECURITY.md allows.", "Invent sub-brand names for features."]
));

add(6, "Brand Vocabulary", `
<div class="two"><div class="card ok"><h4>Words we use</h4><p class="tags">${["workspace", "keep", "write", "plan", "journal", "your", "swap", "bring your own", "switch off", "private", "calm", "simple", "export"].map((w) => `<span>${w}</span>`).join("")}</p></div>
<div class="card no"><h4>Words we avoid</h4><p class="tags">${["revolutionary", "supercharge", "unlock", "game-changing", "next-gen", "seamless", "leverage", "synergy", "10x", "magic"].map((w) => `<span>${w}</span>`).join("")}</p></div></div>
<table class="tbl sm"><tbody><tr><td>Name</td><td><b>Naazhi</b> (said NAA-zhee). Lower case only in addresses and file names: <code>naazhi.app</code>.</td></tr><tr><td>Tamil</td><td>நாழி, an old measure of grain and of time</td></tr><tr><td>Credit</td><td>“Backed by Setups Works.” in email footers and About. Not in the header.</td></tr></tbody></table>`);

add(6, "Tagline & Slogan", `
<div class="tl"><p class="serif huge">One workspace, <span class="quiet">any AI.</span></p><small>Tagline</small></div>
${two(
  `<div class="card"><h4>Supporting line</h4><div class="serif" style="font-size:28px;line-height:1.15;margin:6px 0">Your AI can change. Your workspace shouldn’t.</div></div>`,
  `<div class="card"><h4>One-liner</h4><p>Notes, to-dos, journal, chat, calendar and your Reader in one workspace, with an AI you can swap, bring your own, or switch off.</p></div>`
)}
<p class="note">Use the tagline under the logo <i>or</i> as a page-title suffix. Not both in the same place.</p>`);

add(6, "Messaging Framework", `
<div class="pyr">
<div class="l1"><small>Core message</small>One workspace, any AI.</div>
<div class="l2"><div><small>Pillar 1</small><b>One calm place</b>Notes, tasks, journal, chat, calendar and Reader together.</div><div><small>Pillar 2</small><b>AI on your terms</b>Swap it, bring your own key, or switch it off.</div><div><small>Pillar 3</small><b>Yours to keep</b>Private by design, exportable any time.</div></div>
<div class="l3"><small>Proof</small>Row-level security · private storage · encrypted API keys · export and delete in Settings · web and Android app</div>
</div>`);

add(6, "Social Media Writing Style", `
${two(
  `<div class="post"><div class="ph">${mk(34)}<div><b>Naazhi</b><small>@naazhi.app</small></div></div><p>Your notes, tasks and journal, in one place.</p><p>Switch the AI on, swap it, or turn it off. The workspace stays yours.</p><div class="pimg">${lockup(32)}</div></div>`,
  `${list([
    "Open with the point, in one short line.",
    "One idea per post. Two short paragraphs at most.",
    "No emoji strings, no all-caps, no exclamation marks.",
    "Show the real app. Screenshots over stock.",
    "Hashtags: at most two, plain (#notes, #journal).",
    "Reply like a person: “Thanks. Fixed in 4.1.”",
  ])}`
)}`);

add(6, "Communication Do's & Don'ts", dos(
  ["Say what happened and what to do next.", "Match every privacy claim to docs/SECURITY.md.", "Show real screens.", "Credit Setups Works in footers and About only."],
  ["Hype, emoji or exclamation marks.", "Promise AI features that aren’t built.", "Use the old working title anywhere users can see it.", "Quote customers without permission."]
));

/* 08 Applications */
const bcard = (dark) => `<div class="bc ${dark ? "dk" : ""}">${dark ? `<div class="bk">${mk(70, true)}</div>` : `<div class="fr"><div>${lockup(20)}</div><div class="det"><b>Priya Raman</b><span>Product designer</span><span>priya@naazhi.app</span><span>naazhi.app</span></div></div>`}</div>`;
add(7, "Business Cards", `
<div class="row cen">${bcard(false)}${bcard(true)}</div>
<table class="tbl sm"><tbody><tr><td>Size</td><td>85 × 55 mm, 3 mm bleed</td></tr><tr><td>Stock</td><td>Uncoated white or off-white paper, 350 gsm</td></tr><tr><td>Front</td><td>Lockup top left, name in Geist 600, details in Geist 400</td></tr><tr><td>Back</td><td>Cream mark centred on the dark fill</td></tr></tbody></table>`);

add(7, "Letterhead", `
${two(
  `<div class="paper"><div class="ph2">${lockup(14)}<span>naazhi.app</span></div><div class="lines"><i></i><i></i><i></i><i class="s"></i><i></i><i></i><i class="s"></i></div><div class="pf">Backed by Setups Works · info@setups.works</div></div>`,
  `${list(["A4, white or off-white (#f7f7f7) stock.", "Lockup top left at 14–16 mm, web address top right.", "Body in Geist 10.5 pt, line height 1.5.", "Footer in 8 pt muted ink, with the Setups Works credit.", "Margins: 20 mm."])}`
)}`);

add(7, "Email Signature", `
${two(
  `<div class="sig"><p style="margin:0 0 14px">Thanks,</p><div class="sg">${mk(46)}<div><b>Priya Raman</b><span>Product designer · Naazhi</span><span>priya@naazhi.app · naazhi.app</span></div></div></div>`,
  `${list(["Mark 46 px high, then name (semi-bold) and role.", "Plain text links in ink with underline.", "No taglines, quotes or banners.", "Email headers carry the lockup at 28 px.", "Footer: “You received this because someone used this address on Naazhi.”"])}`
)}`);

add(7, "Company Profile", `
<div class="row cen prof">
<div class="doc cv"><div>${lockup(18)}</div><p class="serif">Company<br>profile</p><small>2026</small></div>
<div class="doc pg"><small>About</small><p class="serif">One workspace for one person’s days.</p><i></i><i></i><i class="s"></i></div>
<div class="doc pg"><small>Product</small><div class="mini">${phone("home", 70)}${phone("todo", 70)}</div></div>
<div class="doc dk2"><div>${mk(60, true)}</div><small>Backed by Setups Works</small></div>
</div>
<p class="note">Landscape A4 or 16:9, white or off-white pages, one idea per page, real screenshots, the ink panel for the closing page.</p>`);

add(7, "Presentation Templates", `
<div class="slides">
<div class="sl"><div class="sl-a">${lockup(14)}<p class="serif" style="font-size:30px;margin:30px 0 0;line-height:1.05;letter-spacing:-.03em">Title slide,<br><span class="quiet">one idea.</span></p></div></div>
<div class="sl"><span class="eyebrow" style="font-size:8px">Section</span><p class="serif" style="font-size:20px;margin:6px 0 10px">Three short points</p><div class="mini3"><i></i><i></i><i></i></div></div>
<div class="sl"><div class="split"><div><p class="serif" style="font-size:18px;margin:0 0 6px">Screens</p><i class="s"></i><i class="s"></i></div>${phone("notes", 70)}</div></div>
<div class="sl dkp">${mk(54, true)}<p class="serif" style="font-size:20px;margin:10px 0 0;color:${C.onDark}">Thank you</p></div>
</div>
${list(["16:9. White or off-white background, ink text. Titles and content in Geist.", "Titles and body in Geist, wordmark in Instrument Serif.", "Real screenshots only, in phone frames.", "A dark closing slide with the cream mark."], "cols")}`);

add(7, "Social Media Templates", `
<div class="row cen soc">
<div class="sq cream"><span class="eyebrow">Tip</span><p class="serif">Write it down, then let it go.</p>${lockup(14)}</div>
<div class="sq dark">${mk(120, true)}<p class="serif" style="color:${C.onDark}">One workspace,<br><span class="quiet2">any AI.</span></p></div>
<div class="sq tinted"><div class="ph3">${phone("journal", 90)}</div><p class="serif">Your journal, private.</p></div>
<div class="sq story"><p class="serif">What’s new in 4.2</p><div class="chips">${tint("Terms", 0)}${tint("Refunds", 3)}${tint("Contact", 1)}</div>${lockup(14)}</div>
</div>
<p class="note">Square 1080 × 1080 and story 1080 × 1920. White, paper and dark grounds. Tight Geist headline, brand lockup. Avatar: <b>naazhi-app-icon-1024.png</b>.</p>`);

add(7, "Marketing Materials", `
<div class="row cen mm">
<div class="ban"><div><p class="serif" style="font-size:28px;margin:0;line-height:1.05;letter-spacing:-.03em">Your AI can change.<br><span class="quiet">Your workspace shouldn’t.</span></p><div style="margin-top:12px">${btn("Get Naazhi")}</div></div>${phone("home", 110)}</div>
<div class="ban dk3"><div><p class="serif" style="font-size:24px;margin:0;color:${C.onDark}">Everything you keep,<br>in one place.</p></div>${mk(80, true)}</div>
</div>
${list(["Web banners: 1200 × 628 (link preview) and 300 × 250.", "One headline, one button, one phone.", "Always on white, paper or the dark fill.", "Store listings: app icon 1024, screenshots in a phone frame."], "cols")}`);

add(7, "Posters & Flyers", `
<div class="row cen">
<div class="poster"><div>${lockup(16)}</div><p class="serif">Your days,<br>in one<br><span class="quiet">calm place.</span></p>${phone("home", 120)}<div class="pb"><b>naazhi.app</b><small>Backed by Setups Works</small></div></div>
<div class="poster dkp2"><p class="serif" style="color:${C.onDark}">One workspace,<br>any AI.</p>${mk(110, true)}<div class="pb" style="color:${C.onDark}"><b>Get the app</b><small>Android · Web</small></div></div>
<div class="flyer"><div class="fh">${lockup(14)}</div><p class="serif">Notes. Tasks.<br>Journal. Chat.</p><i></i><i></i><i class="s"></i><div class="pb"><b>naazhi.app</b></div></div>
</div>
<p class="note">A3/A4 posters and A5 flyers. A 20 mm margin, one headline, one phone, one web address.</p>`);

add(7, "Brochures", `
<div class="tri">
<div class="pn"><small>Inside left</small><p class="serif">Write</p><i></i><i class="s"></i></div>
<div class="pn"><small>Inside centre</small><p class="serif">Plan</p><i></i><i class="s"></i></div>
<div class="pn"><small>Inside right</small><p class="serif">Reflect</p><i></i><i class="s"></i></div>
</div><div class="tri">
<div class="pn"><small>Back</small><p style="font-size:11px">Backed by Setups Works<br>info@setups.works</p></div>
<div class="pn dkp3">${mk(70, true)}</div>
<div class="pn pcover"><div>${lockup(14)}</div><p class="serif">One workspace,<br><span class="quiet">any AI.</span></p></div>
</div>
<p class="note">Tri-fold A4 landscape (99 + 99 + 99 mm). Cover with the lockup, three inside panels, a back panel with contact details.</p>`);

add(7, "ID Cards", `
<div class="row cen">
<div class="idc"><div class="idh">${lockup(14, { cream: true })}</div><div class="idb"><div class="ph4">${ic("faUser", 54, C.ink)}</div><div><b>Priya Raman</b><span>Product designer</span><span>ID · NZ-0042</span></div></div><div class="idf"></div></div>
<div class="idc back"><div class="qr">${Array.from({ length: 49 }, (_, i) => `<i style="opacity:${[1, 0, 1, 1, 0, 1, 0][(i * 3 + (i % 7)) % 7]}"></i>`).join("")}</div><small>If found, please email<br>info@setups.works</small></div>
</div>
<table class="tbl sm"><tbody><tr><td>Size</td><td>CR80, 85.6 × 54 mm, portrait or landscape</td></tr><tr><td>Header</td><td>Dark fill with the cream lockup</td></tr><tr><td>Details</td><td>Name in Geist 600, role in 400, photo on a neutral background</td></tr></tbody></table>`);

add(7, "Merchandise", `
<div class="row cen merch">
<div class="tote"><div class="handles"></div><div class="bag">${mk(80, false)}<span class="wm" style="font-size:20px">Naazhi</span></div><small>Paper tote</small></div>
<div class="mug"><div class="cup">${mk(50, true)}</div><i class="hd"></i><small>Dark mug</small></div>
<div class="tee"><div class="shirt">${mk(60, true)}</div><small>Dark tee</small></div>
<div class="note-bk"><div class="nb">${lockup(16)}<i></i><i></i><i class="s"></i></div><small>Notebook</small></div>
</div>
<p class="note">Colours: paper, ink and Naazhi green. The mark alone, or the lockup. One colour print where possible. No slogans on merchandise.</p>`);

/* 09 Digital */
add(8, "Website Branding", `
<div class="browser"><div class="bar"><i></i><i></i><i></i><span>naazhi.app</span></div>
<div class="site"><div class="nav">${lockup(16)}<span class="links">How it works · Pricing · Download</span>${btn("Open app", "primary sm")}</div>
<div class="hero"><span class="glow"></span><span class="eyebrow">Naazhi</span><p class="serif">Everything you keep, <span class="quiet">in one place.</span></p><p class="sub">Notes, tasks, journal and chat in one workspace, with an AI you can swap or switch off.</p><div>${btn("Get started")} ${btn("Get the Android app", "secondary")}</div></div></div></div>
${list(["Two hosts: <b>naazhi.app</b> (website) and <b>dashboard.naazhi.app</b> (app and admin).", "White canvas, ink text, hairline borders, an ink panel for closing calls to action.", "Titles end in “— Naazhi”."], "cols")}`);

add(8, "Website UI Guidelines", `
<div class="two">
${cards([
  { h: "Layout", p: "Max width 1120 px (940 px for list pages). Mobile first: every screen works at 375 px with no horizontal scroll." },
  { h: "Surfaces", p: "Flat paper with a 1 px hairline border. Radii 4 / 6 / 8 / 12 / 16 px. Minimal shadows for floating layers only." },
  { h: "Motion", p: "140–240 ms, ease cubic-bezier(0.2, 0.7, 0.2, 1). Respect reduced motion and the in-app setting." },
], 1)}
${cards([
  { h: "Accessibility", p: "Real buttons and links, labels, visible 2 px focus ring, keyboard for everything." },
  { h: "Dialogs and pickers", p: "Use Modal, Menu, useConfirm(), usePrompt() and the site’s own calendar. Never native alert, confirm or date inputs." },
  { h: "Tokens only", p: "No raw hex that has a token. Enforced by <code>pnpm check:design</code> in CI." },
], 1)}
</div>`);

add(8, "Button & Component Styling", `
<div class="comps">
<div class="cg"><small>Buttons</small><div>${btn("Save")} ${btn("Cancel", "secondary")} <span class="ib">${ic("faPlus", 14)}</span></div></div>
<div class="cg"><small>Toggle and tints</small><div>${tint("Work", 0)} ${tint("Home", 3)} ${tint("Study", 4)} <span class="tg">Filter</span></div></div>
<div class="cg"><small>Segmented control</small><div class="seg"><span class="on">Day</span><span>Week</span><span>Month</span></div></div>
<div class="cg"><small>Input</small><div class="inp">Add a task…</div></div>
<div class="cg w2"><small>Card</small><div class="gcard"><b>Plan the week</b><span>Due tomorrow</span>${tint("Work", 0)}</div></div>
</div>
${list(["<b>Primary</b>: dark rectangular button (8 px corners), 40 px, one per view.", "<b>Secondary</b>: flat white button with hairline border.", "<b>Icon button</b>: 36 px with 6 px corners and aria-label.", "Pressed state scales to 96 % with ease transition.", "Destructive actions confirm first, with danger styling."], "cols")}`);

add(8, "App Icon", `
<div class="row cen">
<div class="ai"><img src="${L("naazhi-app-icon-1024.png")}" style="width:200px;border-radius:44px;box-shadow:0 8px 24px #00000014" alt=""><small>iOS · 1024 square (OS rounds the corners)</small></div>
<div class="ai"><div class="ad" style="background:#f9f4e5"><img src="${L("android-icon-foreground.png")}" style="width:200px" alt=""></div><small>Android adaptive · mark inside the 66 % safe zone</small></div>
<div class="ai"><div class="ad" style="background:${C.logoGreen};border-radius:50%"><img src="${L("android-icon-monochrome.png")}" style="width:200px;border-radius:50%" alt=""></div><small>Android themed (one colour)</small></div>
</div>
<p class="note">Mark fills about 66 % of the square, centred, on cream. Package / bundle id <code>com.setupsworks.naazhi</code>. Generate from the master with <code>scripts/brand/build-assets.mjs</code>.</p>`);

add(8, "Mobile Application Branding", `
<div class="phones wide">${phone("home", 180)}${phone("todo", 180)}${phone("notes", 180)}${phone("chat", 180)}</div>
${list(["<b>Launch</b>: paper ground, the mark is drawn in about two seconds, then Naazhi appears. With Reduce motion on, the finished mark is shown still.", "<b>Top bar</b>: lockup at 28 px.", "<b>Home-screen widgets</b>: Today’s tasks, Quick write, Health, Journal."], "cols")}`);

add(8, "Social Media Profile Branding", `
<div class="row cen prof2">
<div class="pf2"><div class="cv2"></div><div class="av2"><img src="${L("naazhi-app-icon-1024.png")}" alt=""></div><b>Naazhi</b><small>@naazhi.app</small><p>One workspace, any AI. Notes, tasks, journal and chat.</p></div>
<div>${cards([
  { h: "Avatar", p: "naazhi-app-icon-1024.png (the mark on cream)." },
  { h: "Cover", p: "Paper ground with the lockup left, Geist headline, one phone right." },
  { h: "Bio", p: "“One workspace, any AI.” + one plain line + the link." },
  { h: "Handle", p: "naazhi.app (lower case is for handles and addresses)." },
], 2)}</div>
</div>`);

add(8, "Digital Advertisement Guidelines", `
<div class="row cen ads">
<div class="ad1"><p class="serif">Your days in one calm place.</p>${btn("Get started")}</div>
<div class="ad2">${phone("home", 80)}<div><p class="serif">One workspace,<br>any AI.</p>${btn("Download", "primary sm")}</div></div>
<div class="ad3">${mk(60, true)}<p class="serif">Naazhi</p></div>
</div>
${dos(["One headline, one button, one phone or the mark.", "White, paper or dark fill grounds.", "Claim only what is built and documented."], ["Stock photos, gradients, emoji, countdown urgency.", "Fake reviews or numbers.", "Recolour or animate the mark."])}`);

add(8, "Email Newsletter Design", `
${two(
  `<div class="mail"><div class="mh">${lockup(16)}</div><div class="mb"><span class="eyebrow">What’s new</span><p class="serif">Terms, refunds and contact pages</p><p class="t">Version 4.2 adds the pages you’ve asked for. Everything else works as before.</p>${btn("Read the changelog")}<div class="mi">${tint("Web", 1)} ${tint("New", 0)}</div></div><div class="mf">You received this because someone used this address on Naazhi.<br>Backed by Setups Works</div></div>`,
  `${list(["600 px wide, off-white background, white content card with hairline border.", "Header: lockup at 28 px.", "One Geist title, one short paragraph, one dark rectangular button.", "Footer: “You received this because someone used this address on Naazhi.” and the Setups Works credit.", "Sender name: <b>Naazhi &lt;…&gt;</b>. Plain-sentence subject lines, no emoji."])}`
)}`);

/* 10 Governance */
add(9, "Logo Usage Rules", dos(
  ["Use the supplied files, scaled proportionally.", "Keep the clear space of ½ the mark’s width.", "Keep the mark at 16 px or more (24 px in a lockup).", "Use <code>BrandMark</code> in code, never your own &lt;img&gt;.", "Keep one logo per screen region."],
  ["Recolour, outline, add shadow or glow.", "Stretch, rotate, crop or redraw it.", "Place it on busy photos or low-contrast grounds.", "Animate the strokes apart (only the launch animation is allowed).", "Repeat the logo in a hero that already has it in the top bar."]
));

add(9, "Brand Asset Management", `
${cards([
  { icon: "faCodeBranch", h: "One source", p: "Everything is generated from one master picture: <code>brand/source/naazhi-logo.jpg</code>." },
  { icon: "faTerminal", h: "One script", p: "<code>node scripts/brand/build-assets.mjs</code> writes every PNG. Never edit them by hand." },
  { icon: "faFolderTree", h: "Known places", p: "Web: <code>apps/web/public/brand</code>. App: <code>apps/mobile/assets/images</code>. Print: <code>brand/exports</code>." },
  { icon: "faClockRotateLeft", h: "Versioned in git", p: "Changes go through a pull request. This book is rebuilt from the repository." },
], 2)}`);

add(9, "Third-Party Brand Usage", `
${lead("Other people’s names and logos appear only where they help someone.")}
${list([
  "Show a partner’s or service’s logo (Google, Groq, Apple, Android) only to say a feature works with it, in their own approved form.",
  "Don’t imply endorsement, partnership or certification we don’t have.",
  "Store badges (Google Play, App Store) follow the platform owners’ rules. The App Store badge is shown as “coming soon” until the app is live.",
  "Keep the Setups Works credit as it is: “Backed by Setups Works.”, in footers and About, not in the header.",
  "Third parties who want to use the Naazhi name or logo need written approval (see Brand Approval Process).",
])}`);

add(9, "Co-Branding Guidelines", `
<div class="row cen co"><div class="cob">${lockup(40)}<i class="div"></i><span class="partner">Partner</span></div></div>
${list([
  "Place Naazhi and the partner side by side, separated by a thin vertical hairline.",
  "Both logos at equal optical weight; the clear space of each is respected.",
  "Naazhi’s lockup stays in its own colours on paper, white or dark. The partner keeps theirs.",
  "Never merge, blend, overlap or restyle the two logos.",
  "Co-branded copy follows the Naazhi voice and is approved by both sides.",
])}`);

add(9, "Brand Consistency Rules", `
${cards([
  { icon: "faPalette", h: "Tokens, never raw values", p: "Colours, radii, shadows and fonts come from tokens. A new value is added once, then reused." },
  { icon: "faRobot", h: "Enforced by tooling", p: "<code>pnpm check:design</code> runs on every edit, in the pre-commit hook and in CI." },
  { icon: "faMobileScreen", h: "Same at 375 px", p: "Compare any new screen with /dashboard/todo at desktop and phone width." },
  { icon: "faPenNib", h: "Same voice", p: "Sentence case, curly apostrophes, no exclamation marks or emoji." },
], 2)}`);

add(9, "Brand Approval Process", `
<div class="flow">${[["Draft", "Make it from this guide and the supplied files."], ["Self-check", "Run the checklist: logo, colours, type, voice, 375 px."], ["Review", "A second person reviews it (pull request for code)."], ["Approve", "The brand owner signs off new uses and co-branding."], ["Publish", "Ship, and add reusable assets to the repository."]].map(([t, d], i) => `<div><span>${i + 1}</span><b>${t}</b><p>${d}</p></div>`).join("")}</div>
<p class="note">Contact the brand owner at info@setups.works for approvals and questions.</p>`);

add(9, "Brand Asset Download Links", `
<div class="dls">
<h4>Logo</h4>
${dl("logo/naazhi-mark-3000.png", "Mark · green, transparent")}${dl("logo/naazhi-mark-cream-3000.png", "Mark · cream, transparent")}${dl("logo/naazhi-mark-on-cream-3000.png", "Mark on cream")}${dl("logo/naazhi-app-icon-1024.png", "App icon 1024")}${dl("logo/naazhi-logo-master.jpg", "Master artwork")}
<h4>Mobile icons</h4>
${dl("logo/android-icon-foreground.png", "Android foreground")}${dl("logo/android-icon-monochrome.png", "Android themed")}${dl("logo/splash-icon.png", "Splash mark")}
<h4>Fonts (OFL)</h4>
${dl("fonts/InstrumentSerif-Regular.ttf", "Instrument Serif")}${dl("fonts/Geist-Regular.ttf", "Geist")}
<h4>Screens</h4>
${dl("app/home.png", "Home")}${dl("app/todo.png", "To-do")}${dl("app/notes.png", "Notes")}${dl("app/journal.png", "Journal")}${dl("app/chat.png", "Chat")}
</div>
<p class="note">Links work in the HTML book. In the repository: <code>brand/exports</code>, <code>apps/web/public/brand</code>, <code>apps/mobile/assets/images</code>. Alternate Tamil-script logo concepts are in <code>assets/concepts</code> and are not part of the approved identity.</p>`);

/* 11 Final */
add(10, "Brand Guidelines Summary", `
${lead("Calm, small, honest. Paper, ink, Geist.")}
<div class="sum">
<div><span>${mk(40)}</span><b>Logo</b><p>Lockup, mark on the left, ½-mark clear space, 16 px minimum.</p></div>
<div><span style="background:${C.ink};color:#fff;display:flex;align-items:center;justify-content:center;border-radius:8px"></span><b>Colour</b><p>Paper canvas, ink text, hairline borders, muted tints for categories.</p></div>
<div><span style="font-size:24px;font-weight:600">Aa</span><b>Type</b><p>Geist for all typography, Instrument Serif for the wordmark only.</p></div>
<div><span>${ic("faStar", 26, C.ink)}</span><b>Visuals</b><p>Real screens, flat hairline cards, crisp corners, Lucide/Font Awesome line icons.</p></div>
<div><span>${ic("faFeatherPointed", 26, C.ink)}</span><b>Voice</b><p>Short, plain, warm. Sentence case. No hype.</p></div>
<div><span>${ic("faShieldHalved", 26, C.ink)}</span><b>Promise</b><p>Your AI can change. Your workspace shouldn’t.</p></div>
</div>`);

add(10, "Contact Information", `
<div class="contact">
<div><p class="serif huge">Questions about <span class="quiet">the brand?</span></p>
<p>Write to us for approvals, assets or co-branding.</p></div>
<div class="card big cinfo">
<p>${ic("faEnvelope", 18)} <a href="mailto:info@setups.works">info@setups.works</a></p>
<p>${ic("faPhone", 18)} +91 6383984698</p>
<p>${ic("faGlobe", 18)} naazhi.app</p>
<p>${ic("faLocationDot", 18)} Setups Works, 1009G, Govintha Reddy Street, Elavur, Gummidipoondi, Tamil Nadu 601201, India</p>
</div></div>
<div class="endmark">${lockup(30)}<small>Backed by Setups Works</small></div>`);

/* ───────── assemble ───────── */
const pad = (n) => String(n).padStart(3, "0");
let tocHtml = "";
{
  const groups = SECTIONS.map((name, si) => ({ name, items: P.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => p.s === si) }));
  tocHtml = `<div class="toc"><div class="tc-h">${lockup(26)}<h2>Contents</h2></div><div class="tc-g">${groups
    .map((g, i) => `<div class="tc-s"><h5><b>${String(i + 1).padStart(2, "0")}</b> ${g.name}</h5>${g.items.map((it) => `<a href="#p${it.n}"><span>${it.t}</span><i>${it.n}</i></a>`).join("")}</div>`)
    .join("")}</div></div>`;
}
const pagesHtml = P.map((p, i) => {
  const n = i + 1;
  const inner = p.html === "__TOC__" ? tocHtml : p.html;
  if (p.raw) return `<section class="page raw" id="p${n}">${inner}</section>`;
  return `<section class="page" id="p${n}">
  <header><span>${String(p.s + 1).padStart(2, "0")} · ${SECTIONS[p.s]}</span><span>Naazhi Brand Guidelines</span></header>
  <div class="pg"><div class="head"><span class="num">${pad(n)}</span><h2>${p.t}</h2></div><div class="content">${inner}</div></div>
  <footer><span>${pad(n)} / 090</span>${mk(22)}</footer></section>`;
}).join("\n");

const css = fs.readFileSync(path.join(here, "book.css"), "utf8");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brand guidelines — Naazhi</title><meta name="description" content="The Naazhi brand guidelines: logo, colour, typography, voice, applications and governance.">
<style>${css}</style></head><body><main id="book">${pagesHtml}</main>
<script>
(function(){var b=document.getElementById('book');function fit(){if(/print=1/.test(location.search)){b.style.setProperty('--s',1);return;}var s=Math.min(1,(window.innerWidth-24)/1280);b.style.setProperty('--s',s);}fit();addEventListener('resize',fit);})();
</script></body></html>`;
fs.writeFileSync(path.join(here, "index.html"), html);
console.log(`index.html written · ${P.length} pages`);

/* ───────── PDF ───────── */
if (process.argv.includes("--no-pdf")) process.exit(0);
const { chromium } = require("../../apps/web/node_modules/@playwright/test");
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chromePath) ? { executablePath: chromePath } : {}), args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(path.join(here, "index.html")).href + "?print=1");
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(here, "Naazhi-Brand-Guidelines.pdf"), width: "1280px", height: "720px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  if (process.argv.includes("--shots")) {
    fs.mkdirSync(path.join(here, "pages"), { recursive: true });
    const n = P.length;
    for (let i = 1; i <= n; i++) {
      const el = await page.$(`#p${i}`);
      await el.screenshot({ path: path.join(here, "pages", `page-${pad(i)}.png`) });
    }
  }
  console.log("PDF written");
} finally {
  await browser.close();
}
