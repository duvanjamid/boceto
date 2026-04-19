import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WirePage, ParsedDSL, THEMES } from '../../types';
import { PageViewComponent } from '../page-view.component';
import { EditorComponent } from '../editor.component';
import { ShellThemeService } from '../shell-theme.service';
import { BacetoLogoComponent } from '../boceto-logo.component';

// ── Inline parser (kept in sync) ─────────────────────────────────────────────
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
    if (t.startsWith('@')) { cur = { name: t.slice(1).trim(), children: [] }; pages[cur.name] = cur; stack = []; continue; }
    if (!cur) continue;
    while (stack.length && stack[stack.length - 1].indent >= ind) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : cur;
    const _sm = t.match(/\s*\$"([^"]*)"\s*$/);
    const nodeStyle = _sm?.[1];
    if (_sm) t = t.slice(0, (_sm.index ?? t.length)).trim();
    const rest = t.replace(/^[^\s]+\s*/, '');
    let node: any = null;
    if (t === '---')                    node = { type: 'divider' };
    else if (/^#{1,3} /.test(t))       { const lvl = (t.match(/^(#+)/) as RegExpMatchArray)[1].length; node = { type: `h${lvl}`, text: t.replace(/^#+\s*/, '') }; }
    else if (t.startsWith('p '))        node = { type: 'para',   text: unquote(rest) };
    else if (t.startsWith('note '))     node = { type: 'note',   text: unquote(rest) };
    else if (t.startsWith('nav '))      node = { type: 'nav',    items: splitDot(rest) };
    else if (t.startsWith('tabs '))     node = { type: 'tabs',   items: splitDot(rest), children: [] };
    else if (t.startsWith('field '))    { const pw = rest.trimEnd().endsWith('*'), op = rest.trimEnd().endsWith('?'); node = { type: 'field', label: unquote(noArrow(rest).replace(/[*?]$/, '').trim()), password: pw, optional: op }; }
    else if (t.startsWith('area '))     node = { type: 'area',   label: unquote(rest) };
    else if (t.startsWith('pick '))     { const parts = splitDot(rest); node = { type: 'pick', label: unquote(parts[0] ?? ''), options: parts.slice(1) }; }
    else if (t.startsWith('check '))    { const ck = rest.trimEnd().endsWith('*'); node = { type: 'check',  label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck || undefined }; }
    else if (t.startsWith('toggle '))   { const ck = rest.trimEnd().endsWith('*'); node = { type: 'toggle', label: unquote(rest.trimEnd().replace(/\*$/, '').trim()), checked: ck || undefined }; }
    else if (t.startsWith('btn '))      node = { type: 'btn',    label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('ghost '))    node = { type: 'ghost',  label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('link '))     node = { type: 'link',   label: unquote(noArrow(rest)), target: arrowT(rest) };
    else if (t.startsWith('img '))      node = { type: 'img',    label: unquote(rest) };
    else if (t.startsWith('avatar '))   node = { type: 'avatar', name: unquote(rest) };
    else if (t.startsWith('badge '))    node = { type: 'badge',  text: unquote(rest) };
    else if (t === 'row' || t.startsWith('row ')) node = { type: 'row', align: t.length > 3 ? t.slice(4).trim() : '', children: [] };
    else if (t === 'col')               node = { type: 'col',    children: [] };
    else if (t === 'card' || t === 'card+' || t.startsWith('card ') || t.startsWith('card+ ')) { const cl = t.startsWith('card+'); const tr = cl ? t.slice(5).trim() : rest; node = { type: 'card', title: tr ? unquote(tr) : '', closable: cl, children: [] }; }
    else if (t === 'aside')             node = { type: 'aside',  children: [] };
    else if (t === 'modal' || t.startsWith('modal ')) node = { type: 'modal', title: rest ? unquote(rest) : '', children: [] };
    else if (t.startsWith('kpi '))      { const [v, ...r] = rest.split(/\s+/); node = { type: 'kpi', value: v, label: r.join(' ') }; }
    else if (t.startsWith('grid '))     node = { type: 'grid',   cols: splitDot(rest) };
    else if (t.startsWith('list '))     node = { type: 'list',   items: splitDot(rest) };
    if (node) { if (nodeStyle) node.style = nodeStyle; parent.children.push(node); if (['row','col','card','aside','modal','tabs'].includes(node.type)) stack.push({ indent: ind, node }); }
  }
  return { pages, theme };
}

