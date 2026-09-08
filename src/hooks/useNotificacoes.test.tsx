import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarSupabaseFake } from '@/test/supabaseFake'

// Teste de CONTRATO, não de comportamento: a falha real desta rodada não foi o
// hook "não funcionar" — era gravar o dado certo para o destinatário errado. A
// asserção que importa aqui é sobre o payload exato que chega no banco.
// Ver ESTRATEGIA_QA.md §2, camada 2.

const { supabase, inserts, updates } = criarSupabaseFake()

vi.mock('@/lib/supabase', () => ({ supabase }))
vi.mock('@/mocks/data/corretores', () => ({ CORRETOR_LOGADO_ID: 'corretor-logado-teste' }))
vi.mock('@/mocks/data/notificacoes', () => ({ NOTIFICACOES_SEED: [] }))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useCriarNotificacao — contrato do payload gravado', () => {
  beforeEach(() => {
    inserts.length = 0
  })

  it('grava o destinatário exatamente como recebido, sem substituir por CORRETOR_LOGADO_ID', async () => {
    const { useCriarNotificacao } = await import('@/hooks/useNotificacoes')
    const { result } = renderHook(() => useCriarNotificacao(), { wrapper })

    result.current.mutate({
      destinatarioCorretorId: 'dono-do-imovel',
      tipoEvento: 'E16',
      titulo: 'Aprovação pendente',
      corpo: 'teste',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(inserts).toHaveLength(1)
    expect(inserts[0].tabela).toBe('notificacoes')
    expect(inserts[0].payload).toMatchObject({
      destinatario_corretor_id: 'dono-do-imovel',
      tipo_evento: 'E16',
      titulo: 'Aprovação pendente',
      corpo: 'teste',
    })
    // regressão direta do bug: o destinatário NUNCA deve ser silenciosamente
    // trocado pelo corretor logado (quem envia), mesmo que seja outra pessoa
    expect(inserts[0].payload).not.toMatchObject({ destinatario_corretor_id: 'corretor-logado-teste' })
  })

  it('mapeia acaoPendente para acao_pendente, e ausência para null (não undefined)', async () => {
    const { useCriarNotificacao } = await import('@/hooks/useNotificacoes')
    const { result } = renderHook(() => useCriarNotificacao(), { wrapper })

    result.current.mutate({
      destinatarioCorretorId: 'dono-do-imovel',
      tipoEvento: 'E16',
      titulo: 'Sem ação pendente',
      corpo: 'teste',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(inserts[0].payload).toMatchObject({ acao_pendente: null })
  })
})

describe('useAtualizarNotificacao — contrato do patch', () => {
  beforeEach(() => {
    updates.length = 0
  })

  it('envia só os campos presentes no patch, filtrados pela linha certa (eq id)', async () => {
    const { useAtualizarNotificacao } = await import('@/hooks/useNotificacoes')
    const { result } = renderHook(() => useAtualizarNotificacao(), { wrapper })

    result.current.mutate({ id: 'notif-1', patch: { lida: true } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(updates).toHaveLength(1)
    expect(updates[0].payload).toEqual({ lida: true })
    expect(updates[0].eq).toEqual([['id', 'notif-1']])
  })
})
