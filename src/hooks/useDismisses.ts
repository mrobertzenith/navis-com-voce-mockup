import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useDismissStore } from '@/stores/dismissStore'

const DISMISSES_KEY = ['dismisses'] as const

function chave(corretorId: string, leadId: string, imovelId: string): string {
  return `${corretorId}::${leadId}::${imovelId}`
}

/**
 * "Não interessou" (match descartado) é por corretor: cada um decide o que
 * não quer ver de novo, sem afetar a visão dos colegas. A tabela `dismisses`
 * já existe com RLS dono-a-dono (migração 15); antes disso o descarte vivia
 * só no localStorage do navegador (Zustand `dismissStore`), o que perdia o
 * dado ao trocar de aparelho ou limpar o navegador. Sem Supabase (modo mock
 * 100% offline), não há onde persistir de verdade — mantém o store local.
 */
async function fetchDismisses(): Promise<Record<string, string>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('dismisses').select('corretor_id, lead_id, imovel_id, data_dismiss')
  if (error) throw new Error('Falha ao carregar descartes de match')
  const map: Record<string, string> = {}
  for (const row of data) {
    map[chave(String(row.corretor_id), String(row.lead_id), String(row.imovel_id))] = String(row.data_dismiss)
  }
  return map
}

async function descartarMatch(corretorId: string, leadId: string, imovelId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('dismisses')
    .upsert({ corretor_id: corretorId, lead_id: leadId, imovel_id: imovelId })
  if (error) throw new Error('Falha ao descartar match')
}

export function useDismisses(): { descartados: Record<string, string>; descartar: (corretorId: string, leadId: string, imovelId: string) => void } {
  const queryClient = useQueryClient()
  const { data: descartadosBanco = {} } = useQuery({
    queryKey: DISMISSES_KEY,
    queryFn: fetchDismisses,
    enabled: Boolean(supabase),
  })
  const mutation = useMutation({
    mutationFn: ({ corretorId, leadId, imovelId }: { corretorId: string; leadId: string; imovelId: string }) =>
      descartarMatch(corretorId, leadId, imovelId),
    // No modo servidor a lista/contadores de match vêm da Edge Function e a
    // chave deles não depende dos descartes — sem invalidar ['matches'] aqui,
    // o "Não interessou" gravava no banco mas a tela não mudava (regressão da
    // separação servidor/local, corrigida em 20/10/2026). O filtro otimista
    // tira o item da lista na hora, sem esperar a Edge Function responder.
    onMutate: ({ leadId, imovelId }) => {
      // chaves: ['matches', 'por-imovel'|'por-lead', 'servidor'|'local', id, ...]
      queryClient.setQueriesData<Array<{ leadId?: string; imovelId?: string }>>(
        { predicate: (q) => q.queryKey[0] === 'matches' && q.queryKey[1] === 'por-imovel' && q.queryKey[3] === imovelId },
        (lista) => lista?.filter((m) => m.leadId !== leadId),
      )
      queryClient.setQueriesData<Array<{ leadId?: string; imovelId?: string }>>(
        { predicate: (q) => q.queryKey[0] === 'matches' && q.queryKey[1] === 'por-lead' && q.queryKey[3] === leadId },
        (lista) => lista?.filter((m) => m.imovelId !== imovelId),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DISMISSES_KEY })
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const descartadosLocal = useDismissStore((s) => s.descartados)
  const descartarLocal = useDismissStore((s) => s.descartar)

  if (supabase) {
    return {
      descartados: descartadosBanco,
      descartar: (corretorId, leadId, imovelId) => mutation.mutate({ corretorId, leadId, imovelId }),
    }
  }
  return { descartados: descartadosLocal, descartar: descartarLocal }
}
