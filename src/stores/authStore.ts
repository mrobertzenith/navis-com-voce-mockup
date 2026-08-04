import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Corretor } from '@/domain/types'
import { supabase } from '@/lib/supabase'
import {
  CORRETOR_LOGADO_ID,
  CORRETORES,
  carregarCorretores,
  definirCorretorLogado,
} from '@/mocks/data/corretores'

interface AuthState {
  /** corretor da sessão atual (null = não logado; no modo mock é sempre a Ana) */
  corretor: Corretor | null
  sessaoCarregada: boolean
  onboardingConcluido: boolean
  definirCorretor: (c: Corretor | null) => void
  concluirOnboarding: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      corretor: null,
      sessaoCarregada: false,
      onboardingConcluido: false,
      definirCorretor: (corretor) => set({ corretor, sessaoCarregada: true }),
      concluirOnboarding: () => set({ onboardingConcluido: true }),
    }),
    {
      name: 'navis-auth',
      // sessão nunca é persistida aqui — quem guarda sessão é o Supabase Auth
      partialize: (s) => ({ onboardingConcluido: s.onboardingConcluido }),
    },
  ),
)

function corretorDaRow(row: Record<string, unknown>): Corretor {
  return {
    id: String(row.id),
    papel: row.papel as Corretor['papel'],
    nome: String(row.nome),
    creci: String(row.creci ?? ''),
    cidade: String(row.cidade ?? ''),
    estado: String(row.estado ?? ''),
    email: String(row.email ?? ''),
    telefoneWhatsapp: String(row.telefone_whatsapp ?? ''),
    fotoUrl: (row.foto_url as string | null) ?? undefined,
    status: row.status as Corretor['status'],
    criadoEm: String(row.criado_em ?? ''),
  }
}

/**
 * Resolve a sessão antes do primeiro render.
 * Com Supabase: carrega a sessão, o corretor logado (por e-mail) e a equipe real.
 * Sem Supabase (mock): mantém a Ana Silva fixa.
 */
export async function inicializarAuth(): Promise<void> {
  const store = useAuthStore.getState()

  if (!supabase) {
    store.definirCorretor(CORRETORES.find((c) => c.id === CORRETOR_LOGADO_ID) ?? null)
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.email) {
    store.definirCorretor(null)
    return
  }

  const { data: rows, error } = await supabase.from('corretores').select('*')
  if (error || !rows) {
    store.definirCorretor(null)
    return
  }

  carregarCorretores(rows.map(corretorDaRow))
  const eu = CORRETORES.find(
    (c) => c.email.toLowerCase() === session.user.email!.toLowerCase(),
  )
  if (!eu || eu.status === 'suspenso') {
    // sem cadastro de corretor ou desativado — trata como não autorizado
    await supabase.auth.signOut()
    store.definirCorretor(null)
    return
  }

  definirCorretorLogado(eu.id)
  store.definirCorretor(eu)
}

export async function sair(): Promise<void> {
  if (supabase) await supabase.auth.signOut()
  window.location.assign(`${import.meta.env.BASE_URL}login`)
}
