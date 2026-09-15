import { useMemo } from 'react'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'
import { CORRETORES, CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { formatTelefone } from '@/lib/format'
import { cn } from '@/lib/cn'

const STATUS_LABEL: Record<string, { texto: string; classe: string }> = {
  ativo: { texto: 'Ativo', classe: 'bg-success/10 text-success' },
  pendente_onboarding: { texto: 'Convite enviado', classe: 'bg-warning/10 text-warning' },
  suspenso: { texto: 'Desativado', classe: 'bg-danger/10 text-danger' },
}

/**
 * Diretório de toda a equipe (não só admin) — quem é quem, cidade e contato
 * direto. Complementa "Todos os Imóveis/Clientes" (o que a equipe tem) com
 * quem procurar pra falar sobre isso. Rota existia como placeholder mas não
 * aparecia no menu (achado de auditoria, 14/09/2026).
 */
export function TodosCorretoresPage() {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()

  const corretoresAtivos = useMemo(() => CORRETORES.filter((c) => c.status !== 'suspenso'), [])

  const contadores = useMemo(() => {
    const porCorretor = new Map<string, { imoveis: number; clientes: number }>()
    for (const imovel of imoveis) {
      const atual = porCorretor.get(imovel.corretorResponsavelId) ?? { imoveis: 0, clientes: 0 }
      atual.imoveis += 1
      porCorretor.set(imovel.corretorResponsavelId, atual)
    }
    for (const lead of leads) {
      const atual = porCorretor.get(lead.corretorResponsavelId) ?? { imoveis: 0, clientes: 0 }
      atual.clientes += 1
      porCorretor.set(lead.corretorResponsavelId, atual)
    }
    return porCorretor
  }, [imoveis, leads])

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Todos os Corretores</h1>
      <p className="mb-4 text-sm text-text-mut">
        Quem faz parte da equipe, onde atua e como falar direto — pra combinar uma visita ou
        tirar dúvida sobre um match sem precisar procurar o contato em outro lugar.
      </p>

      {corretoresAtivos.length === 0 ? (
        <EmptyState title="Nenhum corretor ativo" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {corretoresAtivos.map((c) => {
            const status = STATUS_LABEL[c.status]
            const stats = contadores.get(c.id)
            const souEu = c.id === CORRETOR_LOGADO_ID
            return (
              <div key={c.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {c.nome}
                      {souEu && <span className="ml-1.5 text-xs font-normal text-text-soft">(você)</span>}
                    </p>
                    <p className="text-xs text-text-soft">{c.cidade}/{c.estado} · CRECI {c.creci || '—'}</p>
                  </div>
                  {c.papel === 'admin' && (
                    <span className="flex shrink-0 items-center gap-1 rounded-chip bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <ShieldCheck className="h-3 w-3" strokeWidth={1.5} />
                      Admin
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-text-mut">
                  <span className={cn('rounded-chip px-2 py-0.5 font-medium', status.classe)}>{status.texto}</span>
                  <span>{stats?.imoveis ?? 0} imóveis</span>
                  <span>·</span>
                  <span>{stats?.clientes ?? 0} clientes</span>
                </div>

                {!souEu && c.telefoneWhatsapp && (
                  <Button variant="outline" size="sm" className="mt-1 self-start" asChild>
                    <a href={`https://wa.me/55${c.telefoneWhatsapp}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {formatTelefone(c.telefoneWhatsapp)}
                    </a>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
