---
title: Rendimiento
description: "Cuánto pesa ns-frame (núcleo de 11 KB gzip y módulos bajo demanda), cómo se mantiene ligero y los resultados del benchmark."
order: 13
---

# Rendimiento

## Tamaños (minificado + gzip / brotli)

| Archivo | gzip | brotli | |
|---|---|---|---|
| `ns-frame.js` | 10,9 KB | 9,9 KB | Núcleo (con grupos de elección, `modal`, `jump`, `watch` y utilidades compartidas) |
| `ns-frame.lite.js` | 8,4 KB | 7,6 KB | Sólo recortes |
| `ns-mosaic.js` | 9,0 KB | 8,2 KB | Mosaicos de piezas libres, orbes y luz conectada (más `ns-flow.js`) |
| `ns-extra.js` | 3,9 KB | 3,6 KB | **Bajo demanda**: degradados, animaciones de borde, acentos, aperturas, formas con scroll |
| `ns-liquid.js` | 18,8 KB | 16,9 KB | Formas líquidas, vidrio con lente y botón de gotas (más `ns-light.js`) |
| `ns-glass.js` | 3,4 KB | 3,1 KB | Vidrio en cualquier forma y grupos de vidrio (más `ns-liquid.js`) |
| `ns-glass-gl.js` | 3,8 KB | 3,4 KB | **Bajo demanda**: motor WebGL del grupo sobre una foto, un vídeo o un lienzo |
| `ns-tabs.js` | 3,7 KB | 3,4 KB | Pestañas de vidrio (más `ns-liquid.js`) |
| `ns-relief.js` | 1,7 KB | 1,4 KB | Relieve (más `ns-light.js`) |
| `ns-light.js` | 1,8 KB | 1,6 KB | La luz de la página y sus materiales (lo comparten vidrio y relieve) |
| `ns-isle.js` | 8,6 KB | 7,7 KB | Isla de navegación, con su aspecto de serie (más `ns-sheet.js`) |
| `ns-controls.js` | 4,2 KB | 3,6 KB | Controles de serie (segmentos, fichas, campos, deslizadores, niveles, interruptores, copiar, insignias, código, tarjetas, asas) |
| `ns-concentric.js` | 2,5 KB | 2,3 KB | Esquinas concéntricas automáticas |
| `ns-skel.js` | 2,6 KB | 2,3 KB | Skeletons |
| `ns-mark.js` | 2,3 KB | 2,0 KB | Resaltado continuo en varias líneas |
| `ns-toast.js` | 2,3 KB | 2,0 KB | Toasts |
| `ns-fx.css` | 2,3 KB | 2,1 KB | Efectos CSS |
| `ns-carousel.js` | 2,1 KB | 1,8 KB | Carrusel |
| `ns-flow.js` | 2,0 KB | 1,8 KB | Texto que llena la forma (lo comparte `ns-mosaic.js`) |
| `ns-link.js` | 2,0 KB | 1,8 KB | Callouts HUD |
| `ns-pop.js` | 1,8 KB | 1,6 KB | Popovers |
| `ns-sheet.js` | 1,7 KB | 1,5 KB | Hoja arrastrable |
| `ns-bento.js` | 1,5 KB | 1,3 KB | Bento |
| `ns-audit.js` | 1,3 KB | 1,2 KB | Sólo desarrollo |
| `ns-fx.js` · `ns-css.js` · `ns-vt.js` · `ns-astro.js` | 0,7–0,8 KB | 0,6–0,7 KB | decode · compilador · View Transitions · integración de Astro |
| `ns-static.js` | 0,5 KB | 0,5 KB | Build (Node) |

Cada módulo carga sólo lo que necesita (entre paréntesis): el vidrio, por ejemplo, son `ns-glass.js` + `ns-liquid.js` + `ns-light.js` + el núcleo. Hasta `v0.9.0`, `ns-mosaic.js` llevaba dentro el texto que fluye; desde `v0.10.0` lo comparte con `ns-flow.js`.

