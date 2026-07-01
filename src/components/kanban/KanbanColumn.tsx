import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
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
    <motion.div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-card border border-border bg-bg p-2',
        estadoDrag === 'invalida' && 'opacity-40 transition-opacity',
      )}
      animate={
        estadoDrag === 'valida'
          ? {
              borderColor: ['#1E4C8A', '#7AA2D8', '#1E4C8A'],
              backgroundColor: ['rgba(30,76,138,0.05)', 'rgba(30,76,138,0.1)', 'rgba(30,76,138,0.05)'],
            }
          : { borderColor: '#E2E7EE', backgroundColor: '#FAFBFD' }
      }
      transition={
        estadoDrag === 'valida'
          ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
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
    </motion.div>
  )
}
