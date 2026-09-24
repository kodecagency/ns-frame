---
title: Seguridad
description: Sin inyección, compatible con CSP estricta, sin dependencias ni red.
order: 12
---

# Seguridad

ns-frame está pensado para sitios con contenido de usuarios y políticas de seguridad estrictas.

- **Sin inyección.** Todo el SVG se construye con `createElementNS`, `setAttribute` y CSSOM; no hay `innerHTML` con valores dinámicos. Ningún valor de atributo ni de CSS puede convertirse en HTML ni en un script. Los toasts insertan mensaje y título como texto.
- **CSP estricta.** Funciona con `default-src 'self'; script-src 'self'; style-src 'self'`, sin `'unsafe-inline'`. Los estilos del runtime van en una *constructable stylesheet*, con respaldo a `<style>` con el nonce de `<meta name="csp-nonce">`. Las formas compiladas en el build (`ns-frame/static`) van en una hoja externa, no en estilos en línea.
- **Cascada predecible.** Los estilos del runtime están en `@layer ns`: tu CSS siempre gana.
- **Entradas validadas.** Duraciones con una expresión estricta, selectores de `ns-link` en `try/catch`, números con `parseFloat`. Sin `eval`, sin red y sin dependencias en el navegador.
- **Test automático.** `packages/ns-frame/test/csp.html` carga todo con CSP estricta y atributos maliciosos (`<image onerror>`, `<script>`, en formas, animaciones, skeletons, carruseles y toasts) y cuenta violaciones y nodos inyectados: ambos deben ser 0.

## Cadena de suministro

- Cero dependencias de runtime. Las de desarrollo (esbuild y terser) van con versión exacta y lockfile.
- El repositorio usa pnpm con una semana de espera para versiones nuevas y scripts de instalación bloqueados (`pnpm-workspace.yaml`).
- La CI fija cada GitHub Action a un commit (SHA), no a una etiqueta.

## Reportar una vulnerabilidad

Mira [SECURITY.md](https://github.com/kodecagency/ns-frame/blob/main/SECURITY.md). Por favor, no abras un issue público para vulnerabilidades.
