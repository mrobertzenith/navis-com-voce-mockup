import { useQuery } from '@tanstack/react-query'
import { calcularMatch } from '@/domain/matching'
import type { Imovel, Lead, PesosScore, TipoImovel } from '@/domain/types'
import { useDismisses } from '@/hooks/useDismisses'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'
import { supabase } from '@/lib/supabase'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { useScoreStore } from '@/stores/scoreStore'

interface Contadores {
  contadorPorImovel: Record<string, number>
  contadorPorLead: Record<string, number>
}

/** Lado "lead" de um match — campos crus pra UI montar resumo/nome do corretor. */
export interface MatchLadoLead {
  leadId: string
  score: number
  isAviso: boolean
  tipos: TipoImovel[]
  bairros: string[]
  valorAte: number | null | undefined
  corretorResponsavelId: string
}

/** Lado "imóvel" de um match — campos crus pra UI montar resumo/nome do corretor. */
export interface MatchLadoImovel {
  imovelId: string
  score: number
  isAviso: boolean
  tipo: TipoImovel
  bairro: string
  valorAnuncio?: number
  valorEstimado?: number
  corretorResponsavelId: string
}

/**
 * Cruza todos os imóveis com todos os leads (independente do corretor responsável
 * de cada um) usando os pesos do corretor logado — o score é sempre calculado do
 * ponto de vista de quem está olhando a tela (regra do §6.3 do spec).
 * Imóveis vendidos (f) não participam: saíram do mercado. Pares descartados
 * ("não interessou") não contam nem aparecem nos contadores.
 *
 * Antes esse cruzamento (O(imóveis × leads), dois loops completos) rodava
 * inteiro no navegador a cada mudança de imóveis/leads/pesos/descartados —
 * não escala e não pode ser cacheado (achado de auditoria, 14/09/2026). Com
 * Supabase, quem calcula agora é a Edge Function "matching" (mesma lógica de
 * domain/matching.ts, importada lá por caminho relativo — sem cópia
 * paralela). Sem Supabase (modo mock offline), não há função pra chamar —
 * mantém o cálculo local de sempre.
 */
function calcularLocal(imoveis: Imovel[], leads: Lead[], pesos: PesosScore, descartados: Record<string, string>): Contadores {
  const imoveisElegiveis = imoveis.filter((i) => i.etapa !== 'f')
  const contadorPorImovel: Record<string, number> = {}
  const contadorPorLead: Record<string, number> = {}

  const naoDescartado = (leadId: string, imovelId: string) =>
    !descartados[`${CORRETOR_LOGADO_ID}::${leadId}::${imovelId}`]

  for (const imovel of imoveisElegiveis) {
    let count = 0
    for (const lead of leads) {
      if (naoDescartado(lead.id, imovel.id) && calcularMatch(imovel, lead, pesos)) count++
    }
    contadorPorImovel[imovel.id] = count
  }

  for (const lead of leads) {
    let count = 0
    for (const imovel of imoveisElegiveis) {
      if (naoDescartado(lead.id, imovel.id) && calcularMatch(imovel, lead, pesos)) count++
    }
    contadorPorLead[lead.id] = count
  }

  return { contadorPorImovel, contadorPorLead }
}

export function useMatches(): Contadores {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()
  const pesos = useScoreStore((s) => s.pesos)
  const { descartados } = useDismisses()

  const { data } = useQuery({
    queryKey: ['matches', 'contadores', pesos, supabase ? 'servidor' : 'local', imoveis, leads, descartados],
    queryFn: async (): Promise<Contadores> => {
      if (!supabase) return calcularLocal(imoveis, leads, pesos, descartados)
      const { data: resultado, error } = await supabase.functions.invoke('matching', {
        body: { tipo: 'contadores', pesos },
      })
      if (error) throw new Error('Falha ao calcular matches')
      return resultado as Contadores
    },
  })

  return data ?? { contadorPorImovel: {}, contadorPorLead: {} }
}

