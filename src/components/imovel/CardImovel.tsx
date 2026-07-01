import { BedDouble, Car, ShowerHead, Users } from 'lucide-react'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import { Tarja } from '@/components/shared/Tarja'
import { Button } from '@/components/ui/button'
import type { Imovel } from '@/domain/types'
import { cn } from '@/lib/cn'
import { formatM2, formatPreco } from '@/lib/format'
import { fotoPadrao } from '@/mocks/data/fotosImoveis'

interface CardImovelProps {
  imovel: Imovel
  contadorMatches?: number
  diasParado?: number
  onClick?: () => void
  onClickContador?: () => void
  onMover?: () => void
  className?: string
}

function areaPrincipal(imovel: Imovel): number | undefined {
  return imovel.areaPrivativaM2 ?? imovel.areaConstruidaM2 ?? imovel.areaTerrenoM2
}

export function CardImovel({
  imovel,
  contadorMatches,
  diasParado,
  onClick,
  onClickContador,
  onMover,
  className,
}: CardImovelProps) {
  const valor = imovel.valorAnuncio ?? imovel.valorEstimado
  const area = areaPrincipal(imovel)
  const mostrarTarjaNegociacao = imovel.etapa === 'e'
  const mostrarTarjaVendido = imovel.etapa === 'f'
  const mostrarParado = ['a', 'b', 'c'].includes(imovel.etapa) && diasParado != null && diasParado >= 15
  const capa = imovel.fotos?.[0] ?? fotoPadrao(imovel.tipo)

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
        'relative overflow-hidden rounded-card border border-border bg-surface shadow-card transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      {mostrarTarjaNegociacao && <Tarja variant="em_negociacao" />}
      {mostrarTarjaVendido && <Tarja variant="vendido_aguardando_aceite" />}

      <img src={capa} alt="" className="h-32 w-full object-cover" loading="lazy" />

      <div className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <ChipTipoImovel tipo={imovel.tipo} />
          {mostrarParado && <Tarja variant="parado" dias={diasParado} />}
        </div>

        <p className="truncate font-body text-sm font-medium text-ink">
          {imovel.enderecoRua}, {imovel.enderecoNumero}
        </p>
        <p className="truncate font-body text-xs text-text-mut">
          {imovel.bairro} · {imovel.cidade}/{imovel.estado}
        </p>

        <p className="mt-2 font-mono text-base font-semibold text-ink">{formatPreco(valor)}</p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-text-mut">
          {imovel.quartos > 0 && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" strokeWidth={1.5} />
              {imovel.quartos}
            </span>
          )}
          {imovel.vagas > 0 && (
            <span className="inline-flex items-center gap-1">
              <Car className="h-3.5 w-3.5" strokeWidth={1.5} />
              {imovel.vagas}
            </span>
          )}
          {imovel.banheiros > 0 && (
            <span className="inline-flex items-center gap-1">
              <ShowerHead className="h-3.5 w-3.5" strokeWidth={1.5} />
              {imovel.banheiros}
            </span>
          )}
          {area != null && <span>{formatM2(area)}</span>}
        </div>

        {imovel.etapa === 'd' && contadorMatches != null && (
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
            {contadorMatches} {contadorMatches === 1 ? 'cliente' : 'clientes'} com perfil deste imóvel
          </button>
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
    </div>
  )
}
