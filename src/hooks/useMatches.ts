import { useQuery } from '@tanstack/react-query'
import { calcularMatch } from '@/domain/matching'
import type { Imovel, Lead, PesosScore } from '@/domain/types'
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
      const { data: resultado, error } = await supabase.functions.invoke('matching', { body: { pesos } })
      if (error) throw new Error('Falha ao calcular matches')
      return resultado as Contadores
    },
  })

  return data ?? { contadorPorImovel: {}, contadorPorLead: {} }
}
