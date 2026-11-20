# El pase se decide antes de que el balón salga

**NFL Big Data Bowl 2026 · UNAM** — práctica con datos de tracking de la temporada 2023 (14,108 pases).

## Hallazgo

Medimos, en el instante en que el QB suelta el balón, qué tan lejos está el receptor objetivo del punto donde caerá el balón y qué tan lejos está el defensor más cercano. A esa diferencia la llamamos **ventaja al lanzar**.

| Ventaja al lanzar | Jugadas | % completos | % intercepciones |
|---|---|---|---|
| Defensor 2+ yd más cerca | 1,717 | 44% | 6.9% |
| Defensor 0–2 yd más cerca | 2,649 | 50% | 4.0% |
| Receptor 0–2 yd más cerca | 4,429 | 66% | 1.9% |
| Receptor 2–5 yd más cerca | 3,414 | 87% | 0.6% |
| Receptor 5+ yd más cerca | 1,898 | 92% | 0.3% |

La métrica se calcula **antes** del resultado, así que no es circular: el resultado del pase se puede anticipar desde el lanzamiento. Una segunda señal: cuando al receptor le faltan más de 2 yd/s de velocidad para llegar a tiempo, solo se completa alrededor del 35% de los pases.

## La historia en tres actos

1. **El hallazgo.** La ventaja al lanzar decide el pase: de −1 a +2 yardas de ventaja, el % de completos salta de 51% a 84%; después se estanca cerca del 91%. Dos yardas bastan.
2. **La causa.** La ventaja depende de la ruta contra la cobertura (las rutas cortas como SCREEN y FLAT generan más de 5 yd de ventaja; las profundas como POST y GO suelen salir sin ventaja) y del estilo del receptor (cinco estilos detectados con clustering).
3. **La decisión.** La ventaja compra seguridad, pero no siempre sirve. En 3ª y larga, SCREEN y FLAT salen con 6–8 yd de ventaja y se completan más del 80%, pero solo consiguen el primer down el 13–15%; la POST, sin ventaja, lo consigue el 53%. En 3ª y corta, la HITCH (+2 yd de ventaja) convierte el 73%. El dashboard sugiere rutas y receptores por situación y compara la defensa rival con la liga.

## Qué muestra el dashboard

- Una pestaña por acto, más "Explorar los datos" con tablas de equipos y jugadores.
- 145 jugadas reales animadas en el campo: pasa el mouse sobre un jugador para ver quién es y haz clic para seguir su trayectoria.
- Explicación opcional de cada jugada con Amazon Nova; la app funciona igual sin ella.

## Limitaciones

- Las recomendaciones por situación son de toda la liga; por equipo la muestra es pequeña (unos 20–60 pases por situación) y se marca como tendencia.
- Correlación no es causa: la ventaja se mide antes del resultado, pero otras variables (presión al QB, precisión del lanzamiento) no están en el dataset.
- Trabajo futuro: ruta óptima del receptor con un modelo físico de movimiento.

## Cómo correrlo

```
# backend (desde la raíz del proyecto)
.venv\Scripts\uvicorn backend.main:app --reload --port 8000
# dashboard (otra terminal)
cd dashboard
..\.hackathon\.tools\node\npm.cmd run dev
```

Abre `http://localhost:5173`.

## Datos y método

- Los CSV originales se procesaron fuera del proyecto con DuckDB; en `data/` solo están los resúmenes (`jugadas.csv`, `frames.csv`, `metricas.csv`).
- Coordenadas normalizadas para que el ataque siempre vaya de izquierda a derecha.
- El balón no tiene tracking en este dataset: en el aire se dibuja como una línea recta del QB al punto de caída (aproximación).

