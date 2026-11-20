import { useMemo } from 'react'
import type { Frame, Opcion, Play, QBRow } from '../api'
import { RESULTADO } from '../api'
import MiniBolsillo from './MiniBolsillo'
import { PALETA, ROL_LABEL, colorBolsillo, colorProb, colorSep } from './paleta'

export type Pestana = 'receptores' | 'qb' | 'jugadores'

interface Props {
  play: Play
  qbs: QBRow[]
  frames: Frame[]
  frameActual: number | null
  opciones: Opcion[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  pestana: Pestana
  onPestana: (p: Pestana) => void
  opcionHover: string | null
  onOpcionHover: (id: string | null) => void
  modo3d: boolean
}

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'receptores', label: 'Receptores' },
  { id: 'qb', label: 'QB y presión' },
  { id: 'jugadores', label: 'Jugadores' },
]

const titulo = 'font-display font-black italic uppercase tracking-tight'
const pct = (v: number) => `${Math.round(v * 100)}%`

const Dato = ({ k, v }: { k: string; v: string | number | null }) => (
  <div className="flex justify-between gap-3 text-sm">
    <span className="text-secundario font-semibold">{k}</span>
    <span className="text-white font-bold text-right">{v ?? '—'}</span>
  </div>
)

export default function PanelJugada(props: Props) {
  const { play, qbs, frames, frameActual, opciones, selectedId, onSelect, pestana, onPestana, opcionHover, onOpcionHover, modo3d } = props

  // un jugador por entidad (primer cuadro) para listarlos
  const jugadores = useMemo(() => {
    const m = new Map<string, Frame>()
    frames.forEach(f => { if (!f.es_balon && !m.has(f.entidad_id)) m.set(f.entidad_id, f) })
    return [...m.values()].sort((a, b) => (a.camiseta ?? 0) - (b.camiseta ?? 0))
  }, [frames])

  // instante del lanzamiento: último cuadro con fase distinta de "aire"
  const lanz = useMemo(() => {
    let r: Frame | null = null
    frames.forEach(f => { if (f.fase !== 'aire' && (!r || f.frame > r.frame)) r = f })
    return r as Frame | null
  }, [frames])
  const lanzado = lanz != null && frameActual != null && frameActual >= lanz.frame

  const enCuadro = useMemo(
    () => (frameActual == null ? [] : frames.filter(f => f.frame === frameActual)),
    [frames, frameActual],
  )
  const serieQB = useMemo(
    () => frames
      .filter(f => f.rol === 'Pass' && f.dist_rusher != null)
      .sort((a, b) => a.frame - b.frame)
      .map(f => ({ seg: f.seg, d: f.dist_rusher as number })),
    [frames],
  )

  const sel = jugadores.find(j => j.entidad_id === selectedId) ?? null
  const selAhora = enCuadro.find(f => f.entidad_id === selectedId) ?? null
  const qbAhora = enCuadro.find(f => f.rol === 'Pass') ?? null
  const segAhora = enCuadro[0]?.seg ?? 0
  const res = RESULTADO[play.resultado]
  const qbFila = qbs.find(q => q.qb === play.qb) ?? null
  const elegir = (id: string) => onSelect(id === selectedId ? null : id)

  // ── Receptores ────────────────────────────────────────────────────────────
  const receptoresVivos = enCuadro
    .filter(f => f.rol === 'Pass Route' && f.sep != null)
    .sort((a, b) => (b.sep as number) - (a.sep as number))

  const filaClase = (id: string) =>
    `rounded-xl px-2.5 py-2 cursor-pointer border ${
      id === selectedId ? 'border-acento bg-fondo' : opcionHover === id ? 'border-borde bg-fondo' : 'border-transparent hover:bg-fondo'
    }`

  const receptores = (
    <div className="flex flex-col gap-2">
      {lanzado ? (
        <>
          <div className="rounded-xl bg-fondo border border-primerdown/50 px-3 py-2">
            <p className="text-primerdown font-black text-sm">
              Va hacia #{play.receptor_camiseta ?? '?'} {play.receptor} · {pct(play.prob_completo)}
            </p>
            <p className="text-xs text-secundario font-semibold">separación {play.sep_objetivo.toFixed(1)} yd</p>
            {play.habia_mejor_opcion && play.mejor_nombre && play.mejor_prob != null && (
              <p className="text-xs text-white font-bold mt-1">
                Había otra opción: #{play.mejor_camiseta ?? '?'} {play.mejor_nombre} · {pct(play.mejor_prob)}
              </p>
            )}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-secundario">Opciones del QB al lanzar</p>
          {opciones.map(o => {
            const c = colorProb(o.prob_completo)
            return (
              <div
                key={o.entidad_id}
                className={filaClase(o.entidad_id)}
                onMouseEnter={() => onOpcionHover(o.entidad_id)}
                onMouseLeave={() => onOpcionHover(null)}
                onClick={() => elegir(o.entidad_id)}
              >
                <div className="flex justify-between gap-2 items-baseline">
                  <span className="truncate text-white text-sm font-bold">
                    <span className="tabular-nums text-acento">#{o.camiseta}</span> {o.nombre}
                  </span>
                  <span className="font-display font-black italic text-xl tabular-nums leading-none" style={{ color: c }}>
                    {pct(o.prob_completo)}
                  </span>
                </div>
                <div className="h-2 bg-borde rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${o.prob_completo * 100}%`, background: c }} />
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px] font-bold uppercase">
                  <span className="text-secundario tabular-nums normal-case text-xs mr-1">{o.sep.toFixed(1)} yd de separación</span>
                  {o.es_objetivo && <span className="px-1.5 py-0.5 rounded-full bg-primerdown text-fondo">Objetivo</span>}
                  {o.es_mejor_opcion && (
                    <span className="px-1.5 py-0.5 rounded-full bg-completo text-fondo">
                      {o.es_objetivo ? 'También la mejor' : 'Mejor opción'}
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded-full ${o.pasa_primer_down ? 'border border-primerdown text-primerdown' : 'border border-borde text-secundario'}`}>
                    {o.pasa_primer_down ? 'Pasa el 1er down' : o.pasa_scrimmage ? 'Pasa la línea, sin 1er down' : 'Detrás de la línea'}
                  </span>
                </div>
              </div>
            )
          })}
          <p className="text-[11px] text-secundario">Pasa el mouse por un receptor para ver la línea desde el QB.</p>
        </>
      ) : (
        <>
          <p className="text-sm text-white font-bold">Las opciones y la predicción aparecen cuando el QB lanza.</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-secundario">Separación en este momento</p>
          {receptoresVivos.map(f => (
            <div
              key={f.entidad_id}
              className={filaClase(f.entidad_id)}
              onMouseEnter={() => onOpcionHover(f.entidad_id)}
              onMouseLeave={() => onOpcionHover(null)}
              onClick={() => elegir(f.entidad_id)}
            >
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate text-white font-bold"><span className="tabular-nums text-acento">#{f.camiseta ?? '?'}</span> {f.nombre}</span>
                <span className="tabular-nums font-black" style={{ color: colorSep(f.sep as number) }}>{(f.sep as number).toFixed(1)} yd</span>
              </div>
            </div>
          ))}
          {!receptoresVivos.length && <p className="text-xs text-secundario">Dale play para ver la jugada.</p>}
        </>
      )}
    </div>
  )

  // ── QB y presión ──────────────────────────────────────────────────────────
  const dr = qbAhora?.dist_rusher ?? null
  const qb = (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-secundario mb-1">Bolsillo del QB ahora</p>
        {dr != null ? (
          <div className="flex items-center gap-3">
            <span className="font-display font-black italic text-3xl tabular-nums leading-none" style={{ color: colorBolsillo(dr) }}>
              {dr.toFixed(1)} yd
            </span>
            <div className="flex-1 h-2.5 bg-borde rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(dr / 6, 0.03), 1) * 100}%`, background: colorBolsillo(dr) }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-secundario">—</p>
        )}
        <p className="text-[11px] text-secundario mt-1">Distancia del rusher más cercano al QB.</p>
      </div>
      <div className="bg-fondo rounded-xl p-2">
        <MiniBolsillo serie={serieQB} seg={segAhora} segLanzamiento={lanz?.seg ?? null} />
      </div>

      <div className="border-t border-borde pt-3">
        <p className={`${titulo} text-lg`}>{play.qb}</p>
        {qbFila ? (
          <div className="flex flex-col gap-2 mt-1">
            <p className="text-xs text-secundario font-semibold">{qbFila.equipo} · {qbFila.jugadas} pases en las semanas 1 a 8</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-fondo rounded-xl p-3">
                <p className="font-display font-black italic text-3xl tabular-nums text-completo leading-none">{pct(qbFila.pct_completo_sin_presion)}</p>
                <p className="text-xs text-secundario font-semibold mt-1">completos sin presión</p>
              </div>
              <div className="bg-fondo rounded-xl p-3">
                <p className="font-display font-black italic text-3xl tabular-nums text-fallo leading-none">{pct(qbFila.pct_completo_con_presion)}</p>
                <p className="text-xs text-secundario font-semibold mt-1">completos con presión</p>
              </div>
            </div>
            <Dato k="Segundos para lanzar" v={qbFila.seg_para_lanzar.toFixed(2)} />
            <Dato k="Pases bajo presión" v={pct(qbFila.pct_bajo_presion)} />
            <Dato k="Capturas" v={qbFila.capturas} />
            <Dato k="Intercepciones" v={qbFila.intercepciones} />
          </div>
        ) : (
          <p className="text-xs text-secundario mt-1">Sin datos suficientes (menos de 100 pases en el periodo).</p>
        )}
      </div>
    </div>
  )

  // ── Jugadores ─────────────────────────────────────────────────────────────
  const grupo = (tituloGrupo: string, equipo: 'ataque' | 'defensa') => (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-secundario mb-1">{tituloGrupo}</p>
      <div className="flex flex-col gap-0.5">
        {jugadores.filter(j => j.equipo === equipo).map(j => (
          <button
            key={j.entidad_id}
            onClick={() => elegir(j.entidad_id)}
            className={`text-left text-xs px-2 py-1 rounded-lg font-semibold ${
              j.entidad_id === selectedId ? 'bg-acento text-fondo' : 'text-white hover:bg-fondo'
            }`}
          >
            <span className="font-black tabular-nums" style={{ color: j.entidad_id === selectedId ? undefined : equipo === 'ataque' ? PALETA.acento : PALETA.fallo }}>
              #{j.camiseta ?? '?'}
            </span>{' '}
            {j.nombre} · {j.posicion ?? '—'} · {ROL_LABEL[j.rol] ?? j.rol}
          </button>
        ))}
      </div>
    </div>
  )

  const listaJugadores = (
    <div className="flex flex-col gap-3">
      <div className="bg-fondo rounded-xl p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-secundario mb-1">Jugador seleccionado</p>
        {sel ? (
          <div className="flex flex-col gap-1">
            <p className="text-white font-black">#{sel.camiseta ?? '?'} {sel.nombre}</p>
            <Dato k="Posición" v={sel.posicion} />
            <Dato k="Rol" v={ROL_LABEL[sel.rol] ?? sel.rol} />
            <Dato k="Equipo" v={sel.equipo === 'ataque' ? `Ataque (${play.ataque})` : `Defensa (${play.defensa})`} />
            {selAhora?.sep != null && (
              <div className="flex justify-between text-sm">
                <span className="text-secundario font-semibold">Separación ahora</span>
                <span className="font-black tabular-nums" style={{ color: colorSep(selAhora.sep) }}>{selAhora.sep.toFixed(1)} yd</span>
              </div>
            )}
            {selAhora?.dist_rusher != null && (
              <div className="flex justify-between text-sm">
                <span className="text-secundario font-semibold">Rusher más cercano</span>
                <span className="font-black tabular-nums" style={{ color: colorBolsillo(selAhora.dist_rusher) }}>{selAhora.dist_rusher.toFixed(1)} yd</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-secundario">
            {modo3d ? 'En 3D elige un jugador de esta lista.' : 'Haz clic en un jugador del campo o de esta lista.'}
          </p>
        )}
      </div>
      {grupo(`Ataque · ${play.ataque}`, 'ataque')}
      {grupo(`Defensa · ${play.defensa}`, 'defensa')}
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <section className="bg-superficie border border-borde rounded-2xl p-4 flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-acento">{play.historia}</p>
        <h3 className={`${titulo} text-xl leading-tight`}>{play.qb} → {play.receptor}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-bold text-secundario uppercase">
          <span className="text-white">{play.ataque} vs {play.defensa}</span>
          <span>Cuarto {play.cuarto}</span>
          <span>{play.down}º y {play.yards_to_go}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs font-semibold text-secundario">
          <span>Cobertura: <b className="text-white">{play.cobertura ?? '—'}</b></span>
          <span>Formación: <b className="text-white">{play.formacion ?? '—'}</b></span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold uppercase text-secundario">Resultado</span>
          <span className={`font-display font-black italic uppercase text-lg ${res.color}`}>{res.texto} · {play.yardas} yd</span>
        </div>
        <p className="text-xs text-secundario leading-snug">{play.descripcion}</p>
      </section>

      <section className="bg-superficie border border-borde rounded-2xl">
        <div className="flex border-b border-borde" role="tablist">
          {PESTANAS.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={pestana === p.id}
              onClick={() => onPestana(p.id)}
              className={`flex-1 px-2 py-2.5 text-xs font-black uppercase tracking-wide border-b-2 -mb-px ${
                pestana === p.id ? 'border-acento text-white' : 'border-transparent text-secundario hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="p-3 max-h-[calc(100vh-330px)] min-h-[260px] overflow-y-auto">
          {pestana === 'receptores' ? receptores : pestana === 'qb' ? qb : listaJugadores}
        </div>
      </section>
    </div>
  )
}
