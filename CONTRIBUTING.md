# Contribuir

¡Gracias por tu interés! Las contribuciones son bienvenidas: issues, ideas, documentación y código.

## Preparar el entorno

Requisitos: Node 22+ y **pnpm** (no uses npm ni yarn: el lockfile y la política de seguridad son de pnpm).

```bash
pnpm install
pnpm test      # build + test de paridad
pnpm dev       # sitio de demo y documentación en http://localhost:4321
```

## Antes de abrir un pull request

1. `pnpm test` debe terminar con **0 fallos**. Compara el código fuente con el build minificado y el lite en cientos de formas aleatorias, más casos explícitos.
2. Abre `packages/ns-frame/test/csp.html` (sirve la carpeta del paquete con cualquier servidor estático): debe mostrar **0 violaciones y 0 nodos inyectados**.
3. Si tocaste la demo o un componente, revisa el sitio a 1280, 1024, 768 y 390 px y corre `audit({ clearance: 5 })` desde `ns-frame/audit`: sin texto recortado ni apretado y sin scroll horizontal.
4. Si agregaste o cambiaste una función, actualiza su guía en `docs/`, los tipos en `packages/ns-frame/types/` y la skill en `skills/ns-frame/`.

## Reglas del código

- **Sin `innerHTML` con valores dinámicos**: construye el DOM con `createElement(NS)`, `setAttribute` y CSSOM.
- **Compatible con CSP estricta**: nada de estilos en línea como texto; usa `styles()` del núcleo (constructable stylesheet en `@layer ns`).
- **Accesibilidad**: `prefers-reduced-motion`, foco visible que sigue la forma, capas decorativas con `aria-hidden`.
- **Peso**: cada byte del núcleo cuenta. Lo opcional va en un módulo o en `ns-extra.js` (bajo demanda).
- **Dependencias**: ninguna de runtime. Las de desarrollo, con versión exacta y sólo con pnpm.

## Reportar vulnerabilidades

No abras un issue público: mira [SECURITY.md](SECURITY.md).
