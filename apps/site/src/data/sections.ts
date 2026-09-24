// Secciones de la landing: una sola fuente para la barra superior y la isla móvil.
export interface Section { id: string; name: string; sub: string; icon: string; nav?: boolean }

export const SECTIONS: Section[] = [
  { id: 'inicio', name: 'Inicio', sub: 'Dale forma', icon: 'M3 10 10 4l7 6v7.5a.5.5 0 0 1-.5.5H13v-5H7v5H3.5a.5.5 0 0 1-.5-.5Z' },
  { id: 'forma', name: 'Formas', sub: 'Una línea', icon: 'M7 2.5h6l4.5 4.5v6L13 17.5H7L2.5 13V7Z', nav: true },
  { id: 'mosaico', name: 'Mosaico', sub: 'Piezas que encajan', icon: 'M3 3h7v4H7v5H3ZM13 3h4v9h-7V9h3ZM3 15h14v2H3Z', nav: true },
  { id: 'movimiento', name: 'Movimiento', sub: 'Luz en el borde', icon: 'M2 10c3-6 6-6 8 0s5 6 8 0', nav: true },
  { id: 'componentes', name: 'Componentes', sub: 'Piezas listas', icon: 'm10 2.5 7.5 4-7.5 4-7.5-4ZM2.5 10.5l7.5 4 7.5-4', nav: true },
  { id: 'empezar', name: 'Empezar', sub: 'En un minuto', icon: 'M5 10h10M11 6l4 4-4 4' },
]

export const LINKS = {
  github: 'https://github.com/kodecagency/ns-frame',
  docs: '/docs/introduccion',
  install: '/docs/instalacion',
  gallery: '/galeria.html',
}
