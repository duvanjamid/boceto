/**
 * @module parser
 * @fileoverview Boceto DSL Parser — Converts plain-text Boceto DSL source into
 * a structured AST of pages and wireframe nodes ({@link ParsedDSL}).
 *
 * Boceto is a declarative, indentation-based Domain-Specific Language designed
 * for rapidly prototyping interactive wireframes. Each `.boceto` file describes
 * one or more screens (`@ScreenName`) containing UI elements (headings, fields,
 * buttons, containers, etc.) using simple keyword tokens.
 *
 * **DSL reference:** See `DSL.md` for the full language specification.
 *
 * ### Architecture
 *
 * The parser follows a **Strategy + Registry** pattern:
 *
 * ```
 * NodeHandler (interface)
 *   └─ BaseHandler (abstract)       — leaf nodes (no children)
 *       └─ ContainerHandler (abstract) — nodes that own children
 * DSLParser — orchestrates line-by-line parsing via handler registry
 * ```
 *
 * Each DSL keyword (e.g. `field`, `btn`, `row`, `card`) is handled by a
 * dedicated {@link NodeHandler} implementation. The {@link DSLParser} iterates
 * through lines, delegates to the first matching handler, and manages an
 * indentation-based stack to build parent-child relationships.
 *
 * ### Supported themes
 *
 * The parser extracts a `theme` directive (must precede the first `@`). Valid
 * values: `paper` (default), `blueprint`, `sketch`, `noir`, `handwriting`, `arch`.
 *
 * ### Public API
 *
 * ```ts
 * import { parseDSL } from './parser';
 * const result: ParsedDSL = parseDSL(source);
 * ```
 *
 * @see {@link parseDSL} — the single entry point.
 * @see {@link DSLParser} — the core parser class.
 */

import type { WireNode, WirePage, ParsedDSL } from './types';

// ── Parsing helpers ──────────────────────────────────────────────────────────

/**
 * Removes surrounding single or double quotes from a string and trims whitespace.
 *
 * @param s - Raw string potentially wrapped in quotes.
 * @returns The unquoted, trimmed string.
 *
 * @example
 * unquote('"Hello"')  // → 'Hello'
 * unquote("'World'")  // → 'World'
 * unquote('  Plain ')  // → 'Plain'
 */

const unquote  = (s: string): string =>
  s.replace(/^["']|["']$/g, '').trim();

/**
 * Splits a string by the `|` or `·` (middle-dot) separators, trims each
 * segment, and filters out empty results.
 *
 * Used to parse multi-item elements like `nav`, `tabs`, `grid`, `pick`, and `list`.
 *
 * @param s - The raw segment string (e.g. `"App | Inicio | Ajustes"`).
 * @returns An array of trimmed, non-empty items.
 *
 * @example
 * splitDot('App | Inicio | Perfil') // → ['App', 'Inicio', 'Perfil']
 * splitDot('App · Inicio · Perfil') // → ['App', 'Inicio', 'Perfil']
 */
const splitDot = (s: string): string[] =>
  s.split(/[·|]/).map(x => x.trim()).filter(Boolean);

/**
 * Extracts the navigation target from a `> @ScreenName` suffix.
 *
 * In the Boceto DSL, `btn`, `ghost`, and `link` elements can navigate to
 * another screen using the syntax `> @TargetScreen` at the end of the line.
 * The `@` prefix mirrors the screen declaration syntax (`@ScreenName`).
 *
 * @param s - The raw token rest string (e.g. `"Entrar > @Dashboard"`).
 * @returns The target screen name (without `@`), or `null` if no target.
 *
 * @example
 * arrowT('Entrar > @Dashboard') // → 'Dashboard'
 * arrowT('Guardar')             // → null
 */
const arrowT   = (s: string): string | null => {
  const m = s.match(/>\s*@(\w+)\s*$/);
  return m ? m[1] : null;
};

/**
 * Strips the `> @ScreenName` navigation suffix from a string, returning only
 * the label/content portion.
 *
 * @param s - The raw string (e.g. `"Enviar > @Confirmación"`).
 * @returns The string without the arrow target, trimmed.
 *
 * @example
 * noArrow('Enviar > @Confirmación') // → 'Enviar'
 * noArrow('Guardar')                // → 'Guardar'
 */
const noArrow  = (s: string): string =>
  s.replace(/>\s*@\w+\s*$/, '').trim();

/**
 * Calculates the leading whitespace (indentation level) of a line.
 *
 * Indentation determines parent-child hierarchy in the Boceto DSL.
 * Container elements (e.g. `row`, `card`, `modal`) expect their children to
 * be indented by 2 spaces.
 *
 * @param l - A raw line from the DSL source.
 * @returns The number of leading whitespace characters.
 *
 * @example
 * getIndent('  btn Save')  // → 2
 * getIndent('# Title')     // → 0
 */
const getIndent = (l: string): number =>
  (l.match(/^(\s*)/) as RegExpMatchArray)[1].length;

/**
 * Regular expression that captures the inline style modifier `$"css"` at the
 * end of a DSL line.
 *
 * In the Boceto DSL, any element can have custom CSS injected via the
 * `$"property:value;..."` suffix. This regex extracts the CSS string inside
 * the double quotes.
 *
 * @example
 * 'btn Eliminar $"background:#dc2626"'.match(STYLE_RE)
 * // → captures 'background:#dc2626'
 */
const STYLE_RE = /\s*\$"([^"]*)"\s*$/;

