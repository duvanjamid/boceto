# WireScript ⬡

A plain-text DSL for designing interactive UI wireframes — navigate between screens, switch themes, and modify with AI.

```wire
theme paper

@Login
  nav MyApp
  # Welcome back
  field Email
  field Password *
  btn Sign in > Dashboard
  link Forgot password? > Reset
```

**→ Renders as a clickable wireframe. `btn` navigates. AI rewrites on request.**

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Language reference

### Pages
```
@PageName          — defines a screen (no spaces, use CamelCase or _)
```

### Typography
```
# Big heading      — H1
## Medium heading  — H2
### Small heading  — H3
p  Body text       — paragraph
note Hint text     — muted annotation
---                — horizontal divider
```

### Navigation & layout
```
nav Logo · Link · Link   — top navbar  (· separates items)
tabs Tab1 · Tab2 · Tab3  — tab bar
row                      — horizontal flex container (indent children 2 spaces)
card                     — bordered card  (optional: card My title)
aside                    — left sidebar panel
```

### Forms
```
field Label          — text input
field Label *        — password input  (* suffix)
field Label ?        — optional field  (? suffix)
area  Label          — textarea
pick  Label > A B C  — select/dropdown with options
check Label          — checkbox
toggle Label         — toggle switch
```

### Actions
```
btn   Label > PageName   — primary button, navigates to @PageName
ghost Label > PageName   — outline/secondary button
link  Label > PageName   — inline link
```
> Omit `> PageName` to render a static (non-navigating) element.

### Content & data
```
img    "Description"     — image placeholder
avatar Name              — circular avatar with initials
badge  Text              — small chip/label
kpi    Value Label       — large metric  (e.g. kpi 94% Satisfaction)
grid   Col1 · Col2 · Col3 — table with mock rows
list   · Item1 · Item2   — bulleted list  (· separates items)
```

### Themes
```
theme paper      ☕ warm cream (default)
theme blueprint  📐 technical blue
theme sketch     ✏️  clean black & white
theme noir       🌙 dark minimal
```

Declare once at the top of the file, before any `@Page`.

---

## Plugins

### VSCode / Sublime / Zed / TextMate
Copy `plugins/wirescript.tmLanguage.json` into your editor's extension folder.  
For VSCode, add to `contributes.grammars` in your extension's `package.json`:

```json
{
  "language": "wire",
  "scopeName": "source.wire",
  "path": "./wirescript.tmLanguage.json"
}
```

### Prism.js (any static site)
```html
<script src="prism.js"></script>
<script src="plugins/wirescript-prism.js"></script>

<pre><code class="language-wire">
@Login
  # Hello
  field Email
  btn Enter > Dashboard
</code></pre>
```

### Docsify
```html
<!-- index.html -->
<script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
<script src="plugins/wirescript-docsify.js"></script>
```

Then in any Markdown file:
````markdown
```wire
theme sketch

@Checkout
  # Payment details
  field Card number
  field Expiry *
  btn Pay now > Confirmation
```
````

The plugin renders an interactive wireframe with screen navigation inline.

---

## AI integration

WireScript is designed to be generated and edited by LLMs.  
Include this in your system prompt:

```
You are a wireframe expert. Use WireScript syntax:
  theme paper|blueprint|sketch|noir
  @PageName
  # H1 / ## H2 / p text / note hint / ---
  nav Logo · Link    (· separates items)
  field Label (* password, ? optional)
  area / pick Label > Op1 Op2 / check / toggle
  btn Label > Page / ghost Label > Page / link Label > Page
  kpi Value Label / grid Col1 · Col2 / list · Item1 · Item2
  row / card / card Title / aside  (indent children 2 spaces)

Reply ONLY with WireScript. No markdown, no backticks.
```

The built-in ✦ AI tab already has this prompt configured.

---

## Project structure

```
wirescript/
├── src/
│   ├── main.jsx          — React entry point
│   ├── App.jsx           — Main editor (Figma-like UI)
│   ├── parser.js         — DSL parser  (framework-agnostic)
│   └── themes.js         — Theme token maps
├── plugins/
│   ├── wirescript-prism.js      — Prism.js language plugin
│   ├── wirescript-docsify.js    — Docsify plugin (render + nav)
│   └── wirescript.tmLanguage.json — TextMate grammar (VSCode, Sublime, Zed)
├── docs/
│   └── index.html        — Full documentation site
├── examples/
│   └── saas-app.wire     — Example wireframe file
├── index.html            — Vite HTML entry
├── vite.config.js
└── package.json
```

---

## License

MIT © WireScript contributors
