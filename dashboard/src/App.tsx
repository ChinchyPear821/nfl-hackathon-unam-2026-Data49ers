import { useState } from 'react'
import Inicio from './components/Inicio'
import Explorar from './components/Explorar'

type Seccion = 'inicio' | 'explorar'

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'explorar', label: 'Explorar jugadas' },
]

export default function App() {
  const [seccion, setSeccion] = useState<Seccion>('inicio')

  return (
    <div className="min-h-screen bg-fondo text-white">
      <nav className="sticky top-0 z-20 bg-fondo/95 backdrop-blur border-b border-borde">
        <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-3 flex items-center gap-2">
          <span className="font-display font-black italic uppercase tracking-tight text-lg mr-4 hidden sm:inline">
            ¿Se completará <span className="text-acento">el pase?</span>
          </span>
          {SECCIONES.map(s => (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              className={`rounded-full px-5 py-1.5 text-sm font-bold uppercase tracking-wide border ${
                seccion === s.id
                  ? 'bg-acento border-acento text-fondo'
                  : 'border-borde text-secundario hover:border-acento hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8">
        {seccion === 'inicio' ? <Inicio onExplorar={() => setSeccion('explorar')} /> : <Explorar />}
      </div>
    </div>
  )
}
