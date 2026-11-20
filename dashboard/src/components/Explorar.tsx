import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEquipos, fetchFrames, fetchJugadas, fetchOpciones, fetchQBs, fetchRiesgo } from '../api'
import type { Equipo, Frame, Opcion, Play, QBRow, RiesgoCuadro } from '../api'
import FiltrosJugadas, { FILTROS_VACIOS, filtrar } from './FiltrosJugadas'
import type { Filtros } from './FiltrosJugadas'
import FieldAnimation from './FieldAnimation'
import PanelJugada from './PanelJugada'
import type { Pestana } from './PanelJugada'
import Comentarista from './Comentarista'

export default function Explorar() {
  const [plays, setPlays] = useState<Play[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [playId, setPlayId] = useState<string | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [opciones, setOpciones] = useState<Opcion[]>([])
  const [riesgo, setRiesgo] = useState<RiesgoCuadro[]>([])
  const [qbs, setQbs] = useState<QBRow[]>([])
  const [equipos, setEquipos] = useState<Map<string, Equipo>>(new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [frameActual, setFrameActual] = useState<number | null>(null)
  const [pestana, setPestana] = useState<Pestana>('receptores')
  const [opcionHover, setOpcionHover] = useState<string | null>(null)
  const [modo3d, setModo3d] = useState(false)

  useEffect(() => {
    fetchJugadas()
      .then(p => { setPlays(p); if (p.length) setPlayId(p[0].jugada_id) })
      .catch(e => setError(String(e)))
    fetchQBs().then(setQbs).catch(() => setQbs([]))
    // solo colores del marcador: si falla, el marcador usa colores neutros
    fetchEquipos().then(e => setEquipos(new Map(e.map(x => [x.equipo, x])))).catch(() => {})
  }, [])

  const filtradas = useMemo(() => filtrar(plays, filtros), [plays, filtros])

  // si los filtros dejan fuera la jugada actual, pasar a la primera que sí cumple
  useEffect(() => {
    if (filtradas.length && !filtradas.some(p => p.jugada_id === playId)) setPlayId(filtradas[0].jugada_id)
  }, [filtradas, playId])

  useEffect(() => {
    if (!playId) return
    let vigente = true
    setSelectedId(null)
    setOpcionHover(null)
    setFrames([])
    setOpciones([])
    setRiesgo([])
    fetchOpciones(playId).then(o => { if (vigente) setOpciones(o) }).catch(() => { if (vigente) setOpciones([]) })
    // opcional: si falla, simplemente no se muestra el medidor
    fetchRiesgo(playId).then(r => { if (vigente) setRiesgo(r) }).catch(() => { if (vigente) setRiesgo([]) })
    fetchFrames(playId)
      .then(f => { if (vigente) setFrames(f) })
      .catch(e => { if (vigente) setError(String(e)) })
    return () => { vigente = false }
  }, [playId])

  // en la pausa del lanzamiento, mostrar las opciones del QB
  const alLanzar = useCallback(() => setPestana('receptores'), [])

  const play = plays.find(p => p.jugada_id === playId) ?? null

  if (error) return <p className="text-fallo font-bold py-10">No se pudieron cargar los datos: {error}</p>
  if (!plays.length) return <p className="text-secundario font-bold py-10">Cargando jugadas...</p>

  return (
    <div className="flex flex-col gap-4 py-4">
      <FiltrosJugadas
        plays={plays}
        filtradas={filtradas}
        filtros={filtros}
        onFiltros={setFiltros}
        playId={playId}
        onPlay={setPlayId}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
        <main className="min-w-0">
          {play && (
            <FieldAnimation
              frames={frames}
              play={play}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onFrame={setFrameActual}
              opcionHover={opcionHover}
              onLanzamiento={alLanzar}
              modo3d={modo3d}
              onModo3d={setModo3d}
              pie={<Comentarista jugadaId={play.jugada_id} />}
              equipos={equipos}
              riesgo={riesgo}
            />
          )}
        </main>

        <aside className="min-w-0">
          {play && (
            <PanelJugada
              play={play}
              qbs={qbs}
              frames={frames}
              riesgo={riesgo}
              frameActual={frameActual}
              opciones={opciones}
              selectedId={selectedId}
              onSelect={setSelectedId}
              pestana={pestana}
              onPestana={setPestana}
              opcionHover={opcionHover}
              onOpcionHover={setOpcionHover}
              modo3d={modo3d}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
