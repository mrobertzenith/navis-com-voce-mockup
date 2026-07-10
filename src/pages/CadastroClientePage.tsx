import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { WizardSteps } from '@/components/shared/WizardSteps'
import { SelectorCascadeMultiplo } from '@/components/shared/SelectorCascade'
import { ChipBoolean } from '@/components/shared/ChipBoolean'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { EtapaLead, Lead, OrigemLead, TipoImovel } from '@/domain/types'
import { passaGates } from '@/domain/matching'
import { useAtualizarLead, useCriarLead, useLeads } from '@/hooks/useLeads'
import { useImoveis } from '@/hooks/useImoveis'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

const numeroOpcional = () =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(0).optional())

const TIPOS: TipoImovel[] = [
  'apartamento',
  'casa_rua',
  'casa_condominio',
  'casa_comercial',
  'terreno_rua',
  'terreno_condominio',
  'terreno_comercial',
  'sala_comercial',
  'galpao_comercial_industrial',
]

const ORIGENS: { value: OrigemLead; label: string }[] = [
  { value: 'rede_social', label: 'Rede social' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'campanha_online', label: 'Campanha online' },
  { value: 'campanha_offline', label: 'Campanha offline' },
  { value: 'site', label: 'Site' },
]

const schema = z
  .object({
    nome: z.string().min(1, 'Obrigatório'),
    telefoneWhatsapp: z.string().optional(),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    origem: z.string().optional(),

    tipos: z.array(z.enum(TIPOS as [TipoImovel, ...TipoImovel[]])).min(1, 'Selecione ao menos um tipo'),
    estado: z.string().min(1, 'Obrigatório'),
    cidade: z.string().min(1, 'Obrigatório'),
    bairros: z.array(z.string()).min(1, 'Selecione ao menos um bairro'),
    raioKm: z.coerce.number().min(2).max(10),
    valorDe: numeroOpcional(),
    valorAte: numeroOpcional(),

    quartosMin: numeroOpcional(),
    suitesMin: numeroOpcional(),
    vagasMin: numeroOpcional(),
    areaDe: numeroOpcional(),
    areaAte: numeroOpcional(),
    elevador: z.boolean().optional(),
    mobiliado: z.boolean().optional(),
    comArmarios: z.boolean().optional(),
    lazer: z.boolean().optional(),
    aceitaPet: z.boolean().optional(),

    etapaAlvo: z.enum(['1', '2', '3']),
    observacoes: z.string().optional(),
    visitas: z.array(z.object({ imovelId: z.string(), data: z.string() })).optional(),
  })
  .refine((d) => d.valorDe != null || d.valorAte != null, {
    message: 'Informe ao menos o valor mínimo ou máximo',
    path: ['valorAte'],
  })
  .refine((d) => d.etapaAlvo !== '2' || Boolean(d.observacoes), {
    message: 'Observações são obrigatórias para criar direto em "Em contato"',
    path: ['observacoes'],
  })
  .refine((d) => d.etapaAlvo !== '3' || (d.visitas != null && d.visitas.length > 0), {
    message: 'Selecione ao menos um imóvel com data de visita',
    path: ['visitas'],
  })
  .refine((d) => d.etapaAlvo !== '3' || (d.visitas ?? []).every((v) => Boolean(v.data)), {
    message: 'Informe a data de cada imóvel selecionado',
    path: ['visitas'],
  })

type FormData = z.infer<typeof schema>

const PASSOS = ['Identificação', 'Perfil de busca', 'Preferências detalhadas']
const CAMPOS_POR_PASSO: (keyof FormData)[][] = [
  ['nome', 'email'],
  ['tipos', 'estado', 'cidade', 'bairros', 'raioKm', 'valorDe', 'valorAte'],
  ['etapaAlvo', 'observacoes', 'visitas'],
]

