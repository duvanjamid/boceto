/**
 * Boceto Web Component — <boceto-preview>
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Self-contained custom element. No dependencies, no build step.
 *
 * Usage:
 *   <script src="boceto-web-component.js"></script>
 *   <boceto-preview theme="paper">
 *     @Login
 *     nav MiApp
 *     # Bienvenido
 *     field Email
 *     field Contraseña *
 *     btn Entrar
 *   </boceto-preview>
 *
 * Attributes:
 *   theme   paper | blueprint | sketch | noir | handwriting | arch (default: paper)
 *   dsl     DSL string (alternative to text content)
 *   height  CSS height of the preview (default: auto)
 */

// ── Parser (inlined, framework-agnostic) ─────────────────────────────────────

function parseDSL(src) {
  const lines = src.split('\n');
  const pages = {};
  let cur = null, stack = [], theme = 'paper';

  const indent   = l => (l.match(/^(\s*)/) || ['',''])[1].length;
  const unquote  = s => s.replace(/^["']|["']$/g, '').trim();
  const splitDot = s => s.split(/[·|]/).map(x => x.trim()).filter(Boolean);
  const arrowT   = s => { const m = s.match(/>\s*(\w+)\s*$/); return m ? m[1] : null; };
  const noArrow  = s => s.replace(/>\s*\w+\s*$/, '').trim();

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('//')) continue;
    const ind = indent(line);
    let t = line.trim();

    if (t.startsWith('theme ')) { theme = t.slice(6).trim(); continue; }
    if (t.startsWith('@')) {
      cur = { name: t.slice(1).trim(), children: [] };
      pages[cur.name] = cur; stack = []; continue;
    }
    if (!cur) continue;

    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : cur;
    const _sm = t.match(/\s*\$"([^"]*)"\s*$/);
    const nodeStyle = _sm ? _sm[1] : null;
    if (_sm) t = t.slice(0, _sm.index).trim();
    const rest = t.replace(/^[^\s]+\s*/, '');
    let node = null;

    if (t === '---') node = { type: 'divider' };
    else if (/^#{1,3} /.test(t)) {
      const lvl = t.match(/^(#+)/)[1].length;
      node = { type: `h${lvl}`, text: t.replace(/^#+\s*/, '') };
    }
    else if (t.startsWith('p '))       node = { type: 'para',   text: unquote(rest) };
    else if (t.startsWith('note '))    node = { type: 'note',   text: unquote(rest) };
    else if (t.startsWith('nav '))     node = { type: 'nav',    items: splitDot(rest) };
    else if (t.startsWith('tabs '))    node = { type: 'tabs',   items: splitDot(rest), children: [] };
    else if (t.startsWith('field '))   {
      const pw = rest.trimEnd().endsWith('*'), op = rest.trimEnd().endsWith('?');
      node = { type: 'field', label: unquote(noArrow(rest).replace(/[*?]$/, '').trim()), password: pw, optional: op };
    }
    else if (t.startsWith('area '))    node = { type: 'area',   label: unquote(rest) };
    else if (t.startsWith('pick '))    {
      const parts = splitDot(rest);
      node = { type: 'pick', label: unquote(parts[0] || ''), options: parts.slice(1) };
    }
    else if (t.startsWith('check '))   {
      const ck = rest.trimEnd().endsWith('*');
      node = { type: 'check', label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck || undefined };
    }
    else if (t.startsWith('toggle '))  {
      const ck = rest.trimEnd().endsWith('*');
      node = { type: 'toggle', label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck || undefined };
    }
    else if (t.startsWith('btn '))     node = { type: 'btn',   label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('ghost '))   node = { type: 'ghost', label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('link '))    node = { type: 'link',  label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('img '))     node = { type: 'img',   label: unquote(rest) };
    else if (t.startsWith('avatar '))  node = { type: 'avatar', name: unquote(rest) };
    else if (t.startsWith('badge '))   node = { type: 'badge', text: unquote(rest) };
    else if (t === 'row' || t.startsWith('row '))
      node = { type: 'row', align: t.length > 3 ? t.slice(4).trim() : '', children: [] };
    else if (t === 'col')              node = { type: 'col', children: [] };
    else if (t === 'card' || t === 'card+' || t.startsWith('card ') || t.startsWith('card+ ')) {
      const cl = t.startsWith('card+');
      const tr = cl ? t.slice(5).trim() : rest;
      node = { type: 'card', title: tr ? unquote(tr) : '', closable: cl, children: [] };
    }
    else if (t === 'aside')            node = { type: 'aside', children: [] };
    else if (t === 'modal' || t.startsWith('modal '))
      node = { type: 'modal', title: rest ? unquote(rest) : '', children: [] };
    else if (t.startsWith('kpi '))     {
      const [v, ...r] = rest.split(/\s+/);
      node = { type: 'kpi', value: v, label: r.join(' ') };
    }
    else if (t.startsWith('grid '))    node = { type: 'grid', cols: splitDot(rest) };
    else if (t.startsWith('list '))    node = { type: 'list', items: splitDot(rest) };

    if (node) {
      if (nodeStyle) node.style = nodeStyle;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
      if (['row','col','card','aside','modal','tabs'].includes(node.type))
        stack.push({ indent: ind, node });
    }
  }
  return { pages, theme };
}

// ── Theme tokens ─────────────────────────────────────────────────────────────

const THEMES = {
  paper:       { bg:'#f8f7f4', surface:'#ffffff', border:'#d6d3cc', borderD:'#b0aca4', ink:'#1a1916', inkMid:'#6b6760', inkFaint:'#a8a49e', fill:'#eceae5', blue:'#3b5bdb', accent:'#1a1916', accentFg:'#f8f7f4' },
  blueprint:   { bg:'#0d1f3c', surface:'#112348', border:'#1e4080', borderD:'#2a5aaa', ink:'#a8cfff', inkMid:'#5a8fd4', inkFaint:'#2a5090', fill:'#0a1830', blue:'#60a5fa', accent:'#a8cfff', accentFg:'#0d1f3c' },
  sketch:      { bg:'#ffffff', surface:'#fafafa', border:'#222222', borderD:'#111111', ink:'#111111', inkMid:'#444444', inkFaint:'#999999', fill:'#f0f0f0', blue:'#1a56db', accent:'#111111', accentFg:'#ffffff' },
  noir:        { bg:'#141414', surface:'#1e1e1e', border:'#2e2e2e', borderD:'#444444', ink:'#f0f0f0', inkMid:'#aaaaaa', inkFaint:'#555555', fill:'#252525', blue:'#60a5fa', accent:'#f0f0f0', accentFg:'#141414' },
  handwriting: { bg:'#fdf8f0', surface:'#fff9f2', border:'#c4a882', borderD:'#9a7855', ink:'#2c1a08', inkMid:'#7a5a35', inkFaint:'#c4a070', fill:'#f5e8cc', blue:'#4a7fc4', accent:'#3d2010', accentFg:'#fdf8f0' },
  arch:        { bg:'#030912', surface:'#060f22', border:'#0c2e74', borderD:'#1850cc', ink:'#c8e4ff', inkMid:'#4a84d4', inkFaint:'#0c2a6a', fill:'#040c20', blue:'#38b6ff', accent:'#38b6ff', accentFg:'#030912' },
};

// ── HTML renderer ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function iText(item) { return item.replace(/\s*\$"[^"]*"/g, '').trim(); }
function iStyle(item) {
  const m = [...String(item).matchAll(/\$"([^"]*)"/g)];
  return m.length ? m.map(x => x[1]).join(';') : null;
}

function renderNodes(nodes, depth) {
  return (nodes || []).map(n => renderNode(n, depth)).join('');
}

function renderNode(n, depth = 0) {
  const st = n.style ? ` style="${esc(n.style)}"` : '';
  switch (n.type) {
    case 'divider': return `<hr class="bn-hr">`;
    case 'h1': return `<div class="bn-h1"${st}>${esc(n.text)}</div>`;
    case 'h2': return `<div class="bn-h2"${st}>${esc(n.text)}</div>`;
    case 'h3': return `<div class="bn-h3"${st}>${esc(n.text)}</div>`;
    case 'para': return `<div class="bn-para"${st}>${esc(n.text)}</div>`;
    case 'note': return `<div class="bn-note"${st}>${esc(n.text)}</div>`;

    case 'nav': {
      const items = (n.items || []);
      const logo = items[0] || '';
      const links = items.slice(1);
      return `<div class="bn-nav"${st}>
        <b class="bn-nav__logo" ${iStyle(logo)?`style="${esc(iStyle(logo))}"`:''}>
          ${esc(iText(logo))}
        </b>
        <div class="bn-nav__links">
          ${links.map(l => `<span class="bn-nav__link" ${iStyle(l)?`style="${esc(iStyle(l))}"`:''}>
            ${esc(iText(l))}</span>`).join('')}
        </div>
      </div>`;
    }

    case 'row': {
      const cls = ['bn-row', n.align==='right'?'bn-row--right':'', n.align==='center'?'bn-row--center':'', n.align==='space'?'bn-row--space':''].filter(Boolean).join(' ');
      return `<div class="${cls}"${st}>${renderNodes(n.children, depth+1)}</div>`;
    }
    case 'col':   return `<div class="bn-col"${st}>${renderNodes(n.children, depth+1)}</div>`;
    case 'aside': return `<div class="bn-aside"${st}>${renderNodes(n.children, depth+1)}</div>`;

    case 'card': return `<div class="bn-card"${st}>
      ${(n.title||n.closable) ? `<div class="bn-card__header">
        <div class="bn-card__title">${esc(n.title)}</div>
        ${n.closable ? `<button class="bn-card__close">×</button>` : ''}
      </div>` : ''}
      <div class="bn-card__body">${renderNodes(n.children, depth+1)}</div>
    </div>`;

    case 'modal': return `<div class="bn-modal-backdrop">
      <div class="bn-modal">
        <div class="bn-modal__header">
          <span class="bn-modal__title">${esc(n.title)}</span>
          <button class="bn-modal__close">×</button>
        </div>
        <div class="bn-modal__body">${renderNodes(n.children, depth+1)}</div>
      </div>
    </div>`;

    case 'tabs': return `<div class="bn-tabs">
      <div class="bn-tabs__bar">
        ${(n.items||[]).map((item,i) => `<button class="bn-tabs__tab${i===0?' bn-tabs__tab--active':''}">${esc(iText(item))}</button>`).join('')}
      </div>
      <div class="bn-tabs__content">${renderNodes(n.children, depth+1)}</div>
    </div>`;

    case 'field': return `<div class="bn-field"${st}>
      <div class="bn-field__label">${esc(n.label)}${n.optional?'<span class="bn-field__opt"> — opcional</span>':''}</div>
      <div class="bn-field__input"><span class="bn-field__ph">${n.password?'••••••••':esc((n.label||'').toLowerCase())+'...'}</span></div>
    </div>`;

    case 'area': return `<div class="bn-field"${st}>
      <div class="bn-field__label">${esc(n.label)}</div>
      <div class="bn-area__input"><span class="bn-field__ph">${esc((n.label||'').toLowerCase())}...</span></div>
    </div>`;

    case 'pick': return `<div class="bn-field"${st}>
      <div class="bn-field__label">${esc(n.label)}</div>
      <div class="bn-pick__input">
        <span class="bn-field__ph">${esc((n.options||[])[0]||'Seleccionar…')}</span>
        <span class="bn-pick__arrow">▾</span>
      </div>
    </div>`;

    case 'check': return `<div class="bn-check"${st}>
      <div class="bn-check__box${n.checked?' bn-check__box--on':''}">${n.checked?'✓':''}</div>
      <span class="bn-check__label">${esc(n.label)}</span>
    </div>`;

    case 'toggle': return `<div class="bn-toggle"${st}>
      <span class="bn-toggle__label">${esc(n.label)}</span>
      <div class="bn-toggle__track${n.checked?' bn-toggle__track--on':''}">
        <div class="bn-toggle__thumb${n.checked?' bn-toggle__thumb--on':''}"></div>
      </div>
    </div>`;

    case 'btn': return `<button class="bn-btn"${st}>${esc(n.label)}${n.target?'<span class="bn-btn__arrow">→</span>':''}</button>`;
    case 'ghost': return `<button class="bn-ghost"${st}>${esc(n.label)}</button>`;
    case 'link':  return `<span class="bn-link"${st}>${esc(n.label)}</span>`;

    case 'img': return `<div class="bn-img"${st}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bn-inkFaint)" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>
      <span class="bn-img__label">${esc(n.label)}</span>
    </div>`;

    case 'avatar': {
      const initials = (n.name||'').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
      return `<div class="bn-avatar"${st}>${initials}</div>`;
    }

    case 'badge': return `<span class="bn-badge"${st}>${esc(n.text)}</span>`;

    case 'kpi': return `<div class="bn-kpi"${st}>
      <div class="bn-kpi__value">${esc(n.value)}</div>
      <div class="bn-kpi__label">${esc(n.label)}</div>
    </div>`;

    case 'grid': return `<div class="bn-grid">
      <table>
        <thead><tr>${(n.cols||[]).map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${[0,1,2].map(row=>`<tr>${(n.cols||[]).map((_,ci)=>`<td><div class="bn-grid__bar" style="width:${40+Math.sin(row*3+ci)*25+25}%"></div></td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;

    case 'list': return `<div class="bn-list">
      ${(n.items||[]).map(item=>`<div class="bn-list__item"><div class="bn-list__dot"></div><span>${esc(item)}</span></div>`).join('')}
    </div>`;

    default: return '';
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
:host { display: block; font-family: system-ui, sans-serif; }
.bn-root { background: var(--bn-bg); color: var(--bn-ink); padding: 16px; border-radius: 8px; font-size: 14px; }
.bn-page { display: flex; flex-direction: column; gap: 10px; }
.bn-hr { border: none; border-top: 1px solid var(--bn-border); margin: 4px 0; }
.bn-h1 { font-size: 1.5em; font-weight: 700; color: var(--bn-ink); line-height: 1.2; }
.bn-h2 { font-size: 1.2em; font-weight: 600; color: var(--bn-ink); }
.bn-h3 { font-size: 1em; font-weight: 600; color: var(--bn-inkMid); }
.bn-para { color: var(--bn-inkMid); line-height: 1.5; }
.bn-note { font-size: .85em; color: var(--bn-inkFaint); line-height: 1.4; }
.bn-nav { display: flex; align-items: center; gap: 16px; background: var(--bn-surface); border: 1px solid var(--bn-border); border-radius: 7px; padding: 8px 12px; }
.bn-nav__logo { font-weight: 700; font-size: .95em; }
.bn-nav__links { display: flex; gap: 12px; flex: 1; }
.bn-nav__link { font-size: .82em; color: var(--bn-inkMid); }
.bn-row { display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; }
.bn-row--right  { justify-content: flex-end; }
.bn-row--center { justify-content: center; }
.bn-row--space  { justify-content: space-between; align-items: center; }
.bn-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.bn-aside { background: var(--bn-fill); border: 1px solid var(--bn-border); border-radius: 7px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.bn-card { background: var(--bn-surface); border: 1px solid var(--bn-border); border-radius: 8px; overflow: hidden; flex: 1; }
.bn-card__header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 8px; border-bottom: 1px solid var(--bn-border); }
.bn-card__title { font-size: .85em; font-weight: 600; color: var(--bn-ink); }
.bn-card__close { background: none; border: none; color: var(--bn-inkFaint); cursor: pointer; font-size: 14px; }
.bn-card__body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.bn-modal-backdrop { background: rgba(0,0,0,.4); border-radius: 8px; padding: 20px; display: flex; align-items: center; justify-content: center; }
.bn-modal { background: var(--bn-surface); border: 1px solid var(--bn-border); border-radius: 10px; width: 100%; max-width: 320px; }
.bn-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--bn-border); }
.bn-modal__title { font-weight: 600; font-size: .9em; }
.bn-modal__close { background: none; border: none; color: var(--bn-inkFaint); cursor: pointer; }
.bn-modal__body { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.bn-tabs__bar { display: flex; border-bottom: 1px solid var(--bn-border); }
.bn-tabs__tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 7px 14px; font-size: .83em; color: var(--bn-inkMid); cursor: pointer; margin-bottom: -1px; }
.bn-tabs__tab--active { color: var(--bn-accent); border-bottom-color: var(--bn-accent); }
.bn-tabs__content { padding: 10px 0; display: flex; flex-direction: column; gap: 8px; }
.bn-field { display: flex; flex-direction: column; gap: 4px; }
.bn-field__label { font-size: .8em; font-weight: 500; color: var(--bn-inkMid); }
.bn-field__opt { color: var(--bn-inkFaint); }
.bn-field__input { height: 34px; background: var(--bn-bg); border: 1.5px solid var(--bn-border); border-radius: 6px; padding: 0 10px; display: flex; align-items: center; }
.bn-area__input { height: 68px; background: var(--bn-bg); border: 1.5px solid var(--bn-border); border-radius: 6px; padding: 8px 10px; }
.bn-pick__input { height: 34px; background: var(--bn-bg); border: 1.5px solid var(--bn-border); border-radius: 6px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
.bn-pick__arrow { color: var(--bn-inkFaint); font-size: 9px; }
.bn-field__ph { color: var(--bn-inkFaint); font-size: .85em; }
.bn-check { display: flex; align-items: center; gap: 8px; }
.bn-check__box { width: 16px; height: 16px; border: 1.5px solid var(--bn-border); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--bn-accentFg); flex-shrink: 0; }
.bn-check__box--on { background: var(--bn-accent); border-color: var(--bn-accent); }
.bn-check__label { font-size: .88em; color: var(--bn-ink); }
.bn-toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bn-toggle__label { font-size: .88em; color: var(--bn-ink); }
.bn-toggle__track { width: 36px; height: 20px; background: var(--bn-fill); border-radius: 10px; position: relative; border: 1px solid var(--bn-border); flex-shrink: 0; }
.bn-toggle__track--on { background: var(--bn-accent); border-color: var(--bn-accent); }
.bn-toggle__thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: var(--bn-surface); transition: transform .15s; }
.bn-toggle__thumb--on { transform: translateX(16px); }
.bn-btn { background: var(--bn-accent); color: var(--bn-accentFg); border: none; border-radius: 7px; padding: 8px 16px; font-size: .88em; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.bn-btn__arrow { opacity: .7; }
.bn-ghost { background: transparent; color: var(--bn-ink); border: 1.5px solid var(--bn-border); border-radius: 7px; padding: 7px 14px; font-size: .88em; font-weight: 500; cursor: pointer; }
.bn-link { color: var(--bn-blue); text-decoration: underline; font-size: .88em; cursor: pointer; }
.bn-img { background: var(--bn-fill); border: 1.5px dashed var(--bn-border); border-radius: 7px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 80px; flex: 1; }
.bn-img__label { font-size: .78em; color: var(--bn-inkFaint); }
.bn-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--bn-fill); border: 1.5px solid var(--bn-border); display: flex; align-items: center; justify-content: center; font-size: .75em; font-weight: 700; color: var(--bn-inkMid); flex-shrink: 0; }
.bn-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 99px; font-size: .75em; font-weight: 500; background: var(--bn-fill); color: var(--bn-inkMid); border: 1px solid var(--bn-border); }
.bn-kpi { background: var(--bn-surface); border: 1px solid var(--bn-border); border-radius: 8px; padding: 12px 16px; flex: 1; }
.bn-kpi__value { font-size: 1.5em; font-weight: 700; color: var(--bn-ink); line-height: 1; }
.bn-kpi__label { font-size: .78em; color: var(--bn-inkFaint); margin-top: 4px; }
.bn-grid table { width: 100%; border-collapse: collapse; font-size: .82em; }
.bn-grid th { text-align: left; color: var(--bn-inkFaint); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--bn-border); font-size: .9em; }
.bn-grid td { padding: 6px 8px; border-bottom: 1px solid var(--bn-border); }
.bn-grid__bar { height: 8px; background: var(--bn-fill); border-radius: 4px; }
.bn-list { display: flex; flex-direction: column; gap: 6px; }
.bn-list__item { display: flex; align-items: flex-start; gap: 8px; font-size: .88em; color: var(--bn-ink); }
.bn-list__dot { width: 5px; height: 5px; border-radius: 50%; background: var(--bn-inkFaint); margin-top: 5px; flex-shrink: 0; }
`;

// ── Custom Element ────────────────────────────────────────────────────────────

class BocetoPreviewer extends HTMLElement {
  static get observedAttributes() { return ['dsl', 'theme', 'height']; }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const src = this.getAttribute('dsl') || this.textContent || '';
    const themeName = this.getAttribute('theme') || 'paper';
    const height = this.getAttribute('height') || 'auto';

    const { pages, theme: parsedTheme } = parseDSL(src);
    const T = THEMES[themeName] || THEMES[parsedTheme] || THEMES.paper;

    const cssVars = Object.entries({
      '--bn-bg':       T.bg,
      '--bn-surface':  T.surface,
      '--bn-border':   T.border,
      '--bn-borderD':  T.borderD,
      '--bn-ink':      T.ink,
      '--bn-inkMid':   T.inkMid,
      '--bn-inkFaint': T.inkFaint,
      '--bn-fill':     T.fill,
      '--bn-blue':     T.blue,
      '--bn-accent':   T.accent,
      '--bn-accentFg': T.accentFg,
    }).map(([k,v]) => `${k}:${v}`).join(';');

    const firstPage = Object.values(pages)[0];
    const pageHtml = firstPage
      ? `<div class="bn-page">${renderNodes(firstPage.children)}</div>`
      : `<div class="bn-note">No pages found</div>`;

    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="bn-root" style="${cssVars}; height:${height}; overflow:auto;">
        ${pageHtml}
      </div>
    `;
  }
}

customElements.define('boceto-preview', BocetoPreviewer);
