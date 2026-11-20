import { PALETA } from './paleta'
import { nivelRiesgo } from './riesgo'

// Anillo con el riesgo de presión del cuadro actual. valor: 0–1, o null antes del snap ("—").
export default function MedidorRiesgo({ valor }: { valor: number | null }) {
  const pct = valor == null ? null : Math.round(valor * 100)
  const nivel = pct == null ? null : nivelRiesgo(pct)
  const R = 34, C = 2 * Math.PI * R
  const lleno = pct == null ? 0 : Math.min(Math.max(pct, 0), 100) / 100

  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl bg-fondo/75 backdrop-blur-sm border border-borde px-2.5 py-2 w-[132px] select-none"
      role="img"
      aria-label={pct == null ? 'Riesgo de presión: sin valor antes del snap' : `Riesgo de presión ${pct}%: ${nivel!.texto}`}
    >
      <p className="font-display font-black uppercase text-[10px] leading-tight tracking-wide text-white text-center">
        Riesgo de presión · IA
      </p>
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        <circle cx="44" cy="44" r={R} fill="none" stroke={PALETA.borde} strokeWidth="9" />
        <circle
          cx="44" cy="44" r={R} fill="none"
          stroke={nivel?.color ?? PALETA.borde} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - lleno)}
          transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.2s' }}
        />
        <text
          x="44" y="45" textAnchor="middle" dominantBaseline="middle"
          fontSize={pct == null ? 26 : 24} fontWeight="900" fontStyle="italic"
          fill={nivel?.color ?? PALETA.secundario}
          style={{ fontFamily: '"Arial Narrow", "Roboto Condensed", Arial, sans-serif' }}
        >
          {pct == null ? '—' : `${pct}%`}
        </text>
      </svg>
      {nivel && (
        <span
          className="rounded px-1.5 py-0.5 font-display font-black uppercase text-[10px] tracking-wide text-center leading-tight"
          style={{ color: nivel.color, background: `${nivel.color}22`, border: `1px solid ${nivel.color}66` }}
        >
          {nivel.texto}
        </span>
      )}
    </div>
  )
}
