import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { WizardSteps } from '@/components/shared/WizardSteps'
import { SelectorCascadeUnico } from '@/components/shared/SelectorCascade'
import { ChipBoolean } from '@/components/shared/ChipBoolean'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import { UploaderFotos } from '@/components/imovel/UploaderFotos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { Imovel, TipoImovel } from '@/domain/types'
import { useAtualizarImovel, useCriarImovel, useImoveis } from '@/hooks/useImoveis'
import { CORRETOR_LOGADO_ID, nomeCorretor, CORRETORES } from '@/mocks/data/corretores'
import { encontrarBairro } from '@/mocks/data/bairros'
import { cn } from '@/lib/cn'

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

const TIPOS_COM_TERRENO_SEPARADO: TipoImovel[] = ['casa_rua', 'casa_condominio', 'casa_comercial']
const TIPOS_APENAS_TERRENO: TipoImovel[] = ['terreno_rua', 'terreno_condominio', 'terreno_comercial']
const TIPOS_COM_ARMARIOS: TipoImovel[] = ['apartamento', 'casa_rua', 'casa_condominio', 'casa_comercial']

const schema = z.object({
  estado: z.string().min(1, 'Obrigatório'),
  cidade: z.string().min(1, 'Obrigatório'),
  bairro: z.string().min(1, 'Obrigatório'),
  cep: z.string().optional(),
  enderecoRua: z.string().min(1, 'Obrigatório'),
  enderecoNumero: z.string().min(1, 'Obrigatório'),

  tipo: z.enum(TIPOS as [TipoImovel, ...TipoImovel[]], { required_error: 'Selecione um tipo' }),
  quartos: z.coerce.number().min(0).default(0),
  suites: z.coerce.number().min(0).default(0),
  vagas: z.coerce.number().min(0).default(0),
  banheiros: z.coerce.number().min(0).default(0),
  area: z.coerce.number().min(0).optional(),
  areaTerreno: z.coerce.number().min(0).optional(),

  elevador: z.boolean().optional(),
  mobiliado: z.boolean().optional(),
  comArmarios: z.boolean().optional(),
  lazer: z.boolean().optional(),
  varanda: z.boolean().optional(),
  churrasqueira: z.boolean().optional(),
  aceitaPet: z.boolean().optional(),
  nomeCondominio: z.string().optional(),

  fotos: z.array(z.string()).optional(),

  valorEstimado: z.coerce.number().min(0).optional(),
  cnm: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const PASSOS = ['Localização', 'Características', 'Diferenciais', 'Fotos', 'Valor e CNM']
const CAMPOS_POR_PASSO: (keyof FormData)[][] = [
  ['estado', 'cidade', 'bairro', 'enderecoRua', 'enderecoNumero'],
  ['tipo', 'quartos', 'suites', 'vagas', 'banheiros', 'area'],
  [],
  [],
  [],
]

export function CadastroImovelPage() {
  const { id: imovelId } = useParams()
  const editando = Boolean(imovelId)
  const { data: imoveis = [], isLoading } = useImoveis()
  const imovelExistente = editando ? imoveis.find((i) => i.id === imovelId) : undefined

  // Só monta o formulário quando os dados já estão disponíveis: assim o useForm() computa
  // defaultValues corretos desde o primeiro mount (nunca precisa de reset() depois), o que evita
  // o Radix Select mostrar em branco por registrar o item depois do valor já ter sido setado.
  if (editando && (isLoading || !imovelExistente)) {
    return <div className="p-6 text-sm text-text-mut">Carregando imóvel…</div>
  }

  return <CadastroImovelForm imovelExistente={imovelExistente} imoveis={imoveis} />
}

function CadastroImovelForm({
  imovelExistente,
  imoveis,
}: {
  imovelExistente: Imovel | undefined
  imoveis: Imovel[]
}) {
  const editando = Boolean(imovelExistente)
  const [passo, setPasso] = useState(1)
  const [erroCnm, setErroCnm] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()
  const criarImovel = useCriarImovel()
  const atualizarImovel = useAtualizarImovel()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: imovelExistente
      ? {
          estado: imovelExistente.estado,
          cidade: imovelExistente.cidade,
          bairro: imovelExistente.bairro,
          cep: imovelExistente.cep,
          enderecoRua: imovelExistente.enderecoRua,
          enderecoNumero: imovelExistente.enderecoNumero,
          tipo: imovelExistente.tipo,
          quartos: imovelExistente.quartos,
          suites: imovelExistente.suites,
          vagas: imovelExistente.vagas,
          banheiros: imovelExistente.banheiros,
          area: imovelExistente.areaPrivativaM2 ?? imovelExistente.areaConstruidaM2,
          areaTerreno: imovelExistente.areaTerrenoM2,
          elevador: imovelExistente.elevador,
          mobiliado: imovelExistente.mobiliado,
          comArmarios: imovelExistente.comArmarios,
          lazer: imovelExistente.lazer,
          varanda: imovelExistente.varanda,
          churrasqueira: imovelExistente.churrasqueira,
          aceitaPet: imovelExistente.aceitaPet,
          nomeCondominio: imovelExistente.nomeCondominio,
          fotos: imovelExistente.fotos ?? [],
          valorEstimado: imovelExistente.valorEstimado,
          cnm: imovelExistente.cnm,
        }
      : {
          estado: '',
          cidade: '',
          bairro: '',
          enderecoRua: '',
          enderecoNumero: '',
          quartos: 0,
          suites: 0,
          vagas: 0,
          banheiros: 0,
          fotos: [],
        },
  })

  const { watch, setValue, handleSubmit, trigger, formState } = form
  const valores = watch()

  async function avancar() {
    const campos = CAMPOS_POR_PASSO[passo - 1]
    const valido = campos.length === 0 || (await trigger(campos))
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
    if (dados.cnm) {
      const existente = imoveis.find((i) => i.cnm === dados.cnm && i.id !== imovelExistente?.id)
      if (existente) {
        setErroCnm(existente.corretorResponsavelId)
        return
      }
    }
    setErroCnm(null)

    const coords = encontrarBairro(dados.cidade, dados.bairro)
    const usaTerrenoSeparado = TIPOS_COM_TERRENO_SEPARADO.includes(dados.tipo)
    const apenasTerreno = TIPOS_APENAS_TERRENO.includes(dados.tipo)

    const camposComuns = {
      enderecoRua: dados.enderecoRua,
      enderecoNumero: dados.enderecoNumero,
      bairro: dados.bairro,
      cidade: dados.cidade,
      estado: dados.estado,
      cep: dados.cep ?? '00000-000',
      lat: coords?.lat ?? -21.17,
      lng: coords?.lng ?? -47.81,
      tipo: dados.tipo,
      cnm: dados.cnm || undefined,
      valorEstimado: dados.valorEstimado,
      quartos: dados.quartos,
      suites: dados.suites,
      vagas: dados.vagas,
      banheiros: dados.banheiros,
      areaPrivativaM2: !usaTerrenoSeparado && !apenasTerreno ? dados.area : undefined,
      areaConstruidaM2: usaTerrenoSeparado ? dados.area : undefined,
      areaTerrenoM2: usaTerrenoSeparado || apenasTerreno ? dados.areaTerreno ?? dados.area : undefined,
      elevador: dados.elevador,
      mobiliado: dados.mobiliado,
      comArmarios: dados.comArmarios,
      lazer: dados.lazer,
      varanda: dados.varanda,
      churrasqueira: dados.churrasqueira,
      aceitaPet: dados.aceitaPet,
      nomeCondominio: dados.nomeCondominio || undefined,
      fotos: dados.fotos && dados.fotos.length > 0 ? dados.fotos : undefined,
    }

    if (editando && imovelExistente) {
      atualizarImovel.mutate(
        { id: imovelExistente.id, patch: camposComuns },
        {
          onSuccess: () => {
            toast({ title: 'Imóvel atualizado', description: 'As alterações foram salvas.' })
            navigate('/meus-imoveis')
          },
        },
      )
      return
    }

    const payload: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      ...camposComuns,
      corretorResponsavelId: CORRETOR_LOGADO_ID,
      etapa: 'a',
      emNegociacaoFlag: false,
    }

    criarImovel.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'Imóvel cadastrado', description: 'Já está disponível em Meus Imóveis, etapa Novo.' })
        navigate('/meus-imoveis')
      },
    })
  }

  const usaTerrenoSeparado = valores.tipo && TIPOS_COM_TERRENO_SEPARADO.includes(valores.tipo)
  const apenasTerreno = valores.tipo && TIPOS_APENAS_TERRENO.includes(valores.tipo)
  const mostrarArmarios = valores.tipo && TIPOS_COM_ARMARIOS.includes(valores.tipo)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-xl font-bold">{editando ? 'Editar Imóvel' : 'Cadastro de Imóvel'}</h1>
      <p className="mb-6 text-sm text-text-mut">
        Passo {passo} de {PASSOS.length}
      </p>
      <WizardSteps passos={PASSOS} passoAtual={passo} />

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-5">
        {passo === 1 && (
          <>
            <SelectorCascadeUnico
              estado={valores.estado}
              cidade={valores.cidade}
              bairro={valores.bairro}
              onChange={({ estado, cidade, bairro }) => {
                setValue('estado', estado)
                setValue('cidade', cidade)
                setValue('bairro', bairro)
              }}
            />
            {(formState.errors.estado || formState.errors.cidade || formState.errors.bairro) && (
              <p className="text-sm text-danger">Selecione estado, cidade e bairro.</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="enderecoRua">Rua</Label>
                <Input id="enderecoRua" {...form.register('enderecoRua')} />
                {formState.errors.enderecoRua && (
                  <p className="text-sm text-danger">{formState.errors.enderecoRua.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="enderecoNumero">Número</Label>
                <Input id="enderecoNumero" {...form.register('enderecoNumero')} />
                {formState.errors.enderecoNumero && (
                  <p className="text-sm text-danger">{formState.errors.enderecoNumero.message}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cep">CEP (opcional)</Label>
              <Input id="cep" {...form.register('cep')} placeholder="00000-000" />
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de imóvel</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setValue('tipo', tipo, { shouldValidate: true })}
                    className={cn(
                      'rounded-chip border transition-colors',
                      valores.tipo === tipo ? 'border-primary' : 'border-transparent',
                    )}
                  >
                    <ChipTipoImovel tipo={tipo} />
                  </button>
                ))}
              </div>
              {formState.errors.tipo && <p className="text-sm text-danger">Selecione um tipo.</p>}
            </div>

            {!apenasTerreno && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quartos">Quartos</Label>
                  <Input id="quartos" type="number" min={0} {...form.register('quartos')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="suites">Suítes</Label>
                  <Input id="suites" type="number" min={0} {...form.register('suites')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vagas">Vagas</Label>
                  <Input id="vagas" type="number" min={0} {...form.register('vagas')} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="banheiros">Banheiros</Label>
                  <Input id="banheiros" type="number" min={0} {...form.register('banheiros')} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!apenasTerreno && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="area">
                    {usaTerrenoSeparado ? 'Área construída (m²)' : 'Área privativa (m²)'}
                  </Label>
                  <Input id="area" type="number" min={0} {...form.register('area')} />
                </div>
              )}
              {(usaTerrenoSeparado || apenasTerreno) && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="areaTerreno">Área do terreno (m²)</Label>
                  <Input id="areaTerreno" type="number" min={0} {...form.register('areaTerreno')} />
                </div>
              )}
            </div>
          </>
        )}

        {passo === 3 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Diferenciais (opcional)</Label>
              <div className="flex flex-wrap gap-2">
                <ChipBoolean label="Elevador" selecionado={!!valores.elevador} onToggle={() => setValue('elevador', !valores.elevador)} />
                <ChipBoolean label="Mobiliado" selecionado={!!valores.mobiliado} onToggle={() => setValue('mobiliado', !valores.mobiliado)} />
                {mostrarArmarios && (
                  <ChipBoolean label="Com armários" selecionado={!!valores.comArmarios} onToggle={() => setValue('comArmarios', !valores.comArmarios)} />
                )}
                <ChipBoolean label="Lazer" selecionado={!!valores.lazer} onToggle={() => setValue('lazer', !valores.lazer)} />
                <ChipBoolean label="Varanda" selecionado={!!valores.varanda} onToggle={() => setValue('varanda', !valores.varanda)} />
                <ChipBoolean label="Churrasqueira" selecionado={!!valores.churrasqueira} onToggle={() => setValue('churrasqueira', !valores.churrasqueira)} />
                <ChipBoolean label="Aceita pet" selecionado={!!valores.aceitaPet} onToggle={() => setValue('aceitaPet', !valores.aceitaPet)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nomeCondominio">Nome do condomínio (opcional)</Label>
              <Input id="nomeCondominio" {...form.register('nomeCondominio')} />
            </div>
          </>
        )}

        {passo === 4 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>Fotos (opcional)</Label>
              <UploaderFotos
                fotos={valores.fotos ?? []}
                onChange={(fotos) => setValue('fotos', fotos)}
              />
            </div>
          </>
        )}

        {passo === 5 && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valorEstimado">Valor estimado (opcional nesta etapa)</Label>
              <Input id="valorEstimado" type="number" min={0} {...form.register('valorEstimado')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cnm">
                CNM (Cadastro Nacional de Matrícula) — opcional agora, obrigatório para avançar de etapa
              </Label>
              <Input
                id="cnm"
                {...form.register('cnm')}
                onChange={(e) => {
                  form.register('cnm').onChange(e)
                  setErroCnm(null)
                }}
                placeholder="0000.0000.0000.0000"
              />
              <p className="text-xs text-text-soft">
                O CNM (Cadastro Nacional de Matrícula) identifica o imóvel de forma única e
                nacional na base. Você pode informar depois, mas será exigido para avançar da
                etapa "Novo" para "Análise e Estudo".
              </p>
              {erroCnm && (
                <div className="mt-1 rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                  Este CNM já está cadastrado por {nomeCorretor(erroCnm)}
                  {(() => {
                    const c = CORRETORES.find((c) => c.id === erroCnm)
                    return c ? ` · WhatsApp: ${c.telefoneWhatsapp}` : ''
                  })()}
                  .
                </div>
              )}
            </div>
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
            <Button type="submit" disabled={criarImovel.isPending || atualizarImovel.isPending}>
              {editando ? 'Salvar alterações' : 'Concluir cadastro'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
