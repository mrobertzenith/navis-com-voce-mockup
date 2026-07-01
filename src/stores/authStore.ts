import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  corretorLogadoId: string | null
  onboardingConcluido: boolean
  login: (corretorId: string) => void
  logout: () => void
  concluirOnboarding: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      corretorLogadoId: null,
      onboardingConcluido: false,
      login: (corretorId) => set({ corretorLogadoId: corretorId }),
      logout: () => set({ corretorLogadoId: null }),
      concluirOnboarding: () => set({ onboardingConcluido: true }),
    }),
    { name: 'navis-auth' },
  ),
)
