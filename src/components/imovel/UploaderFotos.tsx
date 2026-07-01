import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface UploaderFotosProps {
  fotos: string[]
  onChange: (fotos: string[]) => void
  max?: number
  className?: string
}

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = reject
    leitor.readAsDataURL(arquivo)
  })
}

export function UploaderFotos({ fotos, onChange, max = 4, className }: UploaderFotosProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  async function adicionarArquivos(arquivos: FileList | File[]) {
    const restante = max - fotos.length
    if (restante <= 0) return
    const selecionados = Array.from(arquivos)
      .filter((a) => a.type.startsWith('image/'))
      .slice(0, restante)
    const base64s = await Promise.all(selecionados.map(arquivoParaBase64))
    onChange([...fotos, ...base64s])
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
              <img src={foto} alt="" className="h-24 w-full object-cover" />
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            if (e.dataTransfer.files.length > 0) void adicionarArquivos(e.dataTransfer.files)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-sm text-text-mut transition-colors',
            arrastando ? 'border-primary bg-primary/5' : 'border-border hover:bg-bg',
          )}
        >
          <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
          Arraste fotos aqui ou clique para selecionar
          <span className="text-xs text-text-soft">
            {fotos.length}/{max} fotos · se nenhuma for enviada, usaremos uma foto padrão do tipo de imóvel
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) void adicionarArquivos(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