// ── Node handler interface ───────────────────────────────────────────────────

/**
 * Strategy interface for DSL keyword handlers.
 *
 * Each handler is responsible for recognising a specific DSL keyword (or
 * family of keywords) and converting the raw line into a {@link WireNode}.
 *
 * Handlers are registered in priority order inside {@link DSLParser.handlers}.
 * The parser iterates through the list and uses the **first** handler whose
 * {@link canHandle} returns `true`.
 */
interface NodeHandler {
  /** Whether this handler produces a container node that can own children. */
  readonly isContainer: boolean;

  /**
   * Whether this handler produces a multi-item node where individual items
   * can carry their own `$"css"` modifiers (e.g. `nav`, `tabs`, `grid`,
   * `list`, `pick`).
   *
   * When `true`, the parser **skips** line-level `$"..."` extraction so that
   * per-item styles remain embedded in each item string. The renderer is
   * responsible for extracting styles via `iText()` / `iStyle()` at render time.
   */
  readonly hasItemStyles: boolean;

  /**
   * Tests whether this handler can parse the given trimmed line.
   *
   * @param token - The full trimmed line (after style extraction), e.g. `"btn Guardar"`.
   * @returns `true` if this handler should process the line.
   */
  canHandle(token: string): boolean;

  /**
   * Parses a DSL line into a {@link WireNode}.
   *
   * @param token - The full trimmed line.
   * @param rest  - Everything after the first whitespace-separated token
   *                (e.g. for `"btn Guardar"`, rest is `"Guardar"`).
   * @returns A new {@link WireNode} representing the parsed element.
   */
  parse(token: string, rest: string): WireNode;
}

// ── Abstract base handlers ───────────────────────────────────────────────────

/**
 * Abstract base class for **leaf** node handlers (elements without children).
 *
 * Subclasses must implement {@link canHandle} and {@link parse}.
 * `isContainer` defaults to `false`.
 */
abstract class BaseHandler implements NodeHandler {
  /** @returns Always `false` — leaf nodes do not have children. */
  get isContainer(): boolean { return false; }
  /** @returns `false` by default — override in multi-item handlers. */
  get hasItemStyles(): boolean { return false; }
  abstract canHandle(token: string): boolean;
  abstract parse(token: string, rest: string): WireNode;
}

/**
 * Abstract base class for **container** node handlers.
 *
 * Container nodes (e.g. `row`, `col`, `card`, `modal`, `tabs`, `aside`) can
 * own child nodes via indentation. The parser pushes them onto a stack so
 * subsequent indented lines become their children.
 */
abstract class ContainerHandler extends BaseHandler {
  /** @returns Always `true` — container nodes accept indented children. */
  override get isContainer(): boolean { return true; }
}

// ── Leaf node handlers ───────────────────────────────────────────────────────

