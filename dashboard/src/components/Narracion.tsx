import { useEffect, useState } from 'react'
import { fetchNarracion } from '../api'

// Explicación de la jugada con Amazon Nova. Es opcional: si Bedrock no responde, se oculta sin romper nada.
export default function Narracion({ jugadaId }: { jugadaId: string }) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo' | 'error'>('idle')
  const [texto, setTexto] = useState<string | null>(null)

  useEffect(() => { setEstado('idle'); setTexto(null) }, [jugadaId])

  async function pedir() {
    setEstado('cargando')
    try {
      const r = await fetchNarracion(jugadaId)
      if (r.disponible && r.texto) { setTexto(r.texto); setEstado('listo') }
      else setEstado('error')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'idle') return (
    <button onClick={pedir}
      className="self-start rounded-full border border-violet-400/40 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200 hover:bg-violet-500/20">
      ✨ Explicar esta jugada con IA
    </button>
  )
  if (estado === 'cargando') return <p className="text-sm text-violet-300 animate-pulse">Amazon Nova está analizando la jugada…</p>
  if (estado === 'error') return <p className="text-xs text-slate-500">La explicación con IA no está disponible en este momento.</p>
  return (
    <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 px-5 py-4 text-sm leading-relaxed text-slate-200">
      <p className="mb-1 text-xs uppercase tracking-wide text-violet-300">Explicación generada con Amazon Nova</p>
      {texto}
    </div>
  )
}
