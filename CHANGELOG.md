# Changelog

## 0.11.2 — el vidrio del grupo se desvanece con su pieza; sin destello al tocar

- **Grupo de vidrio:** cada caja lleva la opacidad de su pieza (`draw(d, moving, boxes)` con 9 valores por caja). Una pieza que se desvanece se lleva su vidrio; antes quedaba su silueta vacía y se iba de golpe (en el panel de la landing parecía un parpadeo al abrir la lista de modos). El grupo redibuja también cuando sólo cambia la opacidad.
- **Sin el recuadro gris del toque** (iOS/Android) en formas, vidrio, grupos de elección y controles: era rectangular aunque la pieza tuviera forma y se veía unos milisegundos al tocar.
- Panel de la landing: la pieza entera se anima (tamaño, opacidad y visibilidad), la mitad de animaciones: la vuelta, con CPU 4×, sin fotogramas largos (antes 18).
- Barra de pestañas de la landing: dentro del ancho de las fotos y con una lente corta (`--ns-glass-lens: 12px`); en el PC los extremos ya no doblan el margen oscuro de la pantalla. Fuera una marca ajena en su texto.

## 0.11.1 — grupo de vidrio más fluido y con bordes exactos, SEO del sitio

### Vidrio en grupo (motor WebGL)
- **Bordes exactos:** las piezas con `border-radius` (casi todas) ya no se rasterizan: el shader calcula la distancia exacta de cada caja redondeada (hasta 48 por grupo). La silueta y el canto son limpios en las curvas (antes, escalones y un brillo suelto donde la curva se une a la recta). Las formas de ns-frame (chaflanes, muescas…) siguen con el campo rasterizado, ahora en coma flotante de 16 bits (sin escalones en el borde).
- **Más fluido al animar:** el motor dibuja en el mismo fotograma que las piezas (antes, uno después: el vidrio iba desfasado) y, con formas rasterizadas, usa una rejilla más basta mientras hay movimiento y la fina al pararse. En el panel de la landing, con CPU 4×: la ida pasa de 41 a 62 fotogramas por segundo y la vuelta de 55 a 73.
- El lienzo se dibuja a la densidad de la pantalla hasta 3× (antes 2×: en un iPhone el canto se veía granulado) y el borde se suaviza en un píxel del lienzo.
- `glEngine().draw(d, moving, boxes)` (desde 0.11.2, 9 valores por caja: también la opacidad); `corners(el, w, h)` exportado de `ns-frame/light` (radios reales de las cuatro esquinas).

### Landing
- Panel de vidrio: la salida y la entrada se solapan (sin hueco vacío), escalonado de 200 ms como mucho y curva de frenado largo sin rebote; el foco llega a su sitio en cuanto la pieza se ve, también con el móvil cargado.
- **SEO:** cabecera común (`Seo.astro`) con Open Graph, tarjeta grande de Twitter/X, `og:image` (`/og.png`), idioma y datos estructurados (`WebSite` y `SoftwareSourceCode` en la landing; `TechArticle` y migas de pan en las guías); `sitemap.xml` y `robots.txt` generados en el build sin dependencias. La canónica y las URL absolutas salen de `site` en `astro.config.mjs` (se omiten mientras no haya URL de producción). Descripciones de las guías entre 120 y 160 caracteres.
- Los laboratorios locales de `packages/ns-frame/test` ya no se copian al sitio: sólo las páginas de prueba públicas (`bench`, `compat`, `csp`, `mosaic`), fuera de los buscadores.
- Tamaños al día en la landing, el README y las guías (núcleo 10,9 KB gzip).
- Sin nombres de marcas ajenas en textos, comentarios ni palabras clave del paquete (nuevas: `glassmorphism`, `frosted-glass`, `webgl`, `form-controls`…).

## 0.11.0 — vidrio en grupo, controles de serie y panel de sistema

