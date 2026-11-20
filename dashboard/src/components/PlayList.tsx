import { useMemo, useState } from 'react'
import type { Play } from '../api'

interface Props {
  plays: Play[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const GRUPOS = [
  '1 Defensor +2 yd',
  '2 Defensor 0-2 yd',
  '3 Receptor 0-2 yd',
  '4 Receptor 2-5 yd',
  '5 Receptor +5 yd',
]
const RESULTADO_LABEL: Record<string, string> = { C: 'Completo', I: 'Incompleto', IN: 'Intercepcion' }
const RESULTADO_COLOR: Record<string, string> = {
  C:  'text-emerald-400',
  I:  'text-slate-400',
  IN: 'text-rose-400',
}
const CHIP_BASE = 'rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors select-none'
const CHIP_ON   = 'bg-emerald-500 border-emerald-500 text-slate-950 font-semibold'
const CHIP_OFF  = 'border-slate-700 text-slate-300 hover:bg-slate-800'

export default function PlayList({ plays, selectedId, onSelect }: Props) {
  const [grupo,    setGrupo]    = useState('')
  const [resultado, setResultado] = useState('')
  const [equipo,   setEquipo]   = useState('')
  const [jugador,  setJugador]  = useState('')

  const equipos = useMemo(
    () => [...new Set(plays.flatMap(p => [p.ataque, p.defensa]))].filter(Boolean).sort(),
    [plays],
  )

  const q = jugador.trim().toLowerCase()
  const filtered = plays.filter(p =>
    (!grupo    || p.grupo_ventaja === grupo) &&
    (!resultado || p.resultado === resultado) &&
    (!equipo   || p.ataque === equipo || p.defensa === equipo) &&
    (!q        || p.qb?.toLowerCase().includes(q) || p.receptor?.toLowerCase().includes(q))
  )

  const hayFiltros = grupo || resultado || equipo || jugador

  return (
    <div className="flex flex-col gap-3">

      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-full pl-9 pr-3 py-1.5 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="QB o receptor..."
          value={jugador}
          onChange={e => setJugador(e.target.value)}
        />
      </div>

      {/* Chips resultado */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(RESULTADO_LABEL).map(([k, v]) => (
          <span
            key={k}
            className={`${CHIP_BASE} ${resultado === k ? CHIP_ON : CHIP_OFF}`}
            onClick={() => setResultado(resultado === k ? '' : k)}
          >{v}</span>
        ))}
      </div>

      {/* Chips grupo ventaja — 2 columnas para ahorrar espacio */}
      <div className="flex flex-col gap-1">
        {GRUPOS.map(g => (
          <span
            key={g}
            className={`${CHIP_BASE} ${grupo === g ? CHIP_ON : CHIP_OFF}`}
            onClick={() => setGrupo(grupo === g ? '' : g)}
          >{g}</span>
        ))}
      </div>

      {/* Select equipo */}
      <select
        className="bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        value={equipo}
        onChange={e => setEquipo(e.target.value)}
      >
        <option value="">Todos los equipos</option>
        {equipos.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Contador + limpiar */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>{filtered.length} jugadas</span>
        {hayFiltros && (
          <button
            className="hover:text-slate-200 transition-colors"
            onClick={() => { setGrupo(''); setResultado(''); setEquipo(''); setJugador('') }}
          >Limpiar filtros</button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex flex-col gap-1 max-h-[55vh] pr-1">
        {filtered.map(p => (
          <button
            key={p.jugada_id}
            onClick={() => onSelect(p.jugada_id)}
            className={`text-left px-3 py-2 rounded-xl text-sm transition-colors border ${
              selectedId === p.jugada_id
                ? 'border-emerald-500 bg-slate-800'
                : 'border-transparent bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-200 truncate flex-1">{p.qb} → {p.receptor}</span>
              <span className={`font-bold shrink-0 ${RESULTADO_COLOR[p.resultado] ?? 'text-slate-400'}`}>
                {RESULTADO_LABEL[p.resultado] ?? p.resultado}
              </span>
            </div>
            <div className="text-slate-500 text-xs mt-0.5">{p.ataque} vs {p.defensa} · {p.grupo_ventaja}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm px-2">Sin jugadas con estos filtros.</p>
        )}
      </div>
    </div>
  )
}
