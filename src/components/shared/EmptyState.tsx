import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border py-16 text-center">
      {Icon && <Icon className="h-6 w-6 text-text-soft" strokeWidth={1.5} />}
      <p className="font-body text-sm font-medium text-text-mut">{title}</p>
      {description && <p className="max-w-xs font-body text-xs text-text-soft">{description}</p>}
    </div>
  )
}
