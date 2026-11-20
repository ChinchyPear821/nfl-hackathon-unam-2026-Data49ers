import { useMemo } from 'react'
import type { Play } from '../api'
import { RESULTADO } from '../api'

export interface Filtros { historia: string; equipo: string; formacion: string; busca: string }
export const FILTROS_VACIOS: Filtros = { historia: '', equipo: '', formacion: '', busca: '' }

export function filtrar(plays: Play[], f: Filtros): Play[] {
  const q = f.busca.trim().toLowerCase()
  return plays.filter(p =>
    (!f.historia || p.historia === f.historia) &&
    (!f.formacion || p.formacion === f.formacion) &&
    (!f.equipo || p.ataque === f.equipo || p.defensa === f.equipo) &&
    (!q || p.qb.toLowerCase().includes(q) || p.receptor.toLowerCase().includes(q)),
  )
}

interface Props {
  plays: Play[]          // todas
  filtradas: Play[]
  filtros: Filtros
  onFiltros: (f: Filtros) => void
  playId: string | null
  onPlay: (id: string) => void
}

const CHIP = 'rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap'
const CHIP_ON = 'bg-acento border-acento text-fondo'
const CHIP_OFF = 'border-borde text-secundario hover:border-acento hover:text-white'
const CAMPO = 'bg-fondo border border-borde text-white text-sm font-semibold rounded-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-acento'

export default function FiltrosJugadas({ plays, filtradas, filtros, onFiltros, playId, onPlay }: Props) {
  const historias = useMemo(() => [...new Set(plays.map(p => p.historia))], [plays])
  const equipos = useMemo(
    () => [...new Set(plays.flatMap(p => [p.ataque, p.defensa]))].filter(Boolean).sort(),
    [plays],
  )
  const formaciones = useMemo(
    () => [...new Set(plays.map(p => p.formacion))].filter((f): f is string => !!f).sort(),
    [plays],
  )
  const set = (k: keyof Filtros, v: string) => onFiltros({ ...filtros, [k]: v })
  const hayFiltros = filtros.historia || filtros.equipo || filtros.formacion || filtros.busca

  const i = filtradas.findIndex(p => p.jugada_id === playId)
  const mover = (d: number) => {
    if (!filtradas.length) return
    const j = ((i < 0 ? 0 : i + d) + filtradas.length) % filtradas.length
    onPlay(filtradas[j].jugada_id)
  }

  return (
    <div className="bg-superficie border border-borde rounded-2xl p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display font-black italic uppercase text-sm text-secundario mr-1">Historia</span>
        <span className={`${CHIP} ${!filtros.historia ? CHIP_ON : CHIP_OFF}`} onClick={() => set('historia', '')}>Todas</span>
        {historias.map(h => (
          <span
            key={h}
            className={`${CHIP} ${filtros.historia === h ? CHIP_ON : CHIP_OFF}`}
            onClick={() => set('historia', filtros.historia === h ? '' : h)}
          >{h}</span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className={CAMPO} value={filtros.equipo} onChange={e => set('equipo', e.target.value)} aria-label="Equipo">
          <option value="">Todos los equipos</option>
          {equipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={CAMPO} value={filtros.formacion} onChange={e => set('formacion', e.target.value)} aria-label="Formación">
          <option value="">Todas las formaciones</option>
          {formaciones.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          className={`${CAMPO} w-56 placeholder-secundario`}
          placeholder="Buscar QB o receptor..."
          value={filtros.busca}
          onChange={e => set('busca', e.target.value)}
        />
        {hayFiltros && (
          <button className="text-xs font-bold uppercase text-secundario hover:text-white" onClick={() => onFiltros(FILTROS_VACIOS)}>
            Limpiar
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto min-w-0 flex-1 lg:flex-none">
          <button className={`${CAMPO} px-3`} onClick={() => mover(-1)} aria-label="Jugada anterior" disabled={!filtradas.length}>◀</button>
          <select
            className={`${CAMPO} min-w-0 flex-1 lg:w-[420px]`}
            value={i >= 0 ? playId ?? '' : ''}
            onChange={e => onPlay(e.target.value)}
            aria-label="Jugada"
            disabled={!filtradas.length}
          >
            {i < 0 && <option value="">{filtradas.length ? 'Elige una jugada' : 'Sin jugadas con estos filtros'}</option>}
            {filtradas.map(p => (
              <option key={p.jugada_id} value={p.jugada_id}>
                {p.qb} → {p.receptor} · {p.ataque} vs {p.defensa} · {RESULTADO[p.resultado].texto}
              </option>
            ))}
          </select>
          <button className={`${CAMPO} px-3`} onClick={() => mover(1)} aria-label="Jugada siguiente" disabled={!filtradas.length}>▶</button>
          <span className="text-xs font-bold text-secundario tabular-nums whitespace-nowrap">
            {i >= 0 ? i + 1 : '–'} / {filtradas.length}
          </span>
        </div>
      </div>
    </div>
  )
}
