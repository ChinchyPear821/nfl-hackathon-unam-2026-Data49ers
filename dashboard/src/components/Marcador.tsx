import type { Equipo, Play } from '../api'
import { PALETA } from './paleta'

// Marcador estilo transmisión. Solo abreviaturas y colores (equipos.csv); sin logotipos.
// El dataset no trae tiempos fuera ni reloj de jugada, así que no se muestran.

export const textoCuarto = (c: number) => (c <= 4 ? `${c}º` : 'TE')

export function textoDown(p: Pick<Play, 'down' | 'yards_to_go' | 'primer_down_x'>) {
  const gol = p.primer_down_x != null && p.primer_down_x >= 110   // el primer down cae en la zona de anotación
  return `${p.down}º y ${gol ? 'gol' : p.yards_to_go}`
}

// los_x - 10 <= 50: yarda los_x - 10 del lado del ataque; si no, yarda 110 - los_x del rival
export function textoPosicion(p: Pick<Play, 'los_x' | 'ataque' | 'defensa'>) {
  if (p.los_x == null) return null
  const ladoPropio = p.los_x - 10 <= 50
  const yarda = Math.round(ladoPropio ? p.los_x - 10 : 110 - p.los_x)
  if (yarda === 50) return 'Balón en la 50'
  return `Balón en la ${yarda} de ${ladoPropio ? p.ataque : p.defensa}`
}

// texto oscuro sobre colores claros, blanco sobre oscuros (luminancia relativa)
function colorTexto(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.35 ? PALETA.fondo : PALETA.texto
}

function Insignia({ abrev, equipo }: { abrev: string; equipo?: Equipo }) {
  const fondo = equipo?.color_primario ?? PALETA.borde
  const borde = equipo?.color_secundario ?? PALETA.secundario
  return (
    <span
      className="flex items-center justify-center w-12 h-12 rounded-full font-display font-black italic text-sm tracking-tight shrink-0"
      style={{ background: fondo, color: colorTexto(fondo), boxShadow: `0 0 0 3px ${borde}` }}
    >
      {abrev}
    </span>
  )
}

// balón pequeño: indica qué equipo tiene la posesión
const Posesion = () => (
  <svg width="18" height="11" viewBox="0 0 18 11" aria-label="Posesión" role="img" className="shrink-0">
    <ellipse cx="9" cy="5.5" rx="8.5" ry="5" fill="#8b5a2b" stroke="#ffffff" strokeWidth="0.8" />
    <line x1="5.5" y1="5.5" x2="12.5" y2="5.5" stroke="#ffffff" strokeWidth="1" />
    {[7, 9, 11].map(x => <line key={x} x1={x} y1="4" x2={x} y2="7" stroke="#ffffff" strokeWidth="0.8" />)}
  </svg>
)

export default function Marcador({ play, equipos }: { play: Play; equipos: Map<string, Equipo> }) {
  const local = play.ataque_es_local ? play.ataque : play.defensa
  const visita = play.ataque_es_local ? play.defensa : play.ataque
  const puntos = (eq: string) => (eq === play.ataque ? play.marcador_ataque : play.marcador_defensa)
  const posicion = textoPosicion(play)
  const gol = play.primer_down_x != null && play.primer_down_x >= 110

  const lado = (eq: string, invertido: boolean) => (
    <div className={`flex items-center gap-2.5 ${invertido ? 'flex-row-reverse' : ''}`}>
      <Insignia abrev={eq} equipo={equipos.get(eq)} />
      <span className="font-display font-black text-4xl leading-none tabular-nums text-white w-12 text-center">
        {puntos(eq)}
      </span>
      <span className="w-[18px] flex justify-center">{eq === play.ataque && <Posesion />}</span>
    </div>
  )

  return (
    <div className="flex flex-col items-center select-none opacity-90">
      {/* barra superior: down y posición del balón */}
      <div className="flex items-center gap-3 rounded-t-md bg-fondo/80 backdrop-blur-sm border border-b-0 border-borde px-3 py-0.5">
        <span className={`font-display font-black italic uppercase text-sm tracking-tight ${gol ? 'text-primerdown' : 'text-white'}`}>
          {textoDown(play)}
        </span>
        {posicion && (
          <>
            <span className="w-px h-3 bg-borde" />
            <span className="font-display font-bold uppercase text-xs tracking-wide text-secundario">{posicion}</span>
          </>
        )}
      </div>
      {/* fila principal: visitante · reloj y cuarto · local */}
      <div className="flex items-center gap-3 rounded-xl bg-fondo/70 backdrop-blur-sm border border-borde px-3 py-2">
        {lado(visita, false)}
        <div className="flex flex-col items-center justify-center rounded-md bg-superficie/90 border border-borde px-3 py-1 min-w-[78px]">
          <span className="font-display font-black text-xl leading-none tabular-nums text-white">{play.reloj}</span>
          <span className="font-display font-black italic uppercase text-xs leading-tight text-acento">{textoCuarto(play.cuarto)}</span>
        </div>
        {lado(local, true)}
      </div>
    </div>
  )
}
