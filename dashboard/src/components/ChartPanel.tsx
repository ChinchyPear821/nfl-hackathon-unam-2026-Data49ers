import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts'
import type { GraficaRow, CurvaVentaja, HeatmapRow } from '../api'

interface Props {
  graficas: GraficaRow[]
  curva: CurvaVentaja[]
  heatmap: HeatmapRow[]
  seccion: 'hallazgo' | 'causa'
}

function pct(v: number) { return `${Math.round(v * 100)}%` }

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 shadow-lg">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.stroke ?? p.fill }}>{p.name}: {pct(p.value)}</p>
      ))}
    </div>
  )
}

// interpola verde(completo alto) a rojo(completo bajo): 0=rojo, 1=verde
function heatColor(v: number): string {
  // rojo #f43f5e → amarillo #fbbf24 → verde #34d399
  if (v >= 0.75) {
    const t = (v - 0.75) / 0.25
    const r = Math.round(251 + (52  - 251) * t)
    const g = Math.round(191 + (211 - 191) * t)
    const b = Math.round( 36 + (153 -  36) * t)
    return `rgb(${r},${g},${b})`
  }
  const t = v / 0.75
  const r = Math.round(244 + (251 - 244) * t)
  const g = Math.round( 63 + (191 -  63) * t)
  const b = Math.round( 94 + ( 36 -  94) * t)
  return `rgb(${r},${g},${b})`
}

function HeatmapGrid({ heatmap }: { heatmap: HeatmapRow[] }) {
  const rutas     = [...new Set(heatmap.map(r => r.ruta))].sort()
  const coberturas = [...new Set(heatmap.map(r => r.cobertura))].sort()
  const lookup = new Map(heatmap.map(r => [`${r.ruta}|${r.cobertura}`, r]))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
      <h3 className="text-slate-100 font-semibold mb-1">Mapa de calor: ruta × cobertura</h3>
      <p className="text-slate-400 text-xs mb-4">Color = % pases completos. Solo combinaciones con 40+ pases.</p>
      <div className="overflow-x-auto">
        <table className="text-xs border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-slate-500 text-left pr-2 font-normal">Ruta ↓ / Cobertura →</th>
              {coberturas.map(c => (
                <th key={c} className="text-slate-400 font-medium text-center px-1 whitespace-nowrap">{c.replace('COVER_','').replace('_',' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rutas.map(ruta => (
              <tr key={ruta}>
                <td className="text-slate-300 font-medium pr-3 py-0.5 whitespace-nowrap">{ruta}</td>
                {coberturas.map(cob => {
                  const cell = lookup.get(`${ruta}|${cob}`)
                  if (!cell) return (
                    <td key={cob} className="rounded text-center" style={{ background: '#1e293b', color: '#475569', minWidth: 56 }}>—</td>
                  )
                  const bg = heatColor(cell.pct_completo)
                  const textDark = cell.pct_completo > 0.55
                  return (
                    <td
                      key={cob}
                      className="rounded text-center font-semibold tabular-nums"
                      style={{ background: bg, color: textDark ? '#0f172a' : '#f8fafc', minWidth: 56, padding: '4px 2px' }}
                      title={`${ruta} vs ${cob}: ${pct(cell.pct_completo)} (${cell.jugadas} jug.)`}
                    >
                      {pct(cell.pct_completo)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* leyenda */}
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span>Bajo</span>
        <div className="h-3 w-32 rounded" style={{ background: 'linear-gradient(to right, rgb(244,63,94), rgb(251,191,36), rgb(52,211,153))' }} />
        <span>Alto</span>
      </div>
    </div>
  )
}

export default function ChartPanel({ graficas, curva, heatmap, seccion }: Props) {
  const ventaja = graficas.filter(r => r.grafica === 'ventaja_al_lanzar')
  const brecha  = graficas.filter(r => r.grafica === 'brecha_velocidad')

  return (
    <div className="flex flex-col gap-6">

      {seccion === 'hallazgo' && (<>
      {/* Curva continua de ventaja */}
      {curva.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
          <h3 className="text-slate-100 font-semibold mb-1">Curva continua: ventaja al lanzar → % completos</h3>
          <p className="text-slate-400 text-xs mb-4">
            El quiebre ocurre entre -1 y +2 yd: la probabilidad salta del 51% al 84%.
            Zona sombreada = zona de quiebre.
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={curva} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="ventaja_yd"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                label={{ value: 'Ventaja (yd)', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 11 }}
              />
              <YAxis tickFormatter={pct} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0.3, 1]} />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              {/* zona de quiebre -1 a +2 */}
              <ReferenceArea x1={-1} x2={2} fill="#fbbf24" fillOpacity={0.08} />
              <ReferenceLine x={-1} stroke="#fbbf24" strokeDasharray="4 2" strokeOpacity={0.5} />
              <ReferenceLine x={2}  stroke="#fbbf24" strokeDasharray="4 2" strokeOpacity={0.5} />
              <ReferenceLine x={0}  stroke="#64748b" strokeDasharray="2 2" strokeOpacity={0.4} />
              <Line dataKey="pct_completo"     name="% Completo"     stroke="#34d399" strokeWidth={2.5} dot={false} />
              <Line dataKey="pct_intercepcion" name="% Intercepcion" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
          <h3 className="text-slate-100 font-semibold mb-1">% completos e intercepciones por ventaja al lanzar</h3>
          <p className="text-slate-400 text-xs mb-4">Ventaja positiva = receptor más cerca del punto de caída</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ventaja} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="categoria" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tickFormatter={pct} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 1]} />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="pct_completo"     name="% Completo"     fill="#34d399" radius={[3,3,0,0]} />
              <Bar dataKey="pct_intercepcion" name="% Intercepcion" fill="#f43f5e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
      </>)}
      {seccion === 'causa' && (<>
      {/* Heatmap */}
      {heatmap.length > 0 && <HeatmapGrid heatmap={heatmap} />}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
          <h3 className="text-slate-100 font-semibold mb-1">% completos e intercepciones por brecha de velocidad</h3>
          <p className="text-slate-400 text-xs mb-4">Brecha = vel. requerida - vel. real del receptor</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={brecha} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="categoria" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tickFormatter={pct} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 1]} />
              <Tooltip content={<TT />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="pct_completo"     name="% Completo"     fill="#34d399" radius={[3,3,0,0]} />
              <Bar dataKey="pct_intercepcion" name="% Intercepcion" fill="#f43f5e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </>)}
    </div>
  )
}
