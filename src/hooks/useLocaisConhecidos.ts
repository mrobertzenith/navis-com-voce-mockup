import { useMemo } from 'react'
import { normalizarLocal } from '@/domain/normalizacao'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'

/**
 * Cidades e bairros já usados pela equipe — viram sugestões nos cadastros.
 * Com endereço livre, sugerir o que já existe é o que evita o mesmo bairro
 * ser gravado de cinco formas diferentes.
 */
export function useLocaisConhecidos() {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()

  return useMemo(() => {
    const cidades = new Map<string, string>()
    const bairros = new Map<string, string>()

    const registrar = (mapa: Map<string, string>, valor?: string) => {
      const limpo = valor?.trim()
      if (!limpo) return
      const chave = normalizarLocal(limpo)
      if (chave && !mapa.has(chave)) mapa.set(chave, limpo)
    }

    for (const i of imoveis) {
      registrar(cidades, i.cidade)
      registrar(bairros, i.bairro)
    }
    for (const l of leads) {
      registrar(cidades, l.perfilBusca?.cidade)
      l.perfilBusca?.bairros?.forEach((b) => registrar(bairros, b))
    }

    const ordenar = (m: Map<string, string>) => [...m.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return { cidades: ordenar(cidades), bairros: ordenar(bairros) }
  }, [imoveis, leads])
}
