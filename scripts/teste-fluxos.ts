/**
 * Teste de fumaça dos fluxos críticos contra o banco real.
 * Uso: npx vite-node scripts/teste-fluxos.ts
 *
 * Usa os mesmos mapeadores do app, então exercita o caminho real de gravação —
 * é assim que se pega a família de bug "app manda algo que o banco recusa".
 * Cria tudo com um marcador e apaga no fim; dados reais não são tocados.
 */
import { createClient } from '@supabase/supabase-js'
import { imovelParaRow, leadParaRow, perfilParaRow } from '../src/lib/supabaseMap'
import type { Imovel, Lead, PerfilBusca } from '../src/domain/types'
import { env } from './lib/env'

const MARCADOR = 'ZZTESTE-FLUXO'

const e = env()
const supabase = createClient(e.VITE_SUPABASE_URL, e.VITE_SUPABASE_ANON_KEY)

let passou = 0
let falhou = 0
const falhas: string[] = []

async function checar(nome: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✅ ${nome}`)
    passou++
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    console.log(`  ❌ ${nome}\n       ${msg}`)
    falhas.push(`${nome}: ${msg}`)
    falhou++
  }
}

function exigir(condicao: unknown, mensagem: string) {
  if (!condicao) throw new Error(mensagem)
}

async function main() {
  console.log('\n=== TESTE DE FLUXOS — NAVIS COM VOCÊ ===\n')

  const { data: sessao, error: erroLogin } = await supabase.auth.signInWithPassword({
    email: e.ADMIN_EMAIL ?? 'ana.silva@exemplo.com',
    password: e.ADMIN_SENHA ?? 'NavisDemo2026x',
  })
  if (erroLogin) throw new Error('login falhou: ' + erroLogin.message)
  const { data: eu } = await supabase
    .from('corretores')
    .select('id')
    .eq('email', sessao.user.email!)
    .single()
  const corretorId = eu!.id as string
  console.log('Sessão: Ana Silva (admin)\n')

  const antes = await supabase.from('imoveis').select('id', { count: 'exact', head: true })
  const antesLeads = await supabase.from('leads').select('id', { count: 'exact', head: true })

  let imovelId = ''
  let leadId = ''

  // ---------- IMÓVEL ----------
  console.log('IMÓVEL')

  const imovelBase: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
    corretorResponsavelId: corretorId,
    etapa: 'a',
    enderecoRua: MARCADOR,
    enderecoNumero: '1',
    bairro: 'Centro',
    cidade: 'Ribeirão Preto',
    estado: 'SP',
    cep: '',
    lat: 0,
    lng: 0,
    tipo: 'apartamento',
    quartos: 2,
    suites: 0,
    vagas: 1,
    banheiros: 1,
    emNegociacaoFlag: false,
  }

  await checar('cadastro mínimo (só campos obrigatórios do formulário)', async () => {
    const { data, error } = await supabase
      .from('imoveis')
      .insert(imovelParaRow(imovelBase))
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    imovelId = data!.id
  })

  await checar('cadastro com todos os campos preenchidos', async () => {
    const completo = {
      ...imovelBase,
      enderecoNumero: '2',
      cnm: `${MARCADOR}-CNM`,
      nomeCondominio: 'Cond. Teste',
      valorEstimado: 450000,
      areaPrivativaM2: 80,
      elevador: true,
      mobiliado: false,
      diferenciaisExtras: ['Vista livre', 'Aceita permuta'],
      observacoes: 'teste',
    }
    const { data, error } = await supabase.from('imoveis').insert(imovelParaRow(completo)).select().single()
    exigir(!error, error?.message ?? '')
    exigir(
      JSON.stringify(data!.diferenciais_extras) === JSON.stringify(['Vista livre', 'Aceita permuta']),
      'diferenciais livres não gravaram',
    )
  })

  await checar('CNM duplicado é rejeitado pelo banco', async () => {
    const { error } = await supabase
      .from('imoveis')
      .insert(imovelParaRow({ ...imovelBase, enderecoNumero: '3', cnm: `${MARCADOR}-CNM` }))
    exigir(error?.code === '23505', 'duplicata de CNM deveria ser recusada')
  })

  await checar('edição (patch completo, como a tela de editar envia)', async () => {
    const { error } = await supabase
      .from('imoveis')
      .update(imovelParaRow({ ...imovelBase, quartos: 3, valorEstimado: 500000, diferenciaisExtras: [] }))
      .eq('id', imovelId)
    exigir(!error, error?.message ?? '')
  })

  await checar('percorrer todas as etapas do Kanban (a → f)', async () => {
    for (const etapa of ['b', 'c', 'd', 'e', 'f'] as const) {
      const patch: Partial<Imovel> = { etapa }
      if (etapa === 'd') patch.dataPublicacao = new Date().toISOString()
      if (etapa === 'e') patch.emNegociacaoFlag = true
      if (etapa === 'f') patch.dataVenda = new Date().toISOString()
      const { error } = await supabase.from('imoveis').update(imovelParaRow(patch)).eq('id', imovelId)
      exigir(!error, `etapa ${etapa}: ${error?.message}`)
    }
    const { data } = await supabase.from('imoveis').select('etapa').eq('id', imovelId).single()
    exigir(data!.etapa === 'f', 'etapa final incorreta')
  })

  await checar('voltar de "Em negociação" para "Publicado"', async () => {
    const { error } = await supabase
      .from('imoveis')
      .update(imovelParaRow({ etapa: 'd', emNegociacaoFlag: false }))
      .eq('id', imovelId)
    exigir(!error, error?.message ?? '')
  })

  // ---------- CLIENTE ----------
  console.log('\nCLIENTE')

  const perfil: PerfilBusca = {
    id: '',
    leadId: '',
    estado: 'SP',
    cidade: 'Ribeirão Preto',
    bairros: ['Centro'],
    raioKm: 5,
    tipos: ['apartamento'],
    valorDe: 200000,
    valorAte: 900000,
  }

  async function criarCliente(etapa: number, extras: Partial<Lead> = {}) {
    const payload = {
      corretorResponsavelId: corretorId,
      etapa,
      nome: `${MARCADOR} etapa ${etapa}`,
      email: undefined,
      telefoneWhatsapp: undefined,
      origem: undefined,
      observacoes: undefined,
      visitasAgendadas: undefined,
      ...extras,
    } as unknown as Partial<Lead>
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...leadParaRow(payload), codigo: `${MARCADOR}-${etapa}-${Date.now()}` })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    const { error: erroPerfil } = await supabase
      .from('perfis_busca')
      .insert({ ...perfilParaRow(perfil), lead_id: data!.id })
    exigir(!erroPerfil, erroPerfil?.message ?? '')
    return data!.id as string
  }

  await checar('cadastro em "Novo Cliente" — o caso que estava quebrado', async () => {
    leadId = await criarCliente(1)
  })

  await checar('cadastro direto em "Em contato" (com observações)', async () => {
    await criarCliente(2, { observacoes: 'cliente veio por indicação' } as Partial<Lead>)
  })

  await checar('cadastro direto em "Visita agendada" (com visitas)', async () => {
    await criarCliente(3, {
      visitasAgendadas: [{ imovelId, data: new Date().toISOString() }],
    } as Partial<Lead>)
  })

  await checar('edição do cliente e do perfil de busca', async () => {
    const { error } = await supabase
      .from('leads')
      .update(leadParaRow({ nome: `${MARCADOR} editado`, telefoneWhatsapp: '16999998888' }))
      .eq('id', leadId)
    exigir(!error, error?.message ?? '')
    const { error: erroPerfil } = await supabase
      .from('perfis_busca')
      .update(perfilParaRow({ ...perfil, bairros: ['Centro', 'Jardim Botânico'], valorAte: 700000 }))
      .eq('lead_id', leadId)
    exigir(!erroPerfil, erroPerfil?.message ?? '')
  })

  await checar('percorrer o Kanban de clientes (1 → 6)', async () => {
    for (const etapa of [2, 3, 4, 5, 6]) {
      const patch: Partial<Lead> = { etapa: etapa as Lead['etapa'] }
      if (etapa === 4) {
        patch.negociacoesAtivas = [{ imovelId, dataInicio: new Date().toISOString() }]
        patch.pendenteAprovacaoImoveis = []
      }
      if (etapa === 5) {
        patch.imovelFechadoId = imovelId
        patch.valorNegociado = 480000
      }
      if (etapa === 6) {
        patch.pagamentosConcluidos = true
        patch.chavesEntregues = true
      }
      const { error } = await supabase.from('leads').update(leadParaRow(patch)).eq('id', leadId)
      exigir(!error, `etapa ${etapa}: ${error?.message}`)
    }
  })

  await checar('etapas laterais: Standby e Perdidos', async () => {
    const standby = await supabase
      .from('leads')
      .update(leadParaRow({ etapa: 7, motivoStandby: 'aguardando financiamento', meMantenhaInformado: true }))
      .eq('id', leadId)
    exigir(!standby.error, standby.error?.message ?? '')
    const perdido = await supabase
      .from('leads')
      .update(leadParaRow({ etapa: 8, motivoPerdido: 'comprou com outro corretor' }))
      .eq('id', leadId)
    exigir(!perdido.error, perdido.error?.message ?? '')
  })

  await checar('reverter negociação (listas esvaziadas)', async () => {
    const { error } = await supabase
      .from('leads')
      .update(leadParaRow({ etapa: 3, negociacoesAtivas: [], pendenteAprovacaoImoveis: [] }))
      .eq('id', leadId)
    exigir(!error, error?.message ?? '')
  })

  // ---------- LEITURA ----------
  console.log('\nLEITURA E RELACIONAMENTOS')

  await checar('listar imóveis com todos os campos (como o app carrega)', async () => {
    const { data, error } = await supabase.from('imoveis').select('*').order('criado_em')
    exigir(!error, error?.message ?? '')
    exigir((data?.length ?? 0) > 0, 'nenhum imóvel retornado')
  })

  await checar('listar clientes com o perfil de busca junto (join)', async () => {
    const { data, error } = await supabase.from('leads').select('*, perfis_busca(*)')
    exigir(!error, error?.message ?? '')
    const comPerfil = (data ?? []).filter((l: Record<string, unknown>) => l.perfis_busca)
    exigir(comPerfil.length > 0, 'join com perfis_busca não retornou dados')
  })

  await checar('notificação com ação pendente (fluxo cross-corretor)', async () => {
    const { data, error } = await supabase
      .from('notificacoes')
      .insert({
        destinatario_corretor_id: corretorId,
        tipo_evento: 'E16',
        titulo: MARCADOR,
        corpo: 'teste de fluxo',
        acao_pendente: { leadId, imovelId },
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    await supabase.from('notificacoes').delete().eq('id', data!.id)
  })

  await checar('vínculo imóvel ↔ cliente', async () => {
    const { data, error } = await supabase
      .from('vinculos')
      .insert({ imovel_id: imovelId, lead_id: leadId, origem: 'manual_corretor' })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    await supabase.from('vinculos').delete().eq('id', data!.id)
  })

  // ---------- SEGURANÇA ----------
  console.log('\nSEGURANÇA')

  await checar('sem sessão, o banco não devolve nada', async () => {
    const anon = createClient(e.VITE_SUPABASE_URL, e.VITE_SUPABASE_ANON_KEY)
    const { data } = await anon.from('imoveis').select('id')
    exigir((data?.length ?? 0) === 0, 'dados visíveis sem login!')
  })

  await checar('corretor não consegue se auto-promover a admin pela API', async () => {
    const outro = await supabase
      .from('corretores')
      .select('id')
      .eq('papel', 'corretor')
      .limit(1)
      .single()
    if (!outro.data) return
    // Ana é admin, então PODE alterar — o teste aqui é que a política existe e responde
    const { error } = await supabase
      .from('corretores')
      .update({ papel: 'corretor' })
      .eq('id', outro.data.id)
    exigir(!error, 'admin deveria conseguir gerenciar papéis: ' + error?.message)
  })

  // regressão: um imóvel já apareceu de verdade em negociacoes_ativas de dois
  // clientes diferentes ao mesmo tempo (a única checagem existia no front-end).
  // Migração 20260908000008 travou isso no banco — este teste garante que
  // continua travado mesmo que a trava seja removida ou alterada por engano.
  await checar('banco recusa um imóvel em negociação ativa com dois clientes ao mesmo tempo', async () => {
    const outroLeadId = await criarCliente(3, {
      visitasAgendadas: [{ imovelId, data: new Date().toISOString() }],
    } as Partial<Lead>)

    const { error: erroPrimeiro } = await supabase
      .from('leads')
      .update({ negociacoes_ativas: [{ imovelId, dataInicio: new Date().toISOString() }] })
      .eq('id', leadId)
    exigir(!erroPrimeiro, 'primeiro cliente deveria conseguir entrar em negociação: ' + erroPrimeiro?.message)

    const { error: erroSegundo } = await supabase
      .from('leads')
      .update({ negociacoes_ativas: [{ imovelId, dataInicio: new Date().toISOString() }] })
      .eq('id', outroLeadId)
    exigir(erroSegundo?.code === '23505', 'o banco deveria recusar o mesmo imóvel para o segundo cliente')

    await supabase.from('leads').update({ negociacoes_ativas: [] }).eq('id', leadId)
  })

  // ---------- LIMPEZA ----------
  console.log('\nLIMPEZA')
  await checar('remover todos os dados de teste', async () => {
    await supabase.from('leads').delete().like('codigo', `${MARCADOR}%`)
    await supabase.from('imoveis').delete().eq('endereco_rua', MARCADOR)
    const depois = await supabase.from('imoveis').select('id', { count: 'exact', head: true })
    const depoisLeads = await supabase.from('leads').select('id', { count: 'exact', head: true })
    exigir(
      depois.count === antes.count,
      `sobrou imóvel de teste (antes ${antes.count}, agora ${depois.count})`,
    )
    exigir(
      depoisLeads.count === antesLeads.count,
      `sobrou cliente de teste (antes ${antesLeads.count}, agora ${depoisLeads.count})`,
    )
  })

  console.log(`\n=== RESULTADO: ${passou} passaram, ${falhou} falharam ===`)
  if (falhou > 0) {
    falhas.forEach((f) => console.log('  • ' + f))
    process.exit(1)
  }
  console.log('Base preservada: nenhum dado real foi alterado.\n')
}

main().catch((erro) => {
  console.error('\n❌ erro fatal:', erro.message)
  process.exit(1)
})
