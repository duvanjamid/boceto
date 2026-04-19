# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Boceto** is a text-based DSL for designing interactive UI wireframes. It serves dual purposes:
- A full product website with landing page + interactive editor (Angular 17)
- A distributable parser library for third-party integrations (Prism.js, Docsify, VSCode)

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (opens browser automatically)
npm run build     # Production build to dist/boceto/
```

Uses **Angular CLI** (`ng serve` / `ng build`). No test or lint scripts configured yet.

## Architecture

### Routing (`src/app/app.routes.ts`)
Hash-based routing (`withHashLocation`). Two routes:
- `/`       → `LandingComponent`
- `/editor` → `EditorShellComponent` (also reads `?w=base64dsl` from URL for sharing)

### Landing page (`src/app/landing/`)
Full marketing page with: hero (live wireframe preview), features grid, split code/preview demo, 4-theme previews, integrations (VSCode/Docsify/Prism), donations section (Ko-fi, GitHub Sponsors, Buy Me a Coffee), footer. Uses its own dark CSS — no `--s-*` shell vars. The `ngOnInit` sets paper theme CSS vars for the embedded wireframe previews.

### Editor shell (`src/app/editor/`)
Full editor component with Angular Signals. Additions over the basic editor:
- **Share**: `copyShareUrl()` encodes the DSL as base64 in `#/editor?w=…`, writes to clipboard, shows "¡Copiado!" feedback.
- **SVG Export**: `exportSvg()` uses `@ViewChild('previewFrame')` to get the preview element, wraps its innerHTML in an SVG `<foreignObject>` with all `--w-*` CSS vars inlined, and triggers a `.svg` file download — no external library needed.
- **Home link**: `routerLink="/"` back to landing page.
- URL param loading: on `ngOnInit`, reads `?w=` from `window.location.hash` and decodes it as the initial DSL.

### Parser (`src/parser.ts`)
Single source of truth. TypeScript class hierarchy: `NodeHandler` interface → `BaseHandler` (leaf nodes) → `ContainerHandler` (nodes with children). One concrete handler class per DSL keyword. `DSLParser` orchestrates the registry.

All Angular components import `parseDSL` from `src/parser.ts`. Package export (`package.json`) points here too.

**If you modify parser logic, also update inline parsers in:**
- `plugins/boceto-prism.js`
- `plugins/boceto-docsify.js`

### Dual theme system
- **Wireframe theme** (`paper` / `blueprint` / `sketch` / `noir`): set in DSL with `theme <name>`. Applied as CSS vars on `:root` (`--w-bg`, `--w-surface`, etc.) by an `effect()` in `EditorShellComponent` (and manually in `LandingComponent.ngOnInit` to paper defaults).
- **Shell theme** (light / dark): toggled by ☀/🌙 button. Sets `data-shell="light|dark"` on `<html>`. Variables `--s-bg`, `--s-ink`, `--s-accent`, etc. defined in `src/styles.css`.

### BocNodeComponent (`src/app/boceto-node.component.*`)
Recursive standalone component. Uses Angular 17 `@switch` control flow for 20+ DSL element types. Imports itself for recursive templates. All styles use `var(--w-*)` CSS properties — no `ngStyle` required.

### EditorComponent (`src/app/editor.component.ts`)
CodeMirror 6 wrapper. Custom Boceto DSL `StreamLanguage` in `src/boceto-lang.ts`. Uses `Compartment` to hot-swap dark/light highlight styles without rebuilding the editor. Separate `lightHighlight` and `darkHighlight` style definitions.

### Plugins (`plugins/`)
- `boceto-prism.js` — Prism.js grammar
- `boceto-docsify.js` — renders ` ```boceto ``` ` fenced blocks as interactive wireframes
- `boceto.tmLanguage.json` — TextMate grammar (VSCode/Sublime/Zed)

### Docs (`docs/README.md`)
Guide for embedding WireScript blocks in Markdown with the Docsify/Prism plugins.

## Boceto DSL Reference

```
theme paper|blueprint|sketch|noir|handwriting|arch  # Set theme (top of file)
@PageName                                            # Define a screen/page

# Heading / ## H2 / ### H3
p Text · note Hint · ---             # Paragraph, annotation, divider

nav Logo | Link | Link               # Top nav (use | or · to separate items)
tabs Tab1 | Tab2                     # Tab switcher (container; use --- to split per-tab content)
  content for tab 1
  ---
  content for tab 2
row [right|center|space]             # Horizontal flex container (alignment optional)
col                                  # Vertical flex column inside a row
card [Title] / card+ [Title]         # Card container; card+ adds × close button
aside                                # Sidebar panel
modal [Title]                        # Modal overlay with close button

field Label / field Label * / area   # Input, password, textarea
pick Label > Opt1 Opt2               # Dropdown
check Label / toggle Label           # Interactive checkbox / toggle (click to toggle)

btn Label [> Page] [$"css"]          # Primary button; $"css" applies inline styles
ghost Label [> Page] [$"css"]        # Outline button
link Label [> Page]                  # Inline link

img "Alt" / avatar Name              # Image placeholder / avatar with initials
badge Text [$"css"]                  # Status chip; use $"css" for colors
kpi Value Label                      # Large metric
grid Col1 | Col2                     # Table with mock rows (| or · as separator)
list | Item1 | Item2                 # Bulleted list

# Style modifier $"..." — applies any CSS inline to the element
# Examples:
btn Eliminar $"background:#dc2626"
badge Activo $"background:#dcfce7;color:#166534;border-color:#86efac"
card $"border-color:#7c3aed;border-width:2px"
nav App | Inicio $"background:#1a1630"
```

## Package Exports (library API, unchanged)

```json
{
  ".":                 "src/parser.js",
  "./themes":          "src/themes.js",
  "./plugins/prism":   "plugins/boceto-prism.js",
  "./plugins/docsify": "plugins/boceto-docsify.js"
}
```
