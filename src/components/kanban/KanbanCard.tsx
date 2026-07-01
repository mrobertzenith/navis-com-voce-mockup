import type { ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface KanbanCardProps {
  id: string
  children: ReactNode
  disabled?: boolean
  /** breve destaque visual ao ser solto com sucesso em uma coluna válida */
  destaque?: boolean
}

export function KanbanCard({ id, children, disabled, destaque }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  })

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('touch-none', isDragging && 'z-10')}
      animate={
        isDragging
          ? { scale: 1.04, rotate: 2, boxShadow: '0 8px 20px rgba(22, 41, 77, 0.18)', opacity: 0.85 }
          : destaque
            ? { scale: [1, 1.02, 1], boxShadow: ['0 0 0 0 rgba(47,125,95,0)', '0 0 0 4px rgba(47,125,95,0.35)', '0 0 0 0 rgba(47,125,95,0)'] }
            : { scale: 1, rotate: 0, boxShadow: '0 0 0 0 rgba(22, 41, 77, 0)', opacity: 1 }
      }
      whileHover={!isDragging ? { scale: 1.01 } : undefined}
      whileTap={!isDragging ? { scale: 0.98 } : undefined}
      transition={{ duration: destaque ? 0.6 : 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
