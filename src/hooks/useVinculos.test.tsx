import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarSupabaseFake } from '@/test/supabaseFake'

// Regressão do bug #4 (rodada 08/09): "Adicionar a um cliente" só mostrava um
// toast de sucesso e nunca gravava nada. Este teste falha se alguém reintroduzir
// esse tipo de regressão (mutation que resolve sem nunca chamar insert()).

describe('useCriarVinculo — grava de fato no banco', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  it('chama insert() com imovel_id, lead_id e origem — não é um sucesso fake', async () => {
    const { supabase, inserts } = criarSupabaseFake()
    vi.doMock('@/lib/supabase', () => ({ supabase }))
    const { useCriarVinculo } = await import('@/hooks/useVinculos')

    const { result } = renderHook(() => useCriarVinculo(), { wrapper })
    result.current.mutate({ imovelId: 'im-1', leadId: 'lead-1', origem: 'manual_corretor' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(inserts).toHaveLength(1)
    expect(inserts[0].tabela).toBe('vinculos')
    expect(inserts[0].payload).toEqual({ imovel_id: 'im-1', lead_id: 'lead-1', origem: 'manual_corretor' })
  })

  it('vínculo duplicado (23505) é engolido — já está feito, não é erro pro usuário', async () => {
    const { supabase } = criarSupabaseFake({ erroInsert: { code: '23505' } })
    vi.doMock('@/lib/supabase', () => ({ supabase }))
    const { useCriarVinculo } = await import('@/hooks/useVinculos')

    const { result } = renderHook(() => useCriarVinculo(), { wrapper })
    result.current.mutate({ imovelId: 'im-1', leadId: 'lead-1', origem: 'manual_corretor' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('qualquer outro erro do banco propaga como falha real (não é silenciado)', async () => {
    const { supabase } = criarSupabaseFake({ erroInsert: { code: '500' } })
    vi.doMock('@/lib/supabase', () => ({ supabase }))
    const { useCriarVinculo } = await import('@/hooks/useVinculos')

    const { result } = renderHook(() => useCriarVinculo(), { wrapper })
    result.current.mutate({ imovelId: 'im-1', leadId: 'lead-1', origem: 'manual_corretor' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
