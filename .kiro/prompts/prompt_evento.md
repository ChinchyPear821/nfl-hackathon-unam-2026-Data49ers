Relee del disco `.kiro/steering/` (rules.md, proyecto.md, datos.md, interfaz.md) y los archivos que vayas a modificar: este proyecto se usó para una práctica y los datos cambiaron.

Construye la app de `interfaz.md` con los datos de `data/` (jugadas.csv, frames.csv, seleccion.csv, separacion.csv):
1. `backend/main.py`: reescríbelo para estos 4 CSV. Endpoints: `GET /health`, `GET /api/resumen` (cifras de las tarjetas, calculadas de jugadas.csv y separacion.csv), `GET /api/separacion`, `GET /api/jugadas` (las 90 animables con su historia y columnas de jugadas.csv), `GET /api/jugadas/{jugada_id}/frames`. Sin NaN en las respuestas. Conserva `cargar_env()` y el montaje de `dashboard/dist`.
2. Frontend: sección Inicio (video `se_completara_el_pase.mp4` de `public/`, tarjetas, gráfica, botón) y sección Explorar jugadas (lista con filtros, campo 2D con pausa automática en el lanzamiento, zoom/arrastre/seguir jugador, panel de jugadores). Reusa y extiende `FieldAnimation.tsx`; borra los componentes de la práctica que ya no se usen (ChartPanel, ClustersPanel, DecisionPanel, PlayersPanel, TeamsPanel, Story, Narracion, PlayRoster, MetricCard si no los reusas).
3. Antes de escribir código, dime el plan en 5 líneas y qué archivos crearás, modificarás o borrarás.
Al terminar, corre `tsc --noEmit` en `dashboard` y dime cómo correrlo.
