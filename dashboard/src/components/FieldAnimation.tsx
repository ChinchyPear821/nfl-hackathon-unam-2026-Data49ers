import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Equipo, Frame, Play } from '../api'
import { RESULTADO } from '../api'
import { PALETA, ROL_LABEL, colorBolsillo, colorSep } from './paleta'
import Marcador from './Marcador'
import MedidorRiesgo from './MedidorRiesgo'
import { riesgoPorCuadro } from './riesgo'
import type { RiesgoCuadro } from '../api'

interface Props {
  frames: Frame[]
  play: Play
  selectedId: string | null
  onSelect: (id: string | null) => void
  onFrame?: (frame: number) => void       // cuadro actual, para el panel derecho
  opcionHover?: string | null             // receptor resaltado desde el panel: línea desde el QB
  onLanzamiento?: () => void              // se llama en la pausa automática del lanzamiento
  modo3d: boolean
  onModo3d: (v: boolean) => void
  pie?: React.ReactNode                   // contenido debajo de los controles (también en pantalla completa)
  equipos?: Map<string, Equipo>           // colores del marcador (equipos.csv)
  riesgo?: RiesgoCuadro[]                 // riesgo de presión por cuadro (riesgo.csv)
}
const SIN_EQUIPOS = new Map<string, Equipo>()
const SIN_RIESGO: RiesgoCuadro[] = []

const FIELD_W = 120
const FIELD_H = 53.3
const MX = 4      // margen lateral (yd) para los postes
const MY = 2.5    // margen arriba y abajo (yd)
const CANVAS_W = 1280
const SX = CANVAS_W / (FIELD_W + 2 * MX)
const CANVAS_H = Math.round((FIELD_H + 2 * MY) * SX)
const RATIO = CANVAS_W / CANVAS_H
const MIN_ZOOM = 1
const MAX_ZOOM = 6

// cámara 3D (grados)
const ALFA_INICIAL = 55
const BETA_INICIAL = 0
const ALFA_MAX = 65

const COLOR = {
  ataque: PALETA.acento,
  defensa: PALETA.fallo,
  objetivo: PALETA.primerdown,
  balon: '#8b5a2b',
}
const FUENTE = '"Arial Narrow", "Roboto Condensed", Arial, sans-serif'

function toCanvas(x: number, y: number): [number, number] {
  return [(x + MX) * SX, CANVAS_H - (y + MY) * SX]
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)
const girar = (b: number) => ((((b + 180) % 360) + 360) % 360) - 180   // -180..180

interface Cam { s: number; x0: number; y0: number }
function limitar(c: Cam): Cam {
  const s = clamp(c.s, MIN_ZOOM, MAX_ZOOM)
  return {
    s,
    x0: clamp(c.x0, 0, CANVAS_W - CANVAS_W / s),
    y0: clamp(c.y0, 0, CANVAS_H - CANVAS_H / s),
  }
}
function centrar(cx: number, cy: number, s: number): Cam {
  return limitar({ s, x0: cx - CANVAS_W / s / 2, y0: cy - CANVAS_H / s / 2 })
}
const CAMPO_COMPLETO: Cam = { s: 1, x0: 0, y0: 0 }

// ── Encaje del campo en 3D ──────────────────────────────────────────────────
// Proyecta las 4 esquinas de un rectángulo w×h (centrado) con
// perspective(P) rotateX(α) rotateZ(β), igual que el CSS, y devuelve su caja en pantalla.
const PERSPECTIVA = 1200
function cajaProyectada(w: number, h: number, alfa: number, beta: number) {
  const a = (alfa * Math.PI) / 180, b = (beta * Math.PI) / 180
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const [x, y] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
    const xr = x * cb - y * sb, yr = x * sb + y * cb        // rotateZ(β)
    const yp = yr * ca, z = yr * sa                         // rotateX(α): z > 0 se acerca al espectador
    if (z >= PERSPECTIVA - 1) return null                   // detrás de la cámara: no cabe
    const k = PERSPECTIVA / (PERSPECTIVA - z)
    x0 = Math.min(x0, xr * k); x1 = Math.max(x1, xr * k)
    y0 = Math.min(y0, yp * k); y1 = Math.max(y1, yp * k)
  }
  return { ancho: x1 - x0, alto: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}
// Ancho máximo del campo para que, girado, quepa completo en el escenario (con un margen),
// y el desplazamiento que centra su caja proyectada.
function ajuste3d(sw: number, sh: number, alfa: number, beta: number) {
  const MARGEN = 0.96
  const cabe = (w: number) => {
    const c = cajaProyectada(w, w / RATIO, alfa, beta)
    return c != null && c.ancho <= sw * MARGEN && c.alto <= sh * MARGEN
  }
  let lo = 0, hi = Math.max(sw, sh) * 4
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (cabe(mid)) lo = mid
    else hi = mid
  }
  const c = cajaProyectada(lo, lo / RATIO, alfa, beta)
  return { w: lo, dx: c ? -c.cx : 0, dy: c ? -c.cy : 0 }
}

