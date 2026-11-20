import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import type { ClusterRow, ClusterPlayer, Equipo } from '../api'

interface Props {
  clusters: ClusterRow[]
  players: ClusterPlayer[]          // todos los jugadores con pc1/pc2
  equipos: Equipo[]
}

// color por cluster (5 colores distintos bien contrastados sobre slate-950)
const CLUSTER_COLORS = ['#34d399','#60a5fa','#fbbf24','#f472b6','#a78bfa']

function num(v: number | null | undefined, d = 1) { return v != null ? v.toFixed(d) : '—' }
function pct(v: number | null | undefined) { return v != null ? `${Math.round(v * 100)}%` : '—' }
function initials(n: string) {
  const p = n.trim().split(' ')
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase()
}

function Avatar({ nombre, equipo, equipos }: { nombre: string; equipo: string; equipos: Equipo[] }) {
  const eq  = equipos.find(e => e.equipo === equipo)
  const bg  = eq?.color_primario   ?? '#334155'
  const bdr = eq?.color_secundario ?? '#64748b'
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0"
      style={{ background: bg, boxShadow: `0 0 0 2px ${bdr}` }}
      title={nombre}
    >{initials(nombre)}</span>
  )
}

const RASGOS: { key: keyof ClusterRow; label: string; unit: string; decimals: number }[] = [
  { key: 'vel_max_prom',  label: 'Vel. máx prom',    unit: 'yd/s', decimals: 2 },
  { key: 'acel_p90',      label: 'Aceleración p90',  unit: 'yd/s²',decimals: 2 },
  { key: 'profundidad',   label: 'Profundidad ruta',  unit: 'yd',   decimals: 1 },
  { key: 'desp_lateral',  label: 'Desplaz. lateral',  unit: 'yd',   decimals: 1 },
  { key: 'sinuosidad',    label: 'Sinuosidad',        unit: '',     decimals: 2 },
  { key: 'ventaja_prom',  label: 'Ventaja prom.',     unit: 'yd',   decimals: 2 },
]

// tooltip personalizado del scatter
const ScatterTT = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as ClusterPlayer & { clusterColor: string }
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 shadow-lg pointer-events-none">
      <p className="font-semibold">{d.nombre}</p>
      <p className="text-slate-400">{d.posicion} · {d.equipo}</p>
      {d.cluster_nombre && <p style={{ color: d.clusterColor }}>{d.cluster_nombre}</p>}
    </div>
  )
}

export default function ClustersPanel({ clusters, players, equipos }: Props) {
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)

  // jugadores con pc1/pc2 definidos
  const scatterData = players
    .filter(p => p.pc1 != null && p.pc2 != null)
    .map(p => ({
      ...p,
      clusterNum:   Number(p.cluster_nombre ? clusters.find(c => c.cluster_nombre === p.cluster_nombre)?.cluster ?? 0 : 0),
      clusterColor: CLUSTER_COLORS[(Number(clusters.find(c => c.cluster_nombre === p.cluster_nombre)?.cluster ?? 1) - 1) % 5],
    }))

  // lista de jugadores del cluster seleccionado
  const clusterList = selectedCluster != null
    ? players.filter(p => {
        const cl = clusters.find(c => c.cluster === selectedCluster)
        return cl && p.cluster_nombre === cl.cluster_nombre
      }).sort((a, b) => (b.ventaja_prom_objetivo ?? -Infinity) - (a.ventaja_prom_objetivo ?? -Infinity))
    : []

  return (
    <div className="flex flex-col gap-6">

      {/* Tarjetas de clusters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {clusters.map((c, i) => {
          const color = CLUSTER_COLORS[i % 5]
          const active = selectedCluster === c.cluster
          return (
            <button
              key={c.cluster}
              onClick={() => setSelectedCluster(active ? null : c.cluster)}
              className={`bg-slate-900 border rounded-2xl p-4 text-left transition-all shadow-lg shadow-black/20 ${
                active ? 'border-opacity-100' : 'border-slate-800 hover:border-slate-700'
              }`}
              style={{ borderColor: active ? color : undefined }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-slate-400">Cluster {c.cluster} · {c.jugadores} jugadores</span>
              </div>
              <p className="text-slate-100 font-semibold text-sm mb-3">{c.cluster_nombre}</p>
              <div className="flex flex-col gap-1">
                {RASGOS.map(r => (
                  <div key={r.key} className="flex justify-between text-xs">
                    <span className="text-slate-500">{r.label}</span>
                    <span className="tabular-nums" style={{ color }}>
                      {num(c[r.key] as number, r.decimals)}{r.unit ? ` ${r.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">{active ? 'Haz clic para cerrar' : 'Haz clic para ver jugadores'}</p>
            </button>
          )
        })}
      </div>

      {/* Scatter pc1 × pc2 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
        <h3 className="text-slate-100 font-semibold mb-1">Dispersión de estilos (PC1 × PC2)</h3>
        <p className="text-slate-400 text-xs mb-4">
          Proyección 2D de los rasgos de ruta. Cada punto es un receptor WR/TE/RB con 60+ rutas.
          Pasa el cursor para ver el nombre.
        </p>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="pc1" type="number" name="PC1" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'PC1 (velocidad / profundidad)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 }} />
            <YAxis dataKey="pc2" type="number" name="PC2" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ScatterTT />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />
            <Scatter data={scatterData} isAnimationActive={false}>
              {scatterData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.clusterColor}
                  fillOpacity={selectedCluster == null || d.clusterNum === selectedCluster ? 0.85 : 0.15}
                  r={selectedCluster != null && d.clusterNum === selectedCluster ? 5 : 4}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        {/* leyenda */}
        <div className="flex flex-wrap gap-4 mt-2">
          {clusters.map((c, i) => (
            <span key={c.cluster} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full" style={{ background: CLUSTER_COLORS[i % 5] }} />
              {c.cluster_nombre}
            </span>
          ))}
        </div>
      </div>

      {/* Lista de jugadores del cluster seleccionado */}
      {selectedCluster != null && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
          <h3 className="text-slate-100 font-semibold mb-1">
            Jugadores: {clusters.find(c => c.cluster === selectedCluster)?.cluster_nombre}
          </h3>
          <p className="text-slate-400 text-xs mb-4">{clusterList.length} receptores · ordenados por ventaja promedio</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {clusterList.map(p => (
              <div key={p.entidad_id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2">
                <Avatar nombre={p.nombre} equipo={p.equipo} equipos={equipos} />
                <div className="min-w-0">
                  <p className="text-slate-100 text-sm truncate">{p.nombre}</p>
                  <p className="text-slate-400 text-xs">{p.posicion} · {p.equipo} · ventaja {num(p.ventaja_prom_objetivo, 2)} yd</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
