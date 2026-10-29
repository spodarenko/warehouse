// Global search: where a material lies on every warehouse (data/sklad-*.js), from any page.
// Button «Пошук» in the menu or Ctrl+K opens it; a result opens the warehouse map with the place lit.
// Moves made on the maps of this computer (localStorage) are taken into account.
(() => {
  const root = new URL('..', document.currentScript.src).href;
  const need = ['sklad-1', 'sklad-2'].filter(n => !window[n === 'sklad-1' ? 'SKLAD1' : 'SKLAD2']);
  const loaded = Promise.all(need.map(n => new Promise(ok => {
    const s = document.createElement('script'); s.src = root + 'data/' + n + '.js'; s.onload = s.onerror = ok; document.head.append(s);
  })));
  const norm = s => String(s).toLowerCase().replace(/[\s.,?]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };

  // [{name, sub, where, href}] — one row per material on a place
  function rows() {
    const out = [];
    if (window.SKLAD1) {
      const s = read('warehouse1-layout');
      const list = s ? s.rows.map(r => [r[0], r[1], r[2]]) : [...SKLAD1.D, ...SKLAD1.B.map(b => [100 + b[0], b[1], b[2]])];
      for (const [p, name, sub] of list) out.push({ name, sub, where: 'Склад №1 · ' + (p > 100 ? 'Сипучка · С' + (p - 100) : 'Бочки · №' + pad(p)), href: root + 'sklad-1/?q=' + encodeURIComponent(name) + (p > 100 ? '#sypuchka' : '') });
    }
    if (window.SKLAD2) {
      const all = [...SKLAD2.D.map(r => [r[0], r[1], r[2], '']), ...SKLAD2.L.map(r => { const n = SKLAD2.NOM[r[1]]; return [100 + r[0], n ? n[1] : r[1], r[2], n ? n[0] : '']; })];
      const m = read('warehouse2-moves') || {};
      for (const i in m) if (all[i]) all[i][0] = [].concat(m[i])[0];
      for (const [p, name, sub, art] of all) {
        const shelf = p - 100, liq = p > 100;
        out.push({ name, sub: (art ? 'арт. ' + art + ' · ' : '') + sub,
          where: 'Склад №2 · ' + (liq ? 'Рідини · ' + 'ABC'[Math.ceil(shelf / 4) - 1] + '-' + ((shelf - 1) % 4 + 1) : '№' + pad(p)),
          href: root + 'sklad-2/?q=' + encodeURIComponent(name) + (liq ? '#ridyny' : '') });
      }
    }
    return out;
  }

  const css = document.createElement('style');
  css.textContent = `
.gs{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.55);display:flex;justify-content:center;align-items:flex-start;padding:8vh 16px 16px}
.gs[hidden]{display:none}
.gs .gsb{width:min(720px,100%);max-height:84vh;display:flex;flex-direction:column;background:var(--bg,#131010);color:var(--fg,#f1ecec);border:1px solid var(--line,#2f2b2b);border-radius:8px;overflow:hidden;font-family:inherit}
.gs label{display:flex;align-items:center;gap:8px;padding:0 16px;height:56px;border-bottom:1px solid var(--line,#2f2b2b)}
.gs input::-webkit-search-cancel-button{display:none}
.gs input{flex:1;font:inherit;font-size:18px;background:none;border:0;outline:0;color:inherit;min-width:0}
.gs button{font:inherit;font-size:13px;background:none;color:inherit;border:1px solid var(--line,#2f2b2b);border-radius:4px;padding:6px 10px;cursor:pointer}
.gs ul{list-style:none;margin:0;padding:0;overflow:auto}
.gs li{padding:12px 16px;border-bottom:1px solid var(--line,#2f2b2b)}
.gs li b{display:block;font-size:16px}
.gs li a{display:flex;justify-content:space-between;gap:12px;color:inherit;text-decoration:none;padding:8px 0 0;font-size:14px}
.gs li a:hover span:first-child,.gs li a.cur span:first-child{text-decoration:underline}
.gs li small{color:var(--muted,#8f8a8a);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gs .m{padding:16px;color:var(--muted,#8f8a8a);font-size:14px}`;
  document.head.append(css);

  const box = document.createElement('div');
  box.className = 'gs'; box.hidden = true;
  box.innerHTML = '<div class="gsb" role="dialog" aria-label="Пошук по всіх складах"><label><input type="search" placeholder="Що шукаємо на всіх складах: сіль, ваніль, 6100068…" autocomplete="off"><button type="button">✕</button></label><ul></ul></div>';
  document.body.append(box);
  const input = box.querySelector('input'), ul = box.querySelector('ul');
  let data = [], cur = 0;

  function show() {
    const t = norm(input.value);
    const hits = t ? data.filter(r => norm(r.name).includes(t) || norm(r.sub).includes(t)) : [];
    const groups = new Map();  // one card per material, all its places inside
    for (const r of hits) { const k = norm(r.name); if (!groups.has(k)) groups.set(k, { name: r.name, places: [] }); groups.get(k).places.push(r); }
    ul.innerHTML = '';
    if (!t) { ul.innerHTML = '<li class="m">Пошук по Складу №1 (бочки, сипучка) і Складу №2 (склад, рідини). Enter — відкрити перше місце.</li>'; return; }
    if (!groups.size) { ul.innerHTML = '<li class="m">Ніде не знайдено. Спробуй коротше слово або артикул.</li>'; return; }
    let i = 0;
    for (const g of groups.values()) {
      const li = document.createElement('li'), b = document.createElement('b');
      b.textContent = g.name; li.append(b);
      for (const r of g.places) {
        const a = document.createElement('a'); a.href = r.href; if (i++ === cur) a.className = 'cur';
        const w = document.createElement('span'), s = document.createElement('small');
        w.textContent = '📍 ' + r.where; s.textContent = r.sub;
        a.append(w, s); li.append(a);
      }
      ul.append(li);
    }
  }
  async function open() {
    await loaded; data = rows();
    box.hidden = false; cur = 0; input.select(); input.focus(); show();
  }
  const close = () => { box.hidden = true; };
  input.addEventListener('input', () => { cur = 0; show(); });
  input.addEventListener('keydown', e => {
    const links = [...ul.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (links.length) { cur = (cur + (e.key === 'ArrowDown' ? 1 : links.length - 1)) % links.length; show(); } }
    if (e.key === 'Enter' && links[cur]) location.href = links[cur].href;
  });
  box.querySelector('button').onclick = close;
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    if (e.key === 'Escape' && !box.hidden) { e.stopPropagation(); close(); }
  }, true);

  // «Пошук» first in the site menu
  const nav = document.querySelector('.mnav nav') || document.querySelector('nav.mnav') || document.querySelector('nav');
  if (nav) {
    const a = document.createElement('a'); a.href = '#'; a.textContent = 'Пошук'; a.title = 'Пошук по всіх складах (Ctrl+K)';
    a.onclick = e => { e.preventDefault(); document.body.classList.remove('menu'); open(); };
    nav.prepend(a);
  }
})();