// dibuja algo centrado en (x, y) con un giro propio (para que el texto quede derecho en 3D)
function girado(ctx: CanvasRenderingContext2D, x: number, y: number, theta: number, fn: () => void) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-theta)
  fn()
  ctx.restore()
}

// jugadores clave: QB, receptores, cobertura y el rusher más cercano al QB
function idsClave(frame: Frame[]): Set<string> {
  const s = new Set<string>()
  frame.forEach(f => {
    if (f.rol === 'Pass' || f.rol === 'Pass Route' || f.rol === 'Coverage') s.add(f.entidad_id)
  })
  const qb = frame.find(f => f.rol === 'Pass')
  if (qb) {
    let mejor: Frame | null = null
    let dm = Infinity
    frame.forEach(f => {
      if (f.rol !== 'Pass Rush') return
      const d = Math.hypot(f.x - qb.x, f.y - qb.y)
      if (d < dm) { dm = d; mejor = f }
    })
    if (mejor) s.add((mejor as Frame).entidad_id)
  }
  return s
}

function drawField(ctx: CanvasRenderingContext2D) {
  const X = (x: number) => (x + MX) * SX
  const Y = (y: number) => CANVAS_H - (y + MY) * SX

  // fondo y pasto con franjas cada 5 yardas
  ctx.fillStyle = '#0f3d1e'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  for (let yd = 10; yd < 110; yd += 5) {
    ctx.fillStyle = (yd / 5) % 2 === 0 ? '#1d6b33' : '#1a6230'
    ctx.fillRect(X(yd), Y(FIELD_H), 5 * SX, FIELD_H * SX)
  }
  // zonas de anotación
  ctx.fillStyle = '#14532d'
  ctx.fillRect(X(0), Y(FIELD_H), 10 * SX, FIELD_H * SX)
  ctx.fillRect(X(110), Y(FIELD_H), 10 * SX, FIELD_H * SX)

  // líneas de yarda
  for (let yd = 10; yd <= 110; yd += 5) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = yd === 10 || yd === 110 ? 3 : yd % 10 === 0 ? 2 : 1.2
    ctx.beginPath(); ctx.moveTo(X(yd), Y(0)); ctx.lineTo(X(yd), Y(FIELD_H)); ctx.stroke()
  }

  // marcas de cada yarda: junto a las bandas y en los hashes
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1.2
  for (let yd = 11; yd < 110; yd++) {
    if (yd % 5 === 0) continue
    for (const [y0, y1] of [[0.3, 1.2], [FIELD_H - 1.2, FIELD_H - 0.3], [23.2, 23.9], [29.4, 30.1]]) {
      ctx.beginPath(); ctx.moveTo(X(yd), Y(y0)); ctx.lineTo(X(yd), Y(y1)); ctx.stroke()
    }
  }

  // números con flecha hacia la zona de anotación más cercana
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `bold ${Math.round(SX * 2)}px ${FUENTE}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let yd = 20; yd <= 100; yd += 10) {
    const label = yd <= 60 ? yd - 10 : 110 - yd
    for (const yy of [12, FIELD_H - 12]) {
      ctx.fillText(String(label), X(yd), Y(yy))
      if (yd !== 60) {
        const dir = yd < 60 ? -1 : 1
        const ax = X(yd) + dir * SX * 2.6
        ctx.beginPath()
        ctx.moveTo(ax + dir * SX * 0.7, Y(yy))
        ctx.lineTo(ax, Y(yy) - SX * 0.5)
        ctx.lineTo(ax, Y(yy) + SX * 0.5)
        ctx.closePath(); ctx.fill()
      }
    }
  }
  ctx.textBaseline = 'alphabetic'

  // bandas laterales
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.strokeRect(X(0), Y(FIELD_H), FIELD_W * SX, FIELD_H * SX)

  // postes (vista aérea)
  ctx.strokeStyle = PALETA.primerdown
  ctx.lineWidth = 4
  for (const gx of [0, FIELD_W]) {
    const dir = gx === 0 ? -1 : 1
    const mid = FIELD_H / 2
    ctx.beginPath(); ctx.moveTo(X(gx), Y(mid)); ctx.lineTo(X(gx + dir * 2), Y(mid)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(X(gx + dir * 2), Y(mid - 3.1)); ctx.lineTo(X(gx + dir * 2), Y(mid + 3.1)); ctx.stroke()
  }
}

// Estado "vivo" que lee el bucle de dibujo (evita recrear el bucle en cada render)
interface Live {
  current: Frame[]
  selectedId: string | null
  hoverId: string | null
  opcionHover: string | null
  soloClave: boolean
  modo3d: boolean
  beta: number
  alfa: number
  seguir: boolean
  idx: number
  lanzIdx: number
  frameNum: number
  paths: Map<string, Frame[]>
  landing: Frame | null
  play: Play
}

function etiquetaNombre(ctx: CanvasRenderingContext2D, texto: string, dy: number, k: number) {
  ctx.font = `bold ${Math.round(14 * k)}px ${FUENTE}`
  const w = ctx.measureText(texto).width + 10 * k
  ctx.fillStyle = 'rgba(15,23,30,0.9)'
  ctx.fillRect(-w / 2, dy - 15 * k, w, 18 * k)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(texto, 0, dy - 1.5 * k)
}

// Figura de pie para la vista 3D. Se dibuja en el plano del campo apuntando hacia "arriba de la pantalla"
// y se estira 1/cos(alfa) para compensar la inclinación de la cámara: así se ve vertical desde cualquier giro.
function figura3d(ctx: CanvasRenderingContext2D, cx: number, cy: number, theta: number, alfaRad: number,
                  color: string, numero: string, r: number, borde: string) {
  const estira = 1 / Math.max(Math.cos(alfaRad), 0.35)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-theta)
  ctx.scale(1, estira)
  const w = r * 1.5, h = r * 2.6, cab = r * 0.62
  // piernas
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(-w * 0.32, -h * 0.32, w * 0.24, h * 0.32)
  ctx.fillRect(w * 0.08, -h * 0.32, w * 0.24, h * 0.32)
  // torso con número
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h, w, h * 0.7, r * 0.35)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = borde
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(r * 1.05)}px ${FUENTE}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(numero, 0, -h * 0.66)
  // casco
  ctx.beginPath()
  ctx.arc(0, -h - cab * 0.85, cab, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = borde
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(-cab * 0.75, -h - cab * 0.95, cab * 1.5, cab * 0.28)   // careta
  ctx.restore()
  ctx.textBaseline = 'alphabetic'
}

function dibujar(ctx: CanvasRenderingContext2D, L: Live, cam: Cam) {
  const { play } = L
  const theta = L.modo3d ? (L.beta * Math.PI) / 180 : 0
  const k = 1 / Math.pow(cam.s, 0.35)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#0f3d1e'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.setTransform(cam.s, 0, 0, cam.s, -cam.x0 * cam.s, -cam.y0 * cam.s)
  drawField(ctx)

  // línea de scrimmage (acento) y de primer down (amarilla)
  const linea = (x: number, color: string) => {
    const [cx] = toCanvas(x, 0)
    const [, top] = toCanvas(0, FIELD_H)
    const [, bot] = toCanvas(0, 0)
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke()
  }
  if (play.los_x != null) linea(play.los_x, PALETA.acento)
  if (play.primer_down_x != null && play.primer_down_x < 110) linea(play.primer_down_x, PALETA.primerdown)

  // punto de caída del balón
  if (L.landing) {
    const [cx, cy] = toCanvas(L.landing.x, L.landing.y)
    const s = 9 * k
    ctx.strokeStyle = COLOR.objetivo
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke()
  }

  // trayectorias: balón y jugador seleccionado
  const trayecto = (id: string, color: string, ancho: number, hastaActual: boolean) => {
    const p = (L.paths.get(id) ?? []).filter(f => !hastaActual || f.frame <= L.frameNum)
    if (p.length < 2) return
    ctx.strokeStyle = color
    ctx.lineWidth = ancho
    ctx.beginPath()
    p.forEach((f, i) => {
      const [x, y] = toCanvas(f.x, f.y)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
  trayecto('balon', 'rgba(255,212,0,0.75)', 2, true)
  if (L.selectedId) {
    trayecto(L.selectedId, 'rgba(255,255,255,0.25)', 2, false)
    trayecto(L.selectedId, 'rgba(255,255,255,0.95)', 3, true)
  }

  // bolsillo del QB: círculo punteado de radio = dist_rusher
  const qb = L.current.find(f => f.rol === 'Pass')
  if (qb && qb.dist_rusher != null) {
    const [cx, cy] = toCanvas(qb.x, qb.y)
    const col = colorBolsillo(qb.dist_rusher)
    ctx.beginPath()
    ctx.arc(cx, cy, qb.dist_rusher * SX, 0, Math.PI * 2)
    ctx.fillStyle = col + '22'
    ctx.fill()
    ctx.setLineDash([9, 7])
    ctx.strokeStyle = col
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.setLineDash([])
  }

  // línea del QB al receptor resaltado en el panel
  const op = L.opcionHover ? L.current.find(f => f.entidad_id === L.opcionHover) : null
  if (qb && op) {
    const [qx, qy] = toCanvas(qb.x, qb.y)
    const [ox, oy] = toCanvas(op.x, op.y)
    ctx.setLineDash([12, 7])
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4 * k
    ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(ox, oy); ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(ox, oy, 24 * k, 0, Math.PI * 2)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  const lanzado = L.idx >= L.lanzIdx
  const clave = L.soloClave ? idsClave(L.current) : null
  const jugadores = L.current.filter(f => !f.es_balon)
  const esTenue = (f: Frame) => clave != null && !clave.has(f.entidad_id) && f.entidad_id !== L.selectedId

  // sombras (solo 3D), primero todas para que queden debajo de los círculos
  if (L.modo3d) {
    jugadores.forEach(f => {
      const [cx, cy] = toCanvas(f.x, f.y)
      const r = 13 * k
      ctx.globalAlpha = esTenue(f) ? 0.1 : 1
      ctx.beginPath()
      ctx.ellipse(cx + 5 * k, cy + 7 * k, r * 1.15, r * 0.75, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fill()
    })
    ctx.globalAlpha = 1
  }

  // orden de dibujo en 3D: primero los más lejanos (más "arriba" en pantalla)
  if (L.modo3d) {
    const ux = -Math.sin(theta), uy = -Math.cos(theta)
    jugadores.sort((a, b) => {
      const [ax, ay] = toCanvas(a.x, a.y)
      const [bx, by] = toCanvas(b.x, b.y)
      return (bx * ux + by * uy) - (ax * ux + ay * uy)
    })
  }

  jugadores.forEach(f => {
    const [cx, cy] = toCanvas(f.x, f.y)
    const objetivo = f.entidad_id === play.receptor_id
    const mejor = play.habia_mejor_opcion && lanzado && f.entidad_id === play.mejor_id
    const activo = f.entidad_id === L.selectedId || f.entidad_id === L.hoverId || f.entidad_id === L.opcionHover
    const tenue = esTenue(f)
    const r = 13 * k
    ctx.globalAlpha = tenue ? 0.15 : 1

    if (f.sep != null) { // halo de semáforo del receptor
      const col = colorSep(f.sep)
      ctx.beginPath()
      ctx.arc(cx, cy, r + 7 * k, 0, Math.PI * 2)
      ctx.fillStyle = col + '55'
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 3
      ctx.stroke()
    }
    if (objetivo || mejor) {
      ctx.beginPath()
      ctx.arc(cx, cy, r + 12 * k, 0, Math.PI * 2)
      ctx.strokeStyle = objetivo ? COLOR.objetivo : '#ffffff'
      ctx.lineWidth = 2.5
      ctx.setLineDash(objetivo ? [] : [4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (activo) {
      ctx.beginPath()
      ctx.arc(cx, cy, r + 5 * k, 0, Math.PI * 2)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    const colorEquipo = f.equipo === 'ataque' ? COLOR.ataque : COLOR.defensa
    const numero = f.camiseta != null ? String(f.camiseta) : ''
    const alfaRad = (L.alfa * Math.PI) / 180
    const altoFigura = r * 2.6 + r * 1.2
    if (L.modo3d) {
      figura3d(ctx, cx, cy, theta, alfaRad, colorEquipo, numero, r, objetivo ? COLOR.objetivo : activo ? '#ffffff' : 'rgba(255,255,255,0.7)')
      if (!tenue && (objetivo || mejor || f.rol === 'Pass' || activo)) {
        const nombre = f.nombre.split(' ').pop() ?? f.nombre
        const estira = 1 / Math.max(Math.cos(alfaRad), 0.35)
        girado(ctx, cx, cy, theta, () => { ctx.scale(1, estira); etiquetaNombre(ctx, nombre, -altoFigura - 6 * k, k) })
      }
      return
    }
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = colorEquipo
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()

    girado(ctx, cx, cy, theta, () => {
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.round(14 * k)}px ${FUENTE}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(f.camiseta != null ? String(f.camiseta) : '', 0, 0.5)
      ctx.textBaseline = 'alphabetic'
    })

    if (!tenue && (objetivo || mejor || f.rol === 'Pass' || activo)) {
      const nombre = f.nombre.split(' ').pop() ?? f.nombre
      girado(ctx, cx, cy, theta, () => etiquetaNombre(ctx, nombre, -r - (objetivo || mejor ? 15 : 8) * k, k))
    }
  })
  ctx.globalAlpha = 1

  // balón
  L.current.filter(f => f.es_balon).forEach(f => {
    const [cx, cy] = toCanvas(f.x, f.y)
    if (L.modo3d) {
      ctx.beginPath()
      ctx.ellipse(cx + 4 * k, cy + 6 * k, 8 * k, 4 * k, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fill()
    }
    ctx.beginPath()
    ctx.ellipse(cx, cy, 8 * k, 5 * k, 0, 0, Math.PI * 2)
    ctx.fillStyle = COLOR.balon
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  })
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}

const btn = 'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border border-borde bg-superficie text-white hover:border-acento'
const btnOn = 'px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border border-acento bg-acento text-fondo'

export default function FieldAnimation({
  frames, play, selectedId, onSelect, onFrame, opcionHover = null, onLanzamiento, modo3d, onModo3d, pie,
  equipos = SIN_EQUIPOS, riesgo = SIN_RIESGO,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fsRef = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [seguir, setSeguir] = useState(true)
  const [soloClave, setSoloClave] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; f: Frame } | null>(null)
  const [alfa, setAlfa] = useState(ALFA_INICIAL)
  const [beta, setBeta] = useState(BETA_INICIAL)
  const [pantallaCompleta, setPantallaCompleta] = useState(false)
  const [verMarcador, setVerMarcador] = useState(true)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  const camRef = useRef<Cam>(CAMPO_COMPLETO)
  const targetRef = useRef<Cam>(CAMPO_COMPLETO)
  const pausadoRef = useRef(false)
  const dragRef = useRef<{ x: number; y: number; cam: Cam; alfa: number; beta: number; moved: boolean } | null>(null)

  const frameNums = useMemo(
    () => [...new Set(frames.map(f => f.frame))].sort((a, b) => a - b),
    [frames],
  )
  const byFrame = useMemo(() => {
    const m = new Map<number, Frame[]>()
    frames.forEach(f => {
      if (!m.has(f.frame)) m.set(f.frame, [])
      m.get(f.frame)!.push(f)
    })
    return m
  }, [frames])
  const paths = useMemo(() => {
    const m = new Map<string, Frame[]>()
    frames.forEach(f => {
      if (!m.has(f.entidad_id)) m.set(f.entidad_id, [])
      m.get(f.entidad_id)!.push(f)
    })
    m.forEach(p => p.sort((a, b) => a.frame - b.frame))
    return m
  }, [frames])
  const landing = useMemo(() => {
    const b = paths.get('balon')
    return b && b.length ? b[b.length - 1] : null
  }, [paths])

  // instante del lanzamiento: último cuadro con fase distinta de "aire"
  const lanzIdx = useMemo(() => {
    let r = 0
    frameNums.forEach((n, i) => {
      const fase = byFrame.get(n)?.[0]?.fase
      if (fase && fase !== 'aire') r = i
    })
    return r
  }, [frameNums, byFrame])

  // "Encuadrar jugada": caja que contiene la acción, con margen
  const encuadre = useMemo<Cam>(() => {
    if (frames.length === 0) return CAMPO_COMPLETO
    const xs = frames.map(f => f.x), ys = frames.map(f => f.y)
    if (play.los_x != null) xs.push(play.los_x)
    if (play.primer_down_x != null && play.primer_down_x < 110) xs.push(play.primer_down_x)
    const [ax, ay] = toCanvas(Math.min(...xs) - 6, Math.max(...ys) + 5)
    const [bx, by] = toCanvas(Math.max(...xs) + 6, Math.min(...ys) - 5)
    const s = clamp(Math.min(CANVAS_W / (bx - ax), CANVAS_H / (by - ay)), 1, 3)
    return centrar((ax + bx) / 2, (ay + by) / 2, s)
  }, [frames, play])

  const frameNum = frameNums[idx]
  const current = useMemo(() => byFrame.get(frameNum) ?? [], [byFrame, frameNum])
  // riesgo del cuadro actual: "—" antes del snap, último valor después del lanzamiento.
  // La animación avanza cuadro por cuadro (sin interpolar), así que el medidor toma el valor del cuadro.
  const riesgoCuadro = useMemo(() => riesgoPorCuadro(frames, riesgo), [frames, riesgo])
  const riesgoAhora = riesgo.length ? riesgoCuadro.get(frameNum) ?? null : null

  const estado: Live = {
    current, selectedId, hoverId, opcionHover, soloClave, modo3d, beta, alfa, seguir, idx, lanzIdx, frameNum, paths, landing, play,
  }
  const live = useRef<Live>(estado)
  live.current = estado

  // bucle de dibujo + cámara suave
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const ctx = canvasRef.current?.getContext('2d')
      const L = live.current
      if (L.seguir && L.selectedId) {
        const f = L.current.find(r => r.entidad_id === L.selectedId)
        if (f) {
          const [cx, cy] = toCanvas(f.x, f.y)
          targetRef.current = centrar(cx, cy, Math.max(targetRef.current.s, 2.2))
        }
      }
      const c = camRef.current, t = targetRef.current
      const g = 0.2
      camRef.current = limitar({
        s: c.s + (t.s - c.s) * g,
        x0: c.x0 + (t.x0 - c.x0) * g,
        y0: c.y0 + (t.y0 - c.y0) * g,
      })
      if (ctx) dibujar(ctx, L, camRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // nueva jugada: reiniciar
  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setSeguir(true)
    setHoverId(null)
    setTooltip(null)
    pausadoRef.current = false
    camRef.current = encuadre
    targetRef.current = encuadre
  }, [frames, encuadre])

  useEffect(() => { if (selectedId) setSeguir(true) }, [selectedId])
  useEffect(() => { if (frameNum !== undefined) onFrame?.(frameNum) }, [frameNum, onFrame])
  // al entrar a 3D: sin hover y con "Encuadrar jugada" automático
  useEffect(() => {
    if (!modo3d) return
    setHoverId(null)
    setTooltip(null)
    setSeguir(false)
    targetRef.current = encuadre
    // solo al cambiar de modo; el encuadre de una jugada nueva ya lo aplica el reinicio
  }, [modo3d])

  // reproducción
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const step = (ts: number) => {
      if (ts - last >= 100 / speed) {
        last = ts
        setIdx(prev => Math.min(prev + 1, frameNums.length - 1))
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, frameNums.length])

  // pausa automática en el lanzamiento (una vez por reproducción)
  useEffect(() => {
    if (idx < lanzIdx) pausadoRef.current = false
    else if (playing && idx === lanzIdx && !pausadoRef.current) {
      pausadoRef.current = true
      setPlaying(false)
      onLanzamiento?.()
    }
  }, [idx, playing, lanzIdx, onLanzamiento])

  useEffect(() => {
    if (playing && idx >= frameNums.length - 1) setPlaying(false)
  }, [idx, playing, frameNums.length])

  // tamaño del escenario, para encajar el campo sin deformarlo
  const hayFrames = frames.length > 0
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [hayFrames])

  // pantalla completa (Esc la cierra; el navegador lo hace por sí solo)
  useEffect(() => {
    const onCambio = () => setPantallaCompleta(document.fullscreenElement === fsRef.current)
    document.addEventListener('fullscreenchange', onCambio)
    return () => document.removeEventListener('fullscreenchange', onCambio)
  }, [])
  const alternarPantalla = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else fsRef.current?.requestFullscreen().catch(() => {})
  }

  // zoom anclado a un punto del canvas (px, py en píxeles del canvas)
  const zoomEn = useCallback((px: number, py: number, factor: number) => {
    const c = targetRef.current
    const s2 = clamp(c.s * factor, MIN_ZOOM, MAX_ZOOM)
    const wx = c.x0 + px / c.s, wy = c.y0 + py / c.s
    targetRef.current = limitar({ s: s2, x0: wx - px / s2, y0: wy - py / s2 })
  }, [])

  // rueda del mouse (listener no pasivo para poder evitar el scroll de la página)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const cv = canvasRef.current
      if (live.current.modo3d || !cv) { zoomEn(CANVAS_W / 2, CANVAS_H / 2, factor); return }
      const rect = cv.getBoundingClientRect()
      zoomEn(
        clamp(((e.clientX - rect.left) * CANVAS_W) / rect.width, 0, CANVAS_W),
        clamp(((e.clientY - rect.top) * CANVAS_H) / rect.height, 0, CANVAS_H),
        factor,
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomEn, hayFrames])

  // jugador bajo el mouse (solo vista aérea: en 3D el canvas está transformado)
  function entidadEn(e: React.MouseEvent) {
    const cv = canvasRef.current
    const st = stageRef.current
    if (!cv || !st) return { f: null as Frame | null, x: 0, y: 0 }
    const rect = cv.getBoundingClientRect()
    const sr = st.getBoundingClientRect()
    const cam = camRef.current
    const cx = ((e.clientX - rect.left) * CANVAS_W) / rect.width / cam.s + cam.x0
    const cy = ((e.clientY - rect.top) * CANVAS_H) / rect.height / cam.s + cam.y0
    const clave = soloClave ? idsClave(current) : null
    let best: Frame | null = null
    let bestD = 24 / cam.s + 8
    current.forEach(f => {
      if (f.es_balon) return
      if (clave && !clave.has(f.entidad_id) && f.entidad_id !== selectedId) return
      const [x, y] = toCanvas(f.x, f.y)
      const d = Math.hypot(x - cx, y - cy)
      if (d < bestD) { bestD = d; best = f }
    })
    return { f: best as Frame | null, x: e.clientX - sr.left, y: e.clientY - sr.top }
  }

  function onDown(e: React.MouseEvent) {
    dragRef.current = { x: e.clientX, y: e.clientY, cam: camRef.current, alfa, beta, moved: false }
  }
  function onMove(e: React.MouseEvent) {
    const d = dragRef.current
    if (d) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) < 4) return
      d.moved = true
      setTooltip(null)
      if (modo3d) {           // arrastrar en 3D: giro (β) e inclinación (α)
        setBeta(girar(d.beta + dx * 0.4))
        setAlfa(clamp(d.alfa - dy * 0.3, 0, ALFA_MAX))
        return
      }
      const cv = canvasRef.current
      if (!cv) return
      setSeguir(false)
      const k = CANVAS_W / cv.getBoundingClientRect().width / d.cam.s
      const nueva = limitar({ s: d.cam.s, x0: d.cam.x0 - dx * k, y0: d.cam.y0 - dy * k })
      camRef.current = nueva
      targetRef.current = nueva
      return
    }
    if (modo3d) return
    const { f, x, y } = entidadEn(e)
    setHoverId(f ? f.entidad_id : null)
    setTooltip(f ? { x, y, f } : null)
  }
  function onUp(e: React.MouseEvent) {
    const d = dragRef.current
    dragRef.current = null
    if (!d || d.moved || modo3d) return
    const { f } = entidadEn(e)
    onSelect(f && f.entidad_id !== selectedId ? f.entidad_id : null)
  }

  function togglePlay() {
    if (idx >= frameNums.length - 1) setIdx(0)
    else if (!playing && idx === lanzIdx) pausadoRef.current = true   // continuar desde el lanzamiento sin volver a pausar
    setPlaying(p => !p)
  }
  const encuadrar = () => { setSeguir(false); targetRef.current = encuadre }
  const campoCompleto = () => { setSeguir(false); targetRef.current = CAMPO_COMPLETO }
  const restablecer = () => {
    setAlfa(ALFA_INICIAL)
    setBeta(BETA_INICIAL)
    setSeguir(false)
    targetRef.current = encuadre
  }

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center bg-superficie border border-borde rounded-2xl aspect-[120/57] text-secundario font-bold">
        Cargando jugada...
      </div>
    )
  }

  const ultimo = frameNums.length - 1
  const terminado = idx >= ultimo
  const seg = current[0]?.seg ?? 0
  const res = RESULTADO[play.resultado]
  const prediceCompleto = play.prob_completo >= 0.5
  const acerto = prediceCompleto === (play.resultado === 'C')
  const pct = (v: number) => `${Math.round(v * 100)}%`
  const etiquetaPlay = playing ? 'Pausa' : idx > 0 && !terminado ? 'Continuar' : 'Play'
  const sel = selectedId ? current.find(f => f.entidad_id === selectedId) : null

  // el campo se encaja en el escenario manteniendo su proporción.
  // En 3D, el tamaño sale de la caja que ocupa ya girado e inclinado, y se centra esa caja.
  const ajuste = modo3d ? ajuste3d(stage.w, stage.h, alfa, beta) : null
  const cw = Math.max(0, ajuste ? ajuste.w : Math.min(stage.w, stage.h * RATIO))
  const ch = cw / RATIO
  const transform3d = ajuste
    ? `translate(${ajuste.dx.toFixed(1)}px, ${ajuste.dy.toFixed(1)}px) perspective(${PERSPECTIVA}px) rotateX(${alfa}deg) rotateZ(${beta}deg)`
    : 'none'
  // misma altura en aérea y 3D
  const estiloEscenario: React.CSSProperties = pantallaCompleta
    ? { flex: '1 1 0%', minHeight: 0 }
    : { aspectRatio: `${RATIO}`, maxHeight: 'calc(100vh - 300px)', minHeight: 260 }

  return (
    <div
      ref={fsRef}
      className={`flex flex-col gap-3 ${pantallaCompleta ? 'bg-fondo p-4 h-screen w-screen' : ''}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <button className={modo3d ? btnOn : btn} onClick={() => onModo3d(!modo3d)} aria-pressed={modo3d}>3D</button>
        <button className={btn} onClick={restablecer}>Restablecer cámara</button>
        <button className={verMarcador ? btnOn : btn} onClick={() => setVerMarcador(v => !v)} aria-pressed={verMarcador}>
          Marcador
        </button>
        <div className="flex items-center rounded-full border border-borde bg-superficie overflow-hidden" role="group" aria-label="Zoom">
          <button
            className="px-3 py-1.5 text-sm font-black text-white hover:bg-acento hover:text-fondo"
            onClick={() => zoomEn(CANVAS_W / 2, CANVAS_H / 2, 1 / 1.3)}
            aria-label="Alejar"
          >−</button>
          <span className="px-2 text-[11px] font-black uppercase tracking-widest text-secundario border-x border-borde py-1.5">Zoom</span>
          <button
            className="px-3 py-1.5 text-sm font-black text-white hover:bg-acento hover:text-fondo"
            onClick={() => zoomEn(CANVAS_W / 2, CANVAS_H / 2, 1.3)}
            aria-label="Acercar"
          >+</button>
        </div>
        <button className={btn} onClick={encuadrar}>Encuadrar jugada</button>
        <button className={btn} onClick={campoCompleto}>Campo completo</button>
        {sel && (
          <button className={seguir ? btnOn : btn} onClick={() => setSeguir(s => !s)}>
            {seguir ? 'Siguiendo a' : 'Seguir a'} #{sel.camiseta ?? '?'} {sel.nombre.split(' ').pop()}
          </button>
        )}
        <button
          role="switch"
          aria-checked={soloClave}
          onClick={() => setSoloClave(s => !s)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white ml-auto"
        >
          <span className={`relative inline-block w-9 h-5 rounded-full ${soloClave ? 'bg-acento' : 'bg-borde'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white ${soloClave ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          Solo jugadores clave
        </button>
        <button
          className={`${btn} text-base leading-none px-3`}
          onClick={alternarPantalla}
          aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
          title={pantallaCompleta ? 'Salir (Esc)' : 'Pantalla completa'}
        >⛶</button>
      </div>

      <div
        ref={stageRef}
        className="relative w-full overflow-hidden rounded-2xl border border-borde bg-[#0a1015] flex items-center justify-center select-none"
        style={{ ...estiloEscenario, cursor: modo3d ? 'move' : hoverId ? 'pointer' : 'grab' }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={() => { dragRef.current = null; setHoverId(null); setTooltip(null) }}
      >
        <div
          style={{
            width: cw,
            height: ch,
            flexShrink: 0,
            transform: transform3d,
            transformStyle: 'preserve-3d',
          }}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full h-full block rounded-md" />
        </div>

        {/* reloj */}
        <div className="absolute top-3 left-3 pointer-events-none flex items-stretch rounded-lg overflow-hidden">
          <span className="bg-acento text-fondo font-display font-black italic uppercase text-xs px-2 flex items-center">
            {seg < 0 ? 'Antes del snap' : 'Desde el snap'}
          </span>
          <span className="bg-fondo/90 text-white font-display font-black italic text-2xl tabular-nums px-3 py-0.5">
            {seg.toFixed(1)} s
          </span>
        </div>

        {/* medidor de riesgo de presión: esquina superior derecha, plano en todas las vistas */}
        {riesgo.length > 0 && (
          <div className="absolute top-3 right-3 pointer-events-none z-20">
            <MedidorRiesgo valor={riesgoAhora} />
          </div>
        )}

        {/* marcador estilo transmisión: plano en todas las vistas (fuera del contenedor que gira en 3D) */}
        {verMarcador && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <Marcador play={play} equipos={equipos} />
          </div>
        )}

        {/* resultado: arriba si el marcador ocupa la parte inferior */}
        {terminado && (
          <div className={`absolute ${verMarcador ? 'top-3' : 'bottom-4'} left-1/2 -translate-x-1/2 pointer-events-none z-20`}>
            <div className={`bg-fondo/95 border-l-8 ${play.resultado === 'C' ? 'border-completo' : 'border-fallo'} rounded-lg px-6 py-2 text-center`}>
              <p className={`font-display font-black italic uppercase text-4xl leading-none tracking-tight ${play.resultado === 'C' ? 'text-completo' : 'text-fallo'}`}>
                {res.texto}
              </p>
              <p className={`text-xs font-bold mt-1 ${acerto ? 'text-completo' : 'text-fallo'}`}>
                {acerto ? 'La predicción se cumplió' : 'La predicción no se cumplió'}
                <span className="text-secundario"> · predecía {prediceCompleto ? 'completo' : 'incompleto'} ({pct(play.prob_completo)})</span>
              </p>
            </div>
          </div>
        )}

        {tooltip && !modo3d && (
          <div
            className="absolute pointer-events-none bg-fondo/95 border border-borde rounded-lg px-3 py-2 text-xs text-white"
            style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
          >
            <p className="font-black text-sm">#{tooltip.f.camiseta ?? '?'} {tooltip.f.nombre}</p>
            <p className="text-secundario font-semibold">{tooltip.f.posicion} · {ROL_LABEL[tooltip.f.rol] ?? tooltip.f.rol}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={togglePlay}
          className="bg-acento hover:brightness-110 text-fondo px-6 py-1.5 rounded-full text-sm font-black uppercase tracking-wide"
        >
          {etiquetaPlay}
        </button>
        <input
          type="range"
          min={0}
          max={ultimo}
          value={idx}
          onChange={e => { setPlaying(false); setIdx(Number(e.target.value)) }}
          className="flex-1 min-w-[120px] accent-acento"
          aria-label="Cuadro de la jugada"
        />
        <span className="text-secundario text-xs font-bold tabular-nums w-16 text-right">{idx + 1} / {frameNums.length}</span>
        <div className="flex gap-1">
          {[0.5, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-black border ${speed === s ? 'bg-acento border-acento text-fondo' : 'border-borde text-secundario'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-semibold text-secundario">
        {modo3d
          ? `Arrastra para girar (${Math.round(beta)}°) e inclinar (${Math.round(alfa)}°) · Rueda: zoom · Elige jugadores en el panel`
          : 'Rueda: zoom · Arrastra: mover · Clic en un jugador: seguirlo'}
      </p>

      {pie && (
        <div className={pantallaCompleta ? 'shrink-0 max-h-[32vh] overflow-y-auto' : ''}>{pie}</div>
      )}

      {!pantallaCompleta && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-secundario">
          <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: COLOR.ataque }} />Ataque</span>
          <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: COLOR.defensa }} />Defensa</span>
          <span><span className="inline-block w-3 h-2 rounded-full align-middle mr-1" style={{ background: COLOR.balon }} />Balón</span>
          <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1 border-2" style={{ borderColor: PALETA.completo }} />Receptor a 3+ yd</span>
          <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1 border-2" style={{ borderColor: PALETA.primerdown }} />1 a 3 yd</span>
          <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1 border-2" style={{ borderColor: PALETA.fallo }} />menos de 1 yd</span>
          <span><span className="inline-block w-3.5 h-3.5 rounded-full align-middle mr-1 border-2 border-double" style={{ borderColor: COLOR.objetivo }} />Anillo: receptor al que va el pase</span>
          <span><span className="inline-block w-4 h-1 align-middle mr-1" style={{ background: PALETA.acento }} />Línea de scrimmage</span>
          <span><span className="inline-block w-4 h-1 align-middle mr-1" style={{ background: PALETA.primerdown }} />Primer down</span>
        </div>
      )}
    </div>
  )
}
