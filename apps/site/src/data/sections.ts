// Secciones de la landing: una sola fuente para la barra superior y la isla móvil.
// Iconos de trazo 20×20 (stroke 1.6): cada uno dibuja lo que enseña su sección.
export interface Section { id: string; name: string; sub: string; icon: string; nav?: boolean }

export const SECTIONS: Section[] = [
  // orbe hexagonal con su punto, como el del tablero
  { id: 'inicio', name: 'Inicio', sub: 'Dale forma', icon: 'M10 3 16 6.5v7L10 17l-6-3.5v-7Z M10 10h.01' },
  // antes (rectángulo) y después (chaflán)
  { id: 'por-que', name: 'Por qué', sub: 'Antes y después', icon: 'M3 4.5h5v11H3Z M11.5 4.5H15l2 2v9h-5.5Z' },
  // tarjeta con chaflanes opuestos
  { id: 'forma', name: 'Formas', sub: 'Una línea', icon: 'M6.5 3.5H17v10l-3.5 3.5H3V7Z', nav: true },
  // código: diseñar y copiar
  { id: 'playground', name: 'Playground', sub: 'Diseña la tuya', icon: 'M7 6 3 10l4 4 M13 6l4 4-4 4 M11 4.5 9 15.5', nav: true },
  // marco con la luz en U dentro
  { id: 'bordes', name: 'Bordes', sub: 'Degradados y luz', icon: 'M4 6.5a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 16 6.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 13.5Z M7.5 8v2.5a2.5 2.5 0 0 0 5 0V8', nav: true },
  // cuatro piezas que abrazan un hueco redondo
  { id: 'mosaico', name: 'Mosaico', sub: 'Piezas que encajan', icon: 'M3 3h5.5v3a3 3 0 0 0-2.5 2.5H3Z M17 3v5.5h-3A3 3 0 0 0 11.5 6V3Z M3 17v-5.5h3A3 3 0 0 0 8.5 14v3Z M17 17h-5.5v-3a3 3 0 0 0 2.5-2.5h3Z', nav: true },
  // borde abierto con la estela de un cometa
  { id: 'movimiento', name: 'Movimiento', sub: 'Luz en el borde', icon: 'M9 4H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2 M12.5 4h.01 M15.2 5h.01 M16 7.8h.01', nav: true },
  // popover con su flecha
  { id: 'componentes', name: 'Componentes', sub: 'Piezas listas', icon: 'M4 4h12v8.5H11L8 15.5v-3H4Z', nav: true },
  // panel que se despliega desde el centro
  { id: 'aperturas', name: 'Aperturas', sub: 'Entran con su forma', icon: 'M4 5h12v10H4Z M8 10H6 M14 10h-2 M10 5v10' },
  // punto anotado con su línea de callout
  { id: 'anatomia', name: 'Anatomía', sub: 'Callouts y responsive', icon: 'M5.5 16.5a1.5 1.5 0 1 0 0-.01 M6.6 15.4 11 11h6 M11 7h6' },
  // barras de tamaño
  { id: 'cifras', name: 'Cifras', sub: 'Bento y aura', icon: 'M4 16v-5 M10 16V4 M16 16V8' },
  { id: 'empezar', name: 'Empezar', sub: 'En un minuto', icon: 'M4 10h11 M11 5.5l4.5 4.5-4.5 4.5' },
]

export const LINKS = {
  github: 'https://github.com/kodecagency/ns-frame',
  docs: '/docs/introduccion',
  install: '/docs/instalacion',
}
