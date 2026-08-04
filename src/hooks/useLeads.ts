import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lead } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { leadParaDominio, leadParaRow, perfilParaRow } from '@/lib/supabaseMap'

const LEADS_KEY = ['leads'] as const
const LEAD_SELECT = '*, perfis_busca(*)'

async function fetchLeads(): Promise<Lead[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('leads')
      .select(LEAD_SELECT)
      .order('data_cadastro', { ascending: true })
    if (error) throw new Error('Falha ao carregar leads')
    return data.map(leadParaDominio)
  }
  const res = await fetch('/api/leads')
  if (!res.ok) throw new Error('Falha ao carregar leads')
  return res.json()
}

async function atualizarLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  if (supabase) {
    const rowLead = leadParaRow(patch)
    if (Object.keys(rowLead).length > 0) {
      const { error } = await supabase.from('leads').update(rowLead).eq('id', id)
      if (error) throw new Error('Falha ao atualizar lead')
    }
    if (patch.perfilBusca) {
      const { error } = await supabase
        .from('perfis_busca')
        .update(perfilParaRow(patch.perfilBusca))
        .eq('lead_id', id)
      if (error) throw new Error('Falha ao atualizar perfil de busca')
    }
    const { data, error } = await supabase.from('leads').select(LEAD_SELECT).eq('id', id).single()
    if (error) throw new Error('Falha ao atualizar lead')
    return leadParaDominio(data)
  }
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Falha ao atualizar lead')
  return res.json()
}

/** Próximo código sequencial "Cliente #NNNN" (mesma regra do mock) */
async function proximoCodigo(): Promise<string> {
  const { data } = await supabase!.from('leads').select('codigo')
  const max = (data ?? []).reduce((acc, r) => {
    const n = Number(String(r.codigo).replace('Cliente #', ''))
    return Number.isFinite(n) ? Math.max(acc, n) : acc
  }, 2400)
  return `Cliente #${max + 1}`
}

async function criarLead(dados: Omit<Lead, 'id' | 'codigo' | 'dataCadastro'>): Promise<Lead> {
  if (supabase) {
    const { perfilBusca, ...lead } = dados
    const rowLead = { ...leadParaRow(lead), codigo: await proximoCodigo() }
    const { data: criado, error } = await supabase
      .from('leads')
      .insert(rowLead)
      .select()
      .single()
    if (error) throw new Error('Falha ao criar lead')
    const { error: erroPerfil } = await supabase
      .from('perfis_busca')
      .insert({ ...perfilParaRow(perfilBusca), lead_id: criado.id })
    if (erroPerfil) throw new Error('Falha ao criar perfil de busca')
    const { data, error: erroSelect } = await supabase
      .from('leads')
      .select(LEAD_SELECT)
      .eq('id', criado.id)
      .single()
    if (erroSelect) throw new Error('Falha ao criar lead')
    return leadParaDominio(data)
  }
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
  if (!res.ok) throw new Error('Falha ao criar lead')
  return res.json()
}

export function useLeads() {
  return useQuery({ queryKey: LEADS_KEY, queryFn: fetchLeads })
}

export function useAtualizarLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Lead> }) => atualizarLead(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}

export function useCriarLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}
