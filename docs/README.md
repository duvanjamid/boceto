# WireScript — Uso en Markdown / Docsify

Puedes embeber wireframes interactivos directamente en cualquier archivo `.md`
usando bloques de código con el lenguaje `wirescript`.

## Instalación del plugin

### Docsify

Añade el script en tu `index.html` **después** de Docsify:

```html
<!-- index.html -->
<script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
<script src="//cdn.jsdelivr.net/npm/wirescript/plugins/docsify"></script>
```

### Prism.js (solo resaltado, sin preview)

```html
<link rel="stylesheet" href="prism.css">
<script src="prism.js"></script>
<script src="//cdn.jsdelivr.net/npm/wirescript/plugins/prism"></script>
```

---

## Sintaxis básica en Markdown

Los bloques ` ```wirescript ` se renderizan como prototipos interactivos:

~~~markdown
```wirescript
theme paper

@Login
nav MiApp
# Iniciar sesión
field Email
field Contraseña *
btn Entrar > Dashboard
link ¿Olvidaste tu contraseña? > Reset

@Dashboard
nav MiApp · Inicio · Perfil
# Bienvenido
row
  kpi 1.284 Usuarios
  kpi 94% Satisfacción
card Actividad reciente
  grid Evento · Fecha · Estado
btn Nuevo > Crear

@Crear
nav MiApp
# Nuevo registro
field Nombre
area Descripción ?
pick Categoría > A B C
---
row
  btn Guardar > Dashboard
  ghost Cancelar > Dashboard

@Reset
nav MiApp
# Recuperar acceso
field Correo electrónico
btn Enviar enlace > Login
link Volver > Login
```
~~~

---

## Referencia rápida del DSL

| Elemento | Sintaxis | Descripción |
|----------|----------|-------------|
| **Tema** | `theme paper\|blueprint\|sketch\|noir` | Primera línea del archivo |
| **Página** | `@NombrePantalla` | Define una pantalla |
| **H1/H2/H3** | `# Título` / `## Sub` / `### Mini` | Encabezados |
| **Párrafo** | `p Texto del párrafo` | Texto normal |
| **Nota** | `note Texto de ayuda` | Texto en itálica suave |
| **Divisor** | `---` | Línea separadora |
| **Nav** | `nav Logo · Link1 · Link2` | Barra de navegación superior |
| **Tabs** | `tabs Pestaña1 · Pestaña2` | Pestañas clicables |
| **Row** | `row` (hijos con 2 esp.) | Fila flexible |
| **Card** | `card Título opcional` (hijos con 2 esp.) | Tarjeta con borde |
| **Aside** | `aside` (hijos con 2 esp.) | Panel lateral |
| **Campo** | `field Etiqueta` / `field Pass *` / `field Op ?` | Input, password, opcional |
| **Textarea** | `area Etiqueta` | Área de texto |
| **Dropdown** | `pick Etiqueta > Op1 Op2 Op3` | Selector |
| **Checkbox** | `check Etiqueta` | Casilla de verificación |
| **Toggle** | `toggle Etiqueta` | Interruptor on/off |
| **Botón** | `btn Etiqueta > Pantalla` | Botón primario con navegación |
| **Ghost** | `ghost Etiqueta > Pantalla` | Botón secundario |
| **Link** | `link Etiqueta > Pantalla` | Enlace inline |
| **Imagen** | `img "Descripción"` | Placeholder de imagen |
| **Avatar** | `avatar Nombre Apellido` | Círculo con iniciales |
| **Badge** | `badge Texto` | Chip/etiqueta pequeña |
| **KPI** | `kpi 1.234 Descripción` | Métrica grande |
| **Grid** | `grid Col1 · Col2 · Col3` | Tabla con filas de ejemplo |
| **Lista** | `list · Ítem1 · Ítem2` | Lista con viñetas |

> **Tip:** `·` es el separador de ítems (Alt+. en Mac, Alt+. en Windows).
> El operador `>` siempre apunta a un nombre de pantalla para la navegación.

---

## Ejemplo: documentar un flujo completo

~~~markdown
## Flujo de autenticación

El usuario llega a la pantalla de login, introduce sus credenciales y accede
al dashboard. Si olvidó su contraseña puede solicitar un enlace de recuperación.

```wirescript
theme blueprint

@Login
nav Kova
# Acceso seguro
field Usuario
field Contraseña *
btn Continuar > Dashboard
link Olvidé mi contraseña > Reset

@Dashboard
nav Kova · Inicio · Reportes · Salir
# Panel principal
row
  kpi $42.800 Ingresos
  kpi 318 Pedidos
  kpi 99,2% Uptime
card Últimos pedidos
  grid ID · Cliente · Monto · Estado

@Reset
nav Kova
# Restablecer contraseña
p Ingresa el correo asociado a tu cuenta
field Correo electrónico
btn Enviar > Login
link Cancelar > Login
```

El flujo termina cuando el usuario recibe el correo con el enlace de acceso.
~~~

---

## Temas disponibles

| Nombre | Estilo |
|--------|--------|
| `paper` | Tonos crema, tipografía clásica |
| `blueprint` | Azul oscuro, estilo técnico |
| `sketch` | Blanco y negro, trazo marcado |
| `noir` | Fondo oscuro, contraste alto |
