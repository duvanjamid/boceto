/**
 * Boceto — CodeMirror 6 language definition
 * Copyright (c) 2024 Duvan Jamid
 * AGPL-3.0-or-later | Commercial License: duvanjamid.work@gmail.com
 *
 * Token types:
 *   'def'      → @PageName declarations
 *   'heading'  → # ## ###
 *   'keyword'  → structural/layout/form keywords
 *   'atom'     → action keywords (btn / ghost / link)
 *   'string'   → quoted strings and $"..." style blocks
 *   'link'     → navigation targets (> PageName)
 *   'operator' → separators (· |)
 *   'meta'     → markers (* ? ---) and theme line
 *   'comment'  → // comments
 */
import { StreamLanguage, LanguageSupport } from '@codemirror/language';
import { Tag, tags } from '@lezer/highlight';

export const customKwTags: Record<string, Tag> = {
  nav: Tag.define(), tabs: Tag.define(), row: Tag.define(), col: Tag.define(),
  card: Tag.define(), aside: Tag.define(), modal: Tag.define(),
  field: Tag.define(), area: Tag.define(), pick: Tag.define(), check: Tag.define(), toggle: Tag.define(),
  btn: Tag.define(), ghost: Tag.define(), kwlink: Tag.define(),
  img: Tag.define(), avatar: Tag.define(), badge: Tag.define(), kpi: Tag.define(), grid: Tag.define(), list: Tag.define(),
  p: Tag.define(), note: Tag.define()
};

// ── Keyword categories ────────────────────────────────────────────────────────

/** Container / layout keywords */
const CONTAINER_RE = /^(nav|tabs|row|col|card\+?|aside|modal)\b/;

/** Form element keywords */
const FORM_RE = /^(field|area|pick|check|toggle)\b/;

/** Action keywords */
const ACTION_RE = /^(btn|ghost|link)\b/;

/** Content display keywords */
const CONTENT_RE = /^(img|avatar|badge|kpi|grid|list)\b/;

/** Text keywords */
const TEXT_RE = /^(p|note)\b/;

const bocetoParser = StreamLanguage.define({
  tokenTable: customKwTags,
  token(stream) {
    // Consume any formatting whitespace at the current position
    if (stream.eatSpace()) return null;

    // Check if we are at the first non-whitespace character of the line
    const isFirstWord = stream.pos === (stream.string.match(/^\s*/)![0].length);

    // Comments
    if (isFirstWord && stream.match(/^\/\/.*/)) return 'comment';

    // Page declarations  @PageName
    if (isFirstWord && stream.match(/^@\S+/)) return 'def';

    // Headings  # ## ###
    if (isFirstWord && stream.match(/^#{1,3} /)) return 'heading';

    // Divider
    if (isFirstWord && stream.match(/^---/)) return 'meta';

    // theme keyword (standalone line)
    if (isFirstWord && stream.match(/^theme\b/)) {
      stream.skipToEnd();
      return 'meta';
    }

    // Inline style block  $"..."
    if (stream.match(/^\$"[^"]*"/)) return 'string';

    // Process sol matches
    if (isFirstWord) {
      let m = stream.match(ACTION_RE) as RegExpMatchArray | null;
      if (m) return m[1] === 'link' ? 'kwlink' : m[1];

      m = stream.match(CONTAINER_RE) as RegExpMatchArray | null;
      if (m) return m[1].replace('+', '');

      m = stream.match(FORM_RE) as RegExpMatchArray | null;
      if (m) return m[1];

      m = stream.match(CONTENT_RE) as RegExpMatchArray | null;
      if (m) return m[1];

      m = stream.match(TEXT_RE) as RegExpMatchArray | null;
      if (m) return m[1];
    }

    // Navigation target  > @PageName
    if (stream.match(/^>\s*@\w+/)) return 'link';

    // Quoted string
    if (stream.match(/^"[^"]*"/)) return 'string';

    // Separators  · |
    if (stream.match(/^[·|]/)) return 'operator';

    // Password / optional markers at word boundary
    if (stream.match(/^[*?](?=\s|$)/)) return 'meta';

    stream.next();
    return null;
  },
});

export function boceto(): LanguageSupport {
  return new LanguageSupport(bocetoParser);
}
