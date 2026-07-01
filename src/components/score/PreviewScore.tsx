import { ScoreBadge } from '@/components/match/ScoreBadge'
import { calcularScoreImovel } from '@/domain/matching'
import type { Imovel, PerfilBusca, PesosScore } from '@/domain/types'

const IMOVEL_EXEMPLO: Imovel = {
  id: 'preview-imovel',
  corretorResponsavelId: 'preview',
  etapa: 'd',
  enderecoRua: 'Rua Amoipira',
  enderecoNumero: '120',
  bairro: 'Jardim Sumaré',
  cidade: 'Ribeirão Preto',
  estado: 'SP',
  cep: '14025-000',
  lat: -21.1782,
  lng: -47.8113,
  tipo: 'apartamento',
  valorAnuncio: 480000,
  quartos: 3,
  suites: 1,
  vagas: 2,
  banheiros: 2,
  areaPrivativaM2: 85,
  elevador: true,
  emNegociacaoFlag: false,
  criadoEm: '',
  atualizadoEm: '',
}

const PERFIL_EXEMPLO: PerfilBusca = {
  id: 'preview-perfil',
  leadId: 'preview-lead',
  estado: 'SP',
  cidade: 'Ribeirão Preto',
  bairros: ['Ribeirânia'],
  raioKm: 5,
  tipos: ['apartamento'],
  valorDe: 500000,
  valorAte: 550000,
  quartosMin: 4,
  suitesMin: 1,
  vagasMin: 3,
  elevador: true,
  varanda: true,
}

interface PreviewScoreProps {
  pesos: PesosScore
}

export function PreviewScore({ pesos }: PreviewScoreProps) {
  const scoreImovel = calcularScoreImovel(IMOVEL_EXEMPLO, PERFIL_EXEMPLO, pesos)
  const scoreExibido = Math.round(scoreImovel * 100)

  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-bg p-4">
      <ScoreBadge score={scoreExibido} size="lg" />
      <div>
        <p className="text-sm font-medium text-ink">Exemplo ao vivo</p>
        <p className="text-xs text-text-mut">
          Apartamento 3q/1suíte/2v, 85m², elevador, Jardim Sumaré · R$ 480.000
        </p>
        <p className="text-xs text-text-soft">
          × Cliente buscando apartamento em Ribeirânia, R$ 500–550 mil, 4+ quartos, 3+ vagas,
          elevador e varanda
        </p>
      </div>
    </div>
  )
}
