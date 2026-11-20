export interface Play {
  jugada_id: string; descripcion: string; resultado: 'C' | 'I' | 'IN'
  ataque: string; defensa: string; cuarto: string; down: string; yards_to_go: number
  ruta: string; cobertura: string; distancia_pase: number; yardas: number; epa: number
  qb: string; receptor: string; receptor_id: string
  dist_receptor: number; dist_defensor: number; ventaja: number
  vel_requerida: number; vel_receptor: number; brecha_vel: number; grupo_ventaja: string
  los_x: number | null; primer_down_x: number | null
}

export interface Frame {
  jugada_id: string; frame: number; fase: string; entidad_id: string
  nombre: string; equipo: string; rol: string; posicion: string; es_balon: string; x: number; y: number
}

export interface Totales {
  jugadas: number; pct_completo_general: number
  pct_completo_ventaja5: number; pct_intercepcion_defensor2: number
}
export interface GraficaRow {
  grafica: string; categoria: string; jugadas: number; pct_completo: number; pct_intercepcion: number
}
export interface MetricsResponse { totales: Totales; graficas: GraficaRow[] }

export interface Player {
  entidad_id: string; nfl_id: string; nombre: string; posicion: string
  estatura: string; peso_lb: number | null; nacimiento: string; equipo: string
  jugadas: number | null; vel_max: number | null
  // receptor
  veces_objetivo: number | null; pct_completo_objetivo: number | null
  ventaja_prom_objetivo: number | null; yardas_objetivo: number | null
  // QB
  qb_pases: number | null; qb_pct_completo: number | null; qb_pct_intercepcion: number | null
  qb_ventaja_prom: number | null; qb_distancia_prom: number | null; qb_epa_prom: number | null
  // defensor
  def_veces_cercano: number | null; def_pct_completo_permitido: number | null
  def_intercepciones: number | null; def_ventaja_prom_permitida: number | null
  // cluster
  cluster: string | null; cluster_nombre: string | null
  pc1: number | null; pc2: number | null
  vel_max_prom: number | null; acel_p90: number | null; profundidad: number | null
  desp_lateral: number | null; sinuosidad: number | null; ventaja_prom: number | null
}

export interface Team {
  equipo: string; jugadas: number
  pct_completo: number | null; pct_intercepcion: number | null
  epa_prom: number | null; yardas_prom: number | null; ventaja_prom: number | null
  def_jugadas: number | null; def_pct_completo_permitido: number | null
  def_intercepciones: number | null; def_ventaja_permitida: number | null; def_epa_permitido: number | null
}

export interface Narracion { disponible: boolean; texto: string | null; motivo?: string }
export const fetchNarracion = (id: string): Promise<Narracion> =>
  fetch(`api/plays/${id}/narracion`).then(r => r.json())

export interface Equipo {
  equipo: string; nombre: string; ciudad: string; color_primario: string; color_secundario: string
}

export interface CurvaVentaja {
  ventaja_yd: number; jugadas: number; pct_completo: number; pct_intercepcion: number
}

export interface HeatmapRow {
  ruta: string; cobertura: string; jugadas: number
  pct_completo: number; ventaja_prom: number; epa_prom: number
}

export interface ClusterRow {
  cluster: number; cluster_nombre: string; jugadores: number
  vel_max_prom: number; acel_p90: number; profundidad: number
  desp_lateral: number; sinuosidad: number; ventaja_prom: number
}

export interface ClusterPlayer {
  entidad_id: string; nombre: string; posicion: string; equipo: string
  jugadas: number | null; vel_max: number | null
  pc1: number | null; pc2: number | null
  ventaja_prom_objetivo: number | null; pct_completo_objetivo: number | null
  cluster_nombre: string | null
}

export const fetchPlays    = (): Promise<Play[]>          => fetch('api/plays').then(r => r.json())
export const fetchFrames   = (id: string): Promise<Frame[]> => fetch(`api/plays/${id}/frames`).then(r => r.json())
export const fetchMetrics  = (): Promise<MetricsResponse> => fetch('api/metrics').then(r => r.json())
export const fetchPlayers  = (): Promise<Player[]>        => fetch('api/players').then(r => r.json())
export const fetchTeams    = (): Promise<Team[]>          => fetch('api/teams').then(r => r.json())
export const fetchEquipos  = (): Promise<Equipo[]>        => fetch('api/equipos').then(r => r.json())
export const fetchCurva    = (): Promise<CurvaVentaja[]>  => fetch('api/curva-ventaja').then(r => r.json())
export const fetchHeatmap  = (): Promise<HeatmapRow[]>    => fetch('api/heatmap').then(r => r.json())
export const fetchClusters = (): Promise<ClusterRow[]>    => fetch('api/clusters').then(r => r.json())
export const fetchClusterJugadores = (id: number): Promise<ClusterPlayer[]> =>
  fetch(`api/clusters/${id}/jugadores`).then(r => r.json())

export type Situacion = 'primera' | 'tercera_corta' | 'tercera_larga'

export interface SituacionResumen {
  situacion: Situacion; jugadas: number; pct_pases_con_ventaja: number
  pct_completo_con_ventaja: number; pct_completo_sin_ventaja: number; pct_conversion: number
}
export interface SituacionRuta {
  situacion: Situacion; ruta: string; jugadas: number; ventaja_prom: number
  pct_completo: number; pct_conversion: number; epa_prom: number
}
export interface ReceptorRuta {
  ruta: string; receptor: string; entidad_id: string; equipo: string; jugadas: number
  ventaja_prom: number; pct_completo: number; yardas_prom: number
}
export interface RivalRow {
  equipo: string; situacion: Situacion; jugadas: number; ventaja_permitida: number
  pct_completo_permitido: number; pct_conversion_permitida: number
}
export interface Decision {
  situaciones: SituacionResumen[]; rutas: SituacionRuta[]; receptores: ReceptorRuta[]; rival: RivalRow[]
}
export const fetchDecision = (): Promise<Decision> => fetch('api/decision').then(r => r.json())
