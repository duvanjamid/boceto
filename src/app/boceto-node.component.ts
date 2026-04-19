import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { WireNode } from '../types';

/**
 * Recursive wireframe node renderer.
 *
 * Renders a single {@link WireNode} from the Boceto DSL AST. The component
 * self-imports to handle arbitrarily nested structures (e.g. `row > col > card`).
 *
 * ### Supported node types
 *
 * | Type       | Description                           | Interactive |
 * |------------|---------------------------------------|:-----------:|
 * | `nav`      | Top navigation bar with logo + links  | —           |
 * | `tabs`     | Tabbed panes — click to switch        | ✓           |
 * | `row`      | Horizontal flex container             | —           |
 * | `col`      | Vertical column inside a `row`        | —           |
 * | `card`     | Surface card with optional title & ×  | —           |
 * | `aside`    | Lateral sidebar panel                 | —           |
 * | `modal`    | Modal dialog overlay                  | —           |
 * | `h1–h3`   | Headings                              | —           |
 * | `para`     | Body paragraph                        | —           |
 * | `note`     | Secondary annotation text             | —           |
 * | `divider`  | Horizontal rule                       | —           |
 * | `field`    | Text input (supports password/optional)| —          |
 * | `area`     | Multi-line textarea                   | —           |
 * | `pick`     | Dropdown selector — click to open     | ✓           |
 * | `check`    | Checkbox — click to toggle            | ✓           |
 * | `toggle`   | On/off switch — click to toggle       | ✓           |
 * | `btn`      | Primary button (navigable)            | ✓           |
 * | `ghost`    | Secondary/outline button (navigable)  | ✓           |
 * | `link`     | Inline text link (navigable)          | ✓           |
 * | `img`      | Image placeholder                     | —           |
 * | `avatar`   | Circular avatar with initials         | —           |
 * | `badge`    | Status chip / label                   | —           |
 * | `kpi`      | Large metric value + label            | —           |
 * | `grid`     | Data table with placeholder rows      | —           |
 * | `list`     | Bulleted list                         | —           |
 *
 * ### Per-item inline styles
 *
 * Multi-item elements (`nav`, `tabs`, `grid`, `list`, `pick`) support the
 * Boceto `$"css"` modifier on individual items. The parser preserves these
 * modifiers inside each item string, and this component extracts them at
 * render time via {@link iText} and {@link iStyle}.
 *
 * ### Change detection
 *
 * Uses `Default` strategy (not `OnPush`) because interactive elements
 * (tabs, toggles, checkboxes, dropdowns) mutate local state maps on click.
 */
@Component({
  selector: 'boceto-node',
  standalone: true,
  // Self-import enables recursive templates
  imports: [NgStyle, WireNodeComponent],
  templateUrl: './boceto-node.component.html',
  styleUrls: ['./boceto-node.component.css'],
  // Default CD because tab-click mutates local map
  changeDetection: ChangeDetectionStrategy.Default,
})
export class WireNodeComponent {
  /** The AST node to render. Provided by parent component or page view. */
  @Input() node!: WireNode;

  /** Current nesting depth. Incremented for each level of container nesting. */
  @Input() depth = 0;

  /**
   * Emitted when a navigable element (`btn`, `ghost`, `link`) with a
   * `> TargetScreen` target is clicked. The parent (typically the page view)
   * listens and switches to the target screen.
   */
  @Output() navigate = new EventEmitter<string>();

  // ── Interactive state maps ──────────────────────────────────────────────

  /** Active tab index per `tabs` node instance. Defaults to `0`. */
  private tabStates    = new Map<WireNode, number>();
  /** Toggle on/off state per `toggle` node instance. */
  private toggleStates = new Map<WireNode, boolean>();
  /** Checkbox checked state per `check` node instance. */
  private checkStates  = new Map<WireNode, boolean>();
  /** Selected option index per `pick` node instance. Defaults to `0`. */
  private pickSelected = new Map<WireNode, number>();
  /** Dropdown open/closed state per `pick` node instance. */
  private pickOpen     = new Map<WireNode, boolean>();

  // ── Tabs ────────────────────────────────────────────────────────────────

  /** Returns the active tab index for a `tabs` node (defaults to `0`). */
  getTab(node: WireNode): number   { return this.tabStates.get(node) ?? 0; }

  /** Sets the active tab index for a `tabs` node. */
  setTab(node: WireNode, i: number): void { this.tabStates.set(node, i); }

  // ── Pick (dropdown) ────────────────────────────────────────────────────

  /** Returns the selected option index for a `pick` node (defaults to `0`). */
  getPickSel(node: WireNode): number  { return this.pickSelected.get(node) ?? 0; }

  /** Returns whether the dropdown for a `pick` node is currently open. */
  isPickOpen(node: WireNode): boolean { return this.pickOpen.get(node) ?? false; }

  /** Toggles the open/closed state of a `pick` node's dropdown. */
  togglePickOpen(node: WireNode): void { this.pickOpen.set(node, !this.isPickOpen(node)); }

