import { useEffect, useRef, useState } from 'react'
import { fetchNarracion } from '../api'
import type { Narracion } from '../api'

// Narración de la jugada con Amazon Nova, en tres partes, y lectura en voz con la voz del navegador.
// Opcional: si Bedrock no responde, muestra un aviso discreto y la app sigue igual.

const PARTES: { clave: 'contexto' | 'jugada' | 'alternativa'; titulo: string }[] = [
  { clave: 'contexto', titulo: 'Contexto' },
  { clave: 'jugada', titulo: 'La jugada' },
  { clave: 'alternativa', titulo: 'Qué pudo hacer' },
]

const hayVoz = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

function elegirVoz(): SpeechSynthesisVoice | null {
  const voces = window.speechSynthesis.getVoices()
  return (
    voces.find(v => v.lang.toLowerCase().replace('_', '-') === 'es-mx') ??
    voces.find(v => v.lang.toLowerCase().startsWith('es')) ??
    null
  )
}

export default function Comentarista({ jugadaId }: { jugadaId: string }) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo' | 'error'>('idle')
  const [narracion, setNarracion] = useState<Narracion | null>(null)
  const [hablando, setHablando] = useState(false)
  const vozRef = useRef<SpeechSynthesisVoice | null>(null)

  // las voces pueden cargar después del primer render
  useEffect(() => {
    if (!hayVoz) return
    const cargar = () => { vozRef.current = elegirVoz() }
    cargar()
    window.speechSynthesis.addEventListener('voiceschanged', cargar)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', cargar)
  }, [])

  // nueva jugada: limpiar y callar; también al desmontar
  useEffect(() => {
    setEstado('idle')
    setNarracion(null)
    return () => {
      if (hayVoz) window.speechSynthesis.cancel()
      setHablando(false)
    }
  }, [jugadaId])

  async function pedir() {
    setEstado('cargando')
    try {
      const r = await fetchNarracion(jugadaId)
      if (r.disponible && (r.contexto || r.jugada || r.alternativa)) { setNarracion(r); setEstado('listo') } else setEstado('error')
    } catch {
      setEstado('error')
    }
  }

  function alternarVoz() {
    if (!hayVoz || !narracion) return
    const synth = window.speechSynthesis
    if (hablando) { synth.cancel(); setHablando(false); return }
    const texto = PARTES
      .filter(p => narracion[p.clave])
      .map(p => `${p.titulo}. ${narracion[p.clave]}`)
      .join(' ')
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = 'es-MX'
    u.rate = 1.05
    const voz = vozRef.current ?? elegirVoz()
    if (voz) u.voice = voz
    u.onend = () => setHablando(false)
    u.onerror = () => setHablando(false)
    synth.cancel()
    synth.speak(u)
    setHablando(true)
  }

  const marco = 'rounded-2xl border border-acento/50 bg-superficie px-4 py-3'

  if (estado === 'idle') return (
    <button onClick={pedir}
      className="w-full rounded-2xl border border-acento/60 bg-acento/10 px-4 py-3 text-sm font-black uppercase tracking-wide text-acento hover:bg-acento/20">
      🎙️ ¿Qué pasó aquí? · Comentarista IA
    </button>
  )
  if (estado === 'cargando') return (
    <div className={marco}>
      <p className="text-sm font-bold text-acento animate-pulse">El comentarista está analizando la jugada…</p>
    </div>
  )
  if (estado === 'error') return (
    <div className={marco}>
      <p className="text-xs text-secundario">El comentarista con IA no está disponible en este momento.</p>
    </div>
  )

  return (
    <div className={marco}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[11px] font-black uppercase tracking-wide text-acento">🎙️ Comentarista IA · Amazon Nova</p>
        {hayVoz && (
          <button
            onClick={alternarVoz}
            aria-pressed={hablando}
            className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wide border ${
              hablando ? 'bg-fallo border-fallo text-white' : 'bg-acento border-acento text-fondo hover:brightness-110'
            }`}
          >
            {hablando ? '⏹ Detener' : '🔊 Escuchar'}
          </button>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PARTES.filter(p => narracion?.[p.clave]).map(p => (
          <div key={p.clave}>
            <p className="font-display font-black italic uppercase tracking-tight text-base text-white">{p.titulo}</p>
            <p className="text-sm leading-relaxed text-white/90">{narracion?.[p.clave]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
