import type { TipoImovel } from '@/domain/types'

const FOTO_BASE = `${import.meta.env.BASE_URL}mock-photos/imoveis/`

function caminhos(nomes: string[]): string[] {
  return nomes.map((n) => `${FOTO_BASE}${n}`)
}

export const FOTOS_POR_TIPO: Record<TipoImovel, string[]> = {
  apartamento: caminhos([
    'apto-01.jpg',
    'apto-02.jpg',
    'apto-03.jpg',
    'apto-04.jpg',
    'apto-05.jpg',
    'apto-06.jpg',
  ]),
  casa_rua: caminhos(['casa-rua-01.jpg', 'casa-rua-02.jpg', 'casa-rua-03.jpg', 'casa-rua-04.jpg']),
  casa_condominio: caminhos(['casa-condominio-01.jpg', 'casa-condominio-02.jpg']),
  casa_comercial: caminhos(['casa-comercial-01.jpg', 'casa-comercial-02.jpg']),
  terreno_rua: caminhos(['terreno-01.jpg', 'terreno-02.jpg']),
  terreno_condominio: caminhos(['terreno-01.jpg', 'terreno-02.jpg']),
  terreno_comercial: caminhos(['terreno-01.jpg', 'terreno-02.jpg']),
  sala_comercial: caminhos(['sala-comercial-01.jpg', 'sala-comercial-02.jpg']),
  galpao_comercial_industrial: caminhos(['galpao-01.jpg', 'galpao-02.jpg']),
}

/** Retorna N fotos do pool do tipo, variando a partir de um índice semente (determinístico). */
export function fotosParaImovel(tipo: TipoImovel, seed: number, quantidade = 1): string[] {
  const pool = FOTOS_POR_TIPO[tipo]
  const fotos: string[] = []
  for (let i = 0; i < quantidade; i++) {
    fotos.push(pool[(seed + i) % pool.length])
  }
  return fotos
}

export function fotoPadrao(tipo: TipoImovel): string {
  return FOTOS_POR_TIPO[tipo][0]
}
