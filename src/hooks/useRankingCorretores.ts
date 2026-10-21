import { useQuery } from '@tanstack/react-query'
import {
  calcularRanking,
  limitesDoPeriodo,
  paraVisaoPublica,
  type LinhaRanking,
  type PeriodoRanking,
  type VendaParaRanking,
} from '@/domain/ranking'
import { useAuthStore } from '@/stores/authStore'
import { useImoveis } from '@/hooks/useImoveis'
import { useNegociacoes } from '@/hooks/useNegociacoes'
import { supabase } from '@/lib/supabase'
import { CORRETORES } from '@/mocks/data/corretores'

interface ResultadoRanking {
  ranking: LinhaRanking[]
  isLoading: boolean
  isError: boolean
}

/**
 * Ranking de VGV executado por período — visível a toda a equipe; conversão,
 * colaboração e score composto só pra admin (o corte é no servidor, ver a
 * Edge Function "ranking-corretores"). Com Supabase, quem calcula é a função
 * (mesma lógica de domain/ranking.ts, importada lá por caminho relativo —
 * sem cópia paralela). Sem Supabase (modo mock offline), cálculo local.
 *
 * `supabase` é resolvido uma única vez no módulo e nunca muda durante a vida
 * do app — despachar por `if (supabase)` entre um hook 100% servidor e um
 * hook 100% local não viola as regras dos hooks. Existe pra não pedir
 * useImoveis()/useNegociacoes() em produção quando quem calcula é a Edge
 * Function.
 */
export function useRankingCorretores(periodo: PeriodoRanking): ResultadoRanking {
  /* eslint-disable react-hooks/rules-of-hooks -- `supabase` é fixo pra vida do app (ver comentário acima) */
  if (supabase) return useRankingServidor(periodo)
  return useRankingLocal(periodo)
  /* eslint-enable react-hooks/rules-of-hooks */
}

function useRankingServidor(periodo: PeriodoRanking): ResultadoRanking {
  const query = useQuery({
    queryKey: ['ranking-corretores', 'servidor', periodo.tipo, periodo.ano, periodo.indice],
    queryFn: async (): Promise<LinhaRanking[]> => {
      const { data, error } = await supabase!.functions.invoke('ranking-corretores', { body: { periodo } })
      if (error) throw new Error('Falha ao carregar o ranking')
      return data.ranking as LinhaRanking[]
    },
  })
  return { ranking: query.data ?? [], isLoading: query.isLoading, isError: query.isError }
}

function useRankingLocal(periodo: PeriodoRanking): ResultadoRanking {
  const { data: imoveis = [], isLoading: carregandoImoveis } = useImoveis()
  const { data: negociacoes = [], isLoading: carregandoNegociacoes } = useNegociacoes()
  const admin = useAuthStore((s) => s.corretor?.papel === 'admin')

  const ranking = useQuery({
    queryKey: ['ranking-corretores', 'local', periodo.tipo, periodo.ano, periodo.indice, imoveis, negociacoes, admin],
    queryFn: (): LinhaRanking[] => {
      // no mock não existe tabela `vendas`: as vendas de demonstração são os imóveis vendidos
      const vendas: VendaParaRanking[] = imoveis
        .filter((i) => i.etapa === 'f' && i.valorVenda != null && i.dataVenda)
        .map((i) => ({
          corretorImovelId: i.corretorResponsavelId,
          valorVenda: i.valorVenda!,
          dataVenda: i.dataVenda!,
        }))
      const completo = calcularRanking(CORRETORES, vendas, negociacoes, limitesDoPeriodo(periodo))
      return admin ? completo : paraVisaoPublica(completo)
    },
  })

  return {
    ranking: ranking.data ?? [],
    isLoading: ranking.isLoading || carregandoImoveis || carregandoNegociacoes,
    isError: ranking.isError,
  }
}
