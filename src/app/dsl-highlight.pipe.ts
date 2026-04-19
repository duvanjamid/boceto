import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type HighlightTheme = 'dark' | 'light' | 'solarized';

// ── Token color palettes ──────────────────────────────────────────────────────
const PALETTES: Record<HighlightTheme, Record<string, string>> = {
  dark: {
    page:      '#f87171',  // @PageName
    comment:   '#4a4760',  // //
    heading:   '#fbbf24',  // # h1 h2 h3
    theme:     '#a78bfa',  // theme keyword
    keyword:   '#a78bfa',  // nav btn card etc
    target:    '#4ade80',  // > PageName
    separator: '#4a4868',  // · |
    divider:   '#4a4868',  // ---
    modifier:  '#f472b6',  // * ?
    string:    '#60a5fa',  // "quoted text"
    style:     '#f97316',  // $"css" inline style
    default:   '#c4c0e0',
    linenum:   '#3d3a58',
  },
  light: {
    page:      '#dc2626',
    comment:   '#9d9ab0',
    heading:   '#b45309',
    theme:     '#7c3aed',
    keyword:   '#7c3aed',
    target:    '#15803d',
    separator: '#c4b5fd',
    divider:   '#c4b5fd',
    modifier:  '#be185d',
    string:    '#2563eb',
    style:     '#ea580c',
    default:   '#4a4470',
    linenum:   '#c4b8e8',
  },
  solarized: {
    page:      '#dc322f',   // red
    comment:   '#657b83',   // base00
    heading:   '#b58900',   // yellow
    theme:     '#6c71c4',   // violet
    keyword:   '#6c71c4',   // violet
    target:    '#859900',   // green
    separator: '#586e75',   // base01
    divider:   '#586e75',
    modifier:  '#d33682',   // magenta
    string:    '#2aa198',   // cyan
    style:     '#cb4b16',   // orange
    default:   '#839496',   // base0
    linenum:   '#586e75',
  },
};

// All DSL keywords (including new ones)
const KEYWORDS = new Set([
  'nav', 'tabs', 'row', 'col',
  'card', 'card+', 'aside', 'modal',
  'field', 'area', 'pick', 'check', 'toggle',
  'btn', 'ghost', 'link', 'img', 'avatar', 'badge',
  'kpi', 'grid', 'list', 'p', 'note',
]);

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(color: string, text: string): string {
  return `<span style="color:${color}">${esc(text)}</span>`;
}

function highlightLine(line: string, p: Record<string, string>): string {
  const t = line.trimStart();

  // blank
  if (!t) return '';

  // comment
  if (t.startsWith('//')) return span(p['comment'], line);

  // @PageName
  if (t.startsWith('@')) return span(p['page'], line);

  // theme directive
  if (t.startsWith('theme ')) {
    const [kw, ...rest] = t.split(/\s+/);
    const indent = line.slice(0, line.length - line.trimStart().length);
    return indent + span(p['theme'], kw) + ' ' + span(p['string'], rest.join(' '));
  }

  // headings
  const hm = t.match(/^(#{1,3})\s(.+)$/);
  if (hm) {
    const indent = line.slice(0, line.length - line.trimStart().length);
    return indent + span(p['heading'], hm[1] + ' ' + hm[2]);
  }

  // divider
  if (t === '---') return span(p['divider'], line);

  // keyword-based lines
  // Match keyword (possibly with + suffix like card+)
  const kwMatch = t.match(/^(\w+\+?)(\s|$)/);
  const kw = kwMatch?.[1] ?? '';

  if (KEYWORDS.has(kw)) {
    const indent = line.slice(0, line.length - line.trimStart().length);
    let rest = t.slice(kw.length);

    // Extract and highlight $"..." style blocks
    rest = rest.replace(/(\s*\$"[^"]*")/g, (_, s) =>
      `</span>${span(p['style'], s)}<span style="color:${p['default']}">`
    );

    // Replace · and | with colored separator
    rest = rest.replace(/[·|]/g, sep =>
      `</span>${span(p['separator'], sep)}<span style="color:${p['default']}">`
    );

    // Replace > PageName with green target
    rest = rest.replace(/(>\s*)(\w+)(\s*)$/, (_, gt, tgt, trail) =>
      `</span>${span(p['target'], gt + tgt)}<span style="color:${p['default']}">${trail}`
    );

    // Highlight * or ? at end (before possible $"..." which was already removed)
    rest = rest.replace(/([*?])(\s*)$/, (_, mod, trail) =>
      `</span>${span(p['modifier'], mod)}<span style="color:${p['default']}">${trail}`
    );

    // Quoted strings
    rest = rest.replace(/"([^"]*)"/, (_, inner) =>
      `</span>${span(p['string'], `"${inner}"`)}<span style="color:${p['default']}">`
    );

    return indent + span(p['keyword'], kw)
      + `<span style="color:${p['default']}">${rest}</span>`;
  }

  return span(p['default'], line);
}

// ── Angular Pipe ──────────────────────────────────────────────────────────────
@Pipe({ name: 'dslHighlight', standalone: true, pure: true })
export class DslHighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, theme: HighlightTheme = 'dark'): SafeHtml {
    const p = PALETTES[theme] ?? PALETTES['dark'];
    const html = value
      .split('\n')
      .map(line => highlightLine(line, p))
      .join('\n');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
