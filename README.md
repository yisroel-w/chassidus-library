# Chassidus Library

A bilingual (Hebrew / English) reader for translations of the works of the Lubavitcher Rebbe — hosted as a static GitHub Pages site.

**Live site:** https://yisroel-w.github.io/chassidus-library/

## Contents

- Hayom Yom
- Igros Kodesh — Volumes 1–29
- Likkutei Sichos — Volumes 30–39
- Maamarim Melukatim — Volumes 1–4
- Toras Menachem — Volumes 1–9, 15
- Reshimos
- Inyana shel Toras HaChassidus
- Likkutei Taamim UMinhagim — Haggadah (with Divrei Shalom)

## Features

- Bilingual paired reading (Hebrew ↔ English) with toggle for Hebrew-only / English-only / both
- Dark mode and three text sizes
- Per-book full-text search
- Bookmarks
- "Continue reading" shelf (last-read position remembered per book)
- Glassmorphic design, mobile-first

## Local development

```
python3 -m http.server 8765
# open http://localhost:8765/
```

To regenerate `assets/manifest.json` after adding/removing books in `books/`:

```
node build-manifest.mjs
```

## Structure

```
index.html          # library home
reader.html         # book reader
assets/
  design.css        # all styles
  home.js           # library home logic
  reader.js         # reader + MD parser
  manifest.json     # generated book index
books/              # bilingual + english markdown
.nojekyll           # disable Jekyll on Pages
```
