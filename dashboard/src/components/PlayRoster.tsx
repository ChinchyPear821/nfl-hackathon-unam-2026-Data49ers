import type { Frame, Player } from '../api'

interface Props {
  frames: Frame[]
  players: Player[]
  highlightId: string | null
  onHighlight: (id: string | null) => void
}

const ROL_LABEL: Record<string, string> = {
  'Targeted Receiver':  'Receptor obj.',
  'Passer':             'QB',
  'Other Route Runner': 'Ruta',
  'Defensive Coverage': 'Cobertura',
}
const ROL_ORDER = ['Passer', 'Targeted Receiver', 'Other Route Runner', 'Defensive Coverage']

export default function PlayRoster({ frames, players, highlightId, onHighlight }: Props) {
  if (frames.length === 0) return null

  const seen = new Map<string, Frame>()
  frames.forEach(f => {
    if (f.es_balon !== 'true' && !seen.has(f.entidad_id)) seen.set(f.entidad_id, f)
  })
  const entities = [...seen.values()].sort(
    (a, b) => (ROL_ORDER.indexOf(a.rol) ?? 99) - (ROL_ORDER.indexOf(b.rol) ?? 99)
  )
  const catalog = new Map(players.map(p => [p.entidad_id, p]))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mt-3">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Jugadores en campo</p>
      <div className="flex flex-col gap-0.5">
        {entities.map(e => {
          const info = catalog.get(e.entidad_id)
          const pos  = info?.posicion ?? e.posicion ?? '—'
          const isActive = highlightId === e.entidad_id
          const isAtaque = e.equipo === 'ataque'
          return (
            <button
              key={e.entidad_id}
              onClick={() => onHighlight(isActive ? null : e.entidad_id)}
              className={`flex items-center gap-2 text-left px-2 py-1.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-emerald-500/20 border border-emerald-500/50'
                  : 'hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span className={`font-mono text-xs w-8 shrink-0 ${isAtaque ? 'text-emerald-400' : 'text-rose-400'}`}>
                {pos}
              </span>
              <span className="text-slate-100 truncate flex-1">{e.nombre}</span>
              <span className="text-slate-500 text-xs shrink-0">{ROL_LABEL[e.rol] ?? e.rol}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
