import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CarouselFotosProps {
  fotos: string[]
  className?: string
}

export function CarouselFotos({ fotos, className }: CarouselFotosProps) {
  const [indice, setIndice] = useState(0)

  if (fotos.length === 0) return null

  function anterior() {
    setIndice((i) => (i === 0 ? fotos.length - 1 : i - 1))
  }

  function proxima() {
    setIndice((i) => (i === fotos.length - 1 ? 0 : i + 1))
  }

  return (
    <div className={cn('relative overflow-hidden rounded-card bg-bg', className)}>
      <img src={fotos[indice]} alt="" className="h-56 w-full object-cover" />

      {fotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={anterior}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink-deep/60 text-white hover:bg-ink-deep/80"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={proxima}
            aria-label="Próxima foto"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink-deep/60 text-white hover:bg-ink-deep/80"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {fotos.map((foto, i) => (
              <button
                key={foto + i}
                type="button"
                aria-label={`Ir para foto ${i + 1}`}
                onClick={() => setIndice(i)}
                className={cn(
                  'h-1.5 w-1.5 rounded-full bg-white/60 transition-all',
                  i === indice && 'w-4 bg-white',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