export function CadastroClientePage() {
  const { id: clienteId } = useParams()
  const editando = Boolean(clienteId)
  const [passo, setPasso] = useState(1)
  const navigate = useNavigate()
  const { toast } = useToast()
  const criarLead = useCriarLead()
  const atualizarLead = useAtualizarLead()
  const { data: leads = [] } = useLeads()
  const clienteExistente = editando ? leads.find((l) => l.id === clienteId) : undefined
  const { data: imoveis = [] } = useImoveis()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      tipos: [],
      estado: '',
      cidade: '',
      bairros: [],
      raioKm: 5,
      etapaAlvo: '1',
    },
  })

  const { watch, setValue, handleSubmit, trigger, formState, reset } = form
  const valores = watch()

  const imoveisDisponiveis = imoveis.filter((i) => {
    if (i.corretorResponsavelId !== CORRETOR_LOGADO_ID || i.etapa !== 'd') return false
    if (!valores.tipos?.length || !valores.cidade || !valores.bairros?.length) return false
    return passaGates(i, {
      id: '',
      leadId: '',
      estado: valores.estado,
      cidade: valores.cidade,
      bairros: valores.bairros,
      raioKm: valores.raioKm ?? 5,
      tipos: valores.tipos,
      valorDe: valores.valorDe ?? null,
      valorAte: valores.valorAte ?? null,
    })
  })

  useEffect(() => {
    if (!clienteExistente) return
    reset({
      nome: clienteExistente.nome,
      telefoneWhatsapp: clienteExistente.telefoneWhatsapp,
      email: clienteExistente.email,
      origem: clienteExistente.origem,
      tipos: clienteExistente.perfilBusca.tipos,
      estado: clienteExistente.perfilBusca.estado,
      cidade: clienteExistente.perfilBusca.cidade,
      bairros: clienteExistente.perfilBusca.bairros,
      raioKm: clienteExistente.perfilBusca.raioKm ?? 5,
      valorDe: clienteExistente.perfilBusca.valorDe ?? undefined,
      valorAte: clienteExistente.perfilBusca.valorAte ?? undefined,
      quartosMin: clienteExistente.perfilBusca.quartosMin,
      suitesMin: clienteExistente.perfilBusca.suitesMin,
      vagasMin: clienteExistente.perfilBusca.vagasMin,
      areaDe: clienteExistente.perfilBusca.areaDe,
      areaAte: clienteExistente.perfilBusca.areaAte,
      elevador: clienteExistente.perfilBusca.elevador,
      mobiliado: clienteExistente.perfilBusca.mobiliado,
      comArmarios: clienteExistente.perfilBusca.comArmarios,
      lazer: clienteExistente.perfilBusca.lazer,
      aceitaPet: clienteExistente.perfilBusca.aceitaPet,
      etapaAlvo: '1',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteExistente?.id])

  async function avancar() {
    const campos = CAMPOS_POR_PASSO[passo - 1]
    const valido = await trigger(campos)
    if (valido) setPasso((p) => Math.min(p + 1, PASSOS.length))
  }

  function voltar() {
    setPasso((p) => Math.max(p - 1, 1))
  }

  function onInvalid(erros: typeof formState.errors) {
    const primeiroCampo = Object.keys(erros)[0] as keyof FormData | undefined
    const passoComErro = primeiroCampo
      ? CAMPOS_POR_PASSO.findIndex((campos) => campos.includes(primeiroCampo))
      : -1
    if (passoComErro >= 0) setPasso(passoComErro + 1)
    toast({
      title: 'Verifique os dados informados',
      description: 'Alguns campos obrigatórios ainda não foram preenchidos corretamente.',
      variant: 'destructive',
    })
  }

  function onSubmit(dados: FormData) {
    const perfilBusca = {
      id: '',
      leadId: '',
      estado: dados.estado,
      cidade: dados.cidade,
      bairros: dados.bairros,
      raioKm: dados.raioKm,
      tipos: dados.tipos,
      valorDe: dados.valorDe ?? null,
      valorAte: dados.valorAte ?? null,
      quartosMin: dados.quartosMin,
      suitesMin: dados.suitesMin,
      vagasMin: dados.vagasMin,
      areaDe: dados.areaDe,
      areaAte: dados.areaAte,
      elevador: dados.elevador,
      mobiliado: dados.mobiliado,
      comArmarios: dados.comArmarios,
      lazer: dados.lazer,
      aceitaPet: dados.aceitaPet,
    }

    if (editando && clienteExistente) {
      atualizarLead.mutate(
        {
          id: clienteExistente.id,
          patch: {
            nome: dados.nome,
            email: dados.email || undefined,
            telefoneWhatsapp: dados.telefoneWhatsapp || undefined,
            origem: (dados.origem as OrigemLead) || undefined,
            perfilBusca,
          },
        },
        {
          onSuccess: () => {
            toast({ title: 'Cliente atualizado', description: 'As alterações foram salvas.' })
            navigate('/meus-clientes')
          },
        },
      )
      return
    }

    const payload: Omit<Lead, 'id' | 'codigo' | 'dataCadastro'> = {
      corretorResponsavelId: CORRETOR_LOGADO_ID,
      etapa: Number(dados.etapaAlvo) as EtapaLead,
      nome: dados.nome,
      email: dados.email || undefined,
      telefoneWhatsapp: dados.telefoneWhatsapp || undefined,
      origem: (dados.origem as OrigemLead) || undefined,
      observacoes: dados.observacoes || undefined,
      visitasAgendadas: dados.visitas && dados.visitas.length > 0 ? dados.visitas : undefined,
      perfilBusca,
    }

    criarLead.mutate(payload, {
      onSuccess: (lead) => {
        toast({ title: 'Cliente cadastrado', description: `${lead.codigo} criado com sucesso.` })
        navigate('/meus-clientes')
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-xl font-bold">{editando ? 'Editar Cliente' : 'Cadastro de Cliente'}</h1>
      <p className="mb-1 text-sm text-text-mut">
        {editando
          ? 'Atualize os dados de identificação e o perfil de busca deste cliente.'
          : 'Cadastre o cliente com o perfil mínimo de busca. Sem isso o sistema não consegue gerar matches.'}
      </p>
      <p className="mb-6 text-sm text-text-mut">
        Passo {passo} de {PASSOS.length}
      </p>
      <WizardSteps passos={PASSOS} passoAtual={passo} />

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-5">
        {passo === 1 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" {...form.register('nome')} placeholder="Pode usar um apelido como &quot;Cliente 500&quot;" />
              {formState.errors.nome && <p className="text-sm text-danger">{formState.errors.nome.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefoneWhatsapp">Telefone (opcional)</Label>
                <Input id="telefoneWhatsapp" {...form.register('telefoneWhatsapp')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input id="email" {...form.register('email')} />
                {formState.errors.email && <p className="text-sm text-danger">{formState.errors.email.message}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Origem (opcional)</Label>
              <Select value={valores.origem} onValueChange={(v) => setValue('origem', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Tipos de imóvel desejados</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((tipo) => {
                  const selecionado = valores.tipos?.includes(tipo)
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        const atual = valores.tipos ?? []
                        setValue(
                          'tipos',
                          selecionado ? atual.filter((t) => t !== tipo) : [...atual, tipo],
                          { shouldValidate: true },
                        )
                      }}
                      className={selecionado ? 'rounded-chip border border-primary' : 'rounded-chip border border-transparent'}
                    >
                      <ChipTipoImovel tipo={tipo} />
                    </button>
                  )
                })}
              </div>
              {formState.errors.tipos && <p className="text-sm text-danger">{formState.errors.tipos.message}</p>}
            </div>

            <SelectorCascadeMultiplo
              estado={valores.estado}
              cidade={valores.cidade}
              bairros={valores.bairros ?? []}
              onChangeLocalizacao={({ estado, cidade }) => {
                setValue('estado', estado)
                setValue('cidade', cidade)
                setValue('bairros', [])
              }}
              onToggleBairro={(bairro) => {
                const atual = valores.bairros ?? []
                setValue(
                  'bairros',
                  atual.includes(bairro) ? atual.filter((b) => b !== bairro) : [...atual, bairro],
                  { shouldValidate: true },
                )
              }}
            />
            {(formState.errors.estado || formState.errors.cidade || formState.errors.bairros) && (
              <p className="text-sm text-danger">Selecione estado, cidade e ao menos um bairro.</p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="raioKm">Raio de busca além do bairro exato (km)</Label>
              <Select
                value={String(valores.raioKm ?? 5)}
                onValueChange={(v) => setValue('raioKm', Number(v), { shouldValidate: true })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 9 }, (_, i) => i + 2).map((km) => (
                    <SelectItem key={km} value={String(km)}>
                      {km} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-text-soft">
                Imóveis fora dos bairros selecionados, mas dentro deste raio, também entram no match.
                Em cidades mais densas, prefira um raio menor.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valorDe">De (R$)</Label>
                <Input id="valorDe" type="number" min={0} {...form.register('valorDe')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valorAte">Até (R$)</Label>
                <Input id="valorAte" type="number" min={0} {...form.register('valorAte')} />
                {formState.errors.valorAte && <p className="text-sm text-danger">{formState.errors.valorAte.message}</p>}
              </div>
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <p className="text-sm font-medium text-ink">Preferências detalhadas (opcional, melhora seus matches)</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quartosMin">Quartos (mín.)</Label>
                <Input id="quartosMin" type="number" min={0} {...form.register('quartosMin')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="suitesMin">Suítes (mín.)</Label>
                <Input id="suitesMin" type="number" min={0} {...form.register('suitesMin')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vagasMin">Vagas (mín.)</Label>
                <Input id="vagasMin" type="number" min={0} {...form.register('vagasMin')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="areaDe">Área de (m²)</Label>
                <Input id="areaDe" type="number" min={0} {...form.register('areaDe')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="areaAte">Área até (m²)</Label>
                <Input id="areaAte" type="number" min={0} {...form.register('areaAte')} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <ChipBoolean label="Elevador" selecionado={!!valores.elevador} onToggle={() => setValue('elevador', !valores.elevador)} />
              <ChipBoolean label="Mobiliado" selecionado={!!valores.mobiliado} onToggle={() => setValue('mobiliado', !valores.mobiliado)} />
              <ChipBoolean label="Com armários" selecionado={!!valores.comArmarios} onToggle={() => setValue('comArmarios', !valores.comArmarios)} />
              <ChipBoolean label="Lazer" selecionado={!!valores.lazer} onToggle={() => setValue('lazer', !valores.lazer)} />
              <ChipBoolean label="Aceita pet" selecionado={!!valores.aceitaPet} onToggle={() => setValue('aceitaPet', !valores.aceitaPet)} />
            </div>

            {!editando && (
              <>
                <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-4">
                  <Label>Mover cliente para a etapa</Label>
                  <Select value={valores.etapaAlvo} onValueChange={(v) => setValue('etapaAlvo', v as '1' | '2' | '3')}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Novo Cliente</SelectItem>
                      <SelectItem value="2">Em contato</SelectItem>
                      <SelectItem value="3">Visita agendada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {valores.etapaAlvo === '2' && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="observacoes">Observações (obrigatório para "Em contato")</Label>
                    <textarea
                      id="observacoes"
                      {...form.register('observacoes')}
                      className="min-h-20 w-full rounded-card border border-border bg-surface px-3 py-2 text-[15px] font-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    {formState.errors.observacoes && (
                      <p className="text-sm text-danger">{formState.errors.observacoes.message}</p>
                    )}
                  </div>
                )}

                {valores.etapaAlvo === '3' && (
                  <div className="flex flex-col gap-1.5">
                    <Label>Imóveis e datas de visita (pode selecionar mais de um)</Label>
                    {imoveisDisponiveis.length === 0 && (
                      <p className="text-xs text-text-soft">
                        Nenhum dos seus imóveis publicados tem perfil compatível com este cliente no momento.
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {imoveisDisponiveis.map((i) => {
                        const visitas = valores.visitas ?? []
                        const idx = visitas.findIndex((v) => v.imovelId === i.id)
                        const selecionado = idx >= 0
                        return (
                          <div
                            key={i.id}
                            className="flex flex-col gap-2 rounded-card border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <label className="flex items-center gap-2 text-sm text-text">
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setValue('visitas', [...visitas, { imovelId: i.id, data: '' }], { shouldValidate: true })
                                  } else {
                                    setValue(
                                      'visitas',
                                      visitas.filter((v) => v.imovelId !== i.id),
                                      { shouldValidate: true },
                                    )
                                  }
                                }}
                                className="h-4 w-4 rounded border-border"
                              />
                              {i.enderecoRua}, {i.enderecoNumero} · {i.bairro}
                            </label>
                            {selecionado && (
                              <Input
                                type="date"
                                value={visitas[idx].data}
                                onChange={(e) => {
                                  const novasVisitas = [...visitas]
                                  novasVisitas[idx] = { imovelId: i.id, data: e.target.value }
                                  setValue('visitas', novasVisitas, { shouldValidate: true })
                                }}
                                className="sm:w-44"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {formState.errors.visitas && (
                      <p className="text-sm text-danger">{formState.errors.visitas.message}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="mt-2 flex justify-between">
          <Button type="button" variant="outline" onClick={voltar} disabled={passo === 1}>
            Voltar
          </Button>
          {passo < PASSOS.length ? (
            <Button type="button" onClick={avancar}>
              Próximo
            </Button>
          ) : (
            <Button type="submit" disabled={criarLead.isPending || atualizarLead.isPending}>
              {editando ? 'Salvar alterações' : 'Concluir cadastro'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