Como referencia (bundlephobia, gzip): `@floating-ui/dom` 8,2 KB sólo para posicionar popovers, `augmented-ui` 18,4 KB de CSS de cortes sin animaciones, `flubber` 18,1 KB sólo para morph y `gsap` 27,4 KB.

## Cómo se mantiene ligero

- **Vía rápida nativa.** Una forma sólo de esquinas (redondas; con `corner-shape`, también chaflanes, scoops, notches y squircles) con borde liso y sin capas extra se dibuja con `border-radius` y una sombra interior como borde: sin `clip-path` ni capa SVG. En la landing de ns-frame eso quita 45 de 153 capas SVG. Si la forma cambia (hover, pulsado) a una que no cabe en CSS, pasa sola al modo SVG y vuelve al terminar. En alto contraste no se usa. Las sombras propias van en `--ns-shadow`.
- **Táctil.** En pantallas táctiles no se aplican los filtros de resplandor (`--ns-glow`), el foco `spot` no se registra y las animaciones que repintan grandes degradados en cada frame quedan fijas: son las que calientan la GPU y pueden congelarse en móviles.
- **Carga bajo demanda.** Degradados, animaciones de borde, acentos y aperturas viven en `ns-extra.js`. Una página que sólo usa formas y bordes nunca lo descarga; si hay elementos que lo necesitan, se pide al arrancar, en paralelo al primer pintado.
- **Módulos que comparten el núcleo** (y su código de estilos) en vez de duplicarlo.
- **Build:** esbuild (bundle, tree-shaking, eliminación de código muerto para el build lite); el CSS que inyectan los módulos se minifica aparte (terser lo trata como texto) y terser prueba por archivo 12 combinaciones seguras (1–4 pasadas, `pure_getters`, ES2020, sin argumentos sobrantes, flechas) y se queda la de menos bytes en brotli. Ninguna cambia la semántica (sin `unsafe_proto`, `unsafe_regexp` ni `unsafe_Function`); los tests comparan el build con el código fuente forma a forma.
- **Formas sin JS**: las formas estáticas se pueden compilar a CSS en el build ([Formas sin JS](sin-js.md)).

## Trabajo en ejecución

