import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lead } from '@/domain/types'

const LEADS_KEY = ['leads'] as const

async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch('/api/leads')
  if (!res.ok) throw new Error('Falha ao carregar leads')
  return res.json()
}

async function atualizarLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error('Falha ao atualizar lead')
  return res.json()
}

export function useLeads() {
  return useQuery({ queryKey: LEADS_KEY, queryFn: fetchLeads })
}

export function useAtualizarLead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Lead> }) => atualizarLead(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_KEY })
    },
  })
}
