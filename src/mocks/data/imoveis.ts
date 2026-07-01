import type { EtapaImovel, Imovel, TipoImovel } from '@/domain/types'
import { encontrarBairro } from '@/mocks/data/bairros'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'

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
  cib?: string
  linkAnuncioUrl?: string
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
  criadoEm: string
  dataPublicacao?: string
  dataVenda?: string
  diasParado?: number
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
    lat: coords?.lat ?? -21.17,
    lng: coords?.lng ?? -47.81,
    tipo: seed.tipo,
    cib: seed.cib,
    linkAnuncioUrl: seed.linkAnuncioUrl,
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
    ttlAtual,
    criadoEm: seed.criadoEm,
    dataPublicacao: seed.dataPublicacao,
    dataVenda: seed.dataVenda,
    atualizadoEm: seed.criadoEm,
  }
}

const ANA = CORRETOR_LOGADO_ID
const OUTROS = ['cor-2', 'cor-3', 'cor-4', 'cor-5', 'cor-6', 'cor-7', 'cor-8', 'cor-9', 'cor-10']

export const IMOVEIS_SEED: Imovel[] = [
  // --- etapa (a) — Novo ---
  construir({
    corretorResponsavelId: ANA,
    etapa: 'a',
    enderecoRua: 'Rua Amoreira', enderecoNumero: '210', bairro: 'Jardim Irajá', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', valorEstimado: 420000,
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 65,
    criadoEm: '2026-06-20T09:00:00.000Z', diasParado: 8,
  }),
  construir({
    corretorResponsavelId: OUTROS[0],
    etapa: 'a',
    enderecoRua: 'Rua das Orquídeas', enderecoNumero: '55', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'casa_condominio', valorEstimado: 890000,
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaConstruidaM2: 180, areaTerrenoM2: 250,
    lazer: true, criadoEm: '2026-06-27T09:00:00.000Z', diasParado: 1,
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'a',
    enderecoRua: 'Av. Presidente Vargas', enderecoNumero: '1400', bairro: 'Centro', cidade: 'São Carlos', estado: 'SP',
    tipo: 'sala_comercial', valorEstimado: 310000,
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 45,
    criadoEm: '2026-06-15T09:00:00.000Z', diasParado: 13,
  }),

  // --- etapa (b) — Análise e Estudo ---
  construir({
    corretorResponsavelId: ANA,
    etapa: 'b',
    enderecoRua: 'Rua Barão do Amazonas', enderecoNumero: '890', bairro: 'Alto da Boa Vista', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00891', valorEstimado: 610000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 92, elevador: true,
    criadoEm: '2026-06-10T09:00:00.000Z', diasParado: 18,
  }),
  construir({
    corretorResponsavelId: OUTROS[1],
    etapa: 'b',
    enderecoRua: 'Rua Tuiuti', enderecoNumero: '320', bairro: 'Tatuapé', cidade: 'São Paulo', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-SP-01142', valorEstimado: 540000,
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 70,
    criadoEm: '2026-06-22T09:00:00.000Z', diasParado: 6,
  }),
  construir({
    corretorResponsavelId: OUTROS[2],
    etapa: 'b',
    enderecoRua: 'Rua Voluntários da Franca', enderecoNumero: '75', bairro: 'Centro', cidade: 'Franca', estado: 'SP',
    tipo: 'casa_rua', cib: 'CIB-FR-00332', valorEstimado: 320000,
    quartos: 3, suites: 0, vagas: 2, banheiros: 2, areaConstruidaM2: 140, areaTerrenoM2: 200,
    criadoEm: '2026-05-30T09:00:00.000Z', diasParado: 26,
  }),

  // --- etapa (c) — Produção ---
  construir({
    corretorResponsavelId: ANA,
    etapa: 'c',
    enderecoRua: 'Rua Bernardino de Campos', enderecoNumero: '410', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00745', valorAnuncio: 495000,
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 68, mobiliado: true,
    criadoEm: '2026-06-05T09:00:00.000Z', diasParado: 20,
  }),
  construir({
    corretorResponsavelId: OUTROS[3],
    etapa: 'c',
    enderecoRua: 'Rua Coronel Quirino', enderecoNumero: '1250', bairro: 'Jardim Chapadão', cidade: 'Campinas', estado: 'SP',
    tipo: 'terreno_condominio', cib: 'CIB-CP-00219', valorAnuncio: 380000,
    quartos: 0, suites: 0, vagas: 0, banheiros: 0, areaTerrenoM2: 400,
    criadoEm: '2026-06-24T09:00:00.000Z', diasParado: 5,
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'c',
    enderecoRua: 'Rua Silva Jardim', enderecoNumero: '600', bairro: 'Vila Nery', cidade: 'São Carlos', estado: 'SP',
    tipo: 'casa_rua', cib: 'CIB-SC-00458', valorAnuncio: 450000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 160, areaTerrenoM2: 220,
    criadoEm: '2026-06-12T09:00:00.000Z', diasParado: 15,
  }),

  // --- etapa (d) — Publicado ---
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Rua Amoipira', enderecoNumero: '120', bairro: 'Jardim Sumaré', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00512', valorAnuncio: 480000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-jardim-sumare-rp/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 85, elevador: true, nomeCondominio: 'Edifício Villa Real',
    criadoEm: '2026-05-01T09:00:00.000Z', dataPublicacao: '2026-05-20T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Rua Treze de Maio', enderecoNumero: '980', bairro: 'Jardim Botânico', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00513', valorAnuncio: 620000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-jardim-botanico-rp/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 105, elevador: true, lazer: true, varanda: true,
    criadoEm: '2026-04-15T09:00:00.000Z', dataPublicacao: '2026-05-02T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[0],
    etapa: 'd',
    enderecoRua: 'Rua José Paulino', enderecoNumero: '340', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'casa_condominio', cib: 'CIB-CP-00120', valorAnuncio: 950000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/casa-cambui-campinas/',
    quartos: 4, suites: 2, vagas: 3, banheiros: 4, areaConstruidaM2: 220, areaTerrenoM2: 300, lazer: true, churrasqueira: true,
    criadoEm: '2026-04-10T09:00:00.000Z', dataPublicacao: '2026-04-28T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[1],
    etapa: 'd',
    enderecoRua: 'Rua Harmonia', enderecoNumero: '210', bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-SP-00981', valorAnuncio: 1250000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-pinheiros-sp/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 78, elevador: true, mobiliado: true,
    criadoEm: '2026-03-20T09:00:00.000Z', dataPublicacao: '2026-04-05T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Rua Episcopal', enderecoNumero: '450', bairro: 'Centro', cidade: 'São Carlos', estado: 'SP',
    tipo: 'sala_comercial', cib: 'CIB-SC-00299', valorAnuncio: 280000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/sala-comercial-centro-sao-carlos/',
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 40,
    criadoEm: '2026-05-10T09:00:00.000Z', dataPublicacao: '2026-05-25T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[2],
    etapa: 'd',
    enderecoRua: 'Rua Marechal Deodoro', enderecoNumero: '780', bairro: 'Jardim América', cidade: 'Franca', estado: 'SP',
    tipo: 'casa_rua', cib: 'CIB-FR-00187', valorAnuncio: 395000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/casa-jardim-america-franca/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 150, areaTerrenoM2: 200,
    criadoEm: '2026-04-22T09:00:00.000Z', dataPublicacao: '2026-05-08T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[3],
    etapa: 'd',
    enderecoRua: 'Rua Barão de Jaguara', enderecoNumero: '600', bairro: 'Nova Campinas', cidade: 'Campinas', estado: 'SP',
    tipo: 'terreno_rua', cib: 'CIB-CP-00301', valorAnuncio: 340000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/terreno-nova-campinas/',
    quartos: 0, suites: 0, vagas: 0, banheiros: 0, areaTerrenoM2: 360,
    criadoEm: '2026-03-28T09:00:00.000Z', dataPublicacao: '2026-04-14T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Av. Nove de Julho', enderecoNumero: '1500', bairro: 'Jardim Irajá', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'galpao_comercial_industrial', cib: 'CIB-RP-00601', valorAnuncio: 1800000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/galpao-jardim-iraja-rp/',
    quartos: 0, suites: 0, vagas: 6, banheiros: 2, areaConstruidaM2: 900, areaTerrenoM2: 1200,
    criadoEm: '2026-02-18T09:00:00.000Z', dataPublicacao: '2026-03-10T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[4],
    etapa: 'd',
    enderecoRua: 'Rua Marechal Floriano', enderecoNumero: '88', bairro: 'Jardim Guanabara', cidade: 'Franca', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-FR-00203', valorAnuncio: 310000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-jardim-guanabara-franca/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 1, areaPrivativaM2: 58,
    criadoEm: '2026-04-02T09:00:00.000Z', dataPublicacao: '2026-04-20T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[5],
    etapa: 'd',
    enderecoRua: 'Rua Álvares Cabral', enderecoNumero: '230', bairro: 'Vila Mariana', cidade: 'São Paulo', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-SP-01008', valorAnuncio: 890000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-vila-mariana-sp/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 95, elevador: true, lazer: true,
    criadoEm: '2026-03-15T09:00:00.000Z', dataPublicacao: '2026-04-01T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Rua Duque de Caxias', enderecoNumero: '340', bairro: 'Jardim Paulistano', cidade: 'São Carlos', estado: 'SP',
    tipo: 'casa_condominio', cib: 'CIB-SC-00366', valorAnuncio: 720000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/casa-jardim-paulistano-sao-carlos/',
    quartos: 4, suites: 2, vagas: 2, banheiros: 3, areaConstruidaM2: 190, areaTerrenoM2: 260, lazer: true, churrasqueira: true, aceitaPet: true,
    criadoEm: '2026-02-25T09:00:00.000Z', dataPublicacao: '2026-03-15T09:00:00.000Z',
  }),

  // --- etapa (e) — Em negociação ---
  construir({
    corretorResponsavelId: ANA,
    etapa: 'e',
    enderecoRua: 'Rua Prudente de Moraes', enderecoNumero: '710', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00420', valorAnuncio: 560000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-ribeirania-rp/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 90, elevador: true,
    criadoEm: '2026-02-01T09:00:00.000Z', dataPublicacao: '2026-02-20T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[6],
    etapa: 'e',
    enderecoRua: 'Rua Conceição', enderecoNumero: '190', bairro: 'Botafogo', cidade: 'Campinas', estado: 'SP',
    tipo: 'casa_rua', cib: 'CIB-CP-00087', valorAnuncio: 480000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/casa-botafogo-campinas/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 165, areaTerrenoM2: 220,
    criadoEm: '2026-01-20T09:00:00.000Z', dataPublicacao: '2026-02-10T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'e',
    enderecoRua: 'Av. Independência', enderecoNumero: '2200', bairro: 'Alto da Boa Vista', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00355', valorAnuncio: 640000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-alto-boa-vista-rp/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 110, elevador: true, lazer: true,
    criadoEm: '2026-01-10T09:00:00.000Z', dataPublicacao: '2026-01-28T09:00:00.000Z',
  }),

  // --- etapa (f) — Vendido ---
  construir({
    corretorResponsavelId: ANA,
    etapa: 'f',
    enderecoRua: 'Rua Saldanha Marinho', enderecoNumero: '540', bairro: 'Centro', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00201', valorAnuncio: 410000, valorVenda: 398000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-centro-rp/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 62,
    criadoEm: '2025-11-01T09:00:00.000Z', dataPublicacao: '2025-11-20T09:00:00.000Z', dataVenda: '2026-06-15T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[7],
    etapa: 'f',
    enderecoRua: 'Rua General Osório', enderecoNumero: '85', bairro: 'Vila Aparecida', cidade: 'Franca', estado: 'SP',
    tipo: 'casa_rua', cib: 'CIB-FR-00099', valorAnuncio: 350000, valorVenda: 335000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/casa-vila-aparecida-franca/',
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 145, areaTerrenoM2: 200,
    criadoEm: '2025-10-05T09:00:00.000Z', dataPublicacao: '2025-10-25T09:00:00.000Z', dataVenda: '2026-05-30T09:00:00.000Z',
  }),

  // --- lote adicional para ampliar cobertura de tipos e concentração em (d) ---
  construir({
    corretorResponsavelId: OUTROS[8],
    etapa: 'd',
    enderecoRua: 'Av. Presidente Vargas', enderecoNumero: '2100', bairro: 'Centro', cidade: 'Franca', estado: 'SP',
    tipo: 'casa_comercial', cib: 'CIB-FR-00410', valorAnuncio: 520000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/casa-comercial-centro-franca/',
    quartos: 0, suites: 0, vagas: 3, banheiros: 2, areaConstruidaM2: 180, areaTerrenoM2: 240,
    criadoEm: '2026-03-01T09:00:00.000Z', dataPublicacao: '2026-03-18T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Av. Costábile Romano', enderecoNumero: '1900', bairro: 'Ribeirânia', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'terreno_comercial', cib: 'CIB-RP-00688', valorAnuncio: 950000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/terreno-comercial-ribeirania-rp/',
    quartos: 0, suites: 0, vagas: 0, banheiros: 0, areaTerrenoM2: 800,
    criadoEm: '2026-02-10T09:00:00.000Z', dataPublicacao: '2026-03-01T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[0],
    etapa: 'd',
    enderecoRua: 'Rua Bento Quirino', enderecoNumero: '450', bairro: 'Taquaral', cidade: 'Campinas', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-CP-00455', valorAnuncio: 410000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-taquaral-campinas/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 1, areaPrivativaM2: 60,
    criadoEm: '2026-04-08T09:00:00.000Z', dataPublicacao: '2026-04-25T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[1],
    etapa: 'd',
    enderecoRua: 'Rua dos Pinheiros', enderecoNumero: '900', bairro: 'Perdizes', cidade: 'São Paulo', estado: 'SP',
    tipo: 'sala_comercial', cib: 'CIB-SP-01203', valorAnuncio: 460000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/sala-comercial-perdizes-sp/',
    quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 50,
    criadoEm: '2026-03-25T09:00:00.000Z', dataPublicacao: '2026-04-10T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'e',
    enderecoRua: 'Rua Amazonas', enderecoNumero: '330', bairro: 'Jardim Botânico', cidade: 'São Carlos', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-SC-00512', valorAnuncio: 470000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-jardim-botanico-sao-carlos/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 72, varanda: true,
    criadoEm: '2026-01-25T09:00:00.000Z', dataPublicacao: '2026-02-12T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[2],
    etapa: 'a',
    enderecoRua: 'Rua Voluntários da Pátria', enderecoNumero: '1100', bairro: 'Icaraí', cidade: 'Niterói', estado: 'RJ',
    tipo: 'apartamento', valorEstimado: 780000,
    quartos: 3, suites: 1, vagas: 1, banheiros: 2, areaPrivativaM2: 88,
    criadoEm: '2026-06-18T09:00:00.000Z', diasParado: 10,
  }),
  construir({
    corretorResponsavelId: OUTROS[3],
    etapa: 'b',
    enderecoRua: 'Rua Pernambuco', enderecoNumero: '620', bairro: 'Savassi', cidade: 'Belo Horizonte', estado: 'MG',
    tipo: 'apartamento', cib: 'CIB-BH-00218', valorEstimado: 690000,
    quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaPrivativaM2: 95, elevador: true,
    criadoEm: '2026-06-08T09:00:00.000Z', diasParado: 19,
  }),
  construir({
    corretorResponsavelId: ANA,
    etapa: 'd',
    enderecoRua: 'Rua Doze de Outubro', enderecoNumero: '330', bairro: 'Jardim Irajá', cidade: 'Ribeirão Preto', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-RP-00522', valorAnuncio: 385000,
    linkAnuncioUrl: 'https://www.zapimoveis.com.br/imovel/apartamento-jardim-iraja-rp-2/',
    quartos: 2, suites: 1, vagas: 1, banheiros: 1, areaPrivativaM2: 55,
    criadoEm: '2026-04-28T09:00:00.000Z', dataPublicacao: '2026-05-15T09:00:00.000Z',
  }),
  construir({
    corretorResponsavelId: OUTROS[4],
    etapa: 'c',
    enderecoRua: 'Rua Marechal Deodoro', enderecoNumero: '210', bairro: 'Jardim Guanabara', cidade: 'Franca', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-FR-00266', valorAnuncio: 275000,
    quartos: 2, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 52,
    criadoEm: '2026-06-01T09:00:00.000Z', diasParado: 16,
  }),
  construir({
    corretorResponsavelId: OUTROS[5],
    etapa: 'f',
    enderecoRua: 'Rua Cambuí', enderecoNumero: '710', bairro: 'Cambuí', cidade: 'Campinas', estado: 'SP',
    tipo: 'apartamento', cib: 'CIB-CP-00068', valorAnuncio: 720000, valorVenda: 705000,
    linkAnuncioUrl: 'https://www.vivareal.com.br/imovel/apartamento-cambui-campinas/',
    quartos: 3, suites: 2, vagas: 2, banheiros: 3, areaPrivativaM2: 100, elevador: true, lazer: true,
    criadoEm: '2025-09-10T09:00:00.000Z', dataPublicacao: '2025-09-28T09:00:00.000Z', dataVenda: '2026-04-20T09:00:00.000Z',
  }),
]
