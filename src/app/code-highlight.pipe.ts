import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type CodeLang = 'ts' | 'json' | 'bash' | 'html';
export type CodeTheme = 'dark' | 'light';

interface Palette {
  comment: string; keyword: string; string: string; number: string;
  type: string; key: string; tag: string; attr: string; plain: string;
}

const DARK: Palette = {
  comment: '#4a4760',
  keyword: '#c084fc',
  string:  '#4ade80',
  number:  '#fbbf24',
  type:    '#a78bfa',
  key:     '#5eead4',
  tag:     '#f87171',
  attr:    '#60a5fa',
  plain:   '#c4c0e0',
};

const LIGHT: Palette = {
  comment: '#6b7280',
  keyword: '#7c3aed',
  string:  '#16a34a',
  number:  '#d97706',
  type:    '#6d28d9',
  key:     '#0e7490',
  tag:     '#dc2626',
  attr:    '#2563eb',
  plain:   '#1a1630',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function span(color: string, text: string): string {
  return `<span style="color:${color}">${esc(text)}</span>`;
}

let C: Palette = DARK;

// Split a line into string-literal segments and plain segments.
function splitStrings(line: string): { text: string; isStr: boolean }[] {
  const segs: { text: string; isStr: boolean }[] = [];
  let i = 0;
  let plain = '';
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      if (plain) { segs.push({ text: plain, isStr: false }); plain = ''; }
      let s = ch;
      const q = ch;
      i++;
      while (i < line.length) {
        if (line[i] === '\\' && i + 1 < line.length) { s += line[i] + line[i + 1]; i += 2; continue; }
        s += line[i];
        if (line[i++] === q) break;
      }
      segs.push({ text: s, isStr: true });
    } else {
      plain += ch; i++;
    }
  }
  if (plain) segs.push({ text: plain, isStr: false });
  return segs;
}

// ── TypeScript / JavaScript ───────────────────────────────────────────────────

const TS_KW = /\b(import|export|from|const|let|var|async|await|function|return|if|else|while|for|of|in|true|false|null|undefined|new|class|extends|type|interface|as|break|continue|throw|try|catch|finally|this)\b/g;
const TS_TYPE = /\b(string|number|boolean|void|any|Record|Promise|Array|MessageParam|ChatCompletionMessageParam)\b/g;

function colorPlainTs(raw: string): string {
  let t = esc(raw);
  t = t.replace(/(\/\/[^\n]*)$/m, `<span style="color:${C.comment}">$1</span>`);
  t = t.replace(new RegExp(TS_KW.source, 'g'), `<span style="color:${C.keyword}">$1</span>`);
  t = t.replace(new RegExp(TS_TYPE.source, 'g'), `<span style="color:${C.type}">$1</span>`);
  t = t.replace(/\b(\d+)\b/g, `<span style="color:${C.number}">$1</span>`);
  return `<span style="color:${C.plain}">${t}</span>`;
}

function highlightTs(line: string): string {
  if (line.trimStart().startsWith('//')) return span(C.comment, line);
  return splitStrings(line).map(s =>
    s.isStr ? span(C.string, s.text) : colorPlainTs(s.text)
  ).join('');
}

// ── JSON ─────────────────────────────────────────────────────────────────────

function highlightJson(line: string): string {
  if (line.trimStart().startsWith('//')) return span(C.comment, line);

  const segs = splitStrings(line);
  let nextIsKey = true; // first string in an object is a key

  return segs.map((s, idx) => {
    if (!s.isStr) {
      // after } or ] or : → next string is value; after { or , → next string is key
      if (/[{,\[]/.test(s.text)) nextIsKey = true;
      if (/:/.test(s.text))      nextIsKey = false;
      let t = esc(s.text);
      t = t.replace(/([{}\[\]])/g, `<span style="color:${C.keyword}">$1</span>`);
      t = t.replace(/\b(true|false|null)\b/g, `<span style="color:${C.number}">$1</span>`);
      t = t.replace(/\b(\d+(?:\.\d+)?)\b/g, `<span style="color:${C.number}">$1</span>`);
      return `<span style="color:${C.plain}">${t}</span>`;
    }
    // look ahead: if followed by ":" it's a key
    const after = segs.slice(idx + 1).find(x => x.text.trim());
    const isKey = after && !after.isStr && after.text.trimStart().startsWith(':');
    nextIsKey = false;
    return span(isKey ? C.key : C.string, s.text);
  }).join('');
}

// ── Bash ─────────────────────────────────────────────────────────────────────

function highlightBash(line: string): string {
  const t = line.trimStart();
  if (t.startsWith('#')) return span(C.comment, line);
  const m = line.match(/^(\s*)(\S+)([\s\S]*)$/);
  if (!m) return span(C.plain, line);
  const [, indent, cmd, rest] = m;
  const restHtml = splitStrings(rest).map(s =>
    s.isStr ? span(C.string, s.text) : `<span style="color:${C.plain}">${esc(s.text)}</span>`
  ).join('');
  return esc(indent) + span(C.keyword, cmd) + restHtml;
}

// ── HTML ─────────────────────────────────────────────────────────────────────

function highlightHtml(line: string): string {
  if (line.trimStart().startsWith('<!--')) return span(C.comment, line);
  const TAG_RE = /(<\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^>]*)?)(\/?>)/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(line)) !== null) {
    out += span(C.plain, line.slice(last, m.index));
    const [, open, tag, attrs, close] = m;
    const attrsHtml = attrs.replace(
      /(\s+)([a-zA-Z][a-zA-Z0-9-:.]*)(\s*=\s*)("[^"]*"|'[^']*'|[^\s/>]*)/g,
      (_, sp, name, eq, val) =>
        esc(sp) + span(C.attr, name) + esc(eq) + span(C.string, val)
    );
    out += `<span style="color:${C.tag}">${esc(open)}${esc(tag)}</span>${attrsHtml}<span style="color:${C.tag}">${esc(close)}</span>`;
    last = m.index + m[0].length;
  }
  out += span(C.plain, line.slice(last));
  return out;
}

// ── Pipe ─────────────────────────────────────────────────────────────────────

@Pipe({ name: 'codeHighlight', standalone: true, pure: true })
export class CodeHighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, lang: CodeLang = 'ts', themeName: CodeTheme = 'dark'): SafeHtml {
    C = themeName === 'light' ? LIGHT : DARK;
    const fn = lang === 'json' ? highlightJson
             : lang === 'bash' ? highlightBash
             : lang === 'html' ? highlightHtml
             : highlightTs;
    const html = value.split('\n').map(fn).join('\n');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
