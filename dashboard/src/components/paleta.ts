// Colores para canvas, SVG y Recharts (los mismos que tailwind.config.js)
export const PALETA = {
  fondo: '#0F171E',
  superficie: '#1A242F',
  borde: '#2A3744',
  acento: '#00A8E1',
  texto: '#FFFFFF',
  secundario: '#8197A4',
  primerdown: '#FFD400',
  completo: '#1FBF6B',
  fallo: '#E5484D',
}

// semáforo de separación del receptor: 3+ yd, 1–3 yd, menos de 1 yd
export const colorSep = (sep: number) => (sep >= 3 ? PALETA.completo : sep >= 1 ? PALETA.primerdown : PALETA.fallo)
// semáforo del bolsillo del QB (distancia del rusher más cercano)
export const colorBolsillo = (d: number) => (d >= 4 ? PALETA.completo : d >= 2 ? PALETA.primerdown : PALETA.fallo)
// probabilidad de completar (mismos cortes que la gráfica de Inicio)
export const colorProb = (p: number) => (p < 0.5 ? PALETA.fallo : p < 0.7 ? PALETA.primerdown : PALETA.completo)

export const ROL_LABEL: Record<string, string> = {
  'Pass': 'Quarterback',
  'Pass Route': 'Receptor',
  'Pass Block': 'Bloqueo',
  'Pass Rush': 'Presión al QB',
  'Coverage': 'Cobertura',
}
