import type { Frame, RiesgoCuadro } from '../api'
import { PALETA } from './paleta'

// Nivel del medidor según el porcentaje mostrado (redondeado, para que número y etiqueta coincidan)
export function nivelRiesgo(pct: number) {
  if (pct < 38) return { texto: 'Bolsillo estable', color: PALETA.completo }
  if (pct < 65) return { texto: 'Alerta de presión', color: PALETA.primerdown }
  return { texto: 'Colapso inminente', color: PALETA.fallo }
}

// Riesgo para cada cuadro de la jugada:
// antes del snap -> null ("—"); del snap al lanzamiento -> valor de riesgo.csv;
// después del lanzamiento -> se queda con el último valor disponible.
export function riesgoPorCuadro(frames: Frame[], riesgo: RiesgoCuadro[]): Map<number, number | null> {
  const porFrame = new Map(riesgo.map(r => [r.frame, r.riesgo]))
  const segDe = new Map<number, number>()
  frames.forEach(f => { if (!segDe.has(f.frame)) segDe.set(f.frame, f.seg) })
  const cuadros = [...segDe.keys()].sort((a, b) => a - b)
  const out = new Map<number, number | null>()
  let ultimo: number | null = null
  for (const n of cuadros) {
    const v = porFrame.get(n)
    if (v != null) ultimo = v
    out.set(n, (segDe.get(n) ?? 0) < 0 ? null : ultimo)
  }
  return out
}
