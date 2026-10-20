import { useState } from 'react'
import { X } from 'lucide-react'
import { CapaDoLink } from '@/components/imovel/CapaDoLink'
import { BarraCompartilhar } from '@/components/shared/BarraCompartilhar'
import { reunirLinks } from '@/lib/compartilhar'
import { ScoreBadge } from '@/components/match/ScoreBadge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

export interface MatchItem {
  id: string
  score: number
  isAviso: boolean
  resumo: string
  corretorNome: string
  /** link do anúncio (só quando o match é um imóvel) — vira a capa e o item compartilhável */
  linkUrl?: string
}

interface ListaMatchesProps {
  matches: MatchItem[]
  onAbrir: (id: string) => void
  onDismiss: (id: string) => void
  /** habilita marcar vários e copiar/enviar só os links (matches que são imóveis) */
  selecionaveis?: boolean
}

export function ListaMatches({ matches, onAbrir, onDismiss, selecionaveis }: ListaMatchesProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }
  // só conta o que ainda está na lista (um descarte tira o item sem limpar a seleção)
  const marcados = matches.filter((m) => selecionados.has(m.id))
  if (matches.length === 0) {
    return <EmptyState title="Nenhum match no momento" description="Ajuste os pesos de score ou aguarde novos cadastros." />
  }

  return (
    <>
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <li key={m.id} className="rounded-card border border-border bg-surface p-3">
          <div className="flex items-start gap-3">
            {selecionaveis && (
              <input
                type="checkbox"
                aria-label="Selecionar para compartilhar"
                checked={selecionados.has(m.id)}
                onChange={() => alternar(m.id)}
                className="mt-3 h-4 w-4 shrink-0 rounded border-border"
              />
            )}
            <ScoreBadge score={m.score} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{m.resumo}</p>
              {m.isAviso && <p className="text-xs text-warning">Match de aviso — imóvel em cadastramento</p>}
              <p className="text-xs text-text-soft">Corretor responsável: {m.corretorNome}</p>
            </div>
            <CapaDoLink url={m.linkUrl} className="h-14 w-14 shrink-0 rounded-card" />
          </div>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDismiss(m.id)}>
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              Não interessou
            </Button>
            {/* imóvel de outro corretor também pode ser aberto — é possível agendar visita nele */}
            <Button variant="outline" size="sm" onClick={() => onAbrir(m.id)}>
              Abrir
            </Button>
          </div>
        </li>
      ))}
    </ul>
    {selecionaveis && (
      <BarraCompartilhar
        selecionados={marcados.length}
        resultado={reunirLinks(marcados.map((m) => ({ linkAnuncioUrl: m.linkUrl })))}
        onLimpar={() => setSelecionados(new Set())}
      />
    )}
    </>
  )
}
