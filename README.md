<div align="center">

<img src="src/assets/logo.svg" width="64" height="64" alt="Boceto logo"/>

# Boceto

Write screens in plain text → navigate between them → switch themes → embed anywhere

**Live Demo: [boceto.online](https://boceto.online/)**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](./LICENSE)
[![Commercial License](https://img.shields.io/badge/License-Commercial-green.svg)](./LICENSE-COMMERCIAL)
[![npm](https://img.shields.io/badge/npm-%40duvanjamid%2Fboceto-red.svg)](https://www.npmjs.com/package/@duvanjamid/boceto)

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

```bash
npm install
npm run dev
```

Open [localhost:4200](http://localhost:4200) or use the live version at **[boceto.online](https://boceto.online/)**

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

Separator: `|` is the standard separator for all multi-item elements.

---

## Plugins

### Web Component
Drop-in custom element — zero dependencies, works in any HTML page or framework.

```html
<!-- CDN -->
<script src="https://unpkg.com/@duvanjamid/boceto/plugins/boceto-web-component.js"></script>

<!-- npm -->
<!-- npm install @duvanjamid/boceto  →  import 'boceto/plugins/boceto-web-component.js' -->

<boceto-preview theme="paper" dsl="
@Login
nav Boceto
field Email
field Contraseña *
btn Entrar > Dashboard
"></boceto-preview>
```

Attributes: `dsl` (required) · `theme` (paper|blueprint|sketch|noir|handwriting|arch, default `paper`) · `height` (CSS value or `auto`, default `auto`)

### IntelliJ IDEA / WebStorm / PyCharm
Syntax highlighting + live templates via TextMate bundle:

1. **Settings → Editor → TextMate Bundles → +** → select `plugins/boceto-intellij/boceto.tmbundle/`
2. **File type** (optional — for `.boceto` files): **Settings → Editor → File Types → Import** → select `plugins/boceto-intellij/boceto.xml`
3. **Live Templates** (snippets): **Settings → Editor → Live Templates → Import** → select `plugins/boceto-intellij/snippets.xml`

Snippets: `page`, `theme`, `nav`, `card`, `row`, `col`, `modal`, `tabs`, `field`, `fieldp`, `pick`, `btn`, `ghost`, `grid`, `kpi`, `badge`, `avatar`

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

### React
```jsx
import BocetoPreviewer from '@duvanjamid/boceto/plugins/boceto-react';

<BocetoPreviewer theme="blueprint" dsl={`
@Login
nav MiApp
field Email
btn Entrar > Dashboard
`} />
```

### Vue 3
```js
import BocetoPreviewer from '@duvanjamid/boceto/plugins/boceto-vue';
app.component('BocetoPreviewer', BocetoPreviewer);
```
```html
<BocetoPreviewer theme="paper" :dsl="myDsl" />
```

### remark / MDX / Astro / Next.js
```js
// astro.config.mjs or next.config.mjs
import remarkBoceto from '@duvanjamid/boceto/plugins/boceto-remark';
// { remarkPlugins: [remarkBoceto] }
// or: [remarkBoceto, { scriptSrc: 'https://unpkg.com/@duvanjamid/boceto/plugins/boceto-web-component.js' }]
```
Then use ` ```boceto ``` ` blocks in any `.md` / `.mdx` file.

### VSCode Extension
Full extension with language support, syntax highlighting and snippets in `plugins/boceto-vscode/`.
To install manually: copy the folder and load via "Install from VSIX" or use the extension development host.

### Obsidian
Copy `plugins/boceto-obsidian/` into `<vault>/.obsidian/plugins/boceto-previewer/`, then enable under **Settings → Community plugins**. ` ```boceto ``` ` blocks render as interactive wireframes in Reading view.

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
