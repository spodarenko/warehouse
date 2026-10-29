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
      for (const [p, name, sub] of list) out.push({ name, sub, tab: 's1', where: 'Склад №1 · ' + (p > 100 ? 'Сипучка · С' + (p - 100) : 'Бочки · №' + pad(p)), href: root + 'sklad-1/?q=' + encodeURIComponent(name) + (p > 100 ? '#sypuchka' : '') });
    }
    if (window.SKLAD2) {
      const all = [...SKLAD2.D.map(r => [r[0], r[1], r[2], '']), ...SKLAD2.L.map(r => { const n = SKLAD2.NOM[r[1]]; return [100 + r[0], n ? n[1] : r[1], r[2], n ? n[0] : '']; })];
      const m = read('warehouse2-moves') || {};
      for (const i in m) if (all[i]) all[i][0] = [].concat(m[i])[0];
      for (const [p, name, sub, art] of all) {
        const shelf = p - 100, liq = p > 100;
        out.push({ name, sub: (art ? 'арт. ' + art + ' · ' : '') + sub, tab: liq ? 'r' : 's2',
          where: 'Склад №2 · ' + (liq ? 'Рідини · ' + 'ABC'[Math.ceil(shelf / 4) - 1] + '-' + ((shelf - 1) % 4 + 1) : '№' + pad(p)),
          href: root + 'sklad-2/?q=' + encodeURIComponent(name) + (liq ? '#ridyny' : '') });
      }
    }
    return out;
  }

  const css = document.createElement('style');
  css.textContent = `
/* same pattern as the search on the warehouse pages (box, «>» prompt, list rows), docked at the bottom of the screen */
.gs{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.45);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px))}
.gs[hidden]{display:none}
.gs .gsb{width:min(960px,100%);max-height:80vh;display:flex;flex-direction:column;color:var(--fg,#f1ecec);font-family:inherit}
.gs ul{list-style:none;margin:0 0 4px;padding:4px;overflow:auto;background:var(--panel,#1b1818);border:1px solid #6b6565;border-radius:6px;box-shadow:0 -8px 24px rgba(0,0,0,.35)}
.gs ul:empty{display:none}
.gs li{padding:10px 12px;border-radius:3px;cursor:pointer}
.gs li.cur,.gs li:hover{background:var(--line,#2f2b2b)}
.gs .tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line,#2f2b2b);padding:0 12px}
.gs .tabs button{font:inherit;background:none;border:0;color:var(--muted,#8f8a8a);padding:12px 10px;cursor:pointer;border-bottom:2px solid transparent;border-radius:0;white-space:nowrap}
.gs .tabs button.on,.gs .tabs button:hover{color:var(--fg,#f1ecec);border-bottom-color:var(--fg,#f1ecec)}
.gs li code{display:block;color:var(--faint,#4a4545);font:inherit;font-size:12px;overflow-wrap:anywhere}
.gs li.m{display:block;color:var(--muted,#8f8a8a);cursor:default}
.gs .box{border:1px solid var(--line,#2f2b2b);border-radius:6px;background:var(--panel,#1b1818)}
.gs .prompt{display:flex;align-items:center;gap:12px;padding:16px 22px;color:var(--muted,#8f8a8a)}
.gs .prompt input{flex:1;min-width:0;border:0;background:transparent;color:var(--fg,#f1ecec);font:inherit;font-size:16px;outline:none;-webkit-appearance:none;appearance:none}
.gs .prompt input::-webkit-search-cancel-button{display:none}
.gs .prompt input::placeholder{color:var(--faint,#4a4545)}
.gs .prompt>button{font:inherit;font-size:13px;background:var(--fg,#f1ecec);color:var(--bg,#131010);border:1px solid var(--fg,#f1ecec);border-radius:4px;padding:6px 14px;cursor:pointer}
.gs .prompt kbd{font:inherit;font-size:12px;border:1px solid var(--line,#2f2b2b);padding:0 6px;border-radius:3px}
@media (max-width:640px){.gs{padding:0}.gs .gsb{max-height:100%}.gs ul,.gs .box{border-radius:0}.gs ul{margin:0;flex:1}.gs .prompt kbd{display:none}}`;
  document.head.append(css);

  const box = document.createElement('div');
  box.className = 'gs'; box.hidden = true;
  box.innerHTML = '<div class="gsb" role="dialog" aria-label="Пошук по всіх складах"><ul></ul><div class="box"><div class="tabs"></div><label class="prompt">&gt;<input type="search" placeholder="усі склади: сіль, ваніль, 6100068…" autocomplete="off"><button type="button">✕ Закрити</button><kbd>Esc</kbd></label></div></div>';
  document.body.append(box);
  const input = box.querySelector('input'), ul = box.querySelector('ul');
  let data = [], cur = 0, tab = '';
  // tabs as on the Stickers page: narrow the search to one warehouse or zone
  const TABS = [['', 'Усі склади'], ['s1', 'Склад №1'], ['s2', 'Склад №2'], ['r', 'Рідини']];
  const tabs = box.querySelector('.tabs');
  for (const [k, n] of TABS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.dataset.k = k;
    b.onclick = () => { tab = k; cur = 0; show(); input.focus(); };
    tabs.append(b);
  }

  // one row per place
  function show() {
    const t = norm(input.value);
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.k === tab);
    const hits = t || tab ? data.filter(r => (!tab || r.tab === tab) && (norm(r.name).includes(t) || norm(r.sub).includes(t))) : [];
    ul.innerHTML = '';
    if (!t && !tab) return;
    if (!hits.length) { ul.innerHTML = '<li class="m">Ніде не знайдено. Спробуй коротше слово або артикул.</li>'; return; }
    hits.forEach((r, i) => {
      const li = document.createElement('li'); if (i === cur) li.className = 'cur';
      li.innerHTML = '<span></span><code></code>';  // as the dropdown on the Stickers page: name, then details
      li.children[0].textContent = r.name; li.children[1].textContent = r.where + ' · ' + r.sub;
      li.onclick = () => { location.href = r.href; };
      ul.append(li);
    });
    const c = ul.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' });
  }
  async function open() {
    await loaded; data = rows();
    box.hidden = false; cur = 0; tab = ''; input.select(); input.focus(); show();
  }
  const close = () => { box.hidden = true; };
  input.addEventListener('input', () => { cur = 0; show(); });
  input.addEventListener('keydown', e => {
    const n = ul.querySelectorAll('li:not(.m)').length;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && n) { e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; show(); }
    if (e.key === 'Enter' && n) ul.children[cur].click();
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
    const a = document.createElement('a'); a.href = '#'; a.title = 'Пошук по всіх складах (Ctrl+K)';
    // Phosphor «magnifying-glass» (regular), as all icons on the site
    a.innerHTML = '<svg viewBox="0 0 256 256" width="1.1em" height="1.1em" fill="currentColor" aria-hidden="true" style="vertical-align:-.2em;margin-right:6px"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg>Пошук';
    a.onclick = e => { e.preventDefault(); document.body.classList.remove('menu'); open(); };
    nav.prepend(a);
  }
})();