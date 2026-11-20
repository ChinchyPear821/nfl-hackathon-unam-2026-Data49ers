# Prompts para el análisis (pegar en Claude o Kiro con C:\datos-tools abierto)

## 1. Perfilar
Corre `explorar.py` y lee `explorar_salida.txt`. Dime en 10 líneas: qué tablas hay, cómo se unen, qué mide el tracking (frames por segundo, qué jugadores, si hay balón), qué columnas de contexto y de resultado hay, y qué trampas ves. Luego clasifica las columnas en Quién / Cómo se mueve / Contexto / Qué pasó (ver playbook.md).

## 2. Candidatos
Con esas columnas, elige 3 historias del menú del playbook que este dataset permita. Para cada una: la métrica, en qué instante se mide (debe ser antes del resultado) y la consulta que la prueba. Escribe `consultas_01.sql` con esas 3 consultas más 3 de perfilado (conteos, roles, distribución del resultado) y córrela con `q.py`.

## 3. Rondas
Lee la salida, aplica los 4 criterios de "suficiente" del playbook a cada candidato y escribe la siguiente ronda solo para los que sigan vivos. Máximo 4 rondas. Para en cuanto uno cumpla los 4 criterios.

## 4. Exportar
Adapta `exportar.py` al hallazgo elegido respetando el contrato de `datos.md`. Elige unas 150 jugadas animables que cubran todos los grupos y resultados. Córrelo y dime el tamaño de cada CSV.
