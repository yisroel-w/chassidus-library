/* Chassidus Library — home */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const root = document.documentElement;
  const PREFS = {
    dark: localStorage.getItem('cl:dark') === '1',
    fs: localStorage.getItem('cl:fs') || 'md',
  };
  root.dataset.dark = PREFS.dark ? '1' : '0';
  root.dataset.fs = PREFS.fs;

  let manifest;

  async function load() {
    manifest = await fetch('./assets/manifest.json').then(r => r.json());
    renderShelf();
    renderLibrary(manifest.books);
  }

  function renderShelf() {
    const recent = JSON.parse(localStorage.getItem('cl:recent') || '[]');
    const shelf = $('#shelf');
    if (!recent.length) { shelf.style.display = 'none'; return; }
    const cards = recent.map(id => {
      const b = manifest.books.find(x => x.id === id);
      if (!b) return '';
      const last = JSON.parse(localStorage.getItem(`cl:last:${id}`) || 'null');
      const pct = last && last.total ? Math.round((last.pairIdx + 1) / last.total * 100) : 0;
      return `<a class="shelf-card" href="./reader.html?book=${encodeURIComponent(id)}">
        <div class="lbl">Continue Reading</div>
        <div class="he">${escapeHtml(b.title_he)}</div>
        <div class="en">${escapeHtml(b.title_en)}</div>
        <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
      </a>`;
    }).filter(Boolean).join('');
    if (!cards) { shelf.style.display = 'none'; return; }
    shelf.innerHTML = `<div class="shelf-hd">Continue Reading</div><div class="shelf-row">${cards}</div>`;
  }

  function renderLibrary(books) {
    // group by series_key, preserving order
    const groups = new Map();
    for (const b of books) {
      if (!groups.has(b.series_key)) groups.set(b.series_key, []);
      groups.get(b.series_key).push(b);
    }
    const out = [...groups.entries()].map(([key, list]) => {
      const cards = list.map(b => {
        const last = JSON.parse(localStorage.getItem(`cl:last:${b.id}`) || 'null');
        const pct = last && last.total ? Math.round((last.pairIdx + 1) / last.total * 100) : 0;
        return `<a class="bcard" href="./reader.html?book=${encodeURIComponent(b.id)}">
          ${b.vol ? `<div class="vol">Volume ${b.vol}</div>` : `<div class="vol">${escapeHtml(b.series_en)}</div>`}
          <div class="he">${escapeHtml(b.title_he)}</div>
          <div class="en">${escapeHtml(b.title_en)}</div>
          <div class="pfill-mini" style="width:${pct}%"></div>
        </a>`;
      }).join('');
      return `<section class="series" data-series="${key}">
        <div class="series-hd">
          <div class="he">${escapeHtml(list[0].series_he)}</div>
          <div class="en">${escapeHtml(list[0].series_en)} · ${list.length} ${list.length === 1 ? 'volume' : 'volumes'}</div>
        </div>
        <div class="bgrid">${cards}</div>
      </section>`;
    }).join('');
    $('#library').innerHTML = out || '<div class="empty">No books found.</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  }

  // search
  let sTimer;
  $('#lsearch').addEventListener('input', e => {
    clearTimeout(sTimer);
    const q = e.target.value.trim().toLowerCase();
    sTimer = setTimeout(() => {
      if (!q) { renderLibrary(manifest.books); return; }
      const filtered = manifest.books.filter(b =>
        b.title_en.toLowerCase().includes(q) ||
        b.title_he.includes(q) ||
        b.series_en.toLowerCase().includes(q));
      renderLibrary(filtered);
    }, 120);
  });

  // settings
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
  $$('.fsbtn').forEach(b => {
    b.classList.toggle('on', b.dataset.fs === PREFS.fs);
    b.addEventListener('click', () => {
      PREFS.fs = b.dataset.fs;
      root.dataset.fs = PREFS.fs;
      localStorage.setItem('cl:fs', PREFS.fs);
      $$('.fsbtn').forEach(x => x.classList.toggle('on', x.dataset.fs === PREFS.fs));
    });
  });

  load();
})();
