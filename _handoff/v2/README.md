# Handoff: PickUp — MVP web

## Qué es esto

El diseño de las siete pantallas del MVP de PickUp (armar partidos, votar horarios tipo Doodle y confirmar cupo), listo para implementar en el proyecto Next.js descrito en el plan técnico.

## Sobre los archivos de este bundle

`PickUp-pantallas-MVP.html` es una **referencia de diseño**, no código de producción. Muestra la apariencia y el comportamiento buscados; **no hay que copiarlo ni pegarlo**. La tarea es **recrear estas pantallas en el codebase real** (Next.js App Router + Tailwind + shadcn/ui) usando sus patrones y su librería de componentes.

## Fidelidad

**Alta (hi-fi).** Colores, tipografías, espaciados y estados son definitivos. Se espera una implementación fiel. Lo que no está resuelto y queda a criterio de desarrollo:

- **Responsive.** Todo está diseñado a 1280px (desktop primero). Al final hay reglas de colapso para mobile.
- **Fotos.** Los bloques grises con textura de grilla son marcadores de posición de fotografía real (canchas, sedes). No hay imágenes en el bundle.
- **Mapas.** El mapa de `/explorar` y el de la sede están dibujados como referencia de composición. Se implementan con Google Maps JS API; lo que importa del diseño son los marcadores (píldora coral para el activo, punto navy para el resto).
- **Iconos.** El diseño usa muy pocos. Donde hagan falta: Lucide, stroke-width 2.

---

## Design tokens

### Color

| Token | Valor | Uso |
|---|---|---|
| `navy` | `#122544` | barra de navegación, texto de títulos, botón secundario, fondo de tarjeta de acción |
| `navy-600` | `#2a4570` | hover del botón navy, avatares, votos ajenos, barra de cupo media |
| `navy-300` | `#9fb0c6` | texto sobre navy, barra de cupo baja |
| `navy-200` | `#c3cfdd` | texto secundario sobre navy |
| `coral` | `#ff6b4a` | **acento**: botón primario, "faltan X", columna que va ganando, pin activo, link activo del nav |
| `coral-hover` | `#ff8a6b` | hover del botón primario |
| `coral-100` | `#ffe9e3` | fondo de tu fila en la grilla, avisos, formas decorativas |
| `coral-050` | `#fff4f1` | columna ganadora en las filas de lectura |
| `coral-700` | `#b03a1e` | links en coral a tamaño de texto, "eliminar mi cuenta" |
| `page` | `#edefec` | fondo de pantalla |
| `surface` | `#f8f9f7` | tarjetas, inputs, controles segmentados |
| `surface-alt` | `#e7eae6` | franjas alternas (pie de la grilla, sección "cerca tuyo") |
| `neutral-200` | `#dfe3e0` | tags neutros, track de la barra de cupo |
| `neutral-300` | `#cfd5d0` | separadores en tarjetas claras |
| `border` | `#e3e6e1` | líneas de la grilla y de las tarjetas |
| `border-input` | `#c3cad3` | borde de inputs y botones outline |
| `text` | `#16202e` | texto base |
| `text-2` | `#48535f` | párrafos secundarios |
| `text-3` | `#5a6472` | metadatos y etiquetas (mínimo para texto chico: cumple 4,5:1) |
| `text-4` | `#8a939d` | etiquetas dentro de tarjetas (solo 11–12px sobre `surface`) |
| `map` | `#d7ddd8` | fondo de mapas y placeholders de foto |

**Regla de color del producto:** el coral es solo para lo que empuja a actuar (botón primario, contador "faltan X", opción que va ganando). El navy es la estructura: navegación, títulos, acciones de navegación, votos ya emitidos. No mezclarlos.

Contraste: el coral contra fondos claros no llega a 4,5:1, así que **nunca lleva texto chico encima ni se usa como color de texto**. Sobre coral, el texto va en navy `#122544`. Para links o texto en coral usar `#b03a1e`.

### Tipografía

- **Graduate** (Google Fonts, un solo peso) — solo el logotipo `PICKUP` y los números de hora y fecha (20:00, 24, 21:00). Mayúsculas por diseño de la fuente. No usarla para títulos ni párrafos.
- **Familjen Grotesk** 400/500/600/700 — todo lo demás, en caja baja.

Escala: 54 (hero) · 48/34/29/28 (títulos de pantalla) · 26/24/21 (secciones) · 18/17 (títulos de tarjeta) · 15/14 (texto y controles) · 13/12 (metadatos y tags). Los títulos llevan `letter-spacing` negativo: -.03em a 34px y más, -.02em de 18 a 28px.

