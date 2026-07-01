import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export function PlaceholderPage({ titulo }: { titulo: string }) {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">{titulo}</h1>
      <EmptyState
        icon={Construction}
        title="Tela ainda não implementada nesta fase"
        description="Esta rota será construída em uma fase posterior do plano de execução."
      />
    </div>
  )
}
