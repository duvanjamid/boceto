# Technical Spec: AI & MCP Page Improvements

**ID**: ai-mcp-page-improvements
**Date**: 2026-05-28
**Based on**: functional/ai-mcp-page-improvements.md

## Architecture Overview

Dos cambios independientes:
1. **HTML/CSS** — eliminar el `<header class="mcp__header">` del componente `AiToolsComponent` y limpiar el CSS asociado.
2. **Pipe** — extender `CodeHighlightPipe` con un segundo parámetro `theme: 'dark' | 'light'` y definir paletas separadas para cada modo. Actualizar todas las llamadas al pipe en `ai-tools.component.html`.

## Modified Files

| File | Change |
|------|--------|
| `src/app/ai-tools/ai-tools.component.html` | Eliminar bloque `<header class="mcp__header">...</header>` (líneas 2–19). Pasar `theme.dark() ? 'dark' : 'light'` como segundo arg al pipe en todos los `codeHighlight` calls. |
| `src/app/ai-tools/ai-tools.component.css` | Eliminar todas las reglas de `.mcp__header`, `.mcp__logo*`, `.mcp__header-*`, `.mcp__theme-btn`. Ajustar `mcp__body` y `mcp__sidebar` de `54px` → `58px` (altura de la navbar global). |
| `src/code-highlight.pipe.ts` | Añadir segundo parámetro `themeName: 'dark' | 'light' = 'dark'`. Definir paleta dark (actual) y paleta light. Seleccionar paleta al inicio de `transform()`. Cambiar `pure: false` para que Angular reevalúe cuando cambia la señal del tema. |

## New Files
Ninguno.

## Data Model Changes
Ninguno.

## API / Interface Changes

`CodeHighlightPipe.transform(value, lang, themeName?)` — nuevo tercer parámetro opcional:
```ts
transform(value: string, lang: CodeLang = 'ts', themeName: 'dark' | 'light' = 'dark'): SafeHtml
```
> Backward-compatible: todas las llamadas existentes siguen funcionando (default `'dark'`).

## Paletas de color

### Dark (actual, sin cambios)
```ts
keyword: '#c084fc'   // lila
string:  '#4ade80'   // verde
number:  '#fbbf24'   // ámbar
type:    '#a78bfa'   // violeta
key:     '#5eead4'   // cyan
comment: '#4a4760'   // gris oscuro
tag:     '#f87171'   // rojo
attr:    '#60a5fa'   // azul
plain:   '#c4c0e0'   // lavanda claro
```

### Light (nueva)
```ts
keyword: '#7c3aed'   // púrpura
string:  '#16a34a'   // verde oscuro
number:  '#d97706'   // ámbar oscuro
type:    '#6d28d9'   // violeta oscuro
key:     '#0e7490'   // cyan oscuro
comment: '#6b7280'   // gris
tag:     '#dc2626'   // rojo
attr:    '#2563eb'   // azul
plain:   '#1a1630'   // tinta (= --s-ink light)
```

## State Management

`theme.dark()` es una señal de `ShellThemeService`. La template expression `theme.dark() ? 'dark' : 'light'` se reevalúa automáticamente cuando la señal cambia. Con `pure: false` en el pipe, Angular llama a `transform()` en cada ciclo de detección de cambios, garantizando la actualización en tiempo real.

> Alternativa más eficiente: mantener `pure: true` y pasar explícitamente el string `'dark'|'light'` como argumento (la template ya hace eso, el pipe compara argumentos y solo recalcula si cambian). Usaremos esta opción para no perder la optimización de pure pipes.

## Error Handling Strategy
No hay estados de error. El pipe siempre devuelve HTML (en el peor caso, texto plano escapado).

## CSS Layout adjustments

`mcp__body`:
```css
/* antes */  min-height: calc(100vh - 54px);   /* relativo al header interno */
/* después */ min-height: calc(100vh - 58px);   /* relativo a la navbar global */
```

`mcp__sidebar`:
```css
/* antes */  top: 54px; height: calc(100vh - 54px);
/* después */ top: 58px; height: calc(100vh - 58px);
```

## Test Strategy
- Unit tests: no aplica para este cambio (pipe puro sin lógica de negocio compleja; el proyecto no tiene test runner configurado aún).
- Visual: verificar manualmente en modo dark y light que los bloques de código muestren colores legibles.
- Build: `npm run build` debe pasar sin errores ni budget warnings.
