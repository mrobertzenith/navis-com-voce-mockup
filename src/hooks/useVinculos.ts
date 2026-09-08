import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OrigemVinculo } from '@/domain/types'

/**
 * Vínculo real imóvel↔cliente. Antes, "Adicionar a um cliente" no modal do
 * imóvel só mostrava um toast de sucesso e não gravava nada — o corretor
 * achava que tinha vinculado, mas o registro nunca existiu no banco.
 */
async function criarVinculo(params: { imovelId: string; leadId: string; origem: OrigemVinculo }) {
  if (!supabase) return
  const { error } = await supabase.from('vinculos').insert({
    imovel_id: params.imovelId,
    lead_id: params.leadId,
    origem: params.origem,
  })
  // vínculo repetido (mesma dupla+origem) não é erro para o usuário — já está feito
  if (error && error.code !== '23505') throw new Error('Falha ao vincular imóvel ao cliente')
}

export function useCriarVinculo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarVinculo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['imoveis'] })
    },
  })
}
