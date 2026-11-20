import { useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { fetchCurvaBolsillo, fetchFormaciones, fetchResumen, fetchSeparacion } from '../api'
import type { CurvaRow, FormacionRow, Resumen, SepRow } from '../api'
import MetricCard from './MetricCard'
import { COLOR_VEREDICTO, PALETA, VEREDICTOS } from './paleta'

const MIN_JUGADAS_CURVA = 30   // por debajo, la línea se corta (tramo poco confiable)

// una fila por segundo con la distancia mediana de cada veredicto (null = línea cortada)
function pivotCurva(filas: CurvaRow[]) {
  const porSeg = new Map<number, Record<string, number | null>>()
  filas.forEach(f => {
    const s = Math.round(f.seg * 10) / 10
    if (!porSeg.has(s)) porSeg.set(s, { seg: s })
    porSeg.get(s)![f.veredicto_presion] = f.jugadas >= MIN_JUGADAS_CURVA ? f.dist_mediana : null
  })
  return [...porSeg.values()].sort((a, b) => (a.seg as number) - (b.seg as number))
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const colorBarra = (p: number) => (p < 0.5 ? PALETA.fallo : p < 0.7 ? PALETA.primerdown : PALETA.completo)
const tooltipEstilo = {
  background: PALETA.superficie,
  border: `1px solid ${PALETA.borde}`,
  borderRadius: 12,
  color: PALETA.texto,
  fontWeight: 700,
}
const titulo = 'font-display font-black italic uppercase tracking-tight'

export default function Inicio({ onExplorar }: { onExplorar: () => void }) {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [sep, setSep] = useState<SepRow[]>([])
  const [forma, setForma] = useState<FormacionRow[]>([])
  const [curva, setCurva] = useState<CurvaRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchResumen(), fetchSeparacion()])
      .then(([r, s]) => { setResumen(r); setSep(s) })
      .catch(e => setError(String(e)))
    fetchFormaciones().then(setForma).catch(() => setForma([]))
    fetchCurvaBolsillo().then(setCurva).catch(() => setCurva([]))
  }, [])

  const datosCurva = pivotCurva(curva)

  const datosForma = forma.map(f => ({ ...f, pct: Math.round(f.pct_completo * 1000) / 10 }))

  const datos = sep.map(r => ({
    ...r,
    etiqueta: r.sep_yd >= 8 ? '8+' : String(r.sep_yd),
    pct: Math.round(r.pct_completo * 1000) / 10,
  }))

  return (
    <div className="flex flex-col items-center gap-10 py-6">
      <video
        src="se_completara_el_pase.mp4"
        autoPlay muted loop playsInline controls
        className="w-full max-w-[1280px] aspect-video rounded-2xl border border-borde bg-black"
      />

      <div className="text-center max-w-4xl">
        <h1 className={`${titulo} text-5xl md:text-7xl leading-none`}>¿Se completará el pase?</h1>
        <p className="text-secundario mt-4 text-xl font-bold">La separación del receptor al lanzar predice el resultado.</p>
      </div>

      {error && <p className="text-fallo font-bold">No se pudieron cargar los datos: {error}</p>}

      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-[1280px]">
          <MetricCard
            value={pct(resumen.pct_completo_menos_1yd)}
            label="de los pases se completan con el receptor a menos de 1 yarda del defensor"
            accent="fallo"
          />
          <MetricCard
            value={pct(resumen.pct_completo_8_mas)}
            label="se completan cuando el receptor tiene 8 yardas o más de espacio"
            accent="completo"
          />
          <MetricCard
            value={pct(resumen.pct_hubo_mejor_opcion)}
            label="de los pases tenían otro receptor más abierto"
            note={`Sobre ${resumen.total_pases.toLocaleString('es-MX')} pases`}
            accent="primerdown"
          />
        </div>
      )}

      {datos.length > 0 && (
        <section className="w-full max-w-[1280px] bg-superficie border border-borde rounded-2xl p-4 md:p-6">
          <h2 className={`${titulo} text-2xl md:text-3xl mb-1`}>Más espacio, más pases completos</h2>
          <p className="text-sm text-secundario font-semibold mb-4">Porcentaje de pases completos según las yardas entre el receptor y el defensor más cercano.</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 16, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid stroke={PALETA.borde} vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  stroke={PALETA.secundario}
                  tick={{ fill: PALETA.secundario, fontWeight: 700 }}
                  label={{ value: 'yardas de separación', position: 'insideBottom', offset: -12, fill: PALETA.secundario }}
                />
                <YAxis
                  stroke={PALETA.secundario}
                  tick={{ fill: PALETA.secundario, fontWeight: 700 }}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  label={{ value: '% completos', angle: -90, position: 'insideLeft', fill: PALETA.secundario }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(129,151,164,0.12)' }}
                  contentStyle={tooltipEstilo}
                  labelStyle={{ color: PALETA.texto }}
                  labelFormatter={l => `${l} yd de separación`}
                  formatter={(v, _n, item) => [`${v}% (${(item.payload as SepRow).jugadas.toLocaleString('es-MX')} pases)`, 'Completos']}
                />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  {datos.map(d => <Cell key={d.sep_yd} fill={colorBarra(d.pct_completo)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {datosForma.length > 0 && (
        <section className="w-full max-w-[1280px] bg-superficie border border-borde rounded-2xl p-4 md:p-6">
          <h2 className={`${titulo} text-2xl md:text-3xl mb-1`}>La formación casi no cambia el resultado; la separación sí</h2>
          <p className="text-sm text-secundario font-semibold mb-3">Porcentaje de pases completos según la formación ofensiva.</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosForma} layout="vertical" margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
                <CartesianGrid stroke={PALETA.borde} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke={PALETA.secundario} tick={{ fill: PALETA.secundario, fontWeight: 700 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="formacion" stroke={PALETA.secundario} tick={{ fill: PALETA.texto, fontWeight: 700 }} width={100} />
                <Tooltip
                  cursor={{ fill: 'rgba(129,151,164,0.12)' }}
                  contentStyle={tooltipEstilo}
                  labelStyle={{ color: PALETA.texto }}
                  formatter={(v, _n, item) => [`${v}% (${(item.payload as FormacionRow).jugadas.toLocaleString('es-MX')} pases)`, 'Completos']}
                />
                <Bar dataKey="pct" fill={PALETA.secundario} radius={[0, 6, 6, 0]} label={{ position: 'right', fill: PALETA.texto, fontSize: 12, fontWeight: 700, formatter: (v: unknown) => `${v}%` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {(resumen || datosCurva.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 w-full max-w-[1280px] items-stretch">
          {resumen && (
            <MetricCard
              size="md"
              value={`${Math.round(resumen.presion_pct_qb_retuvo * 10)} de cada 10`}
              label="presiones ocurren cuando el QB se queda con el balón más de 3 s"
              sub={`y en esas jugadas, 1 de cada ${Math.round(1 / resumen.presion_pct_captura_qb_retuvo)} termina en captura`}
              note={`${resumen.presion_jugadas_pase.toLocaleString('es-MX')} jugadas de pase, semanas 1 a 8`}
              accent="primerdown"
            />
          )}
          {datosCurva.length > 0 && (
            <section className="bg-superficie border border-borde rounded-2xl p-4 md:p-6">
              <h2 className={`${titulo} text-2xl md:text-3xl mb-1`}>Así se cierra el bolsillo</h2>
              <p className="text-sm text-secundario font-semibold mb-3">
                Distancia mediana del rusher más cercano al QB, segundo a segundo desde el snap, según cómo terminó la presión.
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosCurva} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid stroke={PALETA.borde} />
                    <XAxis
                      type="number"
                      dataKey="seg"
                      domain={[0, 4]}
                      ticks={[0, 1, 2, 3, 4]}
                      stroke={PALETA.secundario}
                      tick={{ fill: PALETA.secundario, fontWeight: 700 }}
                      tickFormatter={v => `${v} s`}
                      label={{ value: 'segundos desde el snap', position: 'insideBottom', offset: -12, fill: PALETA.secundario }}
                    />
                    <YAxis
                      stroke={PALETA.secundario}
                      tick={{ fill: PALETA.secundario, fontWeight: 700 }}
                      domain={[0, 'auto']}
                      label={{ value: 'yardas del rusher al QB', angle: -90, position: 'insideLeft', fill: PALETA.secundario, style: { textAnchor: 'middle' } }}
                    />
                    <ReferenceLine x={3} stroke={PALETA.secundario} strokeDasharray="4 4"
                      label={{ value: '3 s', position: 'top', fill: PALETA.secundario, fontWeight: 700 }} />
                    <Tooltip
                      contentStyle={tooltipEstilo}
                      labelStyle={{ color: PALETA.texto }}
                      labelFormatter={l => `${Number(l).toFixed(1)} s desde el snap`}
                      formatter={(v, n) => [`${Number(v).toFixed(1)} yd`, String(n)]}
                    />
                    <Legend wrapperStyle={{ color: PALETA.texto, fontWeight: 700, fontSize: 12, paddingTop: 8 }} verticalAlign="top" />
                    {VEREDICTOS.map(v => (
                      <Line key={v} type="monotone" dataKey={v} name={v} stroke={COLOR_VEREDICTO[v]}
                        strokeWidth={3} dot={false} connectNulls={false} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-secundario font-semibold mt-1">
                Cada línea se corta cuando quedan menos de {MIN_JUGADAS_CURVA} jugadas en ese segundo.
              </p>
            </section>
          )}
        </div>
      )}

      <button
        onClick={onExplorar}
        className="bg-acento hover:brightness-110 text-fondo font-display font-black italic uppercase tracking-tight text-2xl rounded-full px-12 py-4"
      >
        Explora las jugadas →
      </button>
    </div>
  )
}
