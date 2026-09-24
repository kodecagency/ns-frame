// Tipos de los módulos opcionales de ns-frame. Cada módulo se importa por su ruta:
// ns-frame/css, ns-frame/static, ns-frame/vt, ns-frame/toast, ns-frame/skel, ns-frame/carousel,
// ns-frame/pop, ns-frame/bento, ns-frame/mosaic, ns-frame/link, ns-frame/fx, ns-frame/audit.
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

// ── ns-frame/skel, ns-frame/bento, ns-frame/mosaic, ns-frame/link ──
/** Vuelve a medir (skeletons: uno o todos; bento, mosaicos y callouts: todos). */
export function refresh(el?: Element): void

// ── ns-frame/mosaic ──
/** Lee una plantilla `--ns-areas` ("'a a b' 'c d b'") como matriz de celdas ('.' = vacía). */
export function parseAreas(areas: string): string[][]

// ── ns-frame/fx ──
/** Efecto de texto que se "descifra". */
export function decode(el: HTMLElement, duration?: number): void

// ── ns-frame/audit (sólo desarrollo) ──
export interface AuditIssue { el: Element; what: string; shape: Shape; type: 'clipped' | 'tight' }
export function audit(options?: { root?: ParentNode; mark?: boolean; margin?: number; clearance?: number }): AuditIssue[]
