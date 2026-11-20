---
inclusion: always
---
# Interfaz (diseño ya decidido)

## Layout: la historia en tres actos (no agregar pestañas nuevas)

Encabezado con el hallazgo + 4 tarjetas, y pestañas en este orden:
1. **1 · El hallazgo** (`tab=hallazgo`): curva de ventaja → % completos con el quiebre, barras por grupo de ventaja, lista de jugadas + campo animado + explicación con IA.
2. **2 · La causa** (`tab=causa`): heatmap ruta x cobertura, barras de brecha de velocidad, estilos de receptor (clusters).
3. **3 · La decisión** (`tab=decision`, `DecisionPanel`): selector de situación (3ª y corta, 3ª y larga, 1ª), conclusión automática, tabla de rutas por % de conversión, receptores sugeridos por ruta, comparación contra un rival y dispersión de QB (ventaja contra EPA).
4. **Explorar los datos** (`tab=explorar`): tablas de equipos y jugadores. Es material de apoyo, no parte de la historia.

Cada acto abre con el componente `Acto` (número, título y una frase). Cualquier gráfica nueva debe ir en el acto que respalda; si no respalda ninguno, va en Explorar o no va.

## Componentes

- `FieldAnimation`: canvas 2D nativo (sin librerías). Props: lista de frames. Campo verde con líneas cada 5 yardas, ataque en azul, defensa en rojo, balón café con estela. Controles: play/pausa, barra de frames, velocidad 0.5x/1x/2x. Resalta siempre al `rol = Targeted Receiver` (amarillo) y marca el punto de caída del balón (último frame del balón) con una X.
- `PlayList`: lista clicable; la jugada activa con borde azul.
- `MetricCard`: número grande + etiqueta + nota pequeña.
- `ChartPanel`: Recharts (barras, líneas o dispersión). Nada de Plotly, D3 ni GSAP.
- `Story`: párrafos cortos.

## Estilo (obligatorio)

- Contenedor principal: `w-full max-w-[1600px] mx-auto px-4 lg:px-8`. Nunca `max-w-6xl` ni anchos menores.
- Zona central: `grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6`.
- Paleta: fondo `bg-slate-950`, superficies `bg-slate-900` con borde `border border-slate-800`, superficie elevada `bg-slate-800`. Texto `text-slate-100` / secundario `text-slate-400`. Acento `emerald-400` (positivo, completos), `rose-400` (negativo, intercepciones), `amber-300` (receptor objetivo).
- Tarjetas: `rounded-2xl p-5 shadow-lg shadow-black/20`; número en `text-4xl font-bold tabular-nums`.
- Encabezado: banda superior con degradado `bg-gradient-to-r from-emerald-500/20 via-slate-900 to-slate-950`, título `text-4xl md:text-5xl font-extrabold tracking-tight`.
- Pestañas: estilo "pill" (`rounded-full px-4 py-1.5`), activa `bg-emerald-500 text-slate-950`, inactiva `text-slate-300 hover:bg-slate-800`. Pestañas fijas arriba con `sticky top-0 backdrop-blur bg-slate-950/80 z-10`.
- Filtros: chips clicables (`rounded-full border px-3 py-1 text-sm`, activo relleno con el acento) para opciones cortas (resultado, grupo); `select` solo para listas largas (equipo). El buscador con ícono de lupa (SVG inline) y `rounded-full`.
- Tablas: encabezado `sticky` con `bg-slate-900`, filas alternas `odd:bg-slate-900/40`, columnas numéricas a la derecha con `tabular-nums`, encabezados ordenables con flecha.
- Equipos: usar `data/equipos.csv` (`equipo, nombre, ciudad, color_primario, color_secundario`). Cada equipo se muestra como una insignia redonda con su abreviatura sobre `color_primario` y borde `color_secundario`. Sin logos ni fotos.
- Jugadores: avatar redondo con iniciales sobre el color primario de su equipo. Sin fotos.
- Tailwind 3 únicamente. Tipografía del sistema. Sin imágenes externas, sin URLs absolutas, sin fuentes de CDN.

## API (rutas relativas, sin diagonal inicial)

- `fetch('api/plays')` → jugadas animables (las de `frames.csv`) con sus métricas de `jugadas.csv`
- `fetch('api/plays/<jugada_id>/frames')` → frames de una jugada
- `fetch('api/metrics')` → filas de `metricas.csv` + totales para las tarjetas (calculados de `jugadas.csv`)