Todo número que cambie en vivo (cupos, horas, precios) lleva `font-variant-numeric: tabular-nums` para que no salte.

### Formas, sombras, estados

```
radio  999px  botones, tags, inputs, avatares, segmented, toasts
       22px   contenedores grandes (grilla de votación, mapa)
       18-20px tarjetas
       16px   filas internas y bloques de aviso

sombra sm  0 1px 3px rgba(18,37,68,.12)   tarjetas
       md  0 2px 10px rgba(18,37,68,.12)  grilla, barra de búsqueda
       lg  0 8px 24px rgba(18,37,68,.20)  tarjeta flotante del hero
```

Sin esquinas rectas en ningún lado. Hover: un paso más claro en coral (`#ff8a6b`) o más claro en navy (`#2a4570`); en outline, el borde pasa a navy. Foco de teclado: `outline: 2px solid #ff6b4a; outline-offset: 2px`. Deshabilitado: `opacity: .45`. Transiciones de 150ms `ease-out` en color y borde; la barra de cupo anima el ancho en 300ms. Nada más se mueve.

---

## Mapeo a shadcn/ui

| shadcn | Se usa en | Cambios |
|---|---|---|
| `Button` | todo | variantes `primary` (coral, texto navy), `navy` (fill navy), `outline` (borde `#c3cad3`), `ghost`; radio 999px, alto 44px |
| `Badge` | estados, "faltan X" | variantes coral / navy / neutral / outline, pill |
| `Input`, `Label`, `Form` | login, registro, onboarding, perfil | radio 999px, fondo `surface`, borde `border-input` |
| `Tabs` o `ToggleGroup` | filtros de mis-partidos, nivel, público/privado | render segmented: píldora con el activo en navy y divisorias de 1px |
| `Card` | listados, sidebar | fondo `surface`, radio 18–20px, sombra sm |
| `Avatar` | participantes | iniciales sobre navy-600 / neutral-200 / coral-100 |
| `Slider` | filtro de distancia | track `neutral-200`, relleno coral, pulgar navy de 18px con borde del fondo |
| `Progress` | barra de cupo | ver `CapacityBar` |
| `Dialog`, `Sonner` | confirmar, cancelar, avisos | toast pill: navy para éxito, coral-100 para info |

Componentes propios, en `src/components/match/`:

- **`SlotPollGrid`** — la grilla de votación. Componente central; especificado abajo.
- **`CapacityBar`** — barra de 7px + "N de M". Track `neutral-200`; relleno `navy-300` hasta 70%, `navy-600` por encima, `navy` al 100%.
- **`StatusTag`** — borrador / en votación / confirmado / jugado / cancelado.
- **`MissingCount`** — "faltan 3" / "falta 1". Siempre tag coral con texto navy.
- **`AvatarStack`** — avatares de 26 o 34px, solape -8/-10px, borde de 2px del color del fondo, último círculo "+N".
- **`MatchCard`** — la tarjeta del listado (ver abajo).
- **`VenueMap`** / **`VenuePicker`** — mapa y buscador de sedes.

---

## Pantallas

Barra de navegación compartida: fondo navy, padding `16px 40px`, gap 26px, logo Graduate 23px, links de 14px (el activo en coral), botón coral "Crear partido" y avatar de 36px. Sin sesión: "Iniciar sesión" en outline claro + "Crear partido" en coral, y los links de cuenta desaparecen.

### 1. `/` — Landing

**Para qué:** que alguien que llega de un link de WhatsApp entienda el producto y vea partidos reales sin registrarse.

Hero en grid `1.05fr .95fr`, gap 44px, padding `40px 40px 48px`, `align-items: center`.

Izquierda: tag neutro con ciudad y conteo · h1 de 54px en dos líneas · párrafo de 17px (máx. 450px) · **barra de búsqueda**: píldora `surface` de `8px 8px 8px 22px` con tres campos (Deporte / Zona / Cuándo) separados por divisorias de 1px × 32px — etiqueta de 11px sobre valor de 15px semibold — y botón circular coral de 44px con flecha · fila de tags de deportes (el activo en navy).

Derecha: placeholder de foto de 320px, radio 24px; encima, desbordando `-26px` abajo y a 20px de la derecha, una tarjeta flotante de 290px con sombra lg que muestra un partido con su barra de cupo y el tag "faltan 3". Ese desborde es intencional.

Después: franja `surface-alt` con "Cerca tuyo" y tres tarjetas de partido con foto (grid de 3, gap 16px), y "cómo funciona" en tres columnas con el número en Graduate 34px coral.

### 2. `/explorar` — Lista + mapa

