/**
 * WireScript — Prism.js Language Plugin
 * https://github.com/wirescript/prism-wirescript
 *
 * Usage:
 *   <script src="prism.js"></script>
 *   <script src="wirescript-prism.js"></script>
 *   <pre><code class="language-wire">...</code></pre>
 */
(function (Prism) {
  Prism.languages.wire = {
    "comment": {
      pattern: /\/\/.*/,
      greedy: true
    },
    "page-def": {
      pattern: /^@\w+/m,
      alias: "keyword",
      inside: {
        "page-sigil": { pattern: /@/, alias: "punctuation" },
        "page-name":  { pattern: /\w+/, alias: "class-name" }
      }
    },
    "theme-decl": {
      pattern: /^theme\s+\w+/m,
      inside: {
        "keyword": /^theme/,
        "constant": /\w+$/
      }
    },
    "heading-1": { pattern: /^#\s+.+/m,  alias: "title" },
    "heading-2": { pattern: /^##\s+.+/m, alias: "title" },
    "heading-3": { pattern: /^###\s+.+/m,alias: "title" },
    "layout-kw": {
      pattern: /^\s*(?:row|card|aside)\b/m,
      alias: "builtin"
    },
    "form-kw": {
      pattern: /^\s*(?:field|area|pick|check|toggle)\b/m,
      alias: "function"
    },
    "action-kw": {
      pattern: /^\s*(?:btn|ghost|link)\b/m,
      alias: "selector"
    },
    "content-kw": {
      pattern: /^\s*(?:nav|tabs|img|avatar|badge|note|p)\b/m,
      alias: "property"
    },
    "data-kw": {
      pattern: /^\s*(?:kpi|grid|list)\b/m,
      alias: "regex"
    },
    "arrow": {
      pattern: />/,
      alias: "operator"
    },
    "dot-sep": {
      pattern: /·/,
      alias: "punctuation"
    },
    "string": {
      pattern: /"[^"]*"/,
      greedy: true
    },
    "modifier": {
      pattern: /[*?](?=\s*$)/m,
      alias: "tag"
    },
    "divider": {
      pattern: /^---$/m,
      alias: "comment"
    }
  };

  // Alias .ws files too
  Prism.languages.ws = Prism.languages.wire;

}(Prism));
