# Functional Spec: AI & MCP Page Improvements

**ID**: ai-mcp-page-improvements
**Date**: 2026-05-28
**Status**: approved

## Description
La página `/ai-tools` tiene dos problemas de UX: un header interno duplicado que repite la navegación global, y un syntax highlighting que no respeta el tema visual de la app (light/dark). Esta feature elimina el header redundante y mejora el resaltado de código para que sea coherente con el tema activo.

## User Stories
- As a developer visiting `/ai-tools`, I want the navigation to be consistent with the rest of the site so that I don't see two navbars stacked on top of each other.
- As a developer reading code snippets on the page, I want syntax highlighting that is readable and matches the app's current light/dark theme so that the code is easy to read in any context.

## Acceptance Criteria
- [ ] El header interno de la página (`mcp__header` con logo, links de plugins/componentes/editor y botón de tema) ya no se renderiza en ningún viewport.
- [ ] La navbar global cubre toda la navegación necesaria.
- [ ] Los bloques de código en la página usan un tema de syntax highlighting oscuro cuando el shell está en modo dark.
- [ ] Los bloques de código usan un tema claro cuando el shell está en modo light.
- [ ] El cambio de tema (botón ☀/🌙) actualiza el syntax highlighting en tiempo real sin recargar.
- [ ] El syntax highlighting es visualmente coherente con la paleta de la app (`--s-*` vars).

## UI/UX Behavior
- Al eliminar `mcp__header`, el cuerpo de la página (`mcp__body`) sube hasta justo debajo de la navbar global.
- Los bloques de código muestran keywords, strings, numbers y comentarios con colores diferenciados, adaptados al tema activo.
- Dark: fondo oscuro consistente con `--s-bg`, keywords en lila/azul, strings en verde, numbers en naranja.
- Light: fondo claro consistente con `--s-bg`, misma paleta pero versión clara legible.

## Edge Cases & Error Handling
- Si el usuario cambia el tema mientras lee un bloque de código, los colores se actualizan inmediatamente (el pipe depende de una señal reactiva).
- En mobile, sin el header interno, el layout no debe quebrarse (el `mcp__body` ya tiene `min-height: calc(100vh - 54px)` relativo a la navbar global).

## Out of Scope
- No se modifican otras páginas (plugins, docs, etc.).
- No se cambia la estructura de secciones ni el contenido de la página.
- No se agrega nuevo contenido ni herramientas MCP.
