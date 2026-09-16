import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Atividade } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import { ATIVIDADES_SEED } from '@/mocks/data/atividades'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

const ATIVIDADES_KEY = ['atividades'] as const

async function fetchAtividades(): Promise<Atividade[]> {
  if (!supabase) return ATIVIDADES_SEED
  const { data, error } = await supabase
    .from('atividades')
    .select('id, corretor_id, descricao, criado_em')
    .eq('corretor_id', CORRETOR_LOGADO_ID)
    .order('criado_em', { ascending: false })
    .limit(30)
  if (error) throw new Error('Falha ao carregar atividades')
  return data.map((row) => ({
    id: String(row.id),
    corretorId: String(row.corretor_id),
    descricao: String(row.descricao),
    timestamp: String(row.criado_em),
  }))
}

export function useAtividades() {
  return useQuery({ queryKey: ATIVIDADES_KEY, queryFn: fetchAtividades })
}

/**
 * Grava uma atividade real no feed do corretor logado (tabela `atividades`,
 * insert-only por dono — migração 15). Antes disso, "Suas atividades" no
 * Dashboard era sempre o mesmo array de 6 exemplos fixos, mesmo em produção
 * (achado de auditoria, 14/09/2026). Sem Supabase (modo mock offline) não
 * há onde persistir — a Dashboard segue mostrando os exemplos seedados
 * nesse modo, que é só demonstração local mesmo.
 *
 * Era fire-and-forget (não atualizava o cache do React Query) — a atividade
 * só aparecia depois de recarregar a página (achado de revisão, 15/09/2026).
 * Agora é uma mutation: ao terminar o insert, insere o item novo direto no
 * cache de `useAtividades()` (mais rápido que invalidar e esperar um novo
 * fetch). Erro de gravação não deve quebrar o fluxo principal (o cadastro/
 * venda já foi concluído antes de chamar isto) — só loga, sem toast.
 */
export function useRegistrarAtividade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (descricao: string): Promise<Atividade | null> => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('atividades')
        .insert({ corretor_id: CORRETOR_LOGADO_ID, descricao })
        .select('id, corretor_id, descricao, criado_em')
        .single()
      if (error) throw new Error(error.message)
      return {
        id: String(data.id),
        corretorId: String(data.corretor_id),
        descricao: String(data.descricao),
        timestamp: String(data.criado_em),
      }
    },
    onSuccess: (nova) => {
      if (!nova) return
      queryClient.setQueryData<Atividade[]>(ATIVIDADES_KEY, (atual) => [nova, ...(atual ?? [])].slice(0, 30))
    },
    onError: (erro) => {
      console.error('Falha ao registrar atividade:', erro)
    },
  })
}
