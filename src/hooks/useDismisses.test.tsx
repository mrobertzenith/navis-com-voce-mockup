import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

// Regressão de 20/10/2026: depois de separar o caminho servidor/local nos
// hooks de matching, as consultas de match do modo servidor deixaram de
// depender dos descartes — e "Não interessou" passou a gravar no banco sem a
// tela mudar (lista e contadores ficavam congelados até recarregar).

const upsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      upsert,
      select: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}))

import { useDismisses } from '@/hooks/useDismisses'

const PESOS = { quartos: 1 }

function montar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(() => useDismisses(), { wrapper }) }
}

describe('useDismisses (modo servidor) — "Não interessou"', () => {
  it('tira na hora só o par descartado da lista do imóvel e invalida os matches', async () => {
    const { queryClient, result } = montar()
    queryClient.setQueryData(
      ['matches', 'por-imovel', 'servidor', 'im-1', PESOS],
      [{ leadId: 'lead-a' }, { leadId: 'lead-b' }],
    )
    // mesmo cliente em OUTRO imóvel não pode sumir
    queryClient.setQueryData(['matches', 'por-imovel', 'servidor', 'im-2', PESOS], [{ leadId: 'lead-a' }])
    const invalidar = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => result.current.descartar('cor-1', 'lead-a', 'im-1'))

    await waitFor(() =>
      expect(queryClient.getQueryData(['matches', 'por-imovel', 'servidor', 'im-1', PESOS])).toEqual([
        { leadId: 'lead-b' },
      ]),
    )
    expect(queryClient.getQueryData(['matches', 'por-imovel', 'servidor', 'im-2', PESOS])).toEqual([
      { leadId: 'lead-a' },
    ])
    expect(upsert).toHaveBeenCalledWith({ corretor_id: 'cor-1', lead_id: 'lead-a', imovel_id: 'im-1' })
    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ['matches'] }))
  })

  it('tira na hora só o par descartado da lista do cliente', async () => {
    const { queryClient, result } = montar()
    queryClient.setQueryData(
      ['matches', 'por-lead', 'servidor', 'lead-a', PESOS],
      [{ imovelId: 'im-1' }, { imovelId: 'im-2' }],
    )

    act(() => result.current.descartar('cor-1', 'lead-a', 'im-2'))

    await waitFor(() =>
      expect(queryClient.getQueryData(['matches', 'por-lead', 'servidor', 'lead-a', PESOS])).toEqual([
        { imovelId: 'im-1' },
      ]),
    )
  })
})
