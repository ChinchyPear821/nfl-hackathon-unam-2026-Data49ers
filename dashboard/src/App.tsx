import { useEffect, useState } from 'react'
import {
  fetchPlays, fetchFrames, fetchMetrics, fetchPlayers, fetchTeams,
  fetchEquipos, fetchCurva, fetchHeatmap, fetchClusters, fetchDecision
} from './api'
import type {
  Play, Frame, MetricsResponse, Player, Team, Equipo,
  CurvaVentaja, HeatmapRow, ClusterRow, ClusterPlayer, Decision
} from './api'
import MetricCard     from './components/MetricCard'
import PlayList       from './components/PlayList'
import FieldAnimation from './components/FieldAnimation'
import ChartPanel     from './components/ChartPanel'
import Narracion from './components/Narracion'
import DecisionPanel  from './components/DecisionPanel'
import TeamsPanel     from './components/TeamsPanel'
import PlayersPanel   from './components/PlayersPanel'
import PlayRoster     from './components/PlayRoster'
import ClustersPanel  from './components/ClustersPanel'

function pct(v: number) { return `${Math.round(v * 100)}%` }
type Tab = 'hallazgo' | 'causa' | 'decision' | 'explorar'

const TABS: { id: Tab; label: string }[] = [
  { id: 'hallazgo', label: '1 · El hallazgo' },
  { id: 'causa',    label: '2 · La causa'    },
  { id: 'decision', label: '3 · La decisión' },
  { id: 'explorar', label: 'Explorar los datos' },
]

function Acto({ n, titulo, frase }: { n: string; titulo: string; frase: string }) {
  return (
    <div>
      <p className="text-emerald-400 text-xs uppercase tracking-widest mb-1">Acto {n} · {titulo}</p>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{frase}</h2>
    </div>
  )
}

