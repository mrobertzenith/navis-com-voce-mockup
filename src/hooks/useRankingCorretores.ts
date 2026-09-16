import { useQuery } from '@tanstack/react-query'
import { calcularRanking, type LinhaRanking } from '@/domain/ranking'
import { useImoveis } from '@/hooks/useImoveis'
import { useNegociacoes } from '@/hooks/useNegociacoes'
import { supabase } from '@/lib/supabase'
import { CORRETORES } from '@/mocks/data/corretores'

interface ResultadoRanking {
  ranking: LinhaRanking[]
  isLoading: boolean
}

/**
 * Ranking de corretores (VGV, conversão, colaboração, score composto) —
 * tela admin-only. Antes calculava tudo no componente com dado já carregado
 * no frontend (achado de revisão, 15/09/2026: regra gerencial duplicada no
 * cliente). Com Supabase, quem calcula é a Edge Function "ranking-corretores"
 * (mesma lógica de domain/ranking.ts, importada lá por caminho relativo —
 * sem cópia paralela), que também confere papel admin no servidor, não só
 * na rota. Sem Supabase (modo mock offline), mantém o cálculo local.
 *
 * `supabase` é resolvido uma única vez no módulo e nunca muda durante a vida
 * do app — despachar por `if (supabase)` entre um hook 100% servidor e um
 * hook 100% local não viola as regras dos hooks. Existe pra não pedir
 * useImoveis()/useNegociacoes() em produção quando quem calcula é a Edge
 * Function — eram chamados só pro fallback local, mas ainda disparavam a
 * query e entravam na queryKey mesmo no modo servidor (achado de revisão,
 * 15/09/2026).
 */
export function useRankingCorretores(): ResultadoRanking {
  /* eslint-disable react-hooks/rules-of-hooks -- ver comentário acima: `supabase` é fixo pra vida do app */
  if (supabase) return useRankingServidor()
  return useRankingLocal()
  /* eslint-enable react-hooks/rules-of-hooks */
}

function useRankingServidor(): ResultadoRanking {
  const query = useQuery({
    queryKey: ['ranking-corretores', 'servidor'],
    queryFn: async (): Promise<LinhaRanking[]> => {
      const { data, error } = await supabase!.functions.invoke('ranking-corretores')
      if (error) throw new Error('Falha ao carregar o ranking')
      return data.ranking as LinhaRanking[]
    },
  })

  return { ranking: query.data ?? [], isLoading: query.isLoading }
}

function useRankingLocal(): ResultadoRanking {
  const { data: imoveis = [], isLoading: carregandoImoveis } = useImoveis()
  const { data: negociacoes = [], isLoading: carregandoNegociacoes } = useNegociacoes()

  const query = useQuery({
    queryKey: ['ranking-corretores', 'local', imoveis, negociacoes],
    queryFn: (): LinhaRanking[] => calcularRanking(CORRETORES, imoveis, negociacoes),
  })

  return {
    ranking: query.data ?? [],
    isLoading: query.isLoading || carregandoImoveis || carregandoNegociacoes,
  }
}
