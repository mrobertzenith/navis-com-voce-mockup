import { CardImovel } from '@/components/imovel/CardImovel'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import { CardLead, type LeadCardData } from '@/components/lead/CardLead'
import { ScoreBadge } from '@/components/match/ScoreBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Tarja, TarjaArquivado, TarjaStandby } from '@/components/shared/Tarja'
import { Building2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Imovel, TipoImovel } from '@/domain/types'

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

const imovelExemplo: Imovel = {
  id: 'im-1',
  corretorResponsavelId: 'cor-1',
  etapa: 'd',
  enderecoRua: 'Rua Amoipira',
  enderecoNumero: '120',
  bairro: 'Jardim Sumaré',
  cidade: 'Ribeirão Preto',
  estado: 'SP',
  cep: '14025-000',
  lat: -21.17,
  lng: -47.81,
  tipo: 'apartamento',
  linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/exemplo',
  valorAnuncio: 480000,
  quartos: 3,
  suites: 1,
  vagas: 2,
  banheiros: 2,
  areaPrivativaM2: 85,
  emNegociacaoFlag: false,
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
}

const leadExemplo: LeadCardData = {
  id: 'lead-1',
  codigo: 'Lead #2401',
  corretorResponsavelId: 'cor-1',
  etapa: 2,
  dataCadastro: new Date().toISOString(),
  perfilBusca: {
    id: 'pb-1',
    leadId: 'lead-1',
    estado: 'SP',
    cidade: 'Ribeirão Preto',
    bairros: ['Jardim Sumaré', 'Jardim Botânico'],
    raioKm: 5,
    tipos: ['apartamento'],
    valorDe: 400000,
    valorAte: 550000,
  },
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  )
}

export function DesignSystemPage() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold">Design System — showcase interno</h1>
      <p className="mb-6 text-sm text-text-mut">
        Rota interna de desenvolvimento. Não faz parte das telas do produto.
      </p>

      <Secao titulo="ScoreBadge">
        <ScoreBadge score={92} size="lg" />
        <ScoreBadge score={55} size="md" />
        <ScoreBadge score={18} size="sm" />
      </Secao>

      <Secao titulo="ChipTipoImovel — 9 variantes">
        {TIPOS.map((tipo) => (
          <ChipTipoImovel key={tipo} tipo={tipo} />
        ))}
      </Secao>

      <Secao titulo="Tarja">
        <Tarja variant="parado" dias={20} />
        <Tarja variant="parado" dias={28} />
        <Tarja variant="match_aviso" />
        <Tarja variant="aguardando_confirmacao" horasRestantes={12} />
        <TarjaStandby />
        <TarjaArquivado />
      </Secao>

      <Secao titulo="CardImovel">
        <div className="w-72">
          <CardImovel imovel={imovelExemplo} contadorMatches={5} />
        </div>
        <div className="w-72">
          <CardImovel imovel={{ ...imovelExemplo, etapa: 'e' }} />
        </div>
        <div className="w-72">
          <CardImovel imovel={{ ...imovelExemplo, etapa: 'f' }} />
        </div>
        <div className="w-72">
          <CardImovel imovel={{ ...imovelExemplo, etapa: 'a' }} diasParado={22} onMover={() => {}} />
        </div>
      </Secao>

      <Secao titulo="CardLead (sempre anonimizado)">
        <div className="w-72">
          <CardLead lead={leadExemplo} contadorMatches={3} />
        </div>
        <div className="w-72">
          <CardLead lead={{ ...leadExemplo, etapa: 7 }} />
        </div>
        <div className="w-72">
          <CardLead lead={{ ...leadExemplo, etapa: 8 }} />
        </div>
      </Secao>

      <Secao titulo="EmptyState">
        <div className="w-96">
          <EmptyState
            icon={Building2}
            title="Nenhum imóvel nesta etapa"
            description="Cadastre um novo imóvel ou ajuste os filtros."
          />
        </div>
      </Secao>
    </div>
  )
}
