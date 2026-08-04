import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Imovel } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { imovelParaDominio, imovelParaRow } from '@/lib/supabaseMap'

const IMOVEIS_KEY = ['imoveis'] as const

async function fetchImoveis(): Promise<Imovel[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('imoveis')
      .select('*')
      .order('criado_em', { ascending: true })
    if (error) throw new Error('Falha ao carregar imóveis')
    return data.map(imovelParaDominio)
  }
  const res = await fetch('/api/imoveis')
  if (!res.ok) throw new Error('Falha ao carregar imóveis')
  return res.json()
}

async function atualizarImovel(id: string, patch: Partial<Imovel>): Promise<Imovel> {
  if (supabase) {
    const { data, error } = await supabase
      .from('imoveis')
      .update(imovelParaRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error('Falha ao atualizar imóvel')
    return imovelParaDominio(data)
  }
  const res = await fetch(`/api/imoveis/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Falha ao atualizar imóvel')
  return res.json()
}

async function criarImovel(dados: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Imovel> {
  if (supabase) {
    const { data, error } = await supabase
      .from('imoveis')
      .insert(imovelParaRow(dados))
      .select()
      .single()
    if (error) {
      // CNM duplicado é validado no app antes do submit; aqui é a rede de segurança do banco
      throw new Error(error.code === '23505' ? 'CNM já cadastrado' : 'Falha ao criar imóvel')
    }
    return imovelParaDominio(data)
  }
  const res = await fetch('/api/imoveis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  if (!res.ok) throw new Error('Falha ao criar imóvel')
  return res.json()
}

export function useImoveis() {
  return useQuery({ queryKey: IMOVEIS_KEY, queryFn: fetchImoveis })
}

export function useAtualizarImovel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Imovel> }) => atualizarImovel(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMOVEIS_KEY })
    },
  })
}

export function useCriarImovel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarImovel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMOVEIS_KEY })
    },
  })
}
