import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ItemQuadrante {
  label: string
  valor: string | number
}

interface QuadranteCardProps {
  titulo: string
  icon: LucideIcon
  itens: ItemQuadrante[]
  rodape?: ReactNode
  className?: string
}

export function QuadranteCard({ titulo, icon: Icon, itens, rodape, className }: QuadranteCardProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card', className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-ink">{titulo}</h3>
      </div>
      <dl className="flex flex-col gap-2">
        {itens.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-2">
            <dt className="text-sm text-text-mut">{item.label}</dt>
            <dd className="font-mono text-base font-semibold text-ink">{item.valor}</dd>
          </div>
        ))}
      </dl>
      {rodape}
    </div>
  )
}
