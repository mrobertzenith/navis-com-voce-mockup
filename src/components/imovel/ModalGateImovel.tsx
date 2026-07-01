import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CAMPO_GATE_LABEL, type CampoGateImovel } from '@/domain/gatesImovel'
import { ETAPA_IMOVEL_LABEL } from '@/domain/constants'
import type { EtapaImovel, Imovel } from '@/domain/types'

interface ModalGateImovelProps {
  imovel: Imovel | null
  destino: EtapaImovel | null
  camposFaltantes: CampoGateImovel[]
  requerConfirmacao: boolean
  onCancelar: () => void
  onConfirmar: (patch: Partial<Imovel>) => void
}

export function ModalGateImovel({
  imovel,
  destino,
  camposFaltantes,
  requerConfirmacao,
  onCancelar,
  onConfirmar,
}: ModalGateImovelProps) {
  const [valores, setValores] = useState<Record<string, string>>({})

  if (!imovel || !destino) return null

  const podeConfirmar = camposFaltantes.every((campo) => valores[campo]?.trim())

  function handleConfirmar() {
    const patch: Partial<Imovel> = {}
    if (valores.cib) patch.cib = valores.cib
    if (valores.valorAnuncio) patch.valorAnuncio = Number(valores.valorAnuncio)
    if (valores.linkAnuncioUrl) patch.linkAnuncioUrl = valores.linkAnuncioUrl
    if (valores.metragem) patch.areaPrivativaM2 = Number(valores.metragem)
    if (valores.valorVenda) patch.valorVenda = Number(valores.valorVenda)
    onConfirmar(patch)
    setValores({})
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para "{ETAPA_IMOVEL_LABEL[destino]}"</DialogTitle>
          <DialogDescription>
            {camposFaltantes.length > 0
              ? 'Alguns dados são obrigatórios para avançar o imóvel para esta etapa.'
              : 'Confirme a movimentação deste imóvel.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {camposFaltantes.map((campo) => (
            <div key={campo} className="flex flex-col gap-1.5">
              <Label htmlFor={campo}>{CAMPO_GATE_LABEL[campo]}</Label>
              <Input
                id={campo}
                type={['valorAnuncio', 'metragem', 'valorVenda'].includes(campo) ? 'number' : 'text'}
                value={valores[campo] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                placeholder={
                  campo === 'linkAnuncioUrl' ? 'https://...' : campo === 'cib' ? 'CIB-XX-00000' : undefined
                }
              />
            </div>
          ))}

          {camposFaltantes.length === 0 && requerConfirmacao && (
            <p className="text-sm text-text-mut">
              Esta é uma transição crítica e não pode ser desfeita sem nova confirmação.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!podeConfirmar}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