/**
 * Handles the `---` keyword — a horizontal divider / separator.
 *
 * DSL syntax:
 * ```boceto
 * ---
 * ```
 *
 * Also used inside `tabs` to delimit content between tab panes.
 */
class DividerHandler extends BaseHandler {
  canHandle(t: string): boolean { return t === '---'; }
  parse(): WireNode { return { type: 'divider' }; }
}

/**
 * Handles `# H1`, `## H2`, and `### H3` headings.
 *
 * DSL syntax:
 * ```boceto
 * # Título grande
 * ## Subtítulo
 * ### Sección
 * ```
 *
 * Produces a node with `type` set to `'h1'`, `'h2'`, or `'h3'` and `text`
 * containing the heading content (without the `#` prefix).
 */
class HeadingHandler extends BaseHandler {
  canHandle(t: string): boolean { return /^#{1,3} /.test(t); }
  parse(t: string): WireNode {
    const lvl = (t.match(/^(#+)/) as RegExpMatchArray)[1].length;
    return { type: `h${lvl}` as 'h1' | 'h2' | 'h3', text: t.replace(/^#+\s*/, '') };
  }
}

/**
 * Handles `p` — a body paragraph.
 *
 * DSL syntax:
 * ```boceto
 * p Este es un párrafo de cuerpo.
 * ```
 */
class ParaHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('p '); }
  parse(_t: string, rest: string): WireNode { return { type: 'para', text: unquote(rest) }; }
}

/**
 * Handles `note` — a secondary annotation / helper text.
 *
 * DSL syntax:
 * ```boceto
 * note Esta es una anotación secundaria.
 * ```
 */
class NoteHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('note '); }
  parse(_t: string, rest: string): WireNode { return { type: 'note', text: unquote(rest) }; }
}

/**
 * Handles `nav` — a top navigation bar.
 *
 * DSL syntax:
 * ```boceto
 * nav MiApp | Inicio | Proyectos | Ajustes
 * ```
 *
 * The first item is treated as the logo/app name; subsequent items are links.
 * Items are separated by `|` or `·`.
 *
 * **Per-item styles**: Each item can carry its own `$"css"` modifier:
 * ```boceto
 * nav App | Inicio $"color:#a78bfa" | Proyectos
 * ```
 * The `$"..."` remains in the item string for the renderer to extract.
 */
class NavHandler extends BaseHandler {
  /** @returns `true` — nav items support per-item `$"css"` modifiers. */
  override get hasItemStyles(): boolean { return true; }
  canHandle(t: string): boolean { return t.startsWith('nav '); }
  parse(_t: string, rest: string): WireNode { return { type: 'nav', items: splitDot(rest) }; }
}

/**
 * Handles `field` — a text input field.
 *
 * DSL syntax:
 * ```boceto
 * field Email
 * field Contraseña *   // password (shows ••••••••)
 * field Apodo ?        // optional field
 * ```
 *
 * Modifiers:
 * - Trailing `*` → password field ({@link WireNode.password} = `true`).
 * - Trailing `?` → optional field ({@link WireNode.optional} = `true`).
 */
class FieldHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('field '); }
  parse(_t: string, rest: string): WireNode {
    const pw = rest.trimEnd().endsWith('*');
    const op = rest.trimEnd().endsWith('?');
    return {
      type: 'field',
      label: unquote(noArrow(rest).replace(/[*?]$/, '').trim()),
      password: pw,
      optional: op,
    };
  }
}

/**
 * Handles `area` — a multi-line textarea input.
 *
 * DSL syntax:
 * ```boceto
 * area Descripción del proyecto
 * ```
 */
class AreaHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('area '); }
  parse(_t: string, rest: string): WireNode { return { type: 'area', label: unquote(rest) }; }
}

/**
 * Handles `pick` — a dropdown / select input.
 *
 * DSL syntax:
 * ```boceto
 * pick País | Colombia | México | Chile | Argentina
 * ```
 *
 * The first item becomes the label; remaining items are the selectable options.
 *
 * **Per-item styles**: Options can carry `$"css"` modifiers:
 * ```boceto
 * pick Rol | Admin $"color:green" | Editor | Lector
 * ```
 */