/**
 * Drill-down "clientes com perfil deste imóvel" (MeusImoveisPage). Antes
 * calculava direto no componente com um useMemo + loop de calcularMatch —
 * mesma regra e mesmo custo do que os contadores, só que ainda no navegador
 * (achado de revisão, 15/09/2026). Com Supabase, usa o mesmo modo
 * 'matches-por-imovel' da Edge Function "matching"; sem Supabase (mock
 * offline), cálculo local.
 */
export function useMatchesDoImovel(imovelId: string | null) {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()
  const pesos = useScoreStore((s) => s.pesos)
  const { descartados } = useDismisses()

  return useQuery({
    queryKey: ['matches', 'por-imovel', imovelId, pesos, supabase ? 'servidor' : 'local', leads, descartados],
    enabled: imovelId != null,
    queryFn: async (): Promise<MatchLadoLead[]> => {
      if (!imovelId) return []

      if (!supabase) {
        const imovel = imoveis.find((i) => i.id === imovelId)
        if (!imovel) return []
        return leads
          .filter((lead) => !descartados[`${CORRETOR_LOGADO_ID}::${lead.id}::${imovelId}`])
          .map((lead): MatchLadoLead | null => {
            const match = calcularMatch(imovel, lead, pesos)
            if (!match) return null
            return {
              leadId: lead.id,
              score: match.score,
              isAviso: match.isAviso,
              tipos: lead.perfilBusca.tipos,
              bairros: lead.perfilBusca.bairros,
              valorAte: lead.perfilBusca.valorAte,
              corretorResponsavelId: lead.corretorResponsavelId,
            }
          })
          .filter((m): m is MatchLadoLead => m != null)
          .sort((a, b) => b.score - a.score)
      }

      const { data, error } = await supabase.functions.invoke('matching', {
        body: { tipo: 'matches-por-imovel', imovelId, pesos },
      })
      if (error) throw new Error('Falha ao calcular matches do imóvel')
      return (data.matches ?? []) as MatchLadoLead[]
    },
  })
}

/**
 * Drill-down "imóveis com perfil deste cliente" (MeusClientesPage) — mesma
 * lógica e mesmo motivo do useMatchesDoImovel acima, espelhado pro outro lado.
 */
export function useMatchesDoLead(leadId: string | null) {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()
  const pesos = useScoreStore((s) => s.pesos)
  const { descartados } = useDismisses()

  return useQuery({
    queryKey: ['matches', 'por-lead', leadId, pesos, supabase ? 'servidor' : 'local', imoveis, descartados],
    enabled: leadId != null,
    queryFn: async (): Promise<MatchLadoImovel[]> => {
      if (!leadId) return []

      if (!supabase) {
        const lead = leads.find((l) => l.id === leadId)
        if (!lead) return []
        return imoveis
          .filter((i) => i.etapa !== 'f')
          .filter((imovel) => !descartados[`${CORRETOR_LOGADO_ID}::${leadId}::${imovel.id}`])
          .map((imovel): MatchLadoImovel | null => {
            const match = calcularMatch(imovel, lead, pesos)
            if (!match) return null
            return {
              imovelId: imovel.id,
              score: match.score,
              isAviso: match.isAviso,
              tipo: imovel.tipo,
              bairro: imovel.bairro,
              valorAnuncio: imovel.valorAnuncio,
              valorEstimado: imovel.valorEstimado,
              corretorResponsavelId: imovel.corretorResponsavelId,
            }
          })
          .filter((m): m is MatchLadoImovel => m != null)
          .sort((a, b) => b.score - a.score)
      }

      const { data, error } = await supabase.functions.invoke('matching', {
        body: { tipo: 'matches-por-lead', leadId, pesos },
      })
      if (error) throw new Error('Falha ao calcular matches do cliente')
      return (data.matches ?? []) as MatchLadoImovel[]
    },
  })
}
