/**
 * Boceto Vue 3 Component — <BocetoPreviewer>
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 *
 * Usage:
 *   import BocetoPreviewer from '@duvanjamid/boceto/plugins/boceto-vue';
 *   app.component('BocetoPreviewer', BocetoPreviewer);
 *
 *   <BocetoPreviewer theme="paper" :dsl="myDslString" />
 *
 * Props:
 *   dsl     String   — DSL source (required)
 *   theme   String   — paper|blueprint|sketch|noir|handwriting|arch (default: from DSL or 'paper')
 *   height  String   — CSS height (default: 'auto')
 */

import { defineComponent, h, ref, computed } from 'vue';

// ── Parser ─────────────────────────────────────────────────────────────────────

function parseDSL(src) {
  const lines = src.split('\n');
  const pages = {};
  let cur = null, stack = [], theme = 'paper';

  const indent   = l => (l.match(/^(\s*)/) || ['',''])[1].length;
  const unquote  = s => s.replace(/^["']|["']$/g, '').trim();
  const splitDot = s => s.split(/[·|]/).map(x => x.trim()).filter(Boolean);
  const arrowT   = s => { const m = s.match(/>\s*@?(\w+)\s*$/); return m ? m[1] : null; };
  const noArrow  = s => s.replace(/>\s*@?\w+\s*$/, '').trim();

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
      node = { type: 'check', label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck };
    }
    else if (t.startsWith('toggle '))  {
      const ck = rest.trimEnd().endsWith('*');
      node = { type: 'toggle', label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck };
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

// ── Theme tokens ──────────────────────────────────────────────────────────────

const THEMES = {
  paper:       { bg:'#f8f7f4', surface:'#ffffff', border:'#d6d3cc', borderD:'#b0aca4', ink:'#1a1916', inkMid:'#6b6760', inkFaint:'#a8a49e', fill:'#eceae5', blue:'#3b5bdb', accent:'#1a1916', accentFg:'#f8f7f4' },
  blueprint:   { bg:'#0d1f3c', surface:'#112348', border:'#1e4080', borderD:'#2a5aaa', ink:'#a8cfff', inkMid:'#5a8fd4', inkFaint:'#2a5090', fill:'#0a1830', blue:'#60a5fa', accent:'#a8cfff', accentFg:'#0d1f3c' },
  sketch:      { bg:'#ffffff', surface:'#fafafa', border:'#222222', borderD:'#111111', ink:'#111111', inkMid:'#444444', inkFaint:'#999999', fill:'#f0f0f0', blue:'#1a56db', accent:'#111111', accentFg:'#ffffff' },
  noir:        { bg:'#141414', surface:'#1e1e1e', border:'#2e2e2e', borderD:'#444444', ink:'#f0f0f0', inkMid:'#aaaaaa', inkFaint:'#555555', fill:'#252525', blue:'#60a5fa', accent:'#f0f0f0', accentFg:'#141414' },
  handwriting: { bg:'#fdf8f0', surface:'#fff9f2', border:'#c4a882', borderD:'#9a7855', ink:'#2c1a08', inkMid:'#7a5a35', inkFaint:'#c4a070', fill:'#f5e8cc', blue:'#4a7fc4', accent:'#3d2010', accentFg:'#fdf8f0' },
  arch:        { bg:'#030912', surface:'#060f22', border:'#0c2e74', borderD:'#1850cc', ink:'#c8e4ff', inkMid:'#4a84d4', inkFaint:'#0c2a6a', fill:'#040c20', blue:'#38b6ff', accent:'#38b6ff', accentFg:'#030912' },
};

// ── CSS ───────────────────────────────────────────────────────────────────────

const STYLES = `
.bn-root{font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;background:var(--w-bg);color:var(--w-ink);padding:12px;box-sizing:border-box;border-radius:8px;overflow:auto}
.bn-hr{border:none;border-top:1px solid var(--w-border);margin:10px 0}
.bn-h1{font-size:1.5em;font-weight:700;margin:8px 0 4px}
.bn-h2{font-size:1.2em;font-weight:600;margin:6px 0 4px}
.bn-h3{font-size:1em;font-weight:600;margin:4px 0 2px}
.bn-para{margin:2px 0;color:var(--w-inkMid)}
.bn-note{font-size:.85em;color:var(--w-inkFaint);font-style:italic;margin:2px 0}
.bn-nav{display:flex;align-items:center;background:var(--w-surface);border-bottom:1px solid var(--w-border);padding:8px 12px;gap:16px;margin:-12px -12px 12px;border-radius:8px 8px 0 0}
.bn-nav__logo{font-weight:700;color:var(--w-ink)}
.bn-nav__links{display:flex;gap:12px;flex:1}
.bn-nav__link{color:var(--w-inkMid);font-size:.9em;cursor:pointer}
.bn-row{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;margin:4px 0}
.bn-row--right{justify-content:flex-end}
.bn-row--center{justify-content:center}
.bn-row--space{justify-content:space-between}
.bn-col{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
.bn-aside{background:var(--w-fill);border:1px solid var(--w-border);border-radius:6px;padding:10px;min-width:120px}
.bn-card{background:var(--w-surface);border:1px solid var(--w-border);border-radius:8px;overflow:hidden;margin:4px 0}
.bn-card__header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--w-border)}
.bn-card__title{font-weight:600;font-size:.9em}
.bn-card__close{background:none;border:none;cursor:pointer;color:var(--w-inkMid);font-size:1.2em;padding:0}
.bn-card__body{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.bn-modal-backdrop{position:relative;background:rgba(0,0,0,.35);border-radius:8px;padding:12px;margin:4px 0}
.bn-modal{background:var(--w-surface);border:1px solid var(--w-border);border-radius:8px;overflow:hidden;max-width:400px;margin:0 auto}
.bn-modal__header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--w-border)}
.bn-modal__title{font-weight:600}
.bn-modal__close{background:none;border:none;cursor:pointer;color:var(--w-inkMid);font-size:1.2em;padding:0}
.bn-modal__body{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.bn-tabs{border:1px solid var(--w-border);border-radius:8px;overflow:hidden;margin:4px 0}
.bn-tabs__bar{display:flex;background:var(--w-fill);border-bottom:1px solid var(--w-border)}
.bn-tabs__tab{background:none;border:none;padding:7px 14px;cursor:pointer;color:var(--w-inkMid);font-size:.88em;border-bottom:2px solid transparent}
.bn-tabs__tab--active{color:var(--w-ink);border-bottom-color:var(--w-accent);background:var(--w-surface)}
.bn-tabs__body{padding:10px;display:flex;flex-direction:column;gap:6px}
.bn-field{display:flex;flex-direction:column;gap:3px;margin:3px 0}
.bn-field__lbl{font-size:.8em;color:var(--w-inkMid)}
.bn-field__input{background:var(--w-fill);border:1px solid var(--w-border);border-radius:5px;padding:6px 8px;color:var(--w-inkFaint);font-size:.88em}
.bn-area__input{background:var(--w-fill);border:1px solid var(--w-border);border-radius:5px;padding:6px 8px;color:var(--w-inkFaint);font-size:.88em;height:64px}
.bn-pick{display:flex;flex-direction:column;gap:3px;margin:3px 0;position:relative}
.bn-pick__btn{background:var(--w-fill);border:1px solid var(--w-border);border-radius:5px;padding:6px 8px;color:var(--w-ink);font-size:.88em;cursor:pointer;text-align:left;display:flex;justify-content:space-between}
.bn-pick__dropdown{position:absolute;top:100%;left:0;right:0;background:var(--w-surface);border:1px solid var(--w-borderD);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:10}
.bn-pick__opt{padding:7px 10px;cursor:pointer;font-size:.88em;color:var(--w-ink)}
.bn-pick__opt:hover{background:var(--w-fill)}
.bn-check,.bn-toggle{display:flex;align-items:center;gap:8px;cursor:pointer;margin:3px 0;font-size:.9em}
.bn-check__box{width:14px;height:14px;border:1.5px solid var(--w-border);border-radius:3px;background:var(--w-fill)}
.bn-check__box--on{background:var(--w-accent);border-color:var(--w-accent)}
.bn-toggle__track{width:32px;height:18px;border-radius:9px;background:var(--w-fill);border:1.5px solid var(--w-border);position:relative;transition:.2s}
.bn-toggle__track--on{background:var(--w-accent);border-color:var(--w-accent)}
.bn-toggle__knob{width:12px;height:12px;border-radius:50%;background:var(--w-surface);position:absolute;top:2px;left:2px;transition:.2s}
.bn-toggle__track--on .bn-toggle__knob{left:16px}
.bn-btn{background:var(--w-accent);color:var(--w-accentFg);border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:.88em;font-weight:500;margin:2px 0}
.bn-ghost{background:transparent;color:var(--w-ink);border:1.5px solid var(--w-border);border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.88em;font-weight:500;margin:2px 0}
.bn-link{background:none;border:none;color:var(--w-blue);cursor:pointer;font-size:.88em;padding:0;text-decoration:underline}
.bn-img{background:var(--w-fill);border:1px dashed var(--w-border);border-radius:6px;width:100%;height:80px;display:flex;align-items:center;justify-content:center;color:var(--w-inkFaint);font-size:.8em}
.bn-avatar{width:36px;height:36px;border-radius:50%;background:var(--w-fill);border:1.5px solid var(--w-border);display:inline-flex;align-items:center;justify-content:center;font-weight:600;font-size:.8em;color:var(--w-inkMid)}
.bn-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:.75em;font-weight:500;background:var(--w-fill);border:1px solid var(--w-border);color:var(--w-inkMid)}
.bn-kpi{text-align:center;padding:10px}
.bn-kpi__val{font-size:1.6em;font-weight:700;color:var(--w-ink)}
.bn-kpi__lbl{font-size:.8em;color:var(--w-inkMid)}
.bn-grid{border:1px solid var(--w-border);border-radius:6px;overflow:hidden;margin:4px 0}
.bn-grid__head{display:flex;background:var(--w-fill);border-bottom:1px solid var(--w-border)}
.bn-grid__hcell{flex:1;padding:5px 8px;font-size:.78em;font-weight:600;color:var(--w-inkMid);text-transform:uppercase;letter-spacing:.05em}
.bn-grid__row{display:flex;border-bottom:1px solid var(--w-border)}
.bn-grid__row:last-child{border-bottom:none}
.bn-grid__cell{flex:1;padding:6px 8px;font-size:.82em;color:var(--w-inkFaint)}
.bn-list{padding:4px 0}
.bn-list__item{padding:3px 0 3px 16px;font-size:.88em;color:var(--w-inkMid);position:relative}
.bn-list__item::before{content:'•';position:absolute;left:4px;color:var(--w-inkFaint)}
`;

// ── Wire node (render function) ───────────────────────────────────────────────

function iText(item) { return String(item).replace(/\s*\$"[^"]*"/g, '').trim(); }
function iStyleStr(item) {
  const m = [...String(item).matchAll(/\$"([^"]*)"/g)];
  return m.length ? m.map(x => x[1]).join(';') : null;
}

function renderWireNode(node, currentPage, pages, navigate) {
  const st = node.style || null;

  const children = () => (node.children || []).map((c, i) =>
    renderWireNode(c, currentPage, pages, navigate)
  );

  switch (node.type) {
    case 'divider': return h('hr', { class: 'bn-hr' });
    case 'h1': return h('div', { class: 'bn-h1', style: st }, node.text);
    case 'h2': return h('div', { class: 'bn-h2', style: st }, node.text);
    case 'h3': return h('div', { class: 'bn-h3', style: st }, node.text);
    case 'para': return h('div', { class: 'bn-para', style: st }, node.text);
    case 'note': return h('div', { class: 'bn-note', style: st }, node.text);

    case 'nav': {
      const items = node.items || [];
      const logo = items[0] || '';
      const links = items.slice(1);
      return h('div', { class: 'bn-nav', style: st }, [
        h('b', { class: 'bn-nav__logo', style: iStyleStr(logo) }, iText(logo)),
        h('div', { class: 'bn-nav__links' },
          links.map((l, i) => h('span', { key: i, class: 'bn-nav__link', style: iStyleStr(l) }, iText(l)))
        ),
      ]);
    }

    case 'row': {
      const cls = ['bn-row', node.align === 'right' ? 'bn-row--right' : '', node.align === 'center' ? 'bn-row--center' : '', node.align === 'space' ? 'bn-row--space' : ''].filter(Boolean).join(' ');
      return h('div', { class: cls, style: st }, children());
    }
    case 'col':   return h('div', { class: 'bn-col',   style: st }, children());
    case 'aside': return h('div', { class: 'bn-aside', style: st }, children());

    case 'card': return h('div', { class: 'bn-card', style: st }, [
      (node.title || node.closable) && h('div', { class: 'bn-card__header' }, [
        h('div', { class: 'bn-card__title' }, node.title),
        node.closable && h('button', { class: 'bn-card__close' }, '×'),
      ]),
      h('div', { class: 'bn-card__body' }, children()),
    ]);

    case 'modal': return h('div', { class: 'bn-modal-backdrop' }, [
      h('div', { class: 'bn-modal' }, [
        h('div', { class: 'bn-modal__header' }, [
          h('span', { class: 'bn-modal__title' }, node.title),
          h('button', { class: 'bn-modal__close' }, '×'),
        ]),
        h('div', { class: 'bn-modal__body' }, children()),
      ]),
    ]);

    case 'tabs': return h('div', { class: 'bn-tabs', style: st }, [
      h('div', { class: 'bn-tabs__bar' },
        (node.items || []).map((item, i) => h('button', { key: i, class: `bn-tabs__tab${i === 0 ? ' bn-tabs__tab--active' : ''}` }, iText(item)))
      ),
      h('div', { class: 'bn-tabs__body' }, children()),
    ]);

    case 'field': return h('div', { class: 'bn-field', style: st }, [
      h('span', { class: 'bn-field__lbl' }, node.label + (node.optional ? ' (opcional)' : '')),
      h('div', { class: 'bn-field__input' }, node.password ? '••••••••' : node.label),
    ]);
    case 'area': return h('div', { class: 'bn-area', style: st }, [
      h('span', { class: 'bn-field__lbl' }, node.label),
      h('div', { class: 'bn-area__input' }),
    ]);

    case 'pick': return defineComponent({
      setup() {
        const open = ref(false);
        const sel = ref(null);
        return () => h('div', { class: 'bn-pick', style: st }, [
          h('span', { class: 'bn-field__lbl' }, node.label),
          h('button', { class: 'bn-pick__btn', onClick: () => open.value = !open.value }, [
            sel.value ?? (node.options?.[0] || node.label), h('span', null, ' ▾'),
          ]),
          open.value && h('div', { class: 'bn-pick__dropdown' },
            (node.options || []).map((opt, i) =>
              h('div', { key: i, class: 'bn-pick__opt', onClick: () => { sel.value = opt; open.value = false; } }, opt)
            )
          ),
        ]);
      },
    });

    case 'check': return defineComponent({
      setup() {
        const on = ref(node.checked ?? false);
        return () => h('div', { class: 'bn-check', style: st, onClick: () => on.value = !on.value }, [
          h('div', { class: `bn-check__box${on.value ? ' bn-check__box--on' : ''}` }),
          h('span', null, node.label),
        ]);
      },
    });
    case 'toggle': return defineComponent({
      setup() {
        const on = ref(node.checked ?? false);
        return () => h('div', { class: 'bn-toggle', style: st, onClick: () => on.value = !on.value }, [
          h('div', { class: `bn-toggle__track${on.value ? ' bn-toggle__track--on' : ''}` }, [
            h('div', { class: 'bn-toggle__knob' }),
          ]),
          h('span', null, node.label),
        ]);
      },
    });

    case 'btn':   return h('button', { class: 'bn-btn',   style: node.style, onClick: () => node.target && navigate(node.target) }, node.label);
    case 'ghost': return h('button', { class: 'bn-ghost', style: node.style, onClick: () => node.target && navigate(node.target) }, node.label);
    case 'link':  return h('button', { class: 'bn-link',  onClick: () => node.target && navigate(node.target) }, node.label);

    case 'img':   return h('div', { class: 'bn-img', style: st }, node.label || 'image');
    case 'avatar': {
      const initials = (node.name || '').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      return h('div', { class: 'bn-avatar' }, initials);
    }
    case 'badge': return h('span', { class: 'bn-badge', style: st }, node.text);
    case 'kpi': return h('div', { class: 'bn-kpi', style: st }, [
      h('div', { class: 'bn-kpi__val' }, node.value),
      h('div', { class: 'bn-kpi__lbl' }, node.label),
    ]);

    case 'grid': {
      const mockRows = 3;
      return h('div', { class: 'bn-grid', style: st }, [
        h('div', { class: 'bn-grid__head' },
          (node.cols || []).map((c, i) => h('div', { key: i, class: 'bn-grid__hcell' }, c))
        ),
        ...Array.from({ length: mockRows }, (_, ri) =>
          h('div', { key: ri, class: 'bn-grid__row' },
            (node.cols || []).map((_, ci) =>
              h('div', { key: ci, class: 'bn-grid__cell' },
                h('div', { style: { width: `${40+ci*10}%`, height: '10px', background: 'var(--w-fill)', borderRadius: '3px' } })
              )
            )
          )
        ),
      ]);
    }

    case 'list': return h('div', { class: 'bn-list', style: st },
      (node.items || []).map((item, i) => h('div', { key: i, class: 'bn-list__item' }, item))
    );

    default: return null;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

const BocetoPreviewer = defineComponent({
  name: 'BocetoPreviewer',

  props: {
    dsl:    { type: String, default: '' },
    theme:  { type: String, default: null },
    height: { type: String, default: 'auto' },
  },

  setup(props) {
    const currentPage = ref(null);

    const parsed = computed(() => parseDSL(props.dsl));
    const themeName = computed(() => props.theme ?? parsed.value.theme ?? 'paper');
    const T = computed(() => THEMES[themeName.value] || THEMES.paper);
    const pageNames = computed(() => Object.keys(parsed.value.pages));

    const activePage = computed(() => {
      const name = currentPage.value ?? pageNames.value[0] ?? '';
      return parsed.value.pages[name];
    });

    const cssVars = computed(() => ({
      '--w-bg':       T.value.bg,
      '--w-surface':  T.value.surface,
      '--w-border':   T.value.border,
      '--w-borderD':  T.value.borderD,
      '--w-ink':      T.value.ink,
      '--w-inkMid':   T.value.inkMid,
      '--w-inkFaint': T.value.inkFaint,
      '--w-fill':     T.value.fill,
      '--w-blue':     T.value.blue,
      '--w-accent':   T.value.accent,
      '--w-accentFg': T.value.accentFg,
      height: props.height,
    }));

    function navigate(page) {
      if (parsed.value.pages[page]) currentPage.value = page;
    }

    return () => [
      h('style', { key: 'style' }, STYLES),
      h('div', { key: 'root', class: 'bn-root', style: cssVars.value },
        activePage.value
          ? (activePage.value.children || []).map((n, i) =>
              h(renderWireNode(n, currentPage.value, parsed.value.pages, navigate) || 'span', { key: i })
            )
          : h('div', { style: { color: 'var(--w-inkFaint)', fontSize: '.85em' } }, 'No page found')
      ),
    ];
  },
});

export default BocetoPreviewer;