class PickHandler extends BaseHandler {
  /** @returns `true` — pick options support per-item `$"css"` modifiers. */
  override get hasItemStyles(): boolean { return true; }
  canHandle(t: string): boolean { return t.startsWith('pick '); }
  parse(_t: string, rest: string): WireNode {
    const parts = splitDot(rest);
    return { type: 'pick', label: unquote(parts[0] ?? ''), options: parts.slice(1) };
  }
}

/**
 * Handles `check` — a checkbox input.
 *
 * DSL syntax:
 * ```boceto
 * check Aceptar términos y condiciones
 * check Notificaciones por email *    // checked by default
 * ```
 *
 * Trailing `*` sets `checked: true` (pre-checked state).
 */
class CheckHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('check '); }
  parse(_t: string, rest: string): WireNode {
    const ck = rest.trimEnd().endsWith('*');
    return {
      type: 'check',
      label: unquote(rest.trimEnd().replace(/\*$/, '').trim()),
      checked: ck || undefined,
    };
  }
}

/**
 * Handles `toggle` — an on/off switch.
 *
 * DSL syntax:
 * ```boceto
 * toggle Modo oscuro
 * toggle Notificaciones push *   // enabled by default
 * ```
 *
 * Trailing `*` sets `checked: true` (enabled state).
 */
class ToggleHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('toggle '); }
  parse(_t: string, rest: string): WireNode {
    const ck = rest.trimEnd().endsWith('*');
    return {
      type: 'toggle',
      label: unquote(rest.trimEnd().replace(/\*$/, '').trim()),
      checked: ck || undefined,
    };
  }
}

/**
 * Handles `btn` — a primary action button.
 *
 * DSL syntax:
 * ```boceto
 * btn Guardar
 * btn Enviar > @Confirmación     // navigates to @Confirmación
 * btn Eliminar $"background:#dc2626;color:white"
 * ```
 *
 * Supports `> @ScreenName` for inter-screen navigation.
 */
class BtnHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('btn '); }
  parse(_t: string, rest: string): WireNode {
    return { type: 'btn', label: unquote(noArrow(rest)), target: arrowT(rest) };
  }
}

/**
 * Handles `ghost` — a secondary / outline button.
 *
 * DSL syntax:
 * ```boceto
 * ghost Cancelar
 * ghost Ver todos > @Proyectos
 * ```
 *
 * Supports `> @ScreenName` for inter-screen navigation.
 */
class GhostHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('ghost '); }
  parse(_t: string, rest: string): WireNode {
    return { type: 'ghost', label: unquote(noArrow(rest)), target: arrowT(rest) };
  }
}

/**
 * Handles `link` — an inline text link.
 *
 * DSL syntax:
 * ```boceto
 * link ¿Olvidaste tu contraseña? > @Reset
 * link Ver documentación
 * ```
 *
 * Supports `> @ScreenName` for inter-screen navigation.
 */
class LinkHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('link '); }
  parse(_t: string, rest: string): WireNode {
    return { type: 'link', label: unquote(noArrow(rest)), target: arrowT(rest) };
  }
}

/**
 * Handles `img` — an image placeholder.
 *
 * DSL syntax:
 * ```boceto
 * img Foto de perfil
 * img Banner principal $"height:200px"
 * ```
 *
 * Renders a placeholder box with the label displayed inside.
 */
class ImgHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('img '); }
  parse(_t: string, rest: string): WireNode { return { type: 'img', label: unquote(noArrow(rest)), target: arrowT(rest) }; }
}

/**
 * Handles `avatar` — a circular avatar with auto-generated initials.
 *
 * DSL syntax:
 * ```boceto
 * avatar Juan Pérez
 * avatar Ana López $"background:#7c3aed"
 * ```
 *
 * The renderer extracts initials from the name (e.g. "JP" for "Juan Pérez").
 */
class AvatarHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('avatar '); }
  parse(_t: string, rest: string): WireNode { return { type: 'avatar', name: unquote(noArrow(rest)), target: arrowT(rest) }; }
}

