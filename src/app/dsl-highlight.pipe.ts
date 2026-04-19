import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type HighlightTheme = 'dark' | 'light' | 'solarized';

// ── Keyword categories ────────────────────────────────────────────────────────

/** Container / layout keywords */
const CONTAINER_KW = new Set([
  'nav', 'tabs', 'row', 'col', 'card', 'card+', 'aside', 'modal',
]);

/** Form element keywords */
const FORM_KW = new Set([
  'field', 'area', 'pick', 'check', 'toggle',
]);

/** Action keywords */
const ACTION_KW = new Set([
  'btn', 'ghost', 'link',
]);

/** Content display keywords */
const CONTENT_KW = new Set([
  'img', 'avatar', 'badge', 'kpi', 'grid', 'list',
]);

/** Text keywords */
const TEXT_KW = new Set(['p', 'note']);

/** All keywords combined (for fast lookup) */
const ALL_KEYWORDS = new Set([
  ...CONTAINER_KW, ...FORM_KW, ...ACTION_KW, ...CONTENT_KW, ...TEXT_KW,
]);

// ── Token color palettes ──────────────────────────────────────────────────────

const PALETTES: Record<HighlightTheme, Record<string, string>> = {
  dark: {
    page:      '#f87171',  // @PageName
    comment:   '#4a4760',  // //
    heading:   '#fbbf24',  // # h1 h2 h3
    theme:     '#c084fc',  // theme keyword
    container: '#a78bfa',  // nav, row, card…
    form:      '#5eead4',  // field, area, pick…
    action:    '#f472b6',  // btn, ghost, link
    content:   '#fbbf24',  // img, avatar, kpi…
    text:      '#60a5fa',  // p, note
    target:    '#4ade80',  // > @PageName
    separator: '#4a4868',  // |
    divider:   '#4a4868',  // ---
    modifier:  '#f472b6',  // * ?
    string:    '#4ade80',  // "quoted text"
    style:     '#f97316',  // $"css" inline style
    default:   '#c4c0e0',
    linenum:   '#3d3a58',
  },
  light: {
    page:      '#dc2626',
    comment:   '#9d9ab0',
    heading:   '#b45309',
    theme:     '#9333ea',
    container: '#7c6ff7',
    form:      '#0f766e',
    action:    '#be185d',
    content:   '#b45309',
    text:      '#2563eb',
    target:    '#15803d',
    separator: '#c4b5fd', // |
    divider:   '#c4b5fd',
    modifier:  '#be185d',
    string:    '#16a34a',
    style:     '#ea580c',
    default:   '#4a4470',
    linenum:   '#c4b8e8',
  },
  solarized: {
    page:      '#dc322f',   // red
    comment:   '#657b83',   // base00
    heading:   '#b58900',   // yellow
    theme:     '#6c71c4',   // violet
    container: '#6c71c4',   // violet
    form:      '#2aa198',   // cyan
    action:    '#d33682',   // magenta
    content:   '#b58900',   // yellow
    text:      '#268bd2',   // blue
    target:    '#859900',   // green
    separator: '#586e75',   // |
    divider:   '#586e75',
    modifier:  '#d33682',   // magenta
    string:    '#2aa198',   // cyan
    style:     '#cb4b16',   // orange
    default:   '#839496',   // base0
    linenum:   '#586e75',
  },
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(color: string, text: string): string {
  return `<span style="color:${color}">${esc(text)}</span>`;
}

/**
 * Returns the palette color token name for a given DSL keyword.
 */
function kwColor(kw: string): string {
  if (CONTAINER_KW.has(kw)) return 'container';
  if (FORM_KW.has(kw))      return 'form';
  if (ACTION_KW.has(kw))    return 'action';
  if (CONTENT_KW.has(kw))   return 'content';
  if (TEXT_KW.has(kw))       return 'text';
  return 'default';
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

  if (ALL_KEYWORDS.has(kw)) {
    const indent = line.slice(0, line.length - line.trimStart().length);
    const colorToken = kwColor(kw);
    let rest = t.slice(kw.length);

    // Extract and highlight $"..." style blocks
    rest = rest.replace(/(\s*\$"[^"]*")/g, (_, s) =>
      `</span>${span(p['style'], s)}<span style="color:${p['default']}">`
    );

    // Replace | with colored separator
    rest = rest.replace(/\|/g, sep =>
      `</span>${span(p['separator'], sep)}<span style="color:${p['default']}">`
    );

    // Replace > @PageName with green target
    rest = rest.replace(/(>\s*)(@\w+)(\s*)$/, (_, gt, tgt, trail) =>
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

    return indent + span(p[colorToken], kw)
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