Grid `230px minmax(0,1fr) auto`, gap 26px, padding `26px 40px 44px`, `align-items: start`. Filtros y mapa son `position: sticky; top: 0`.

**Filtros:** bloques con etiqueta de 13px semibold. Deporte y nivel como tags (activo en coral el deporte, en navy el nivel). Distancia como slider con el valor a la derecha. Cuándo como lista segmentada vertical de radio 16px. Abajo "Limpiar filtros" subrayado.

**Lista:** encabezado "34 partidos con lugar" + orden a la derecha; tarjetas con gap 14px. **La tarjeta con el mouse encima lleva `border: 2px solid #ff6b4a`** y sombra md, y sincroniza con el pin del mapa. Cada tarjeta reserva el borde con `border: 2px solid transparent` para que el hover no mueva el layout.

**Mapa:** 400×600px, radio 22px. Pin activo = píldora coral con "Jue 20:00 · faltan 3" y punto de 12px con borde de 3px del color del fondo. Pin inactivo = píldora `surface` y punto navy de 9px. Píldora navy abajo a la izquierda: "Moviendo el mapa se actualiza la lista". Al mover el mapa se vuelve a consultar `search_matches` con debounce.

### 3. `/partidos/[id]` — Detalle **(pantalla clave)**

Grid `minmax(0,1fr) 340px`, gap 34px, padding `32px 40px 46px`.

Encabezado: fila de tags (estado, deporte + nivel, visibilidad) · h1 de 48px · descripción de 16px (máx. 560px).

#### `SlotPollGrid` — la grilla de votación

Contenedor `border-radius: 22px`, fondo `surface`, sombra md, `overflow: hidden`. Grid CSS de `186px repeat(N, minmax(0,1fr))`, N = cantidad de opciones. **Con más de 4 opciones scrollea horizontal con la columna de nombres fija (`position: sticky; left: 0`).**

**Fila de encabezado** — una celda por opción, padding `15px 16px`, contenido centrado, fondo **navy**:
- fecha en 12px semibold `navy-300`
- hora en Graduate 26px
- "N de 10" en 12px `navy-200`, tabular
- barra de cupo al ancho completo, 6px de alto, track `rgba(244,242,236,.18)`, relleno `navy-300`

La **opción que va ganando** invierte: fondo **coral**, todo el texto en navy (la fecha en navy semibold con "· va ganando"), el texto suma "· faltan N", track `rgba(18,37,68,.2)` y relleno navy. **Su columna** lleva fondo `#fff4f1` en las filas de lectura de abajo.

**Tu fila va primero, debajo del encabezado**, con fondo `coral-100`, avatar navy de 29px y "Vos" en bold. Sus celdas son **botones de 40px**: votado = círculo navy con check coral; sin votar = círculo con `border: 2px dashed #cbb0a6` y fondo transparente, que en hover pasa a borde navy y fondo blanco. Un clic hace toggle y dispara `set_votes`; optimista, con rollback si la RPC falla.

**Las demás filas** son solo lectura, separadas por `border-top: 1px solid #e3e6e1`, avatar de 26px y nombre de 14px (con `white-space: nowrap`), el organizador con la etiqueta "org" de 11px. Voto = círculo de 23px `navy-600` con check claro; sin voto = punto de 7px `#ccd2cd`. **El contraste entre el check y el punto es lo que hace legible la grilla de un vistazo: respetarlo.**

**Pie:** franja `surface-alt`, padding `13px 18px`, instrucción a la izquierda y a la derecha punto navy de 7px + "en vivo".

Sin sesión: la fila "Vos" se reemplaza por una franja `coral-100` a todo el ancho (`grid-column: 1 / -1`) con "Iniciá sesión para votar los horarios" y un botón navy "Entrar" que va a `/login?next=/partidos/[id]`; el pie cambia a "Podés ver lo que votó cada uno. Para votar necesitás una cuenta."

**Sidebar:** tarjeta de acción **navy** (kicker en `navy-300`, título de 30px en coral con el faltante, botón coral "Me sumo" a ancho completo, "Compartir por WhatsApp" en outline claro, nota de 12px). Si el usuario ya está confirmado, el título pasa a "Nos vemos el viernes 21:00" y el primario se reemplaza por "Bajarme del partido" en outline. Debajo: tarjeta de la sede con mapa de 150px, y tarjeta de datos con filas label/valor.

### 4. `/mis-partidos`

Título de 34px + segmented a la derecha con los conteos ("Próximos · 2"). Grupos con etiqueta de 13px y tarjetas con gap 12px.

