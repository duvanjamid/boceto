# Boceto DSL — Referencia completa

Boceto usa un lenguaje declarativo basado en texto para diseñar wireframes interactivos. Cada archivo describe pantallas y sus elementos usando palabras clave con indentación.

---

## Estructura básica

```boceto
theme paper

@Login
nav MiApp
# Bienvenido
p Ingresa tus datos
---
field Email
field Contraseña *
btn Entrar > @Dashboard

@Dashboard
nav MiApp | Inicio | Perfil
# Panel principal
row
  kpi 1.284 Usuarios
  kpi 94% Activo
```

### Reglas generales

| Regla | Descripción |
|-------|-------------|
| `@Nombre` | Define una pantalla nueva. Todo lo que sigue hasta el próximo `@` pertenece a esta pantalla. |
| Indentación | Determina la jerarquía. Usa **2 espacios** para hijos de contenedores. |
| `\|` | Separa ítems en nav, grid, pick, tabs. |
| `//` | Comentario. La línea se ignora. |
| `$"css"` | Inyecta CSS inline en cualquier elemento. |

## Ajustes Globales

### Tema Visual (`theme`)
```boceto
theme paper
```

Debe estar al inicio del archivo, antes del primer `@`.

| Valor | Descripción |
|-------|-------------|
| `paper` | Tonos beige, estilo impreso. (default) |
| `blueprint` | Azul oscuro, estilo técnico. |
| `sketch` | Blanco y negro, estilo boceto. |
| `noir` | Fondo oscuro, estilo dark. |
| `handwriting` | Tonos cálidos, estilo manuscrito. |
| `arch` | Azul profundo, estilo arquitectónico. |

### Marcador de Dispositivo (`frame`)
En lugar de mostrar el wireframe estirado al 100% de la pantalla, puedes enmarcarlo visualmente en un dispositivo específico. Debe estar al inicio del archivo, antes del primer `@`.

```boceto
frame ios
```

| Valor | Descripción |
|-------|-------------|
| `auto` | Sin marco, ancho 100% hasta 440px o fluido. (default) |
| `ios` | Marco simulando un iPhone con Dynamic Island y barra indicadora. Ancho estricto. |
| `android` | Marco simulando dispositivo Android moderno con notch circular y barra inferior. |
| `browser` | Marco simulando ventana de macOS con botones de controles y fondo de página. |

---

## Tipografía

```boceto
# Título H1
## Subtítulo H2
### Sección H3
p Este es un párrafo de cuerpo.
note Esta es una anotación secundaria, más pequeña.
---
```

| Palabra clave | Resultado |
|--------------|-----------|
| `# Texto` | Encabezado grande (H1) |
| `## Texto` | Encabezado mediano (H2) |
| `### Texto` | Encabezado pequeño (H3) |
| `p Texto` | Párrafo de cuerpo |
| `note Texto` | Anotación / texto secundario |
| `---` | Separador horizontal |

---

## Navegación

```boceto
nav MiApp | Inicio | Proyectos | Ajustes
```

El primer ítem es el **logo / nombre de la app**. Los siguientes son enlaces.
Cualquier ítem puede usar `> @Pantalla` para navegar.

```boceto
nav App | Inicio > @Inicio | Ajustes > @Configuracion

// Estilos por ítem:
nav App $"background:#1a1630;color:#fff" | Inicio | Proyectos
```

El `$"..."` al final del ítem aplica estilos solo a ese ítem.

---

## Contenedores

Los contenedores agrupan elementos hijos con indentación (2 espacios).

### `row` — fila horizontal

```boceto
row
  btn Guardar
  ghost Cancelar

row right
  btn Siguiente > @Paso2

row center
  avatar Juan Pérez

row space
  # Título
  badge Activo
```

Variantes: `row`, `row right`, `row center`, `row space`

### `col` — columna vertical dentro de un row

```boceto
row
  col
    # Izquierda
    p Descripción
  col
    img Foto
```

### `card` — tarjeta con título opcional

```boceto
card Proyectos recientes
  grid Nombre | Estado | Fecha

card+
  p Esta tarjeta tiene botón de cerrar
```

### `card` — tarjeta con título opcional

```boceto
card Proyectos recientes
  grid Nombre $"color:red" | Estado | Fecha

card+
  p Esta tarjeta tiene botón de cerrar
```

`card+` agrega un botón × en la esquina superior derecha.

### `aside` — panel lateral

```boceto
aside
  nav App | Inicio | Configuración
  avatar Juan Pérez
```

### `modal` — ventana modal

```boceto
modal Confirmar acción
  p ¿Estás seguro de eliminar este proyecto?
  row right
    ghost Cancelar
    btn Eliminar $"background:#dc2626"
```

### `tabs` — pestañas con contenido

Usa `---` para separar el contenido de cada pestaña.

