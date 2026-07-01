import { cn } from '@/lib/cn'

interface WizardStepsProps {
  passos: string[]
  passoAtual: number
}

export function WizardSteps({ passos, passoAtual }: WizardStepsProps) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {passos.map((passo, idx) => {
        const numero = idx + 1
        const ativo = numero === passoAtual
        const concluido = numero < passoAtual
        return (
          <li key={passo} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold',
                ativo && 'bg-primary text-white',
                concluido && 'bg-success text-white',
                !ativo && !concluido && 'bg-bg text-text-soft',
              )}
            >
              {numero}
            </div>
            <span
              className={cn(
                'hidden truncate text-xs font-body sm:inline',
                ativo ? 'font-medium text-ink' : 'text-text-mut',
              )}
            >
              {passo}
            </span>
            {numero < passos.length && <div className="h-px flex-1 bg-border" />}
          </li>
        )
      })}
    </ol>
  )
}
