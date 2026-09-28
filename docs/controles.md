---
title: Controles
description: "Segmentos, fichas, campos, deslizadores, niveles, interruptores, copiar, insignias y tarjetas de ns-frame/controls, listos y con variables."
order: 7.2
---

# Controles

`ns-frame/controls` da aspecto de serie a los controles de una interfaz. Todo va con atributos sobre HTML nativo (un `button`, un `input`, un `select`), así que funciona con teclado, lector de pantalla y sin JavaScript propio. El CSS va en `@layer ns` y con `:where()`: cualquier regla tuya gana.

```js
import 'ns-frame/controls'
```

En el sitio de la documentación (`/docs/controles`), cada control de esta guía está en vivo.

## Tema

Las variables se ponen en el control o en un antepasado:

| Variable | Qué es |
|---|---|
| `--ns-ui-surface` | fondo de los carriles y campos |
| `--ns-ui-line` | bordes |
| `--ns-ui-ink` · `--ns-ui-muted` | texto y texto secundario |
| `--ns-ui-accent` | acento (lo recorrido, lo elegido, el foco) |
| `--ns-ui-on` · `--ns-ui-on-ink` | el elegido de un segmento |
| `--ns-ui-radius` · `--ns-ui-h` · `--ns-ui-font` | radio, alto de un control y fuente |

## Elección: segmentos y fichas

```html
<div role="group" aria-label="Vista" data-ns-segment data-ns-choice>
  <button aria-pressed="true">Semana</button><button>Mes</button><button>Año</button>
</div>
<div role="group" aria-label="Filtros" data-ns-chips data-ns-choice="many">
  <button>Nuevo</button><button aria-pressed="true">Popular</button>
</div>
```

`data-ns-choice` (del núcleo) pone `aria-pressed`, mueve el foco con las flechas y avisa con el evento `change` (`detail.button`). `="many"`: cada uno se activa por su cuenta. Si el grupo tiene `role="radio"` o `role="checkbox"`, sólo esos cuentan.

## Campos y deslizadores

```html
<label data-ns-field><span>Plantilla</span><select>…</select></label>
<label data-ns-field><span>Notas</span><textarea></textarea></label>
<label data-ns-field><span>Velocidad <output for="v"></output></span>
  <input id="v" type="range" data-ns-range data-ns-unit="×" min="0.5" max="2" step="0.1"></label>
```

El `output[for]` muestra el valor; `data-ns-unit` va detrás y `data-ns-scale` lo multiplica (100 → porcentaje).

## Nivel vertical

```html
<label data-ns-level><input type="range" aria-label="Brillo"><svg>…</svg></label>
```

Una píldora que se llena desde abajo, con un icono. Es un `input type=range` en vertical; el gesto (arrastre relativo arriba y abajo) lo lleva la librería, también en iOS. Con `data-ns-glass`, de vidrio. Variables: `--ns-level-w`, `-h`, `-radius`, `-fill`, `-track`, `-ink`, `-icon`, `-icon-y`.

## Interruptor

```html
<label>Modo foco <input type="checkbox" data-ns-switch checked></label>
```

Se anuncia como `role="switch"`. Variables: `--ns-switch-w`, `-h`, `-on`, `-off`, `-knob`, `-time`.

## Copiar

```html
<pre id="snippet" data-ns-code>npm i ns-frame</pre>
<button data-ns-copy="#snippet">Copiar</button>
```

Copia el texto (o el `value`) del destino y dice «Copiado» durante `--ns-copy-time`. Textos: `data-ns-copied`, `data-ns-copy-error`. Se anuncia por `aria-live`. Evento `ns-copy` con `{ text, ok }`.

## Insignias, código, tarjetas y asas

```html
<span data-ns-badge>0.17</span> <span data-ns-badge="solid">Nuevo</span>
<pre data-ns-code="scroll">…</pre>
<button data-ns-card data-ns="tl+br bevel 16"><b>Plan Pro</b><span>Para equipos</span></button>
<i data-ns-grip aria-hidden="true"></i>
```

| Atributo | Variables |
|---|---|
| `data-ns-badge` (`solid`) | `--ns-badge-bg`, `-ink`, `-line`, `-radius`, `-pad`, `-size` |
| `data-ns-code` (`scroll`, `bare`) | `--ns-code-bg`, `-ink`, `-pad`, `-radius`, `-size` |
| `data-ns-card` | `--ns-card-bg`, `-hover`, `-pad`, `-gap` (admite `data-ns` para su forma) |
| `data-ns-grip` | `--ns-grip`, `-w`, `-h`, `-margin` |

## Listas con check y avatares

```html
<ul data-ns-checks>
  <li>Formas ilimitadas</li>
  <li>Bordes animados</li>
</ul>

<div data-ns-avatars role="img" aria-label="Ana, Luis y Marta">
  <img src="ana.jpg" alt=""> <i>L</i> <i>M</i>
</div>
```

| Atributo | Variables |
|---|---|
| `data-ns-checks` (en `<ul>`/`<ol>`) | `--ns-check` (color; por defecto el acento), `--ns-checks-gap`. Sin viñetas pero sigue siendo una lista para los lectores de pantalla (se le pone `role="list"`: Safari la dejaba de anunciar) |
| `data-ns-avatars` | `--ns-avatar-size`, `-overlap`, `-ring` (el aro: el color del fondo), `-ring-w`, `-bg`, `-ink`, `-font`. Cada avatar puede llevar su propio `--ns-avatar-bg` |

## Muestras de color

```html
<div role="group" aria-label="Color" data-ns-swatches data-ns-choice>
  <button data-color="#00e676" aria-label="Verde" aria-pressed="true"></button> …
</div>
```

El color sale de `data-color` por CSSOM: funciona con una CSP estricta.
