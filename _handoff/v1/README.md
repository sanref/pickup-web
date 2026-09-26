# Handoff: PickUp — MVP web

## Qué es esto

El diseño de las seis pantallas del MVP de PickUp (armar partidos, votar horarios tipo Doodle y confirmar cupo), listo para implementar en el proyecto Next.js descrito en `plan-tecnico.md`.

## Sobre los archivos de este bundle

Los HTML de esta carpeta son **referencias de diseño**, no código de producción. Muestran la apariencia y el comportamiento buscados; **no hay que copiarlos ni pegarlos**. La tarea es **recrear estas pantallas en el codebase real** (Next.js App Router + Tailwind + shadcn/ui, según el plan técnico) usando sus patrones y su librería de componentes.

El único archivo que sí es fuente de verdad literal es `styles.css`: contiene los tokens del sistema Organic (colores, tipografías, radios, sombras). Esos valores se trasladan tal cual a `globals.css` y `tailwind.config.ts`.

## Fidelidad

**Alta (hi-fi).** Colores, tipografías, espaciados y estados son definitivos. Se espera una implementación fiel. Lo que no está resuelto y queda a criterio de desarrollo:

- **Responsive.** Todo está diseñado a 1280px de ancho (desktop primero, como se pidió). Al final de este documento hay reglas de colapso para mobile.
- **Fotos.** Los bloques con textura verde a rayas son marcadores de posición de fotografía real (canchas, sedes). No hay imágenes en el bundle.
- **Mapa.** El mapa de `/explorar` y el de la sede están dibujados a mano como referencia de composición. Se implementan con Google Maps JS API; lo que importa del diseño son los marcadores (píldora terracota para el activo, punto salvia para el resto).
- **Iconos.** El diseño usa muy pocos. Donde hagan falta: Lucide con `stroke-width: 2.75`.

---

## Design tokens

Todos salen de `styles.css`. **No inventar valores nuevos.**

### Color

| Rol | Valor | Uso |
|---|---|---|
| `--color-bg` | `#f5ead8` | fondo de la app |
| `--color-surface` | `#ebddc5` | tarjetas, barra de navegación |
| `--color-text` | `#201e1d` | texto |
| `--color-accent` | `#c67139` | terracota: acción primaria, "faltan X", links |
| `--color-accent-2` | `#7a8a5e` | salvia: votos, cupo, confirmado |
| `--color-divider` | `#201e1d` al 16% | líneas |

Rampas 100–900 para cada rol (`--color-neutral-*`, `--color-accent-*`, `--color-accent-2-*`). Las que aparecen en el diseño:

```
neutral   100 #f9f4ed  200 #eee7db  300 #dcd3c4  400 #c0b6a5
          600 #82796a  700 #645c50  800 #474238
accent    100 #fff2eb  200 #ffe1d0  300 #ffc6a5  600 #b2622d  700 #8c491a  800 #643312
accent-2  100 #f0fae1  200 #e1eecc  300 #ccdbb2  400 #aebf92  600 #728157  700 #56633f  800 #3d472b
```

**Regla de color del producto:** la terracota es solo para lo que empuja a actuar (botón primario, contador "faltan X"). La salvia es para lo que ya pasó o está resuelto (votos, barra de cupo, estado confirmado). No mezclarlas.

