---
title: Agentes de IA
description: Skill para agentes de código y llms.txt, para que una IA use ns-frame correctamente.
order: 14
---

# Agentes de IA

ns-frame trae material pensado para agentes de código (Claude Code, Cursor, Copilot, etc.), para que generen formas y componentes correctos a la primera.

## Skill

`skills/ns-frame/` es una skill con el formato de Agent Skills (`SKILL.md` más referencias). Enseña al agente:

- cuándo usar cada pieza (atributo, módulo, CSS o compilación en el build),
- la sintaxis completa de formas, con los errores típicos,
- las reglas que no se deben romper: no usar `border` de CSS, no insertar HTML dinámico, mantener CSP estricta y accesibilidad,
- cómo verificar el resultado (auditoría de texto recortado, test de CSP, paridad del build).

### Instalarla

**Claude Code** (para todos tus proyectos):

```bash
git clone --depth 1 https://github.com/kodecagency/ns-frame
cp -r ns-frame/skills/ns-frame ~/.claude/skills/ns-frame
```

O sólo para un proyecto: copia la carpeta a `.claude/skills/ns-frame` dentro del repositorio.

**Otros agentes:** apunta sus instrucciones de proyecto (por ejemplo `AGENTS.md` o las reglas del editor) a `skills/ns-frame/SKILL.md`.

## llms.txt

`llms.txt`, en la raíz del repositorio y del sitio, resume la librería y enlaza cada guía en Markdown, siguiendo la propuesta [llmstxt.org](https://llmstxt.org). Sirve para que un modelo con acceso web encuentre la documentación correcta sin recorrer el sitio.
