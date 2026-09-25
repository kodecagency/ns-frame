// Tipos de los módulos opcionales de ns-frame. Cada módulo se importa por su ruta:
// ns-frame/css, ns-frame/static, ns-frame/vt, ns-frame/toast, ns-frame/skel, ns-frame/carousel,
// ns-frame/pop, ns-frame/bento, ns-frame/mosaic, ns-frame/sheet, ns-frame/isle, ns-frame/concentric,
// ns-frame/flow, ns-frame/mark, ns-frame/liquid, ns-frame/glass, ns-frame/relief, ns-frame/tabs, ns-frame/link, ns-frame/fx, ns-frame/audit.
import type { Shape } from './ns-frame'

// ── ns-frame/css ──
/** Compila una forma a `shape(...)` de CSS con calc(% + px), o null si no es lineal respecto al tamaño. */
export function css(shape: Shape): string | null

// ── ns-frame/static (Node: build o SSR) ──
/** Convierte cada `data-ns-static="forma"` en una clase y devuelve la hoja con sus clip-path: shape(). */
export function extract(html: string): { html: string; css: string; skipped: string[] }

// ── ns-frame/vt ──
export interface MorphOptions { duration?: number; easing?: string }
/**
 * `from` se transforma en `to` (elemento o función que lo devuelve) mientras `update()` cambia la vista,
 * con la View Transitions API. Los cortes conservan su tamaño en px durante la transición.
 */
export function morph(from: Element, update: () => unknown, to?: Element | (() => Element | null | undefined), options?: MorphOptions): Promise<void>

// ── ns-frame/toast ──
export type ToastType = 'info' | 'ok' | 'warn' | 'error'
export type ToastEnter = 'open' | 'split' | 'iris' | 'wipe' | 'drop'
export interface ToastOptions {
  type?: ToastType
  title?: string
  /** ms hasta cerrarse; 0 = persistente (no se cierra solo ni lo expulsa la pila) */
  time?: number
  action?: { label: string; onClick?: () => void }
  shape?: Shape
  enter?: ToastEnter
}
export function toast(message: string, options?: ToastOptions): { el: HTMLElement; close: () => void }
export function config(options: { x?: 'start' | 'center' | 'end'; y?: 'top' | 'bottom'; max?: number; time?: number; shape?: Shape; enter?: ToastEnter }): void

// ── ns-frame/skel, bento, mosaic, link, concentric, flow, mark ──
/** Vuelve a medir (skeletons: uno o todos; el resto: todos sus elementos). */
export function refresh(el?: Element): void

// ── ns-frame/mosaic ──
/** Lee una plantilla `--ns-areas` ("'a a b' 'c d b'") como matriz de celdas ('.' = vacía). */
export function parseAreas(areas: string): string[][]

// ── ns-frame/sheet ──
export interface SheetOptions {
  /** Dónde empieza el arrastre (por defecto, todo el panel). */
  handle?: HTMLElement
  /** Se llama cuando la hoja sale al soltarla (o con close()). */
  onClose?: () => void
  /** 1 = en su sitio, 0 = fuera. También queda en --ns-sheet-p. */
  onProgress?: (p: number) => void
  /** Píxeles antes de considerar que es un arrastre y no un toque (6). */
  threshold?: number
}
export interface Sheet { close(): void; reset(): void; destroy(): void }
/** Convierte el elemento en una hoja arrastrable como las de una app nativa. */
export function sheet(el: HTMLElement, options?: SheetOptions): Sheet
/** Resistencia elástica al pasar del tope (px). */
export function rubber(x: number, h: number): number
/** ¿Se cierra al soltar? y: desplazamiento (px), v: velocidad (px/ms), h: altura. */
export function release(y: number, v: number, h: number): boolean

// ── ns-frame/isle ──
export interface IsleOptions {
  /** La hoja (por defecto, el aria-controls del botón o [data-ns-isle-panel]). */
  panel?: HTMLElement
  /** Enlaces a secciones (por defecto, los a[href^="#"] de la hoja). */
  links?: Iterable<HTMLAnchorElement>
  /** px de scroll desde los que la cápsula se pliega al bajar (200); false = nunca. */
  collapse?: number | false
  /** Deslizar la cápsula cambia de sección (true). */
  swipe?: boolean
  /** Línea de lectura en fracción de la ventana (.45): la sección que la cruza es la actual. */
  line?: number
  /** Cómo ir a una sección (por defecto, scrollIntoView suave). */
  go?: (target: HTMLElement, link: HTMLAnchorElement) => void
  /** Texto de posición ("2 / 7"). */
  pos?: (index: number, count: number) => string
  onChange?: (index: number, link: HTMLAnchorElement) => void
  onOpen?: () => void
  onClose?: () => void
}
export interface Isle { open(): void; close(): void; toggle(): void; go(index: number): void; readonly index: number; destroy(): void }
/** Isla de navegación: cápsula que sigue la sección actual y abre una hoja arrastrable. */
export function isle(el: HTMLElement, options?: IsleOptions): Isle

// ── ns-frame/concentric ──
/**
 * Forma concéntrica del hijo: la del padre (`shape`, w×h) desplazada el hueco `ins`
 * [arriba, derecha, abajo, izquierda]. `min`: radio de las esquinas que quedarían más pequeñas.
 * Automático con `data-ns-concentric` (y `--ns-concentric-min`).
 */
