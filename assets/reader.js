/* Chassidus Library — reader */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const bookId = params.get('book');
  if (!bookId) { location.href = './'; return; }

  // ─── settings: dark, font-size, mode ───
  const root = document.documentElement;
  const PREFS = {
    dark: localStorage.getItem('cl:dark') === '1',
    fs: localStorage.getItem('cl:fs') || 'md',
    mode: localStorage.getItem('cl:mode') || 'both',  // he | en | both
  };
  root.dataset.dark = PREFS.dark ? '1' : '0';
  root.dataset.fs = PREFS.fs;

  // ─── load manifest + find book ───
  let manifest, book;

  // ─── markdown parser ───
  // Bilingual format: repeating "**Hebrew:**\n<HE>\n\n**English:**\n<EN>\n\n---\n"
  // Headings (# / ## / ###) become chapter sections.
  // Lines like "<h2>...</h2>" inside headings are stripped of inline tags but level taken from ##.
  function parseBilingual(md) {
    const blocks = md.split(/\n---\n/);
    const sections = [];   // {level, he, en}  level=0 means content pair
    for (const raw of blocks) {
      const b = raw.trim();
      if (!b) continue;
      // Split into Hebrew / English halves
      const heM = b.match(/\*\*Hebrew:\*\*\s*\n([\s\S]*?)(?=\n\*\*English:\*\*|$)/);
      const enM = b.match(/\*\*English:\*\*\s*\n([\s\S]*)$/);
      let he = heM ? heM[1].trim() : '';
      let en = enM ? enM[1].trim() : '';
      // Detect heading on either side
      const heHead = he.match(/^(#{1,6})\s+(.*)$/m);
      const enHead = en.match(/^(#{1,6})\s+(.*)$/m);
      if ((heHead || enHead) && stripInline(he).split('\n').length <= 3 && stripInline(en).split('\n').length <= 3) {
        const level = (heHead?.[1].length || enHead?.[1].length || 2);
        const heT = heHead ? cleanHeading(heHead[2]) : cleanHeading(he);
        const enT = enHead ? cleanHeading(enHead[2]) : cleanHeading(en);
        sections.push({ level, he: heT, en: enT });
      } else {
        sections.push({ level: 0, he, en });
      }
    }
    return sections;
  }

  function cleanHeading(s) {
    return s.replace(/<\/?h\d>/gi, '').replace(/\*+/g, '').replace(/^#+\s*/, '').trim();
  }
  function stripInline(s) {
    return s.replace(/<\/?h\d>/gi, '').replace(/^#+\s*/gm, '');
  }

  // basic inline markdown (bold, italic, links, footnotes refs)
  function mdInline(s) {
    s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    s = s.replace(/\[\^(\d+)\]/g, '<sup class="fn-ref">$1</sup>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
  function mdBlock(s) {
    return s.split(/\n{2,}/).map(p => `<p>${mdInline(p).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function render(sections) {
    const root = document.createElement('div');
    let pairIdx = 0;
    for (const sec of sections) {
      if (sec.level > 0) {
        const h = document.createElement('div');
        h.className = `ch-head h${sec.level}`;
        h.innerHTML = `<div class="ch-he-lbl">${mdInline(sec.he)}</div>${sec.en ? `<div class="ch-en-lbl">${mdInline(sec.en)}</div>` : ''}`;
        root.appendChild(h);
      } else {
        const p = document.createElement('div');
        p.className = 'pair';
        p.dataset.idx = pairIdx;
        p.innerHTML =
          `<div class="he-p">${mdBlock(sec.he)}</div>` +
          `<div class="psep"></div>` +
          `<div class="en-p">${mdBlock(sec.en)}</div>` +
          `<button class="bm-btn" aria-label="Bookmark" data-bm><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>`;
        root.appendChild(p);
        pairIdx++;
      }
    }
    return root;
  }

  // ─── bookmarks ───
  const bmKey = `cl:bm:${bookId}`;
  let bookmarks = new Set(JSON.parse(localStorage.getItem(bmKey) || '[]'));
  function toggleBm(idx) {
    if (bookmarks.has(idx)) bookmarks.delete(idx); else bookmarks.add(idx);
    localStorage.setItem(bmKey, JSON.stringify([...bookmarks]));
  }

  // ─── continue reading ───
  const lastKey = `cl:last:${bookId}`;
  function saveLast(idx, total) {
    localStorage.setItem(lastKey, JSON.stringify({ pairIdx: idx, total, ts: Date.now() }));
  }
  function pushRecent() {
    let r = JSON.parse(localStorage.getItem('cl:recent') || '[]');
    r = [bookId, ...r.filter(x => x !== bookId)].slice(0, 8);
    localStorage.setItem('cl:recent', JSON.stringify(r));
  }

  // ─── load ───
  async function load() {
    const m = await fetch('./assets/manifest.json').then(r => r.json());
    manifest = m;
    book = m.books.find(b => b.id === bookId);
    if (!book) { $('#content').innerHTML = '<div class="empty">Book not found.</div>'; return; }
    $('#abtitle').textContent = book.title_en;
    document.title = `${book.title_en} — Chassidus Library`;
    pushRecent();

    const url = `./${book.file_bilingual}`;
    let md;
    try {
      md = await fetch(url).then(r => { if (!r.ok) throw new Error(); return r.text(); });
    } catch {
      $('#content').innerHTML = '<div class="empty">Could not load this book.</div>';
      return;
    }
    const sections = parseBilingual(md);
    const dom = render(sections);
    const content = $('#content');
    content.innerHTML = '';
    content.appendChild(dom);
    applyMode();
    paintBookmarks();
    wirePairs(sections);
    setupScrollTracking(sections);
    buildSearchIndex(sections);
    restoreLast();
  }

  function applyMode() {
    const c = $('#content');
    c.classList.remove('m-he', 'm-en');
    if (PREFS.mode === 'he') c.classList.add('m-he');
    else if (PREFS.mode === 'en') c.classList.add('m-en');
    $$('.seg-btn').forEach(b => b.classList.toggle('on', b.dataset.m === PREFS.mode));
  }

  function paintBookmarks() {
    $$('.pair').forEach(p => {
      const i = +p.dataset.idx;
      p.querySelector('.bm-btn').classList.toggle('on', bookmarks.has(i));
    });
  }

  function wirePairs(sections) {
    $('#content').addEventListener('click', e => {
      const bm = e.target.closest('.bm-btn');
      if (bm) {
        const pair = bm.closest('.pair');
        const idx = +pair.dataset.idx;
        toggleBm(idx);
        bm.classList.toggle('on', bookmarks.has(idx));
      }
      const hit = e.target.closest('.rs-hit');
      if (hit) scrollToPair(+hit.dataset.idx);
    });
  }

  // ─── scroll tracking (progress + last position) ───
  let pairs;
  function setupScrollTracking(sections) {
    pairs = $$('.pair');
    const total = pairs.length;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const idx = +en.target.dataset.idx;
          $('#pfill').style.width = `${Math.min(100, ((idx + 1) / total) * 100)}%`;
          saveLast(idx, total);
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    pairs.forEach(p => io.observe(p));
  }

  function scrollToPair(idx) {
    const p = $(`.pair[data-idx="${idx}"]`);
    if (!p) return;
    p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    p.style.outline = '2px solid var(--accent)';
    setTimeout(() => p.style.outline = '', 1600);
  }

  function restoreLast() {
    const last = JSON.parse(localStorage.getItem(lastKey) || 'null');
    if (last && last.pairIdx > 1) {
      setTimeout(() => scrollToPair(last.pairIdx), 100);
    }
  }

  // ─── in-book search ───
  let sIndex = [];
  function buildSearchIndex(sections) {
    sIndex = [];
    let pi = 0;
    for (const s of sections) {
      if (s.level > 0) continue;
      sIndex.push({ idx: pi, he: s.he, en: s.en, heL: s.he.toLowerCase(), enL: s.en.toLowerCase() });
      pi++;
    }
  }

  function search(q) {
    const box = $('#rs-hits');
    if (!q || q.length < 2) { box.innerHTML = ''; box.style.display = 'none'; return; }
    const ql = q.toLowerCase();
    const hits = [];
    for (const r of sIndex) {
      if (r.enL.includes(ql) || r.heL.includes(ql)) {
        hits.push(r);
        if (hits.length >= 40) break;
      }
    }
    if (!hits.length) {
      box.innerHTML = '<div class="rs-hit">No matches</div>';
      box.style.display = 'block';
      return;
    }
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    box.innerHTML = hits.map(h => {
      const en = excerpt(h.en, ql);
      const he = h.heL.includes(ql) ? `<div class="he">${excerpt(h.he, ql).replace(re, '<mark>$1</mark>')}</div>` : '';
      return `<div class="rs-hit" data-idx="${h.idx}">${en.replace(re, '<mark>$1</mark>')}${he}</div>`;
    }).join('');
    box.style.display = 'block';
  }

  function excerpt(s, q) {
    const i = s.toLowerCase().indexOf(q);
    if (i < 0) return (s.slice(0, 120) + (s.length > 120 ? '…' : '')).replace(/</g, '&lt;');
    const a = Math.max(0, i - 60), b = Math.min(s.length, i + q.length + 100);
    return (a > 0 ? '…' : '') + s.slice(a, b).replace(/</g, '&lt;') + (b < s.length ? '…' : '');
  }

  // ─── UI wiring ───
  $$('.seg-btn').forEach(btn => btn.addEventListener('click', () => {
    PREFS.mode = btn.dataset.m;
    localStorage.setItem('cl:mode', PREFS.mode);
    applyMode();
  }));

  $('#btn-back').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = './';
  });

  $('#btn-set').addEventListener('click', () => $('#ssheet').classList.add('open'));
  $('#ssheet').addEventListener('click', e => {
    if (e.target.classList.contains('sbdrop')) $('#ssheet').classList.remove('open');
  });
  $('#dark-tog').addEventListener('click', () => {
    PREFS.dark = !PREFS.dark;
    root.dataset.dark = PREFS.dark ? '1' : '0';
    localStorage.setItem('cl:dark', PREFS.dark ? '1' : '0');
    $('#dark-tog').classList.toggle('on', PREFS.dark);
  });
  $('#dark-tog').classList.toggle('on', PREFS.dark);

  $$('.fsbtn').forEach(b => b.addEventListener('click', () => {
    PREFS.fs = b.dataset.fs;
    root.dataset.fs = PREFS.fs;
    localStorage.setItem('cl:fs', PREFS.fs);
    $$('.fsbtn').forEach(x => x.classList.toggle('on', x.dataset.fs === PREFS.fs));
  }));
  $$('.fsbtn').forEach(b => b.classList.toggle('on', b.dataset.fs === PREFS.fs));

  let sTimer;
  $('#sinp').addEventListener('input', e => {
    clearTimeout(sTimer);
    sTimer = setTimeout(() => search(e.target.value.trim()), 160);
  });

  $('#btn-share').addEventListener('click', async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied'); }
    } catch {}
  });

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1600);
  }

  load();
})();