export default function App() {
  const [plays,    setPlays]    = useState<Play[]>([])
  const [metrics,  setMetrics]  = useState<MetricsResponse | null>(null)
  const [players,  setPlayers]  = useState<Player[]>([])
  const [teams,    setTeams]    = useState<Team[]>([])
  const [equipos,  setEquipos]  = useState<Equipo[]>([])
  const [curva,    setCurva]    = useState<CurvaVentaja[]>([])
  const [heatmap,  setHeatmap]  = useState<HeatmapRow[]>([])
  const [clusters, setClusters] = useState<ClusterRow[]>([])
  const [decision, setDecision] = useState<Decision | null>(null)
  const [subExplorar, setSubExplorar] = useState<'equipos' | 'jugadores'>('equipos')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const [tab,         setTab]         = useState<Tab>('hallazgo')
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [frames,      setFrames]      = useState<Frame[]>([])
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetchPlays(), fetchMetrics(), fetchPlayers(), fetchTeams(),
      fetchEquipos(), fetchCurva(), fetchHeatmap(), fetchClusters(), fetchDecision(),
    ]).then(([p, m, pl, t, eq, cv, hm, cl, dc]) => {
      setPlays(p); setMetrics(m); setPlayers(pl); setTeams(t)
      setEquipos(eq); setCurva(cv); setHeatmap(hm); setClusters(cl); setDecision(dc)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(id: string) {
    setSelectedId(id)
    setHighlightId(null)
    try { setFrames(await fetchFrames(id)) }
    catch { setFrames([]) }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando datos...</div>
  )
  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400">Error: {error}</div>
  )

  const t       = metrics?.totales
  const selPlay = plays.find(p => p.jugada_id === selectedId)
  const RES_LABEL: Record<string, string> = { C: 'Completo', I: 'Incompleto', IN: 'Intercepcion' }
  const RES_COLOR: Record<string, string> = { C: 'text-emerald-400', I: 'text-slate-400', IN: 'text-rose-400' }

  // Para ClustersPanel: players filtrados con pc1/pc2 como ClusterPlayer
  const clusterPlayers: ClusterPlayer[] = players
    .filter(p => p.pc1 != null && p.pc2 != null)
    .map(p => ({
      entidad_id: p.entidad_id, nombre: p.nombre, posicion: p.posicion,
      equipo: p.equipo, jugadas: p.jugadas, vel_max: p.vel_max,
      pc1: p.pc1, pc2: p.pc2,
      ventaja_prom_objetivo: p.ventaja_prom_objetivo,
      pct_completo_objetivo: p.pct_completo_objetivo,
      cluster_nombre: p.cluster_nombre,
    }))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Encabezado */}
      <header className="bg-gradient-to-r from-emerald-500/20 via-slate-900 to-slate-950 border-b border-slate-800">
        <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-8">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-widest mb-2">
            NFL Big Data Bowl 2026 · UNAM
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3">
            El pase se decide antes de que el balón salga
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl">
            Si el receptor tiene ventaja sobre el defensor al lanzar, el pase se completa el{' '}
            <span className="text-emerald-400 font-bold">92%</span> de las veces. Si no, el{' '}
            <span className="text-rose-400 font-bold">44%</span>.
          </p>
          <p className="text-slate-500 text-sm mt-2">Temporada 2023, semanas 1 a 18</p>
        </div>
      </header>

      <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 pb-16 flex flex-col gap-8">

        {/* Tarjetas */}
        {t && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
            <MetricCard value={t.jugadas.toLocaleString()} label="Jugadas analizadas" note="Temporada regular 2023" accent="slate" />
            <MetricCard value={pct(t.pct_completo_general)} label="Pases completos (general)" accent="emerald" />
            <MetricCard value={pct(t.pct_completo_ventaja5)} label="Completos con ventaja +5 yd" note="Receptor 5+ yd sobre defensor" accent="emerald" />
            <MetricCard value={pct(t.pct_intercepcion_defensor2)} label="Intercepciones, defensor +2 yd" note="Defensor llega 2+ yd antes" accent="rose" />
          </section>
        )}

        {/* Pestañas pill sticky */}
        <div className="sticky top-0 backdrop-blur bg-slate-950/80 z-10 py-3 -mx-4 lg:-mx-8 px-4 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {TABS.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === tb.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >{tb.label}</button>
            ))}
          </div>
        </div>

        {/* Tab: Hallazgo */}
        {tab === 'hallazgo' && (
          <div className="flex flex-col gap-10">
            <Acto n="1" titulo="El hallazgo" frase="Dos yardas de ventaja al lanzar bastan para que el pase casi siempre se complete." />
            {metrics && <ChartPanel graficas={metrics.graficas} curva={curva} heatmap={heatmap} seccion="hallazgo" />}
            <p className="text-slate-400 text-xs uppercase tracking-wide -mb-6">Míralo en el campo: elige una jugada</p>
            <section className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
              <div className="flex flex-col">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Jugadas animables ({plays.length})</p>
                <PlayList plays={plays} selectedId={selectedId} onSelect={handleSelect} />
                <PlayRoster frames={frames} players={players} highlightId={highlightId} onHighlight={setHighlightId} />
              </div>
              <div className="flex flex-col gap-3">
                {selPlay ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    <span className="font-semibold text-slate-100">{selPlay.qb} → {selPlay.receptor}</span>
                    <span className={`font-bold ${RES_COLOR[selPlay.resultado] ?? 'text-slate-400'}`}>
                      {RES_LABEL[selPlay.resultado] ?? selPlay.resultado}
                    </span>
                    <span className="text-slate-400">{selPlay.ataque} vs {selPlay.defensa}</span>
                    <span className="text-slate-400">Q{selPlay.cuarto} · {selPlay.down}ª down</span>
                    <span className="text-slate-400">{selPlay.distancia_pase} yd · {selPlay.ruta}</span>
                    <span className="text-amber-300">{selPlay.grupo_ventaja}</span>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-slate-500">
                    Selecciona una jugada para ver los detalles
                  </div>
                )}
                {selPlay && <Narracion jugadaId={selPlay.jugada_id} />}
                <FieldAnimation frames={frames} externalHighlight={highlightId} onHighlightChange={setHighlightId} losX={selPlay?.los_x} primerDownX={selPlay?.primer_down_x} />
              </div>
            </section>

          </div>
        )}

        {tab === 'causa' && (
          <div className="flex flex-col gap-8">
            <Acto n="2" titulo="La causa" frase="La ventaja no es suerte: depende de la ruta contra la cobertura y del estilo del receptor." />
            {metrics && <ChartPanel graficas={metrics.graficas} curva={curva} heatmap={heatmap} seccion="causa" />}
            <ClustersPanel clusters={clusters} players={clusterPlayers} equipos={equipos} />
          </div>
        )}

        {tab === 'decision' && decision && <DecisionPanel data={decision} players={players} equipos={equipos} />}

        {tab === 'explorar' && (
          <div className="flex flex-col gap-6">
            <div className="flex gap-2">
              {(['equipos', 'jugadores'] as const).map(s => (
                <button key={s} onClick={() => setSubExplorar(s)}
                  className={`rounded-full border px-4 py-1 text-sm ${subExplorar === s ? 'border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                  {s === 'equipos' ? 'Equipos' : 'Jugadores'}
                </button>
              ))}
            </div>
            {subExplorar === 'equipos'   && <TeamsPanel   teams={teams}   equipos={equipos} />}
            {subExplorar === 'jugadores' && <PlayersPanel players={players} equipos={equipos} />}
          </div>
        )}
      </div>
    </div>
  )
}
