import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StepperPeso } from '@/components/score/StepperPeso'
import { PreviewScore } from '@/components/score/PreviewScore'
import { ATRIBUTO_SCORE_LABEL } from '@/domain/constants'
import type { AtributoScore, PesosScore } from '@/domain/types'
import { cn } from '@/lib/cn'

const DESCRICAO_ATRIBUTO: Record<AtributoScore, string> = {
  quartos: 'Quanto o número de quartos do imóvel atende o mínimo pedido pelo cliente.',
  suites: 'Quanto o número de suítes atende o mínimo pedido.',
  vagas: 'Se o imóvel tem ao menos as vagas de garagem mínimas pedidas.',
  banheiros: 'Se o imóvel tem ao menos os banheiros mínimos pedidos.',
  area: 'Se a área do imóvel está dentro da faixa pedida pelo cliente.',
  bairro_exato_vs_raio: 'Prioriza bairro exato sobre imóveis apenas dentro do raio de busca.',
  preco_dentro_vs_tolerancia: 'Prioriza preço dentro da faixa exata sobre a tolerância de 5%.',
  elevador: 'Relevância de o imóvel ter elevador quando o cliente pede.',
  mobiliado: 'Relevância de o imóvel estar mobiliado quando o cliente pede.',
  lazer: 'Relevância de área de lazer quando o cliente pede.',
  varanda: 'Relevância de varanda quando o cliente pede.',
  churrasqueira: 'Relevância de churrasqueira quando o cliente pede.',
  aceita_pet: 'Relevância de aceitar pet quando o cliente pede.',
  nome_condominio_match: 'Relevância de o imóvel estar no condomínio específico pedido.',
}

interface Secao {
  titulo: string
  atributos: AtributoScore[]
}

const SECOES: Secao[] = [
  { titulo: 'Características do imóvel', atributos: ['quartos', 'suites', 'vagas', 'banheiros', 'area'] },
  { titulo: 'Localização e preço', atributos: ['bairro_exato_vs_raio', 'preco_dentro_vs_tolerancia'] },
  {
    titulo: 'Diferenciais',
    atributos: ['elevador', 'mobiliado', 'lazer', 'varanda', 'churrasqueira', 'aceita_pet', 'nome_condominio_match'],
  },
]

interface CalibradorScoreProps {
  pesos: PesosScore
  onChange: (atributo: AtributoScore, valor: number) => void
}

export function CalibradorScore({ pesos, onChange }: CalibradorScoreProps) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({
    'Características do imóvel': true,
    'Localização e preço': true,
    Diferenciais: false,
  })

  return (
    <div className="flex flex-col gap-4">
      <PreviewScore pesos={pesos} />

      {SECOES.map((secao) => {
        const aberta = abertas[secao.titulo]
        return (
          <div key={secao.titulo} className="rounded-card border border-border bg-surface">
            <button
              type="button"
              onClick={() => setAbertas((a) => ({ ...a, [secao.titulo]: !a[secao.titulo] }))}
              className="flex w-full items-center justify-between px-4 py-3"
            >
              <span className="font-heading text-sm font-semibold text-ink">{secao.titulo}</span>
              {aberta ? (
                <ChevronDown className="h-4 w-4 text-text-mut" strokeWidth={1.5} />
              ) : (
                <ChevronRight className="h-4 w-4 text-text-mut" strokeWidth={1.5} />
              )}
            </button>
            {aberta && (
              <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
                {secao.atributos.map((atributo) => (
                  <div
                    key={atributo}
                    className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between')}
                  >
                    <div className="max-w-md">
                      <p className="text-sm font-medium text-ink">{ATRIBUTO_SCORE_LABEL[atributo]}</p>
                      <p className="text-xs text-text-mut">{DESCRICAO_ATRIBUTO[atributo]}</p>
                    </div>
                    <StepperPeso valor={pesos[atributo]} onChange={(v) => onChange(atributo, v)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
