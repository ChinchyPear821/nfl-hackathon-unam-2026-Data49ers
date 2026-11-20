interface Props {
  value: string
  label: string
  note?: string
  accent?: 'completo' | 'fallo' | 'primerdown' | 'acento' | 'blanco'
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

export default function MetricCard({ value, label, note, accent = 'blanco' }: Props) {
  return (
    <div className="relative overflow-hidden bg-superficie border border-borde rounded-2xl p-6 flex flex-col gap-2">
      <span className={`absolute left-0 top-0 h-full w-1.5 ${BARRA[accent]}`} />
      <span className={`font-display text-6xl md:text-7xl font-black italic tabular-nums leading-none ${ACCENT[accent]}`}>{value}</span>
      <span className="text-white font-bold text-base leading-tight">{label}</span>
      {note && <span className="text-secundario text-xs font-semibold uppercase tracking-wide">{note}</span>}
    </div>
  )
}
