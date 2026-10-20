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
import { useLeads } from '@/hooks/useLeads'
import { CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { useScoreStore } from '@/stores/scoreStore'

interface VisitaForaDaBase {
  uid: string
  endereco: string
  data: string
  corretorNome: string
  corretorContato: string
}

function novaVisitaForaDaBase(): VisitaForaDaBase {
  return { uid: crypto.randomUUID(), endereco: '', data: '', corretorNome: '', corretorContato: '' }
}

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
  const [visitasSelecionadas, setVisitasSelecionadas] = useState<Record<string, string>>({})
  // Visitas em imóveis fora da base: uma lista (antes era um bloco único, e só
  // cabia uma visita). O corretor externo alimenta a lista de corretores ainda
  // não participantes a abordar.
  const [foraDaBase, setForaDaBase] = useState<VisitaForaDaBase[]>([])
  function atualizarForaDaBase(uid: string, campos: Partial<VisitaForaDaBase>) {
    setForaDaBase((atual) => atual.map((v) => (v.uid === uid ? { ...v, ...campos } : v)))
  }
  const [imoveisNegociacao, setImoveisNegociacao] = useState<string[]>([])
  const { data: imoveis = [] } = useImoveis()
  const { data: todosLeads = [] } = useLeads()
  const pesos = useScoreStore((s) => s.pesos)
  /**
   * Um imóvel pode estar em match com vários clientes (fica "no radar"), mas
   * só pode estar em UMA negociação ativa por vez. Se outro cliente já tem
   * esse imóvel em negociacoesAtivas, ele não pode ser escolhido pra visita
   * nem pra negociação deste cliente — precisa voltar a "Publicado" primeiro.
   */
  const imoveisComprometidosComOutroCliente = new Set(
    todosLeads
      .filter((l) => l.id !== lead?.id)
      .flatMap((l) => (l.negociacoesAtivas ?? []).map((n) => n.imovelId)),
  )
  /** negociação pode envolver imóveis de outros corretores, sujeitos à aprovação deles */
  const imoveisNegociacaoCompativeis = lead
    ? imoveis.filter(
        (i) =>
          i.etapa !== 'f' &&
          calcularMatch(i, lead, pesos) != null &&
          !imoveisComprometidosComOutroCliente.has(i.id),
      )
    : []
  /** visita pode ser marcada em qualquer imóvel do match, mesmo de outro corretor */
  const imoveisVisitaCompativeis = imoveisNegociacaoCompativeis
  /**
   * "Imóvel do negócio" (Negócio Fechado) precisa ser um dos imóveis que JÁ
   * está em negociação ativa com este cliente — não um recálculo de match
   * restrito aos meus imóveis. Antes disso, fechar negócio com imóvel de
   * outro corretor deixava o campo sempre vazio e travava o Confirmar.
   */
  const imoveisDaNegociacaoAtiva = lead
    ? imoveis.filter((i) => (lead.negociacoesAtivas ?? []).some((n) => n.imovelId === i.id))
    : []

  if (!lead || !destino) return null

  const podeConfirmar = camposFaltantes.every((campo) => {
    const config = CAMPO_GATE_LEAD_CONFIG[campo]
    if (config.tipo === 'checkbox') return checks[campo]
    if (config.tipo === 'visitas') {
      const entradas = Object.entries(visitasSelecionadas)
      return (
        entradas.length + foraDaBase.length > 0 &&
        entradas.every(([, data]) => data.trim()) &&
        foraDaBase.every(
          (v) => v.data.trim() && v.endereco.trim() && v.corretorNome.trim() && v.corretorContato.trim(),
        )
      )
    }
    if (config.tipo === 'imovel-multi') return imoveisNegociacao.length > 0
    return valores[campo]?.trim()
  })

  function handleConfirmar() {
    const patch: Partial<Lead> = {}
    if (valores.observacoes) patch.observacoes = valores.observacoes
    if (Object.keys(visitasSelecionadas).length + foraDaBase.length > 0) {
      patch.visitasAgendadas = [
        ...Object.entries(visitasSelecionadas).map(([id, data]) => ({ imovelId: id, data })),
        ...foraDaBase.map((v) => ({
          imovelId: '',
          data: v.data,
          enderecoLivre: v.endereco.trim(),
          corretorExternoNome: v.corretorNome.trim(),
          corretorExternoContato: v.corretorContato.trim(),
        })),
      ]
    }
    if (imoveisNegociacao.length > 0) patch.imovelNegociacaoId = imoveisNegociacao.join(',')
    if (valores.imovelFechadoId) patch.imovelFechadoId = valores.imovelFechadoId
    if (valores.motivoStandby) patch.motivoStandby = valores.motivoStandby.slice(0, 500)
    if (valores.motivoPerdido) patch.motivoPerdido = valores.motivoPerdido.slice(0, 500)
    if (checks.pagamentosConcluidos) patch.pagamentosConcluidos = true
    if (checks.chavesEntregues) patch.chavesEntregues = true
    onConfirmar(patch)
    setValores({})
    setChecks({})
    setVisitasSelecionadas({})
    setForaDaBase([])
    setImoveisNegociacao([])
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
                      disabled={imoveisDaNegociacaoAtiva.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {imoveisDaNegociacaoAtiva.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.enderecoRua}, {i.enderecoNumero} · {i.bairro}
                            {i.corretorResponsavelId !== CORRETOR_LOGADO_ID
                              ? ` — imóvel de ${nomeCorretor(i.corretorResponsavelId)}`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {imoveisDaNegociacaoAtiva.length === 0 && (
                      <p className="text-xs text-text-soft">
                        Este cliente não tem nenhum imóvel em negociação ativa no momento — volte para
                        "Em negociação" e vincule um imóvel antes de fechar o negócio.
                      </p>
                    )}
                  </>
                )}
                {config.tipo === 'imovel-multi' && (
                  <>
                    <div className="flex flex-col gap-2">
                      {imoveisNegociacaoCompativeis.map((i) => {
                        const selecionado = imoveisNegociacao.includes(i.id)
                        return (
                          <label key={i.id} className="flex items-center gap-2 text-sm font-body text-text">
                            <input
                              type="checkbox"
                              checked={selecionado}
                              onChange={() =>
                                setImoveisNegociacao((atual) =>
                                  selecionado ? atual.filter((id) => id !== i.id) : [...atual, i.id],
                                )
                              }
                              className="h-4 w-4 rounded border-border"
                            />
                            {i.enderecoRua}, {i.enderecoNumero} · {i.bairro}
                            {i.corretorResponsavelId !== CORRETOR_LOGADO_ID
                              ? ` — imóvel de ${nomeCorretor(i.corretorResponsavelId)}`
                              : ''}
                          </label>
                        )
                      })}
                    </div>
                    {imoveisNegociacaoCompativeis.length === 0 && (
                      <p className="text-xs text-text-soft">
                        Nenhum imóvel (seu ou de outro corretor) tem perfil compatível com este cliente no momento.
                      </p>
                    )}
                  </>
                )}
                {config.tipo === 'visitas' && (
                  <>
                    <div className="flex flex-col gap-2">
                      {imoveisVisitaCompativeis.map((i) => {
                        const selecionado = i.id in visitasSelecionadas
                        return (
                          <div
                            key={i.id}
                            className="flex flex-col gap-2 rounded-card border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <label className="flex items-center gap-2 text-sm text-text">
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={() =>
                                  setVisitasSelecionadas((atual) => {
                                    if (selecionado) {
                                      const resto = { ...atual }
                                      delete resto[i.id]
                                      return resto
                                    }
                                    return { ...atual, [i.id]: '' }
                                  })
                                }
                                className="h-4 w-4 rounded border-border"
                              />
                              {i.enderecoRua}, {i.enderecoNumero} · {i.bairro}
                              {i.corretorResponsavelId !== CORRETOR_LOGADO_ID
                                ? ` — imóvel de ${nomeCorretor(i.corretorResponsavelId)}`
                                : ''}
                            </label>
                            {selecionado && (
                              <Input
                                type="date"
                                value={visitasSelecionadas[i.id]}
                                onChange={(e) =>
                                  setVisitasSelecionadas((atual) => ({ ...atual, [i.id]: e.target.value }))
                                }
                                className="sm:w-44"
                              />
                            )}
                          </div>
                        )
                      })}
                      {foraDaBase.map((v, idx) => (
                        <div key={v.uid} className="flex flex-col gap-2 rounded-card border border-border p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-mut">Imóvel fora da base #{idx + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setForaDaBase((atual) => atual.filter((x) => x.uid !== v.uid))}
                            >
                              Remover
                            </Button>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              placeholder="Endereço do imóvel"
                              value={v.endereco}
                              onChange={(e) => atualizarForaDaBase(v.uid, { endereco: e.target.value })}
                              className="flex-1"
                            />
                            <Input
                              type="date"
                              value={v.data}
                              onChange={(e) => atualizarForaDaBase(v.uid, { data: e.target.value })}
                              className="sm:w-44"
                            />
                          </div>
                          {/* corretor de fora da plataforma — alimenta a lista de quem abordar depois */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              placeholder="Nome do corretor (externo)"
                              value={v.corretorNome}
                              onChange={(e) => atualizarForaDaBase(v.uid, { corretorNome: e.target.value })}
                              className="flex-1"
                            />
                            <Input
                              placeholder="WhatsApp/contato do corretor"
                              value={v.corretorContato}
                              onChange={(e) => atualizarForaDaBase(v.uid, { corretorContato: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={() => setForaDaBase((atual) => [...atual, novaVisitaForaDaBase()])}
                      >
                        {foraDaBase.length === 0 ? '+ Imóvel fora da base' : '+ Adicionar outro imóvel fora da base'}
                      </Button>
                    </div>
                    {imoveisVisitaCompativeis.length === 0 && (
                      <p className="text-xs text-text-soft">
                        Nenhum imóvel (seu ou de outro corretor) tem perfil compatível com este cliente no momento —
                        use "Imóvel fora da base" para registrar a visita mesmo assim.
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
