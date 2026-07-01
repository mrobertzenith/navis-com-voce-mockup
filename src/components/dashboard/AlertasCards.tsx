import { AlertTriangle, Link2Off, Clock } from 'lucide-react'
import { cn } from '@/lib/cn'

interface AlertaCardProps {
  icon: typeof AlertTriangle
  titulo: string
  contagem: number
  variante: 'warning' | 'danger'
}

function AlertaCard({ icon: Icon, titulo, contagem, variante }: AlertaCardProps) {
  const semAlerta = contagem === 0
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card border p-3',
        semAlerta ? 'border-border bg-surface' : variante === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-warning/30 bg-warning/5',
      )}
    >
      <Icon
        className={cn('h-5 w-5 shrink-0', semAlerta ? 'text-text-soft' : variante === 'danger' ? 'text-danger' : 'text-warning')}
        strokeWidth={1.5}
      />
      <div>
        <p className={cn('font-mono text-lg font-semibold', semAlerta ? 'text-text-soft' : variante === 'danger' ? 'text-danger' : 'text-warning')}>
          {contagem}
        </p>
        <p className="text-xs text-text-mut">{titulo}</p>
      </div>
    </div>
  )
}

export interface AlertasCardsProps {
  parados: number
  linksQuebrados: number
  publicadosMais6m: number
}

export function AlertasCards({ parados, linksQuebrados, publicadosMais6m }: AlertasCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <AlertaCard icon={Clock} titulo="Imóveis parados (15+ dias)" contagem={parados} variante="warning" />
      <AlertaCard icon={Link2Off} titulo="Links de anúncio quebrados" contagem={linksQuebrados} variante="danger" />
      <AlertaCard icon={AlertTriangle} titulo="Publicados há mais de 6 meses" contagem={publicadosMais6m} variante="warning" />
    </div>
  )
}
