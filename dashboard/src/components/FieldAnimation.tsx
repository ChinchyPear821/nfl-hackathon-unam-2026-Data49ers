import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Frame } from '../api'

interface Props {
  frames: Frame[]
  externalHighlight?: string | null
  onHighlightChange?: (id: string | null) => void
  losX?: number | null        // línea de scrimmage (yardas, ataque hacia la derecha)
  primerDownX?: number | null // línea de primer down
}

const FIELD_W = 120
const FIELD_H = 53.3
const MX = 4      // margen lateral (yd) para los postes
const MY = 2.5    // margen arriba y abajo (yd)
const CANVAS_W = 1280
const SX = CANVAS_W / (FIELD_W + 2 * MX)
const CANVAS_H = Math.round((FIELD_H + 2 * MY) * SX)

const COLOR = { ataque: '#3b82f6', defensa: '#ef4444', objetivo: '#facc15', balon: '#8b5a2b' }

const ROL_LABEL: Record<string, string> = {
  'Targeted Receiver': 'Receptor objetivo',
  'Passer': 'Quarterback',
  'Other Route Runner': 'Otro receptor',
  'Defensive Coverage': 'Cobertura defensiva',
}

function toCanvas(x: number, y: number): [number, number] {
  return [(x + MX) * SX, CANVAS_H - (y + MY) * SX]
}

const isBall = (f: Frame) => f.es_balon === 'true'

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
  ctx.font = `bold ${Math.round(SX * 2)}px sans-serif`
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
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 4
  for (const gx of [0, FIELD_W]) {
    const dir = gx === 0 ? -1 : 1
    const mid = FIELD_H / 2
    ctx.beginPath(); ctx.moveTo(X(gx), Y(mid)); ctx.lineTo(X(gx + dir * 2), Y(mid)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(X(gx + dir * 2), Y(mid - 3.1)); ctx.lineTo(X(gx + dir * 2), Y(mid + 3.1)); ctx.stroke()
  }
}

// abreviatura de posición para dentro del círculo
function etiqueta(f: Frame) {
  if (f.posicion) return f.posicion.slice(0, 3)
  return f.rol === 'Passer' ? 'QB' : ''
}

