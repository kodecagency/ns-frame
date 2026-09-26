---
title: Accesibilidad
description: Foco que sigue la forma, alto contraste, RTL, movimiento reducido y semántica intacta.
order: 11
---

# Accesibilidad

- **Anillo de foco que sigue la forma.** `clip-path` corta el contorno de foco nativo, así que en los elementos enfocables ns-frame dibuja un anillo con `:focus-visible` (`--ns-focus`, `--ns-focus-width`).
- **El anillo, sólo para el teclado.** El núcleo anota con qué se interactúa (`data-ns-input="pointer"` o `"keyboard"` en `<html>`). Tras un toque o un clic no se dibuja ningún anillo de foco, tampoco el del sitio: un foco movido por código (una hoja que al cerrarse lo devuelve a su botón, un salto que enfoca la sección) lo encendía en Safari con un rectángulo que no sigue la forma. Con el teclado, el anillo sigue siempre ahí.
- **Alto contraste (Windows).** Con `forced-colors: active` los bordes usan colores del sistema (`CanvasText`; el foco, `Highlight`); los marcos sin borde reciben uno para no quedar invisibles, y las animaciones decorativas se ocultan (la barra de progreso se mantiene).
- **RTL.** Las esquinas lógicas (`ss`, `se`, `es`, `ee`) y los bordes `start` / `end` se invierten con `direction: rtl`. El carrusel invierte sus flechas de teclado.
- **Movimiento reducido.** Con `prefers-reduced-motion` se desactivan animaciones de borde, morph, aperturas, brillos y luces animadas; las View Transitions y el scroll del carrusel pasan a ser instantáneos.
- **Semántica intacta.** Las capas decorativas son `aria-hidden` y no reciben eventos; el contenido nunca sale del HTML (nada se pinta en canvas ni en imágenes).
- **Componentes** con los patrones de WAI-ARIA: popovers con la Popover API nativa (Esc, click fuera, `aria-describedby` en tooltips); toasts en una región `aria-live` con `role="alert"` para errores; carrusel con `aria-roledescription`, "n de N" y `aria-current`; skeletons con `aria-busy`.
- **Texto que no se recorta.** `data-ns-pad` calcula el padding según la geometría de cada corte, y `ns-frame/audit` detecta en desarrollo cualquier texto recortado o a menos de N px del borde.
