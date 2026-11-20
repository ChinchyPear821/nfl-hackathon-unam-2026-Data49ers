---
inclusion: always
---
# Datos (ya procesados; viven en `data/`)

Generados con DuckDB fuera del proyecto. Coordenadas en yardas, normalizadas: el ataque SIEMPRE va hacia la derecha. `x` 0–120 (zonas de anotación en 0–10 y 110–120), `y` 0–53.3.

| Archivo | Una fila por | Columnas |
|---|---|---|
| `jugadas.csv` | pase con receptor identificado (7,239) | `jugada_id` ("gameId-playId"), `descripcion`, `resultado` (C completo, I incompleto, IN intercepción), `ataque`, `defensa`, `cuarto`, `down`, `yards_to_go`, `yardas`, `cobertura`, `formacion`, `semana`, `reloj` (MM:SS que quedaban en el cuarto), `marcador_ataque`, `marcador_defensa`, `ataque_es_local`, `qb`, `receptor`, `receptor_id`, `receptor_camiseta`, `sep_objetivo` (yd), `prob_completo` (0–1), `mejor_nombre`, `mejor_id`, `mejor_camiseta`, `mejor_sep`, `mejor_prob`, `habia_mejor_opcion` (bool), `seg_para_lanzar`, `dist_rusher` (yd del rusher más cercano al QB al lanzar), `los_x` (línea de scrimmage), `primer_down_x` |
| `frames.csv` | entidad por cuadro (10 por segundo) de 90 jugadas animables | `jugada_id`, `frame`, `seg` (segundos desde el snap; negativo antes), `fase` (`antes_snap`, `jugada`, `aire`), `entidad_id` (nflId o `balon`), `nombre`, `camiseta`, `posicion`, `equipo` (`ataque`, `defensa`, `balon`), `rol` (`Pass` = QB, `Pass Route` = receptor, `Pass Block`, `Pass Rush`, `Coverage`, `Balón`), `es_balon`, `x`, `y`, `sep` (solo receptores: yd al defensor más cercano), `dist_rusher` (solo QB) |
| `seleccion.csv` | jugada animable (90) | `jugada_id`, `gameId`, `playId`, `historia` (6 tipos: "Receptor abierto, pase fácil", "Completo bien cubierto", "Abierto y aun así falló", "Había un receptor más abierto", "Lanzó bajo presión", "Intercepción") |
| `separacion.csv` | yarda de separación (0..8, 8 = 8+) | `sep_yd`, `jugadas`, `pct_completo`, `pct_intercepcion` |

- El instante del lanzamiento es el último cuadro con `fase` distinto de `aire`.
- `prob_completo` = `pct_completo` de `separacion.csv` para la separación del objetivo. Es "de pases así, X% se completan", no un modelo opaco.
- Valores vacíos: el jugador no tiene ese rol. En el backend convierte NaN a None antes de responder.

## Archivos adicionales
| Archivo | Una fila por | Columnas |
|---|---|---|
| `opciones.csv` | receptor de cada jugada animable, en el instante del lanzamiento | `jugada_id`, `entidad_id`, `nombre`, `camiseta`, `posicion`, `sep`, `prob_completo`, `pasa_scrimmage`, `pasa_primer_down`, `es_objetivo`, `es_mejor_opcion`. Sirve para "¿qué habría pasado si lanzaba a otro?": cada opción con su probabilidad. |
| `qbs.csv` | QB con 100+ jugadas de pase (34) | `qb`, `equipo`, `jugadas`, `pct_completo`, `capturas`, `intercepciones`, `yardas_por_jugada`, `seg_para_lanzar`, `pct_bajo_presion` (golpe, prisa o captura según PFF), `pct_completo_con_presion`, `pct_completo_sin_presion`, `sep_prom_objetivo`, `pct_habia_mejor_opcion` |
| `formaciones.csv` | formación ofensiva (5) | `formacion`, `jugadas`, `pct_completo`, `pct_captura`, `pct_bajo_presion`, `seg_para_lanzar`, `sep_prom_objetivo`, `yardas_por_jugada` |

- La presión cuadro por cuadro ya está en `frames.csv`: columna `dist_rusher` en la fila del QB (`rol = Pass`).
- Entre formaciones el % de completos casi no cambia (60–64%); la separación cambia mucho más (23% a 85%). Si se muestra, decirlo así.
| `equipos.csv` | equipo (32) | `equipo` (abreviatura), `nombre`, `ciudad`, `color_primario`, `color_secundario`. Solo cosmético (colores del marcador); no es dato de análisis. |

- El dataset NO trae tiempos fuera ni reloj de jugada (los ":17" de la TV). No los inventes.

## Presión: ¿culpa de la línea o del reloj del QB? (análisis de un integrante del equipo)
| Archivo | Una fila por | Columnas |
|---|---|---|
| `presion.csv` | jugada de `jugadas.csv` (se une por `jugada_id`) | `veredicto_presion` ("Bolsillo limpio", "La línea no aguantó", "Rusher libre (esquema)", "El QB retuvo el balón"), `hubo_presion`, `culpa_liniero_pff`, `seg_hasta_lanzar_o_captura`, `seg_rusher_a_2_5yd`, `rusher_mas_cercano`, `dist_rusher_final`, `rusher_sin_bloqueo` |
| `curva_bolsillo.csv` | segundo (0 a 4, cada 0.1) por veredicto | `seg`, `veredicto_presion`, `jugadas`, `dist_mediana` (yd del rusher más cercano al QB) |

`qbs.csv` ahora también trae `pct_presiones_culpa_linea`, `pct_presiones_reloj_qb`, `pct_presiones_esquema` (vacío en 3 QB).

Definición (PFF + tracking, todas las jugadas de pase): hubo presión si PFF marca golpe, prisa o captura. "La línea no aguantó" = presión, PFF culpa a un liniero y el QB lanzó en 3.0 s o menos. "Rusher libre (esquema)" = presión en 3.0 s o menos sin culpa a un liniero. "El QB retuvo el balón" = presión en jugadas de más de 3.0 s. Cifras en las 8,524 jugadas: de las presiones, 62% son del reloj del QB, 30% de la línea y 8% de esquema; cuando el QB retuvo el balón, 27% de completos y 25% de capturas.
| `resumen_presion.csv` | veredicto (4), sobre las 8,524 jugadas de pase con capturas y scrambles | `veredicto_presion`, `jugadas`, `pct_de_todas`, `pct_de_presiones` (vacío en "Bolsillo limpio"), `pct_completo`, `pct_captura`. Fuente de las cifras globales de presión. |
