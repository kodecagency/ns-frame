// Tipos del núcleo de ns-frame (también válidos para ns-frame/lite).
// Al importarse, el núcleo activa solo todo elemento con data-ns / data-ns-nest y el custom element <ns-frame>.

/**
 * Una forma escrita en el mini lenguaje de ns-frame: declaraciones separadas por `;` o saltos de línea.
 * Ejemplos: `"card"`, `"tl+br bevel 18; radius 3"`, `"all squircle 24"`, `"ss notch 12; ee round 20"`,
 * `"panel; @<420 all bevel 10"`, `"poly 28 0 r4, 100%-60 0, 100% 50%, 100%-60 100%, 0 100%"`.
 */
export type Shape = string

/** Tipos de esquina. */
export type CornerType = 'bevel' | 'notch' | 'round' | 'scoop' | 'squircle' | 'square'

/** Un vértice de la geometría resuelta (px). `b` son los puntos de control de un cúbico (squircle). */
export interface Vertex {
  x: number
  y: number
  /** fillet (radius) en este vértice */
  r: number
  /** radios del arco que llega a este vértice (round / scoop) */
  rx: number
  ry: number
  /** sentido del arco: 1 = horario */
  sw: number
  /** índice de esquina (0 tl, 1 tr, 2 br, 3 bl) o -1 si es de un borde */
  c: number
  /** puntos de control del cúbico que llega a este vértice: [c1x, c1y, c2x, c2y] */
  b?: [number, number, number, number]
}

/** Geometría: lista de vértices más datos de la forma resuelta. */
export interface Geometry extends Array<Vertex> {
  /** margen que los rasgos de borde quitan a cada lado: [top, right, bottom, left] */
  safe: [number, number, number, number]
  /** esquinas resueltas: [tipo, tamaño horizontal, tamaño vertical] (tl, tr, br, bl) */
  cn: Array<[CornerType | undefined, number, number]>
  /** sólo esquinas simples, sin rasgos ni fillets: representable con corner-shape nativo */
  simple: boolean
}

export type Command =
  | ['M' | 'L', [number, number]]
  | ['A', [number, number], number, number, number]
  | ['C', [number, number], [number, number, number, number]]

/** Presets incluidos: card, button, chip, soft, notch, scoop, wing, panel, plate, tab, ticket, media, pill, hud. */
export const PRESETS: Record<string, Shape>

/** Registra un preset propio: `define('mi-card', 'tl bevel 30; br round 12; radius 2')`. */
export function define(name: string, shape: Shape): void

/** Texto → lista de declaraciones (se cachea). Uso avanzado. */
export function parse(src: Shape): unknown[]

/** Resuelve una forma a vértices en px para una caja w×h. */
export function geometry(shape: Shape, w: number, h: number): Geometry

/** Vértices → comandos de path con los fillets aplicados. `T` es la longitud total; `at`, la posición de cada vértice. */
export function commands(V: Vertex[]): { C: Command[]; T: number; at: Array<[number, number]> }

/** Declaraciones de una forma para un ancho dado (esquinas `c`, rasgos de borde `e`, `r`, `poly`), sin resolver a px. */
export function spec(shape: Shape, w: number): { c: Record<string, { type: string; a: string[]; r?: number }>; e: Record<'top' | 'right' | 'bottom' | 'left', { type: string; a: string[]; r?: number }[]>; r: number; rtl: number; poly?: string[][] }

/** SVG path `d` de una forma para una caja w×h (para <svg>, canvas Path2D, React…). */
export function path(shape: Shape, w: number, h: number): string

/** Interpola dos geometrías con la misma estructura (morph). t de 0 a 1. */
export function lerp(A: Vertex[], B: Vertex[], t: number): Vertex[]

/** Margen seguro (top, right, bottom, left) para que el contenido no choque con los cortes. */
export function safe(G: Geometry, pad?: [number, number, number, number], gap?: number): [number, number, number, number]

/** Inyecta CSS con una constructable stylesheet (compatible con CSP estricta). */
export function styles(css: string): void

/** Activa ns-frame en un elemento (normalmente no hace falta: data-ns lo activa solo). */
export function attach<E extends Element>(el: E): E

/** Deja de observar el elemento; con `clear`, además quita el recorte y la capa SVG. */
export function detach(el: Element, clear?: boolean): void

/** Forma efectiva que ns-frame está usando en el elemento (incluye data-ns-nest, hover, press y --ns-shape). */
export function shapeOf(el: Element): Shape | undefined

/** Fuerza una relectura (p. ej. tras cambiar variables CSS por JS). */
export function update(el: Element): void

/** Modos de apertura. */
export type Aperture = 'open' | 'split' | 'iris' | 'wipe' | 'drop'

/** Apertura respetando la forma. Se resuelve al terminar. */
export function open(el: Element, mode?: Aperture, duration?: number): Promise<void>

/** Cierre respetando la forma. Se resuelve al terminar. */
export function close(el: Element, mode?: Aperture, duration?: number): Promise<void>
