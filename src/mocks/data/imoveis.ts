import type { EtapaImovel, Imovel, TipoImovel } from '@/domain/types'
import { encontrarBairro } from '@/mocks/data/bairros'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { fotosParaImovel } from '@/mocks/data/fotosImoveis'

let seq = 0
function proximoId(): string {
  seq += 1
  return `im-${String(seq).padStart(3, '0')}`
}

interface ImovelSeed {
  corretorResponsavelId: string
  etapa: EtapaImovel
  enderecoRua: string
  enderecoNumero: string
  bairro: string
  cidade: string
  estado: string
  tipo: TipoImovel
  cnm?: string
  linkAnuncioUrl?: string
  linkQuebrado?: boolean
  valorEstimado?: number
  valorAnuncio?: number
  valorVenda?: number
  quartos: number
  suites: number
  vagas: number
  banheiros: number
  areaPrivativaM2?: number
  areaConstruidaM2?: number
  areaTerrenoM2?: number
  elevador?: boolean
  mobiliado?: boolean
  lazer?: boolean
  varanda?: boolean
  churrasqueira?: boolean
  aceitaPet?: boolean
  nomeCondominio?: string
  emNegociacaoFlag?: boolean
  observacoes?: string
  criadoEm: string
  dataPublicacao?: string
  dataVenda?: string
  diasParado?: number
  qtdFotos?: number
}

function construir(seed: ImovelSeed): Imovel {
  const coords = encontrarBairro(seed.cidade, seed.bairro)
  const agora = new Date('2026-07-01T12:00:00.000Z')
  const ttlAtual = ['a', 'b', 'c'].includes(seed.etapa)
    ? new Date(
        agora.getTime() + (30 - (seed.diasParado ?? 5)) * 24 * 60 * 60 * 1000,
      ).toISOString()
    : undefined

  return {
    id: proximoId(),
    corretorResponsavelId: seed.corretorResponsavelId,
    etapa: seed.etapa,
    enderecoRua: seed.enderecoRua,
    enderecoNumero: seed.enderecoNumero,
    bairro: seed.bairro,
    cidade: seed.cidade,
    estado: seed.estado,
    cep: '00000-000',
    lat: coords?.lat ?? -21.1775,
    lng: coords?.lng ?? -47.8103,
    tipo: seed.tipo,
    cnm: seed.cnm,
    linkAnuncioUrl: seed.linkAnuncioUrl,
    linkQuebrado: seed.linkQuebrado,
    nomeCondominio: seed.nomeCondominio,
    valorEstimado: seed.valorEstimado,
    valorAnuncio: seed.valorAnuncio,
    valorVenda: seed.valorVenda,
    quartos: seed.quartos,
    suites: seed.suites,
    vagas: seed.vagas,
    banheiros: seed.banheiros,
    areaPrivativaM2: seed.areaPrivativaM2,
    areaConstruidaM2: seed.areaConstruidaM2,
    areaTerrenoM2: seed.areaTerrenoM2,
    elevador: seed.elevador,
    mobiliado: seed.mobiliado,
    lazer: seed.lazer,
    varanda: seed.varanda,
    churrasqueira: seed.churrasqueira,
    aceitaPet: seed.aceitaPet,
    emNegociacaoFlag: seed.emNegociacaoFlag ?? seed.etapa === 'e',
    observacoes: seed.observacoes,
    ttlAtual,
    fotos: fotosParaImovel(seed.tipo, seq, seed.qtdFotos ?? (seed.etapa === 'a' ? 1 : 2)),
    criadoEm: seed.criadoEm,
    dataPublicacao: seed.dataPublicacao,
    dataVenda: seed.dataVenda,
    atualizadoEm: seed.criadoEm,
  }
}

const ANA = CORRETOR_LOGADO_ID
const OUTROS = ['f0d40439-29cc-551b-916c-d95420db46dd', 'df02932d-3419-52e6-bc58-beb6331173d2', 'b8ca15bb-befd-5301-9905-05937dd4036d', '1f60ab01-9a52-5d62-8fc0-4813c85330d2', '1490c396-a4e3-5694-80bb-156e3185f6fa', '5a8ee2db-6e43-5547-9df8-6a0983252fa7', '6aa7212c-59f5-504e-a651-8fb47eb93ec1', '99e9b3f9-a03b-5667-9e50-420eab22d6f3', '6ef5adcd-bf58-5da1-bcbd-dd31567b3f1c']

