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
import type { EtapaImovel, Imovel } from '@/domain/types'
import { useAtualizarImovel, useImoveis } from '@/hooks/useImoveis'
import { useMatches, useMatchesDoImovel } from '@/hooks/useMatches'
import { useAtualizarNegociacao, useNegociacoes } from '@/hooks/useNegociacoes'
import { CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { formatDiasDesde, formatPreco } from '@/lib/format'
import { useDismisses } from '@/hooks/useDismisses'
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
  const { data: negociacoes = [] } = useNegociacoes()
  const atualizarImovel = useAtualizarImovel()
  const atualizarNegociacao = useAtualizarNegociacao()
  const { contadorPorImovel } = useMatches()
  const { descartar } = useDismisses()
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
      const indoParaNegociacao = imovel.etapa === 'd' && destinoId === 'e'
      toast({
        title: 'Movimento não permitido',
        description: indoParaNegociacao
          ? 'A negociação começa pelo lado do cliente. Contate o corretor do cliente interessado — o imóvel entra em negociação quando ele mover o card e você aprovar.'
          : 'Etapas não podem ser puladas nem revertidas fora das transições previstas.',
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

  const { data: matchesBrutos = [] } = useMatchesDoImovel(drillDownImovelId)
  const matchesDrillDown: MatchItem[] = useMemo(
    () =>
      matchesBrutos.map((m) => ({
        id: m.leadId,
        score: m.score,
        isAviso: m.isAviso,
        resumo: `${m.tipos.map((t) => TIPO_IMOVEL_LABEL[t]).join('/')} · ${m.bairros.join(', ')} · até ${formatPreco(m.valorAte)}`,
        corretorNome: nomeCorretor(m.corretorResponsavelId),
      })),
    [matchesBrutos],
  )

  function isColunaValidaParaDrag(itemId: string, origemId: string, destinoId: string): boolean {
    const imovel = meusImoveis.find((i) => i.id === itemId)
    if (!imovel) return false
    if (origemId === destinoId) return true
    return avaliarTransicaoImovel(imovel, destinoId as EtapaImovel).tipo !== 'invalida'
  }

  function confirmarMovimentacao(patch: Partial<Imovel>) {
    if (!pending) return
    const { imovel, destino } = pending
    const origem = imovel.etapa

    const patchFinal: Partial<Imovel> = { ...patch, etapa: destino }
    // 'e' só chega aqui pela reversão f→e (venda desfeita) — destino 'f' não
    // passa mais por confirmarMovimentacao, ver NotificacoesPage.confirmarVenda
    if (destino === 'e') patchFinal.emNegociacaoFlag = true
    if (destino === 'd') {
      patchFinal.emNegociacaoFlag = false
      if (!imovel.dataPublicacao) patchFinal.dataPublicacao = new Date().toISOString()
    }

    // Reversão pra "Publicado" (vindo de "Em negociação" OU direto de "Vendido"):
    // o trigger de banco (migração 12) cuida do resto sozinho a partir daqui
    // — reverte a venda ligada (se houver) e devolve cada cliente vinculado
    // pra "Em contato" quando não sobrar mais nenhuma negociação ativa dele,
    // notificando quem precisa saber. Sem isso, pular "Vendido" → "Publicado"
    // direto (sem passar por "Em negociação") deixava o cliente com dado
    // órfão: card preso apontando pra um imóvel que já tinha voltado a ser um
    // imóvel qualquer — foi exatamente o que aconteceu de verdade uma vez.
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

    // "Vendido" deixou de ser uma transição manual do lado do imóvel (decisão
    // do PO — cabe ao corretor do CLIENTE fechar o negócio; o corretor do
    // imóvel só entra depois, informando o valor pra confirmar a venda).
    // avaliarTransicaoImovel já bloqueia esse drag; a confirmação com o
    // preço acontece em NotificacoesPage.tsx (confirmarVenda).

    // Reversão de Vendido pra Em Negociação: a venda caiu, mas o cliente ainda
    // está negociando. O trigger de banco (migração 12/14) reabre a
    // negociação sozinho — devolve o lead pra etapa 4, reverte a venda e
    // notifica o corretor do cliente se for de outra pessoa.
    if (origem === 'f' && destino === 'e') {
      const negociacoesConcluidas = negociacoes.filter((n) => n.imovelId === imovel.id && n.status === 'concluida')

      atualizarImovel.mutate(
        { id: imovel.id, patch: patchFinal },
        {
          onSuccess: () => {
            negociacoesConcluidas.forEach((neg) => {
              atualizarNegociacao.mutate({ id: neg.id, patch: { status: 'ativa', dataFim: undefined } })
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

    // Negociação nunca começa pelo lado do imóvel (decisão do PO, ver
    // PLANO_TRIGGER_SINCRONIA_NEGOCIACAO.md §A.5) — avaliarTransicaoImovel
    // já bloqueia o drag 'd' → 'e' antes de chegar aqui. O imóvel só entra
    // em "Em negociação" via aprovação (NotificacoesPage.aprovar), a
    // partir do card do cliente ter sido movido primeiro.

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
