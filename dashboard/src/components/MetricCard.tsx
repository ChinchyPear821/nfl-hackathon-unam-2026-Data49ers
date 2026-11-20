interface Props {
  value: string
  label: string
  note?: string
  accent?: 'emerald' | 'rose' | 'amber' | 'slate'
}

const ACCENT = {
  emerald: 'text-emerald-400',
  rose:    'text-rose-400',
  amber:   'text-amber-300',
  slate:   'text-slate-100',
}

export default function MetricCard({ value, label, note, accent = 'slate' }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20 flex flex-col gap-1">
      <span className={`text-4xl font-bold tabular-nums ${ACCENT[accent]}`}>{value}</span>
      <span className="text-slate-100 font-medium leading-tight">{label}</span>
      {note && <span className="text-slate-400 text-xs mt-0.5">{note}</span>}
    </div>
  )
}