export default function FieldAnimation({ frames, externalHighlight, onHighlightChange, losX, primerDownX }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [zoom, setZoom] = useState(true)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; f: Frame } | null>(null)

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

  // Vista acercada: caja (en px del canvas) que contiene toda la jugada, con margen
  const vista = useMemo(() => {
    if (!zoom || frames.length === 0) return { s: 1, x0: 0, y0: 0 }
    const xs = frames.map(f => f.x), ys = frames.map(f => f.y)
    if (losX != null) xs.push(losX)
    if (primerDownX != null && primerDownX < 110) xs.push(primerDownX)
    const [ax, ay] = toCanvas(Math.min(...xs) - 6, Math.max(...ys) + 5)
    const [bx, by] = toCanvas(Math.max(...xs) + 6, Math.min(...ys) - 5)
    const s = Math.min(3, Math.max(1, Math.min(CANVAS_W / (bx - ax), CANVAS_H / (by - ay))))
    const cx = (ax + bx) / 2, cy = (ay + by) / 2
    const x0 = Math.min(Math.max(cx - CANVAS_W / s / 2, 0), CANVAS_W - CANVAS_W / s)
    const y0 = Math.min(Math.max(cy - CANVAS_H / s / 2, 0), CANVAS_H - CANVAS_H / s)
    return { s, x0, y0 }
  }, [zoom, frames, losX, primerDownX])

  const current = useMemo(() => byFrame.get(frameNums[idx]) ?? [], [byFrame, frameNums, idx])

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const frameNum = frameNums[idx]
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#0f3d1e'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.setTransform(vista.s, 0, 0, vista.s, -vista.x0 * vista.s, -vista.y0 * vista.s)
    drawField(ctx)

    // línea de scrimmage (azul) y de primer down (amarilla)
    const linea = (x: number, color: string) => {
      const [cx] = toCanvas(x, 0)
      const [, top] = toCanvas(0, FIELD_H)
      const [, bot] = toCanvas(0, 0)
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot); ctx.stroke()
    }
    if (losX != null) linea(losX, 'rgba(59,130,246,0.9)')
    if (primerDownX != null && primerDownX < 110) linea(primerDownX, 'rgba(250,204,21,0.9)')

    // punto de caída
    if (landing) {
      const [cx, cy] = toCanvas(landing.x, landing.y)
      ctx.strokeStyle = COLOR.objetivo
      ctx.lineWidth = 3
      const s = 9
      ctx.beginPath(); ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); ctx.stroke()
    }

    // estelas: balón y jugador seleccionado
    const trail = (id: string, color: string, width: number) => {
      const p = (paths.get(id) ?? []).filter(f => f.frame <= frameNum)
      if (p.length < 2) return
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      p.forEach((f, i) => {
        const [x, y] = toCanvas(f.x, f.y)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
    trail('balon', 'rgba(253,230,138,0.8)', 2)
    if (selectedId) trail(selectedId, 'rgba(255,255,255,0.7)', 2)

    // jugadores: posición dentro del círculo; nombre solo para los que importan
    current.filter(f => !isBall(f)).forEach(f => {
      const [cx, cy] = toCanvas(f.x, f.y)
      const objetivo = f.rol === 'Targeted Receiver'
      const activo = f.entidad_id === selectedId || f.entidad_id === hoverId
      const r = objetivo ? 15 : 13
      if (activo) {
        ctx.beginPath()
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = objetivo ? COLOR.objetivo : f.equipo === 'ataque' ? COLOR.ataque : COLOR.defensa
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = objetivo ? '#0f172a' : '#ffffff'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(etiqueta(f), cx, cy + 0.5)
      ctx.textBaseline = 'alphabetic'

      if (objetivo || f.rol === 'Passer' || activo) {
        const nombre = f.nombre.split(' ').pop() ?? f.nombre
        ctx.font = 'bold 13px sans-serif'
        const w = ctx.measureText(nombre).width + 10
        ctx.fillStyle = 'rgba(15,23,42,0.85)'
        ctx.fillRect(cx - w / 2, cy - r - 22, w, 17)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(nombre, cx, cy - r - 9)
      }
    })

    // balón
    current.filter(isBall).forEach(f => {
      const [cx, cy] = toCanvas(f.x, f.y)
      ctx.beginPath()
      ctx.ellipse(cx, cy, 8, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = COLOR.balon
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const fase = current[0]?.fase === 'aire' ? 'balón en el aire' : 'antes del lanzamiento'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = '15px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`${(idx / 10).toFixed(1)} s · ${fase}`, 14, 22)
  }, [frameNums, idx, landing, paths, selectedId, hoverId, current, losX, primerDownX, vista])

  useEffect(() => { draw() }, [draw])

  // nueva jugada: reiniciar
  useEffect(() => {
    setIdx(0)
    setPlaying(false)
    setSelectedId(null)
    setHoverId(null)
    setTooltip(null)
  }, [frames])

  // animación
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

  useEffect(() => {
    if (playing && idx >= frameNums.length - 1) setPlaying(false)
  }, [idx, playing, frameNums.length])

  function entityAt(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) * CANVAS_W) / rect.width / vista.s + vista.x0
    const cy = ((e.clientY - rect.top) * CANVAS_H) / rect.height / vista.s + vista.y0
    let best: Frame | null = null
    let bestD = 22
    current.forEach(f => {
      if (isBall(f)) return
      const [x, y] = toCanvas(f.x, f.y)
      const d = Math.hypot(x - cx, y - cy)
      if (d < bestD) { bestD = d; best = f }
    })
    return { f: best as Frame | null, x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { f, x, y } = entityAt(e)
    setHoverId(f ? f.entidad_id : null)
    setTooltip(f ? { x, y, f } : null)
  }

  // sincronizar highlight externo (desde PlayRoster)
  useEffect(() => {
    if (externalHighlight !== undefined) setSelectedId(externalHighlight ?? null)
  }, [externalHighlight])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const { f } = entityAt(e)
    const next = f && f.entidad_id !== selectedId ? f.entidad_id : null
    setSelectedId(next)
    onHighlightChange?.(next)
  }

  function togglePlay() {
    if (idx >= frameNums.length - 1) setIdx(0)
    setPlaying(p => !p)
  }

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-800 rounded-xl aspect-[120/53] text-gray-500">
        Selecciona una jugada de la lista para animarla
      </div>
    )
  }

  const sel = selectedId ? current.find(f => f.entidad_id === selectedId) : null
  const distCaida = sel && landing ? Math.hypot(sel.x - landing.x, sel.y - landing.y) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-xl"
          style={{ cursor: hoverId ? 'pointer' : 'default' }}
          onMouseMove={handleMove}
          onMouseLeave={() => { setHoverId(null); setTooltip(null) }}
          onClick={handleClick}
        />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-900/95 border border-gray-600 rounded px-3 py-2 text-xs text-gray-100 shadow-lg"
            style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
          >
            <p className="font-semibold text-sm">{tooltip.f.nombre}</p>
            <p className="text-gray-300">
              {tooltip.f.posicion} · {ROL_LABEL[tooltip.f.rol] ?? tooltip.f.rol}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={togglePlay}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-medium"
        >
          {playing ? 'Pausa' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={frameNums.length - 1}
          value={idx}
          onChange={e => { setPlaying(false); setIdx(Number(e.target.value)) }}
          className="flex-1 accent-blue-500"
        />
        <span className="text-gray-400 text-xs w-20 text-right">{idx + 1} / {frameNums.length}</span>
        <button
          onClick={() => setZoom(z => !z)}
          className={`px-3 py-1 rounded-full text-xs border ${zoom ? 'border-emerald-500 text-emerald-300' : 'border-slate-600 text-slate-300'}`}
        >
          {zoom ? 'Ver campo completo' : 'Acercar a la jugada'}
        </button>
        <div className="flex gap-1">
          {[0.5, 1, 2].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-xs ${speed === s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
        <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: COLOR.ataque }} />Ataque</span>
        <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: COLOR.defensa }} />Defensa</span>
        <span><span className="inline-block w-3 h-3 rounded-full align-middle mr-1" style={{ background: COLOR.objetivo }} />Receptor objetivo</span>
        <span><span className="inline-block w-3 h-2 rounded-full align-middle mr-1" style={{ background: COLOR.balon }} />Balón</span>
        <span><span className="text-yellow-400 font-bold mr-1">✕</span>Punto de caída</span>
        <span><span className="inline-block w-4 h-1 align-middle mr-1 bg-blue-500" />Línea de scrimmage</span>
        <span><span className="inline-block w-4 h-1 align-middle mr-1 bg-yellow-400" />Primer down</span>
        <span className="text-gray-500">Pasa el mouse sobre un jugador para ver quién es; haz clic para seguirlo.</span>
      </div>

      {sel && (
        <div className="bg-gray-800 rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-gray-100">{sel.nombre}</span>
          <span className="text-gray-300">{sel.posicion} · {ROL_LABEL[sel.rol] ?? sel.rol}</span>
          <span className="text-gray-300">{sel.equipo === 'ataque' ? 'Ataque' : 'Defensa'}</span>
          {distCaida !== null && (
            <span className="text-yellow-300">A {distCaida.toFixed(1)} yd del punto de caída</span>
          )}
          <button onClick={() => setSelectedId(null)} className="ml-auto text-gray-400 hover:text-gray-200 text-xs">
            Dejar de seguir
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500">
        El balón no tiene tracking: en el aire se dibuja como una línea recta del QB al punto de caída (aproximación).
      </p>
    </div>
  )
}
