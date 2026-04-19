import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WirePage, ParsedDSL, THEMES } from '../../types';
import { PlaygroundComponent } from '../playground/playground.component';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';

export interface DocItem {
  id: string;
  name: string;
  syntax: string;
  desc: string;
  dsl: string;
  dslLive: string;
  copied?: boolean;
}

export interface DocSection {
  id: string;
  label: string;
  icon: string;
  items: DocItem[];
}

interface RawItem { id: string; name: string; syntax: string; desc: string; dsl: string; }
interface RawSection { id: string; label: string; icon: string; items: RawItem[]; }

const RAW_SECTIONS: RawSection[] = [
  {
    id: 'globals', label: 'Configuración Global', icon: 'fa-solid fa-sliders',
    items: [
      { id: 'theme',   name: 'Tema',         syntax: 'theme [paper|noir|sketch|blueprint|handwriting|arch|cyberpunk|dots]', desc: 'Establece el tema global visual de todo el prototipo. Debe ir en la primera línea del archivo.',
        dsl: 'theme noir\n@P\nnav Mi App\n# Tema Oscuro\np Este es el tema noir.\n' },
      { id: 'frame',   name: 'Marco de Disp.',syntax: 'frame [auto|ios|android|browser]', desc: 'Envuelve la vista en un marco de dispositivo interactivo. Solo visible en el previsualizador global.',
        dsl: 'frame ios\n@P\nnav Mi App\n# App Móvil\np Esta vista sería truncada y estilizada con un notch.' },
    ],
  },
  {
    id: 'typography', label: 'Tipografía', icon: 'fa-solid fa-font',
    items: [
      { id: 'h1',      name: 'Título H1',    syntax: '# Texto',          desc: 'Encabezado principal de sección.',
        dsl: '@P\n# Título principal\n## Subtítulo\n### Sección menor\n' },
      { id: 'para',    name: 'Párrafo',      syntax: 'p Texto',           desc: 'Texto de cuerpo, descripciones y contenido.',
        dsl: '@P\np Esto es un párrafo de texto normal, ideal para descripciones.\nnote Esta es una anotación secundaria\n' },
      { id: 'divider', name: 'Separador',    syntax: '---',               desc: 'Línea horizontal divisora de secciones.',
        dsl: '@P\n# Sección A\np Contenido arriba\n---\n# Sección B\np Contenido abajo\n' },
    ],
  },
  {
    id: 'navigation', label: 'Navegación', icon: 'fa-solid fa-compass',
    items: [
      { id: 'nav',  name: 'Barra nav',  syntax: 'nav Logo | Link [> @Pantalla] | Link [$"css"]', desc: 'Barra de navegación. Añade > @Pantalla a cualquier ítem para navegar. Usa | para separar.',
        dsl: '@P\nnav App | Inicio > @Inicio | Proyectos | Ajustes\nnav App | Inicio | Proyectos $"background:#0d1b2a;color:#c8e4ff"\n# Contenido\n' },
      { id: 'tabs', name: 'Pestañas',   syntax: 'tabs Tab1 | Tab2\n  contenido\n  ---\n  otro', desc: 'Pestañas interactivas. Indenta el contenido de cada tab, usa --- para separar secciones.',
        dsl: '@P\ntabs General | Seguridad | Billing\n  field Nombre completo\n  field Email\n  btn Guardar\n  ---\n  toggle Autenticación 2FA\n  toggle Sesiones activas\n  ---\n  pick Plan | Free | Pro | Enterprise\n  note Facturación mensual\n' },
    ],
  },
  {
    id: 'layout', label: 'Layout', icon: 'fa-solid fa-layer-group',
    items: [
      { id: 'row',   name: 'Fila',     syntax: 'row [right|center|space]\n  hijo\n  hijo', desc: 'Agrupa hijos en fila horizontal. Opciones de alineación: right, center, space.',
        dsl: '@P\nrow\n  card Columna A\n    p Texto aquí\n  card Columna B\n    p Otro contenido\nrow right\n  ghost Cancelar\n  btn Guardar\n' },
      { id: 'col',   name: 'Columna',  syntax: 'col\n  hijo\n  hijo',                       desc: 'Apila hijos en columna vertical dentro de un row.',
        dsl: '@P\nrow\n  img Foto de perfil\n  col\n    # Ana García\n    p Diseñadora UX | Madrid\n    row\n      badge Pro $"background:#f3e8ff;color:#7e22ce;border-color:#d8b4fe"\n      badge Activo $"background:#dcfce7;color:#166534;border-color:#86efac"\n' },
      { id: 'card',  name: 'Tarjeta',  syntax: 'card [Título] / card+ [Título]',             desc: 'Contenedor con borde. card+ agrega botón × para cerrar.',
        dsl: '@P\ncard Resumen\n  p Descripción del contenido\n  row\n    kpi 128 Activos\n    kpi 94% Éxito\ncard+ Configuración\n  toggle Notificaciones\n  toggle Modo oscuro\n' },
      { id: 'modal', name: 'Modal',    syntax: 'modal Título\n  contenido',                  desc: 'Diálogo modal con overlay y botón de cierre.',
        dsl: '@P\nbtn Abrir modal\nmodal Confirmar acción\n  p ¿Estás seguro de que deseas continuar? Esta acción no se puede deshacer.\n  row right\n    ghost Cancelar\n    btn Eliminar $"background:#dc2626"\n' },
      { id: 'aside', name: 'Aside',    syntax: 'aside',                                      desc: 'Bloque lateral o de contenido secundario.',
        dsl: '@P\nrow\n  card Principal\n    # Contenido\n    p Área principal de la vista\n  aside\n    p Panel lateral\n    avatar Usuario\n' },
    ],
  },
  {
    id: 'forms', label: 'Formularios', icon: 'fa-solid fa-list-check',
    items: [
      { id: 'field',  name: 'Campo',       syntax: 'field Label [* | ?]', desc: 'Input de texto. Añade * para contraseña, ? para opcional.',
        dsl: '@P\nfield Nombre completo\nfield Correo electrónico\nfield Contraseña *\nfield Teléfono ?\n' },
      { id: 'area',   name: 'Área',        syntax: 'area Label',           desc: 'Textarea multilínea para textos largos.',
        dsl: '@P\nfield Asunto\narea Mensaje\nnote Máximo 500 caracteres\n' },
      { id: 'pick',   name: 'Select',      syntax: 'pick Label | Op1 | Op2', desc: 'Menú desplegable con opciones.',
        dsl: '@P\npick País | México | España | Colombia | Argentina\npick Prioridad | Alta | Media | Baja\n' },
      { id: 'check',  name: 'Checkbox',    syntax: 'check Label',          desc: 'Casilla de verificación interactiva. Haz clic para marcar/desmarcar.',
        dsl: '@P\ncheck Acepto los términos y condiciones\ncheck Recibir newsletter\ncheck Mantener sesión iniciada\n' },
      { id: 'toggle', name: 'Toggle',      syntax: 'toggle Label',         desc: 'Interruptor on/off interactivo con animación. Haz clic para activar.',
        dsl: '@P\ntoggle Notificaciones push\ntoggle Modo oscuro\ntoggle Sincronización automática\n' },
    ],
  },
  {
    id: 'actions', label: 'Acciones', icon: 'fa-solid fa-bolt',
    items: [
      { id: 'btn',   name: 'Botón',       syntax: 'btn Label [> @Pantalla] [$"css"]',   desc: 'Botón primario. Usa $"css" al final para personalizar colores. Añade > @Pantalla para navegar.',
        dsl: '@P\nrow\n  btn Guardar\n  btn Eliminar $"background:#dc2626"\n  btn Publicar $"background:#16a34a"\n' },
      { id: 'ghost', name: 'Ghost',        syntax: 'ghost Label [> @Pantalla] [$"css"]', desc: 'Botón outline. Personaliza con $"color:red;border-color:red".',
        dsl: '@P\nrow\n  btn Confirmar\n  ghost Cancelar\n  ghost Descartar $"color:#dc2626;border-color:#dc2626"\n' },
      { id: 'link',  name: 'Enlace',       syntax: 'link Label [> @Pantalla]',          desc: 'Enlace de texto inline.',
        dsl: '@P\np ¿No tienes cuenta?\nlink Regístrate aquí > @Registro\nlink ¿Olvidaste tu contraseña? > @Reset\n' },
    ],
  },
  {
    id: 'media', label: 'Medios', icon: 'fa-solid fa-image',
    items: [
      { id: 'img',    name: 'Imagen',  syntax: 'img "Alt text" [> @Pantalla]',              desc: 'Placeholder de imagen. Añade > @Pantalla para navegar. Dentro de row se distribuyen en columnas.',
        dsl: '@P\nrow\n  img "Foto principal" > @Galeria\n  img "Miniatura"\nimg "Banner ancho completo"\n' },
      { id: 'avatar', name: 'Avatar',  syntax: 'avatar Nombre [> @Pantalla]',               desc: 'Avatar de usuario con iniciales generadas. Añade > @Pantalla para navegar.',
        dsl: '@P\nrow\n  avatar María García > @Perfil\n  avatar Carlos López\n  avatar Ana Martínez\n' },
      { id: 'badge',  name: 'Badge',   syntax: 'badge Texto [> @Pantalla] [$"css"]',         desc: 'Etiqueta/chip de estado. Añade > @Pantalla para navegar. Personaliza con $"css".',
        dsl: '@P\nrow\n  badge Nuevo > @Novedades\n  badge Activo $"background:#dcfce7;color:#166534"\n  badge Urgente $"background:#fee2e2;color:#991b1b"\n' },
    ],
  },
  {
    id: 'data', label: 'Datos', icon: 'fa-solid fa-chart-simple',
    items: [
      { id: 'kpi',  name: 'KPI',       syntax: 'kpi Valor Label [> @Pantalla]',         desc: 'Métrica destacada: valor grande + etiqueta. Añade > @Pantalla para navegar.',
        dsl: '@P\nrow\n  kpi 1.284 Usuarios > @Usuarios\n  kpi 94% Uptime\n  kpi 38 Tareas\n  kpi $12k MRR\n' },
      { id: 'grid', name: 'Tabla',     syntax: 'grid Col1 | Col2 | Col3', desc: 'Tabla con cabeceras y filas de datos simuladas.',
        dsl: '@P\ngrid Nombre | Rol | Estado | Fecha\n' },
      { id: 'list', name: 'Lista',     syntax: 'list\n  hijo',    desc: 'Contenedor de elementos con viñetas.',
        dsl: '@P\nlist\n  p Diseño de interfaz\n  p Revisión de código\n  p Deploy a producción\n  p Testing QA\n' },
    ],
  },
];

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [RouterLink, PlaygroundComponent, BacetoLogoComponent],
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.css'],
})
export class DocsComponent implements OnInit {
  sections: DocSection[] = [];
  activeSection = signal('globals');
  copiedId = signal<string | null>(null);

  constructor(readonly theme: ShellThemeService) {}

  ngOnInit(): void {
    // Apply paper theme CSS vars for wireframe previews
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

    // Prepare DSL for every example
    this.sections = RAW_SECTIONS.map(sec => ({
      ...sec,
      items: sec.items.map(item => ({
        ...item,
        dslLive: item.dsl.trim(),
        copied: false
      })),
    }));
  }

  scrollTo(id: string): void {
    this.activeSection.set(id);
    const el = document.getElementById('section-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onDslChange(item: DocItem, dsl: string): void {
    item.dslLive = dsl;
  }

  copyDsl(item: DocItem): void {
    navigator.clipboard.writeText(item.dslLive.trim()).then(() => {
      this.copiedId.set(item.id);
      setTimeout(() => this.copiedId.set(null), 2000);
    });
  }

  openInEditor(item: DocItem): void {
    const b64 = btoa(unescape(encodeURIComponent(item.dslLive)));
    window.location.href = `${window.location.origin}/#/editor?w=${encodeURIComponent(b64)}`;
  }
}
