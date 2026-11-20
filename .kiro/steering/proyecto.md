---
inclusion: always
---
# Contexto del proyecto  (PLANTILLA: llenar los [ ])

- Hackatón NFL Big Data Bowl 2026, sede UNAM. Unas 2 horas de trabajo.
- Dataset: [edición, temporada]. No inventes años ni nombres de eventos; usa solo estos.
- Entregable: un dashboard + `README.md` (lo primero que se evalúa, debe llevar captura).
- Hallazgo principal: [una frase con las dos cifras extremas].
- Objetivo: storytelling con datos: gancho → evidencia → métrica → conclusión.
- La app no depende de IA. Si se agrega Bedrock, es un extra y la app debe funcionar sin él.
- Prioridades: que funcione → que el hallazgo sea claro → que se vea bien.

## Reglas de trabajo
- Respeta `rules.md`. Si algo choca, gana `rules.md`.
- Nunca leas datasets completos. Si necesitas ver datos, pide el esquema o una muestra.
- Cambios mínimos: modifica solo lo que se pide. No reescribas archivos que funcionan.
- Antes de un cambio que toque más de un archivo, describe el plan en 3 a 5 líneas.
- Respuestas cortas. No expliques el código salvo que se pida.
- Toda cifra que muestres sale de los CSV de `data/` o de este archivo; nunca la inventes.
- Diseño en `interfaz.md`; datos en `datos.md`.
- En `vite.config.ts` el proxy va a `http://127.0.0.1:8000` (en Windows `localhost` falla).
