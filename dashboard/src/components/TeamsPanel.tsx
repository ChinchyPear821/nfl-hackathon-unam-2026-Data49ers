import { useState } from 'react'
import type { Team, Equipo } from '../api'

interface Props {
  teams: Team[]
  equipos: Equipo[]
}

type Col = 'equipo' | 'jugadas' | 'pct_completo' | 'pct_intercepcion' | 'epa_prom' | 'yardas_prom' | 'ventaja_prom' | 'def_pct_completo_permitido' | 'def_ventaja_permitida' | 'def_intercepciones'

function pct(v: number | null) { return v != null ? `${Math.round(v * 100)}%` : '—' }
function num(v: number | null, d = 1) { return v != null ? v.toFixed(d) : '—' }

function corr(xs: number[], ys: number[]) {
  const n = xs.length
  if (n < 3) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0
}

function Badge({ abbr, equipos }: { abbr: string; equipos: Equipo[] }) {
  const eq = equipos.find(e => e.equipo === abbr)
  const bg  = eq?.color_primario   ?? '#334155'
  const bdr = eq?.color_secundario ?? '#64748b'
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold shrink-0"
      style={{ background: bg, boxShadow: `0 0 0 2px ${bdr}` }}
    >
      {abbr}
    </span>
  )
}

export default function TeamsPanel({ teams, equipos }: Props) {
  const [sortCol, setSortCol] = useState<Col>('jugadas')
  const [sortAsc, setSortAsc] = useState(false)

  function toggleSort(col: Col) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(false) }
  }

  const sorted = [...teams].sort((a, b) => {
    const av = a[sortCol] ?? -Infinity
    const bv = b[sortCol] ?? -Infinity
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  function Th({ col, label }: { col: Col; label: string }) {
    const active = sortCol === col
    return (
      <th
        className="pb-3 pr-4 font-medium text-slate-400 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-nowrap"
        onClick={() => toggleSort(col)}
      >
        {label}{' '}
        <span className="text-slate-600">{active ? (sortAsc ? '↑' : '↓') : '↕'}</span>
      </th>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20">
      <h2 className="text-slate-100 font-semibold mb-2 text-lg">Equipos: ataque y defensa</h2>
      {(() => {
        const ok = teams.filter(t => t.def_ventaja_permitida != null && t.def_pct_completo_permitido != null)
        const r = corr(ok.map(t => t.def_ventaja_permitida!), ok.map(t => t.def_pct_completo_permitido!))
        const mejor = [...ok].sort((a, b) => a.def_ventaja_permitida! - b.def_ventaja_permitida!)[0]
        return ok.length > 2 && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-slate-200">
            El hallazgo también aplica a equipos: las defensas que permiten menos ventaja al lanzar permiten menos pases completos
            (correlación <span className="font-semibold text-emerald-300">{r.toFixed(2)}</span> entre 32 equipos).
            {mejor && <> La que menos ventaja permite: <span className="font-semibold">{mejor.equipo}</span> ({num(mejor.def_ventaja_permitida)} yd, {pct(mejor.def_pct_completo_permitido)} completos permitidos).</>}
          </div>
        )
      })()}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-slate-900 z-10">
            <tr>
              <Th col="equipo"          label="Equipo" />
              <Th col="jugadas"         label="Jugadas" />
              <Th col="pct_completo"    label="% Completo" />
              <Th col="pct_intercepcion" label="% Intercep." />
              <Th col="epa_prom"        label="EPA prom" />
              <Th col="yardas_prom"     label="Yardas prom" />
              <Th col="ventaja_prom"    label="Ventaja (ataque)" />
              <Th col="def_ventaja_permitida" label="Ventaja permitida" />
              <Th col="def_pct_completo_permitido" label="% Comp. permitido" />
              <Th col="def_intercepciones" label="INT logradas" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => {
              const eq = equipos.find(e => e.equipo === t.equipo)
              return (
                <tr key={t.equipo} className={`border-t border-slate-800 ${i % 2 === 0 ? 'bg-slate-900/40' : ''} hover:bg-slate-800/60 transition-colors`}>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-3">
                      <Badge abbr={t.equipo} equipos={equipos} />
                      <div>
                        <p className="text-slate-100 font-medium">{eq?.nombre ?? t.equipo}</p>
                        <p className="text-slate-500 text-xs">{eq?.ciudad ?? ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-300">{t.jugadas.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-400 font-medium">{pct(t.pct_completo)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-rose-400">{pct(t.pct_intercepcion)}</td>
                  <td className={`py-2.5 pr-4 text-right tabular-nums font-medium ${(t.epa_prom ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {num(t.epa_prom, 3)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-300">{num(t.yardas_prom)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-amber-300">{num(t.ventaja_prom)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-amber-300">{num(t.def_ventaja_permitida)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-300">{pct(t.def_pct_completo_permitido)}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-300">{t.def_intercepciones ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
