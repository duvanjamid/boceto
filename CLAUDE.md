# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Boceto** is a text-based DSL for designing interactive UI wireframes. It serves dual purposes:
- A full product website with landing page + interactive editor (Angular 17)
- A distributable parser library for third-party integrations (Web Component, React, Vue, remark, Prism.js, Docsify, VSCode, Obsidian, IntelliJ)

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (opens browser automatically)
npm run build        # Production build to dist/boceto/
npm run preview      # Serve production build locally
npm run build:lib    # Compile parser library to dist/lib/ (runs before npm publish)
```

Uses **Angular CLI** (`ng serve` / `ng build`). No test or lint scripts configured yet.

## Architecture

### Routing (`src/app/app.routes.ts`)
Hash-based routing (`withHashLocation`). Routes:
- `/`            → `LandingComponent`
- `/editor`      → `PlaygroundComponent` (reads `?w=base64dsl` from URL hash for sharing)
- `/view`        → `ViewerComponent` (read-only wireframe viewer)
- `/embed`       → `EmbedComponent` (embedding instructions)
- `/docs`        → `DocsComponent`
- `/docs/embed`  → `EmbedGuideComponent`
- `/plugins`     → `PluginsComponent`
- `/license`     → `LicenseComponent`

### Landing page (`src/app/landing/`)
Full marketing page. Uses its own dark CSS — no `--s-*` shell vars. The `ngOnInit` sets paper theme CSS vars for the embedded wireframe previews.

### Playground (`src/app/playground/`)
Full editor component (`PlaygroundComponent`) with Angular Signals. Key features:
- **Share**: `copyShareUrl()` encodes the DSL as base64 in `#/editor?w=…`, writes to clipboard, shows "¡Copiado!" feedback.
- **SVG Export**: `exportSvg()` wraps the preview's innerHTML in an SVG `<foreignObject>` with all `--w-*` CSS vars inlined, triggers a `.svg` download.
- **Home link**: `routerLink="/"` back to landing page.
- URL param loading: on `ngOnInit`, reads `?w=` from `window.location.hash` and decodes it as the initial DSL.

### Parser (`src/parser.ts`)
Single source of truth for DSL parsing. TypeScript class hierarchy: `NodeHandler` interface → `BaseHandler` (leaf nodes) → `ContainerHandler` (nodes with children). One concrete handler class per DSL keyword. `DSLParser` orchestrates the registry.

All Angular components import `parseDSL` from `src/parser.ts`. The published npm package builds to `dist/lib/parser.js`.

**If you modify parser logic, also update inline parsers in:**
- `plugins/boceto-prism.js`
- `plugins/boceto-docsify.js`

### Type system (`src/types.ts`)
Core types: `WireNode`, `WirePage`, `ParsedDSL`, `ThemeName`, `FrameType`. Also exports `THEMES` (token maps for all 8 themes) and `THEME_ICONS`.

### Dual theme system
- **Wireframe theme** (`paper` / `blueprint` / `sketch` / `noir` / `handwriting` / `arch` / `cyberpunk` / `dots`): set in DSL with `theme <name>`. Applied as CSS vars on `:root` (`--w-bg`, `--w-surface`, etc.) by an `effect()` in `PlaygroundComponent` (and manually in `LandingComponent.ngOnInit` to paper defaults).
- **Shell theme** (light / dark): toggled by ☀/🌙 button. Managed by `ShellThemeService`. Sets `data-shell="light|dark"` on `<html>`. Variables `--s-bg`, `--s-ink`, `--s-accent`, etc. defined in `src/styles.css`.

### BocNodeComponent (`src/app/boceto-node.component.*`)
Recursive standalone component. Uses Angular 17 `@switch` control flow for 20+ DSL element types. Imports itself for recursive templates. All styles use `var(--w-*)` CSS properties — no `ngStyle` required.

### EditorComponent (`src/app/editor.component.ts`)
CodeMirror 6 wrapper. Custom Boceto DSL `StreamLanguage` in `src/boceto-lang.ts`. Uses `Compartment` to hot-swap dark/light highlight styles without rebuilding the editor.

