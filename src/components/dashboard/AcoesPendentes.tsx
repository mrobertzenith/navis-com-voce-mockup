import { ArrowRight, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/shared/EmptyState'

export interface AcaoPendente {
  id: string
  descricao: string
  to: string
}

interface AcoesPendentesProps {
  acoes: AcaoPendente[]
}

export function AcoesPendentes({ acoes }: AcoesPendentesProps) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-wide text-ink">Ações pendentes</p>
      {acoes.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhuma ação pendente" description="Você está em dia com sua carteira." />
      ) : (
        <ul className="flex flex-col gap-2">
          {acoes.map((acao) => (
            <li key={acao.id}>
              <Link
                to={acao.to}
                className="flex items-center justify-between gap-3 rounded-card border border-border p-2.5 text-sm text-text transition-colors hover:bg-bg"
              >
                {acao.descricao}
                <ArrowRight className="h-4 w-4 shrink-0 text-text-soft" strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
