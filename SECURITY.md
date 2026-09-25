# Seguridad

## Versiones con soporte

| Versión | Soporte |
|---|---|
| 0.9.x | ✅ |
| 0.8.x | Sólo parches de seguridad |
| < 0.8 | ❌ |

## Reportar una vulnerabilidad

Usa el reporte privado de GitHub: pestaña **Security → Report a vulnerability** en este repositorio. Por favor, **no abras un issue público**.

Incluye, si puedes: versión afectada, navegador, un ejemplo mínimo y el impacto. Respondemos en cuanto podamos y te avisamos cuando haya una corrección publicada.

## Qué cuenta como vulnerabilidad

- Cualquier forma de inyección de HTML o script a través de atributos (`data-ns*`), variables CSS o parámetros de los módulos.
- Cualquier caso en que ns-frame necesite `'unsafe-inline'` o viole una CSP estricta.
- Problemas en la cadena de suministro de los archivos publicados (`packages/ns-frame/dist/`, servidos por jsDelivr desde las etiquetas de este repositorio).

ns-frame todavía no está publicado en npm. Un paquete llamado `ns-frame` en npm no es nuestro: si lo encuentras, avísanos por el mismo canal.
