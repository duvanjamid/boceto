/**
 * WireScript language definition for CodeMirror 6.
 * Uses StreamLanguage for lightweight token-based highlighting.
 */
import { StreamLanguage, LanguageSupport } from '@codemirror/language';

const wireScriptParser = StreamLanguage.define({
  token(stream) {
    // Comments
    if (stream.sol() && stream.match(/^\/\/.*/)) return 'comment';

    // Page declarations  @PageName
    if (stream.sol() && stream.match(/^@\S+/)) return 'def';

    // Headings  # ## ###
    if (stream.sol() && stream.match(/^#{1,3} /)) return 'heading';

    // Divider
    if (stream.sol() && stream.match(/^---/)) return 'meta';

    // theme keyword (standalone line)
    if (stream.sol() && stream.match(/^theme\b/)) {
      stream.skipToEnd();
      return 'keyword';
    }

    // Action keywords (btn / ghost / link)
    if (stream.sol() && stream.match(/^(btn|ghost|link)\b/)) return 'atom';

    // Layout / structural keywords
    if (stream.sol() && stream.match(/^(nav|tabs|row|card|aside)\b/)) return 'keyword';

    // Form keywords
    if (stream.sol() && stream.match(/^(field|area|pick|check|toggle)\b/)) return 'keyword';

    // Content keywords
    if (stream.sol() && stream.match(/^(img|avatar|badge|kpi|grid|list|p|note)\b/)) return 'keyword';

    // Navigation target  > PageName
    if (stream.match(/^>\s*\w+/)) return 'link';

    // Quoted string
    if (stream.match(/^"[^"]*"/)) return 'string';

    // · separator
    if (stream.match(/^·/)) return 'operator';

    // Password / optional markers
    if (stream.match(/^[*?](?=\s|$)/)) return 'meta';

    stream.next();
    return null;
  },
});

export function wirescript(): LanguageSupport {
  return new LanguageSupport(wireScriptParser);
}
