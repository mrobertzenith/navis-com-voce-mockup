import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ChipBooleanProps {
  label: string
  selecionado: boolean
  onToggle: () => void
}

export function ChipBoolean({ label, selecionado, onToggle }: ChipBooleanProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-sm font-body transition-colors',
        selecionado
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface text-text-mut hover:bg-bg',
      )}
    >
      {selecionado && <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
      {label}
    </button>
  )
}
