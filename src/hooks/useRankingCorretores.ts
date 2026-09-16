import { useQuery } from '@tanstack/react-query'
import { calcularRanking, type LinhaRanking } from '@/domain/ranking'
import { useImoveis } from '@/hooks/useImoveis'
import { useNegociacoes } from '@/hooks/useNegociacoes'
import { supabase } from '@/lib/supabase'
import { CORRETORES } from '@/mocks/data/corretores'

/**
 * Ranking de corretores (VGV, conversão, colaboração, score composto) —
 * tela admin-only. Antes calculava tudo no componente com dado já carregado
 * no frontend (achado de revisão, 15/09/2026: regra gerencial duplicada no
 * cliente). Com Supabase, quem calcula é a Edge Function "ranking-corretores"
 * (mesma lógica de domain/ranking.ts, importada lá por caminho relativo —
 * sem cópia paralela), que também confere papel admin no servidor, não só
 * na rota. Sem Supabase (modo mock offline), mantém o cálculo local.
 */
export function useRankingCorretores() {
  const { data: imoveis = [], isLoading: carregandoImoveis } = useImoveis()
  const { data: negociacoes = [], isLoading: carregandoNegociacoes } = useNegociacoes()

  const query = useQuery({
    queryKey: ['ranking-corretores', supabase ? 'servidor' : 'local', imoveis, negociacoes],
    queryFn: async (): Promise<LinhaRanking[]> => {
      if (!supabase) return calcularRanking(CORRETORES, imoveis, negociacoes)
      const { data, error } = await supabase.functions.invoke('ranking-corretores')
      if (error) throw new Error('Falha ao carregar o ranking')
      return data.ranking as LinhaRanking[]
    },
  })

  return {
    ranking: query.data ?? [],
    isLoading: query.isLoading || carregandoImoveis || carregandoNegociacoes,
  }
}
