import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Negociacao, Venda } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { negociacaoParaDominio, negociacaoParaRow, vendaParaDominio, vendaParaRow } from '@/lib/supabaseMap'

/**
 * negociacoes/vendas existem no banco desde a primeira migração — o app
 * nunca tinha escrito nelas de verdade, reimplementando a mesma coisa como
 * `Lead.negociacoesAtivas` (JSON solto, sem chave estrangeira nem `unique`),
 * o que já causou dado duplicado em produção. Ver
 * PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md.
 *
 * `useLeads()` combina o resultado destes hooks pra preencher os campos
 * calculados de `Lead` (negociacoesAtivas, imovelFechadoId, valorNegociado,
 * pagamentosConcluidos, chavesEntregues) — quem consome um Lead continua
 * lendo do mesmo jeito de sempre; só a escrita muda.
 */

const NEGOCIACOES_KEY = ['negociacoes'] as const
const VENDAS_KEY = ['vendas'] as const

async function fetchNegociacoes(): Promise<Negociacao[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('negociacoes').select('*')
  if (error) throw new Error('Falha ao carregar negociações')
  return data.map(negociacaoParaDominio)
}

export function useNegociacoes() {
  return useQuery({ queryKey: NEGOCIACOES_KEY, queryFn: fetchNegociacoes })
}

async function fetchVendas(): Promise<Venda[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('vendas').select('*')
  if (error) throw new Error('Falha ao carregar vendas')
  return data.map(vendaParaDominio)
}

export function useVendas() {
  return useQuery({ queryKey: VENDAS_KEY, queryFn: fetchVendas })
}

async function criarNegociacao(dados: Omit<Negociacao, 'id'>): Promise<Negociacao> {
  if (!supabase) throw new Error('Sem conexão com o banco')
  const { data, error } = await supabase.from('negociacoes').insert(negociacaoParaRow(dados)).select().single()
  if (error) throw new Error('Falha ao criar negociação')
  return negociacaoParaDominio(data)
}

export function useCriarNegociacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarNegociacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEGOCIACOES_KEY })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

async function atualizarNegociacao(id: string, patch: Partial<Negociacao>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('negociacoes').update(negociacaoParaRow(patch)).eq('id', id)
  if (error) throw new Error('Falha ao atualizar negociação')
}

export function useAtualizarNegociacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Negociacao> }) => atualizarNegociacao(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEGOCIACOES_KEY })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

async function criarVenda(dados: Omit<Venda, 'id'>): Promise<Venda> {
  if (!supabase) throw new Error('Sem conexão com o banco')
  const { data, error } = await supabase.from('vendas').insert(vendaParaRow(dados)).select().single()
  if (error) throw new Error('Falha ao criar venda')
  return vendaParaDominio(data)
}

export function useCriarVenda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarVenda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDAS_KEY })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

async function atualizarVenda(id: string, patch: Partial<Venda>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('vendas').update(vendaParaRow(patch)).eq('id', id)
  if (error) throw new Error('Falha ao atualizar venda')
}

export function useAtualizarVenda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Venda> }) => atualizarVenda(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDAS_KEY })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