- Dos `ResizeObserver` (el de tamaño y el del momento limpio), un `MutationObserver` y dos `IntersectionObserver` (visibilidad y cercanía) para toda la página, compartidos por todos los marcos.
- **Eventos delegados.** Hover, pulsado y foco se escuchan con 6 listeners en el documento, no con varios por marco: montar miles de marcos no añade listeners. El hover sólo se activa con un puntero que flota (ratón o lápiz), nunca con el dedo.
- Lectura y escritura del DOM por lotes: N elementos cuestan un recálculo de estilo, no N.
- **Lecturas limpias.** Todo lo que el núcleo lee del estilo (`getComputedStyle`, bordes, posición) se lee justo después de que el navegador maquete y antes de pintar (en un aviso de `ResizeObserver`), con el estilo ya calculado: leer ahí no fuerza nada. Lo que no llega por el aviso de tamaño (`update()`, marcos que se acercan a la pantalla, los que esperaban al módulo de extras) espera a ese momento en una cola, y un centinela fijo de 1×1 px pide el aviso del fotograma siguiente.
- **Escrituras en trozos.** Las escrituras (geometría, recorte, capa SVG) van de 40 en 40, cediendo el hilo entre trozos (`scheduler.yield()` donde existe): sin lecturas de por medio no hay recálculos forzados y cada tarea queda corta (INP, TBT). Cada lectura lleva su generación: si el marco se relee mientras espera, la escritura vieja se descarta.
- **Sólo lo que está cerca, también al cargar.** En el primer aviso, la posición de cada marco (gratis en ese momento) decide: lo que está a más de una pantalla espera a acercarse. Antes, al cargar se procesaban todos: en una tienda de prueba con 220 tarjetas (~1100 marcos), la librería provocaba miles de invalidaciones de estilo y maquetación; ahora, unas 30.
- Las capas SVG sólo existen si se usan; nada se repinta si tamaño, forma y estilo no cambiaron.
- **Memo de geometría por (forma, ancho, alto).** Marcos con la misma forma y el mismo tamaño (listas, rejillas, bentos) comparten la geometría, los comandos y la cadena del path: se calculan una vez. La caché está acotada (se vacía al pasar de 400 entradas).
- **Repintado perezoso.** Al cambiar de tamaño sólo se recalculan los marcos en pantalla o a menos de una pantalla de distancia; los demás quedan pendientes y se pintan al acercarse, antes de verse. `open()`, `close()`, `shapeOf()` y las aperturas de `data-ns-enter` pintan en el acto un marco pendiente; antes de imprimir se pinta todo.
- **Vía rápida nativa** para formas sólo de esquinas con borde liso (ver arriba).
- Las animaciones se pausan fuera de pantalla (son CSS y Web Animations: no hay SMIL) y, en táctil, mientras se desplaza la página (`.ns-scrolling` en `<html>`; `data-ns-scroll-motion` lo desactiva): cada borde animado a la vista se repintaba en cada fotograma del scroll. También en reposo: tras 20 s sin actividad, `.ns-resting` en `<html>` los pausa (`data-ns-rest="segundos"` u `"off"`). Medido a tamaño de teléfono con cuatro tarjetas con `twin` a la vista: de ~1,9 s de CPU cada 6 s a 1 ms.
- `--ns-motion-fps` pone un tope de fotogramas a los bordes animados de trazo (30 por defecto en equipos modestos): a 30 fps, el mismo caso baja de ~1,9 s a ~1,2 s.
- El vidrio que llega a la vez (las piezas de un panel) se monta unas pocas por fotograma, con ~6 ms de presupuesto, una pantalla antes de verse.
- **Mosaico:** la luz que sigue al puntero y la onda al tocar no se crean en táctil; los reintentos mientras llega el estilo de una plantilla nueva están acotados (nunca un bucle de frames).
- **Hoja e isla:** sólo animan `translate` y `opacity`; el progreso del gesto se calcula de la temporización de la animación, sin leer estilos en cada frame.
- El morph interpola vértices, no texto de path.
- **Sin maquetación forzada al montar.** Pestañas, relieve, carrusel, vidrio e isla toman su primera medida del `ResizeObserver` (llega ya maquetado); el esqueleto mide en lote al final de la tarea; `update()` agrupa las llamadas de un fotograma. Montar veinte piezas cuesta una maquetación, no veinte.
- **Bordes animados en el compositor.** `scan` es una capa HTML junto a la SVG del marco: la máscara (el trazo del borde) se rasteriza una vez y la banda se mueve sólo con `transform`. Chrome ya componía el `transform` de un elemento SVG; WebKit (Safari, todo iPhone) no, y repintaba la SVG en cada fotograma.
- **Luz en U animada:** `ns-u-live`, `-tide` y `-surge` animan dos variables heredadas; los hijos de la pieza que no las usan cortan la herencia, así que cada fotograma recalcula sólo los hijos directos (en la tarjeta de vidrio de la landing, de 66 elementos a 18).

### Medido (0.16.0 frente a 0.15.1)

Chrome sin ventana, 390×844 a dpr 3, CPU ×4, tienda de prueba con 220 tarjetas en el HTML (~1100 marcos), isla y carrito con vidrio y 4 tarjetas con `scan`; mediciones simultáneas de las dos versiones (el paralelo infla los valores absolutos por igual):

| | 0.15.1 | 0.16.0 |
|---|---|---|
| Maquetación forzada por la librería al cargar | 1,2–3,5 s | 11–45 ms |
| Invalidaciones de estilo y maquetación de la librería al cargar | miles | ~30 |
| Hilo principal en la carga | 21,8 s | 19,6 s |
| Bloqueo (TBT) al añadir tandas de 12 tarjetas | 760 ms | 382 ms |
| Scroll táctil: pintados por segundo | 8 | 4 |
| Scroll táctil: compositor | ~70 ms/s | ~47 ms/s |

