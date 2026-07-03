import type { Imovel, ImovelPerdido } from '@/domain/types'
import { encontrarBairro } from '@/mocks/data/bairros'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { fotosParaImovel } from '@/mocks/data/fotosImoveis'

function snapshot(
  overrides: Partial<Imovel> & Pick<Imovel, 'id' | 'tipo' | 'bairro' | 'cidade' | 'estado'>,
): Imovel {
  const coords = encontrarBairro(overrides.cidade, overrides.bairro)
  return {
    corretorResponsavelId: CORRETOR_LOGADO_ID,
    etapa: 'a',
    enderecoRua: 'Rua sem nome',
    enderecoNumero: '0',
    cep: '00000-000',
    lat: coords?.lat ?? -21.1775,
    lng: coords?.lng ?? -47.8103,
    quartos: 0,
    suites: 0,
    vagas: 0,
    banheiros: 0,
    emNegociacaoFlag: false,
    criadoEm: '2026-01-01T00:00:00.000Z',
    atualizadoEm: '2026-01-01T00:00:00.000Z',
    fotos: fotosParaImovel(overrides.tipo, 1, 1),
    ...overrides,
  }
}

export const IMOVEIS_PERDIDOS_SEED: ImovelPerdido[] = [
  {
    id: 'perdido-001',
    corretorId: CORRETOR_LOGADO_ID,
    motivo: 'ttl_expirado_30d',
    dataArquivamento: '2026-06-10T09:00:00.000Z',
    recuperavel: true,
    imovelSnapshot: snapshot({
      id: 'im-perdido-001',
      etapa: 'a',
      enderecoRua: 'Rua Marechal Deodoro', enderecoNumero: '210',
      bairro: 'Bosque das Juritis', cidade: 'Ribeirão Preto', estado: 'SP',
      tipo: 'apartamento', valorEstimado: 450000,
      quartos: 2, suites: 1, vagas: 1, banheiros: 1, areaPrivativaM2: 58,
      criadoEm: '2026-05-11T09:00:00.000Z',
    }),
  },
  {
    id: 'perdido-002',
    corretorId: CORRETOR_LOGADO_ID,
    motivo: 'ttl_expirado_30d',
    dataArquivamento: '2026-06-18T09:00:00.000Z',
    recuperavel: true,
    imovelSnapshot: snapshot({
      id: 'im-perdido-002',
      etapa: 'b',
      enderecoRua: 'Rua Prudente de Moraes', enderecoNumero: '88',
      bairro: 'Vila Seixas', cidade: 'Ribeirão Preto', estado: 'SP',
      tipo: 'sala_comercial', valorEstimado: 270000,
      quartos: 0, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 38,
      cnm: '1102.4488.7731.0091',
      criadoEm: '2026-05-19T09:00:00.000Z',
    }),
  },
  {
    id: 'perdido-003',
    corretorId: CORRETOR_LOGADO_ID,
    motivo: 'descarte_manual',
    dataArquivamento: '2026-06-22T09:00:00.000Z',
    recuperavel: true,
    imovelSnapshot: snapshot({
      id: 'im-perdido-003',
      etapa: 'c',
      enderecoRua: 'Avenida Adhemar de Barros', enderecoNumero: '1770',
      bairro: 'Jardim Recreio', cidade: 'Ribeirão Preto', estado: 'SP',
      tipo: 'casa_rua', valorAnuncio: 610000,
      quartos: 3, suites: 1, vagas: 2, banheiros: 2, areaConstruidaM2: 170, areaTerrenoM2: 220,
      cnm: '2287.5519.4402.6633',
      observacoes: 'Proprietário desistiu de vender.',
      criadoEm: '2026-05-02T09:00:00.000Z',
    }),
  },
  {
    id: 'perdido-004',
    corretorId: CORRETOR_LOGADO_ID,
    motivo: 'descarte_manual',
    dataArquivamento: '2026-06-25T09:00:00.000Z',
    recuperavel: true,
    imovelSnapshot: snapshot({
      id: 'im-perdido-004',
      etapa: 'a',
      enderecoRua: 'Rua Campos Sales', enderecoNumero: '330',
      bairro: 'Nova Aliança', cidade: 'Ribeirão Preto', estado: 'SP',
      tipo: 'terreno_rua', valorEstimado: 340000,
      quartos: 0, suites: 0, vagas: 0, banheiros: 0, areaTerrenoM2: 300,
      observacoes: 'Documentação com pendência jurídica não resolvida.',
      criadoEm: '2026-05-28T09:00:00.000Z',
    }),
  },
]
