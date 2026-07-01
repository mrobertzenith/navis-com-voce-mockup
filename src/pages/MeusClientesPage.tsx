import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { KanbanBoard, type ColunaDef } from '@/components/kanban/KanbanBoard'
import { CardLead } from '@/components/lead/CardLead'
import { ModalGateLead } from '@/components/lead/ModalGateLead'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ETAPA_LEAD_LABEL, ETAPA_LEAD_ORDEM } from '@/domain/constants'
import { avaliarTransicaoLead } from '@/domain/gatesLead'
import type { EtapaLead, Lead } from '@/domain/types'
import { useAtualizarLead, useLeads } from '@/hooks/useLeads'
import { useImoveis } from '@/hooks/useImoveis'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { useUIStore } from '@/stores/uiStore'

const COLUNAS: ColunaDef[] = ETAPA_LEAD_ORDEM.map((etapa) => ({
  id: String(etapa),
  label: ETAPA_LEAD_LABEL[etapa],
}))

interface PendingMove {
  lead: Lead
  destino: EtapaLead
  camposFaltantes: ReturnType<typeof avaliarTransicaoLead>['camposFaltantes']
  requerConfirmacao: boolean
}

export function MeusClientesPage() {
  const { data: leads = [], isLoading } = useLeads()
  const { data: imoveis = [] } = useImoveis()
  const atualizarLead = useAtualizarLead()
  const { toast } = useToast()
  const abrirModalImovel = useUIStore((s) => s.abrirModalImovel)
  const [busca, setBusca] = useState('')
  const [pending, setPending] = useState<PendingMove | null>(null)

  const meusLeads = useMemo(
    () => leads.filter((l) => l.corretorResponsavelId === CORRETOR_LOGADO_ID),
    [leads],
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return meusLeads
    return meusLeads.filter((l) =>
      [l.codigo, l.perfilBusca.cidade, ...l.perfilBusca.bairros].some((campo) =>
        campo.toLowerCase().includes(termo),
      ),
    )
  }, [meusLeads, busca])

  const itensPorColuna = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    for (const etapa of ETAPA_LEAD_ORDEM) map[String(etapa)] = []
    for (const lead of filtrados) map[String(lead.etapa)]?.push(lead)
    return map
  }, [filtrados])

  function resolverNegociacoes(lead: Lead) {
    return (lead.negociacoesAtivas ?? []).map((neg) => {
      const imovel = imoveis.find((i) => i.id === neg.imovelId)
      return {
        imovelId: neg.imovelId,
        dataInicio: neg.dataInicio,
        enderecoResumo: imovel ? `${imovel.enderecoRua}, ${imovel.enderecoNumero}` : 'Imóvel não encontrado',
      }
    })
  }

  function iniciarMovimentacao(itemId: string, _origemId: string, destinoId: string) {
    const lead = meusLeads.find((l) => l.id === itemId)
    if (!lead) return

    const destino = Number(destinoId) as EtapaLead
    const resultado = avaliarTransicaoLead(lead, destino)

    if (resultado.tipo === 'invalida') {
      toast({
        title: 'Movimento não permitido',
        description: 'Etapas do funil (1 a 6) não podem ser puladas.',
        variant: 'destructive',
      })
      return
    }

    setPending({
      lead,
      destino,
      camposFaltantes: resultado.camposFaltantes,
      requerConfirmacao: resultado.requerConfirmacao,
    })
  }

  function isColunaValidaParaDrag(itemId: string, origemId: string, destinoId: string): boolean {
    const lead = meusLeads.find((l) => l.id === itemId)
    if (!lead) return false
    if (origemId === destinoId) return true
    return avaliarTransicaoLead(lead, Number(destinoId) as EtapaLead).tipo !== 'invalida'
  }

  function confirmarMovimentacao(patch: Partial<Lead>) {
    if (!pending) return
    const { lead, destino } = pending

    const patchFinal: Partial<Lead> = { ...patch, etapa: destino }
    if (destino === 7) patchFinal.dataEntradaStandby = new Date().toISOString()

    atualizarLead.mutate(
      { id: lead.id, patch: patchFinal },
      {
        onSuccess: () => {
          toast({ title: 'Lead movido', description: `Agora em "${ETAPA_LEAD_LABEL[destino]}".` })
        },
      },
    )
    setPending(null)
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando clientes…</div>
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Meus Clientes</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={1.5} />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código, bairro ou cidade"
              className="w-full pl-9 sm:w-64"
            />
          </div>
          <Button asChild>
            <Link to="/leads/novo">+ Novo Lead</Link>
          </Button>
        </div>
      </div>

      <KanbanBoard
        colunas={COLUNAS}
        itensPorColuna={itensPorColuna}
        getItemId={(lead) => lead.id}
        renderCard={(lead, { onMover }) => (
          <CardLead
            lead={lead}
            negociacoesAtivas={resolverNegociacoes(lead)}
            onAbrirImovelNegociacao={(imovelId) => abrirModalImovel(imovelId)}
            onMover={onMover}
          />
        )}
        isColunaValidaParaDrag={isColunaValidaParaDrag}
        onSolicitarMovimentacao={iniciarMovimentacao}
      />

      <ModalGateLead
        lead={pending?.lead ?? null}
        destino={pending?.destino ?? null}
        camposFaltantes={pending?.camposFaltantes ?? []}
        requerConfirmacao={pending?.requerConfirmacao ?? false}
        onCancelar={() => setPending(null)}
        onConfirmar={confirmarMovimentacao}
      />
    </div>
  )
}
