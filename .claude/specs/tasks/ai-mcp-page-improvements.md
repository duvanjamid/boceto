# Task List: AI & MCP Page Improvements

**ID**: ai-mcp-page-improvements
**Total tasks**: 5
**Completed**: 0 / 5

---

## TASK-001 — Eliminar header HTML
- **Status**: ⏳ pending
- **Depends on**: none
- **Estimate**: S
- **Description**: Borrar el bloque `<header class="mcp__header">...</header>` de `ai-tools.component.html` (incluye logo, links de navegación y botón de tema).
- **Files**: `src/app/ai-tools/ai-tools.component.html`
- **Done when**: El header interno ya no aparece en el DOM. La página arranca directamente con `mcp__body`.

## TASK-002 — Limpiar CSS del header y ajustar layout
- **Status**: ⏳ pending
- **Depends on**: none
- **Estimate**: S
- **Description**: Eliminar todas las reglas CSS asociadas al header eliminado (`.mcp__header`, `.mcp__logo`, `.mcp__logo-mark`, `.mcp__logo-text`, `.mcp__header-title`, `.mcp__header-actions`, `.mcp__header-link`, `.mcp__theme-btn`). Ajustar `mcp__body` y `mcp__sidebar` de `54px` a `58px` para alinearse con la navbar global.
- **Files**: `src/app/ai-tools/ai-tools.component.css`
- **Done when**: No quedan reglas huérfanas del header. El sidebar queda sticky justo debajo de la navbar global.

## TASK-003 — Extender CodeHighlightPipe con paleta light
- **Status**: ⏳ pending
- **Depends on**: none
- **Estimate**: M
- **Description**: Añadir un tercer parámetro opcional `themeName: 'dark' | 'light' = 'dark'` a `transform()`. Definir la paleta light. Seleccionar paleta según el argumento recibido. El pipe se mantiene `pure: true`.
- **Files**: `src/app/code-highlight.pipe.ts`
- **Done when**: El pipe acepta `'light'` y devuelve colores legibles sobre fondo claro. Las llamadas existentes sin tercer argumento siguen funcionando (default `'dark'`).

## TASK-004 — Pasar tema al pipe en el template
- **Status**: ⏳ pending
- **Depends on**: TASK-003
- **Estimate**: S
- **Description**: En `ai-tools.component.html`, actualizar los 5 calls a `codeHighlight` para pasar `theme.dark() ? 'dark' : 'light'` como tercer argumento.
- **Files**: `src/app/ai-tools/ai-tools.component.html`
- **Done when**: Todos los bloques de código responden al tema activo en tiempo real.

## TASK-005 — Build de producción y verificación visual
- **Status**: ⏳ pending
- **Depends on**: TASK-001, TASK-002, TASK-003, TASK-004
- **Estimate**: S
- **Description**: Correr `npm run build` y confirmar que pasa sin errores ni budget warnings. Verificar visualmente que la página se ve correcta en dark y light mode.
- **Files**: ninguno (solo verificación)
- **Done when**: `npm run build` termina sin errores. Syntax highlighting correcto en ambos temas.

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

TASK-001, TASK-002, TASK-003 → en paralelo (independientes)
TASK-004 → después de TASK-003
TASK-005 → después de todo
