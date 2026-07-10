import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { KanbanBoard, type ColunaDef } from '@/components/kanban/KanbanBoard'
import { CardImovel } from '@/components/imovel/CardImovel'
import { ModalGateImovel } from '@/components/imovel/ModalGateImovel'
import { DrillDownMatch } from '@/components/match/DrillDownMatch'
import type { MatchItem } from '@/components/match/ListaMatches'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ETAPA_IMOVEL_LABEL, ETAPA_IMOVEL_ORDEM, TIPO_IMOVEL_LABEL } from '@/domain/constants'
import { avaliarTransicaoImovel } from '@/domain/gatesImovel'
import { calcularMatch } from '@/domain/matching'
import type { EtapaImovel, Imovel } from '@/domain/types'
import { useAtualizarImovel, useImoveis } from '@/hooks/useImoveis'
import { useAtualizarLead, useLeads } from '@/hooks/useLeads'
import { useMatches } from '@/hooks/useMatches'
import { CORRETORES, CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { formatDiasDesde, formatPreco } from '@/lib/format'
import { useDismissStore } from '@/stores/dismissStore'
import { useNotificacoesStore } from '@/stores/notificacoesStore'
import { useScoreStore } from '@/stores/scoreStore'
import { useUIStore } from '@/stores/uiStore'

const COLUNAS: ColunaDef[] = ETAPA_IMOVEL_ORDEM.map((etapa) => ({
  id: etapa,
  label: ETAPA_IMOVEL_LABEL[etapa],
}))

interface PendingMove {
  imovel: Imovel
  destino: EtapaImovel
  camposFaltantes: ReturnType<typeof avaliarTransicaoImovel>['camposFaltantes']
  requerConfirmacao: boolean
}

export function MeusImoveisPage() {
  const { data: imoveis = [], isLoading } = useImoveis()
  const { data: leads = [] } = useLeads()
  const atualizarImovel = useAtualizarImovel()
  const atualizarLead = useAtualizarLead()
  const adicionarNotificacao = useNotificacoesStore((s) => s.adicionarNotificacao)
  const { contadorPorImovel } = useMatches()
  const pesos = useScoreStore((s) => s.pesos)
  const descartados = useDismissStore((s) => s.descartados)
  const descartar = useDismissStore((s) => s.descartar)
  const abrirModalLead = useUIStore((s) => s.abrirModalLead)
  const abrirModalImovel = useUIStore((s) => s.abrirModalImovel)
  const { toast } = useToast()
  const [busca, setBusca] = useState('')
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [drillDownImovelId, setDrillDownImovelId] = useState<string | null>(null)

  const meusImoveis = useMemo(
    () => imoveis.filter((i) => i.corretorResponsavelId === CORRETOR_LOGADO_ID),
    [imoveis],
  )

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return meusImoveis
    return meusImoveis.filter((i) =>
      [i.enderecoRua, i.bairro, i.cidade].some((campo) => campo.toLowerCase().includes(termo)),
    )
  }, [meusImoveis, busca])

  const itensPorColuna = useMemo(() => {
    const map: Record<string, Imovel[]> = {}
    for (const etapa of ETAPA_IMOVEL_ORDEM) map[etapa] = []
    for (const imovel of filtrados) map[imovel.etapa]?.push(imovel)
    return map
  }, [filtrados])

  function iniciarMovimentacao(itemId: string, _origemId: string, destinoId: string) {
    const imovel = meusImoveis.find((i) => i.id === itemId)
    if (!imovel) return

    const resultado = avaliarTransicaoImovel(imovel, destinoId as EtapaImovel)

    if (resultado.tipo === 'invalida') {
      toast({
        title: 'Movimento não permitido',
        description: 'Etapas não podem ser puladas nem revertidas fora das transições previstas.',
        variant: 'destructive',
      })
      return
    }

    setPending({
      imovel,
      destino: destinoId as EtapaImovel,
      camposFaltantes: resultado.camposFaltantes,
      requerConfirmacao: resultado.requerConfirmacao,
    })
  }

  const matchesDrillDown: MatchItem[] = useMemo(() => {
    if (!drillDownImovelId) return []
    const imovel = imoveis.find((i) => i.id === drillDownImovelId)
    if (!imovel) return []

    return leads
      .map((lead): MatchItem | null => {
        if (descartados[`${CORRETOR_LOGADO_ID}::${lead.id}::${imovel.id}`]) return null
        const match = calcularMatch(imovel, lead, pesos)
        if (!match) return null
        const ehProprio = lead.corretorResponsavelId === CORRETOR_LOGADO_ID
        return {
          id: lead.id,
          score: match.score,
          isAviso: match.isAviso,
          resumo: `${lead.perfilBusca.tipos.map((t) => TIPO_IMOVEL_LABEL[t]).join('/')} · ${lead.perfilBusca.bairros.join(', ')} · até ${formatPreco(lead.perfilBusca.valorAte)}`,
          corretorNome: nomeCorretor(lead.corretorResponsavelId),
          corretorWhatsapp: CORRETORES.find((c) => c.id === lead.corretorResponsavelId)?.telefoneWhatsapp,
          ehProprio,
        }
      })
      .filter((m): m is MatchItem => m != null)
      .sort((a, b) => b.score - a.score)
  }, [drillDownImovelId, imoveis, leads, pesos, descartados])

  function isColunaValidaParaDrag(itemId: string, origemId: string, destinoId: string): boolean {
    const imovel = meusImoveis.find((i) => i.id === itemId)
    if (!imovel) return false
    if (origemId === destinoId) return true
    return avaliarTransicaoImovel(imovel, destinoId as EtapaImovel).tipo !== 'invalida'
  }

  function confirmarMovimentacao(patch: Partial<Imovel> & { leadNegociacaoId?: string }) {
    if (!pending) return
    const { imovel, destino } = pending

    const { leadNegociacaoId, ...resto } = patch
    const patchFinal: Partial<Imovel> = { ...resto, etapa: destino }
    if (destino === 'e') patchFinal.emNegociacaoFlag = true
    if (destino === 'd') {
      patchFinal.emNegociacaoFlag = false
      if (!imovel.dataPublicacao) patchFinal.dataPublicacao = new Date().toISOString()
    }
    if (destino === 'f') patchFinal.dataVenda = new Date().toISOString()

    if (destino === 'e' && leadNegociacaoId) {
      const lead = leads.find((l) => l.id === leadNegociacaoId)
      const mesmoCorretor = lead?.corretorResponsavelId === CORRETOR_LOGADO_ID

      atualizarImovel.mutate(
        { id: imovel.id, patch: patchFinal },
        {
          onSuccess: () => {
            if (!lead) return
            atualizarLead.mutate({
              id: lead.id,
              patch: {
                negociacoesAtivas: [
                  ...(lead.negociacoesAtivas ?? []),
                  { imovelId: imovel.id, dataInicio: new Date().toISOString() },
                ],
                ...(mesmoCorretor && lead.etapa !== 4 ? { etapa: 4 } : {}),
              },
            })
            if (mesmoCorretor) {
              toast({ title: 'Imóvel e cliente movidos', description: 'Ambos agora em "Em negociação".' })
            } else {
              adicionarNotificacao({
                destinatarioCorretorId: CORRETOR_LOGADO_ID,
                tipoEvento: 'E16',
                titulo: 'Aprovação pendente',
                corpo: `Solicitação enviada a ${nomeCorretor(lead.corretorResponsavelId)} para mover "${lead.codigo}" para "Em negociação".`,
              })
              toast({ title: 'Imóvel movido', description: 'Aguardando aprovação do corretor responsável pelo cliente.' })
            }
          },
        },
      )
      setPending(null)
      return
    }

    atualizarImovel.mutate(
      { id: imovel.id, patch: patchFinal },
      {
        onSuccess: () => {
          toast({ title: 'Imóvel movido', description: `Agora em "${ETAPA_IMOVEL_LABEL[destino]}".` })
        },
      },
    )
    setPending(null)
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-text-mut">Carregando imóveis…</div>
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Meus Imóveis</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" strokeWidth={1.5} />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por endereço, bairro ou cidade"
              className="w-full pl-9 sm:w-64"
            />
          </div>
          <Button asChild>
            <Link to="/imoveis/novo">+ Novo imóvel</Link>
          </Button>
        </div>
      </div>

      <KanbanBoard
        colunas={COLUNAS}
        itensPorColuna={itensPorColuna}
        getItemId={(imovel) => imovel.id}
        renderCard={(imovel, { onMover }) => (
          <CardImovel
            imovel={imovel}
            diasParado={formatDiasDesde(imovel.atualizadoEm)}
            contadorMatches={contadorPorImovel[imovel.id]}
            onClick={() => abrirModalImovel(imovel.id)}
            onClickContador={() => setDrillDownImovelId(imovel.id)}
            onMover={onMover}
          />
        )}
        isColunaValidaParaDrag={isColunaValidaParaDrag}
        onSolicitarMovimentacao={iniciarMovimentacao}
      />

      <ModalGateImovel
        imovel={pending?.imovel ?? null}
        destino={pending?.destino ?? null}
        camposFaltantes={pending?.camposFaltantes ?? []}
        requerConfirmacao={pending?.requerConfirmacao ?? false}
        onCancelar={() => setPending(null)}
        onConfirmar={confirmarMovimentacao}
      />

      <DrillDownMatch
        aberto={drillDownImovelId != null}
        titulo="Clientes com perfil deste imóvel"
        matches={matchesDrillDown}
        onFechar={() => setDrillDownImovelId(null)}
        onAbrir={(leadId) => {
          abrirModalLead(leadId)
          setDrillDownImovelId(null)
        }}
        onDismiss={(leadId) => {
          if (drillDownImovelId) descartar(CORRETOR_LOGADO_ID, leadId, drillDownImovelId)
        }}
      />
    </div>
  )
}
