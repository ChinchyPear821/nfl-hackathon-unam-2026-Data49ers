import { useMemo, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Decision, Situacion, Player, Equipo } from '../api'

interface Props {
  data: Decision
  players: Player[]
  equipos: Equipo[]
}

const SITUACIONES: { id: Situacion; label: string; meta: string }[] = [
  { id: 'tercera_corta', label: '3ª y corta', meta: '3 yardas o menos' },
  { id: 'tercera_larga', label: '3ª y larga', meta: '7 yardas o más' },
  { id: 'primera',       label: '1ª oportunidad', meta: 'logra 10+ yardas' },
]

const pct = (v: number | null | undefined) => (v != null ? `${Math.round(v * 100)}%` : '—')
const yd = (v: number | null | undefined) => (v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1)} yd` : '—')
const card = 'bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20'

function initials(n: string) {
  const p = n.trim().split(' ')
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export default function DecisionPanel({ data, players, equipos }: Props) {
  const [sit, setSit] = useState<Situacion>('tercera_corta')
  const [ruta, setRuta] = useState<string | null>(null)
  const [rival, setRival] = useState('')

  const resumen = data.situaciones.find(s => s.situacion === sit)
  const rutas = useMemo(
    () => data.rutas.filter(r => r.situacion === sit).sort((a, b) => b.pct_conversion - a.pct_conversion),
    [data.rutas, sit],
  )
  const mejor = rutas[0]
  const masVentaja = [...rutas].sort((a, b) => b.ventaja_prom - a.ventaja_prom)[0]
  const rutaSel = ruta && rutas.some(r => r.ruta === ruta) ? ruta : mejor?.ruta ?? null
  const receptores = data.receptores.filter(r => r.ruta === rutaSel).slice(0, 6)
  const colorEq = (abbr: string) => equipos.find(e => e.equipo === abbr)
  const equiposRival = [...new Set(data.rival.map(r => r.equipo).filter(e => e !== 'LIGA'))].sort()
  const rivalRow = data.rival.find(r => r.equipo === rival && r.situacion === sit)
  const ligaRow = data.rival.find(r => r.equipo === 'LIGA' && r.situacion === sit)

  const qbs = players
    .filter(p => (p.qb_pases ?? 0) >= 100 && p.qb_ventaja_prom != null && p.qb_epa_prom != null)
    .map(p => ({ x: p.qb_ventaja_prom!, y: p.qb_epa_prom!, nombre: p.nombre, equipo: p.equipo, n: p.qb_pases }))

  const engano = mejor && masVentaja && mejor.ruta !== masVentaja.ruta && masVentaja.pct_conversion < mejor.pct_conversion - 0.15
  const conclusion = !mejor ? '' : engano
    ? `En esta situación la ventaja engaña: la ${masVentaja.ruta} es la ruta con más ventaja (${yd(masVentaja.ventaja_prom)}) y se completa el ${pct(masVentaja.pct_completo)}, pero solo consigue el objetivo el ${pct(masVentaja.pct_conversion)}. La defensa regala ventaja donde no le duele. La mejor opción es la ${mejor.ruta}: ${pct(mejor.pct_conversion)} de conversión.`
    : `Aquí la ventaja manda: la ${mejor.ruta} consigue el objetivo el ${pct(mejor.pct_conversion)} de las veces, con ${yd(mejor.ventaja_prom)} de ventaja al lanzar. Busca la ruta que genere ventaja.`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-emerald-400 text-xs uppercase tracking-widest mb-1">Acto 3 · La decisión</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">La ventaja decide si completas el pase. El entrenador decide si esa ventaja sirve.</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {SITUACIONES.map(s => (
          <button key={s.id} onClick={() => { setSit(s.id); setRuta(null) }}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${sit === s.id
              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-semibold'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
            {s.label} <span className="opacity-70">· {s.meta}</span>
          </button>
        ))}
      </div>

      {resumen && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={card}><p className="text-4xl font-bold tabular-nums">{resumen.jugadas.toLocaleString()}</p><p className="text-slate-400 text-sm">pases en esta situación</p></div>
          <div className={card}><p className="text-4xl font-bold tabular-nums text-amber-300">{pct(resumen.pct_pases_con_ventaja)}</p><p className="text-slate-400 text-sm">salen con 2+ yd de ventaja</p></div>
          <div className={card}><p className="text-4xl font-bold tabular-nums text-emerald-400">{pct(resumen.pct_completo_con_ventaja)}</p><p className="text-slate-400 text-sm">se completan con ventaja</p></div>
          <div className={card}><p className="text-4xl font-bold tabular-nums text-rose-400">{pct(resumen.pct_completo_sin_ventaja)}</p><p className="text-slate-400 text-sm">se completan sin ventaja</p></div>
        </div>
      )}

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-slate-100">{conclusion}</div>

      <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        <div className={card}>
          <h3 className="font-semibold mb-1">¿Qué ruta funciona en {SITUACIONES.find(s => s.id === sit)?.label}?</h3>
          <p className="text-slate-400 text-xs mb-4">Ordenadas por % que consigue el objetivo. Solo rutas con 25+ pases. Haz clic en una para ver receptores.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr className="text-left">
                  <th className="pb-2 pr-3 font-medium">Ruta</th>
                  <th className="pb-2 pr-3 font-medium text-right">Pases</th>
                  <th className="pb-2 pr-3 font-medium text-right">Ventaja</th>
                  <th className="pb-2 pr-3 font-medium text-right">% completos</th>
                  <th className="pb-2 font-medium">% consigue el objetivo</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((r, i) => (
                  <tr key={r.ruta} onClick={() => setRuta(r.ruta)}
                    className={`cursor-pointer border-t border-slate-800 transition-colors ${rutaSel === r.ruta ? 'bg-emerald-500/10' : 'hover:bg-slate-800/60'}`}>
                    <td className="py-2 pr-3 font-medium">{i === 0 && '★ '}{r.ruta}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-400">{r.jugadas}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${r.ventaja_prom >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>{yd(r.ventaja_prom)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-300">{pct(r.pct_completo)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-800 min-w-[80px]">
                          <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.round(r.pct_conversion * 100)}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums">{pct(r.pct_conversion)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className={card}>
            <h3 className="font-semibold mb-1">¿A quién lanzarle la {rutaSel}?</h3>
            <p className="text-slate-400 text-xs mb-4">Receptores que más ventaja generan en esta ruta (15+ objetivos, toda la temporada).</p>
            <div className="flex flex-col gap-2">
              {receptores.map(r => {
                const eq = colorEq(r.equipo)
                return (
                  <div key={r.entidad_id} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: eq?.color_primario ?? '#334155', boxShadow: `0 0 0 2px ${eq?.color_secundario ?? '#64748b'}` }}>
                      {initials(r.receptor)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.receptor}</p>
                      <p className="text-xs text-slate-400">{r.equipo} · {r.jugadas} objetivos</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums text-amber-300">{yd(r.ventaja_prom)}</p>
                      <p className="tabular-nums text-xs text-slate-400">{pct(r.pct_completo)} completos</p>
                    </div>
                  </div>
                )
              })}
              {receptores.length === 0 && <p className="text-sm text-slate-500">Ningún receptor llega a 15 objetivos en esta ruta.</p>}
            </div>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">¿Contra quién juegas?</h3>
            <p className="text-slate-400 text-xs mb-3">Cuánta ventaja permite esa defensa en esta situación, comparada con la liga.</p>
            <select value={rival} onChange={e => setRival(e.target.value)}
              className="mb-4 w-full rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100">
              <option value="">Elige un rival…</option>
              {equiposRival.map(e => <option key={e} value={e}>{e} · {colorEq(e)?.nombre ?? ''}</option>)}
            </select>
            {rival && rivalRow && ligaRow ? (
              <div className="flex flex-col gap-3 text-sm">
                {([
                  ['Ventaja que permite', yd(rivalRow.ventaja_permitida), yd(ligaRow.ventaja_permitida), rivalRow.ventaja_permitida > ligaRow.ventaja_permitida],
                  ['% completos que permite', pct(rivalRow.pct_completo_permitido), pct(ligaRow.pct_completo_permitido), rivalRow.pct_completo_permitido > ligaRow.pct_completo_permitido],
                  ['% conversión que permite', pct(rivalRow.pct_conversion_permitida), pct(ligaRow.pct_conversion_permitida), rivalRow.pct_conversion_permitida > ligaRow.pct_conversion_permitida],
                ] as [string, string, string, boolean][]).map(([lab, v, l, peor]) => (
                  <div key={lab} className="flex items-center justify-between">
                    <span className="text-slate-400">{lab}</span>
                    <span>
                      <span className={`font-semibold tabular-nums ${peor ? 'text-emerald-400' : 'text-rose-400'}`}>{v}</span>
                      <span className="ml-2 text-xs text-slate-500">liga {l}</span>
                    </span>
                  </div>
                ))}
                <p className={`text-xs ${rivalRow.jugadas < 40 ? 'text-amber-300' : 'text-slate-500'}`}>
                  {rivalRow.jugadas} pases en esta situación{rivalRow.jugadas < 40 && ': muestra pequeña, tómalo como tendencia, no como certeza'}.
                  Verde = mejor para tu ataque que el promedio.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Selecciona un equipo para comparar su defensa con la liga.</p>
            )}
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-semibold mb-1">QB conservadores contra agresivos</h3>
        <p className="text-slate-400 text-xs mb-4">
          Cada punto es un QB (100+ pases). A la derecha lanzan con más ventaja (más seguros); arriba generan más valor por pase (EPA).
          Lanzar sin ventaja no es un error si el QB sabe cuándo arriesgar.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" dataKey="x" name="Ventaja promedio" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Ventaja promedio al lanzar (yd)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="EPA" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'EPA por pase', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-xs text-slate-100">
                    <p className="font-semibold">{d.nombre} · {d.equipo}</p>
                    <p>Ventaja promedio: {yd(d.x)}</p>
                    <p>EPA por pase: {d.y.toFixed(3)}</p>
                    <p className="text-slate-400">{d.n} pases</p>
                  </div>
                )
              }} />
            <Scatter data={qbs} fill="#34d399" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
