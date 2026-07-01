import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalibradorScore } from '@/components/score/CalibradorScore'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { AtributoScore, PesosScore } from '@/domain/types'
import { useAuthStore } from '@/stores/authStore'
import { useScoreStore } from '@/stores/scoreStore'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const pesosAtuais = useScoreStore((s) => s.pesos)
  const definirPesos = useScoreStore((s) => s.definirPesos)
  const concluirOnboarding = useAuthStore((s) => s.concluirOnboarding)
  const [pesos, setPesos] = useState<PesosScore>(pesosAtuais)

  function atualizarPeso(atributo: AtributoScore, valor: number) {
    setPesos((p) => ({ ...p, [atributo]: valor }))
  }

  function concluir() {
    definirPesos(pesos)
    concluirOnboarding()
    toast({ title: 'Onboarding concluído', description: 'Seus pesos de score foram salvos.' })
    navigate('/dashboard')
  }

  function pularParaDemo() {
    definirPesos(pesos)
    concluirOnboarding()
    navigate('/dashboard')
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="font-heading text-lg font-bold text-ink">NAVIS COM VOCÊ</span>
          <span className="font-body text-xs text-text-soft">by Navis</span>
        </div>
        <h1 className="mb-2 text-xl font-bold">Calibre seu score</h1>
        <p className="text-sm text-text-mut">
          As notas que você dá aqui definem quais matches o sistema vai priorizar para você. Pode
          editar depois nas configurações.
        </p>
      </div>

      <CalibradorScore pesos={pesos} onChange={atualizarPeso} />

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={pularParaDemo}>
          Já calibrei / Pular para demo
        </Button>
        <Button onClick={concluir}>Concluir onboarding e acessar o sistema</Button>
      </div>
    </div>
  )
}
