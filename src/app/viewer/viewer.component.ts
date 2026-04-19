import {
  Component, signal, computed, effect, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageViewComponent } from '../page-view.component';
import { THEMES, ThemeName, WirePage, ParsedDSL } from '../../types';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';

// ── Inline parser (kept in sync with editor-shell) ───────────────────────────
function parseDSL(src: string): ParsedDSL {
  const lines = src.split('\n');
  const pages: Record<string, any> = {};
  let cur: any = null, stack: any[] = [], theme = 'paper';
  const indent   = (l: string) => (l.match(/^(\s*)/) as RegExpMatchArray)[1].length;
  const unquote  = (s: string) => s.replace(/^["']|["']$/g, '').trim();
  const splitDot = (s: string) => s.split(/[·|]/).map(x => x.trim()).filter(Boolean);
  const arrowT   = (s: string) => { const m = s.match(/>\s*(\w+)\s*$/); return m ? m[1] : null; };
  const noArrow  = (s: string) => s.replace(/>\s*\w+\s*$/, '').trim();
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('//')) continue;
    const ind = indent(line);
    let t = line.trim();
    if (t.startsWith('theme ')) { theme = t.slice(6).trim(); continue; }
    if (t.startsWith('@')) { cur = { name: t.slice(1).trim(), children: [] }; pages[cur.name] = cur; stack = []; continue; }
    if (!cur) continue;
    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : cur;
    const _sm = t.match(/\s*\$"([^"]*)"\s*$/);
    const nodeStyle = _sm?.[1];
    if (_sm) t = t.slice(0, (_sm.index ?? t.length)).trim();
    const rest = t.replace(/^[^\s]+\s*/, '');
    let node: any = null;
    if (t === '---')                    node = { type: 'divider' };
    else if (/^#{1,3} /.test(t))       { const lvl = (t.match(/^(#+)/) as RegExpMatchArray)[1].length; node = { type: `h${lvl}`, text: t.replace(/^#+\s*/, '') }; }
    else if (t.startsWith('p '))        node = { type: 'para',   text: unquote(rest) };
    else if (t.startsWith('note '))     node = { type: 'note',   text: unquote(rest) };
    else if (t.startsWith('nav '))      node = { type: 'nav',    items: splitDot(rest) };
    else if (t.startsWith('tabs '))     node = { type: 'tabs',   items: splitDot(rest), children: [] };
    else if (t.startsWith('field '))    { const pw = rest.trimEnd().endsWith('*'), op = rest.trimEnd().endsWith('?'); node = { type: 'field', label: unquote(noArrow(rest).replace(/[*?]$/, '').trim()), password: pw, optional: op }; }
    else if (t.startsWith('area '))     node = { type: 'area',   label: unquote(rest) };
    else if (t.startsWith('pick '))     { const parts = splitDot(rest); node = { type: 'pick', label: unquote(parts[0] ?? ''), options: parts.slice(1) }; }
    else if (t.startsWith('check '))    { const ck = rest.trimEnd().endsWith('*'); node = { type: 'check',  label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck || undefined }; }
    else if (t.startsWith('toggle '))   { const ck = rest.trimEnd().endsWith('*'); node = { type: 'toggle', label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck || undefined }; }
    else if (t.startsWith('btn '))      node = { type: 'btn',    label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('ghost '))    node = { type: 'ghost',  label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('link '))     node = { type: 'link',   label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('img '))      node = { type: 'img',    label: unquote(rest) };
    else if (t.startsWith('avatar '))   node = { type: 'avatar', name: unquote(rest) };
    else if (t.startsWith('badge '))    node = { type: 'badge',  text: unquote(rest) };
    else if (t === 'row' || t.startsWith('row ')) node = { type: 'row', align: t.length > 3 ? t.slice(4).trim() : '', children: [] };
    else if (t === 'col')               node = { type: 'col',    children: [] };
    else if (t === 'card' || t === 'card+' || t.startsWith('card ') || t.startsWith('card+ ')) { const cl = t.startsWith('card+'); const tr = cl ? t.slice(5).trim() : rest; node = { type: 'card', title: tr ? unquote(tr) : '', closable: cl, children: [] }; }
    else if (t === 'aside')             node = { type: 'aside',  children: [] };
    else if (t === 'modal' || t.startsWith('modal ')) node = { type: 'modal', title: rest ? unquote(rest) : '', children: [] };
    else if (t.startsWith('kpi '))      { const [v, ...r] = rest.split(/\s+/); node = { type: 'kpi', value: v, label: r.join(' ') }; }
    else if (t.startsWith('grid '))     node = { type: 'grid',   cols: splitDot(rest) };
    else if (t.startsWith('list '))     node = { type: 'list',   items: splitDot(rest) };
    if (node) { if (nodeStyle) node.style = nodeStyle; parent.children.push(node); if (['row','col','card','aside','modal','tabs'].includes(node.type)) stack.push({ indent: ind, node }); }
  }
  return { pages, theme };
}

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [RouterLink, PageViewComponent, BacetoLogoComponent],
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class ViewerComponent implements OnInit {
  parsed      = signal<ParsedDSL>({ pages: {}, theme: 'paper' });
  currentPage = signal<string | null>(null);
  history     = signal<string[]>([]);
  dslRaw      = signal('');
  notFound    = signal(false);

  pageNames   = computed(() => Object.keys(this.parsed().pages));
  wireTheme   = computed(() => this.parsed().theme as ThemeName);
  currentPageData = computed((): WirePage | null => {
    const p = this.parsed(), name = this.currentPage();
    return name ? (p.pages[name] ?? null) : null;
  });
  editorUrl = computed(() => {
    const raw = this.dslRaw();
    if (!raw) return '/#/editor';
    const b64 = btoa(unescape(encodeURIComponent(raw)));
    return `${window.location.origin}/#/editor?w=${encodeURIComponent(b64)}`;
  });

  constructor(readonly theme: ShellThemeService) {
    effect(() => {
      const T = THEMES[this.wireTheme()] ?? THEMES['paper'];
      const el = document.documentElement;
      el.style.setProperty('--w-bg',       T.bg);
      el.style.setProperty('--w-surface',  T.surface);
      el.style.setProperty('--w-border',   T.border);
      el.style.setProperty('--w-borderD',  T.borderD);
      el.style.setProperty('--w-ink',      T.ink);
      el.style.setProperty('--w-inkMid',   T.inkMid);
      el.style.setProperty('--w-inkFaint', T.inkFaint);
      el.style.setProperty('--w-fill',     T.fill);
      el.style.setProperty('--w-blue',     T.blue);
      el.style.setProperty('--w-accent',   T.accent);
      el.style.setProperty('--w-accentFg', T.accentFg);
    });
  }

  ngOnInit(): void {
    const hash = window.location.hash;
    const match = hash.match(/[?&]w=([^&]+)/);
    if (!match) { this.notFound.set(true); return; }
    try {
      const b64 = decodeURIComponent(match[1]);
      const dsl = decodeURIComponent(escape(atob(b64)));
      this.dslRaw.set(dsl);
      const p = parseDSL(dsl);
      this.parsed.set(p);
      const keys = Object.keys(p.pages);
      if (keys.length) this.currentPage.set(keys[0]);
      else this.notFound.set(true);
    } catch { this.notFound.set(true); }
  }

  navTo(target: string): void {
    if (!this.parsed().pages[target]) return;
    this.history.update(h => [...h, this.currentPage() ?? '']);
    this.currentPage.set(target);
  }
  goBack(): void {
    const h = this.history();
    if (!h.length) return;
    this.currentPage.set(h[h.length - 1]);
    this.history.update(hh => hh.slice(0, -1));
  }
  goTo(name: string): void {
    if (name === this.currentPage()) return;
    this.history.update(h => [...h, this.currentPage() ?? '']);
    this.currentPage.set(name);
  }
}
