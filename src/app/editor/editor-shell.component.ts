import {
  Component, signal, computed, effect,
  ChangeDetectionStrategy, OnInit, ElementRef, ViewChild, AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ParsedDSL, ThemeName, THEMES, THEME_ICONS } from '../../types';
import { PageViewComponent } from '../page-view.component';
import { EditorComponent } from '../editor.component';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';
import { parseDSL } from '../../parser';

// ── Demo DSL ──────────────────────────────────────────────────────────────────
const DEMO = `// Boceto DSL
// @ pantalla  # título  > navega  · separa ítems

theme paper

@Login
nav Kova
img "Hero illustration"
# Bienvenido de vuelta
p Inicia sesión para continuar
---
field Email
field Contraseña *
check Mantener sesión iniciada
btn Entrar > @Dashboard
link ¿Olvidaste tu contraseña? > @Reset

@Dashboard
nav Kova · Inicio · Proyectos · Ajustes
# Buenos días, Ana
p Resumen de hoy
row
  kpi 1.284 Usuarios
  kpi 94% Satisfacción
  kpi 38 Tareas
card+ Proyectos recientes
  grid Nombre · Estado · Fecha · Dueño
row
  btn Nuevo proyecto > @Crear
  ghost Ver todos
  ghost Eliminar $"color:#dc2626;border-color:#dc2626"

@Crear
nav Kova · Inicio · Proyectos
# Nuevo proyecto
p Completa los campos para crear el proyecto
tabs General · Avanzado
  field Nombre del proyecto
  area Descripción ?
  pick Tipo | Web | Mobile | Backend | Diseño
  ---
  pick Prioridad | Alta | Media | Baja
  check Notificar al equipo
  toggle Proyecto privado
row right
  ghost Cancelar > @Dashboard
  btn Crear proyecto > @Dashboard

@Reset
nav Kova
# Recuperar acceso
p Ingresa tu correo y te enviaremos un enlace
field Correo electrónico
btn Enviar instrucciones > @Login
link Volver al inicio > @Login
`;

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-editor-shell',
  standalone: true,
  imports: [FormsModule, RouterLink, PageViewComponent, EditorComponent, BacetoLogoComponent],
  templateUrl: './editor-shell.component.html',
  styleUrls: ['./editor-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class EditorShellComponent implements OnInit, AfterViewInit {
  @ViewChild('previewFrame') previewFrameRef?: ElementRef<HTMLDivElement>;
  @ViewChild(EditorComponent) editorRef?: EditorComponent;
  private _pendingScroll: string | null = null;

  // ── State ──────────────────────────────────────────
  dsl          = signal(DEMO);
  parsed       = signal<ParsedDSL>({ pages: {}, theme: 'paper', frame: 'auto' });
  currentPage  = signal<string | null>(null);
  history      = signal<string[]>([]);
  view         = signal<'preview' | 'code' | 'split'>('split');
  showSidebar  = signal(true);
  editingPage  = signal<string | null>(null);
  newPageName  = '';
  showThemePicker = signal(false);
  copied       = signal(false);
  exporting    = signal(false);

  // ── Derived ────────────────────────────────────────
  pageNames = computed(() => Object.keys(this.parsed().pages));
  wireTheme = computed(() => this.parsed().theme as ThemeName);
  currentPageData = computed(() => {
    const p = this.parsed();
    const name = this.currentPage();
    return name ? (p.pages[name] ?? null) : null;
  });

  readonly themeNames: ThemeName[] = ['paper', 'blueprint', 'sketch', 'noir', 'handwriting', 'arch'];
  readonly themeIcons = THEME_ICONS;

  constructor(readonly theme: ShellThemeService) {
    // ── effects need injection context → constructor ───
    // Parse DSL reactively
    effect(() => {
      const src = this.dsl();
      try {
        const p = parseDSL(src);
        this.parsed.set(p);
        const keys = Object.keys(p.pages);
        if (keys.length && (!this.currentPage() || !p.pages[this.currentPage()!])) {
          this.currentPage.set(keys[0]);
        }
      } catch { /* keep last valid parse */ }
    }, { allowSignalWrites: true });

    // In split mode, scroll code editor to active page
    effect(() => {
      const page = this.currentPage();
      const v = this.view();
      if (v === 'split' && page) {
        if (this.editorRef) {
          this.editorRef.scrollToPage(page);
        } else {
          this._pendingScroll = page; // editor not rendered yet
        }
      }
    });

    // Apply wireframe theme CSS custom properties
    effect(() => {
      const T = THEMES[this.wireTheme()] ?? THEMES['paper'];
      const el = document.documentElement;
      el.style.setProperty('--w-bg',       T.bg);
      el.style.setProperty('--w-surface',  T.surface);
      el.style.setProperty('--w-border',   T.border);
      el.style.setProperty('--w-borderD',  T.borderD);
      el.style.setProperty('--w-ink',      T.ink);
      el.style.setProperty('--w-inkMid',   T.inkMid);
      el.style.setProperty('--w-inkFaint', T.inkFaint);
      el.style.setProperty('--w-fill',     T.fill);
      el.style.setProperty('--w-blue',     T.blue);
      el.style.setProperty('--w-accent',   T.accent);
      el.style.setProperty('--w-accentFg', T.accentFg);
    });
  }

  ngAfterViewInit(): void {
    // Handle any scroll request that came before the editor was rendered
    if (this._pendingScroll && this.editorRef) {
      this.editorRef.scrollToPage(this._pendingScroll);
      this._pendingScroll = null;
    }
  }

  ngOnInit(): void {
    // Load shared DSL from URL hash  ?w=<base64>
    const hash = window.location.hash;
    const match = hash.match(/[?&]w=([^&]+)/);
    if (match) {
      try {
        const b64 = decodeURIComponent(match[1]);
        this.dsl.set(decodeURIComponent(escape(atob(b64))));
      } catch {}
    }
  }

  // ── Navigation ────────────────────────────────────
  navTo(target: string): void {
    if (!this.parsed().pages[target]) return;
    this.history.update(h => [...h, this.currentPage() ?? '']);
    this.currentPage.set(target);
  }

  goBack(): void {
    const h = this.history();
    if (!h.length) return;
    this.currentPage.set(h[h.length - 1]);
    this.history.update(hh => hh.slice(0, -1));
  }

  goTo(name: string): void {
    this.history.update(h => [...h, this.currentPage() ?? '']);
    this.currentPage.set(name);
  }

  // ── DSL mutations ─────────────────────────────────
  addPage(): void {
    const name = this.newPageName.trim().replace(/\s+/g, '_');
    if (!name) return;
    this.dsl.update(d => d + `\n\n@${name}\n  # ${name}\n  p Nueva pantalla\n`);
    this.newPageName = '';
  }

  renamePage(oldName: string, newName: string): void {
    const n = newName.trim().replace(/\s+/g, '_');
    if (!n || n === oldName) { this.editingPage.set(null); return; }
    this.dsl.update(d => d.replaceAll(`@${oldName}`, `@${n}`).replaceAll(`> @${oldName}`, `> @${n}`));
    if (this.currentPage() === oldName) this.currentPage.set(n);
    this.editingPage.set(null);
  }

  deletePage(name: string): void {
    const blocks = this.dsl().split(/(?=^@)/m);
    const filtered = blocks.filter(b => !b.trim().startsWith(`@${name}`));
    this.dsl.set(filtered.join('').trimStart());
    if (this.currentPage() === name) {
      const others = this.pageNames().filter(n => n !== name);
      this.currentPage.set(others[0] ?? null);
    }
  }

  setWireTheme(t: ThemeName): void {
    this.dsl.update(d => {
      if (/^theme\s+\w+/m.test(d)) return d.replace(/^theme\s+\w+/m, `theme ${t}`);
      return `theme ${t}\n\n` + d.replace(/^theme\s+\w+\n?/m, '');
    });
    this.showThemePicker.set(false);
  }

  toggleShell(): void { this.theme.toggle(); }
  toggleSidebar(): void { this.showSidebar.update(v => !v); }
  toggleThemePicker(): void { this.showThemePicker.update(v => !v); }
  closeThemePicker(): void { this.showThemePicker.set(false); }

  // ── Share ─────────────────────────────────────────
  copyShareUrl(): void {
    const b64 = btoa(unescape(encodeURIComponent(this.dsl())));
    const url = `${window.location.origin}/#/view?w=${encodeURIComponent(b64)}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2200);
    });
  }

  // ── SVG Export ────────────────────────────────────
  exportSvg(): void {
    const el = this.previewFrameRef?.nativeElement;
    if (!el) return;
    this.exporting.set(true);
    const { width, height } = el.getBoundingClientRect();
    const T = THEMES[this.wireTheme()] ?? THEMES['paper'];
    const cssVars = [
      `--w-bg:${T.bg}`, `--w-surface:${T.surface}`, `--w-border:${T.border}`,
      `--w-borderD:${T.borderD}`, `--w-ink:${T.ink}`, `--w-inkMid:${T.inkMid}`,
      `--w-inkFaint:${T.inkFaint}`, `--w-fill:${T.fill}`, `--w-blue:${T.blue}`,
      `--w-accent:${T.accent}`, `--w-accentFg:${T.accentFg}`,
    ].join(';');
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject x="0" y="0" width="${width}" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="${cssVars};font-family:'Inter',system-ui,sans-serif;background:${T.bg};min-height:${height}px">
      ${el.innerHTML}
    </div>
  </foreignObject>
</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentPage() ?? 'wireframe'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    this.exporting.set(false);
  }
}
