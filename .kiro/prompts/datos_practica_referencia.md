---
inclusion: always
---
# Datos

## Flujo

1. Dataset crudo (CSV de varios GB) → vive FUERA del proyecto. No se copia a `data/`.
2. Se procesa con DuckDB en una carpeta aparte (`C:\datos-tools`), no dentro del proyecto.
3. DuckDB exporta archivos pequeños (CSV o JSON, nunca Parquet: pandas no tiene pyarrow) a `data/`.
4. `backend/main.py` carga esos archivos con pandas al arrancar y los expone en `/api/...`.
5. El dashboard los consume con `fetch('api/...')`.

## Contrato de `data/` (archivos procesados)

| Archivo | Una fila por | Columnas clave |
|---|---|---|
| `jugadas.csv` | jugada (todas, ~14 mil) | `jugada_id, descripcion, resultado (C/I/IN), qb, receptor, ruta, cobertura, yardas, epa, dist_receptor, dist_defensor, ventaja, vel_requerida, vel_receptor, brecha_vel, grupo_ventaja` |
| `frames.csv` | entidad por frame (solo ~145 jugadas animables) | `jugada_id, frame, fase (antes/aire), entidad_id, nombre, equipo (ataque/defensa/balon), rol, es_balon, x, y` |
| `metricas.csv` | categoría de una gráfica | `grafica, categoria, jugadas, pct_completo, pct_intercepcion` |

- `jugada_id` = `"<game_id>-<play_id>"`. Usarlo siempre como identificador (play_id solo no es único).
- Métricas medidas en el último frame ANTES del lanzamiento (no son circulares). `ventaja` = distancia del defensor más cercano al punto de caída menos la del receptor objetivo (positivo = receptor más cerca).
- `frames.csv`: el balón no tiene tracking; antes del lanzamiento va con el QB y en el aire es una línea recta del QB al punto de caída (aproximación, decirlo en la interfaz). Jugadores sin datos durante el vuelo quedan quietos.
- Una jugada de `jugadas.csv` solo se puede animar si su `jugada_id` está en `frames.csv`.
- Coordenadas en yardas, `x` 0–120, `y` 0–53.3, ataque siempre de izquierda a derecha.

## Esquema de ediciones pasadas (referencia, verificar con el dataset real)

- tracking: `gameId, playId, nflId, displayName, frameId, time, club, playDirection, x, y, s, a, dis, o, dir, event`. El balón suele venir como filas con `club = 'football'` y `nflId` vacío.
- plays: `gameId, playId, playDescription, quarter, down, yardsToGo, possessionTeam, defensiveTeam, passResult`, entre otras.
- players: `nflId, displayName, position, height, weight`.
- games: `gameId, season, week, homeTeamAbbr, visitorTeamAbbr`.

Si el dataset del evento difiere, solo se ajusta la consulta de DuckDB que genera los archivos de `data/`; el contrato de arriba no cambia.

## Archivos adicionales en `data/`

| Archivo | Una fila por | Columnas |
|---|---|---|
| `players.csv` | jugador (1,384) | ficha: `entidad_id, nombre, posicion, estatura, peso_lb, equipo, jugadas, vel_max`. Receptor: `veces_objetivo, pct_completo_objetivo, ventaja_prom_objetivo, yardas_objetivo`. QB: `qb_pases, qb_pct_completo, qb_pct_intercepcion, qb_ventaja_prom, qb_distancia_prom, qb_epa_prom`. Defensor (cuando fue el más cercano al punto de caída): `def_veces_cercano, def_pct_completo_permitido, def_intercepciones, def_ventaja_prom_permitida`. Cluster (solo WR/TE/RB con 60+ rutas): `cluster, cluster_nombre, pc1, pc2, vel_max_prom, acel_p90, profundidad, desp_lateral, sinuosidad, ventaja_prom` |
| `clusters.csv` | estilo de receptor (5) | `cluster, cluster_nombre, jugadores` + promedio de cada rasgo |
| `heatmap.csv` | combinación ruta x cobertura (40+ pases) | `ruta, cobertura, jugadas, pct_completo, ventaja_prom, epa_prom` |
| `curva_ventaja.csv` | yarda de ventaja (-6 a +10) | `ventaja_yd, jugadas, pct_completo, pct_intercepcion` |
| `equipos.csv` | equipo (32) | `equipo, nombre, ciudad, color_primario, color_secundario` |

- Columnas vacías = el jugador no tuvo ese rol (usar "—", nunca 0). En el backend convertir NaN a None antes de responder.
- Unidades: velocidades en yd/s, distancias en yardas, porcentajes como fracción 0–1.
- Los rasgos del cluster se miden antes del lanzamiento y se promedian por jugador. `pc1, pc2` son la proyección 2D para la gráfica de dispersión.
