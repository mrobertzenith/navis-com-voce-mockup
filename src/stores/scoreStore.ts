import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PESOS_SCORE_DEFAULT } from '@/domain/constants'
import type { PesosScore } from '@/domain/types'

interface ScoreState {
  pesos: PesosScore
  calibrado: boolean
  definirPesos: (pesos: PesosScore) => void
}

export const useScoreStore = create<ScoreState>()(
  persist(
    (set) => ({
      pesos: PESOS_SCORE_DEFAULT,
      calibrado: false,
      definirPesos: (pesos) => set({ pesos, calibrado: true }),
    }),
    { name: 'navis-score' },
  ),
)