Las tarjetas llevan **`border-left: 6px`**: navy para confirmados, coral para los que esperan tu voto, sin borde para los que organizás. Bloque de fecha de 92px a la izquierda (fecha en 12px, hora en Graduate 25px), contenido al medio, acciones a la derecha (outline + navy, o un coral cuando hay algo pendiente).

### 5. `/login` y `/registro`

Tarjeta de 460px, padding `36px 34px`, radio 24px, centrada. Logo arriba · h3 de 29px · bajada de 14px · **botón de Google primero** (outline, ancho completo) · separador "o con tu email" · campos · "Olvidé mi contraseña" a la derecha · botón coral ancho completo · pie con el link a la otra pantalla. En registro, el bloque `coral-100` de radio 16px explica la verificación por email.

### 6. `/onboarding` y `/perfil`

**Onboarding:** tarjeta de 620px. Progreso: 3 segmentos de 6px con gap 6px, coral los completados, `neutral-300` el resto. Un paso por pantalla; "Atrás" en ghost, "Seguir" en coral. Deportes como tags multi-selección (activo en navy); nivel como segmented, con la aclaración de que es autodeclarado.

**Perfil:** grid `300px minmax(0,1fr)`, gap 40px. Izquierda: avatar navy de 128px con iniciales en Graduate 38px, "Cambiar foto" en outline, nombre de 23px, tags de actividad, link al perfil público. Derecha: tres bloques ("Datos", "Deportes y nivel", "Cuenta") con h3 de 21px. Cada deporte es una fila `surface` de radio 16px con el nombre a la izquierda y el segmented de nivel a la derecha. "Eliminar mi cuenta" en `coral-700`, 13px, abajo a la derecha: presente pero sin peso visual.

---

## Interacciones

| Dónde | Qué pasa |
|---|---|
| Celda de voto | toggle optimista → `set_votes`; si la RPC falla, revierte y muestra un toast de error |
| Voto propio o ajeno | conteos, barras y "faltan N" se recalculan en vivo por Realtime, sin recargar |
| Una opción llega al cupo | esa columna toma el tratamiento coral "va ganando"; con `auto_confirm` el partido pasa a confirmado |
| "Me sumo" sin sesión | `/login?next=/partidos/[id]` y vuelta al partido ya logueado |
| "Me sumo" con el cupo lleno | el botón pasa a "Anotarme en la lista de espera" en outline |
| Hover en una tarjeta de `/explorar` | borde coral de 2px en la tarjeta y píldora coral en el pin del mapa |
| Confirmar un horario (organizador) | diálogo con el resumen de quién queda confirmado y quién en espera antes de ejecutar |

**Carga:** esqueletos con fondo `neutral-200` y la forma final, no spinners. La grilla de votación se renderiza en el servidor; nunca debería aparecer vacía.

**Estado:** en la grilla, `votes: Set<slotId>` del usuario más los conteos por opción; el toggle es optimista sobre ambos. La suscripción de Realtime a `slot_votes` y `match_participants` reemplaza el estado del servidor cuando llega un cambio ajeno; los cambios propios ya aplicados no se vuelven a aplicar. Los filtros de `/explorar` viven en la URL (`?deporte=&km=&desde=&nivel=`) para que el link sea compartible y el botón de atrás funcione.

---

## Responsive

Diseñado a 1280px. Reglas de colapso:

- **Nav:** debajo de 900px los links van a un menú; quedan logo, "Crear partido" y avatar.
- **`/explorar`:** una columna. Filtros en un panel que se abre desde un botón; mapa y lista en un toggle "Lista / Mapa".
- **`SlotPollGrid`:** debajo de 700px la matriz no entra. Ahí va la vista de opciones apiladas: una tarjeta por horario a ancho completo, que se vota con un toque, con barra de cupo y avatares de quienes votaron.
- **Detalle:** el sidebar pasa abajo, salvo la tarjeta de acción, que queda fija al pie de la pantalla.
- **Landing:** hero a una columna, la tarjeta flotante pasa a estática debajo de la foto.
- **Hit targets:** nada por debajo de 44px en mobile (las celdas de voto de 40px suben a 44px).

---

## Archivos

| Archivo | Qué es |
|---|---|
| `PickUp-pantallas-MVP.html` | **Empezar por acá.** Las siete pantallas y el set de componentes, en un archivo que se abre con doble clic sin internet. La grilla de votación es clickeable. |
| `README.md` | Este documento: tokens, mapeo a shadcn y especificación por pantalla. |

Faltan por diseñar: `/partidos/nuevo` (asistente de creación), `/partidos/[id]/gestionar`, `/equipos`, `/i/[code]` y `/admin/sedes`.
