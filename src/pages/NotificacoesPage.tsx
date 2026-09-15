import { useMemo, useState } from 'react'
import { ArrowLeftRight, Bell, BellOff, Check, DollarSign, Handshake, Link2Off, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/shared/EmptyState'
import type { TipoEvento } from '@/domain/types'
import { registrarAtividade } from '@/hooks/useAtividades'
import { useAtualizarImovel, useImoveis } from '@/hooks/useImoveis'
import { useAtualizarLead, useLeads } from '@/hooks/useLeads'
import { useAtualizarNegociacao, useNegociacoes } from '@/hooks/useNegociacoes'
import { useAtualizarNotificacao, useNotificacoes } from '@/hooks/useNotificacoes'
import { formatData, formatPreco } from '@/lib/format'
import { cn } from '@/lib/cn'

const ICONE_POR_TIPO: Partial<Record<TipoEvento, typeof Bell>> = {
  E2: Users,
  E4: Users,
  E12: Handshake,
  E16: Link2Off,
  E17: ArrowLeftRight,
  E18: DollarSign,
}

type Filtro = 'todas' | 'nao_lidas' | TipoEvento

export function NotificacoesPage() {
  const { data: notificacoes = [], isLoading } = useNotificacoes()
  const atualizarNotificacao = useAtualizarNotificacao()
  const { data: leads = [] } = useLeads()
  const { data: imoveis = [] } = useImoveis()
  const { data: negociacoes = [] } = useNegociacoes()
  const atualizarImovel = useAtualizarImovel()
  const atualizarLead = useAtualizarLead()
  const atualizarNegociacao = useAtualizarNegociacao()
  const { toast } = useToast()
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [precos, setPrecos] = useState<Record<string, string>>({})

  function aprovar(notificacaoId: string, leadId: string, imovelId: string) {
    const lead = leads.find((l) => l.id === leadId)
    atualizarImovel.mutate({ id: imovelId, patch: { etapa: 'e', emNegociacaoFlag: true } })
    if (lead) {
      const pendenteRestante = (lead.pendenteAprovacaoImoveis ?? []).filter((id) => id !== imovelId)
      atualizarLead.mutate({
        id: lead.id,
        // usar [] em vez de undefined: o patch é serializado com JSON.stringify, que descarta chaves undefined
        patch: { pendenteAprovacaoImoveis: pendenteRestante },
      })
    }
    atualizarNotificacao.mutate({ id: notificacaoId, patch: { resolvida: true, lida: true } })
    toast({ title: 'Negociação aprovada', description: 'O imóvel foi movido para "Em negociação".' })
  }

  /**
   * Confirma a venda com o preço — ação exclusiva do corretor do imóvel,
   * depois que o corretor do cliente já fechou o negócio (decisão do PO,
   * 14/09/2026: "cabe ao corretor do cliente mover o card... corretor do
   * imóvel colocar o preço da venda depois da conclusão"). Só muda o status
   * da negociação — o trigger de banco (migração 12) cuida do resto
   * sozinho: cria a venda, move o imóvel pra "Vendido" e desfaz as outras
   * negociações ativas do MESMO cliente (ele já comprou, não faz sentido
   * continuar "em negociação" com outros imóveis — bug real do TESTES 05
   * item 1, resolvido na raiz agora).
   */
  function confirmarVenda(notificacaoId: string, leadId: string, imovelId: string) {
    const valor = Number(precos[notificacaoId])
    if (!valor || valor <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' })
      return
    }
    const negociacao = negociacoes.find((n) => n.leadId === leadId && n.imovelId === imovelId && n.status === 'ativa')
    if (!negociacao) {
      toast({
        title: 'Não foi possível confirmar',
        description: 'Não há mais uma negociação ativa entre esse cliente e esse imóvel — pode já ter sido revertida.',
        variant: 'destructive',
      })
      return
    }

    atualizarNegociacao.mutate(
      { id: negociacao.id, patch: { status: 'concluida', dataFim: new Date().toISOString(), valorNegociado: valor } },
      {
        onSuccess: () => {
          atualizarNotificacao.mutate({ id: notificacaoId, patch: { resolvida: true, lida: true } })
          setPrecos((p) => {
            const resto = { ...p }
            delete resto[notificacaoId]
            return resto
          })
          const imovel = imoveis.find((i) => i.id === imovelId)
          registrarAtividade(
            `Imóvel "${imovel ? `${imovel.enderecoRua}, ${imovel.enderecoNumero}` : imovelId}" vendido por ${formatPreco(valor)}.`,
          )
          toast({ title: 'Venda confirmada', description: 'O imóvel foi movido para "Vendido".' })
        },
      },
    )
  }

  const tiposPresentes = useMemo(
    () => Array.from(new Set(notificacoes.map((n) => n.tipoEvento))),
    [notificacoes],
  )

  const ordenadas = useMemo(
    () =>
      [...notificacoes].sort(
        (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
      ),
    [notificacoes],
  )

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return ordenadas
    if (filtro === 'nao_lidas') return ordenadas.filter((n) => !n.lida)
    return ordenadas.filter((n) => n.tipoEvento === filtro)
  }, [ordenadas, filtro])

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Notificações</h1>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="nao_lidas">Não lidas</SelectItem>
            {tiposPresentes.map((t) => (
              <SelectItem key={t} value={t}>
                Tipo {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-mut">Carregando notificações…</p>
      ) : filtradas.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação" description="Não há notificações para este filtro." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtradas.map((n) => {
            const Icon = ICONE_POR_TIPO[n.tipoEvento] ?? Bell
            return (
              <li
                key={n.id}
                onClick={() => !n.lida && atualizarNotificacao.mutate({ id: n.id, patch: { lida: true } })}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-card',
                  !n.lida && 'border-primary/30 bg-primary/5',
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{n.titulo}</p>
                    <span className="shrink-0 font-mono text-xs text-text-soft">{formatData(n.criadaEm)}</span>
                  </div>
                  <p className="text-sm text-text-mut">{n.corpo}</p>
                  {n.tipoEvento === 'E18' && n.acaoPendente && !n.resolvida && (
                    <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Valor da venda"
                        className="h-7 w-32 text-xs"
                        value={precos[n.id] ?? ''}
                        onChange={(e) => setPrecos((p) => ({ ...p, [n.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => confirmarVenda(n.id, n.acaoPendente!.leadId, n.acaoPendente!.imovelId)}
                      >
                        <Check className="h-3 w-3" strokeWidth={1.5} />
                        Confirmar venda
                      </Button>
                    </div>
                  )}
                  {n.tipoEvento !== 'E18' && n.acaoPendente && !n.resolvida && (
                    <Button
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        aprovar(n.id, n.acaoPendente!.leadId, n.acaoPendente!.imovelId)
                      }}
                    >
                      <Check className="h-3 w-3" strokeWidth={1.5} />
                      Aprovar
                    </Button>
                  )}
                  {n.acaoPendente && n.resolvida && (
                    <p className="mt-1 text-xs text-success">
                      {n.tipoEvento === 'E18' ? 'Venda confirmada' : 'Aprovado'}
                    </p>
                  )}
                  {n.lida && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 px-2 text-xs text-text-mut"
                      onClick={(e) => {
                        e.stopPropagation()
                        atualizarNotificacao.mutate({ id: n.id, patch: { lida: false } })
                      }}
                    >
                      <BellOff className="h-3 w-3" strokeWidth={1.5} />
                      Marcar como não lida
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
