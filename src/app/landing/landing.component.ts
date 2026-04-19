import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageViewComponent } from '../page-view.component';
import { THEMES, ThemeName, WirePage, ParsedDSL } from '../../types';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';

// ── Inline parser (same as app.component / editor-shell) ─────────────────────
function parseDSL(src: string): ParsedDSL {
  const lines = src.split('\n');
  const pages: Record<string, any> = {};
  let cur: any = null, stack: any[] = [], theme = 'paper';

  const indent   = (l: string) => (l.match(/^(\s*)/) as RegExpMatchArray)[1].length;
  const unquote  = (s: string) => s.replace(/^["']|["']$/g, '').trim();
  const splitDot = (s: string) => s.split(/[·|]/).map(x => x.trim()).filter(Boolean);
  const arrowT   = (s: string) => { const m = s.match(/>\s*(\w+)\s*$/); return m ? m[1] : null; };
  const noArrow  = (s: string) => s.replace(/>\s*\w+\s*$/, '').trim();

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim() || line.trim().startsWith('//')) continue;
    const ind = indent(line);
    let t = line.trim();

    if (t.startsWith('theme ')) { theme = t.slice(6).trim(); continue; }
    if (t.startsWith('@')) {
      cur = { name: t.slice(1).trim(), children: [] };
      pages[cur.name] = cur; stack = []; continue;
    }
    if (!cur) continue;

    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : cur;
    const styleMatch = t.match(/\s*\$"([^"]*)"\s*$/);
    const nodeStyle = styleMatch?.[1];
    if (styleMatch) t = t.slice(0, t.lastIndexOf('$"')).trimEnd();
    const rest = t.replace(/^[^\s]+\s*/, '');
    let node: any = null;

    if (t === '---')                    node = { type: 'divider' };
    else if (/^#{1,3} /.test(t)) {
      const lvl = (t.match(/^(#+)/) as RegExpMatchArray)[1].length;
      node = { type: `h${lvl}`, text: t.replace(/^#+\s*/, '') };
    }
    else if (t.startsWith('p '))        node = { type: 'para',   text: unquote(rest) };
    else if (t.startsWith('note '))     node = { type: 'note',   text: unquote(rest) };
    else if (t.startsWith('nav '))      node = { type: 'nav',    items: splitDot(rest) };
    else if (t.startsWith('tabs '))     node = { type: 'tabs',   items: splitDot(rest), children: [] };
    else if (t.startsWith('field ')) {
      const pw = rest.trimEnd().endsWith('*'), op = rest.trimEnd().endsWith('?');
      node = { type: 'field', label: unquote(noArrow(rest).replace(/[*?]$/, '').trim()), password: pw, optional: op };
    }
    else if (t.startsWith('area '))     node = { type: 'area',   label: unquote(rest) };
    else if (t.startsWith('pick ')) {
      const [l, ...o] = rest.split('>');
      node = { type: 'pick', label: unquote(l.trim()), options: o.join('>').trim().split(/\s+/).filter(Boolean) };
    }
    else if (t.startsWith('check '))    node = { type: 'check',  label: unquote(rest) };
    else if (t.startsWith('toggle '))   node = { type: 'toggle', label: unquote(rest) };
    else if (t.startsWith('btn '))      node = { type: 'btn',    label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('ghost '))    node = { type: 'ghost',  label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('link '))     node = { type: 'link',   label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('img '))      node = { type: 'img',    label: unquote(rest) };
    else if (t.startsWith('avatar '))   node = { type: 'avatar', name: unquote(rest) };
    else if (t.startsWith('badge '))    node = { type: 'badge',  text: unquote(rest) };
    else if (t === 'row' || t.startsWith('row ')) node = { type: 'row', align: t.length > 3 ? t.slice(4).trim() : '', children: [] };
    else if (t === 'col')               node = { type: 'col',    children: [] };
    else if (t === 'card' || t === 'card+' || t.startsWith('card ') || t.startsWith('card+ ')) {
      const cl = t.startsWith('card+');
      const tr = cl ? t.slice(5).trim() : rest;
      node = { type: 'card', title: tr ? unquote(tr) : '', closable: cl, children: [] };
    }
    else if (t === 'aside')             node = { type: 'aside',  children: [] };
    else if (t === 'modal' || t.startsWith('modal ')) node = { type: 'modal', title: rest ? unquote(rest) : '', children: [] };
    else if (t.startsWith('kpi ')) {
      const [v, ...r] = rest.split(/\s+/);
      node = { type: 'kpi', value: v, label: r.join(' ') };
    }
    else if (t.startsWith('grid '))     node = { type: 'grid',   cols: splitDot(rest) };
    else if (t.startsWith('list '))     node = { type: 'list',   items: splitDot(rest) };

    if (node) {
      if (nodeStyle) node.style = nodeStyle;
      parent.children.push(node);
      if (['row', 'col', 'card', 'aside', 'modal', 'tabs'].includes(node.type)) stack.push({ indent: ind, node });
    }
  }
  return { pages, theme };
}

// ── Hero DSL sample ───────────────────────────────────────────────────────────
const HERO_DSL = `theme paper
@App
nav Boceto
# Diseña sin ratón
p Prototipos interactivos desde texto puro
---
field Email
field Contraseña *
btn Entrar > App
link ¿Olvidaste tu contraseña?
`;

// ── Live demo DSL ─────────────────────────────────────────────────────────────
const DEMO_DSL = `theme paper
@Dashboard
nav App · Inicio · Proyectos · Ajustes
# Buenos días, Ana
p Resumen del día de hoy
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Proyectos recientes
  grid Nombre · Estado · Fecha
row
  btn Nuevo proyecto > Dashboard
  ghost Ver todos
`;

// ── Theme preview DSL ─────────────────────────────────────────────────────────
function makeThemeDsl(t: string): string {
  return `theme ${t}
@Preview
nav App
# Dashboard
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Reciente
  grid Nombre · Estado · Fecha
`;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, PageViewComponent, BacetoLogoComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit {
  readonly themeNames: ThemeName[] = ['paper', 'blueprint', 'sketch', 'noir', 'handwriting', 'arch'];
  readonly themeIcons: Record<ThemeName, string> = {
    paper: '☕', blueprint: '📐', sketch: '✏️', noir: '🌙',
    handwriting: '🖊️', arch: '📏',
  };
  readonly themeLabels: Record<ThemeName, string> = {
    paper: 'Paper', blueprint: 'Blueprint', sketch: 'Sketch', noir: 'Noir',
    handwriting: 'Handwriting', arch: 'Arch',
  };

  heroPage: WirePage | null = null;
  demoPage: WirePage | null = null;
  themePreviews: Record<string, WirePage | null> = {};
  aiCopied = signal(false);

  constructor(readonly theme: ShellThemeService) {}

  readonly demoDslText = `theme paper
@Dashboard
nav App · Inicio · Proyectos
# Buenos días, Ana
p Resumen del día de hoy
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Proyectos recientes
  grid Nombre · Estado · Fecha
row
  btn Nuevo proyecto
  ghost Ver todos`;

  ngOnInit(): void {
    // Apply paper theme CSS vars for wireframe previews on landing
    const T = THEMES.paper;
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

    // Parse hero sample
    const heroParsed = parseDSL(HERO_DSL);
    this.heroPage = heroParsed.pages['App'] ?? null;

    // Parse demo sample
    const demoParsed = parseDSL(DEMO_DSL);
    this.demoPage = demoParsed.pages['Dashboard'] ?? null;

    // Parse theme preview samples
    for (const t of this.themeNames) {
      const parsed = parseDSL(makeThemeDsl(t));
      this.themePreviews[t] = parsed.pages['Preview'] ?? null;
    }
  }

  copyAiPrompt(): void {
    const prompt = `Genera wireframes usando el DSL de Boceto. Reglas:

• Cada pantalla empieza con @NombrePantalla
• Palabras clave: nav · # ## ### · p · note · ---
  field [label] [*=password] [?=opcional]
  area [label]   pick [label] > opt1 opt2
  check · toggle · btn [label] > Pantalla
  ghost · link · img · avatar · badge · kpi
  row · card [titulo] · aside   (indent children 2 sp)
  grid col1 · col2   list · item1 · item2   tabs
• Usa · (punto medio) para separar items en nav/grid/list/tabs
• btn/ghost/link usan > Pantalla para navegar
• theme paper|blueprint|sketch|noir al inicio (opcional)

Ejemplo completo:
theme paper

@Login
nav MiApp
# Bienvenido
p Ingresa tus datos para continuar
---
field Email
field Contraseña *
check Mantener sesión
btn Entrar > Dashboard
link ¿Olvidaste tu contraseña? > Reset

@Dashboard
nav MiApp · Inicio · Perfil
# Panel principal
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Actividad reciente
  grid Nombre · Fecha · Estado
row
  btn Nuevo > Crear
  ghost Ver todos`;

    navigator.clipboard.writeText(prompt).then(() => {
      this.aiCopied.set(true);
      setTimeout(() => this.aiCopied.set(false), 2500);
    });
  }

  getThemeInlineVars(theme: ThemeName): string {
    const T = THEMES[theme];
    return (
      `--w-bg:${T.bg};--w-surface:${T.surface};--w-border:${T.border};` +
      `--w-borderD:${T.borderD};--w-ink:${T.ink};--w-inkMid:${T.inkMid};` +
      `--w-inkFaint:${T.inkFaint};--w-fill:${T.fill};--w-blue:${T.blue};` +
      `--w-accent:${T.accent};--w-accentFg:${T.accentFg};background:${T.bg}`
    );
  }
}
