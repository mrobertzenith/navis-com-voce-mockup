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
import {
  useAtualizarNegociacao,
  useAtualizarVenda,
  useCriarNegociacao,
  useCriarVenda,
  useNegociacoes,
  useVendas,
} from '@/hooks/useNegociacoes'
import { CORRETORES, CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { formatDiasDesde, formatPreco } from '@/lib/format'
import { useDismissStore } from '@/stores/dismissStore'
import { useCriarNotificacao } from '@/hooks/useNotificacoes'
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
  const { data: negociacoes = [] } = useNegociacoes()
  const { data: vendas = [] } = useVendas()
  const atualizarImovel = useAtualizarImovel()
  const atualizarLead = useAtualizarLead()
  const criarNegociacao = useCriarNegociacao()
  const atualizarNegociacao = useAtualizarNegociacao()
  const criarVenda = useCriarVenda()
  const atualizarVenda = useAtualizarVenda()
  const criarNotificacao = useCriarNotificacao()
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
    const origem = imovel.etapa

    const { leadNegociacaoId, ...resto } = patch
    const patchFinal: Partial<Imovel> = { ...resto, etapa: destino }
    if (destino === 'e') patchFinal.emNegociacaoFlag = true
    if (destino === 'd') {
      patchFinal.emNegociacaoFlag = false
      if (!imovel.dataPublicacao) patchFinal.dataPublicacao = new Date().toISOString()
    }
    if (destino === 'f') patchFinal.dataVenda = new Date().toISOString()

    // Reversão pra "Publicado" (vindo de "Em negociação" OU direto de "Vendido"):
    // reverte a negociação (ativa ou concluída) de TODO cliente que ainda
    // referencia este imóvel. Sem isso, pular "Vendido" → "Publicado" direto
    // (sem passar por "Em negociação") deixava o cliente com dado órfão: card
    // preso em "Em negociação"/"Negócio Fechado" apontando pra um imóvel que já
    // tinha voltado a ser um imóvel qualquer, disponível pra qualquer um — foi
    // exatamente o que aconteceu de verdade com um cliente de teste.
    if ((origem === 'e' || origem === 'f') && destino === 'd') {
      const negociacoesDoImovel = negociacoes.filter(
        (n) => n.imovelId === imovel.id && (n.status === 'ativa' || n.status === 'concluida'),
      )

      atualizarImovel.mutate(
        { id: imovel.id, patch: patchFinal },
        {
          onSuccess: () => {
            negociacoesDoImovel.forEach((neg) => {
              atualizarNegociacao.mutate({
                id: neg.id,
                patch: { status: 'revertida', dataFim: new Date().toISOString() },
              })
              if (neg.status === 'concluida') {
                const venda = vendas.find((v) => v.negociacaoId === neg.id)
                if (venda) {
                  atualizarVenda.mutate({
                    id: venda.id,
                    patch: { revertida: true, justificativaReversao: 'Imóvel voltou a Publicado' },
                  })
                }
              }
              const lead = neg.leadId ? leads.find((l) => l.id === neg.leadId) : undefined
              if (!lead) return
              const pendenteRestante = (lead.pendenteAprovacaoImoveis ?? []).filter((id) => id !== imovel.id)
              const aindaTemOutraNegociacaoAtiva = negociacoes.some(
                (n) => n.id !== neg.id && n.leadId === lead.id && n.status === 'ativa',
              )
              const voltaPraEmContato =
                !aindaTemOutraNegociacaoAtiva && (lead.etapa === 4 || lead.etapa === 5 || lead.etapa === 6)
              atualizarLead.mutate({
                id: lead.id,
                patch: {
                  // usar [] em vez de undefined: o patch é serializado com JSON.stringify, que descarta chaves undefined
                  pendenteAprovacaoImoveis: pendenteRestante,
                  ...(voltaPraEmContato ? { etapa: 3 } : {}),
                },
              })
              // card de outro corretor foi movido de forma passiva — ele precisa saber
              if (voltaPraEmContato && lead.corretorResponsavelId !== CORRETOR_LOGADO_ID) {
                criarNotificacao.mutate({
                  destinatarioCorretorId: lead.corretorResponsavelId,
                  tipoEvento: 'E17',
                  titulo: 'Cliente movido automaticamente',
                  corpo: `${nomeCorretor(CORRETOR_LOGADO_ID)} tirou o imóvel "${imovel.enderecoRua}, ${imovel.enderecoNumero}" de negociação — seu cliente "${lead.codigo}" voltou para "Em contato".`,
                })
              }
            })
            toast({
              title: 'Imóvel movido',
              description: `Agora em "${ETAPA_IMOVEL_LABEL[destino]}". Negociações vinculadas foram desfeitas.`,
            })
          },
        },
      )
      setPending(null)
      return
    }

    // Vendido: precisa saber pra quem, senão o card do cliente nunca sabe que o
    // imóvel dele foi vendido. Move o cliente escolhido pra "Negócio Fechado" e
    // desfaz a negociação dos DEMAIS clientes que tinham esse imóvel no radar —
    // um imóvel vendido não pode continuar "em negociação" com mais ninguém.
    if (destino === 'f' && leadNegociacaoId) {
      const leadComprador = leads.find((l) => l.id === leadNegociacaoId)
      const negociacaoDoComprador = negociacoes.find(
        (n) => n.leadId === leadNegociacaoId && n.imovelId === imovel.id && n.status === 'ativa',
      )
      const outrasNegociacoesDoImovel = negociacoes.filter(
        (n) => n.id !== negociacaoDoComprador?.id && n.imovelId === imovel.id && n.status === 'ativa',
      )
      const valorVenda = patchFinal.valorVenda

      atualizarImovel.mutate(
        { id: imovel.id, patch: patchFinal },
        {
          onSuccess: () => {
            if (leadComprador) {
              atualizarLead.mutate({ id: leadComprador.id, patch: { etapa: 5 } })
              if (leadComprador.corretorResponsavelId !== CORRETOR_LOGADO_ID) {
                criarNotificacao.mutate({
                  destinatarioCorretorId: leadComprador.corretorResponsavelId,
                  tipoEvento: 'E17',
                  titulo: 'Cliente movido automaticamente',
                  corpo: `${nomeCorretor(CORRETOR_LOGADO_ID)} vendeu o imóvel "${imovel.enderecoRua}, ${imovel.enderecoNumero}" — seu cliente "${leadComprador.codigo}" foi movido para "Negócio Fechado".`,
                })
              }
              if (negociacaoDoComprador) {
                atualizarNegociacao.mutate(
                  {
                    id: negociacaoDoComprador.id,
                    patch: { status: 'concluida', dataFim: new Date().toISOString(), valorNegociado: valorVenda },
                  },
                  {
                    onSuccess: () => {
                      criarVenda.mutate({
                        negociacaoId: negociacaoDoComprador.id,
                        imovelId: imovel.id,
                        leadId: leadComprador.id,
                        corretorImovelId: negociacaoDoComprador.corretorImovelId,
                        corretorClienteId: negociacaoDoComprador.corretorClienteId,
                        valorVenda: valorVenda ?? 0,
                        dataVenda: new Date().toISOString(),
                        revertida: false,
                        pagamentosConcluidos: false,
                        chavesEntregues: false,
                      })
                    },
                  },
                )
              }
            }
            outrasNegociacoesDoImovel.forEach((n) => {
              atualizarNegociacao.mutate({ id: n.id, patch: { status: 'revertida', dataFim: new Date().toISOString() } })
            })
            toast({
              title: 'Imóvel vendido',
              description: leadComprador
                ? `Cliente "${leadComprador.codigo}" movido para "Negócio Fechado".`
                : 'Imóvel movido para "Vendido".',
            })
          },
        },
      )
      setPending(null)
      return
    }

    // Reversão de Vendido pra Em Negociação: a venda caiu, mas o cliente ainda
    // está negociando — devolve o(s) cliente(s) que tinham fechado com este
    // imóvel de volta pra "Em negociação", sem perder o vínculo.
    if (origem === 'f' && destino === 'e') {
      const negociacoesConcluidas = negociacoes.filter((n) => n.imovelId === imovel.id && n.status === 'concluida')

      atualizarImovel.mutate(
        { id: imovel.id, patch: patchFinal },
        {
          onSuccess: () => {
            negociacoesConcluidas.forEach((neg) => {
              atualizarNegociacao.mutate({ id: neg.id, patch: { status: 'ativa', dataFim: undefined } })
              const venda = vendas.find((v) => v.negociacaoId === neg.id)
              if (venda) {
                atualizarVenda.mutate({
                  id: venda.id,
                  patch: { revertida: true, justificativaReversao: 'Imóvel voltou a Em negociação' },
                })
              }
              const leadRevertido = neg.leadId ? leads.find((l) => l.id === neg.leadId) : undefined
              if (leadRevertido) {
                atualizarLead.mutate({ id: leadRevertido.id, patch: { etapa: 4 } })
                if (leadRevertido.corretorResponsavelId !== CORRETOR_LOGADO_ID) {
                  criarNotificacao.mutate({
                    destinatarioCorretorId: leadRevertido.corretorResponsavelId,
                    tipoEvento: 'E17',
                    titulo: 'Cliente movido automaticamente',
                    corpo: `${nomeCorretor(CORRETOR_LOGADO_ID)} reverteu a venda do imóvel "${imovel.enderecoRua}, ${imovel.enderecoNumero}" — seu cliente "${leadRevertido.codigo}" voltou para "Em negociação".`,
                  })
                }
              }
            })
            toast({
              title: 'Imóvel movido',
              description:
                negociacoesConcluidas.length > 0
                  ? 'Agora em "Em negociação". O(s) cliente(s) vinculado(s) voltou(aram) junto.'
                  : 'Agora em "Em negociação".',
            })
          },
        },
      )
      setPending(null)
      return
    }

    if (destino === 'e' && leadNegociacaoId) {
      const lead = leads.find((l) => l.id === leadNegociacaoId)
      const mesmoCorretor = lead?.corretorResponsavelId === CORRETOR_LOGADO_ID

      // Mesma classe de bug real do lado do cliente (ver MeusClientesPage.tsx):
      // criar a negociação DEPOIS de já ter movido o imóvel deixava o card
      // avançar mesmo quando o banco recusasse (índice único parcial). Tenta
      // criar a negociação PRIMEIRO; só move o imóvel se der certo.
      void (async () => {
        if (!lead) return
        try {
          await criarNegociacao.mutateAsync({
            imovelId: imovel.id,
            leadId: lead.id,
            corretorImovelId: imovel.corretorResponsavelId,
            corretorClienteId: lead.corretorResponsavelId,
            dataInicio: new Date().toISOString(),
            status: 'ativa',
          })
        } catch {
          toast({
            title: 'Não foi possível negociar',
            description: 'Este imóvel já está em negociação com outro cliente.',
            variant: 'destructive',
          })
          return
        }

        atualizarImovel.mutate(
          { id: imovel.id, patch: patchFinal },
          {
            onSuccess: () => {
              atualizarLead.mutate({
                id: lead.id,
                patch: {
                  pendenteAprovacaoImoveis: mesmoCorretor
                    ? lead.pendenteAprovacaoImoveis
                    : [...(lead.pendenteAprovacaoImoveis ?? []), imovel.id],
                  ...(lead.etapa !== 4 ? { etapa: 4 } : {}),
                },
              })
              if (mesmoCorretor) {
                toast({ title: 'Imóvel e cliente movidos', description: 'Ambos agora em "Em negociação".' })
              } else {
                // vai para quem PRECISA aprovar (dono do cliente) — não para quem pediu
                criarNotificacao.mutate({
                  destinatarioCorretorId: lead.corretorResponsavelId,
                  tipoEvento: 'E16',
                  titulo: 'Aprovação pendente',
                  corpo: `${nomeCorretor(CORRETOR_LOGADO_ID)} quer vincular o imóvel "${imovel.enderecoRua}, ${imovel.enderecoNumero}" ao seu cliente "${lead.codigo}". Aprove para confirmar a negociação.`,
                  acaoPendente: { leadId: lead.id, imovelId: imovel.id },
                })
                toast({ title: 'Imóvel movido', description: 'Cliente pendente de aprovação do corretor responsável.' })
              }
            },
          },
        )
      })()
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
