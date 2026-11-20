import { useState } from 'react'
import type { Player, Equipo } from '../api'

interface Props { players: Player[]; equipos: Equipo[] }

// ── helpers ──────────────────────────────────────────────────────────────────
function pct(v: number | null) { return v != null ? `${Math.round(v * 100)}%` : '—' }
function num(v: number | null, d = 1) { return v != null ? v.toFixed(d) : '—' }
function initials(n: string) {
  const p = n.trim().split(' ')
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase()
}

function Avatar({ nombre, equipo, equipos, size = 8 }: { nombre: string; equipo: string; equipos: Equipo[]; size?: number }) {
  const eq  = equipos.find(e => e.equipo === equipo)
  const bg  = eq?.color_primario   ?? '#334155'
  const bdr = eq?.color_secundario ?? '#64748b'
  return (
    <span
      className={`inline-flex items-center justify-center w-${size} h-${size} rounded-full text-white text-xs font-bold shrink-0`}
      style={{ background: bg, boxShadow: `0 0 0 2px ${bdr}` }}
      title={nombre}
    >{initials(nombre)}</span>
  )
}

function Badge({ abbr, equipos }: { abbr: string; equipos: Equipo[] }) {
  const eq  = equipos.find(e => e.equipo === abbr)
  const bg  = eq?.color_primario   ?? '#334155'
  const bdr = eq?.color_secundario ?? '#64748b'
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0"
      style={{ background: bg, boxShadow: `0 0 0 2px ${bdr}` }}
    >{abbr}</span>
  )
}

// ── columnas por rol ──────────────────────────────────────────────────────────
type RolView = 'general' | 'receptor' | 'qb' | 'defensor'

function rolView(pos: string): RolView {
  if (pos === 'QB') return 'qb'
  if (['WR','TE','RB'].includes(pos)) return 'receptor'
  if (['CB','SS','FS','LB','DE','DT'].includes(pos)) return 'defensor'
  return 'general'
}

const CHIP_BASE = 'rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors select-none whitespace-nowrap'
const CHIP_ON   = 'bg-emerald-500 border-emerald-500 text-slate-950 font-semibold'
const CHIP_OFF  = 'border-slate-700 text-slate-300 hover:bg-slate-800'

const POS_GROUPS = [
  { label: 'Todas',    values: ['Todas'] },
  { label: 'QB',       values: ['QB'] },
  { label: 'Receptor', values: ['WR','TE','RB'] },
  { label: 'Defensor', values: ['CB','SS','FS','LB','DE','DT'] },
  { label: 'Línea',    values: ['OT','OG','C'] },
]

// ── barra horizontal para Comparar ───────────────────────────────────────────
function HBar({ value, max, color, isPct = false }: { value: number | null; max: number; color: string; isPct?: boolean }) {
  if (value == null) return <span className="text-slate-600 text-xs">—</span>
  // valores negativos (EPA, ventaja) se muestran como barra vacía con el número en rojo
  const w = max > 0 && value > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const label = isPct ? `${Math.round(value * 100)}%` : value.toFixed(1)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-2 min-w-[60px]">
        <div className="h-2 rounded-full" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className={`text-xs tabular-nums w-10 text-right ${value < 0 ? 'text-rose-400' : 'text-slate-300'}`}>{label}</span>
    </div>
  )
}

type SortKey = keyof Player