/**
 * Handles `badge` — a small status chip / label.
 *
 * DSL syntax:
 * ```boceto
 * badge Activo
 * badge Pendiente $"background:#fef9c3;color:#854d0e"
 * badge Error $"background:#fee2e2;color:#991b1b"
 * ```
 */
class BadgeHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('badge '); }
  parse(_t: string, rest: string): WireNode { return { type: 'badge', text: unquote(noArrow(rest)), target: arrowT(rest) }; }
}

/**
 * Handles `kpi` — a large metric / key performance indicator.
 *
 * DSL syntax:
 * ```boceto
 * kpi 1.284 Usuarios activos
 * kpi 94% Tasa de retención
 * kpi $2.4M Ingresos
 * ```
 *
 * The first whitespace-delimited token is the `value`; the rest is the `label`.
 */
class KpiHandler extends BaseHandler {
  canHandle(t: string): boolean { return t.startsWith('kpi '); }
  parse(_t: string, rest: string): WireNode {
    const clean = noArrow(rest);
    const [v, ...r] = clean.split(/\s+/);
    return { type: 'kpi', value: v, label: r.join(' '), target: arrowT(rest) };
  }
}

/**
 * Handles `grid` — a data table with column headers and simulated rows.
 *
 * DSL syntax:
 * ```boceto
 * grid Nombre | Estado | Fecha | Acciones
 * ```
 *
 * Column headers are real text; row data is rendered as placeholder bars.
 *
 * **Per-column styles**: Column headers can carry `$"css"` modifiers:
 * ```boceto
 * grid Nombre $"color:red" | Estado | Fecha
 * ```
 */
class GridHandler extends BaseHandler {
  /** @returns `true` — grid columns support per-item `$"css"` modifiers. */
  override get hasItemStyles(): boolean { return true; }
  canHandle(t: string): boolean { return t.startsWith('grid '); }
  parse(_t: string, rest: string): WireNode { return { type: 'grid', cols: splitDot(rest) }; }
}

/**
 * Handles `list` — a bulleted list.
 *
 * DSL syntax:
 * ```boceto
 * list Revisión de diseño | Aprobación cliente | Deploy a producción
 * ```
 *
 * Items are separated by `|` or `·`.
 *
 * **Per-item styles**: List items can carry `$"css"` modifiers:
 * ```boceto
 * list Urgente $"color:red" | Normal | Baja prioridad
 * ```
 */
class ListHandler extends BaseHandler {
  /** @returns `true` — list items support per-item `$"css"` modifiers. */
  override get hasItemStyles(): boolean { return true; }
  canHandle(t: string): boolean { return t.startsWith('list '); }
  parse(_t: string, rest: string): WireNode { return { type: 'list', items: splitDot(rest) }; }
}

// ── Container handlers ───────────────────────────────────────────────────────

/**
 * Handles `tabs` — a tabbed container with panes.
 *
 * DSL syntax:
 * ```boceto
 * tabs General | Seguridad | Facturación
 *   field Nombre completo
 *   field Email
 *   ---
 *   field Contraseña actual *
 *   ---
 *   kpi $99 Plan actual
 * ```
 *
 * Tab names are separated by `|`. Use `---` dividers inside the children
 * to delimit content belonging to each tab pane.
 *
 * **Per-tab styles**: Tab labels can carry `$"css"` modifiers:
 * ```boceto
 * tabs Activos $"color:#16a34a" | Archivados | Eliminados
 * ```
 */
class TabsHandler extends ContainerHandler {
  /** @returns `true` — tab labels support per-item `$"css"` modifiers. */
  override get hasItemStyles(): boolean { return true; }
  canHandle(t: string): boolean { return t.startsWith('tabs '); }
  parse(_t: string, rest: string): WireNode {
    return { type: 'tabs', items: splitDot(rest), children: [] };
  }
}

/**
 * Handles `row` — a horizontal flex container.
 *
 * DSL syntax:
 * ```boceto
 * row              // default (left-aligned)
 * row right        // right-aligned
 * row center       // centered
 * row space        // space-between
 * ```
 *
 * Children are indented by 2 spaces beneath the `row` line.
 * The optional alignment modifier is stored in {@link WireNode.align}.
 */
