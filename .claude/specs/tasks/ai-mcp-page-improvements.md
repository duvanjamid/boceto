# Task List: AI & MCP Page Improvements

**ID**: ai-mcp-page-improvements
**Total tasks**: 5
**Completed**: 5 / 5

---

## TASK-001 — Eliminar header HTML
- **Status**: ✅ complete
- **Depends on**: none
- **Estimate**: S
- **Description**: Borrar el bloque `<header class="mcp__header">...</header>` de `ai-tools.component.html`.
- **Files**: `src/app/ai-tools/ai-tools.component.html`

## TASK-002 — Limpiar CSS del header y ajustar layout
- **Status**: ✅ complete
- **Depends on**: none
- **Estimate**: S
- **Description**: Eliminar reglas CSS del header eliminado. Ajustar `mcp__body` y `mcp__sidebar` de `54px` → `58px`.
- **Files**: `src/app/ai-tools/ai-tools.component.css`

## TASK-003 — Extender CodeHighlightPipe con paleta light
- **Status**: ✅ complete
- **Depends on**: none
- **Estimate**: M
- **Description**: Añadir tercer parámetro `themeName: 'dark' | 'light' = 'dark'`. Definir paleta LIGHT.
- **Files**: `src/app/code-highlight.pipe.ts`

## TASK-004 — Pasar tema al pipe en el template
- **Status**: ✅ complete
- **Depends on**: TASK-003
- **Estimate**: S
- **Description**: Actualizar los 5 calls a `codeHighlight` para pasar `theme.dark() ? 'dark' : 'light'`.
- **Files**: `src/app/ai-tools/ai-tools.component.html`

## TASK-005 — Build de producción y verificación visual
- **Status**: ✅ complete
- **Depends on**: TASK-001, TASK-002, TASK-003, TASK-004
- **Estimate**: S
- **Description**: `npm run build` pasó sin errores. Bundle 774 kB (dentro del budget).
- **Files**: ninguno

---

## Dependency Graph

```
TASK-001 ──┐
TASK-002 ──┤── TASK-005
TASK-003 ──┤
TASK-004 ──┘
    ↑
TASK-003
```