  /**
   * Selects an option in a `pick` dropdown and closes it.
   *
   * @param node - The `pick` node.
   * @param i    - The index of the selected option.
   */
  selectPick(node: WireNode, i: number): void {
    this.pickSelected.set(node, i);
    this.pickOpen.set(node, false);
  }

  // ── Toggle & Checkbox ──────────────────────────────────────────────────

  /**
   * Returns the current on/off state of a `toggle` node.
   * Falls back to the `checked` property from the DSL (`toggle Label *`).
   */
  getToggle(node: WireNode): boolean { return this.toggleStates.get(node) ?? node.checked ?? false; }

  /** Flips the on/off state of a `toggle` node. */
  flipToggle(node: WireNode): void   { this.toggleStates.set(node, !this.getToggle(node)); }

  /**
   * Returns the current checked state of a `check` node.
   * Falls back to the `checked` property from the DSL (`check Label *`).
   */
  getCheck(node: WireNode): boolean { return this.checkStates.get(node) ?? node.checked ?? false; }

  /** Flips the checked state of a `check` node. */
  flipCheck(node: WireNode): void   { this.checkStates.set(node, !this.getCheck(node)); }

  // ── Tab content ────────────────────────────────────────────────────────

  /**
   * Splits a `tabs` node's children at `divider` boundaries and returns
   * only the children belonging to the currently active tab pane.
   *
   * In the Boceto DSL, `---` dividers inside a `tabs` container delimit
   * the content of each tab:
   *
   * ```boceto
   * tabs General | Seguridad
   *   field Nombre     // tab 0
   *   ---
   *   field Contraseña // tab 1
   * ```
   *
   * @param node - The `tabs` node whose children are split.
   * @returns The children for the currently active tab pane.
   */
  getTabContent(node: WireNode): WireNode[] {
    if (!node.children?.length) return [];
    const sections: WireNode[][] = [[]];
    for (const child of node.children) {
      if (child.type === 'divider') sections.push([]);
      else sections[sections.length - 1].push(child);
    }
    return sections[this.getTab(node)] ?? sections[0] ?? [];
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  /**
   * Emits a navigation event when a `btn`, `ghost`, or `link` with a
   * `> TargetScreen` target is clicked.
   *
   * @param target - The target screen name, or `null`/`undefined` if none.
   */
  onNav(target: string | null | undefined): void {
    if (target) this.navigate.emit(target);
  }

  // ── Display helpers ────────────────────────────────────────────────────

  /**
   * Extracts initials from a full name for the `avatar` node.
   *
   * @param name - Full name (e.g. `"Ana López"`).
   * @returns Up to 2 uppercase initials (e.g. `"AL"`).
   *
   * @example
   * initials('Juan Pérez')  // → 'JP'
   * initials('Ana')         // → 'A'
   */
  initials(name: string): string {
    return (name ?? '')
      .split(' ')
      .map(w => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /**
   * Generates a deterministic placeholder bar width for `grid` mock data rows.
   *
   * @param row - The row index (0–2).
   * @param col - The column index.
   * @returns A CSS percentage width string (e.g. `"72%"`).
   */
  barWidth(row: number, col: number): string {
    return `${40 + Math.sin(row * 3 + col) * 25 + 25}%`;
  }

  /** Track-by function for `@for` loops using index. */
  trackByIdx(_i: number): number { return _i; }

  // ── Per-item style extraction ──────────────────────────────────────────

  /**
   * Extracts inline CSS from a Boceto `$"css"` modifier embedded in an
   * item string.
   *
   * Used by multi-item elements (`nav`, `tabs`, `grid`, `list`, `pick`)
   * where individual items can carry their own styles:
   *
   * ```boceto
   * nav App | Inicio $"color:#a78bfa" | Proyectos
   * ```
   *
   * @param item - A raw item string (e.g. `'Inicio $"color:#a78bfa"'`).
   * @returns The extracted CSS string, or `null` if no modifier is present.
   *
   * @example
   * iStyle('Inicio $"color:red"')  // → 'color:red'
   * iStyle('Proyectos')            // → null
   */
  iStyle(item: string): string | null {
    const m = [...item.matchAll(/\$"([^"]*)"/g)];
    return m.length ? m.map(x => x[1]).join(';') : null;
  }

  iNavTarget(item: string): string | null {
    const clean = item.replace(/\s*\$"[^"]*"/g, '').trim();
    const m = clean.match(/>\s*@(\w+)\s*$/);
    return m ? m[1] : null;
  }

  /**
   * Strips the `$"css"` modifier and `> @Target` navigation from an item string, 
   * returning only the display text.
   *
   * @param item - A raw item string (e.g. `'Inicio > @Dashboard $"color:#a78bfa"'`).
   * @returns The clean display text (e.g. `'Inicio'`).
   */
  iText(item: string): string {
    return item
      .replace(/\s*\$"[^"]*"/g, '')
      .replace(/>\s*@\w+\s*$/, '')
      .trim();
  }
}
