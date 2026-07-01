import { useMemo } from 'react'
import { calcularMatch } from '@/domain/matching'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { useDismissStore } from '@/stores/dismissStore'
import { useScoreStore } from '@/stores/scoreStore'

/**
 * Cruza todos os imóveis com todos os leads (independente do corretor responsável
 * de cada um) usando os pesos do corretor logado — o score é sempre calculado do
 * ponto de vista de quem está olhando a tela (regra do §6.3 do spec).
 * Imóveis vendidos (f) não participam: saíram do mercado. Pares descartados
 * ("não interessou") não contam nem aparecem nos contadores.
 */
export function useMatches() {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()
  const pesos = useScoreStore((s) => s.pesos)
  const descartados = useDismissStore((s) => s.descartados)

  return useMemo(() => {
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
  }, [imoveis, leads, pesos, descartados])
}
