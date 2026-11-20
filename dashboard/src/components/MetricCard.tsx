interface Props {
  value: string
  label: string
  sub?: string                 // segunda línea, debajo de la etiqueta
  note?: string                // letra pequeña
  accent?: 'completo' | 'fallo' | 'primerdown' | 'acento' | 'blanco'
  size?: 'lg' | 'md'           // 'md' para cifras largas ("6 de cada 10")
}

const ACCENT = {
  completo: 'text-completo',
  fallo: 'text-fallo',
  primerdown: 'text-primerdown',
  acento: 'text-acento',
  blanco: 'text-white',
}
const BARRA = {
  completo: 'bg-completo',
  fallo: 'bg-fallo',
  primerdown: 'bg-primerdown',
  acento: 'bg-acento',
  blanco: 'bg-white',
}
const TAMANO = {
  lg: 'text-6xl md:text-7xl',
  md: 'text-5xl md:text-6xl',
}

export default function MetricCard({ value, label, sub, note, accent = 'blanco', size = 'lg' }: Props) {
  return (
    <div className="relative overflow-hidden bg-superficie border border-borde rounded-2xl p-6 flex flex-col gap-2">
      <span className={`absolute left-0 top-0 h-full w-1.5 ${BARRA[accent]}`} />
      <span className={`font-display ${TAMANO[size]} font-black italic tabular-nums leading-none ${ACCENT[accent]}`}>{value}</span>
      <span className="text-white font-bold text-base leading-tight">{label}</span>
      {sub && <span className="text-white/80 font-semibold text-sm leading-snug">{sub}</span>}
      {note && <span className="text-secundario text-xs font-semibold uppercase tracking-wide">{note}</span>}
    </div>
  )
}
