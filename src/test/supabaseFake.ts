import { vi } from 'vitest'

/**
 * Duplo de teste do cliente Supabase para testes de "contrato" de hook: não
 * verifica se a mutation "funciona" — verifica o PAYLOAD exato que ela manda
 * pro banco. É esse tipo de asserção que pega bugs como o do destinatário
 * errado de notificação (o hook "funcionava" perfeitamente; só mandava o dado
 * certo pro corretor errado).
 */
export interface ChamadaInsert {
  tabela: string
  payload: Record<string, unknown> | Record<string, unknown>[]
}

export interface ChamadaUpdate {
  tabela: string
  payload: Record<string, unknown>
  eq: Array<[string, unknown]>
}

export function criarSupabaseFake(opts: { erroInsert?: { code: string } | null } = {}) {
  const inserts: ChamadaInsert[] = []
  const updates: ChamadaUpdate[] = []

  const from = vi.fn((tabela: string) => ({
    insert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
      inserts.push({ tabela, payload })
      return Promise.resolve({ error: opts.erroInsert ?? null })
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      const eq: Array<[string, unknown]> = []
      const builder = {
        eq: vi.fn((coluna: string, valor: unknown) => {
          eq.push([coluna, valor])
          updates.push({ tabela, payload, eq })
          return Promise.resolve({ error: null })
        }),
      }
      return builder
    }),
    select: vi.fn(() => {
      const builder = {
        eq: vi.fn(() => builder),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
      return builder
    }),
  }))

  return { supabase: { from } as unknown, inserts, updates }
}