export function concentric(shape: Shape, w: number, h: number, ins: [number, number, number, number], min?: number): string

// ── ns-frame/flow ──
/** Filas interiores de un path (w×h) a `pad` px del contorno: [izquierda, derecha] o null. */
export function profile(d: string, w: number, h: number, pad: number): ([number, number] | null)[]
/** El texto de `k` recorre el interior del path `d`. false si la forma es demasiado pequeña. Automático con `data-ns-flow`. */
export function flow(job: { k: HTMLElement; d: string; w: number; h: number }, pad: number): boolean
/** Quita los flotantes de flow(). */
export function unflow(k: HTMLElement): void

// ── ns-frame/mark ──
/** Contorno de un texto resaltado: polígonos (sin fillets) de los rectángulos de cada línea. Automático con `data-ns-mark`. */
export function outline(rects: Iterable<{ left: number; right: number; top: number; bottom: number; width: number; height: number }>, px?: number, py?: number): [number, number][][]

// ── ns-frame/liquid ──
export interface LiquidOptions {
  /** Qué hijos cuentan: selector o función (por defecto [data-ns-blob] o todos los hijos). */
  blobs?: string | ((el: HTMLElement) => Element[])
  /** Vidrio líquido (si no, el atributo data-ns-liquid="glass"). */
  glass?: boolean
  /** Fondo que hay detrás del vidrio (elemento o selector), para la lente en Safari y Firefox (si no, data-ns-liquid-src). */
  source?: Element | string | null
  /** Hueco máximo que se funde, en px (si no, --ns-liquid o 14). */
  k?: number
  /** Resolución del contorno en px (si no, adaptativa entre 1,25 y 3). */
  step?: number
}
/** Grupo líquido: los hijos cercanos se funden en un solo contorno vectorial. Automático con `data-ns-liquid`. Una sola instancia por elemento. */
export function liquid(el: HTMLElement, options?: LiquidOptions): {
  /** Relee estilos (variables, radios, fondo) y redibuja. */
  update(): void
  /** Sólo redibuja: para quien mueve las piezas por JS en cada frame. */
  frame(): void
  destroy(): void
}
export interface LiquidField { F: Float32Array; nx: number; ny: number; X0: number; Y0: number; step: number }
/** Campo de distancias fundido (negativo = dentro) de rectángulos redondeados, en una rejilla de `step` px. */
export function field(boxes: { x: number; y: number; w: number; h: number; r?: number }[], k?: number, step?: number): LiquidField | null
/** Contorno (path `d`) del campo al nivel `level` (0 = el borde; −8 = 8 px hacia dentro). */
export function contour(f: LiquidField | null, level?: number): string
/** Contorno fundido (path `d`) de rectángulos redondeados; `k` es el alcance interno del mínimo suave. */
export function blend(boxes: { x: number; y: number; w: number; h: number; r?: number }[], k?: number, step?: number): string

/** Campo de distancias (negativo = dentro) de un path `d` cualquiera en una caja w×h (necesita canvas). */
export function pathField(d: string, w: number, h: number, step?: number): LiquidField | null
/** Contorno de un path `d` absoluto como polígono cerrado (curvas en tramos de ~`seg` px). */
export function polyline(d: string, seg?: number): [number, number][]
/** Desplaza un path `d` absoluto (M, L, C, Q, A, Z) en (dx, dy). */
export function shift(d: string, dx: number, dy: number): string

// ── ns-frame/glass ──
/**
 * Vidrio líquido en cualquier elemento, con su forma de ns-frame (data-ns) o su border-radius.
 * Automático con `data-ns-glass` ("clear", "tint", "facet" = cristal tallado, "prism" = dispersión).
 */
export function glass(el: HTMLElement, options?: LiquidOptions): { update(): void; frame(): void; destroy(): void }

// ── ns-frame/relief ──
/**
 * Superficie con volumen sutil calculado de la forma (ns-frame o border-radius). Automático con
 * `data-ns-relief` ("ceramic", "metal", "paper"; "inset" = hundido; "select" = sube al estar elegido;
 * "ghost" = invisible hasta pulsarse). Se hunde al pulsarlo y con aria-pressed / aria-checked="true".
 */
export function relief(el: HTMLElement): { update(): void; destroy(): void }

// ── ns-frame/tabs ──
/** Pestañas de vidrio líquido: indicador que se arrastra, se estira y encaja con un muelle. Automático con `data-ns-tabs`. Emite "change" con detail { index, tab }. */
export function tabs(el: HTMLElement, options?: { items?: string }): { select(index: number): void; readonly index: number; destroy(): void }

// ── ns-frame/fx ──
/** Efecto de texto que se "descifra". */
export function decode(el: HTMLElement, duration?: number): void

// ── ns-frame/audit (sólo desarrollo) ──
export interface AuditIssue { el: Element; what: string; shape: Shape; type: 'clipped' | 'tight' | 'unanchored' | 'reset' }
export function audit(options?: { root?: ParentNode; mark?: boolean; margin?: number; clearance?: number }): AuditIssue[]
