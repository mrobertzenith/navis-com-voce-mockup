import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatData } from '@/lib/format'

export interface NegociacaoResumo {
  imovelId: string
  dataInicio: string
  enderecoResumo: string
}

interface NegociacaoAtivaExpansivelProps {
  negociacoes: NegociacaoResumo[]
  onAbrirImovel?: (imovelId: string) => void
}

export function NegociacaoAtivaExpansivel({ negociacoes, onAbrirImovel }: NegociacaoAtivaExpansivelProps) {
  const [aberto, setAberto] = useState(false)
  const ordenadas = [...negociacoes].sort(
    (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime(),
  )

  return (
    <div className="mt-2 rounded-chip bg-warning/10">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setAberto((v) => !v)
        }}
        className="flex w-full items-center justify-between gap-1.5 px-2 py-1 text-xs font-medium font-body text-warning"
      >
        <span>Negociação Ativa ({negociacoes.length})</span>
        {aberto ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />}
      </button>

      {aberto && (
        <ul className="flex flex-col gap-0.5 border-t border-warning/20 px-2 py-1.5">
          {ordenadas.map((neg) => (
            <li key={neg.imovelId}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAbrirImovel?.(neg.imovelId)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-chip px-1.5 py-1 text-left text-xs font-body text-text-mut hover:bg-warning/10',
                  onAbrirImovel && 'cursor-pointer',
                )}
              >
                <span className="truncate">{neg.enderecoResumo}</span>
                <span className="shrink-0 font-mono text-[11px] text-text-soft">
                  {formatData(neg.dataInicio)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
