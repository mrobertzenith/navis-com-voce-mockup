import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { encontrarEquivalente, normalizarLocal } from '@/domain/normalizacao'
import { useImoveis } from '@/hooks/useImoveis'

interface DiferenciaisExtrasProps {
  itens: string[]
  onChange: (itens: string[]) => void
}

/**
 * Diferenciais escritos pelo corretor, além da lista padrão.
 * Não entram no matching (cada corretor usa seus próprios termos), mas
 * aparecem no card do imóvel. O sistema lembra o que a equipe já usou e
 * oferece como sugestão, para os termos não se multiplicarem sem controle.
 */
export function DiferenciaisExtras({ itens, onChange }: DiferenciaisExtrasProps) {
  const [novo, setNovo] = useState('')
  const { data: imoveis = [] } = useImoveis()

  const jaUsados = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const imovel of imoveis) {
      for (const d of imovel.diferenciaisExtras ?? []) {
        const chave = normalizarLocal(d)
        if (chave && !mapa.has(chave)) mapa.set(chave, d)
      }
    }
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [imoveis])

  const sugestoes = jaUsados.filter((d) => !encontrarEquivalente(d, itens)).slice(0, 8)

  function adicionar(valor: string) {
    const limpo = valor.trim()
    if (!limpo || encontrarEquivalente(limpo, itens)) {
      setNovo('')
      return
    }
    onChange([...itens, encontrarEquivalente(limpo, jaUsados) ?? limpo])
    setNovo('')
  }

  return (
    <div className="flex flex-col gap-2">
      {itens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {itens.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(itens.filter((i) => i !== item))}
              aria-label={`Remover ${item}`}
              className="flex items-center gap-1 rounded-chip border border-primary bg-primary/5 px-2.5 py-1 text-sm text-ink"
            >
              {item}
              <X className="h-3 w-3" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar(novo)
            }
          }}
          placeholder="Outro diferencial (ex.: vista para o parque)"
          maxLength={40}
        />
        <Button type="button" variant="outline" onClick={() => adicionar(novo)} className="shrink-0">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Adicionar
        </Button>
      </div>

      {sugestoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-soft">Já usados pela equipe:</span>
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="rounded-chip border border-border bg-surface px-2 py-0.5 text-xs text-text-mut transition-colors hover:border-primary hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
