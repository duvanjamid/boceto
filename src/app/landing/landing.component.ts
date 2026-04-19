import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageViewComponent } from '../page-view.component';
import { PlaygroundComponent } from '../playground/playground.component';
import { THEMES, ThemeName, WirePage, ParsedDSL } from '../../types';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';
import { parseDSL } from '../../parser';

// ── Hero DSL sample ───────────────────────────────────────────────────────────
const HERO_DSL = `theme paper
@App
nav Boceto
# Diseña sin ratón
p Prototipos interactivos desde texto puro
---
field Email
field Contraseña *
btn Entrar > @App
link ¿Olvidaste tu contraseña?
`;

// ── Live demo DSL ─────────────────────────────────────────────────────────────
const DEMO_DSL = `theme paper
@Dashboard
nav App | Inicio | Proyectos | Ajustes
# Buenos días, Ana
p Resumen del día de hoy
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Proyectos recientes
  grid Nombre | Estado | Fecha
row
  btn Nuevo proyecto > @Dashboard
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
  grid Nombre | Estado | Fecha
`;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, PageViewComponent, PlaygroundComponent, BacetoLogoComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit {
  readonly themeNames: ThemeName[] = ['paper', 'blueprint', 'sketch', 'noir', 'handwriting', 'arch', 'cyberpunk', 'dots'];
  readonly themeIcons: Record<ThemeName, string> = {
    paper: '☕', blueprint: '📐', sketch: '✏️', noir: '🌙',
    handwriting: '🖊️', arch: '📏', cyberpunk: '🕹️', dots: '🔘',
  };
  readonly themeLabels: Record<ThemeName, string> = {
    paper: 'Paper', blueprint: 'Blueprint', sketch: 'Sketch', noir: 'Noir',
    handwriting: 'Handwriting', arch: 'Arch', cyberpunk: 'Cyberpunk', dots: 'Dots',
  };

  heroPage: WirePage | null = null;
  demoPage: WirePage | null = null;
  themePreviews: Record<string, WirePage | null> = {};
  aiCopied = signal(false);

  constructor(readonly theme: ShellThemeService) {}

  readonly demoDslText = `// DSL de Boceto
theme paper

@Dashboard
nav App | Inicio | Proyectos | Ajustes
# Buenos días, Ana
p Resumen del día de hoy
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Proyectos recientes
  grid Nombre | Estado | Fecha
row
  btn Nuevo proyecto > @Dashboard
  ghost Ver todos`;

  readonly integrationDsl = `\`\`\`boceto
@Login
nav MiApp
# Iniciar sesión
field Email
field Contraseña *
btn Entrar > @Dashboard
\`\`\``;

  readonly embedCodeExample = `<iframe 
  src="https://boceto.app/#/embed?mode=preview&w=..." 
  width="100%" height="500px" 
  style="border:0; border-radius:12px;">
</iframe>`;

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
  pick [label] | opt1 | opt2
  check | toggle | btn [label] > @Pantalla
  ghost | link | img | avatar | badge | kpi
  row | card [titulo] | aside   (indent children 2 sp)
  grid col1 | col2   list (indent children)   tabs
• Usa | para separar items en nav/grid/tabs
• btn/ghost/link usan > @Pantalla para navegar
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
btn Entrar > @Dashboard
link ¿Olvidaste tu contraseña? > @Reset

@Dashboard
nav MiApp | Inicio | Perfil
# Panel principal
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Actividad reciente
  grid Nombre | Fecha | Estado
row
  btn Nuevo > @Crear
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
