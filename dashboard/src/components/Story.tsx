export default function Story() {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-gray-100 text-lg font-semibold mb-3">¿Qué significa esto para un equipo?</h2>
      <p className="text-gray-300 text-sm leading-relaxed mb-3">
        Un coordinador ofensivo que entiende este patrón sabe que el resultado del pase ya está casi
        decidido cuando el QB suelta el balón. Si el receptor llega al punto de caída con más de 5 yardas
        de ventaja sobre su defensor, el pase se completa el <strong className="text-blue-400">92%</strong> de las veces.
        Si el defensor está más cerca, esa cifra cae al <strong className="text-red-400">44%</strong>.
      </p>
      <p className="text-gray-300 text-sm leading-relaxed mb-3">
        La lectura antes del snap y la ruta del receptor no son solo estrategia: son aritmética de espacio.
        Las jugadas con mayor brecha de velocidad (el receptor llega demasiado tarde) generan
        intercepciones al doble de la tasa promedio.
      </p>
      <p className="text-gray-400 text-xs">
        Métricas calculadas en el último frame antes del lanzamiento. Dataset: NFL Big Data Bowl 2026 (temporada 2023).
      </p>
    </div>
  )
}
