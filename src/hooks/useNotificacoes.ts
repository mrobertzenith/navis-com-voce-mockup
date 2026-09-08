import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notificacao } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { NOTIFICACOES_SEED } from '@/mocks/data/notificacoes'

/**
 * Notificações reais, sincronizadas pelo banco — substituem o antigo Zustand
 * local (navis-notificacoes), que só existia no navegador de quem a criava e
 * por isso NUNCA alcançava o outro corretor. Isso deixava toda aprovação
 * cross-corretor (negociação, CNM duplicado) sem efeito prático: o dono do
 * imóvel nunca via o pedido.
 */

const NOTIFICACOES_KEY = ['notificacoes'] as const

function paraDominio(row: Record<string, unknown>): Notificacao {
  return {
    id: String(row.id),
    destinatarioCorretorId: String(row.destinatario_corretor_id),
    tipoEvento: row.tipo_evento as Notificacao['tipoEvento'],
    titulo: String(row.titulo),
    corpo: String(row.corpo),
    lida: Boolean(row.lida),
    criadaEm: String(row.criada_em),
    acaoPendente: (row.acao_pendente as Notificacao['acaoPendente']) ?? undefined,
    resolvida: row.resolvida == null ? undefined : Boolean(row.resolvida),
  }
}

async function fetchNotificacoes(): Promise<Notificacao[]> {
  // modo mock (sem banco): amostra estática só para visualização em desenvolvimento
  if (!supabase) return NOTIFICACOES_SEED
  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('destinatario_corretor_id', CORRETOR_LOGADO_ID)
    .order('criada_em', { ascending: false })
  if (error) throw new Error('Falha ao carregar notificações')
  return data.map(paraDominio)
}

export function useNotificacoes() {
  return useQuery({ queryKey: NOTIFICACOES_KEY, queryFn: fetchNotificacoes })
}

interface NovaNotificacao {
  destinatarioCorretorId: string
  tipoEvento: Notificacao['tipoEvento']
  titulo: string
  corpo: string
  acaoPendente?: { leadId: string; imovelId: string }
}

async function criarNotificacao(n: NovaNotificacao): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('notificacoes').insert({
    destinatario_corretor_id: n.destinatarioCorretorId,
    tipo_evento: n.tipoEvento,
    titulo: n.titulo,
    corpo: n.corpo,
    acao_pendente: n.acaoPendente ?? null,
  })
  if (error) throw new Error('Falha ao enviar notificação')
}

export function useCriarNotificacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarNotificacao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICACOES_KEY }),
  })
}

async function atualizarNotificacao(id: string, patch: Partial<Pick<Notificacao, 'lida' | 'resolvida'>>) {
  if (!supabase) return
  const row: Record<string, unknown> = {}
  if ('lida' in patch) row.lida = patch.lida
  if ('resolvida' in patch) row.resolvida = patch.resolvida
  const { error } = await supabase.from('notificacoes').update(row).eq('id', id)
  if (error) throw new Error('Falha ao atualizar notificação')
}

export function useAtualizarNotificacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Notificacao, 'lida' | 'resolvida'>> }) =>
      atualizarNotificacao(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICACOES_KEY }),
  })
}
