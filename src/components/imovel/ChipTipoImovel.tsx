import { TIPO_IMOVEL_ICON, TIPO_IMOVEL_LABEL } from '@/domain/constants'
import type { TipoImovel } from '@/domain/types'
import { cn } from '@/lib/cn'

interface ChipTipoImovelProps {
  tipo: TipoImovel
  className?: string
}

export function ChipTipoImovel({ tipo, className }: ChipTipoImovelProps) {
  const Icon = TIPO_IMOVEL_ICON[tipo]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border border-border bg-bg px-2 py-0.5 text-xs font-medium font-body text-text-mut',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {TIPO_IMOVEL_LABEL[tipo]}
    </span>
  )
}
