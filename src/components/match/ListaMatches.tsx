import { MessageCircle, X } from 'lucide-react'
import { ScoreBadge } from '@/components/match/ScoreBadge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

export interface MatchItem {
  id: string
  score: number
  isAviso: boolean
  resumo: string
  corretorNome: string
  corretorWhatsapp?: string
  ehProprio: boolean
}

interface ListaMatchesProps {
  matches: MatchItem[]
  onAbrir: (id: string) => void
  onDismiss: (id: string) => void
}

export function ListaMatches({ matches, onAbrir, onDismiss }: ListaMatchesProps) {
  if (matches.length === 0) {
    return <EmptyState title="Nenhum match no momento" description="Ajuste os pesos de score ou aguarde novos cadastros." />
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <li key={m.id} className="rounded-card border border-border bg-surface p-3">
          <div className="flex items-start gap-3">
            <ScoreBadge score={m.score} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{m.resumo}</p>
              {m.isAviso && <p className="text-xs text-warning">Match de aviso — imóvel em cadastramento</p>}
              <p className="text-xs text-text-soft">Corretor responsável: {m.corretorNome}</p>
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDismiss(m.id)}>
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              Não interessou
            </Button>
            {m.ehProprio ? (
              <Button variant="outline" size="sm" onClick={() => onAbrir(m.id)}>
                Abrir
              </Button>
            ) : (
              m.corretorWhatsapp && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://wa.me/55${m.corretorWhatsapp}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Falar com o corretor
                  </a>
                </Button>
              )
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