Contraste: el accent contra el fondo llega a 3:1, sirve para chrome y titulares grandes, **no para texto de párrafo**. Para texto chico en terracota usar `--color-accent-700` (#8c491a).

### Tipografía

- Títulos: **Caprasimo** 400 (`--font-heading`), `line-height: 1.12`, `letter-spacing: -0.015em`.
- Texto: **Figtree** 400/600/700 (`--font-body`), base 15px, `line-height: 1.55`.
- Caprasimo solo tiene un peso. Nunca ponerle `font-weight: 700`.

Escala usada en las pantallas: 52/40/36 (hero y títulos de página) · 30/28/24/22 (secciones) · 20/19/18 (títulos de tarjeta) · 15 (texto) · 13/12 (metadatos) · 11 mayúsculas con `letter-spacing: .08em` (etiquetas tipo "DEPORTE").

### Espaciado, radios y sombras

```
--space-1 4.4px   --space-2 8.8px   --space-3 13.2px
--space-4 17.6px  --space-6 26.4px  --space-8 35.2px

--radius-sm 8px   --radius-md 16px  --radius-lg 28px   pill: 999px
--shadow-sm 0 1px 2px  rgba(46,43,37,.14)
--shadow-md 0 3px 10px rgba(46,43,37,.16)
--shadow-lg 0 12px 32px rgba(46,43,37,.22)
```

Botones, tags, inputs y avatares van siempre a `999px`. Tarjetas a 16px; contenedores grandes y mapas a 28px. **Sin esquinas rectas en ningún lado.**

### Estados

- Hover: un paso de la rampa (`accent-600` sobre fondo claro).
- Foco de teclado: `outline: 2px solid var(--color-accent); outline-offset: 2px`. Nunca el anillo azul del navegador.
- Deshabilitado: `opacity: .45`.

---

## Mapeo a shadcn/ui

Estos componentes de shadcn se re-tematizan con los tokens de arriba; no hay que escribirlos de cero:

| shadcn | Se usa en | Cambios |
|---|---|---|
| `Button` | todo | variantes `primary` (fill terracota), `secondary` (outline), `ghost`; `border-radius: 999px`, alto 44px |
| `Badge` | estados, "faltan X" | variantes accent / accent-2 / neutral / outline, pill |
| `Input`, `Label`, `Form` | login, registro, onboarding, perfil, crear partido | radio 999px, borde `neutral-300` |
| `Tabs` o `ToggleGroup` | filtros de `/mis-partidos`, nivel, público/privado | render tipo segmented: grupo pill con divisorias internas |
| `Card` | listados, sidebar del detalle | fondo `--color-surface`, radio 16px, sombras del sistema |
| `Avatar` | participantes | iniciales sobre `accent-2-300` o `accent-300`; sin foto, iniciales |
| `Slider` | filtro de distancia | track `neutral-300`, relleno terracota, pulgar de 18px con borde del fondo |
| `Dialog`, `Sonner` | confirmar, cancelar, avisos | ver "Avisos" en el set de componentes |
| `Progress` | barra de cupo | ver `CapacityBar` |

Componentes propios (no existen en shadcn), en `src/components/match/`:

- **`SlotPollGrid`** — la grilla de votación. Es el componente central del producto; está especificado en detalle abajo.
- **`CapacityBar`** — barra + texto "N de M". Alto 8–9px, radio 999px, track `neutral-300`, relleno `accent-2-400` hasta el 70%, `accent-2` por encima, `accent-2-700` al 100%.
- **`StatusTag`** — borrador / en votación / confirmado / jugado / cancelado.
- **`MissingCount`** — "faltan 3". Siempre tag terracota, singular y plural ("falta 1").
- **`AvatarStack`** — avatares de 26 o 34px superpuestos `-8/-10px`, borde de 2px del color del fondo, último círculo "+N" en `neutral-300`.
- **`MatchCard`** — la tarjeta del listado (ver abajo).
- **`VenueMap`** / **`VenuePicker`** — mapa y buscador de sedes.

---

## Pantallas

Todas comparten la barra de navegación: `--color-surface`, padding `20px 40px`, gap 28px, marca en Caprasimo 24px a la izquierda, links, botón primario "Crear partido" y avatar de 36px a la derecha. Sin sesión, el avatar se reemplaza por "Iniciar sesión" (secundario) + "Crear partido" (primario).

### 1. `/` — Landing

**Para qué:** que alguien que llega de un link de WhatsApp entienda el producto y vea partidos reales sin registrarse.

**Layout:** nav · hero en grid `1.05fr .95fr` con gap 48px, padding `32px 40px 48px` · franja "Cerca tuyo" con grid de 3 tarjetas · franja "cómo funciona" con 3 columnas.

**Hero, columna izquierda:** tag salvia con la ciudad y el conteo · h2 de 52px en dos líneas · párrafo de 17px, ancho máximo 440px · **barra de búsqueda**: píldora `--color-surface` de `8px 8px 8px 20px`, radio 999px, sombra sm, con tres campos (Deporte / Zona / Cuándo) separados por divisorias de 1px × 32px, etiqueta de 10px en mayúsculas sobre valor de 15px semibold, y botón primario de 44px pegado a la derecha · fila de tags de deportes.

**Hero, columna derecha:** foto de cancha de 300px de alto, radio 28px, con la clase `.washed` (`filter: saturate(.6) contrast(.85) brightness(1.1) opacity(.94)`) · encima, desbordando `-28px` abajo y `-32px` a la izquierda, una tarjeta flotante de 300px con sombra md que muestra un partido con su barra de cupo. Ese desborde es intencional.

**Cómo funciona:** tres columnas, número en Caprasimo 36px terracota, título de 17px bold, descripción de 14px. Copy exacto en el HTML.

### 2. `/explorar` — Lista + mapa

**Para qué:** encontrar un partido con lugar cerca tuyo.

**Layout:** grid de tres columnas `230px 1fr 420px`, gap 24px, padding `16px 40px 40px`, `align-items: start`. Filtros y mapa son `position: sticky; top: 0`.

**Filtros (izquierda):** bloques con etiqueta de 11px en mayúsculas. Deporte como tags seleccionables (el activo en terracota). Distancia como slider con el valor a la derecha. Cuándo como segmented vertical. Nivel como tags. Abajo "Limpiar filtros" en ghost.

**Lista (centro):** encabezado "34 partidos con lugar" + orden a la derecha, después las tarjetas `MatchCard` con gap 14px. **La tarjeta sobre la que está el mouse lleva `border: 2px solid var(--color-accent)`** y sincroniza con el pin del mapa.

**Mapa (derecha):** 620px de alto, radio 28px. Pin activo = píldora terracota con "Jue 20:00 · faltan 3" y punto de 12px con borde de 3px del color del fondo. Pin inactivo = píldora `--color-surface` y punto salvia. Al mover el mapa se vuelve a consultar `search_matches`.

### 3. `/partidos/[id]` — Detalle **(pantalla clave)**

**Para qué:** votar horarios y sumarse.

**Layout:** grid `1fr 360px`, gap 32px, padding `24px 40px 44px`.

**Encabezado:** fila de tags (estado, deporte + nivel, visibilidad) · h2 de 40px · descripción de 15px, ancho máximo 560px.

#### `SlotPollGrid` — la grilla de votación

Contenedor: `border-radius: 24px`, fondo `neutral-100` (#f9f4ed), sombra sm, `overflow: hidden`.

Grid CSS de `172px repeat(N, 1fr)` donde N = cantidad de opciones de horario. **Con más de 4 opciones el grid scrollea horizontal con la columna de nombres fija (`position: sticky; left: 0`).**

**Fila de encabezado** (una celda por opción, borde izquierdo y borde inferior `neutral-300`, padding `14px 16px`, contenido centrado):
- fecha en 11px mayúsculas `neutral-600`
- hora en Caprasimo 22px
- "N de 10" en 12px
- barra de cupo al ancho completo, 7px de alto

La **opción que va ganando** lleva fondo `accent-2-100` (#f0fae1), la fecha dice "· va ganando" en `accent-2-700`, el texto suma "· faltan N", el track de la barra es `accent-2-300` y el relleno `accent-2-600`. **Toda su columna** lleva fondo #f7fcef en las filas de abajo.

**Tu fila va primero, justo debajo del encabezado**, con fondo `accent-200` (#ffe1d0), avatar de 28px y la palabra "Vos" en bold. Sus celdas son **botones de 38px**: votado = círculo relleno `accent-2-600` con check `accent-2-100`; sin votar = círculo con `border: 2px dashed neutral-400` y fondo transparente, que en hover pasa a borde terracota y fondo `accent-100`. Un clic hace toggle y dispara `set_votes`; es optimista, con rollback si la RPC falla.

**Las demás filas** son solo lectura, separadas por `border-top: 1px solid neutral-200`, con avatar de 26px y nombre de 14px. El organizador lleva un tag `outline` de 10px con "org". Voto = círculo de 26px `accent-2-400` con check; sin voto = punto de 8px `neutral-300`. **El contraste entre el check y el punto es lo que hace legible la grilla de un vistazo: respetarlo.**

**Pie:** franja `neutral-200`, padding `14px 18px`, con la instrucción a la izquierda ("Tocá los círculos de tu fila…") y a la derecha el indicador en vivo: punto salvia de 7px + "en vivo · Realtime".

Sin sesión, la fila "Vos" se reemplaza por una franja con "Iniciá sesión para votar" y el botón que lleva a `/login?next=/partidos/[id]`.

**Sidebar (derecha):** tarjeta de acción con sombra md ("Si se confirma el viernes" / "Faltan N para el cupo" en Caprasimo 24px, botón primario "Me sumo" a ancho completo, "Compartir por WhatsApp" secundario, nota de 12px) · tarjeta de la sede con mapa de 150px arriba y datos abajo · tarjeta de datos con filas `label` a la izquierda y valor en bold a la derecha.

### 4. `/mis-partidos`

**Layout:** título de 36px + segmented a la derecha con los conteos ("Próximos · 2"), después grupos con etiqueta de 11px mayúsculas y tarjetas con gap 12px.

Las tarjetas llevan **`border-left: 6px`**: salvia para confirmados, terracota para los que esperan tu voto. Bloque de fecha de 96px a la izquierda, contenido al medio, acciones a la derecha (ghost + secundario, o un primario cuando hay algo pendiente).

### 5. `/login` y `/registro`

Tarjeta de 460px, padding `36px 34px`, radio 28px, centrada en la ventana. Marca arriba · h3 de 30px · bajada de 14px · **botón de Google primero** (secundario, ancho completo) · separador "o con tu email" (línea + texto de 12px + línea) · campos · "Olvidé mi contraseña" alineado a la derecha · botón primario ancho completo · pie con el link a la otra pantalla.

En registro, después de enviar, el bloque `accent-2-100` con radio 16px explica la verificación por email.

### 6. `/onboarding` y `/perfil`

**Onboarding:** tarjeta de 620px. Barra de progreso arriba: 3 segmentos de 6px con gap 6px, terracota los completados, `neutral-300` el resto. Un paso por pantalla, "Atrás" en ghost a la izquierda y "Seguir" primario a la derecha. Deportes como tags multi-selección; nivel como segmented, con la aclaración de que es autodeclarado.

**Perfil:** grid `300px 1fr`, gap 40px. Izquierda: avatar de 132px, "Cambiar foto" en ghost, nombre en Caprasimo 24px, tags de actividad, link al perfil público. Derecha: tres bloques ("Datos", "Deportes y nivel", "Cuenta") con h3 de 22px. Cada deporte es una fila `neutral-100` de radio 16px con el nombre a la izquierda y el segmented de nivel a la derecha. "Eliminar mi cuenta" en `accent-700`, 13px, abajo a la derecha: presente pero sin peso visual.

---

## Interacciones

| Dónde | Qué pasa |
|---|---|
| Celda de voto | toggle optimista → `set_votes`; si la RPC falla, revierte y muestra un toast de error |
| Voto propio o ajeno | los conteos, las barras y el "faltan N" se recalculan en vivo por Realtime, sin recargar |
| Una opción llega al cupo | la columna toma el tratamiento "va ganando"; con `auto_confirm` el partido pasa a confirmado |
| "Me sumo" sin sesión | `/login?next=/partidos/[id]` y vuelta al partido ya logueado |
| "Me sumo" con el cupo lleno | el botón pasa a "Anotarme en la lista de espera" (secundario) |
| Hover en una tarjeta de `/explorar` | borde terracota de 2px en la tarjeta y píldora terracota en el pin del mapa |
| Mover el mapa | se vuelve a consultar `search_matches` con debounce |
| Confirmar un horario (organizador) | diálogo con el resumen de quién queda confirmado y quién en espera antes de ejecutar |
| Transiciones | 150ms `ease-out` en colores y bordes. La barra de cupo anima el ancho en 300ms. Nada más se mueve. |

**Estados de carga:** esqueletos con el fondo `neutral-200` y la forma final (no spinners). La grilla de votación se renderiza en el servidor; nunca debería aparecer vacía.

**Estados vacíos:** ver el bloque "Vacío" en el set de componentes. Siempre traen una salida (ampliar el radio, crear un partido).

---

## Estado

En la grilla: `votes: Set<slotId>` del usuario actual, más los conteos por opción. El toggle es optimista sobre ambos. La suscripción de Realtime a `slot_votes` y `match_participants` reemplaza el estado del servidor cuando llega un cambio ajeno; los cambios propios ya aplicados no se vuelven a aplicar.

Filtros de `/explorar`: en la URL (`?deporte=&km=&desde=&nivel=`), para que el link sea compartible y el botón de atrás funcione.

---

## Responsive

El diseño es desktop (1280px). Reglas de colapso:

- **Nav:** debajo de 900px, los links van a un menú y quedan la marca, "Crear partido" y el avatar.
- **`/explorar`:** una sola columna. Filtros en un panel que se abre desde un botón; mapa y lista en un toggle "Lista / Mapa".
- **`SlotPollGrid`:** debajo de 700px la matriz no entra. Ahí conviene la vista de opciones apiladas: una tarjeta por horario, a ancho completo, que se vota con un toque, con la barra de cupo y los avatares de quienes votaron. El diseño de esa variante está en `PickUp.dc.html` (la versión de exploración, etiquetada "1b").
- **Detalle:** el sidebar pasa abajo del contenido, salvo la tarjeta de acción, que queda fija al pie de la pantalla.
- **Hit targets:** nada por debajo de 44px en mobile (las celdas de voto de 38px suben a 44px).

---

## Archivos

| Archivo | Qué es |
|---|---|
| `PickUp-pantallas-MVP.html` | **Empezar por acá.** Las seis pantallas y el set de componentes, en un solo archivo que se abre con doble clic sin internet. La grilla de votación es clickeable. |
| `styles.css` | Los tokens del sistema Organic y sus clases base. Fuente de verdad de los valores. |
| `organic-readme.md` | La guía del sistema de diseño: criterio de uso de color, tipografía, formas y estados. |

Faltan por diseñar: `/partidos/nuevo` (asistente de creación), `/partidos/[id]/gestionar`, `/equipos`, `/i/[code]` y `/admin/sedes`.