### Plugins (`plugins/`)
- `boceto-web-component.js` — zero-dep Web Component (`<boceto-preview>`)
- `boceto-react.jsx` — React `BocetoPreviewer` component
- `boceto-vue.js` — Vue 3 `BocetoPreviewer` component
- `boceto-remark.js` — remark/MDX/Astro/Next.js plugin
- `boceto-prism.js` — Prism.js grammar
- `boceto-docsify.js` — renders ` ```boceto ``` ` fenced blocks as interactive wireframes
- `boceto.tmLanguage.json` — TextMate grammar (VSCode/Sublime/Zed)
- `boceto-vscode/` — full VSCode extension
- `boceto-obsidian/` — Obsidian community plugin
- `boceto-intellij/` — IntelliJ/WebStorm/PyCharm bundle
- `boceto-ai-tools.js` — Schemas para Anthropic/OpenAI/Google + `handleToolCall(name, input)` + `DSL_REFERENCE` + `SYSTEM_PROMPT`. Herramientas: `parse_boceto`, `get_dsl_reference`, `open_in_editor`. Requiere `dist/lib/parser.js`.
- `boceto-mcp.js` — Servidor MCP stdio. Terceros lo usan vía `npx -y --package=@duvanjamid/boceto boceto-mcp` sin instalar nada.
- `boceto-mcp-http.js` — Servidor MCP remoto HTTP (`StreamableHTTPServerTransport`). Escucha en `PORT` (default 3100) en `/mcp`. Deploy con `npm run mcp:serve`. Clientes conectan con `{ "url": "https://boceto.online/mcp" }`.

## Boceto DSL Reference

```
// Comment line (ignored by parser)

theme paper|blueprint|sketch|noir|handwriting|arch|cyberpunk|dots  # Set theme (top of file)
frame ios|android|browser|auto                                     # Device frame (top of file)

@PageName                                    # Define a screen/page

# Heading / ## H2 / ### H3
p Text · note Hint · ---                     # Paragraph, annotation, divider

nav Logo | Link | Link                       # Top nav (use | or · to separate items)
tabs Tab1 | Tab2                             # Tab switcher (container; use --- to split per-tab content)
  content for tab 1
  ---
  content for tab 2
row [right|center|space]                     # Horizontal flex container (alignment optional)
col                                          # Vertical flex column inside a row
card [Title] / card+ [Title]                 # Card container; card+ adds × close button
aside                                        # Sidebar panel
modal [Title]                                # Modal overlay with close button

field Label [*] [?]                          # Input; * = required/password, ? = optional
area [Label] [?]                             # Textarea; ? = optional
pick Label | Opt1 | Opt2                     # Dropdown (| separates options)
check Label [*]                              # Checkbox; * = pre-checked
toggle Label [*]                             # Toggle switch; * = pre-checked

btn Label [> @Page] [$"css"]                 # Primary button; > @Page navigates on click
ghost Label [> @Page] [$"css"]               # Outline button
link Label [> @Page]                         # Inline link

img "Alt" / avatar Name                      # Image placeholder / avatar with initials
badge Text [$"css"]                          # Status chip
kpi Value Label                              # Large metric display
grid Col1 | Col2                             # Table with mock rows (| as separator)
list | Item1 | Item2                         # Bulleted list

# Style modifier $"..." — applies any CSS inline to the element
btn Eliminar $"background:#dc2626"
badge Activo $"background:#dcfce7;color:#166534;border-color:#86efac"
card $"border-color:#7c3aed;border-width:2px"
nav App | Inicio $"background:#1a1630"
```

## Package Exports (library API)

```json
{
  ".": "dist/lib/parser.js",
  "./themes": "src/themes.js",
  "./plugins/web-component": "plugins/boceto-web-component.js",
  "./plugins/react": "plugins/boceto-react.jsx",
  "./plugins/vue": "plugins/boceto-vue.js",
  "./plugins/remark": "plugins/boceto-remark.js",
  "./plugins/prism": "plugins/boceto-prism.js",
  "./plugins/docsify": "plugins/boceto-docsify.js",
  "./plugins/ai-tools": "plugins/boceto-ai-tools.js"
}
```
