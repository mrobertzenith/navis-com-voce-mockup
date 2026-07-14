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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CAMPO_GATE_LABEL, type CampoGateImovel } from '@/domain/gatesImovel'
import { ETAPA_IMOVEL_LABEL } from '@/domain/constants'
import { calcularMatch } from '@/domain/matching'
import type { EtapaImovel, Imovel } from '@/domain/types'
import { useLeads } from '@/hooks/useLeads'
import { CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { useScoreStore } from '@/stores/scoreStore'

interface ModalGateImovelProps {
  imovel: Imovel | null
  destino: EtapaImovel | null
  camposFaltantes: CampoGateImovel[]
  requerConfirmacao: boolean
  onCancelar: () => void
  onConfirmar: (patch: Partial<Imovel> & { leadNegociacaoId?: string }) => void
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
  const { data: leads = [] } = useLeads()
  const pesos = useScoreStore((s) => s.pesos)
  const leadsCompativeis = imovel ? leads.filter((l) => calcularMatch(imovel, l, pesos) != null) : []

  if (!imovel || !destino) return null

  const podeConfirmar = camposFaltantes.every((campo) => valores[campo]?.trim())

  function handleConfirmar() {
    const patch: Partial<Imovel> & { leadNegociacaoId?: string } = {}
    if (valores.cnm) patch.cnm = valores.cnm
    if (valores.valorAnuncio) patch.valorAnuncio = Number(valores.valorAnuncio)
    if (valores.linkAnuncioUrl) patch.linkAnuncioUrl = valores.linkAnuncioUrl
    if (valores.metragem) patch.areaPrivativaM2 = Number(valores.metragem)
    if (valores.valorVenda) patch.valorVenda = Number(valores.valorVenda)
    if (valores.leadNegociacaoId) patch.leadNegociacaoId = valores.leadNegociacaoId
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
              {campo === 'leadNegociacaoId' ? (
                <>
                  <Select
                    value={valores.leadNegociacaoId ?? ''}
                    onValueChange={(v) => setValores((val) => ({ ...val, leadNegociacaoId: v }))}
                    disabled={leadsCompativeis.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadsCompativeis.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.codigo}
                          {l.corretorResponsavelId !== CORRETOR_LOGADO_ID
                            ? ` — cliente de ${nomeCorretor(l.corretorResponsavelId)}`
                            : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leadsCompativeis.length === 0 && (
                    <p className="text-xs text-text-soft">
                      Nenhum cliente (seu ou de outro corretor) tem perfil compatível com este imóvel no momento.
                    </p>
                  )}
                </>
              ) : (
                <Input
                  id={campo}
                  type={['valorAnuncio', 'metragem', 'valorVenda'].includes(campo) ? 'number' : 'text'}
                  value={valores[campo] ?? ''}
                  onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                  placeholder={
                    campo === 'linkAnuncioUrl' ? 'https://...' : campo === 'cnm' ? '0000.0000.0000.0000' : undefined
                  }
                />
              )}
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
