import { Users } from 'lucide-react'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import {
  NegociacaoAtivaExpansivel,
  type NegociacaoResumo,
} from '@/components/lead/NegociacaoAtivaExpansivel'
import { TarjaArquivado, TarjaStandby } from '@/components/shared/Tarja'
import { Button } from '@/components/ui/button'
import type { Lead } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatData, formatPreco } from '@/lib/format'

/**
 * `nome` é omitido de propósito: CardLead nunca deve ter acesso ao nome do lead,
 * mesmo quando renderizado na tela do corretor responsável (regra de produto,
 * não convenção visual — ver §6 do spec v2).
 */
export type LeadCardData = Omit<Lead, 'nome'>

interface CardLeadProps {
  lead: LeadCardData
  contadorMatches?: number
  negociacoesAtivas?: NegociacaoResumo[]
  onAbrirImovelNegociacao?: (imovelId: string) => void
  onClick?: () => void
  onClickContador?: () => void
  onMover?: () => void
  className?: string
}

export function CardLead({
  lead,
  contadorMatches,
  negociacoesAtivas,
  onAbrirImovelNegociacao,
  onClick,
  onClickContador,
  onMover,
  className,
}: CardLeadProps) {
  const { perfilBusca } = lead
  const isStandby = lead.etapa === 7
  const isPerdido = lead.etapa === 8
  const faixaValor =
    perfilBusca.valorDe != null && perfilBusca.valorAte != null
      ? `${formatPreco(perfilBusca.valorDe)} – ${formatPreco(perfilBusca.valorAte)}`
      : perfilBusca.valorAte != null
        ? `até ${formatPreco(perfilBusca.valorAte)}`
        : `a partir de ${formatPreco(perfilBusca.valorDe)}`

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'relative rounded-card border border-border bg-surface p-3 shadow-card transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        (isStandby || isPerdido) && 'grayscale opacity-75',
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-ink">{lead.codigo}</span>
        {isStandby && <TarjaStandby />}
        {isPerdido && <TarjaArquivado />}
      </div>

      <div className="mb-1.5 flex flex-wrap gap-1">
        {perfilBusca.tipos.map((tipo) => (
          <ChipTipoImovel key={tipo} tipo={tipo} />
        ))}
      </div>

      <p className="truncate font-body text-xs text-text-mut">
        {perfilBusca.bairros.join(', ') || perfilBusca.cidade} · {perfilBusca.cidade}/
        {perfilBusca.estado}
      </p>

      <p className="mt-1 font-mono text-sm font-medium text-ink">{faixaValor}</p>

      <p className="mt-1.5 font-body text-xs text-text-soft">
        Cadastrado em {formatData(lead.dataCadastro)}
      </p>

      {contadorMatches != null && contadorMatches > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClickContador?.()
          }}
          disabled={!onClickContador}
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 rounded-chip bg-primary/10 px-2 py-1 text-xs font-medium font-body text-primary',
            onClickContador && 'hover:bg-primary/20',
          )}
        >
          <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
          {contadorMatches} possíveis negócios disponíveis
        </button>
      )}

      {lead.etapa === 4 && negociacoesAtivas != null && negociacoesAtivas.length > 0 && (
        <NegociacaoAtivaExpansivel
          negociacoes={negociacoesAtivas}
          onAbrirImovel={onAbrirImovelNegociacao}
        />
      )}

      {onMover && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full md:hidden"
          onClick={(e) => {
            e.stopPropagation()
            onMover()
          }}
        >
          Mover
        </Button>
      )}
    </div>
  )
}