export interface DocItem {
  id: string;
  name: string;
  syntax: string;
  desc: string;
  dsl: string;
  dslLive: string;
  page?: WirePage | null;
  livePage?: WirePage | null;
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
    id: 'typography', label: 'Tipografía', icon: 'T',
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
    id: 'navigation', label: 'Navegación', icon: 'N',
    items: [
      { id: 'nav',  name: 'Barra nav',  syntax: 'nav Logo | Link | Link [$"css"]', desc: 'Barra de navegación. Usa | o · para separar ítems. $"css" aplica estilos al nav.',
        dsl: '@P\nnav App | Inicio | Proyectos | Ajustes\nnav App | Inicio | Proyectos $"background:#0d1b2a;color:#c8e4ff"\n# Contenido\n' },
      { id: 'tabs', name: 'Pestañas',   syntax: 'tabs Tab1 · Tab2\n  contenido\n  ---\n  otro', desc: 'Pestañas interactivas. Indenta el contenido de cada tab, usa --- para separar secciones.',
        dsl: '@P\ntabs General · Seguridad · Billing\n  field Nombre completo\n  field Email\n  btn Guardar\n  ---\n  toggle Autenticación 2FA\n  toggle Sesiones activas\n  ---\n  pick Plan > Free Pro Enterprise\n  note Facturación mensual\n' },
    ],
  },
  {
    id: 'layout', label: 'Layout', icon: 'L',
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
    id: 'forms', label: 'Formularios', icon: 'F',
    items: [
      { id: 'field',  name: 'Campo',       syntax: 'field Label [* | ?]', desc: 'Input de texto. Añade * para contraseña, ? para opcional.',
        dsl: '@P\nfield Nombre completo\nfield Correo electrónico\nfield Contraseña *\nfield Teléfono ?\n' },
      { id: 'area',   name: 'Área',        syntax: 'area Label',           desc: 'Textarea multilínea para textos largos.',
        dsl: '@P\nfield Asunto\narea Mensaje\nnote Máximo 500 caracteres\n' },
      { id: 'pick',   name: 'Select',      syntax: 'pick Label > Op1 Op2', desc: 'Menú desplegable con opciones.',
        dsl: '@P\npick País > México España Colombia Argentina\npick Prioridad > Alta Media Baja\n' },
      { id: 'check',  name: 'Checkbox',    syntax: 'check Label',          desc: 'Casilla de verificación interactiva. Haz clic para marcar/desmarcar.',
        dsl: '@P\ncheck Acepto los términos y condiciones\ncheck Recibir newsletter\ncheck Mantener sesión iniciada\n' },
      { id: 'toggle', name: 'Toggle',      syntax: 'toggle Label',         desc: 'Interruptor on/off interactivo con animación. Haz clic para activar.',
        dsl: '@P\ntoggle Notificaciones push\ntoggle Modo oscuro\ntoggle Sincronización automática\n' },
    ],
  },
  {
    id: 'actions', label: 'Acciones', icon: 'A',
    items: [
      { id: 'btn',   name: 'Botón',       syntax: 'btn Label [> Pantalla] [$"css"]',   desc: 'Botón primario. Usa $"css" al final para personalizar colores. Añade > para navegar.',
        dsl: '@P\nrow\n  btn Guardar\n  btn Eliminar $"background:#dc2626"\n  btn Publicar $"background:#16a34a"\n' },
      { id: 'ghost', name: 'Ghost',        syntax: 'ghost Label [> Pantalla] [$"css"]', desc: 'Botón outline. Personaliza con $"color:red;border-color:red".',
        dsl: '@P\nrow\n  btn Confirmar\n  ghost Cancelar\n  ghost Descartar $"color:#dc2626;border-color:#dc2626"\n' },
      { id: 'link',  name: 'Enlace',       syntax: 'link Label [> Pantalla]',          desc: 'Enlace de texto inline.',
        dsl: '@P\np ¿No tienes cuenta?\nlink Regístrate aquí > Registro\nlink ¿Olvidaste tu contraseña? > Reset\n' },
    ],
  },
  {
    id: 'media', label: 'Medios', icon: 'M',
    items: [
      { id: 'img',    name: 'Imagen',  syntax: 'img "Alt text"',              desc: 'Placeholder de imagen. Dentro de row se distribuyen en columnas.',
        dsl: '@P\nrow\n  img "Foto principal"\n  img "Miniatura"\nimg "Banner ancho completo"\n' },
      { id: 'avatar', name: 'Avatar',  syntax: 'avatar Nombre',               desc: 'Avatar de usuario con iniciales generadas automáticamente.',
        dsl: '@P\nrow\n  avatar María García\n  avatar Carlos López\n  avatar Ana Martínez\n' },
      { id: 'badge',  name: 'Badge',   syntax: 'badge Texto [$"css"]',         desc: 'Etiqueta/chip de estado. Personaliza con $"background:color;color:color".',
        dsl: '@P\nrow\n  badge Nuevo\n  badge Activo $"background:#dcfce7;color:#166534;border-color:#86efac"\n  badge Urgente $"background:#fee2e2;color:#991b1b;border-color:#fca5a5"\n' },
    ],
  },
  {
    id: 'data', label: 'Datos', icon: 'D',
    items: [
      { id: 'kpi',  name: 'KPI',       syntax: 'kpi Valor Label',         desc: 'Métrica destacada: valor grande + etiqueta.',
        dsl: '@P\nrow\n  kpi 1.284 Usuarios\n  kpi 94% Uptime\n  kpi 38 Tareas\n  kpi $12k MRR\n' },
      { id: 'grid', name: 'Tabla',     syntax: 'grid Col1 · Col2 · Col3', desc: 'Tabla con cabeceras y filas de datos simuladas.',
        dsl: '@P\ngrid Nombre · Rol · Estado · Fecha\n' },
      { id: 'list', name: 'Lista',     syntax: 'list · Item1 · Item2',    desc: 'Lista de elementos con viñetas.',
        dsl: '@P\nlist · Diseño de interfaz · Revisión de código · Deploy a producción · Testing QA\n' },
    ],
  },
];

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [RouterLink, PageViewComponent, EditorComponent, BacetoLogoComponent],
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.css'],
})
export class DocsComponent implements OnInit {
  sections: DocSection[] = [];
  activeSection = signal('typography');
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

    // Parse DSL for every example
    this.sections = RAW_SECTIONS.map(sec => ({
      ...sec,
      items: sec.items.map(item => {
        const dslLive = item.dsl.trim();
        const parsed = parseDSL(dslLive);
        const page = parsed.pages['P'] ?? null;
        return { ...item, dslLive, page, livePage: page, copied: false };
      }),
    }));
  }

  scrollTo(id: string): void {
    this.activeSection.set(id);
    const el = document.getElementById('section-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onDslChange(item: DocItem, dsl: string): void {
    item.dslLive = dsl;
    const parsed = parseDSL(dsl);
    item.livePage = parsed.pages['P'] ?? null;
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
