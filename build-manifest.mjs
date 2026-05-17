#!/usr/bin/env node
// One-shot manifest generator. Walks ./books, groups by series.
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SERIES = {
  'Hayom_Yom':                { en: 'Hayom Yom',                       he: 'היום יום',                          order: 1, single: true },
  'Igros_Kodesh':             { en: 'Igros Kodesh',                    he: 'אגרות קודש',                        order: 2 },
  'Likkutei_Sichos':          { en: 'Likkutei Sichos',                 he: 'לקוטי שיחות',                       order: 3 },
  'Maamarim_Melukatim':       { en: 'Maamarim Melukatim',              he: 'מאמרים מלוקטים',                    order: 4 },
  'Toras_Menachem':           { en: 'Toras Menachem',                  he: 'תורת מנחם',                         order: 5 },
  'Reshimos':                 { en: 'Reshimos',                        he: 'רשימות',                            order: 6, single: true },
  'Inyana_shel_Toras_HaChassidus': { en: 'Inyana shel Toras HaChassidus', he: 'ענינה של תורת החסידות',          order: 7, single: true },
  'Likkutei_Taamim_UMinhagim_-_Haggadah': { en: 'Haggadah – Likkutei Taamim UMinhagim',         he: 'הגדה - לקוטי טעמים ומנהגים',           order: 8, single: true },
  'Likkutei_Taamim_UMinhagim_-_Haggadah_with_Divrei_Shalom': { en: 'Haggadah with Divrei Shalom', he: 'הגדה עם דברי שלום',                 order: 9, single: true },
};

const files = readdirSync('./books').filter(f => f.endsWith('.md'));
const books = new Map(); // id -> { id, series, vol, title_en, title_he, file_bilingual, file_english, size }

for (const f of files) {
  const m = f.match(/^(.+?)(?:_Vol_(\d+))?_(Bilingual|English)\.md$/);
  if (!m) continue;
  const [, prefix, vol, kind] = m;
  if (!SERIES[prefix]) { console.warn('unknown series prefix:', prefix); continue; }
  const id = vol ? `${prefix}_Vol_${vol}` : prefix;
  if (!books.has(id)) {
    const s = SERIES[prefix];
    books.set(id, {
      id,
      series_key: prefix,
      series_en: s.en,
      series_he: s.he,
      series_order: s.order,
      vol: vol ? parseInt(vol, 10) : null,
      title_en: vol ? `${s.en} — Vol. ${parseInt(vol,10)}` : s.en,
      title_he: vol ? `${s.he} — כרך ${parseInt(vol,10)}` : s.he,
    });
  }
  const b = books.get(id);
  if (kind === 'Bilingual') b.file_bilingual = `books/${f}`;
  else b.file_english = `books/${f}`;
  const sz = statSync(`./books/${f}`).size;
  b.size = (b.size || 0) + sz;
}

const list = [...books.values()].sort((a, b) =>
  a.series_order - b.series_order || (a.vol ?? 0) - (b.vol ?? 0)
);

writeFileSync('./assets/manifest.json', JSON.stringify({
  generated: new Date().toISOString(),
  count: list.length,
  books: list,
}, null, 2));

console.log(`wrote ${list.length} books to assets/manifest.json`);