export default function PlayersPanel({ players, equipos }: Props) {
  const [search,       setSearch]       = useState('')
  const [posGroup,     setPosGroup]     = useState('Todas')
  const [equipoFiltro, setEquipoFiltro] = useState('')
  const [sortCol,      setSortCol]      = useState<SortKey>('jugadas')
  const [sortAsc,      setSortAsc]      = useState(false)
  const [compareIds,   setCompareIds]   = useState<string[]>([])
  const [compareMode,  setCompareMode]  = useState(false)
  const [minN,         setMinN]         = useState(20)

  // muestra relevante según el rol: así un 100% con 2 intentos no encabeza la tabla
  function muestra(p: Player): number | null {
    if (posGroup === 'QB') return p.qb_pases ?? 0
    if (posGroup === 'Receptor') return p.veces_objetivo ?? 0
    if (posGroup === 'Defensor') return p.def_veces_cercano ?? 0
    return p.jugadas ?? 0
  }

  const posValues = POS_GROUPS.find(g => g.label === posGroup)?.values ?? ['Todas']

  const filtered = players.filter(p => {
    if (search) {
      const q = search.toLowerCase()
      if (!p.nombre.toLowerCase().includes(q) && !p.equipo.toLowerCase().includes(q)) return false
    }
    if (posGroup !== 'Todas' && !posValues.includes(p.posicion)) return false
    if (equipoFiltro && p.equipo !== equipoFiltro) return false
    if ((muestra(p) ?? 0) < minN) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortCol] as any) ?? (typeof (a[sortCol]) === 'string' ? '' : -Infinity)
    const bv = (b[sortCol] as any) ?? (typeof (b[sortCol]) === 'string' ? '' : -Infinity)
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : (bv as string).localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  function toggleSort(col: SortKey) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(false) }
  }

  function toggleCompare(id: string) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  // vista por rol predominante del grupo seleccionado
  const view: RolView = posGroup === 'QB' ? 'qb'
    : posGroup === 'Receptor' ? 'receptor'
    : posGroup === 'Defensor' ? 'defensor'
    : 'general'

  function Th({ col, label, right }: { col: SortKey; label: string; right?: boolean }) {
    const active = sortCol === col
    return (
      <th
        className={`pb-3 pr-3 font-medium text-slate-400 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-nowrap ${right ? 'text-right' : ''}`}
        onClick={() => toggleSort(col)}
      >
        {label} <span className="text-slate-600">{active ? (sortAsc ? '↑' : '↓') : '↕'}</span>
      </th>
    )
  }

  // jugadores seleccionados para comparar
  const comparePlayers = compareIds.map(id => players.find(p => p.entidad_id === id)).filter(Boolean) as Player[]

  const equiposUnicos = [...new Set(players.map(p => p.equipo))].sort()

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-slate-100 font-semibold text-lg">Jugadores</h2>
        <button
          onClick={() => { setCompareMode(m => !m); if (!compareMode) setCompareIds([]) }}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${compareMode ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          {compareMode ? 'Salir de Comparar' : 'Comparar jugadores'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Buscador */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Buscar nombre..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-xs bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-full pl-9 pr-3 py-1.5 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Chips posición */}
        <div className="flex flex-wrap gap-1.5">
          {POS_GROUPS.map(g => (
            <span key={g.label} className={`${CHIP_BASE} ${posGroup === g.label ? CHIP_ON : CHIP_OFF}`}
              onClick={() => setPosGroup(g.label)}>{g.label}</span>
          ))}
        </div>

        {/* Filtro equipo con insignias */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span
            className={`${CHIP_BASE} ${equipoFiltro === '' ? CHIP_ON : CHIP_OFF}`}
            onClick={() => setEquipoFiltro('')}
          >Todos</span>
          {equiposUnicos.map(eq => {
            const info = equipos.find(e => e.equipo === eq)
            const bg   = info?.color_primario   ?? '#334155'
            const bdr  = info?.color_secundario ?? '#64748b'
            const active = equipoFiltro === eq
            return (
              <span
                key={eq}
                onClick={() => setEquipoFiltro(active ? '' : eq)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold cursor-pointer transition-opacity"
                style={{
                  background: bg,
                  boxShadow: active ? `0 0 0 3px white, 0 0 0 5px ${bdr}` : `0 0 0 2px ${bdr}`,
                  opacity: equipoFiltro && !active ? 0.45 : 1,
                }}
                title={info?.nombre ?? eq}
              >{eq}</span>
            )
          })}
        </div>

        <span className="text-slate-500 text-xs">{sorted.length} jugadores
          {compareMode && compareIds.length > 0 && <span className="text-amber-400 ml-2">{compareIds.length} seleccionados para comparar</span>}
          <span className="ml-3 inline-flex items-center gap-2 text-slate-400">
            Mínimo
            <select value={minN} onChange={e => setMinN(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-slate-200">
              {[0, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {posGroup === 'QB' ? 'pases' : posGroup === 'Receptor' ? 'veces objetivo' : posGroup === 'Defensor' ? 'veces como defensor más cercano' : 'jugadas'}
          </span>
        </span>
      </div>

      {/* ── Modo Comparar ── */}
      {compareMode && comparePlayers.length > 1 && (
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <h3 className="text-slate-100 font-semibold mb-4">Comparación ({comparePlayers.length} jugadores)</h3>
          <div className="grid gap-6" style={{ gridTemplateColumns: `200px repeat(${comparePlayers.length}, minmax(0,1fr))` }}>
            {/* header */}
            <div />
            {comparePlayers.map(p => (
              <div key={p.entidad_id} className="flex flex-col items-center gap-1">
                <Avatar nombre={p.nombre} equipo={p.equipo} equipos={equipos} size={10} />
                <p className="text-slate-100 text-xs font-semibold text-center">{p.nombre}</p>
                <p className="text-slate-400 text-xs">{p.posicion} · {p.equipo}</p>
              </div>
            ))}

            {/* filas de stats comunes */}
            {[
              { label: 'Jugadas',   key: 'jugadas' as SortKey,   max: Math.max(...comparePlayers.map(p => p.jugadas ?? 0)), color: '#94a3b8' },
              { label: 'Vel. máx',  key: 'vel_max' as SortKey,   max: Math.max(...comparePlayers.map(p => p.vel_max ?? 0)), color: '#60a5fa' },
            ].map(({ label, key, max, color }) => (
              <>
                <div key={label} className="flex items-center text-slate-400 text-xs">{label}</div>
                {comparePlayers.map(p => <div key={p.entidad_id}><HBar value={p[key] as number | null} max={max} color={color} isPct={String(key).includes('pct')} /></div>)}
              </>
            ))}

            {/* stats por rol */}
            {view === 'receptor' && [
              { label: 'Veces obj.',    key: 'veces_objetivo' as SortKey,       max: Math.max(...comparePlayers.map(p => p.veces_objetivo ?? 0)),       color: '#34d399' },
              { label: '% Comp. obj.',  key: 'pct_completo_objetivo' as SortKey, max: 1,                                                                  color: '#34d399', isPct: true },
              { label: 'Ventaja prom.', key: 'ventaja_prom_objetivo' as SortKey, max: Math.max(...comparePlayers.map(p => p.ventaja_prom_objetivo ?? 0)), color: '#fbbf24' },
              { label: 'Yardas obj.',   key: 'yardas_objetivo' as SortKey,       max: Math.max(...comparePlayers.map(p => p.yardas_objetivo ?? 0)),       color: '#a78bfa' },
            ].map(({ label, key, max, color }) => (
              <>
                <div key={label} className="flex items-center text-slate-400 text-xs">{label}</div>
                {comparePlayers.map(p => <div key={p.entidad_id}><HBar value={p[key] as number | null} max={max} color={color} isPct={String(key).includes('pct')} /></div>)}
              </>
            ))}

            {view === 'qb' && [
              { label: 'Pases',         key: 'qb_pases' as SortKey,          max: Math.max(...comparePlayers.map(p => p.qb_pases ?? 0)),          color: '#94a3b8' },
              { label: '% Completo',    key: 'qb_pct_completo' as SortKey,   max: 1,                                                              color: '#34d399' },
              { label: '% Intercep.',   key: 'qb_pct_intercepcion' as SortKey, max: 0.15,                                                         color: '#f43f5e' },
              { label: 'EPA prom',      key: 'qb_epa_prom' as SortKey,       max: Math.max(...comparePlayers.map(p => p.qb_epa_prom ?? 0)),       color: '#fbbf24' },
              { label: 'Distancia prom',key: 'qb_distancia_prom' as SortKey, max: Math.max(...comparePlayers.map(p => p.qb_distancia_prom ?? 0)), color: '#60a5fa' },
            ].map(({ label, key, max, color }) => (
              <>
                <div key={label} className="flex items-center text-slate-400 text-xs">{label}</div>
                {comparePlayers.map(p => <div key={p.entidad_id}><HBar value={p[key] as number | null} max={max} color={color} isPct={String(key).includes('pct')} /></div>)}
              </>
            ))}

            {view === 'defensor' && [
              { label: 'Veces cercano',    key: 'def_veces_cercano' as SortKey,          max: Math.max(...comparePlayers.map(p => p.def_veces_cercano ?? 0)),          color: '#94a3b8' },
              { label: '% Comp. permit.',  key: 'def_pct_completo_permitido' as SortKey, max: 1,                                                                       color: '#f43f5e' },
              { label: 'Intercepciones',   key: 'def_intercepciones' as SortKey,         max: Math.max(...comparePlayers.map(p => p.def_intercepciones ?? 0)),         color: '#34d399' },
              { label: 'Ventaja prom. permit.', key: 'def_ventaja_prom_permitida' as SortKey, max: Math.max(...comparePlayers.map(p => p.def_ventaja_prom_permitida ?? 0)), color: '#fbbf24' },
            ].map(({ label, key, max, color }) => (
              <>
                <div key={label} className="flex items-center text-slate-400 text-xs">{label}</div>
                {comparePlayers.map(p => <div key={p.entidad_id}><HBar value={p[key] as number | null} max={max} color={color} isPct={String(key).includes('pct')} /></div>)}
              </>
            ))}
          </div>
        </div>
      )}
      {compareMode && comparePlayers.length <= 1 && (
        <p className="text-slate-500 text-sm mb-4">Marca al menos 2 jugadores de la tabla para compararlos.</p>
      )}

      {/* ── Tabla ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr>
              {compareMode && <th className="pb-3 pr-2 w-6" />}
              <Th col="nombre"   label="Jugador" />
              <Th col="posicion" label="Pos" />
              <Th col="equipo"   label="Equipo" />
              <Th col="jugadas"  label="Jugadas" right />
              <Th col="vel_max"  label="Vel. máx" right />
              {view === 'receptor' && <>
                <Th col="veces_objetivo"        label="Veces obj."   right />
                <Th col="pct_completo_objetivo" label="% Comp. obj." right />
                <Th col="ventaja_prom_objetivo" label="Ventaja prom" right />
                <Th col="yardas_objetivo"       label="Yardas obj."  right />
              </>}
              {view === 'qb' && <>
                <Th col="qb_pases"            label="Pases"         right />
                <Th col="qb_pct_completo"     label="% Completo"    right />
                <Th col="qb_pct_intercepcion" label="% Intercep."   right />
                <Th col="qb_epa_prom"         label="EPA prom"      right />
                <Th col="qb_distancia_prom"   label="Dist. prom"    right />
              </>}
              {view === 'defensor' && <>
                <Th col="def_veces_cercano"          label="Veces cercano"    right />
                <Th col="def_pct_completo_permitido" label="% Comp. permit."  right />
                <Th col="def_intercepciones"         label="Intercep."        right />
                <Th col="def_ventaja_prom_permitida" label="Ventaja prom."    right />
              </>}
              {view === 'general' && <>
                <Th col="veces_objetivo"        label="Veces obj."   right />
                <Th col="pct_completo_objetivo" label="% Comp. obj." right />
              </>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const selected = compareIds.includes(p.entidad_id)
              return (
                <tr
                  key={p.entidad_id}
                  onClick={() => compareMode && toggleCompare(p.entidad_id)}
                  className={`border-t border-slate-800 transition-colors ${
                    compareMode ? 'cursor-pointer' : ''
                  } ${selected ? 'bg-amber-500/10 border-amber-500/30' : i % 2 === 0 ? 'bg-slate-900/40' : ''} hover:bg-slate-800/60`}
                >
                  {compareMode && (
                    <td className="py-2 pr-2">
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded border text-xs ${selected ? 'bg-amber-400 border-amber-400 text-slate-950' : 'border-slate-600'}`}>
                        {selected ? '✓' : ''}
                      </span>
                    </td>
                  )}
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar nombre={p.nombre} equipo={p.equipo} equipos={equipos} />
                      <span className="text-slate-100">{p.nombre}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-emerald-400">{p.posicion}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <Badge abbr={p.equipo} equipos={equipos} />
                      <span className="text-slate-400 text-xs">{p.equipo}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{p.jugadas ?? '—'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{num(p.vel_max)} yd/s</td>
                  {view === 'receptor' && <>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{p.veces_objetivo ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{pct(p.pct_completo_objetivo)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums font-medium ${(p.ventaja_prom_objetivo ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{num(p.ventaja_prom_objetivo, 2)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-300">{num(p.yardas_objetivo, 0)}</td>
                  </>}
                  {view === 'qb' && <>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{p.qb_pases ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{pct(p.qb_pct_completo)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-400">{pct(p.qb_pct_intercepcion)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums font-medium ${(p.qb_epa_prom ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{num(p.qb_epa_prom, 3)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-300">{num(p.qb_distancia_prom)} yd</td>
                  </>}
                  {view === 'defensor' && <>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{p.def_veces_cercano ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-rose-400">{pct(p.def_pct_completo_permitido)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{p.def_intercepciones ?? '—'}</td>
                    <td className={`py-2 text-right tabular-nums font-medium ${(p.def_ventaja_prom_permitida ?? 0) >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{num(p.def_ventaja_prom_permitida, 2)}</td>
                  </>}
                  {view === 'general' && <>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{p.veces_objetivo ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums text-emerald-400">{pct(p.pct_completo_objetivo)}</td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="text-slate-500 text-sm mt-4 text-center">Sin resultados.</p>}
      </div>
    </div>
  )
}