### Móviles modestos
- **Nivel de calidad** (`quality()`, `<html data-ns-tier>`): automático por memoria, núcleos, ahorro de datos y fotogramas medidos al cargar, o fijo con `data-ns-quality`. En `low` el vidrio es sólo desenfoque nativo, tinte y canto (sin lente, sin WebGL): en un Android modesto la pestaña ya no se queda en negro ni pinta cuadros vacíos. Ver [Rendimiento](docs/rendimiento.md#dispositivos-modestos).
- **Menos trabajo en el desplazamiento:** el vidrio mide su tono una vez (y en uno fijo, en un momento libre); el campo de la lente sólo se calcula al detenerse la forma; el carrusel y las pestañas ya no maquetan en cada fotograma; la luz de la página cambia en pasos de 2°; `ns-link` comprueba la altura tres veces por segundo.
- **Sin maquetación forzada al montar** (pestañas, relieve, carrusel, esqueleto) y `update()` en lote; `fontsReady()` compartido en un momento libre.
- Isla: nada asoma fuera de la silueta al cerrar (una máscara vertical sigue a su borde, con el borde difuminado); la página se libera al terminar el cierre (antes, al soltar, un tirón); la cápsula cabe el texto de todas las secciones sin cambiar de ancho al cambiar de sección.
- Mosaico: `--ns-mosaic-glow-size` y `--ns-mosaic-ripple-time`. Landing: un efecto a la vez, con velocidad, intensidad y color; en el móvil, selectores en dos columnas en vez de una fila que se desliza.
- **Isla en el escritorio:** con ratón y 900 px o más, hoja de 600 px con cuatro columnas, sin asa, con respuesta al puntero; la rejilla de secciones pone tantas columnas como quepan (`--ns-isle-tile-min`). La landing la usa también en PC.
- **Vidrio: el contenido siempre encima**, también un texto suelto (antes quedaba bajo las capas del vidrio): el elemento aísla su apilamiento y las capas van detrás. Combinado con `ns-frame/bento`, cada pieza de vidrio sigue la forma que le da el bento.
- **`data-ns-glass="frost"`**: vidrio esmerilado sin lente, sin WebGL y sin filtros de luz (desenfoque nativo, tinte y canto fino), igual en todos los motores; es el que usa todo vidrio con calidad baja. En el iPhone, nueve piezas con lente a la vez salían negras, con bordes dentados y puntos blancos en las esquinas.
- **Mosaico, efecto `stream`:** la estela sólo enciende el contorno de las piezas (va en la capa enmascarada por los bordes): ya no hay líneas duras cruzando los huecos.
- **Carrusel:** `data-ns-carousel-current` y `data-ns-carousel-shape` (la diapositiva que llega cambia de silueta con morph), clase `ns-car-on`, `--ns-snap` (centradas, con las vecinas asomando); las posiciones siguen la alineación real.
- **`data-ns-glass-group`**: muchas piezas de vidrio con una sola capa de desenfoque, recortada con la unión de sus siluetas. Con nueve vidrios sueltos, un iPhone dejaba zonas en negro; ahora el coste no crece con el número de piezas. El mosaico de la landing es vidrio entero también en el móvil.
- **Motor de vidrio del grupo, en tres niveles** (todas las piezas en una pasada):
  1. **Fondo conocido** (un `<img>`, `<video>` o `<canvas>` que cubre el grupo, un fondo CSS con `url()`, o `data-ns-glass-group="selector"`): un solo lienzo WebGL2 (`ns-frame/glass-gl`, se carga sólo si hace falta) con lente, desenfoque, saturación, canto según la luz y dispersión cromática, sacados del campo de distancias de la unión. Igual en Chromium, Safari y Firefox, y el coste no depende del número de piezas. Variables: `--ns-glass-lens`, `--ns-glass-depth`, `--ns-glass-group-blur`, `--ns-glass-sat`, `--ns-glass-dispersion`, `--ns-glass-rim`. La imagen necesita CORS; sin él, sin WebGL2 o si se pierde el contexto, el grupo vuelve solo al nivel 2 o 3.
  2. **Fondo de la página en Chromium:** la capa compartida lleva un único mapa de desplazamiento de la unión (`feDisplacementMap` en `backdrop-filter`): la lente curva el fondo en el canto de todas las piezas con un solo filtro.
  3. **Fondo de la página en Safari y Firefox:** la capa de desenfoque compartida. WebKit no aplica filtros SVG al fondo (bug 245510); cuando lo corrija, el nivel 2 le servirá sin cambios.
  `data-ns-glass-group="native"` fuerza la capa nativa. El grupo vuelve a elegir nivel si cambia su fondo (otra clase, otro hijo), y la capa nativa se queda hasta que el motor dibuja con el fondo cargado.
- **`data-ns-glass-group="pane"`**: vidrio de panel de sistema: desenfoque fuerte, lente suave, fondo aclarado (`--ns-glass-lift`), tinte claro y canto en degradado (brillante en dos esquinas opuestas). Las piezas con `aria-pressed="true"` se rellenan (`--ns-pane-on`, `--ns-pane-on-ink`). Variables `--ns-pane-tint`, `-edge`, `-edge-hi`, `-edge-width`, `-time`.
- **Canto del vidrio ligero en degradado:** `--ns-glass-edge-hi` (esquinas) sobre `--ns-glass-frost-edge` (costados) y `--ns-glass-edge-width`. Por defecto, igual que antes.
- **`data-ns-level`** (`ns-frame/controls`): nivel vertical (brillo, volumen) que se llena desde abajo, con icono. Es un `input type=range` de verdad en vertical (`writing-mode`), con teclado y `aria-orientation`; con `data-ns-glass`, de vidrio. Variables `--ns-level-w`, `-h`, `-radius`, `-fill`, `-track`, `-ink`, `-icon`, `-icon-y`.
- **`data-ns-switch`** (interruptor sobre un checkbox, `role="switch"`) y **`data-ns-copy="#id"`** (botón de copiar con aviso y `aria-live`) en `ns-frame/controls`. `data-ns-field` da a un `textarea` su relleno y altura propios. Los patrones de `ns-fx.css` (`ns-dots`…) respetan el `border-radius` de su elemento.
- **Nivel que se arrastra:** `level()` lleva el gesto (arrastre relativo arriba y abajo); en iOS no se movía. **Isla:** histéresis al plegar (`collapseDelta`), sin el vaivén que parpadeaba al pie al subir y bajar rápido; la cápsula vuelve a cuadrar (la regla de posición del vidrio pasa a la subcapa `ns.base`).
- Landing sin controles hechos a mano: deslizadores (Movimiento, Anatomía), fichas y campo del Playground, interruptor del Hero, botones de copiar, fondos de puntos (`ns-dots`) y rótulos de vidrio (`frost`) son de la librería. En táctil, la capa compartida de un grupo de vidrio ya no pierde su desenfoque.
- **El vidrio se monta al acercarse:** `data-ns-glass` y `data-ns-glass-group` esperan a estar a menos de una pantalla de la vista. Una página con vidrio más abajo (un panel con su motor WebGL y su foto) ya no lo prepara todo al cargar.
- **El grupo de vidrio sigue a sus piezas mientras se animan** (tamaño y posición en cada fotograma, también con `scale`); las animaciones infinitas de adorno no cuentan. `shift()` escala además de desplazar.
- **Panel Vidrio rehecho:** las vistas (panel, modos y opciones de un modo) cambian como en un panel de sistema: lo que se ve se encoge y se va, y lo nuevo aparece pieza a pieza de arriba abajo. Filas de vidrio neutras con tipografía de sistema; el modo elegido, con su icono en color; «•••» abre las opciones dentro del panel. Escape y el foco, en cada vista.
- **Landing más ligera:** el vidrio, `ns-frame/vt` y `ns-frame/link` se piden al acercarse su sección; la página no se puede desplazar en horizontal aunque algo se dibuje fuera del borde.
- **Guía [Controles](docs/controles.md)** con todos los controles de `ns-frame/controls`; en el sitio, cada uno en vivo encima de la guía. Las guías ya no ensanchan la página en el teléfono (la barra superior no cabía en 390 px).
- Panel **Vidrio**: la pastilla de Enfoque se transforma en la lista con `morph()` de `ns-frame/vt`, y cada modo guarda sus opciones.
- **Núcleo:** `touch()` y `TOUCH_MEDIA` (pantalla táctil sin hover) para el mosaico y los efectos de borde, en lugar de copias; `reduced()` y `mk()` exportados; en un grupo `data-ns-choice` con radios o casillas sólo cuentan ellos.
- Landing, panel **Vidrio**: la lista de modos tiene cabecera con «‹» para volver (y Escape o el fondo); las opciones cerradas ya no quedaban a la vista. Los textos de ejemplo usan lugares genéricos.
- **`ns-frame/controls`, piezas nuevas:** `data-ns-badge` (insignia; `solid`), `data-ns-code` (bloque de código; `scroll`, `bare`), `data-ns-card` (botón o enlace con aspecto de tarjeta) y `data-ns-grip` (asa). La landing las usa en la versión, el «Recomendado», los bloques de código, las tarjetas-botón y el asa de la hoja.
- **`ns-frame/pop`:** un popover que abren varios botones apunta su flecha al que lo abrió.
- Landing, panel **Vidrio**: cada modo de enfoque tiene sus opciones («•••»): un popover de vidrio con interruptores y la duración.
- **Grupo de vidrio:** sólo une las piezas visibles; una pieza con `visibility: hidden` (una vista que otra sustituye sin perder su sitio) no deja su vidrio pintado.
- **Limpieza de la librería:** fuera código muerto (la máscara del canto sin uso en `ns-liquid`, la capa `st` y las líneas vacías de la corriente del mosaico, restos en `ns-sheet` y `ns-relief`, CSS de `ns-flow` duplicado en el mosaico) y lectores duplicados (`cssTime`/`cssNum` del núcleo en mosaico, esqueleto y vidrio; una sola `rounded()` en `ns-light` para vidrio y relieve). Comentarios y tipos al día.
- Landing, panel **Vidrio**: la pastilla de Enfoque abre la lista de modos (No molestar, Sueño, Menos interrupciones, Personal, Trabajo) en el sitio del panel; el círculo activa el modo y se enciende con su color, sin volver blanca la pastilla.
- Landing: sección **Vidrio** (un panel de 15 piezas de vidrio en una pasada, hecho sólo con la librería; iconos de Lucide, ISC). El mosaico de la landing usa el nivel 1 con su foto.
- **Nada visual a fuego:** duraciones, curvas y tamaños de la isla (`--ns-isle-open-time`, `-close-time`, `-item-time`, `-size`, `-fill`, `-radius`), la hoja (`--ns-sheet-time`, `-ease`), las pestañas (`--ns-tabs-speed`, `-bounce`, `-shrink-time`), los avisos (`--ns-toast-time`, `-close-time`, `-move-time`, `-ease`, `-width`, `-gap`), los popovers (`--ns-pop-delay`, `-hide-delay`, `-width`), el carrusel (`--ns-car-size`, `-dot-size`, `-dot-on`, `-time`, `-ease`), las gotas (`--ns-drops-ease`, `-stagger`, `-turn-time`), el mosaico (`--ns-mosaic-ease`, `-dot-step`, `-grid-step`), el esqueleto (`--ns-skel-fade-time`), las líneas (`--ns-link-time`), las aperturas (`--ns-open-time`, `--ns-close-time`) y la aurora (`--ns-aurora-1…4`). Tabla completa en [Estilo](docs/estilo.md#lo-que-se-ajusta-en-cada-componente). El núcleo exporta `cssTime`, `cssNum` y `cssVal`.
- **`ns-frame/controls`**: segmentos, fichas, campos (select nativo con su flecha), deslizadores con la pista rellena y su `output`, y muestras de color, con aspecto de serie y tema por `--ns-ui-*`. La landing ya no tiene controles hechos a mano: usa éstos.
- Carrusel: sólo se desplaza en horizontal (las capas de un vidrio dentro lo volvían desplazable en vertical: en el iPhone la diapositiva se movía y se cortaba); lo anidado (`data-ns-nest`) sigue a la forma nueva de la diapositiva: el rótulo es concéntrico.
- Pestañas: un gesto horizontal ya no desplaza la página a medias (la barra se movía en vertical al arrastrar).
- Vidrio en pantallas táctiles fuera de Chromium: desenfoque nativo (la copia para la lente parpadeaba al desplazarse rápido); `"lens"` la fuerza.
- Landing: fuera la sección de relieve (el módulo sigue en la librería); mosaico con material vidrio (en PC: en el móvil, nueve capas de desenfoque grandes superan lo que el navegador pinta).
- `ns-mark`: dos líneas con los bordes casi alineados se igualan (sin escalones diminutos).
- Autoría: © Francesco Sierchio (Kodec Agency) en la licencia y en la cabecera de cada archivo compilado.

### Isla que se convierte en la hoja (`ns-frame/isle`)
- Al tocar la cápsula, se convierte en la hoja como una isla de sistema: primero se ensancha a los lados, después crece hacia arriba (un muelle por eje). La forma que crece es la propia hoja (su color y su radio) y su contenido aparece pieza a pieza justo cuando la forma lo alcanza. Al cerrar, el camino inverso: baja hasta ser una barra y se estrecha hasta la cápsula. Un destello de luz da la vuelta al contorno durante el recorrido y mientras se arrastra, con un halo hacia dentro (`--ns-isle-glow`, `--ns-isle-rim`; blanco y gris por defecto). Al cerrar, sin rebote; soltada a medio camino, lo que falta (hasta cerrarse o de vuelta) va con una curva suave, y el contenido ya no reaparece un instante al terminar (un `play()` sobre animaciones ya acabadas las rebobinaba). Las piezas se van al paso del borde de arriba o de los lados.
- Casillas de secciones con formas de ns-frame de serie (`tile`, `current`): su contorno ya sigue su forma.
- Pestañas en Chromium: el segundo reflejo del canto del vidrio con lente es sólo un brillo tenue (antes, un contorno entero dentro del canto: doble burbuja en PC).
- La cápsula oculta se marca con `[data-ns-hidden]` (antes `.ns-hide`): un atributo, para que su vidrio no se relea al ocultarse; y su texto ya no parpadea al abrir.
- Landing: la hoja de la isla es opaca, gris-negro, con la misma forma que la silueta; arrastrarla vuelve a ser tan fluido como antes del vidrio.
- **Lista para usar:** todo el aspecto de la isla viene de la librería (cápsula fija, hoja gris-negro, asa, cerrar, rejilla de secciones `[data-ns-isle-links]`, acciones `[data-ns-isle-actions]`, flecha y × que se ponen solas, y el hueco al pie de la página). La landing ya sólo pone el marcado y sus fuentes.
- **Arrastrar la hoja hacia abajo lleva la transformación con el dedo:** se va recogiendo hacia la cápsula (el borde de arriba sigue al dedo) y al soltar termina de cerrarse o vuelve. `sheet` gana `track` y `settle` para esto.
- Arrastrar la hoja: sigue al dedo en el mismo evento (un fotograma menos de retraso) y su vidrio ya no se relee entero en cada fotograma (el `translate` del arrastre contaba como un cambio de estilo). `morph: false` mantiene la entrada desde abajo; `--ns-isle-radius` y `--ns-isle-morph` fijan el radio final y el color.
- **Fluida en iPhone:** la silueta sólo anima `transform` y `opacity` (el compositor la mueve en su propio hilo); siete piezas, como un 9-slice, para que las esquinas no se deformen al escalar. Una primera versión animaba `clip-path`, que Safari repinta en el hilo principal en cada fotograma (WebKit, bug 185816) y no iba fluida. Antes, además, la hoja de vidrio se rasterizaba, se subía a la GPU y se copiaba en cada fotograma de la subida.
- **Con la hoja abierta, la página de detrás ya no se desplaza** (también con el táctil de iOS).
- La cápsula va completa mientras se baja leyendo (dice en qué sección estás) y se pliega a un icono al subir; `collapseOn: 'down'` lo invierte.
- `sheet`: `.ns-glass-hold` mientras la hoja vuelve o sale sola; tras un arrastre que volvía a su sitio, cerrar la isla ya no deja la hoja atascada por un `translate` en línea.

### Botón de gotas y pestañas legibles de serie
- **`data-ns-drops`** (en `ns-frame/liquid`): un botón que suelta sus acciones como gotas que se separan y vuelven a fundirse. Hacia los lados, arriba o abajo; `aria-expanded`, acciones `inert` mientras está cerrado, Escape, clic fuera y cierre al elegir; evento `toggle`; `drops(el)` para controlarlo. La landing lo hacía a mano (clases, `translate` por posición, retardos, giro del icono); ahora sólo pone tamaños.
- **Pestañas sobre vidrio:** el texto contrasta sin CSS propio (`--ns-glass-ink` atenuado, pleno bajo el indicador, sombra suave salvo en vidrio claro) y gana a resets como `button { color: inherit }`. Se cambia con `--ns-tabs-ink`, `--ns-tabs-ink-hot`, `--ns-tabs-dim` y `--ns-tabs-shadow`.
- **Nombres coherentes en toda la librería** (tabla en [Estilo](docs/estilo.md#nombres-de-las-variables)): `--ns-<módulo>-time`, `-ease`, `-radius`, `-width`, `-ink`, `-fill`. `--ns-morph-time` admite `320`, `320ms` o `.32s` (antes `.32s` se leía como 0,32 ms). Nombres nuevos con los antiguos como alias: `--ns-mark-radius` (`--ns-mark-round`), `--ns-skel-time` (`--ns-sk-time`), `--ns-mosaic-radius`, `-radius-in`, `-radius-out` (`--ns-round*`), `--ns-orb-radius` (`--ns-orb-round`) y `--ns-mosaic-light`, `-width`, `-fill`, `-dot`, `-line`, `-a1`, `-a2`, `-speed`, `-fx-time` (`--ns-mo-*`). En la isla, aún sin publicar, sin alias: `--ns-isle-ink` e `-ink-muted` (antes `-fg` y `-muted`), `--ns-isle-action-ink` (antes `-ink`) y `--ns-isle-sheet-width` (antes `-w`).

### Módulos que se entienden entre sí
- **Carga más ligera:** `ns-frame/link` sólo mide y dibuja las líneas cerca de la pantalla (antes, al cargar, dibujaba las de secciones lejanas y redibujaba con cada cambio del DOM de toda la página: 131 ms de bloqueo en la landing con la CPU ×4), y nada si están ocultas por CSS. La landing pide la hoja y monta la isla cuando hace falta. Bloqueo total de la carga de la landing (móvil, CPU ×4): de ~365 a ~300 ms.
- **Carrusel:** evento `change` al cambiar de posición (`detail { index, slide }`), `carousel(el)` → `{ go(i), index, destroy() }`, y se desmonta solo (con sus controles) al quitar el atributo o el elemento. Sin `Array.prototype.at` (Safari anterior a 15.4).
- **Lo que la landing hacía a mano, en la librería:** `sheet` se encarga de su `<dialog>` (`open()` con entrada, Escape y el fondo la cierran deslizándola, fondo que se aclara; y ya no «desaparece» al cerrarla con un botón: medía una altura de 1 px); el núcleo trae `modal()` (diálogo con apertura que respeta la forma), `data-ns-choice` (grupos de elección con flechas y evento `change`) y `jump()` (salto fiable con `content-visibility`); `ns-frame/mosaic` trae `arrange()` (otra plantilla con View Transitions); la isla, la opción `media` (se monta y se desmonta según la pantalla) y `jump` como salto por defecto; y el relieve `ghost` elegido sube solo (antes había que cambiarlo a `select`).
- Isla: la luz del borde ya no usa filtros de desenfoque (redibujados en cada fotograma frenaban la apertura en el iPhone): su halo son dos trazos anchos y tenues; y el borde de arriba va difuminado mientras abre o cierra (copias desenfocadas de las piezas de arriba, sólo con transform). La silueta se prepara en un momento libre tras cargar.
- **El anillo de foco, sólo para el teclado:** el núcleo anota con qué se interactúa (`data-ns-input` en `<html>`) y, tras un toque o un clic, no se dibuja ningún anillo (tampoco el del sitio). Antes, al cerrar la isla con el dedo, el foco que vuelve a su botón encendía en Safari un rectángulo verde que no seguía la forma, y lo mismo al saltar a una sección. Con el teclado, el anillo de la cápsula sigue su forma redondeada (`--ns-isle-ring`).
- Isla: la luz del borde corre también mientras se arrastra (una animación CSS cancelada junto a las de la silueta ya no volvía a arrancar) y es más luz que línea (trazo fino y difuminado, halo amplio).
- **Un solo arranque para todos los materiales:** el núcleo exporta `watch(attr, make)`, y glass, liquid, relief y tabs lo usan. Ahora se desmontan solos al quitar su atributo o sacar el elemento del documento (antes se quedaban montados: la escucha de scroll global de liquid, sus observadores y su textura se acumulaban en una SPA o con las View Transitions de Astro). Mover un elemento de sitio no lo desmonta. Al quitar el vidrio o el relieve, el marco vuelve a recortarse con su forma. Sirve también para componentes propios.
- **El relieve también sigue a la forma durante un morph** (mismo aviso `ns-shape`).
- **El vidrio sigue a la forma durante un morph** (`data-ns-hover`, `data-ns-press`): antes saltaba a la forma final al empezar. El núcleo exporta `pathOf(el)` (el path que está pintando, también el intermedio) y avisa con el evento `ns-shape` a los elementos con `data-ns-glass`.
- Documentación al día con el código: el canto del vidrio (lo calcula `ns-frame/light`, no un canvas), `facet` (sin `--ns-facet-width`, que ya no existía), `--ns-tabs-zoom-lift` (0,38), el vidrio fuera de Chromium (WebGL, material grueso y vidrio fijo con desenfoque nativo) y por qué una apertura no recorta un vidrio. Cabeceras de `liquid`, `glass`, `isle` y `tabs`, tipos (`sheet` `track`/`settle`; `isle` `collapseOn`/`morph`/`tile`/`current`; `tabs` `drop`/`shrink`; palabras de `data-ns-glass`) y `api.md` completos. `rendimiento.md` con todos los módulos y lo que arrastra cada uno; el README y `llms.txt` con el mapa entero de módulos y cómo se combinan.

### Vidrio más ligero (WebGL)
- **Sin retraso al desplazar:** en iPhone el scroll lo mueve el compositor, por delante del hilo principal, y la copia de la página que pinta la lente llegaba tarde en un scroll rápido. Un vidrio fijo o pegajoso (una cápsula, una barra de navegación) usa siempre el desenfoque nativo fuera de Chromium: va pegado al scroll y nunca cambia de aspecto (un primer intento alternaba lente y nativo al desplazar y el vidrio parpadeaba). `data-ns-glass="lens"` mantiene la lente.
- **Material grueso con desenfoque nativo:** fuera de Chromium, un vidrio con desenfoque ≥ 12px (una hoja, un menú) usa el desenfoque del navegador, como los materiales de sistema, en vez de la lente sobre una copia de la página: tan agrandada bajo tanto desenfoque, la copia dejaba grano y vetas de color (visto en iPhone), y costaba cada fotograma. `data-ns-glass="lens"` fuerza la lente.
- Un vidrio no vuelve a dibujar ni a copiar su canvas si nada cambió (antes, cualquier transición cercana lo repintaba en cada fotograma).
- Con desenfoque grande (≥ 10px) el canvas va a 1 px por px y la página se rasteriza a ½: el detalle de más no se ve bajo el desenfoque y cada dibujo cuesta cuatro veces menos.
- `.ns-glass-hold` (y `.ns-sheet-drag`) congelan el vidrio de un elemento mientras se mueve; `data-ns-quiet` marca capas fijas que se animan encima de la página (un velo, una silueta) para que los vidrios no rasterizen la página otra vez por ellas.

### Compatibilidad
- Sin el error global «ResizeObserver loop completed with undelivered notifications» (WebKit lo lanzaba como excepción): el margen seguro de `data-ns-pad` se aplica en el frame siguiente cuando viene de un ResizeObserver, y `ns-link` ya no observa el `<body>` (compara la altura del documento en eventos baratos).
- Todas las páginas del sitio revisadas en WebKit (motor de Safari) y Firefox sin errores.
- Vidrio en Safari y Firefox sobre **cualquier** fondo: si detrás no hay una imagen limpia (una barra fija sobre texto y tarjetas, una foto con un título encima), la lente se aplica a la **escena**, un clon de la página sólo en la zona bajo el vidrio, que se rehace al cambiar la página o al desplazarse. Antes se quedaba sin lente. `data-ns-liquid-src="page"` la fuerza.
- **Lente en WebGL** (Safari, todos los navegadores de iPhone y Firefox) cuando detrás hay una imagen, un vídeo o un canvas legibles: refracción, desenfoque, saturación y canto en un solo paso en la GPU, con el mapa de la forma de cada fotograma. Antes era un filtro SVG sobre una copia: en WebKit de iPhone podía quedar en un desenfoque plano, y el mapa llegaba tarde mientras la forma se movía (algo «se movía dentro» de las gotas al abrirse). La imagen se pide otra vez con CORS; si el servidor no lo permite o no hay WebGL, sigue el camino anterior. El filtro CSS de la imagen (el del editor) se aplica al canvas.
- Lente en WebGL también sobre **contenido HTML** (una barra fija sobre un feed, un vidrio sobre texto): la zona bajo el vidrio se rasteriza en un canvas (fondos, esquinas, bordes, degradados lineales, imágenes con CORS y texto) y se repinta al desplazarse o al cambiar la página. Un solo contexto WebGL para toda la página. Medido: la barra del móvil sobre el feed a 60 fps mientras se desplaza.
- **Vidrio listo para usar:** la lente por defecto depende del tamaño (profundidad 42 % y fuerza 55 % del lado corto): una barra o un botón refractan enteros sin configurar nada, como un cristal real. Desenfoque por defecto 3px.
- Lente WebGL más limpia y ligera: `highp` donde se pueda (en móvil, `mediump` dejaba escalones y bandas), desenfoque de 24 muestras sobre un nivel más fino, una textura por foto compartida entre vidrios, el texto de la página rasterizado sólo en la zona visible, imágenes decodificadas fuera del hilo principal y el tono comprobado cada 250 ms sólo cerca de la vista.
- Pestañas: al levantarse, el indicador desenfoca un poco (1,2px) y aumenta menos (en Chromium las líneas finas se rompían en escalones al aumentarlas).
- Un vidrio con tinte propio no se invierte sobre fondos claros: se oscurece un poco más (`ns-glass-deep`, `--ns-glass-deep`) y el texto sigue blanco.
- Tono sobre fotos: la zona de la imagen bajo el vidrio se mide (6×6 píxeles de una copia con CORS) y el vidrio pasa a claro u oscuro según lo que pasa por detrás, con `--ns-glass-ink` para el texto. La landing usa `--ns-glass-ink` en todos sus vidrios.
- Un grupo que copiaba una foto ya no cambia a la escena por un fotograma dudoso a mitad de una animación (las gotas que salen del botón mostraban un rectángulo borroso).
- Vidrio sobre la página en movimiento (WebGL fuera de Chromium): mientras hay desplazamiento o transición, la página se rasteriza a 1× (a ½× con desenfoque grande) y al detenerse se repinta a la densidad de la pantalla; los elementos lejos de la zona se saltan con su subárbol sin leer su estilo. Una cápsula de vidrio fija que se pliega al desplazar pasa de 6–7 fotogramas perdidos a 0–1.
- La landing: la isla de navegación (cápsula y hoja) es de vidrio líquido.
- Isla de navegación (`ns-frame/isle`), accesibilidad: al abrir la hoja el foco entra de verdad (antes el paso a visible llevaba 0,4 s de retraso y el navegador ignoraba `focus()` sin avisar: el foco se quedaba en la cápsula). La hoja es modal: con Tab y Mayús+Tab el foco da la vuelta dentro y, si llega fuera (Safari se salta los enlaces con Tab), vuelve dentro; la cápsula oculta queda `inert` mientras la hoja está abierta. Revisado con teclado y con el dedo en Chromium, WebKit y Firefox.
- Núcleo, alto contraste: al activarlo o quitarlo con la página abierta, todos los marcos se releen (antes, los que ya tenían borde propio seguían en la vía rápida nativa y se quedaban sin contorno). Revisado: los 14 presets, bordes, acentos, foco y anidado, iguales al píxel en Chromium, WebKit y Firefox.
- La copia se recorta a la forma antes de la lente, como Chromium: el canto ya no muestra lo de fuera doblado ni dentado.
- Los clones ya no llevan los atributos `data-ns*` (la biblioteca los activaba otra vez).
- Tono automático: sobre un fondo claro liso el vidrio se aclara (`ns-glass-light`, `--ns-glass-tint-light`) y `--ns-glass-ink` da el color de texto que contrasta; sobre fotos no cambia. El vidrio claro desenfoca más (7px) para que el texto de detrás no compita con las etiquetas, y lleva un filo fino que define la forma.
- El canto (más brillo y saturación junto al borde) va dentro del filtro de la lente, recortado con una imagen del borde. Antes era una capa con `backdrop-filter` y máscara, y Chromium ignora esa máscara: aclaraba el vidrio entero (en el claro, hasta blanco). La capa queda sólo de respaldo donde no hay lente.

### La luz de la página (`ns-frame/light`, nuevo)
- Motor compartido: una sola luz direccional para toda la página y materiales compilados en filtros SVG de iluminación (una vez por combinación, compartidos). Lo usan el relieve y el canto del vidrio: todo se ilumina desde el mismo sitio y combina.
- Vidrio (`ns-liquid`, `ns-glass`, `ns-tabs`): el canto deja los trazos con degradado y la capa canvas por la luz de `ns-light`: una línea especular nítida a cualquier zoom donde el borde mira a la luz y un reflejo tenue enfrente (`--ns-glass-rim`, `-rim-back`, `-rim-color`; la variante `u` lo tiñe). `ns-glass` pasa de 5,8 a 2,5 KB.
- Pestañas: el indicador en reposo es una cápsula limpia (lente suave, sin reflejar el canto de la barra); la lente fuerte y el aumento, al levantarse.

### Relieve (`ns-frame/relief`, nuevo) y vidrio que aumenta
- `data-ns-relief`: un **motor de materiales** sobre los filtros de iluminación de SVG (difusa, especular y luz direccional), calculado por el navegador a la resolución real de la pantalla: nítido a cualquier zoom y en todos los motores. De la silueta exacta salen la cara de su color, la línea de luz del canto, dos sombras (contacto y ambiente) y el hundido. Materiales como parámetros (`surface`, `raised`, `knob`, `inset`; tonos `metal`, `paper`; variables finas), compilados una vez en filtros compartidos; una sola luz para la página.
- Estado en el volumen: se hunde al pulsar (puntero y teclado), con `aria-pressed` / `aria-checked` y con `inset`; `select` sube al estar elegido (el segmento activo en su carril, como iOS) y `ghost` no dibuja nada hasta pulsarse.
- `polyline(d)` en `ns-frame/liquid`: el contorno de un path como polígono (lo comparten el vidrio y el relieve).
- Vidrio: aumento (`--ns-glass-zoom`), usado por el indicador de pestañas al levantarse; el mapa de la lente se regenera al cambiar sus variables aunque la forma siga en marcha; un grupo anidado hereda el fondo (`data-ns-liquid-src`) del de fuera; variante `data-ns-glass="u"` con la luz en U dentro del cristal.
- Sitio: editor de fotos real (filtros e intensidad con controles de vidrio sobre la imagen) y panel de casa inteligente con relieve, en lugar de demos decorativas.

### Vidrio más limpio y barra que se encoge
- **Sin contorno:** en `ns-frame/glass` el canto lo dibuja la luz (brillo según el ángulo de cada tramo, en un canvas recortado a la forma y sin costuras) y una sombra suave (`--ns-glass-shadow`) lo separa del fondo; el borde de ns-frame ya no se superpone (doble contorno) salvo con `data-ns-glass="border"`.
- **Cristal tallado** con lente plana por caras: el fondo se parte en cada corte, como una gema.
- `ns-tabs`: sin la gota que se quedaba atrás (se veía como un tirón y deformaba la píldora; ahora opcional con `drop`), estiramiento más sutil, más margen para distinguir un toque de un arrastre con el dedo, clase `ns-tabs-on` y `shrink` (se encoge al desplazar, como iOS 26).
- `ns-liquid` mide las piezas en coordenadas del grupo: correcto bajo `scale` o `transform`; la copia del fondo en Safari se desescala.
- Clon del DOM (Safari) más ligero: sólo las ~100 propiedades que se ven, y se rehace en un momento libre del hilo.
- Sitio: galería de piezas de vidrio con forma que se arrastran; etiquetas de la barra del móvil con más aire.

### Vidrio en cualquier forma (`ns-frame/glass`, nuevo)
- `data-ns-glass`: el vidrio líquido en cualquier elemento, con su forma exacta de ns-frame (chaflanes, muescas, cortes, pestañas, squircles) o su `border-radius` por esquina. Campo de distancias exacto de cualquier path (`pathField`, transformada de Felzenszwalb) para la lente y los reflejos.
- **Cristal tallado** (`facet`): cada corte es una faceta que recoge la luz según su ángulo; la luz sigue al puntero o, en el móvil, barre las caras con el scroll. **Prisma** (`prism`): dispersión cromática en el canto. **Halo** propio (`--ns-glass-glow`), sin `filter` en el elemento.
- Un marco con vidrio no se recorta con `clip-path` (aislaría el fondo). `ns-fx.css`: la luz en U, el aura, los patrones y el halo funcionan con vidrio.
- `ns-liquid`: la regla que posiciona a los hijos baja a especificidad 0 (`:where`): ya no pisa el SVG del borde de un marco (que se metía en el flujo y desplazaba el contenido).
- Presupuesto de ~8 ms por frame entre todos los vidrios: los que aparecen a la vez se reparten en varios frames. 12 piezas, CPU ×4: bloqueo al cargar de 366 a 16 ms; moviendo el puntero, de 46,9 a 14,6 ms por frame.
- La detección automática del fondo también reconoce una capa decorativa anterior con `background-image` (y la copia con su contenido).

### Pestañas de vidrio líquido (`ns-frame/tabs`, nuevo)
- Arrastre con el dedo: con toques, el navegador retiene el puntero en la pestaña tocada y al pasarlo a la barra esa pestaña emitía `lostpointercapture`, que subía hasta la barra y cortaba el arrastre. Sólo cuenta el de la barra (verificado con toques reales).
- `data-ns-tabs`: la barra de pestañas de iOS 26. El indicador viaja con un muelle, se estira con la velocidad y deja una gota que se funde; se arrastra entre pestañas levantándose como una lente clara, con resistencia de goma en los extremos, y encaja al soltar. Teclado, ARIA (`tablist`/`tab` o `aria-pressed`), evento `change` y `prefers-reduced-motion`.

### Vidrio líquido (`ns-frame/liquid`)
- **Contorno exacto:** curvas que pasan por los puntos del campo (Catmull-Rom → Bézier cúbicas) con los lados rectos en línea; un círculo sale redondo con menos de 0,05 px de error (antes, las cuadráticas por puntos medios lo achataban). Rejilla adaptativa entre 1,25 y 3 px.
- **Sin parpadeo en Safari:** el canto (imagen SVG en línea en WebKit) sólo cambia cuando la nueva ya está decodificada; el filtro de la lente se cambia cuando WebKit ya cargó su mapa; y si la forma cambia mucho de tamaño en marcha (gotas que salen), la lente sobre la copia se desvanece y vuelve con el mapa nuevo al detenerse. Con cambios pequeños el mapa se estira con la capa.
- Segundo reflejo por dentro del canto, en sentido contrario (la luz que vuelve por el otro lado del cristal).
- **Más rápido:** si las piezas no cambian, no se recalcula ni el campo ni el contorno; los estilos en línea de las piezas sólo despiertan el bucle (sin releer variables); la copia del fondo no se rehace si la imagen no cambia. Una sola instancia por elemento y `frame()` para quien anima por JS.
- La detección del fondo ignora lo que se pinta encima (lo que va después en el DOM), también en grupos anidados que no reciben el puntero.
- `data-ns-liquid="glass"`: un material de vidrio líquido, con la forma exacta del grupo: cuerpo desenfocado y tintado, **lente** que curva el fondo junto al borde (mapa de desplazamiento sacado del propio campo de distancias; Chromium), canto que brilla y se desvanece hacia dentro sin línea interior, y reflejo especular. `prefers-reduced-transparency` lo vuelve opaco.
- El recorte del vidrio usa además una máscara: Chromium ignora un `clip-path` libre en el desenfoque de fondo dentro de un contenedor redondeado y pintaba el rectángulo entero.
- El contenedor ya no usa `isolation` (hacía de raíz del fondo) y las capas se apilan por orden.
- El puente entre gotas sale redondo, no en punta hacia la vecina.
- `field()` y `contour()` exponen el campo y sus contornos a cualquier nivel.
- **Lente en Safari y Firefox:** con `data-ns-liquid-src="selector"` (u `o.source`) el vidrio pinta debajo una copia alineada del fondo (imagen o `background-image`) y le aplica la lente con `filter: url()`, que sí funciona fuera de Chromium. Allí el filtro usa la región del objeto y un mapa a tamaño de la capa: WebKit hace desaparecer el elemento con `filterUnits="userSpaceOnUse"`.
- **Lente sobre cualquier fondo fuera de Chromium:** detección automática del fondo (imagen, vídeo, canvas o `background-image`, sólo si es lo primero que se ve debajo); vídeo y canvas fotograma a fotograma; contenido HTML con `-moz-element()` en Firefox y, en Safari, un clon con los estilos calculados que se rehace al cambiar el original y sigue al desplazamiento.
- **Vidrio visible en Safari:** WebKit no aplica a HTML una máscara `url(#…)` del documento y la capa del cuerpo desaparecía (el vidrio no desenfocaba nada). En WebKit el cuerpo se recorta sólo con `clip-path` y el canto usa la máscara como imagen SVG en línea.
- **Sin parpadeo:** el recorte pasa a una máscara SVG del documento (sin imágenes por frame) y la lente usa dos filtros que se turnan; el mapa nuevo sólo entra cuando ya está decodificado (antes, durante un frame el filtro leía un mapa vacío y desplazaba todo el fondo). En movimiento el mapa se estira; al detenerse se regenera con `toBlob`, fuera del hilo principal.
- **Más rápido:** unión suave sólo cerca de los puentes, sin desestructurar en el bucle caliente, rejilla adaptativa, movimiento detectado por eventos y estilos en caché. CPU ×4: de ~38 a ~17 ms por frame, sin fotogramas largos.
- Sin `backdrop-filter`, tinte casi opaco.

### Mosaico
- Efecto nuevo `stream` (corriente): tres luces corren por los bordes de las piezas y saltan de una a la vecina donde se tocan (el contorno real de cada pieza y del anillo del orbe se muestrea y se buscan los relevos); cada una se desvanece en degradado y lleva un foco que enciende los bordes por donde pasa. `--ns-mo-speed`.
- **Arreglo:** las capas animadas ya no se rehacen en cada `resize` si nada cambió: en el móvil, la barra del navegador al subir y bajar reiniciaba las animaciones.

### Arreglos
- Núcleo: la primera apertura o cierre (`open`, `close`, y con ellos el primer toast) antes de que cargaran los extras fallaba: la promesa de carga no devolvía el módulo.
- Compatibilidad: toasts y popovers funcionan sin Popover API (Safari < 17, Firefox < 125): antes `toast()` lanzaba un error y los popovers se veían siempre. Los tooltips se abren con un toque en pantallas táctiles.
- `ns-fx.css`: la luz en U tiene valores de respaldo donde no hay `@property` (Firefox 115, Safari < 16.4); antes desaparecía.
- `overflow: clip` con respaldo `hidden` (Safari 15).
- `sheet`: si el navegador cancela el gesto, la hoja vuelve a su sitio (antes podía cerrarse); con todo el panel como asa y contenido con scroll, el scroll táctil ya no se bloquea.
- `concentric`: con huecos distintos en cada lado, la esquina usa el menor (una foto con 6 px al lado y 70 abajo ya no hereda un chaflán en la esquina lejana).
- `mark`: el resaltado se redibuja al cambiar una clase (color, margen, radio), no sólo al cambiar el texto.
- Núcleo: fuera de pantalla sólo se pausa con `animation-play-state` (sin `pauseAnimations()` del SVG, que ya no hacía falta).
- `carousel`: al llegar al final, la flecha enfocada queda con `aria-disabled` en lugar de `disabled` (antes el foco se perdía al principio de la página); los puntos tienen 14px de separación para un objetivo de 24px (WCAG 2.5.8).
- `toast`: al cerrar un aviso con el foco dentro (botón ×, acción o Esc), el foco vuelve al elemento de donde venía (o a `back`, si se pasa en las opciones) en lugar de caer al principio de la página.
- `concentric`: los huecos se miden sin transformaciones (un padre escalado al pasar el puntero o al abrirse ya no cambia la forma del hijo); quitar `data-ns-concentric` deja de seguirlo; los cambios de clase de la página ya no recorren la lista de hijos.
- `mark`: con el anfitrión escalado, el resaltado no se deforma; quitar `data-ns-mark` retira el dibujo y volver a ponerlo lo recupera.
- `link`: las líneas quedan en su sitio aunque el `<body>` tenga margen o `position: relative`; siguen al scroll de un contenedor; un destino que aparece después, o un selector nuevo en `data-ns-link`, se enlaza; un redibujo ya no se pierde si coincide con un scroll.
- `bento`: las esquinas del contorno se deciden con la caja de layout: una celda que entra con una animación (sube o escala) ya no se queda con la esquina equivocada.
- `vt`: dos `morph()` seguidos no se quitan la clase de la página el uno al otro; un error dentro de `update()` llega a quien llamó.

### Sitio
- Demo de vidrio líquido sobre una foto: barra con lente clara que se estira y acciones que se separan en gotas de vidrio; «Vidrio / Sólido».
- `content-visibility: auto` desactivado en WebKit de iOS y Safari con una detección en CSS (en iPhone podía reiniciar las animaciones al volver a una sección). Al hacerlo por CSS y no por JS, la carga vuelve a ser rápida.
- Tarjeta concéntrica con chaflán 24 (el botón al pie ya no queda comido por el chaflán con huecos pequeños).

## 0.10.0 — lo que CSS todavía no hace

### Lo que CSS todavía no hace
Cuatro módulos que resuelven con geometría real lo que la web sólo imitaba con capturas, filtros borrosos o cálculos a mano.
- **`ns-frame/concentric` (2,4 KB)**: esquinas concéntricas automáticas con `data-ns-concentric`. El hijo repite la forma del padre desplazada el hueco: redondeos − hueco, chaflanes − 0,59 × hueco, muescas que conservan su tamaño, scoops que crecen, cortes y pestañas de los bordes con la misma profundidad y la boca desplazada, fillets y `poly`. Si el padre no es un marco, usa su `border-radius`. `--ns-concentric-min` redondea las esquinas que quedan lejos de las del padre. CSS no tiene nada equivalente (hay una propuesta abierta en el CSSWG, sólo para redondeos).
- **`ns-frame/flow` (2,0 KB)**: el texto llena la forma con `data-ns-flow`, con el mismo margen en todo el contorno (curvas, diagonales, vértices). Es el `shape-inside` que CSS especificó y ningún navegador ha implementado, hecho con `shape-outside` nativo. El mosaico lo usa también (antes lo llevaba dentro).
- **`ns-frame/mark` (2,1 KB)**: resaltado continuo en varias líneas con `data-ns-mark`: un solo contorno con curvas hacia fuera y hacia dentro, nítido y con trazo opcional, en vez del filtro de desenfoque habitual. `data-ns-mark="draw"` lo dibuja al entrar en pantalla. Se redibuja al cambiar el texto o el ajuste de línea.
- **`ns-frame/liquid` (2,5 KB)**: formas líquidas con `data-ns-liquid`: los hijos cercanos se funden con un puente curvo y se separan en gotas al alejarse. Campo de distancias con una unión suave que tiene en cuenta el ángulo (no se infla donde dos formas se solapan alineadas), contorno con marching squares y curvas. Sólo redibuja mientras algo se mueve (< 1 ms por frame en una barra típica).

### Nuevo: `ns-frame/isle` (2,3 KB)
- **Isla de navegación**: una cápsula flotante con la sección actual (icono, nombre y posición, seguidos con `IntersectionObserver`) que se pliega al bajar, cambia de sección al deslizarla y abre una hoja con todas. La hoja entra moviendo sólo `translate`, se prepara al apoyar el dedo (al abrirse ya está pintada) y se arrastra con `ns-frame/sheet`. Accesible (`aria-expanded`, `aria-current`, `inert`, foco que entra y vuelve) y con el marcado y las formas del usuario.
- `sheet`: el progreso del gesto se calcula de la temporización de la animación, sin leer estilos en cada frame (sin micro-parones al cerrar).

### Mosaico
- En táctil se quitan `glow` (sigue a un puntero que no existe) y `ripple` (cada toque, que casi siempre es scroll, era una onda). `data-ns-mosaic-touch` elige los efectos para táctil.
- Al cambiar a una plantilla con menos filas, las piezas aún colocadas según la anterior creaban filas implícitas y el mosaico reintentaba en cada frame sin terminar: se quedaba con la plantilla vieja, dejaba de responder y podía verse con piezas superpuestas. Ahora sólo cuentan las pistas explícitas y los reintentos están acotados.
- Los listeners de la luz conectada se registran una vez por mosaico y leen la capa actual (antes se duplicaban si la capa se quitaba y volvía).

### Núcleo y auditoría
- `spec(shape, w)`: las declaraciones de una forma para un ancho, para módulos que transforman formas.
- Hover, pulsado y foco con 6 listeners delegados en el documento en vez de varios por marco.
- `audit()` avisa cuando un reset como `all: unset` deja el borde sin dibujar (tipos `unanchored` y `reset`).

### Sitio
- Sección «Lo que CSS todavía no sabe hacer» con las cuatro demos: tarjeta de reserva concéntrica, pieza editorial que cambia de silueta, titular con resaltado editable y selector y acciones líquidas.
- Los controles del mosaico van en una barra fija (en el móvil, una fila que se desliza): se cambia de opción sin subir y bajar. Al cambiar de plantilla sólo se animan las piezas; la barra superior y la isla quedan por encima durante la transición.
- La isla usa `ns-frame/isle` y el menú lleva suave hasta la sección elegida.
- Contorno suave, teñido con el tono de cada pieza, en el muro de formas y en las tarjetas de aperturas.
- La fuente recortada se llama Frame Sans: la licencia OFL de Mona Sans reserva el nombre «Mona» para la fuente sin modificar.

## 0.9.0 — mosaicos de piezas libres

### Nuevo: `ns-frame/mosaic`
- **Piezas en L, T, U o escalera** a partir de una plantilla tipo `grid-template-areas` en una variable CSS (`--ns-areas`), que se cambia con media queries o container queries.
- **Hueco constante también en las curvas**: las esquinas cóncavas miden el radio más el hueco, así dos piezas encajadas mantienen la misma distancia.
- **Orbes con forma**: círculo, hexágono, rombo, cuadrado, triángulo u octógono, uno o varios a la vez (`--ns-orb: 3 3 70 hex, 2 4 44 circle`). Recortan a sus vecinas con un hueco concéntrico y curvas de enlace, y pueden tener contenido (foto, dato, botón).
- **El texto recorre toda la figura**: en piezas en L, T, escalera o mordidas por un orbe, el texto fluye por el contorno real con `--ns-pad` de margen en cada punto, usando `shape-outside` nativo (`data-ns-flow="off"` lo desactiva). En los rectángulos, el contenido va al primer rectángulo de celdas en el que cabe entero.
- La luz conectada dibuja los orbes poligonales con sus esquinas redondeadas, igual que el relleno.
- **Luz conectada** en toda la figura con `data-ns-mosaic`: `wave`, `ripple` (onda donde tocas), `glow`, `sweep`, `scan`, `trace`, `pulse`, `aurora`, `dots` y `grid`, combinables. Se pausan fuera de pantalla y respetan `prefers-reduced-motion`.

### Núcleo
- `poly` admite arcos: `aN` llega al vértice por un arco de radio N (`a-N`, antihorario). También compila a CSS `shape()`.
- `--ns-morph-time: 0` aplica el cambio de forma al instante.
- **Arreglo:** las animaciones de borde `scan` y `orbit` y el giro de degradados (`data-ns-spin`) pasan de SMIL a animaciones CSS; ya no se quedan congeladas en móviles.

### Nuevo: `ns-frame/sheet` (1,3 KB)
- Hoja que se arrastra como en una app nativa: sigue al dedo arriba (con resistencia elástica) y abajo, y al soltarla vuelve o sale según la distancia y la velocidad. Sólo mueve `translate`, expone el progreso (`--ns-sheet-p`, `onProgress`) para atenuar el fondo y no convierte un arrastre en clic.

### Motor más rápido
- **Memo de geometría** por (forma, ancho, alto): los marcos que comparten forma y tamaño reutilizan geometría, comandos y path.
- **Repintado perezoso:** al redimensionar sólo se recalculan los marcos en pantalla o cerca; el resto se pinta al acercarse. Con 4.000 marcos, redimensionar pasa de ~283 a ~105 ms.
- El texto que fluye del mosaico no vuelve a medirse si la silueta, el tamaño y el margen no cambiaron.
- Build: el CSS que inyectan los módulos se minifica, y cada archivo se queda con la combinación de terser que da menos bytes en brotli.

### Vía rápida nativa
- Las formas sólo de esquinas (redondas; con `corner-shape`, también chaflanes, scoops, notches y squircles) con borde liso y sin capas extra se dibujan con `border-radius` + una sombra interior como borde, sin `clip-path` ni capa SVG. Pasan solas a SVG si un hover o un pulsado las convierte en una forma compleja. `--ns-shadow` añade sombras propias; el foco usa `outline` (`--ns-focus`). En la landing: 45 capas SVG menos y ~140 ms menos de LCP en un móvil emulado.

### Rendimiento en táctil
- **Arreglo:** en pantallas táctiles la forma de hover (`data-ns-hover`) ya no se queda pegada: el hover sólo se activa con ratón o lápiz (para el dedo está `data-ns-press`).
- En táctil (`hover: none` y `pointer: coarse`), el resplandor `--ns-glow` de las animaciones de borde y el del mosaico se desactivan (filtros que repintan cada frame y podían congelar la animación). `--ns-glow-touch` permite fijar uno propio.
- El foco `spot` no se registra en táctil: ya no recalcula los marcos en cada scroll.
- `ns-fx.css`: en táctil, la luz en U en movimiento (`ns-u-live`, `ns-u-tide`, `ns-u-surge`), `ns-u-hue` y `ns-scan` quedan fijos, y `ns-pulse` anima sólo la opacidad.

### Bento y auditoría
- El bento sigue siendo bento en móvil: al menos `--ns-cols-min` columnas (2 por defecto).
- `audit()` ignora las imágenes y vídeos a sangre (recortarlos es la intención).

### Sitio
- Landing rediseñada en Astro, por componentes: hero con mosaico, antes y después, muro de presets, playground (atributo, ruta SVG y CSS `shape()`), bordes en degradado y luz en U (con una tabla de precios real), mosaico interactivo, las 11 animaciones de borde, componentes funcionando, aperturas y View Transitions, anatomía con callouts y formas responsive, ficha técnica en bento unificado sobre fondo aura y la isla de navegación en móvil. Firmada por Kodec Agency.
- La galería antigua (`galeria.html`) se retira: todas las demos viven en la landing.
- Sitio más ligero y seguro: secciones con `content-visibility: auto` (saltos a anclas exactos con `scripts/jump.ts`), fuentes autoalojadas con la API de fuentes de Astro (Mona Sans variable con su eje de anchura), fotos de demostración en WebP, sin `backdrop-filter` en táctil, CSP estricta generada por Astro con hashes (sin `unsafe-inline`; en las guías sólo se permiten atributos de estilo para el resaltado de código), caché inmutable para `/_astro/*`, HSTS y COOP. En un móvil emulado (CPU ×4): bloqueo del hilo principal de ~700 a ~290 ms y LCP de ~1,65 a ~1,2 s.

## 0.8.0 — primera versión pública

### Formas
- Lenguaje de formas: esquinas `bevel`, `notch`, `round`, `scoop`, **`squircle`** y `square`; rasgos de borde `cut`, `tab` y `scoop`; polígonos libres; consultas por ancho del elemento (`@<N`); fillet global y por vértice; 14 presets.
- **Esquinas y bordes lógicos** (`ss`, `se`, `es`, `ee`, `start`, `end`) que se invierten en RTL.
- Morph de geometría en hover, foco, presión y cambios de atributo; formas ligadas al scroll; modo nativo con `corner-shape`.

### Bordes y movimiento
- Bordes SVG que siguen el corte: color, degradado (que puede girar), doble línea y acentos; 11 animaciones de borde; borde que se dibuja; aperturas que conservan los cortes.

### Layout y componentes
- Padding que respeta la forma, formas concéntricas y bento unificado.
- Popovers con la flecha integrada, **toasts** en la capa superior con el tiempo en el borde, **carrusel** con scroll-snap nativo, **skeletons** que heredan la forma (CLS 0), **View Transitions** que conservan los cortes y callouts HUD.

### Efectos
- `ns-fx.css`: luz en U con animaciones de conjunto (`ns-u-live`, `ns-u-tide`, `ns-u-surge`), aura, aurora, halo, patrones y texto animado.

### Sin JS
- `css()` compila una forma a CSS `shape()`; `extract()` y la integración de Astro (`ns-frame/astro`) convierten `data-ns-static` en clases y una hoja CSS en el build.

### Accesibilidad, seguridad y rendimiento
- Foco que sigue la forma, alto contraste (`forced-colors`), RTL y `prefers-reduced-motion`.
- Sin `innerHTML`, compatible con CSP estricta, estilos en `@layer ns`; test de CSP con atributos maliciosos.
- Carga bajo demanda de `ns-extra.js`; cambios masivos en lotes que ceden el hilo principal (con 4.000 marcos, ninguna tarea larga al montar).
- Tipos de TypeScript, skill para agentes de IA y `llms.txt`.
