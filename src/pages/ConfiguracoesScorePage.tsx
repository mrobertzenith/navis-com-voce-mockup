import { useState } from 'react'
import { CalibradorScore } from '@/components/score/CalibradorScore'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/ui/use-toast'
import type { AtributoScore, PesosScore } from '@/domain/types'
import { useScoreStore } from '@/stores/scoreStore'

export function ConfiguracoesScorePage() {
  const pesosSalvos = useScoreStore((s) => s.pesos)
  const definirPesos = useScoreStore((s) => s.definirPesos)
  const { toast } = useToast()
  const [pesos, setPesos] = useState<PesosScore>(pesosSalvos)
  const [confirmando, setConfirmando] = useState(false)
  const [recalculando, setRecalculando] = useState(false)

  function atualizarPeso(atributo: AtributoScore, valor: number) {
    setPesos((p) => ({ ...p, [atributo]: valor }))
  }

  function salvar() {
    setConfirmando(false)
    definirPesos(pesos)
    setRecalculando(true)
    toast({ title: 'Recalculando...', description: 'Seus matches estão sendo recalculados em background.' })

    setTimeout(() => {
      setRecalculando(false)
      toast({ title: 'Recálculo concluído', description: 'Seus matches foram recalculados.' })
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-xl font-bold">Configurações &gt; Score</h1>
      <p className="mb-6 text-sm text-text-mut">
        Mudanças aqui vão recalcular todos os seus matches em background. Pode levar alguns
        instantes.
      </p>

      <CalibradorScore pesos={pesos} onChange={atualizarPeso} />

      <div className="mt-6 flex justify-end">
        <Button onClick={() => setConfirmando(true)} disabled={recalculando}>
          {recalculando ? 'Recalculando…' : 'Salvar'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmando}
        titulo="Salvar novos pesos de score?"
        descricao="Isso vai recalcular todos os seus matches em background. Essa é uma mudança de estratégia — considere com calma antes de confirmar."
        textoConfirmar="Salvar e recalcular"
        onConfirmar={salvar}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  )
}
