import { Archive, Clock, Handshake, PauseCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type TarjaVariant =
  | 'em_negociacao'
  | 'vendido_aguardando_aceite'
  | 'vendido_confirmado'
  | 'parado'
  | 'match_aviso'
  | 'aguardando_confirmacao'

interface TarjaProps {
  variant: TarjaVariant
  /** dias parado — obrigatório para variant="parado" */
  dias?: number
  /** horas restantes de countdown — usado em "aguardando_confirmacao" */
  horasRestantes?: number
  className?: string
}

const RIBBON_LABEL: Record<'em_negociacao' | 'vendido_aguardando_aceite' | 'vendido_confirmado', string> = {
  em_negociacao: 'Em negociação',
  vendido_aguardando_aceite: 'Vendido — aguardando aceite',
  vendido_confirmado: 'Vendido',
}

const RIBBON_COLOR: Record<'em_negociacao' | 'vendido_aguardando_aceite' | 'vendido_confirmado', string> = {
  em_negociacao: 'bg-warning',
  vendido_aguardando_aceite: 'bg-warning',
  vendido_confirmado: 'bg-success',
}

export function Tarja({ variant, dias = 0, horasRestantes, className }: TarjaProps) {
  if (variant === 'em_negociacao' || variant === 'vendido_aguardando_aceite' || variant === 'vendido_confirmado') {
    return (
      <div
        className={cn(
          'pointer-events-none absolute right-[-32px] top-[14px] w-[140px] rotate-45 py-1 text-center text-[11px] font-semibold font-body uppercase tracking-wide text-white shadow-sm',
          RIBBON_COLOR[variant],
          className,
        )}
      >
        {RIBBON_LABEL[variant]}
      </div>
    )
  }

  if (variant === 'parado') {
    const critico = dias >= 25
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-medium font-body',
          critico ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning',
          className,
        )}
      >
        <Clock className="h-3 w-3" strokeWidth={1.5} />
        {dias}d sem movimento
      </span>
    )
  }

  if (variant === 'match_aviso') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-chip bg-text-soft/10 px-2 py-0.5 text-xs font-medium font-body text-text-mut',
          className,
        )}
      >
        Em cadastramento
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip bg-primary/10 px-2 py-0.5 text-xs font-medium font-body text-primary',
        className,
      )}
    >
      <Handshake className="h-3 w-3" strokeWidth={1.5} />
      Aguardando confirmação{horasRestantes != null ? ` · ${horasRestantes}h` : ''}
    </span>
  )
}

export function TarjaStandby({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip bg-text-soft/10 px-2 py-0.5 text-xs font-medium font-body text-text-mut',
        className,
      )}
    >
      <PauseCircle className="h-3 w-3" strokeWidth={1.5} />
      Standby
    </span>
  )
}

export function TarjaArquivado({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-chip bg-text-soft/10 px-2 py-0.5 text-xs font-medium font-body text-text-mut',
        className,
      )}
    >
      <Archive className="h-3 w-3" strokeWidth={1.5} />
      Arquivado
    </span>
  )
}
