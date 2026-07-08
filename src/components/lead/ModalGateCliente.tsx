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
import { CAMPO_GATE_LEAD_CONFIG, type CampoGateLead } from '@/domain/gatesLead'
import { ETAPA_LEAD_LABEL } from '@/domain/constants'
import { calcularMatch } from '@/domain/matching'
import type { EtapaLead, Lead } from '@/domain/types'
import { useImoveis } from '@/hooks/useImoveis'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { useScoreStore } from '@/stores/scoreStore'

interface ModalGateClienteProps {
  lead: Lead | null
  destino: EtapaLead | null
  camposFaltantes: CampoGateLead[]
  requerConfirmacao: boolean
  onCancelar: () => void
  onConfirmar: (patch: Partial<Lead>) => void
}

export function ModalGateCliente({
  lead,
  destino,
  camposFaltantes,
  requerConfirmacao,
  onCancelar,
  onConfirmar,
}: ModalGateClienteProps) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const { data: imoveis = [] } = useImoveis()
  const pesos = useScoreStore((s) => s.pesos)
  const meusImoveis = imoveis.filter((i) => i.corretorResponsavelId === CORRETOR_LOGADO_ID)
  const imoveisCompativeis = lead
    ? meusImoveis.filter((i) => calcularMatch(i, lead, pesos) != null)
    : []

  if (!lead || !destino) return null

  const podeConfirmar = camposFaltantes.every((campo) => {
    const config = CAMPO_GATE_LEAD_CONFIG[campo]
    return config.tipo === 'checkbox' ? checks[campo] : valores[campo]?.trim()
  })

  function handleConfirmar() {
    const patch: Partial<Lead> = {}
    if (valores.observacoes) patch.observacoes = valores.observacoes
    if (valores.dataVisita) patch.dataVisita = valores.dataVisita
    if (valores.imovelVisitaId) patch.imovelVisitaId = valores.imovelVisitaId
    if (valores.imovelNegociacaoId) patch.imovelNegociacaoId = valores.imovelNegociacaoId
    if (valores.imovelFechadoId) patch.imovelFechadoId = valores.imovelFechadoId
    if (valores.valorNegociado) patch.valorNegociado = Number(valores.valorNegociado)
    if (valores.motivoStandby) patch.motivoStandby = valores.motivoStandby.slice(0, 500)
    if (valores.motivoPerdido) patch.motivoPerdido = valores.motivoPerdido.slice(0, 500)
    if (checks.pagamentosConcluidos) patch.pagamentosConcluidos = true
    if (checks.chavesEntregues) patch.chavesEntregues = true
    onConfirmar(patch)
    setValores({})
    setChecks({})
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para "{ETAPA_LEAD_LABEL[destino]}"</DialogTitle>
          <DialogDescription>
            {camposFaltantes.length > 0
              ? 'Alguns dados são obrigatórios para avançar o cliente para esta etapa.'
              : 'Confirme a movimentação deste cliente.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {camposFaltantes.map((campo) => {
            const config = CAMPO_GATE_LEAD_CONFIG[campo]
            if (config.tipo === 'checkbox') {
              return (
                <label key={campo} className="flex items-center gap-2 text-sm font-body text-text">
                  <input
                    type="checkbox"
                    checked={checks[campo] ?? false}
                    onChange={(e) => setChecks((c) => ({ ...c, [campo]: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  {config.label}
                </label>
              )
            }
            return (
              <div key={campo} className="flex flex-col gap-1.5">
                <Label htmlFor={campo}>{config.label}</Label>
                {config.tipo === 'textarea' && (
                  <textarea
                    id={campo}
                    value={valores[campo] ?? ''}
                    maxLength={500}
                    onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                    className="min-h-20 w-full rounded-card border border-border bg-surface px-3 py-2 text-[15px] font-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                )}
                {config.tipo === 'date' && (
                  <Input
                    id={campo}
                    type="date"
                    value={valores[campo] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                  />
                )}
                {config.tipo === 'number' && (
                  <Input
                    id={campo}
                    type="number"
                    min={0}
                    value={valores[campo] ?? ''}
                    onChange={(e) => setValores((v) => ({ ...v, [campo]: e.target.value }))}
                  />
                )}
                {config.tipo === 'imovel' && (
                  <>
                    <Select
                      value={valores[campo] ?? ''}
                      onValueChange={(v) => setValores((val) => ({ ...val, [campo]: v }))}
                      disabled={imoveisCompativeis.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {imoveisCompativeis.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.enderecoRua}, {i.enderecoNumero} · {i.bairro}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {imoveisCompativeis.length === 0 && (
                      <p className="text-xs text-text-soft">
                        Nenhum dos seus imóveis tem perfil compatível com este cliente no momento.
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}

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
