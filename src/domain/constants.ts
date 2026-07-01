import { Building2, Home, Landmark, Store, Trees, Factory, type LucideIcon } from 'lucide-react'
import type { AtributoScore, EtapaImovel, EtapaLead, PesosScore, TipoImovel } from '@/domain/types'

export const TIPO_IMOVEL_LABEL: Record<TipoImovel, string> = {
  apartamento: 'Apartamento',
  casa_rua: 'Casa (rua)',
  casa_condominio: 'Casa (condomínio)',
  casa_comercial: 'Casa comercial',
  terreno_rua: 'Terreno (rua)',
  terreno_condominio: 'Terreno (condomínio)',
  terreno_comercial: 'Terreno comercial',
  sala_comercial: 'Sala comercial',
  galpao_comercial_industrial: 'Galpão comercial/industrial',
}

export const TIPO_IMOVEL_ICON: Record<TipoImovel, LucideIcon> = {
  apartamento: Building2,
  casa_rua: Home,
  casa_condominio: Home,
  casa_comercial: Store,
  terreno_rua: Trees,
  terreno_condominio: Trees,
  terreno_comercial: Landmark,
  sala_comercial: Store,
  galpao_comercial_industrial: Factory,
}

export const ETAPA_IMOVEL_LABEL: Record<EtapaImovel, string> = {
  a: 'Novo',
  b: 'Análise e Estudo',
  c: 'Produção',
  d: 'Publicado',
  e: 'Em negociação',
  f: 'Vendido',
}

export const ETAPA_IMOVEL_ORDEM: EtapaImovel[] = ['a', 'b', 'c', 'd', 'e', 'f']

export const ETAPA_LEAD_LABEL: Record<EtapaLead, string> = {
  1: 'Novo Lead',
  2: 'Em contato',
  3: 'Visita agendada',
  4: 'Em negociação',
  5: 'Negócio Fechado',
  6: 'Finalizado',
  7: 'Standby',
  8: 'Perdidos',
}

export const ETAPA_LEAD_ORDEM: EtapaLead[] = [1, 2, 3, 4, 5, 6, 7, 8]

export const PESO_ETAPA_LEAD: Record<EtapaLead, number> = {
  1: 0.8,
  2: 1.0,
  3: 0.6,
  4: 0.4,
  5: 0,
  6: 0,
  7: 0.2,
  8: 0,
}

export const ATRIBUTO_SCORE_LABEL: Record<AtributoScore, string> = {
  quartos: 'Quartos',
  suites: 'Suítes',
  vagas: 'Vagas de garagem',
  banheiros: 'Banheiros',
  area: 'Área',
  bairro_exato_vs_raio: 'Bairro exato vs. raio',
  preco_dentro_vs_tolerancia: 'Preço dentro da faixa vs. tolerância',
  elevador: 'Elevador',
  mobiliado: 'Mobiliado',
  lazer: 'Área de lazer',
  varanda: 'Varanda',
  churrasqueira: 'Churrasqueira',
  aceita_pet: 'Aceita pet',
  nome_condominio_match: 'Nome do condomínio',
}

export const PESOS_SCORE_DEFAULT: PesosScore = {
  quartos: 9,
  suites: 7,
  vagas: 6,
  banheiros: 4,
  area: 6,
  bairro_exato_vs_raio: 8,
  preco_dentro_vs_tolerancia: 7,
  elevador: 4,
  mobiliado: 3,
  lazer: 3,
  varanda: 2,
  churrasqueira: 2,
  aceita_pet: 2,
  nome_condominio_match: 5,
}
