import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/cn'

interface KanbanColumnProps {
  id: string
  label: string
  count: number
  children: ReactNode
  /** durante um drag ativo: true = destino válido, false = inválido, undefined = sem drag ativo */
  estadoDrag?: 'valida' | 'invalida' | undefined
}

export function KanbanColumn({ id, label, count, children, estadoDrag }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-card border border-border bg-bg p-2 transition-colors',
        estadoDrag === 'valida' && 'border-primary bg-primary/5',
        estadoDrag === 'invalida' && 'opacity-40',
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="font-heading text-sm font-semibold text-ink">{label}</h3>
        <span className="rounded-chip bg-surface px-1.5 py-0.5 font-mono text-xs text-text-mut">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {count === 0 ? <EmptyState title="Nenhum item nesta etapa" /> : children}
      </div>
    </div>
  )
}
