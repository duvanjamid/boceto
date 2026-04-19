/**
 * Boceto — Plugins page
 * Copyright (c) 2024 Duvan Jamid · AGPL-3.0-or-later
 */
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';

export interface PluginTab {
  label: string;
  lang: string;
  code: string;
}

export interface PluginCard {
  id: string;
  icon: string;
  name: string;
  desc: string;
  badge?: string;   // e.g. "CDN · npm"
  tabs: PluginTab[];
  notes?: string[];
}

const PLUGINS: PluginCard[] = [
  {
    id: 'web-component',
    icon: 'fa-solid fa-cube',
    name: 'Web Component',
    desc: 'Custom element <boceto-preview> para cualquier HTML o framework. Cero dependencias, cero build step.',
    badge: 'CDN · npm · HTML',
    tabs: [
      {
        label: 'CDN',
        lang: 'html',
        code:
`<script src="https://unpkg.com/@duvanjamid/boceto/plugins/boceto-web-component.js"></script>

<boceto-preview theme="blueprint" dsl="
@Login
nav MiApp
# Bienvenido
field Email
field Contraseña *
btn Entrar > Dashboard
"></boceto-preview>`,
      },
      {
        label: 'npm',
        lang: 'js',
        code:
`// npm install @duvanjamid/boceto
import '@duvanjamid/boceto/plugins/boceto-web-component.js';

// Ya puedes usar el tag en tu HTML/JSX`,
      },
    ],
    notes: [
      'Atributo theme: paper | blueprint | sketch | noir | handwriting | arch',
      'Atributo dsl: código DSL como atributo o como texto dentro del tag',
      'Atributo height: valor CSS o "auto" (por defecto)',
    ],
  },
  {
    id: 'react',
    icon: 'fa-brands fa-react',
    name: 'React',
    desc: 'Componente <BocetoPreviewer> para React 18+. Props reactivos, navegación entre páginas, sin dependencias externas.',
    badge: 'npm · React 18+',
    tabs: [
      {
        label: 'Instalación',
        lang: 'bash',
        code: `npm install @duvanjamid/boceto`,
      },
      {
        label: 'Uso',
        lang: 'jsx',
        code:
`import BocetoPreviewer from '@duvanjamid/boceto/plugins/boceto-react';

export default function App() {
  return (
    <BocetoPreviewer
      theme="paper"
      dsl={\`
@Dashboard
nav MiApp | Inicio | Ajustes
# Panel
row
  kpi 1.284 Usuarios
  kpi 94% Activo
card Resumen
  grid Nombre | Estado | Fecha
\`}
    />
  );
}`,
      },
    ],
    notes: [
      'Props: dsl (string), theme (string), height (CSS string), className, style',
      'Navegación entre páginas: btn/ghost/link con > @Pagina funcionan automáticamente',
    ],
  },
  {
    id: 'vue',
    icon: 'fa-brands fa-vuejs',
    name: 'Vue 3',
    desc: 'Componente Vue 3 con Composition API. Reactivo a cambios de dsl y theme en tiempo real.',
    badge: 'npm · Vue 3',
    tabs: [
      {
        label: 'Instalación',
        lang: 'bash',
        code: `npm install @duvanjamid/boceto`,
      },
      {
        label: 'Registro global',
        lang: 'js',
        code:
`// main.js
import { createApp } from 'vue';
import BocetoPreviewer from '@duvanjamid/boceto/plugins/boceto-vue';
import App from './App.vue';

const app = createApp(App);
app.component('BocetoPreviewer', BocetoPreviewer);
app.mount('#app');`,
      },
      {
        label: 'Uso en template',
        lang: 'html',
        code:
`<template>
  <BocetoPreviewer :dsl="myDsl" theme="noir" />
</template>

<script setup>
const myDsl = \`
@Home
nav App | Inicio | Perfil
# Bienvenido
btn Explorar > @Lista
\`;
</script>`,
      },
    ],
    notes: [
      'Props: dsl, theme, height',
      'Fully reactive — cambia el prop dsl en runtime y el preview se actualiza',
    ],
  },
  {
    id: 'remark',
    icon: 'fa-solid fa-file-code',
    name: 'remark / MDX',
    desc: 'Plugin remark que convierte bloques ```boceto en el renderizado HTML. Compatible con Astro, Next.js, Docusaurus y cualquier pipeline unified/remark.',
    badge: 'npm · Astro · Next.js · MDX',
    tabs: [
      {
        label: 'Instalación',
        lang: 'bash',
        code: `npm install @duvanjamid/boceto`,
      },
      {
        label: 'Astro',
        lang: 'js',
        code:
`// astro.config.mjs
import { defineConfig } from 'astro/config';
import remarkBoceto from '@duvanjamid/boceto/plugins/boceto-remark';

export default defineConfig({
  markdown: {
    remarkPlugins: [remarkBoceto],
    // Con CDN auto-inyectado:
    // remarkPlugins: [[remarkBoceto, {
    //   scriptSrc: 'https://unpkg.com/@duvanjamid/boceto/plugins/boceto-web-component.js'
    // }]]
  },
});`,
      },
      {
        label: 'Next.js',
        lang: 'js',
        code:
`// next.config.mjs
import createMDX from '@next/mdx';
import remarkBoceto from '@duvanjamid/boceto/plugins/boceto-remark';

const withMDX = createMDX({
  options: { remarkPlugins: [remarkBoceto] },
});

export default withMDX({ pageExtensions: ['js','jsx','mdx','ts','tsx'] });`,
      },
      {
        label: 'En Markdown',
        lang: 'md',
        code:
`## Mi diseño

\`\`\`boceto
theme paper

@Login
nav MiApp
field Email
btn Entrar > Dashboard
\`\`\``,
      },
    ],
    notes: [
      'Convierte cada bloque en un <boceto-preview> custom element',
      'Opción scriptSrc: inyecta <script> automáticamente antes del primer bloque',
      'Opción height: altura por defecto de todos los previews',
    ],
  },
  {
    id: 'vscode',
    icon: 'fa-solid fa-puzzle-piece',
    name: 'VSCode',
    desc: 'Extensión completa con syntax highlighting, snippets y configuración de indentación automática para archivos .boceto.',
    badge: 'VSCode · Cursor · Windsurf',
    tabs: [
      {
        label: 'Instalación manual',
        lang: 'bash',
        code:
`# Copia la carpeta a tu extensiones
cp -r plugins/boceto-vscode ~/.vscode/extensions/boceto-dsl

# O desde el repo
# Extensions panel → "..." → Install from VSIX (requiere empaquetar con vsce)`,
      },
      {
        label: 'Snippets disponibles',
        lang: 'text',
        code:
`page      → @PageName + nav + # heading
theme     → theme [paper|blueprint|sketch|...]
scaffold  → Página completa con Login + Dashboard
nav       → nav App | Link | Link
card      → card Título (con indentación)
row       → row (con indentación)
tabs      → tabs Tab1 | Tab2 con ---
field     → field Label
fieldp    → field Label * (password)
pick      → pick Label | Op1 | Op2
btn       → btn Label
btnn      → btn Label > @Page
grid      → grid Col1 | Col2 | Col3
kpi       → kpi Valor Label
badge     → badge Texto
... y más`,
      },
    ],
    notes: [
      'Soporte para archivos .boceto con syntax highlighting completo',
      'Indentación automática al entrar en row, card, col, aside, modal, tabs',
      'Compatible con VSCode 1.75+, Cursor y Windsurf',
    ],
  },
  {
    id: 'intellij',
    icon: 'fa-brands fa-java',
    name: 'IntelliJ IDEA',
    desc: 'Bundle TextMate + Live Templates para IntelliJ IDEA, WebStorm, PyCharm y cualquier IDE de JetBrains.',
    badge: 'IntelliJ · WebStorm · PyCharm',
    tabs: [
      {
        label: 'TextMate Bundle',
        lang: 'text',
        code:
`Settings → Editor → TextMate Bundles → +
→ Selecciona: plugins/boceto-intellij/boceto.tmbundle/`,
      },
      {
        label: 'Tipo de archivo (.boceto)',
        lang: 'text',
        code:
`Settings → Editor → File Types → Import
→ Selecciona: plugins/boceto-intellij/boceto.xml`,
      },
      {
        label: 'Live Templates (snippets)',
        lang: 'text',
        code:
`Settings → Editor → Live Templates → Import
→ Selecciona: plugins/boceto-intellij/snippets.xml

Snippets: page · theme · nav · card · row · col
          modal · tabs · field · fieldp · pick
          btn · ghost · grid · kpi · badge · avatar`,
      },
    ],
    notes: [
      'El bundle TextMate activa el syntax highlighting en archivos .boceto',
      'Los Live Templates funcionan con Tab para expandir',
      'Probado en IntelliJ IDEA 2023.3+ y WebStorm 2024',
    ],
  },
  {
    id: 'docsify',
    icon: 'fa-solid fa-book-open',
    name: 'Docsify',
    desc: 'Plugin para Docsify que renderiza bloques ```boceto como wireframes interactivos en tu documentación.',
    badge: 'Docsify · CDN',
    tabs: [
      {
        label: 'Instalación',
        lang: 'html',
        code:
`<!-- En tu index.html de Docsify -->
<script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
<script src="plugins/boceto-docsify.js"></script>`,
      },
      {
        label: 'En tus .md',
        lang: 'md',
        code:
`## Flujo de login

\`\`\`boceto
theme paper

@Login
nav MiApp
field Email
field Contraseña *
btn Entrar
\`\`\``,
      },
    ],
    notes: [
      'Funciona con cualquier tema de Docsify',
      'Los wireframes son interactivos: btn > @Pagina navega entre pantallas',
    ],
  },
  {
    id: 'prism',
    icon: 'fa-solid fa-paintbrush',
    name: 'Prism.js',
    desc: 'Plugin de grammar para Prism.js. Añade syntax highlighting de Boceto a cualquier sitio estático.',
    badge: 'CDN · Prism.js',
    tabs: [
      {
        label: 'Uso',
        lang: 'html',
        code:
`<!-- Después de cargar Prism -->
<script src="plugins/boceto-prism.js"></script>

<pre><code class="language-boceto">
@Login
nav MiApp
field Email
btn Entrar > @Dashboard
</code></pre>`,
      },
    ],
    notes: [
      'Registra el lenguaje "boceto" en Prism',
      'Compatible con todos los temas de Prism.js (dark, tomorrow, etc.)',
    ],
  },
  {
    id: 'obsidian',
    icon: 'fa-solid fa-vault',
    name: 'Obsidian',
    desc: 'Plugin nativo para Obsidian que renderiza bloques ```boceto como wireframes interactivos en Reading view.',
    badge: 'Obsidian Community Plugin',
    tabs: [
      {
        label: 'Instalación manual',
        lang: 'bash',
        code:
`# Copia la carpeta al vault
cp -r plugins/boceto-obsidian \\
  /path/to/vault/.obsidian/plugins/boceto-previewer/

# Luego en Obsidian:
# Settings → Community plugins → Enable "Boceto Previewer"`,
      },
      {
        label: 'En tus notas',
        lang: 'md',
        code:
`## Diseño de pantalla

\`\`\`boceto
theme paper

@Home
nav MiApp | Inicio | Notas
# Bienvenido
field Buscar
btn Nueva nota
\`\`\``,
      },
    ],
    notes: [
      'Funciona en Reading view y Live Preview',
      'Navegación entre páginas con btn > @Pagina',
      'Los temas se aplican automáticamente desde el DSL',
    ],
  },
];

@Component({
  selector: 'app-plugins',
  standalone: true,
  imports: [RouterLink, BacetoLogoComponent],
  templateUrl: './plugins.component.html',
  styleUrls: ['./plugins.component.css'],
})
export class PluginsComponent {
  plugins = PLUGINS;
  activePlugin = signal(PLUGINS[0].id);
  copiedId = signal<string | null>(null);
  activeTab = signal<Record<string, number>>({});

  constructor(readonly theme: ShellThemeService) {}

  getTab(pluginId: string): number {
    return this.activeTab()[pluginId] ?? 0;
  }

  setTab(pluginId: string, idx: number): void {
    this.activeTab.update(t => ({ ...t, [pluginId]: idx }));
  }

  scrollTo(id: string): void {
    this.activePlugin.set(id);
    const el = document.getElementById('plugin-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async copyCode(pluginId: string, code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copiedId.set(pluginId);
      setTimeout(() => this.copiedId.set(null), 2000);
    } catch { /* ignore */ }
  }
}
