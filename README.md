<div align="center">

<img src="src/assets/logo.svg" width="64" height="64" alt="Boceto logo"/>

# Boceto

**Text-based DSL for interactive UI wireframes**

Write screens in plain text → navigate between them → export to SVG → switch themes

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](./LICENSE)
[![Commercial License](https://img.shields.io/badge/License-Commercial-green.svg)](./LICENSE-COMMERCIAL)
[![npm](https://img.shields.io/badge/npm-boceto-red.svg)](https://www.npmjs.com/package/boceto)

</div>

---

```boceto
theme paper

@Login
nav Boceto
# Diseña sin ratón
p Prototipos interactivos desde texto puro
---
field Email
field Contraseña *
btn Entrar > Dashboard
link ¿Olvidaste tu contraseña?

@Dashboard
nav Boceto | Inicio | Proyectos | Ajustes
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Proyectos recientes
  grid Nombre | Estado | Fecha
row right
  btn Nuevo proyecto
  ghost Ver todos
```

→ Renders as a **clickable wireframe**. `btn > Page` navigates. AI can generate and edit.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:4200](http://localhost:4200)

---

## DSL Reference

Full reference → **[DSL.md](./DSL.md)**

| Keyword | Description |
|---------|-------------|
| `@Name` | Define a screen |
| `theme paper\|blueprint\|sketch\|noir\|handwriting\|arch\|cyberpunk\|dots` | Visual theme |
| `# H1` `## H2` `### H3` | Headings |
| `p Text` · `note Text` · `---` | Paragraph, annotation, divider |
| `nav Logo \| Link \| Link` | Top navigation bar |
| `tabs Tab1 \| Tab2` | Tab switcher (`---` splits content per tab) |
| `row` `col` `card` `card+` `aside` `modal` | Layout containers |
| `field Label [*\|?]` · `area` · `pick Label \| Opt1 \| Opt2` | Form inputs |
| `check Label [*]` · `toggle Label [*]` | Interactive checkbox / toggle |
| `btn Label [> Page]` · `ghost` · `link` | Action buttons |
| `img` · `avatar Name` · `badge Text` · `kpi Value Label` | Media & content |
| `grid Col1 \| Col2` · `list Item1 \| Item2` | Table / list |
| `$"css"` | Inline CSS on any element |

Separator: `|` and `·` are interchangeable everywhere.

---

## Plugins

### VSCode / Sublime / Zed / TextMate
Copy `plugins/boceto.tmLanguage.json` into your editor's grammar folder.

### Prism.js
```html
<script src="plugins/boceto-prism.js"></script>
<pre><code class="language-boceto">
@Login
field Email
btn Entrar > Dashboard
</code></pre>
```

### Docsify
```html
<script src="plugins/boceto-docsify.js"></script>
```
Then in any Markdown file, use fenced ` ```boceto ``` ` blocks — they render as interactive wireframes.

---

## Project structure

```
boceto/
├── src/
│   ├── parser.ts              — DSL parser (TypeScript, class hierarchy)
│   ├── types.ts               — Type definitions
│   ├── boceto-lang.ts         — CodeMirror 6 language definition
│   └── themes.js              — Theme token maps
├── plugins/
│   ├── boceto-prism.js        — Prism.js language plugin
│   ├── boceto-docsify.js      — Docsify plugin
│   └── boceto.tmLanguage.json — TextMate grammar
├── src/app/                   — Angular 17 web app
├── DSL.md                     — Full DSL language reference
├── LICENSE                    — AGPLv3
├── LICENSE-COMMERCIAL         — Commercial license terms
└── package.json
```

---

## License

Boceto is **dual-licensed**:

| | Open Source | Commercial |
|--|------------|------------|
| Personal use | ✅ Free | ✅ Free |
| Open source projects | ✅ Free | — |
| Internal tools (source published) | ✅ Free | — |
| SaaS / closed-source products | ❌ Requires commercial | ✅ |
| White-label / no attribution | ❌ | ✅ |

**Open Source:** [AGPLv3](./LICENSE) — free as long as you publish your modifications.

**Commercial:** [LICENSE-COMMERCIAL](./LICENSE-COMMERCIAL) — for proprietary and SaaS use.
Contact **duvanjamid.work@gmail.com** for pricing.

> © 2024 Duvan Jamid
