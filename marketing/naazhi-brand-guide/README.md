# Naazhi brand guidelines book

A 90-page brand book (16:9 pages) in two formats, built from the repository's own brand sources.

| File | What it is |
| --- | --- |
| `Naazhi-Brand-Guidelines.pdf` | The print / share version, one page per item (90 pages) |
| `index.html` | The same book as a web page, with a clickable contents page and download links |
| `assets/logo` | Mark (green, cream, on cream), app icon, Android icons, splash mark, master artwork |
| `assets/fonts` | Instrument Serif and Geist (SIL Open Font License) |
| `assets/app` | Real app screenshots used in the book |
| `assets/concepts` | Alternate Tamil-script logo concepts (not part of the approved identity) |
| `build.mjs`, `book.css` | The generator and its styles |

## Rebuild

```bash
node marketing/naazhi-brand-guide/build.mjs            # index.html + PDF (needs Google Chrome, or set CHROME_PATH)
node marketing/naazhi-brand-guide/build.mjs --no-pdf   # HTML only
```

## Sources of truth

Facts come from `docs/BRAND.md` (name, mark, voice, clear space), `docs/DESIGN_LANGUAGE.md` and the tokens in `apps/web/src/app/globals.css`.
HEX, RGB, HSL, CMYK and contrast ratios are computed from the hex values by `build.mjs`. CMYK is a straight conversion: proof before printing.

**Drafts to review:** the strategy pages (vision, mission, audience, personas, positioning, archetype) and the application mock-ups
(business cards, ID cards, merchandise, brochures) are written from the product docs and are not research findings or approved artwork.
