(PLANTILLA: llenar los [ ] y pegar en Kiro. No guardar este archivo en .kiro/steering/)

La app ya existe y funciona. En `data/` hay CSV nuevos con el formato descrito en `.kiro/steering/datos.md`.

Adapta la app al nuevo hallazgo, con cambios mínimos:
1. `backend/main.py`: ajusta columnas numéricas y los totales de `/api/metrics` a: [tarjetas].
2. Encabezado: "[título del hallazgo]" y subtítulo "[frase con las dos cifras]".
3. Tarjetas: [4 métricas con su fuente en los CSV].
4. Gráficas: [qué gráfica, eje X, eje Y, de qué filas de metricas.csv].
5. Filtros de la lista: [columnas de jugadas.csv].
6. Ficha de la jugada: [columnas a mostrar].
7. `Story.tsx`: [3 párrafos: gancho, evidencia, qué haría un entrenador].
No toques `FieldAnimation.tsx` salvo que el formato de `frames.csv` cambie.
Primero dime el plan en 5 líneas y qué archivos vas a modificar.