class RowHandler extends ContainerHandler {
  canHandle(t: string): boolean { return t === 'row' || t.startsWith('row '); }
  parse(t: string): WireNode {
    return { type: 'row', align: t.length > 3 ? t.slice(4).trim() : '', children: [] };
  }
}

/**
 * Handles `col` — a vertical column, typically used inside a `row`.
 *
 * DSL syntax:
 * ```boceto
 * row
 *   col
 *     # Izquierda
 *   col
 *     # Derecha
 * ```
 */
class ColHandler extends ContainerHandler {
  canHandle(t: string): boolean { return t === 'col'; }
  parse(): WireNode { return { type: 'col', children: [] }; }
}

/**
 * Handles `card` and `card+` — a card container with optional title.
 *
 * DSL syntax:
 * ```boceto
 * card Proyectos recientes
 *   grid Nombre | Estado | Fecha
 *
 * card+
 *   p Esta tarjeta tiene botón de cerrar
 * ```
 *
 * - `card` renders a simple card with an optional title.
 * - `card+` adds a closable × button in the header ({@link WireNode.closable} = `true`).
 */
class CardHandler extends ContainerHandler {
  canHandle(t: string): boolean {
    return t === 'card' || t === 'card+' || t.startsWith('card ') || t.startsWith('card+ ');
  }
  parse(t: string, rest: string): WireNode {
    const cl = t.startsWith('card+');
    const tr = cl ? t.slice(5).trim() : rest;
    return { type: 'card', title: tr ? unquote(tr) : '', closable: cl, children: [] };
  }
}

/**
 * Handles `aside` — a lateral side panel.
 *
 * DSL syntax:
 * ```boceto
 * aside
 *   nav App | Inicio | Configuración
 *   avatar Juan Pérez
 * ```
 */
class AsideHandler extends ContainerHandler {
  canHandle(t: string): boolean { return t === 'aside'; }
  parse(): WireNode { return { type: 'aside', children: [] }; }
}

/**
 * Handles `modal` — a modal dialog overlay.
 *
 * DSL syntax:
 * ```boceto
 * modal Confirmar acción
 *   p ¿Estás seguro de eliminar este proyecto?
 *   row right
 *     ghost Cancelar
 *     btn Eliminar $"background:#dc2626"
 * ```
 */
class ModalHandler extends ContainerHandler {
  canHandle(t: string): boolean { return t === 'modal' || t.startsWith('modal '); }
  parse(_t: string, rest: string): WireNode {
    return { type: 'modal', title: rest ? unquote(rest) : '', children: [] };
  }
}

// ── DSL Parser ───────────────────────────────────────────────────────────────

/**
 * An entry in the parser's indentation stack, tracking a container node
 * and the column at which it was declared.
 */
type StackEntry = { indent: number; node: WireNode };

/**
 * Core Boceto DSL parser.
 *
 * Processes a multi-line DSL string and produces a {@link ParsedDSL} object
 * containing all screens (pages) and the selected theme.
 *
 * ### Algorithm
 *
 * 1. Split source into lines.
 * 2. For each non-empty, non-comment line:
 *    - Extract the `theme` directive (if before the first `@`).
 *    - Detect `@ScreenName` to start a new page.
 *    - Pop the indentation stack to find the correct parent.
 *    - Extract and strip the `$"css"` style modifier.
 *    - Match the line against registered handlers (first match wins).
 *    - Push container nodes onto the stack for child nesting.
 * 3. Return `{ pages, theme }`.
 *
 * ### Handler registration
 *
 * Handlers are registered in the {@link handlers} array in priority order.
 * Order matters: e.g. `HeadingHandler` must come before generic fallbacks.
 */
