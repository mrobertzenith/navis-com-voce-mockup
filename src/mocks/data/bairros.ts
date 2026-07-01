export interface Bairro {
  nome: string
  lat: number
  lng: number
}

export interface Cidade {
  nome: string
  bairros: Bairro[]
}

export interface Estado {
  sigla: string
  nome: string
  cidades: Cidade[]
}

export const BAIRROS_BASE: Estado[] = [
  {
    sigla: 'SP',
    nome: 'São Paulo',
    cidades: [
      {
        nome: 'Ribeirão Preto',
        bairros: [
          { nome: 'Jardim Sumaré', lat: -21.1782, lng: -47.8113 },
          { nome: 'Jardim Botânico', lat: -21.1477, lng: -47.8574 },
          { nome: 'Jardim Irajá', lat: -21.1699, lng: -47.8298 },
          { nome: 'Alto da Boa Vista', lat: -21.1544, lng: -47.7986 },
          { nome: 'Ribeirânia', lat: -21.1633, lng: -47.8465 },
          { nome: 'Centro', lat: -21.1775, lng: -47.8103 },
        ],
      },
      {
        nome: 'Campinas',
        bairros: [
          { nome: 'Cambuí', lat: -22.8891, lng: -47.0575 },
          { nome: 'Taquaral', lat: -22.8687, lng: -47.0603 },
          { nome: 'Jardim Chapadão', lat: -22.8547, lng: -47.0723 },
          { nome: 'Nova Campinas', lat: -22.8837, lng: -47.0489 },
          { nome: 'Botafogo', lat: -22.9089, lng: -47.0656 },
        ],
      },
      {
        nome: 'São Paulo',
        bairros: [
          { nome: 'Pinheiros', lat: -23.5664, lng: -46.6997 },
          { nome: 'Vila Mariana', lat: -23.5895, lng: -46.6349 },
          { nome: 'Moema', lat: -23.6003, lng: -46.6647 },
          { nome: 'Itaim Bibi', lat: -23.5842, lng: -46.6779 },
          { nome: 'Tatuapé', lat: -23.5403, lng: -46.5772 },
          { nome: 'Perdizes', lat: -23.5389, lng: -46.6773 },
        ],
      },
      {
        nome: 'São Carlos',
        bairros: [
          { nome: 'Jardim Botânico', lat: -22.0027, lng: -47.8836 },
          { nome: 'Centro', lat: -22.0175, lng: -47.8909 },
          { nome: 'Vila Nery', lat: -22.0102, lng: -47.9067 },
          { nome: 'Jardim Paulistano', lat: -21.9944, lng: -47.8781 },
        ],
      },
      {
        nome: 'Franca',
        bairros: [
          { nome: 'Jardim Guanabara', lat: -20.5322, lng: -47.4067 },
          { nome: 'Centro', lat: -20.5386, lng: -47.4008 },
          { nome: 'Jardim América', lat: -20.5478, lng: -47.3922 },
          { nome: 'Vila Aparecida', lat: -20.5211, lng: -47.4156 },
        ],
      },
    ],
  },
  {
    sigla: 'RJ',
    nome: 'Rio de Janeiro',
    cidades: [
      {
        nome: 'Rio de Janeiro',
        bairros: [
          { nome: 'Copacabana', lat: -22.9711, lng: -43.1822 },
          { nome: 'Ipanema', lat: -22.9838, lng: -43.2047 },
          { nome: 'Barra da Tijuca', lat: -23.0045, lng: -43.3651 },
          { nome: 'Tijuca', lat: -22.9257, lng: -43.2344 },
          { nome: 'Botafogo', lat: -22.9519, lng: -43.1823 },
        ],
      },
      {
        nome: 'Niterói',
        bairros: [
          { nome: 'Icaraí', lat: -22.9037, lng: -43.1073 },
          { nome: 'Santa Rosa', lat: -22.8973, lng: -43.1024 },
          { nome: 'Centro', lat: -22.8833, lng: -43.1036 },
        ],
      },
    ],
  },
  {
    sigla: 'MG',
    nome: 'Minas Gerais',
    cidades: [
      {
        nome: 'Belo Horizonte',
        bairros: [
          { nome: 'Savassi', lat: -19.9385, lng: -43.9364 },
          { nome: 'Lourdes', lat: -19.9327, lng: -43.9411 },
          { nome: 'Buritis', lat: -19.9631, lng: -43.9695 },
          { nome: 'Pampulha', lat: -19.8619, lng: -43.9772 },
        ],
      },
      {
        nome: 'Uberlândia',
        bairros: [
          { nome: 'Centro', lat: -18.9146, lng: -48.2754 },
          { nome: 'Santa Mônica', lat: -18.9198, lng: -48.2586 },
        ],
      },
    ],
  },
  {
    sigla: 'PR',
    nome: 'Paraná',
    cidades: [
      {
        nome: 'Curitiba',
        bairros: [
          { nome: 'Batel', lat: -25.4407, lng: -49.2453 },
          { nome: 'Água Verde', lat: -25.4553, lng: -49.2777 },
          { nome: 'Centro Cívico', lat: -25.4234, lng: -49.2668 },
        ],
      },
      {
        nome: 'Londrina',
        bairros: [
          { nome: 'Gleba Palhano', lat: -23.3286, lng: -51.1592 },
          { nome: 'Centro', lat: -23.3103, lng: -51.1628 },
        ],
      },
    ],
  },
  {
    sigla: 'RS',
    nome: 'Rio Grande do Sul',
    cidades: [
      {
        nome: 'Porto Alegre',
        bairros: [
          { nome: 'Moinhos de Vento', lat: -30.0246, lng: -51.2020 },
          { nome: 'Bela Vista', lat: -30.0177, lng: -51.1928 },
          { nome: 'Cidade Baixa', lat: -30.0410, lng: -51.2226 },
        ],
      },
      {
        nome: 'Caxias do Sul',
        bairros: [
          { nome: 'Centro', lat: -29.1678, lng: -51.1794 },
          { nome: 'Exposição', lat: -29.1531, lng: -51.1897 },
        ],
      },
    ],
  },
]

export function encontrarBairro(cidade: string, bairroNome: string): Bairro | undefined {
  for (const estado of BAIRROS_BASE) {
    const c = estado.cidades.find((c) => c.nome === cidade)
    if (c) return c.bairros.find((b) => b.nome === bairroNome)
  }
  return undefined
}
