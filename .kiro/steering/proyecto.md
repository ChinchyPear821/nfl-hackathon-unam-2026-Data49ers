---
inclusion: always
---
# Contexto del proyecto: "¿Se completará el pase?"

- Hackatón NFL Big Data Bowl (sede UNAM), unas 2 horas. Jueces mayormente NO técnicos (periodismo y redes): todo debe entenderse sin saber estadística.
- Dataset: NFL Big Data Bowl 2023 (temporada 2021, semanas 1 a 8, 122 partidos). El tracking termina 0.5 s después del lanzamiento. No inventes años, temporadas ni cifras: usa solo los CSV de `data/`.
- Hallazgo: la separación del receptor respecto al defensor más cercano en el instante del lanzamiento predice el pase. Con menos de 1 yd se completa el 23%; con 8+ yd, el 85% (7,239 pases). En el 29% de los pases había otro receptor, ya pasando la línea, con 2+ yd más de separación.
- Experiencia: el espectador ve la jugada, la app se pausa al lanzar, predice con la separación y luego revela el resultado.
- Entregable: dashboard + `README.md` con captura. Prioridades: que funcione → que se entienda → que se vea bien.

## Reglas de trabajo
- Respeta `rules.md`. Si algo choca, gana `rules.md`.
- Relee del disco cualquier archivo antes de modificarlo: otras personas (y otra IA) editan este proyecto.
- Cambios mínimos; no reescribas lo que funciona. Antes de tocar varios archivos, da el plan en 5 líneas.
- Toda cifra mostrada sale de `data/`. Nunca uses ejemplos inventados.
- Proxy de Vite a `http://127.0.0.1:8000` (en Windows `localhost` falla). Archivos en UTF-8.
