import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { KanbanBoard, type ColunaDef } from '@/components/kanban/KanbanBoard'
import { CardCliente } from '@/components/lead/CardCliente'
import { ModalGateCliente } from '@/components/lead/ModalGateCliente'
import { DrillDownMatch } from '@/components/match/DrillDownMatch'
import type { MatchItem } from '@/components/match/ListaMatches'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ETAPA_LEAD_LABEL, ETAPA_LEAD_ORDEM, TIPO_IMOVEL_LABEL } from '@/domain/constants'
import { avaliarTransicaoLead } from '@/domain/gatesLead'
import { calcularMatch } from '@/domain/matching'
import type { EtapaLead, Imovel, Lead } from '@/domain/types'
import { useAtualizarLead, useLeads } from '@/hooks/useLeads'
import { useAtualizarImovel, useImoveis } from '@/hooks/useImoveis'
import { useMatches } from '@/hooks/useMatches'
import { CORRETORES, CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { formatPreco } from '@/lib/format'
import { useDismissStore } from '@/stores/dismissStore'
import { useNotificacoesStore } from '@/stores/notificacoesStore'
import { useScoreStore } from '@/stores/scoreStore'
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
  const atualizarImovel = useAtualizarImovel()
  const adicionarNotificacao = useNotificacoesStore((s) => s.adicionarNotificacao)
  const { contadorPorLead } = useMatches()
  const pesos = useScoreStore((s) => s.pesos)
  const descartados = useDismissStore((s) => s.descartados)
  const descartar = useDismissStore((s) => s.descartar)
  const { toast } = useToast()
  const abrirModalImovel = useUIStore((s) => s.abrirModalImovel)
  const abrirModalLead = useUIStore((s) => s.abrirModalLead)
  const [busca, setBusca] = useState('')
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [drillDownLeadId, setDrillDownLeadId] = useState<string | null>(null)

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

  const matchesDrillDown: MatchItem[] = useMemo(() => {
    if (!drillDownLeadId) return []
    const lead = leads.find((l) => l.id === drillDownLeadId)
    if (!lead) return []

    return imoveis
      .filter((i) => i.etapa !== 'f')
      .map((imovel): MatchItem | null => {
        if (descartados[`${CORRETOR_LOGADO_ID}::${lead.id}::${imovel.id}`]) return null
        const match = calcularMatch(imovel, lead, pesos)
        if (!match) return null
        const ehProprio = imovel.corretorResponsavelId === CORRETOR_LOGADO_ID
        return {
          id: imovel.id,
          score: match.score,
          isAviso: match.isAviso,
          resumo: `${TIPO_IMOVEL_LABEL[imovel.tipo]} · ${imovel.bairro} · ${formatPreco(imovel.valorAnuncio ?? imovel.valorEstimado)}`,
          corretorNome: nomeCorretor(imovel.corretorResponsavelId),
          corretorWhatsapp: CORRETORES.find((c) => c.id === imovel.corretorResponsavelId)?.telefoneWhatsapp,
          ehProprio,
        }
      })
      .filter((m): m is MatchItem => m != null)
      .sort((a, b) => b.score - a.score)
  }, [drillDownLeadId, imoveis, leads, pesos, descartados])

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
    const origem = lead.etapa

    const patchFinal: Partial<Lead> = { ...patch, etapa: destino }
    if (destino === 7) patchFinal.dataEntradaStandby = new Date().toISOString()

    const indoParaTras = ETAPA_LEAD_ORDEM.indexOf(destino) < ETAPA_LEAD_ORDEM.indexOf(origem)

    // Reversão saindo de "Em negociação": desfaz vínculos e devolve os imóveis próprios para Publicado
    if (origem === 4 && indoParaTras) {
      const negociacoesAnteriores = lead.negociacoesAtivas ?? []
      patchFinal.negociacoesAtivas = []
      // usar [] em vez de undefined: o patch é serializado com JSON.stringify, que descarta chaves undefined
      patchFinal.pendenteAprovacaoImoveis = []

      atualizarLead.mutate(
        { id: lead.id, patch: patchFinal },
        {
          onSuccess: () => {
            negociacoesAnteriores.forEach((neg) => {
              const imovel = imoveis.find((i) => i.id === neg.imovelId)
              const outroClienteAindaNegociando = leads.some(
                (l) => l.id !== lead.id && l.negociacoesAtivas?.some((n) => n.imovelId === neg.imovelId),
              )
              if (
                imovel &&
                imovel.corretorResponsavelId === CORRETOR_LOGADO_ID &&
                imovel.etapa === 'e' &&
                !outroClienteAindaNegociando
              ) {
                atualizarImovel.mutate({ id: imovel.id, patch: { etapa: 'd', emNegociacaoFlag: false } })
              }
            })
            toast({
              title: 'Cliente movido',
              description: `Agora em "${ETAPA_LEAD_LABEL[destino]}". Negociações ativas foram desfeitas.`,
            })
          },
        },
      )
      setPending(null)
      return
    }

    if (destino === 4 && patchFinal.imovelNegociacaoId) {
      const imovelIds = patchFinal.imovelNegociacaoId.split(',').filter(Boolean)
      delete patchFinal.imovelNegociacaoId
      patchFinal.negociacoesAtivas = [
        ...(lead.negociacoesAtivas ?? []),
        ...imovelIds.map((imovelId) => ({ imovelId, dataInicio: new Date().toISOString() })),
      ]
      const imoveisSelecionados = imovelIds
        .map((id) => imoveis.find((i) => i.id === id))
        .filter((i): i is Imovel => i != null)

      const proprios = imoveisSelecionados.filter(
        (i) => i.corretorResponsavelId === CORRETOR_LOGADO_ID && i.etapa !== 'e',
      )
      const deOutros = imoveisSelecionados.filter((i) => i.corretorResponsavelId !== CORRETOR_LOGADO_ID)

      if (deOutros.length > 0) {
        patchFinal.pendenteAprovacaoImoveis = [
          ...(lead.pendenteAprovacaoImoveis ?? []),
          ...deOutros.map((i) => i.id),
        ]
      }

      atualizarLead.mutate(
        { id: lead.id, patch: patchFinal },
        {
          onSuccess: () => {
            proprios.forEach((imovel) => {
              atualizarImovel.mutate({ id: imovel.id, patch: { etapa: 'e', emNegociacaoFlag: true } })
            })
            deOutros.forEach((imovel) => {
              adicionarNotificacao({
                destinatarioCorretorId: CORRETOR_LOGADO_ID,
                tipoEvento: 'E16',
                titulo: 'Aprovação pendente',
                corpo: `"${lead.codigo}" quer negociar "${imovel.enderecoRua}, ${imovel.enderecoNumero}" com ${nomeCorretor(imovel.corretorResponsavelId)}. Aprove para confirmar a negociação.`,
                acaoPendente: { leadId: lead.id, imovelId: imovel.id },
              })
            })

            if (proprios.length > 0 && deOutros.length === 0) {
              toast({ title: 'Cliente e imóvel(is) movidos', description: 'Ambos agora em "Em negociação".' })
            } else if (deOutros.length > 0) {
              toast({
                title: 'Cliente movido',
                description:
                  proprios.length > 0
                    ? 'Seus imóveis foram movidos; os demais ficam pendentes de aprovação.'
                    : 'Cliente pendente de aprovação do(s) corretor(es) responsável(is) pelo(s) imóvel(is).',
              })
            } else {
              toast({ title: 'Cliente movido', description: `Agora em "${ETAPA_LEAD_LABEL[destino]}".` })
            }
          },
        },
      )
      setPending(null)
      return
    }

    atualizarLead.mutate(
      { id: lead.id, patch: patchFinal },
      {
        onSuccess: () => {
          toast({ title: 'Cliente movido', description: `Agora em "${ETAPA_LEAD_LABEL[destino]}".` })
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
            <Link to="/clientes/novo">+ Novo Cliente</Link>
          </Button>
        </div>
      </div>

      <KanbanBoard
        colunas={COLUNAS}
        itensPorColuna={itensPorColuna}
        getItemId={(lead) => lead.id}
        renderCard={(lead, { onMover }) => (
          <CardCliente
            lead={lead}
            visao="propria"
            contadorMatches={contadorPorLead[lead.id]}
            negociacoesAtivas={resolverNegociacoes(lead)}
            onAbrirImovelNegociacao={(imovelId) => abrirModalImovel(imovelId)}
            onClick={() => abrirModalLead(lead.id)}
            onClickContador={() => setDrillDownLeadId(lead.id)}
            onMover={onMover}
          />
        )}
        isColunaValidaParaDrag={isColunaValidaParaDrag}
        onSolicitarMovimentacao={iniciarMovimentacao}
      />

      <ModalGateCliente
        lead={pending?.lead ?? null}
        destino={pending?.destino ?? null}
        camposFaltantes={pending?.camposFaltantes ?? []}
        requerConfirmacao={pending?.requerConfirmacao ?? false}
        onCancelar={() => setPending(null)}
        onConfirmar={confirmarMovimentacao}
      />

      <DrillDownMatch
        aberto={drillDownLeadId != null}
        titulo="Possíveis negócios disponíveis"
        matches={matchesDrillDown}
        onFechar={() => setDrillDownLeadId(null)}
        onAbrir={(imovelId) => {
          abrirModalImovel(imovelId)
          setDrillDownLeadId(null)
        }}
        onDismiss={(imovelId) => {
          if (drillDownLeadId) descartar(CORRETOR_LOGADO_ID, drillDownLeadId, imovelId)
        }}
      />
    </div>
  )
}
