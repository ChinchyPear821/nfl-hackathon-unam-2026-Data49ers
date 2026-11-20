import { PALETA, colorBolsillo } from './paleta'

interface Props {
  serie: { seg: number; d: number }[]   // distancia del rusher más cercano al QB por cuadro
  seg: number                            // segundo del cuadro actual
  segLanzamiento: number | null
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

// Línea de dist_rusher del QB contra el tiempo, con línea vertical en el cuadro actual
export default function MiniBolsillo({ serie, seg, segLanzamiento }: Props) {
  if (serie.length < 2) return <p className="text-xs text-secundario">Sin datos de presión en esta jugada.</p>
  const W = 320, H = 130, PL = 28, PR = 8, PT = 10, PB = 20
  const t0 = serie[0].seg, t1 = serie[serie.length - 1].seg
  const dMax = Math.max(6, Math.ceil(Math.max(...serie.map(p => p.d))))
  const X = (t: number) => PL + ((t - t0) / (t1 - t0 || 1)) * (W - PL - PR)
  const Y = (d: number) => PT + (1 - d / dMax) * (H - PT - PB)
  const pts = serie.map(p => `${X(p.seg).toFixed(1)},${Y(p.d).toFixed(1)}`).join(' ')
  const xs = X(clamp(seg, t0, t1))
  const actual = serie.reduce((a, b) => (Math.abs(b.seg - seg) < Math.abs(a.seg - seg) ? b : a))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Distancia del rusher más cercano al QB contra el tiempo">
      {[0, 2, 4, dMax].filter((v, i, a) => a.indexOf(v) === i).map(v => (
        <g key={v}>
          <line x1={PL} y1={Y(v)} x2={W - PR} y2={Y(v)} stroke={PALETA.borde} />
          <text x={PL - 4} y={Y(v) + 3} fontSize="10" fontWeight="700" fill={PALETA.secundario} textAnchor="end">{v}</text>
        </g>
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
      <line x1={xs} y1={PT} x2={xs} y2={Y(0)} stroke={PALETA.acento} strokeWidth="2" />
      <circle cx={X(actual.seg)} cy={Y(actual.d)} r="4.5" fill={colorBolsillo(actual.d)} stroke={PALETA.texto} strokeWidth="1.5" />
    </svg>
  )
}
