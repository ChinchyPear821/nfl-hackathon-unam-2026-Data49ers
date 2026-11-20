export interface Resumen {
  total_pases: number
  pct_completo_menos_1yd: number
  pct_completo_8_mas: number
  pct_hubo_mejor_opcion: number
  jugadas_animables: number
}

export interface SepRow {
  sep_yd: number
  jugadas: number
  pct_completo: number
  pct_intercepcion: number
}

export interface Play {
  jugada_id: string
  historia: string
  gameId: number
  playId: number
  descripcion: string
  resultado: 'C' | 'I' | 'IN'
  ataque: string
  defensa: string
  cuarto: number
  down: number
  yards_to_go: number
  yardas: number
  cobertura: string | null
  formacion: string | null
  semana: number
  reloj: string                // MM:SS que quedaban en el cuarto
  marcador_ataque: number
  marcador_defensa: number
  ataque_es_local: boolean
  qb: string
  receptor: string
  receptor_id: string
  receptor_camiseta: number | null
  sep_objetivo: number
  prob_completo: number
  mejor_nombre: string | null
  mejor_id: string | null
  mejor_camiseta: number | null
  mejor_sep: number | null
  mejor_prob: number | null
  habia_mejor_opcion: boolean
  seg_para_lanzar: number | null
  dist_rusher: number | null
  los_x: number | null
  primer_down_x: number | null
}

export interface Frame {
  frame: number
  seg: number
  fase: 'antes_snap' | 'jugada' | 'aire'
  entidad_id: string
  nombre: string
  camiseta: number | null
  posicion: string | null
  equipo: 'ataque' | 'defensa' | 'balon'
  rol: string
  es_balon: boolean
  x: number
  y: number
  sep: number | null
  dist_rusher: number | null
}

export interface Opcion {
  entidad_id: string
  nombre: string
  camiseta: number
  posicion: string | null
  sep: number
  prob_completo: number
  pasa_scrimmage: boolean
  pasa_primer_down: boolean
  es_objetivo: boolean
  es_mejor_opcion: boolean
}

export interface QBRow {
  qb: string
  equipo: string
  jugadas: number
  pct_completo: number
  capturas: number
  intercepciones: number
  yardas_por_jugada: number
  seg_para_lanzar: number
  pct_bajo_presion: number
  pct_completo_con_presion: number
  pct_completo_sin_presion: number
  sep_prom_objetivo: number
  pct_habia_mejor_opcion: number
}

export interface FormacionRow {
  formacion: string
  jugadas: number
  pct_completo: number
  pct_captura: number
  pct_bajo_presion: number
  seg_para_lanzar: number
  sep_prom_objetivo: number
  yardas_por_jugada: number
}

async function get<T>(ruta: string): Promise<T> {
  const r = await fetch(ruta)
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`)
  return r.json()
}

export const fetchResumen = () => get<Resumen>('api/resumen')
export const fetchSeparacion = () => get<SepRow[]>('api/separacion')
export const fetchJugadas = () => get<Play[]>('api/jugadas')
export const fetchFrames = (id: string) => get<Frame[]>(`api/jugadas/${encodeURIComponent(id)}/frames`)

export const fetchOpciones = (id: string) => get<Opcion[]>(`api/jugadas/${encodeURIComponent(id)}/opciones`)
export const fetchQBs = () => get<QBRow[]>('api/qbs')
export const fetchFormaciones = () => get<FormacionRow[]>('api/formaciones')

// solo cosmético: colores del marcador
export interface Equipo {
  equipo: string
  nombre: string
  ciudad: string
  color_primario: string
  color_secundario: string
}
export const fetchEquipos = () => get<Equipo[]>('api/equipos')

export const RESULTADO: Record<Play['resultado'], { texto: string; color: string }> = {
  C: { texto: 'Completo', color: 'text-completo' },
  I: { texto: 'Incompleto', color: 'text-fallo' },
  IN: { texto: 'Interceptado', color: 'text-fallo' },
}

export interface Narracion {
  disponible: boolean
  contexto: string | null
  jugada: string | null
  alternativa: string | null
  motivo?: string
}
export const fetchNarracion = (id: string) => get<Narracion>(`api/jugadas/${encodeURIComponent(id)}/narracion`)
