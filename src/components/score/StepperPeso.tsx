import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepperPesoProps {
  valor: number
  onChange: (valor: number) => void
}

export function StepperPeso({ valor, onChange }: StepperPesoProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(1, valor - 1))}
        disabled={valor <= 1}
        aria-label="Diminuir peso"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Button>
      <span className="w-6 text-center font-mono text-sm font-semibold text-ink">{valor}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.min(10, valor + 1))}
        disabled={valor >= 10}
        aria-label="Aumentar peso"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Button>
    </div>
  )
}
