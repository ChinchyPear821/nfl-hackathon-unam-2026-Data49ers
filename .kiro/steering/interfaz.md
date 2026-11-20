---
inclusion: always
---
# Interfaz: dos secciones (no agregues más)

Navegación superior fija con dos botones tipo pill: **Inicio** y **Explorar jugadas**.

## 1. Inicio (landing)
- Video a pantalla completa (ancho máx. 1280, relación 16:9): `<video src="se_completara_el_pase.mp4" autoPlay muted loop playsInline controls>`. Ruta relativa, sin diagonal inicial; el archivo está en `dashboard/public/`.
- Debajo: título "¿Se completará el pase?" y una frase: "La separación del receptor al lanzar predice el resultado."
- Tres tarjetas grandes con cifras de `data/`: % completos con menos de 1 yd de separación, % con 8+ yd, % de pases donde había un receptor más abierto.
- Gráfica de barras (Recharts) de `separacion.csv`: eje X "yardas de separación", eje Y "% completos"; barras rojas (<50%), ámbar (50–70%), verdes (70%+).
- Botón grande "Explora las jugadas →" que cambia a la sección 2.

## 2. Explorar jugadas (campo 2D)
Layout: lista a la izquierda (320 px) + campo grande al centro + panel derecho (320 px) en escritorio; una columna en móvil.

- **Lista de jugadas** (90 de `seleccion.csv` + `jugadas.csv`): filtros por historia (chips), equipo (select con los equipos de ataque y defensa) y buscador por QB o receptor. Cada fila: "QB → receptor", equipos, historia y resultado con color.
- **Campo** (reusar y extender `components/FieldAnimation.tsx`, canvas 2D, sin librerías):
  - Campo reglamentario ya implementado (hashes, números, postes, línea de scrimmage azul y primer down amarilla).
  - Círculos con el NÚMERO DE CAMISETA dentro; ataque azul, defensa rojo; balón café.
  - Receptores con halo de semáforo según `sep`: verde 3+ yd, ámbar 1–3, rojo <1.
  - QB con círculo punteado ("bolsillo") de radio = `dist_rusher`, color según la distancia.
  - Reloj desde el snap y barra "bolsillo del QB" sobre el campo.
  - Reproducción: play/pausa, barra de cuadros, velocidad 0.5x/1x/2x. **Pausa automática en el lanzamiento** con tarjeta: "Va hacia #N receptor · X% (separación Y yd)" y, si `habia_mejor_opcion`, "Había otra opción: #N nombre · Z%". Al continuar, letrero del resultado (COMPLETO verde / INCOMPLETO o INTERCEPTADO rojo) y si la predicción se cumplió.
  - **Perspectiva**: zoom con rueda del mouse y botones +/−, arrastrar para mover la cámara, botón "Encuadrar jugada" (zoom automático a la acción) y "Campo completo".
  - **Enfocar jugador**: clic en un círculo (o en el panel) lo selecciona; la cámara lo sigue suavemente; se dibuja su trayectoria.
- **Panel derecho**:
  - Ficha de la jugada: equipos, cuarto, down y yardas, cobertura, formación, descripción oficial, resultado.
  - Jugadores en la jugada agrupados por equipo (ataque / defensa): "#camiseta nombre · posición · rol". Clic = enfocar en el campo.
  - Jugador seleccionado: nombre, número, posición, rol, equipo y, en el cuadro actual, su separación (receptor) o la distancia del rusher (QB).

## Estilo
- Contenedor `w-full max-w-[1600px] mx-auto px-4 lg:px-8`. Fondo `bg-slate-950`, superficies `bg-slate-900` con borde `border-slate-800`, texto `text-slate-100`, acento `emerald-400`; positivo verde, negativo rojo/rose, objetivo ámbar.
- Tarjetas `rounded-2xl`, números `tabular-nums` grandes. Textos cortos, en español, para público no técnico.
- Tailwind 3 únicamente. Sin imágenes externas, sin URLs absolutas, sin fuentes de CDN, sin librerías nuevas.