class DSLParser {
  /**
   * Ordered list of all registered keyword handlers.
   *
   * The parser tries each handler in sequence; the **first** handler whose
   * `canHandle()` returns `true` is used. Leaf handlers are registered before
   * container handlers to avoid ambiguous matches (e.g. `card` as text vs
   * `card` as container).
   */
  private readonly handlers: NodeHandler[] = [
    new DividerHandler(),
    new HeadingHandler(),
    new ParaHandler(),
    new NoteHandler(),
    new NavHandler(),
    new TabsHandler(),
    new FieldHandler(),
    new AreaHandler(),
    new PickHandler(),
    new CheckHandler(),
    new ToggleHandler(),
    new BtnHandler(),
    new GhostHandler(),
    new LinkHandler(),
    new ImgHandler(),
    new AvatarHandler(),
    new BadgeHandler(),
    new KpiHandler(),
    new GridHandler(),
    new ListHandler(),
    new RowHandler(),
    new ColHandler(),
    new CardHandler(),
    new AsideHandler(),
    new ModalHandler(),
  ];

  /**
   * Parses a complete Boceto DSL source string into a structured AST.
   *
   * @param src - The raw multi-line Boceto DSL source code.
   * @returns A {@link ParsedDSL} object with `pages` (keyed by screen name)
   *          and `theme` (the selected theme name, defaults to `'paper'`).
   *
   * @example
   * ```ts
   * const dsl = new DSLParser();
   * const result = dsl.parse(`
   *   theme noir
   *
   *   @Login
   *   # Bienvenido
   *   field Email
   *   btn Entrar > @Dashboard
   * `);
   *
   * console.log(result.theme);               // 'noir'
   * console.log(result.pages['Login'].name);  // 'Login'
   * ```
   */
  parse(src: string): ParsedDSL {
    const lines  = src.split('\n');
    const pages: Record<string, WirePage> = {};
    let cur: WirePage | null = null;
    let stack: StackEntry[] = [];
    let theme = 'paper';
    let frame = 'auto';

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim() || line.trim().startsWith('//')) continue;

      const ind = getIndent(line);
      let t = line.trim();

      if (t.startsWith('theme ')) { theme = t.slice(6).trim(); continue; }
      if (t.startsWith('frame ')) { frame = t.slice(6).trim(); continue; }
      if (t.startsWith('@')) {
        cur = { name: t.slice(1).trim(), children: [] };
        pages[cur.name] = cur;
        stack = [];
        continue;
      }
      if (!cur) continue;

      while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
      const parent = stack.length ? stack[stack.length - 1].node : cur;

      // For multi-item handlers (nav, tabs, grid, list, pick), skip line-level
      // style extraction so per-item $"css" modifiers are preserved inside each
      // item string. The renderer extracts them via iText()/iStyle() at render time.
      const handler = this.handlers.find(h => h.canHandle(t));
      if (!handler) continue;

      let nodeStyle: string | undefined;
      if (!handler.hasItemStyles) {
        const styleMatch = t.match(STYLE_RE);
        nodeStyle = styleMatch?.[1];
        if (styleMatch) t = t.slice(0, styleMatch.index ?? t.length).trim();
      }

      const rest = t.replace(/^[^\s]+\s*/, '');
      const node = handler.parse(t, rest);
      if (nodeStyle) node.style = nodeStyle;

      (parent.children ??= []).push(node);
      if (handler.isContainer) stack.push({ indent: ind, node });
    }

    return { pages, theme, frame };
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses a Boceto DSL source string into a structured wireframe AST.
 *
 * This is the **single public entry point** for the parser module.
 * It creates a fresh {@link DSLParser} instance and delegates to its
 * {@link DSLParser.parse} method.
 *
 * @param src - The raw multi-line Boceto DSL source code.
 * @returns A {@link ParsedDSL} object containing:
 *   - `pages` — `Record<string, WirePage>` keyed by screen name.
 *   - `theme` — The selected theme (`'paper'` by default).
 *
 * @example
 * ```ts
 * import { parseDSL } from './parser';
 *
 * const result = parseDSL(`
 *   theme paper
 *
 *   @Login
 *   nav MiApp
 *   # Bienvenido
 *   field Email
 *   field Contraseña *
 *   btn Entrar > @Dashboard
 * `);
 *
 * // result.theme === 'paper'
 * // result.pages['Login'].children.length === 5
 * ```
 */
export function parseDSL(src: string): ParsedDSL {
  return new DSLParser().parse(src);
}
