---
inclusion: always
---
# Playbook del evento (2 horas)

## Regla de oro
La IA nunca lee los CSV crudos. Ciclo: escribir `consultas_XX.sql` → correr `q.py` → leer `consultas_XX_salida.txt` → decidir la siguiente ronda.
Herramientas en `C:\datos-tools`: `explorar.py` (perfilar), `q.py` (correr consultas), `exportar.py` (generar `data/`).

## Tiempos
| Minuto | Paso | Salida |
|---|---|---|
| 0–10 | Copiar dataset a `crudo\`, correr `explorar.py` | `explorar_salida.txt` |
| 10–15 | Entender el dataset: ¿qué mide, qué pasó, qué contexto? Reescribir `datos.md` | `datos.md` |
| 15–45 | Rondas de consultas (máx. 4) sobre 3 candidatos del menú | Un hallazgo elegido |
| 45–60 | Adaptar `exportar.py`, copiar CSV a `data/` | `data/*.csv` |
| 60–95 | Kiro adapta la app (encabezado, tarjetas, gráficas, historia) | App funcionando |
| 95–110 | README con captura, revisar textos y cifras | `README.md` |
| 110–120 | `--check`, `--entregar`, ensayar la explicación | `.zip` |

Si en el minuto 45 no hay hallazgo, se toma el mejor candidato que haya.

## Cómo leer un dataset nuevo
Clasifica cada columna en una de cuatro preguntas. Toda historia cruza al menos dos:
- **Quién**: jugador, posición, rol, físico (estatura, peso, edad), equipo.
- **Cómo se mueve**: x, y, velocidad, aceleración, dirección, orientación, por frame.
- **En qué contexto**: down, distancia, marcador, cuarto, formación, cobertura, ruta, play action.
- **Qué pasó**: resultado, yardas, EPA, probabilidad de victoria.

## Menú de historias (elegir 3 candidatos según las columnas)
1. **Ventaja en el momento clave**: posición relativa de atacante y defensor en un instante previo al resultado (lanzamiento, recepción, contacto). Ya validada con el dataset 2026.
2. **Anticipación**: ¿quién reacciona primero y hacia dónde? Dirección de movimiento en las primeras décimas tras un evento.
3. **Estilos de jugador (clusters)**: agrupar jugadores por su perfil de movimiento; "encuentra jugadores con un estilo parecido a X". El clustering se hace en `datos-tools` (ahí sí se puede usar scikit-learn) y se exporta el resultado.
4. **Contexto contra resultado**: cobertura contra ruta, play action, formación, presión. ¿Qué combinación gana?
5. **Físico contra situación**: estatura o velocidad en balones disputados, cansancio al final del partido.
6. **Situación del partido**: ¿cambia el patrón en tercera oportunidad, zona roja o al final del partido?
7. **Simulador "¿y si…?"**: cambiar un parámetro (velocidad del receptor, posición del defensor) y recalcular la métrica del hallazgo.

## Cuándo un hallazgo es suficiente (las 4)
1. **Diferencia grande** entre grupos (p. ej. 44% contra 92%, no 68% contra 69%).
2. **No es circular**: se mide antes del resultado.
3. **Muestra suficiente**: cientos de jugadas por grupo.
4. **Sobrevive una prueba en contra**: se mantiene al separar por otra variable (pases cortos y largos, cobertura, equipo).

## Estructura de la historia
Gancho (dato sorprendente en una frase) → evidencia (gráfica) → métrica (la que inventamos, explicada en una línea) → conclusión (qué haría un entrenador con esto).

## Antes de entregar
- Revisar TODO texto que escriba la IA: años, temporada, nombre del evento, cifras.
- Toda cifra del dashboard y el README debe salir de los CSV, no de memoria.
- El README lleva captura.
