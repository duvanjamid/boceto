# 🔌 Cómo integrar Boceto en tu sitio (Embed)

Boceto permite incrustar tus wireframes y prototipos en cualquier lugar que soporte HTML (Notion, Medium, tu blog personal, etc.) mediante el uso de `iframes`.

## 1. El código base
Para incrustar un prototipo, utiliza el siguiente código HTML:

```html
<iframe 
  src="https://boceto.app/#/embed?w=TU_CODIGO_BASE64&mode=lite" 
  width="100%" 
  height="500px" 
  style="border: 0; border-radius: 12px; overflow: hidden;"
  title="Boceto Preview">
</iframe>
```

## 2. Parámetros de configuración (Query Params)

Puedes personalizar el comportamiento del editor incrustado usando los siguientes parámetros en la URL:

| Parámetro | Valores | Descripción |
| :--- | :--- | :--- |
| `mode` | `lite` (default), `preview`, `full` | **Lite:** Editor + Preview. **Preview:** Solo el diseño renderizado. **Full:** Interfaz completa. |
| `theme` | `dark`, `light`, `auto` | El tema visual de la interfaz del editor (botones, fondo). |
| `readonly` | `true`, `false` | Si está en `true`, el visitante NO podrá modificar el código del ejemplo. |
| `w` | `Base64 String` | El código de tu DSL de Boceto codificado en Base64. |

## 3. Ejemplos de uso

### Solo Previsualización (Modo Lectura)
Ideal para blogs donde solo quieres mostrar el resultado final con el marco de dispositivo.
`.../#/embed?mode=preview&readonly=true&w=...`

### Editor Interactivo Oscuro
Para que tus lectores puedan jugar con el código en un ambiente oscuro.
`.../#/embed?mode=lite&theme=dark&w=...`

---
> [!TIP]
> Puedes generar estos enlaces automáticamente desde el editor oficial haciendo clic en el botón **"Compartir > Incrustar"**.
