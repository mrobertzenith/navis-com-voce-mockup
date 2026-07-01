import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Imovel } from '@/domain/types'

const IMOVEIS_KEY = ['imoveis'] as const

async function fetchImoveis(): Promise<Imovel[]> {
  const res = await fetch('/api/imoveis')
  if (!res.ok) throw new Error('Falha ao carregar imóveis')
  return res.json()
}

async function atualizarImovel(id: string, patch: Partial<Imovel>): Promise<Imovel> {
  const res = await fetch(`/api/imoveis/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Falha ao atualizar imóvel')
  return res.json()
}

export function useImoveis() {
  return useQuery({ queryKey: IMOVEIS_KEY, queryFn: fetchImoveis })
}

export function useAtualizarImovel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Imovel> }) => atualizarImovel(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMOVEIS_KEY })
    },
  })
}