```boceto
tabs General | Seguridad | Facturación
  field Nombre completo
  field Email
  ---
  field Contraseña actual *
  field Nueva contraseña *
  ---
  kpi $99 Plan actual
  btn Actualizar plan
```

---

## Formularios

### `field` — campo de texto

```boceto
field Email
field Contraseña *
field Apodo ?
```

| Modificador | Descripción |
|-------------|-------------|
| *(ninguno)* | Campo de texto normal |
| `*` al final | Campo de contraseña (muestra ••••••••) |
| `?` al final | Indica que es opcional |

### `area` — área de texto

```boceto
area Descripción del proyecto
```

### `pick` — selector / dropdown

```boceto
pick País | Colombia | México | Chile | Argentina
pick Rol | Admin | Editor | Lector
```

El **primer ítem** es la etiqueta. Los siguientes son las opciones seleccionables.

### `check` — casilla de verificación

```boceto
check Aceptar términos y condiciones
check Notificaciones por email *
```

`*` al final = marcada por defecto. El usuario puede hacer click para cambiar.

### `toggle` — interruptor on/off

```boceto
toggle Modo oscuro
toggle Notificaciones push *
```

`*` al final = activado por defecto. El usuario puede hacer click para cambiar.

---

## Acciones

### `btn` — botón primario

```boceto
btn Guardar
btn Enviar > @Confirmación
btn Eliminar $"background:#dc2626;color:white"
```

### `ghost` — botón secundario (outline)

```boceto
ghost Cancelar
ghost Ver todos > @Proyectos
```

### `link` — enlace inline

```boceto
link ¿Olvidaste tu contraseña? > @Reset
link Ver documentación
```

Todos aceptan `> @Pantalla` para navegar entre páginas.

---

## Contenido

### `img` — placeholder de imagen

```boceto
img Foto de perfil
img Banner principal $"height:200px"
img Logo interactivo > @Inicio
```

### `avatar` — avatar con iniciales

```boceto
avatar Juan Pérez
avatar Ana López $"background:#7c3aed"
avatar Mi Perfil > @Dashboard
```

### `badge` — etiqueta / chip de estado

```boceto
badge Activo
badge Novedades > @Changelog
badge Pendiente $"background:#fef9c3;color:#854d0e;border-color:#fde047"
badge Error $"background:#fee2e2;color:#991b1b"
```

### `kpi` — métrica grande

```boceto
kpi 1.284 Usuarios activos
kpi 94% Tasa de retención
kpi $2.4M Ingresos > @ReporteFinanciero
```

### `grid` — tabla
```boceto
grid Nombre | Estado | Fecha | Acciones
```
Muestra encabezados reales y filas simuladas con barras de placeholder.

### `list` — contenedor con viñetas
```boceto
list
  p Revisión de diseño
  p Aprobación cliente
  btn Deploy a producción
```
Cada hijo indentado se muestra con una viñeta.

---

## Modificador de estilo `$"..."`

Aplica cualquier propiedad CSS inline al elemento. Va **al final de la línea**.

```boceto
// Elemento completo:
card $"border-color:#7c3aed;border-width:2px"
btn Confirmar $"background:#16a34a"
badge Beta $"background:#dbeafe;color:#1e40af"

// Por ítem (nav, tabs):
nav App | Inicio $"color:#a78bfa" | Proyectos | Ajustes
tabs Activos $"color:#16a34a" | Archivados | Eliminados
```

---

## Navegación entre pantallas

`btn`, `ghost`, `link`, ítems de `nav`, `avatar`, `badge`, `img` y `kpi` aceptan `> @NombrePantalla` para navegar:

```boceto
@Login
btn Entrar > @Dashboard
link Crear cuenta > @Registro

@Dashboard
btn Cerrar sesión > @Login
```

El nombre debe coincidir exactamente con el `@NombrePantalla` destino.

---

## Ejemplo completo

```boceto
theme paper

@Login
nav MiApp
# Bienvenido de vuelta
p Ingresa tus credenciales para continuar
---
field Email
field Contraseña *
check Mantener sesión iniciada
btn Entrar > @Dashboard
link ¿Olvidaste tu contraseña? > @Reset

@Dashboard
nav MiApp | Inicio | Proyectos | Ajustes
row space
  # Panel principal
  row
    avatar Ana López
    badge Pro $"background:#ede9fe;color:#5b21b6"
row
  kpi 1.284 Usuarios
  kpi 94% Activo
  kpi 38 Proyectos
card+ Proyectos recientes
  grid Nombre | Estado | Fecha
  row right
    btn Nuevo proyecto > @Crear
    ghost Ver todos

@Crear
nav MiApp | Inicio | Proyectos
# Nuevo proyecto
field Nombre del proyecto
area Descripción
pick Tipo | Web App | Mobile | Dashboard | Landing
pick Equipo | Diseño | Producto | Ingeniería
check Hacer público
row right
  ghost Cancelar > @Dashboard
  btn Crear proyecto > @Dashboard
```

---