En PC (landing, 1366 px), sobre la tarjeta de vidrio con luz en U: la isla al plegarse pasa de 22–62 fotogramas de más de 20 ms a 3 (p95 de 23,5 a 18,3 ms), y el estilo, de ~115 a ~74 ms por segundo.

El bloqueo total de la **carga** de una página así lo domina su propio tamaño (maquetar miles de nodos, las fuentes que llegan): la librería ya casi no aporta, y el resto depende de la página (`content-visibility: auto` en listas largas, menos nodos por tarjeta).

## Dispositivos modestos

Un móvil de gama baja no debe ser un bloqueo. La librería tiene **dos niveles** (`quality()`):

- **Automático:** `low` con poca memoria (Chrome la informa en tramos: 4 GB o menos), 2 núcleos o menos, ahorro de datos activado, o si durante un segundo tras cargar más de un cuarto de los fotogramas pasa de 34 ms (sólo baja, nunca sube). Un iPhone no informa su memoria y queda en `high`.
- **Fijo:** `<html data-ns-quality="low">` (o `"high"`).
- **Qué cambia en `low`:** el vidrio usa sólo el desenfoque nativo con su tinte y la luz del canto: sin mapa de lente, sin WebGL y sin la capa aparte del canto (lo que agotaba la memoria gráfica de un móvil modesto y dejaba la pestaña en negro o con cuadros sin pintar). La luz de la página queda fija. El resto de la librería es igual.
- El nivel queda en `<html data-ns-tier="low|high">` para tu propio CSS (por ejemplo, apagar una animación decorativa), y un cambio avisa con el evento `ns-quality`.

Con la CPU ×6 en un móvil simulado, estos cambios bajaron las tareas largas de la sección más cargada de la landing de 3,3 s a 2,1 s en total, y el trabajo de montaje junto al mosaico de 1300 a 886 ms.

## Benchmark

`packages/ns-frame/test/bench.html` monta N marcos con borde, los redimensiona todos a la vez y genera 20.000 paths. Hace una ronda de calentamiento y da la mediana de 7. Parámetros: `?n=4000` (cantidad) y `?src=../dist/ns-frame.js` (medir el build).

Medido en Chromium (Windows, 1280×900), build minificado. Con **4.000 marcos**, antes y después de repartir el trabajo en lotes:

| | v0.7 | v0.8 |
|---|---|---|
| Tarea más larga al montar | ~205 ms | **< 50 ms** (ninguna tarea larga) |
| Redimensionar todos | ~610 ms | **~165–250 ms** |
| Tarea más larga al redimensionar | ~165–180 ms | **0–53 ms** |
| Montaje completo | ~215 ms | ~255–275 ms (el trabajo se reparte en más frames, pero la página sigue respondiendo) |

En v0.9, con memo de geometría y repintado perezoso (misma máquina, CPU sin limitar, mediana de 3 ejecuciones):

| 4.000 marcos | v0.8 | v0.9 |
|---|---|---|
| Redimensionar todos | ~283 ms | **~105 ms** |
| Montaje completo | ~288 ms | ~275 ms |
| Tarea más larga | 0–52 ms | 0–57 ms |

Con la CPU limitada ×4 (móvil de gama media) el redimensionado queda en ~600 ms en ambas versiones: ahí manda el trabajo propio del navegador al recolocar 4.000 elementos, no el de la librería. El `pathMicros` del benchmark baja a ~0,1 µs porque sus 20.000 paths repiten 50 tamaños y los sirve la caché; un tamaño nuevo sigue costando 5–10 µs.

Con **1.000 marcos**, ninguna versión produce tareas largas: montar ronda 40–60 ms, redimensionar 40–65 ms y generar un path 5–9 µs. Estos números varían con el equipo y su temperatura: compara siempre en la misma sesión y alternando versiones.
