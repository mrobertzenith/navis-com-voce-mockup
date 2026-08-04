import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

interface UploaderFotosProps {
  fotos: string[]
  onChange: (fotos: string[]) => void
  max?: number
  className?: string
}

/**
 * Fotos por link (decisão de arquitetura: sem storage de imagens).
 * O corretor cola a URL da foto do anúncio — custo zero de armazenamento;
 * sem foto, os cards usam a imagem padrão do tipo de imóvel.
 */
export function UploaderFotos({ fotos, onChange, max = 4, className }: UploaderFotosProps) {
  const [url, setUrl] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function adicionar() {
    const limpa = url.trim()
    if (!limpa) return
    if (!/^https?:\/\/.+/i.test(limpa)) {
      setErro('Cole um link completo, começando com http:// ou https://')
      return
    }
    if (fotos.includes(limpa)) {
      setErro('Essa foto já foi adicionada.')
      return
    }
    setErro(null)
    onChange([...fotos, limpa])
    setUrl('')
  }

  function removerFoto(indice: number) {
    onChange(fotos.filter((_, i) => i !== indice))
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {fotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fotos.map((foto, i) => (
            <div key={i} className="relative overflow-hidden rounded-card border border-border">
              <img
                src={foto}
                alt=""
                className="h-24 w-full bg-bg object-cover"
                onError={(e) => {
                  e.currentTarget.style.opacity = '0.35'
                  e.currentTarget.alt = 'link inválido'
                }}
              />
              <button
                type="button"
                onClick={() => removerFoto(i)}
                aria-label="Remover foto"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-deep/60 text-white hover:bg-ink-deep/80"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {fotos.length < max && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionar()
                }
              }}
              placeholder="Cole o link de uma foto do anúncio"
              inputMode="url"
            />
            <Button type="button" variant="outline" onClick={adicionar} className="shrink-0">
              <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
              Adicionar
            </Button>
          </div>
          {erro ? (
            <p className="text-xs text-danger">{erro}</p>
          ) : (
            <p className="text-xs text-text-soft">
              {fotos.length}/{max} fotos · opcional — sem foto, usamos uma imagem padrão do tipo de
              imóvel
            </p>
          )}
        </div>
      )}
    </div>
  )
}
