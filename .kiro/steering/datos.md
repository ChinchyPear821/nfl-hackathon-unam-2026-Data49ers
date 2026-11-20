---
inclusion: always
---
# Datos  (PLANTILLA: llenar los [ ] el día del evento)

## Flujo
1. Dataset crudo → `C:\datos-tools\crudo\`. Nunca dentro del proyecto.
2. DuckDB lo procesa con `exportar.py` en `C:\datos-tools`.
3. Los resultados pequeños (CSV) van a `data/`. Nunca Parquet: pandas no tiene pyarrow.
4. `backend/main.py` los carga con pandas al arrancar y los expone en `/api/...`.

## Qué es el dataset
- Edición / temporada: [ ]
- Qué mide (una frase): [ ]
- Tablas y llave para unirlas: [ ]  (ej. `game_id, play_id`)
- Granularidad del tracking: [ ] (frames por segundo, qué jugadores aparecen, si hay balón)
- Trampas conocidas: [ ] (dirección del campo, unidades, columnas con texto raro, nulos)

## Hallazgo elegido
- Métrica: [ ] (cómo se calcula y en qué instante)
- Resultado clave: [ ] (cifras de los grupos extremos)

## Contrato de `data/`
| Archivo | Una fila por | Columnas |
|---|---|---|
| `jugadas.csv` | jugada | `jugada_id` + [contexto] + [métricas del hallazgo] + `grupo` |
| `frames.csv` | entidad por frame (solo jugadas animables) | `jugada_id, frame, fase, entidad_id, nombre, equipo, rol, posicion, es_balon, x, y` |
| `metricas.csv` | categoría de gráfica | `grafica, categoria, jugadas` + [porcentajes o promedios] |

- `jugada_id` = `"<game_id>-<play_id>"`.
- Coordenadas en yardas, `x` 0–120, `y` 0–53.3, ataque siempre de izquierda a derecha.
- Si el contrato de `frames.csv` no cambia, la animación funciona sin tocar el frontend.