export const IMOVEIS_SEED: Imovel[] = [
  // ============ ETAPA (a) — Novo — 5 imóveis ============
  construir({
    corretorResponsavelId: ANA, etapa: 'a',
    enderecoRua: 'Rua Riachuelo', enderecoNumero: '1450', bairro: 'Jardim Sumaré', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', valorEstimado: 420000,
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 62,
    criadoEm: '2026-06-22T09:00:00.000Z', diasParado: 9,
  }),
  construir({
    corretorResponsavelId: OUTROS[0], etapa: 'a',
    enderecoRua: 'Rua Duque de Caxias', enderecoNumero: '780', bairro: 'Vila Seixas', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'casa_rua', valorEstimado: 690000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 190, areaTerrenoM2: 260,
    criadoEm: '2026-06-27T09:00:00.000Z', diasParado: 4,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'a',
    enderecoRua: 'Avenida Portugal', enderecoNumero: '2200', bairro: 'Alto do Ipiranga', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'sala_comercial', valorEstimado: 295000,
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 42,
    criadoEm: '2026-06-14T09:00:00.000Z', diasParado: 17,
  }),
  construir({
    corretorResponsavelId: OUTROS[1], etapa: 'a',
    enderecoRua: 'Rua José Bonifácio', enderecoNumero: '540', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'apartamento', valorEstimado: 780000,
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 98,
    criadoEm: '2026-06-19T09:00:00.000Z', diasParado: 12,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'a',
    enderecoRua: 'Rua São Sebastião', enderecoNumero: '90', bairro: 'Centro', cidade: 'São Carlos', estado: 'SP',
    tipo: 'casa_rua', valorEstimado: 410000,
    quartos: 3, suites: 0, vagas: 2, banheiros: 2, areaConstruidaM2: 150, areaTerrenoM2: 200,
    criadoEm: '2026-06-08T09:00:00.000Z', diasParado: 23,
  }),

  // ============ ETAPA (b) — Análise e Estudo — 4 imóveis ============
  construir({
    corretorResponsavelId: ANA, etapa: 'b',
    enderecoRua: 'Avenida Independência', enderecoNumero: '3120', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '5268.8997.8256.0991', valorEstimado: 640000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 95, elevador: true,
    criadoEm: '2026-06-05T09:00:00.000Z', diasParado: 26,
  }),
  construir({
    corretorResponsavelId: OUTROS[2], etapa: 'b',
    enderecoRua: 'Rua Barão do Amazonas', enderecoNumero: '610', bairro: 'Alto da Boa Vista', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'casa_condominio', cnm: '7171.8810.4139.9047', valorEstimado: 1650000,
    quartos: 4, suites: 3, vagas: 3, banheiros: 4, areaConstruidaM2: 340, areaTerrenoM2: 450,
    lazer: true, nomeCondominio: 'Alphaville Ribeirão Preto',
    criadoEm: '2026-06-11T09:00:00.000Z', diasParado: 20,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'b',
    enderecoRua: 'Avenida Wladimir Meirelles Ferreira', enderecoNumero: '1800', bairro: 'Jardim Botânico', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '4859.5945.5690.3388', valorEstimado: 1150000,
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 130, elevador: true, lazer: true,
    criadoEm: '2026-06-16T09:00:00.000Z', diasParado: 15,
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 'b',
    enderecoRua: 'Rua Treze de Maio', enderecoNumero: '900', bairro: 'Centro', cidade: 'Franca', estado: 'SP',
    tipo: 'sala_comercial', cnm: '2320.1577.7531.7715', valorEstimado: 260000,
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 48,
    criadoEm: '2026-06-02T09:00:00.000Z', diasParado: 29,
  }),

  // ============ ETAPA (c) — Produção — 4 imóveis ============
  construir({
    corretorResponsavelId: ANA, etapa: 'c',
    enderecoRua: 'Avenida Costábile Romano', enderecoNumero: '2450', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '6033.3710.5303.0720', valorAnuncio: 720000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 105, mobiliado: true,
    criadoEm: '2026-06-01T09:00:00.000Z', diasParado: 30,
  }),
  construir({
    corretorResponsavelId: OUTROS[4], etapa: 'c',
    enderecoRua: 'Rua Coronel Quirino', enderecoNumero: '1500', bairro: 'Jardim Chapadão', cidade: 'Campinas', estado: 'SP',
    tipo: 'terreno_condominio', cnm: '6314.7539.0250.9382', valorAnuncio: 480000,
    quartos: 0, suites: 0, vagas: 0, banheiros: 0, areaTerrenoM2: 420,
    criadoEm: '2026-06-20T09:00:00.000Z', diasParado: 11,
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'c',
    enderecoRua: 'Rua General Osório', enderecoNumero: '340', bairro: 'Nova Aliança', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '6104.1919.0969.9203', valorAnuncio: 495000,
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 68,
    criadoEm: '2026-06-13T09:00:00.000Z', diasParado: 18,
  }),
  construir({
    corretorResponsavelId: OUTROS[5], etapa: 'c',
    enderecoRua: 'Rua Amazonas', enderecoNumero: '210', bairro: 'Jardim Paulistano', cidade: 'São Carlos', estado: 'SP',
    tipo: 'casa_rua', cnm: '7969.0152.7641.4090', valorAnuncio: 520000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 175, areaTerrenoM2: 230,
    criadoEm: '2026-06-09T09:00:00.000Z', diasParado: 22,
  }),

  // ============ ETAPA (d) — Publicado — 10 imóveis ============
  construir({
    corretorResponsavelId: ANA, etapa: 'd',
    enderecoRua: 'Rua Riachuelo', enderecoNumero: '980', bairro: 'Jardim Sumaré', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '0060.6544.2316.4941', valorAnuncio: 480000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-jardim-sumare-ribeirao-preto/',
    quartos: 2, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 65, elevador: true, nomeCondominio: 'Edifício Villa Real',
    criadoEm: '2026-05-01T09:00:00.000Z', dataPublicacao: '2026-05-18T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'd',
    enderecoRua: 'Avenida Presidente Vargas', enderecoNumero: '3300', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '4922.4618.1251.9162', valorAnuncio: 690000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-ribeirania-ribeirao-preto/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 112, elevador: true, lazer: true, varanda: true,
    criadoEm: '2026-04-12T09:00:00.000Z', dataPublicacao: '2026-04-30T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[0], etapa: 'd',
    enderecoRua: 'Rua Barão do Amazonas', enderecoNumero: '1120', bairro: 'Jardim Canadá', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'casa_condominio', cnm: '0404.8964.2598.2467', valorAnuncio: 1890000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/casa-jardim-canada-ribeirao-preto/',
    quartos: 4, suites: 3, vagas: 4, banheiros: 5, areaConstruidaM2: 380, areaTerrenoM2: 520, lazer: true, churrasqueira: true, aceitaPet: true,
    nomeCondominio: 'Condomínio Alto do Castelo',
    criadoEm: '2026-03-20T09:00:00.000Z', dataPublicacao: '2026-04-05T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'd',
    enderecoRua: 'Rua Álvares Cabral', enderecoNumero: '460', bairro: 'Jardim Botânico', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '4019.5373.3524.9689', valorAnuncio: 1290000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/cobertura-jardim-botanico-ribeirao-preto/',
    quartos: 3, suites: 2, vagas: 3, banheiros: 4, areaPrivativaM2: 165, elevador: true, lazer: true, varanda: true,
    nomeCondominio: 'Edifício Botânico Ville',
    criadoEm: '2026-04-01T09:00:00.000Z', dataPublicacao: '2026-04-20T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[1], etapa: 'd',
    enderecoRua: 'Avenida Nove de Julho', enderecoNumero: '2600', bairro: 'City Ribeirão', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'sala_comercial', cnm: '8124.3376.7869.4316', valorAnuncio: 340000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/sala-comercial-city-ribeirao/',
    linkQuebrado: true,
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 50,
    criadoEm: '2026-04-25T09:00:00.000Z', dataPublicacao: '2026-05-10T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[2], etapa: 'd',
    enderecoRua: 'Rua Saldanha Marinho', enderecoNumero: '780', bairro: 'Centro', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'casa_rua', cnm: '0214.4092.3420.5534', valorAnuncio: 590000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/casa-centro-ribeirao-preto/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 185, areaTerrenoM2: 250,
    criadoEm: '2026-03-28T09:00:00.000Z', dataPublicacao: '2026-04-15T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'd',
    enderecoRua: 'Avenida Presidente Kennedy', enderecoNumero: '1400', bairro: 'Jardim Paulista', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'terreno_condominio', cnm: '4983.5739.6700.3857', valorAnuncio: 620000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/terreno-jardim-paulista-ribeirao-preto/',
    linkQuebrado: true,
    quartos: 0, suites: 0, vagas: 0, banheiros: 0, areaTerrenoM2: 480,
    nomeCondominio: 'Condomínio Recanto Verde',
    criadoEm: '2026-03-10T09:00:00.000Z', dataPublicacao: '2026-03-28T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 'd',
    enderecoRua: 'Rua José Bonifácio', enderecoNumero: '1900', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'apartamento', cnm: '6055.9871.4436.1153', valorAnuncio: 950000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-cambui-campinas/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 3, areaPrivativaM2: 108, elevador: true,
    criadoEm: '2026-02-18T09:00:00.000Z', dataPublicacao: '2026-03-05T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[4], etapa: 'd',
    enderecoRua: 'Rua Voluntários da Franca', enderecoNumero: '450', bairro: 'Centro', cidade: 'Franca', estado: 'SP',
    tipo: 'galpao_comercial_industrial', cnm: '4572.5196.8565.0709', valorAnuncio: 2100000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/galpao-centro-franca/',
    quartos: 0, suites: 0, vagas: 8, banheiros: 2, areaConstruidaM2: 1100, areaTerrenoM2: 1500,
    criadoEm: '2026-01-25T09:00:00.000Z', dataPublicacao: '2026-02-12T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'd',
    enderecoRua: 'Rua Álvares Cabral', enderecoNumero: '1250', bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP',
    tipo: 'apartamento', cnm: '9663.5239.1322.5013', valorAnuncio: 1350000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-pinheiros-sao-paulo/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 82, elevador: true, mobiliado: true,
    criadoEm: '2026-03-02T09:00:00.000Z', dataPublicacao: '2026-03-18T09:00:00.000Z',
  }),

  // ============ ETAPA (e) — Em negociação — 4 imóveis ============
  construir({
    corretorResponsavelId: ANA, etapa: 'e',
    enderecoRua: 'Rua Riachuelo', enderecoNumero: '710', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '1015.0302.4586.8489', valorAnuncio: 560000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-ribeirania-negociacao/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 90, elevador: true,
    criadoEm: '2026-02-01T09:00:00.000Z', dataPublicacao: '2026-02-20T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[6], etapa: 'e',
    enderecoRua: 'Rua Conceição', enderecoNumero: '190', bairro: 'Taquaral', cidade: 'Campinas', estado: 'SP',
    tipo: 'casa_rua', cnm: '6902.4131.2460.5658', valorAnuncio: 480000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/casa-taquaral-campinas/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 165, areaTerrenoM2: 220,
    criadoEm: '2026-01-20T09:00:00.000Z', dataPublicacao: '2026-02-10T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'e',
    enderecoRua: 'Avenida Independência', enderecoNumero: '2200', bairro: 'Alto da Boa Vista', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '1168.7655.7746.6729', valorAnuncio: 640000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-alto-boa-vista-negociacao/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 110, elevador: true, lazer: true,
    criadoEm: '2026-01-10T09:00:00.000Z', dataPublicacao: '2026-01-28T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'e',
    enderecoRua: 'Rua Amazonas', enderecoNumero: '330', bairro: 'Jardim Paulistano', cidade: 'São Carlos', estado: 'SP',
    tipo: 'apartamento', cnm: '7586.6301.2052.0449', valorAnuncio: 470000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-jardim-paulistano-negociacao/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 72, varanda: true,
    criadoEm: '2026-01-25T09:00:00.000Z', dataPublicacao: '2026-02-12T09:00:00.000Z',
  }),

  // ============ ETAPA (f) — Vendido — 3 imóveis ============
  construir({
    corretorResponsavelId: ANA, etapa: 'f',
    enderecoRua: 'Rua Duque de Caxias', enderecoNumero: '540', bairro: 'Centro', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '4609.6431.0088.4078', valorAnuncio: 410000, valorVenda: 398000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-centro-ribeirao-vendido/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 60,
    criadoEm: '2025-11-01T09:00:00.000Z', dataPublicacao: '2025-11-20T09:00:00.000Z', dataVenda: '2026-06-15T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[7], etapa: 'f',
    enderecoRua: 'Rua General Osório', enderecoNumero: '85', bairro: 'Jardim Recreio', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'casa_rua', cnm: '6039.6101.8047.1768', valorAnuncio: 520000, valorVenda: 505000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/casa-jardim-recreio-vendida/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 175, areaTerrenoM2: 230,
    criadoEm: '2025-10-05T09:00:00.000Z', dataPublicacao: '2025-10-25T09:00:00.000Z', dataVenda: '2026-05-30T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[5], etapa: 'f',
    enderecoRua: 'Rua Cambuí', enderecoNumero: '710', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'apartamento', cnm: '1931.5246.5240.0805', valorAnuncio: 720000, valorVenda: 690000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-cambui-vendido/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 100, elevador: true, lazer: true,
    observacoes: 'Negócio revertido — comprador desistiu após vistoria; venda mantida no histórico.',
    criadoEm: '2025-09-10T09:00:00.000Z', dataPublicacao: '2025-09-28T09:00:00.000Z', dataVenda: '2026-04-20T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA, etapa: 'f',
    enderecoRua: 'Rua Amazonas', enderecoNumero: '620', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cnm: '3312.9087.1246.5591', valorAnuncio: 560000, valorVenda: 545000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-ribeirania-vendido/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 88, elevador: true,
    criadoEm: '2025-12-01T09:00:00.000Z', dataPublicacao: '2025-12-18T09:00:00.000Z', dataVenda: '2026-06-28T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[0], etapa: 'f',
    enderecoRua: 'Avenida Nove de Julho', enderecoNumero: '1450', bairro: 'Centro', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'sala_comercial', cnm: '2205.4471.8830.9926', valorAnuncio: 310000, valorVenda: 295000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/sala-comercial-centro-vendida/',
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 45,
    criadoEm: '2025-11-15T09:00:00.000Z', dataPublicacao: '2025-12-02T09:00:00.000Z', dataVenda: '2026-06-05T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[2], etapa: 'f',
    enderecoRua: 'Rua José Bonifácio', enderecoNumero: '980', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'apartamento', cnm: '4487.1123.6650.3382', valorAnuncio: 830000, valorVenda: 810000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-cambui-campinas-vendido/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 105, elevador: true, lazer: true,
    criadoEm: '2025-10-20T09:00:00.000Z', dataPublicacao: '2025-11-08T09:00:00.000Z', dataVenda: '2026-05-12T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[3], etapa: 'f',
    enderecoRua: 'Rua Augusta', enderecoNumero: '2200', bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP',
    tipo: 'apartamento', cnm: '5541.2287.0093.4416', valorAnuncio: 1180000, valorVenda: 1120000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-pinheiros-vendido/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 78, elevador: true, mobiliado: true,
    criadoEm: '2025-09-25T09:00:00.000Z', dataPublicacao: '2025-10-14T09:00:00.000Z', dataVenda: '2026-03-22T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[8], etapa: 'f',
    enderecoRua: 'Rua Saldanha Marinho', enderecoNumero: '410', bairro: 'Centro', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'casa_rua', cnm: '6673.0284.9915.7708', valorAnuncio: 495000, valorVenda: 480000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/casa-centro-ribeirao-vendida/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 160, areaTerrenoM2: 210,
    criadoEm: '2025-08-18T09:00:00.000Z', dataPublicacao: '2025-09-05T09:00:00.000Z', dataVenda: '2026-02-10T09:00:00.000Z',
  }),
]
