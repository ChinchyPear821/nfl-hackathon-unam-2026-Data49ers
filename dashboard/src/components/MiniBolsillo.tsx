import { PALETA, colorBolsillo } from './paleta'
import { nivelRiesgo } from './riesgo'

interface Props {
  serie: { seg: number; d: number }[]          // distancia del rusher más cercano al QB por cuadro
  serieRiesgo?: { seg: number; r: number }[]   // riesgo de presión del modelo (0–1), del snap al lanzamiento
  seg: number                                  // segundo del cuadro actual
  segLanzamiento: number | null
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)
const COLOR_RIESGO = PALETA.acento
const COLOR_AHORA = PALETA.primerdown

// Distancia del rusher (eje izquierdo, yd) y riesgo del modelo (eje derecho, %) contra el tiempo,
// con línea vertical en el cuadro actual
export default function MiniBolsillo({ serie, serieRiesgo = [], seg, segLanzamiento }: Props) {
  if (serie.length < 2) return <p className="text-xs text-secundario">Sin datos de presión en esta jugada.</p>
  const hayRiesgo = serieRiesgo.length >= 2
  const W = 320, H = 142, PL = 28, PR = hayRiesgo ? 34 : 8, PT = 22, PB = 20
  const t0 = serie[0].seg, t1 = serie[serie.length - 1].seg
  const dMax = Math.max(6, Math.ceil(Math.max(...serie.map(p => p.d))))
  const X = (t: number) => PL + ((t - t0) / (t1 - t0 || 1)) * (W - PL - PR)
  const Y = (d: number) => PT + (1 - d / dMax) * (H - PT - PB)
  const YR = (r: number) => PT + (1 - r) * (H - PT - PB)          // 0–1 -> eje derecho
  const pts = serie.map(p => `${X(p.seg).toFixed(1)},${Y(p.d).toFixed(1)}`).join(' ')
  const ptsR = serieRiesgo.map(p => `${X(p.seg).toFixed(1)},${YR(p.r).toFixed(1)}`).join(' ')
  const xs = X(clamp(seg, t0, t1))
  const actual = serie.reduce((a, b) => (Math.abs(b.seg - seg) < Math.abs(a.seg - seg) ? b : a))
  // riesgo en el cuadro actual: nada antes del snap; después del lanzamiento, el último valor
  const rAhora = !hayRiesgo || seg < serieRiesgo[0].seg - 0.05
    ? null
    : serieRiesgo.reduce((a, b) => (b.seg <= seg + 0.05 ? b : a), serieRiesgo[0])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label={`Distancia del rusher más cercano al QB${hayRiesgo ? ' y riesgo de presión del modelo' : ''} contra el tiempo`}>
      {/* leyenda */}
      <g fontSize="9.5" fontWeight="800">
        <line x1={PL} y1={8} x2={PL + 14} y2={8} stroke={PALETA.texto} strokeWidth="2" />
        <text x={PL + 18} y={11} fill={PALETA.texto}>Rusher al QB (yd)</text>
        {hayRiesgo && (
          <>
            <line x1={PL + 118} y1={8} x2={PL + 132} y2={8} stroke={COLOR_RIESGO} strokeWidth="2" />
            <text x={PL + 136} y={11} fill={COLOR_RIESGO}>Riesgo IA (%)</text>
          </>
        )}
      </g>

      {/* eje izquierdo: yardas */}
      {[0, 2, 4, dMax].filter((v, i, a) => a.indexOf(v) === i).map(v => (
        <g key={v}>
          <line x1={PL} y1={Y(v)} x2={W - PR} y2={Y(v)} stroke={PALETA.borde} />
          <text x={PL - 4} y={Y(v) + 3} fontSize="10" fontWeight="700" fill={PALETA.secundario} textAnchor="end">{v}</text>
        </g>
      ))}
      {/* eje derecho: riesgo 0–100% */}
      {hayRiesgo && [0, 0.5, 1].map(v => (
        <text key={v} x={W - PR + 4} y={YR(v) + 3} fontSize="10" fontWeight="700" fill={COLOR_RIESGO}>{Math.round(v * 100)}%</text>
      ))}

      <line x1={PL} y1={Y(2)} x2={W - PR} y2={Y(2)} stroke={PALETA.fallo} strokeDasharray="3 3" />
      {segLanzamiento != null && (
        <g>
          <line x1={X(segLanzamiento)} y1={PT} x2={X(segLanzamiento)} y2={Y(0)} stroke={PALETA.secundario} strokeDasharray="2 3" />
          <text x={X(segLanzamiento) - 3} y={PT + 9} fontSize="9" fontWeight="700" fill={PALETA.secundario} textAnchor="end">lanza</text>
        </g>
      )}
      <text x={PL} y={H - 5} fontSize="10" fontWeight="700" fill={PALETA.secundario}>{t0.toFixed(1)} s</text>
      <text x={W - PR} y={H - 5} fontSize="10" fontWeight="700" fill={PALETA.secundario} textAnchor="end">{t1.toFixed(1)} s</text>

      <polyline points={pts} fill="none" stroke={PALETA.texto} strokeWidth="2" />
      {hayRiesgo && <polyline points={ptsR} fill="none" stroke={COLOR_RIESGO} strokeWidth="2.2" />}

      {/* cuadro actual */}
      <line x1={xs} y1={PT} x2={xs} y2={Y(0)} stroke={COLOR_AHORA} strokeWidth="2" />
      <circle cx={X(actual.seg)} cy={Y(actual.d)} r="4.5" fill={colorBolsillo(actual.d)} stroke={PALETA.texto} strokeWidth="1.5" />
      {rAhora && (
        <circle cx={X(rAhora.seg)} cy={YR(rAhora.r)} r="4.5"
          fill={nivelRiesgo(Math.round(rAhora.r * 100)).color} stroke={PALETA.texto} strokeWidth="1.5" />
      )}
    </svg>
  )
}
