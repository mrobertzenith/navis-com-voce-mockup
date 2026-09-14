/**
 * Teste de fluxos com DOIS corretores logados ao mesmo tempo — a única forma
 * real de verificar comportamento cross-corretor (notificações, vínculos,
 * visibilidade, permissões). Até esta suíte existir, nenhum teste (manual ou
 * automatizado) jamais rodou com duas sessões reais simultâneas — foi assim
 * que o sistema de notificações inteiro ficou local-only sem que ninguém
 * percebesse. Ver ESTRATEGIA_QA.md §1.3 e §2, camada 5.
 *
 * Uso: npx vite-node scripts/teste-fluxos-cross-corretor.ts
 *
 * Corretor A: ana.silva@exemplo.com (admin, já usado em teste-fluxos.ts).
 * Corretor B: fixture "zzteste-fluxo-b@navisteste.local" — conta real, criada
 * uma única vez via a função "equipe" (criar_direto) e reaproveitada entre
 * execuções (a Edge Function só permite excluir convite nunca usado, e essa
 * conta já fez login — por isso não é recriada/apagada a cada rodada; ver
 * comentário em .env.local). Não é dado de corretor real da equipe.
 */
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { imovelParaRow, leadParaRow } from '../src/lib/supabaseMap'
import type { Imovel } from '../src/domain/types'
import { env } from './lib/env'

const MARCADOR = 'ZZTESTE-CROSS'

const e = env()

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

async function login(email: string, password: string): Promise<{ client: SupabaseClient; corretorId: string }> {
  const client = createClient(e.VITE_SUPABASE_URL, e.VITE_SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`login de ${email} falhou: ${error.message}`)
  const { data } = await client.from('corretores').select('id').eq('email', email).single()
  return { client, corretorId: data!.id as string }
}

async function main() {
  console.log('\n=== TESTE DE FLUXOS CROSS-CORRETOR — NAVIS COM VOCÊ ===\n')

  if (!e.TESTE_FLUXO_CORRETOR_B_EMAIL || !e.TESTE_FLUXO_CORRETOR_B_SENHA) {
    throw new Error(
      'Faltam TESTE_FLUXO_CORRETOR_B_EMAIL/SENHA no .env.local — ver comentário em ESTRATEGIA_QA.md sobre ' +
        'como criar o fixture do corretor B via a função "equipe" (acao: criar_direto).',
    )
  }

  const a = await login(e.ADMIN_EMAIL ?? 'ana.silva@exemplo.com', e.ADMIN_SENHA ?? 'NavisDemo2026x')
  const b = await login(e.TESTE_FLUXO_CORRETOR_B_EMAIL, e.TESTE_FLUXO_CORRETOR_B_SENHA)
  console.log(`Corretor A (admin): ${a.corretorId}`)
  console.log(`Corretor B (comum): ${b.corretorId}\n`)

  let imovelDeAId = ''
  const notificacoesTeste: string[] = []
  const vinculosTeste: string[] = []

  // ---------- VISIBILIDADE ----------
  console.log('VISIBILIDADE (RLS é por equipe — a fronteira real é o filtro do app)')

  await checar('A cadastra um imóvel', async () => {
    const imovel: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      corretorResponsavelId: a.corretorId,
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
    const { data, error } = await a.client.from('imoveis').insert(imovelParaRow(imovel)).select().single()
    exigir(!error, error?.message ?? '')
    imovelDeAId = data!.id
  })

  await checar('B consegue ler o imóvel de A direto no banco (RLS libera pra equipe toda — é o modelo documentado)', async () => {
    const { data, error } = await b.client.from('imoveis').select('id').eq('id', imovelDeAId).maybeSingle()
    exigir(!error, error?.message ?? '')
    exigir(data != null, 'B deveria conseguir ler o imóvel de A (RLS por equipe, não por dono)')
  })

  await checar('o filtro "meus imóveis" do app (client-side) exclui o imóvel de A da lista de B', async () => {
    const { data, error } = await b.client.from('imoveis').select('id, corretor_responsavel_id')
    exigir(!error, error?.message ?? '')
    // mesma lógica usada nas telas "Meus Imóveis": i.corretorResponsavelId === CORRETOR_LOGADO_ID
    const meusDeB = (data ?? []).filter((i) => i.corretor_responsavel_id === b.corretorId)
    exigir(
      !meusDeB.some((i) => i.id === imovelDeAId),
      'o imóvel de A vazou para dentro do filtro "meus imóveis" de B',
    )
  })

  // ---------- NOTIFICAÇÕES CROSS-CORRETOR ----------
  console.log('\nNOTIFICAÇÕES (100% local até esta sessão — agora precisa realmente atravessar contas)')

  await checar('A cria uma notificação real para B (mesmo payload que useCriarNotificacao manda)', async () => {
    // gera o id no cliente: depois da RLS de notificações restringir SELECT
    // só ao destinatário (migração 9), A não consegue mais reler de volta a
    // notificação que ela mesma criou pra B — o próprio Postgres recusa um
    // INSERT ... RETURNING quando a linha resultante não passa na política de
    // SELECT de quem inseriu. É o comportamento certo (o app real nunca usa
    // .select() nesse insert, só este script usava, pra saber o id a apagar).
    const id = randomUUID()
    const { error } = await a.client.from('notificacoes').insert({
      id,
      destinatario_corretor_id: b.corretorId,
      tipo_evento: 'E16',
      titulo: MARCADOR,
      corpo: 'teste cross-corretor',
      acao_pendente: null,
    })
    exigir(!error, error?.message ?? '')
    notificacoesTeste.push(id)
  })

  await checar('B enxerga a notificação usando a MESMA query do app (fetchNotificacoes)', async () => {
    const { data, error } = await b.client
      .from('notificacoes')
      .select('*')
      .eq('destinatario_corretor_id', b.corretorId)
      .order('criada_em', { ascending: false })
    exigir(!error, error?.message ?? '')
    exigir(
      (data ?? []).some((n) => n.titulo === MARCADOR),
      'B deveria ver a notificação endereçada a ele usando a query real do app',
    )
  })

  await checar('A NÃO vê essa notificação na própria caixa (a query do app não vaza inbox de terceiro)', async () => {
    const { data, error } = await a.client
      .from('notificacoes')
      .select('*')
      .eq('destinatario_corretor_id', a.corretorId)
      .order('criada_em', { ascending: false })
    exigir(!error, error?.message ?? '')
    exigir(
      !(data ?? []).some((n) => n.titulo === MARCADOR),
      'a notificação endereçada a B apareceu na caixa de A',
    )
  })

  // ---------- VÍNCULO CROSS-CORRETOR ----------
  console.log('\nVÍNCULO (imóvel de um corretor vinculado ao cliente de outro)')

  let leadDeAId = ''
  await checar('A cadastra um cliente', async () => {
    const { data, error } = await a.client
      .from('leads')
      .insert({
        ...leadParaRow({ corretorResponsavelId: a.corretorId, etapa: 1, nome: MARCADOR }),
        codigo: `${MARCADOR}-${Date.now()}`,
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    leadDeAId = data!.id
  })

  await checar('A vincula o cliente dela ao imóvel dela mesma (caminho normal) — confirma a escrita', async () => {
    const { data, error } = await a.client
      .from('vinculos')
      .insert({ imovel_id: imovelDeAId, lead_id: leadDeAId, origem: 'manual_corretor' })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    vinculosTeste.push(data!.id as string)
  })

  await checar('B consegue vincular o PRÓPRIO cliente a um imóvel de A (escrita cross-corretor real, não mockada)', async () => {
    const { data: leadDeB, error: erroLead } = await b.client
      .from('leads')
      .insert({
        ...leadParaRow({ corretorResponsavelId: b.corretorId, etapa: 1, nome: `${MARCADOR}-B` }),
        codigo: `${MARCADOR}-B-${Date.now()}`,
      })
      .select()
      .single()
    exigir(!erroLead, erroLead?.message ?? '')

    const { data: vinculo, error } = await b.client
      .from('vinculos')
      .insert({ imovel_id: imovelDeAId, lead_id: leadDeB!.id, origem: 'manual_corretor' })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    vinculosTeste.push(vinculo!.id as string)

    await a.client.from('leads').delete().eq('id', leadDeB!.id)
  })

  // ---------- PERMISSÕES GRANULARES (migração 11) ----------
  // Decisão do PO 09/09/2026: contato/observações NUNCA cruzam (nem com
  // vínculo), escrita cruza só etapa/flags de funil nos dois sentidos
  // quando existe negociação real ligando os dois lados, valor de venda só
  // o dono do imóvel altera. Ver PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md §B.6-B.9.
  console.log('\nPERMISSÕES GRANULARES (RLS + trigger de leads/imoveis/negociacoes — migração 11)')

  let imovelDeBId = ''
  let negociacaoVinculoId = ''

  await checar('B cadastra um imóvel', async () => {
    const imovel: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      corretorResponsavelId: b.corretorId,
      etapa: 'a',
      enderecoRua: MARCADOR,
      enderecoNumero: '2',
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
    const { data, error } = await b.client.from('imoveis').insert(imovelParaRow(imovel)).select().single()
    exigir(!error, error?.message ?? '')
    imovelDeBId = data!.id
  })

  await checar('B NÃO consegue ler o contato do cliente de A, mesmo sem nenhuma negociação envolvida', async () => {
    const { data, error } = await b.client.from('leads_contato').select('*').eq('lead_id', leadDeAId)
    exigir(!error, error?.message ?? '')
    exigir((data ?? []).length === 0, 'B conseguiu ler leads_contato de um lead que não é dele')
  })

  await checar('sem negociação, B NÃO consegue mudar a etapa do lead de A', async () => {
    const { error } = await b.client.from('leads').update({ etapa: 2 }).eq('id', leadDeAId)
    exigir(!error, error?.message ?? '') // RLS bloqueia silenciosamente (0 linhas), não é erro
    const { data } = await a.client.from('leads').select('etapa').eq('id', leadDeAId).single()
    exigir(data!.etapa === 1, 'B conseguiu mudar a etapa de um lead de A sem negociação ligando os dois')
  })

  await checar('cria negociação ligando o lead de A ao imóvel de B', async () => {
    const { data, error } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelDeBId,
        lead_id: leadDeAId,
        corretor_imovel_id: b.corretorId,
        corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    negociacaoVinculoId = data!.id
  })

  await checar('COM negociação, B consegue mudar a etapa do lead de A (mover imóvel move cliente vinculado)', async () => {
    const { error } = await b.client.from('leads').update({ etapa: 4 }).eq('id', leadDeAId)
    exigir(!error, error?.message ?? '')
    const { data } = await a.client.from('leads').select('etapa').eq('id', leadDeAId).single()
    exigir(data!.etapa === 4, 'a etapa do lead de A não mudou mesmo com negociação ligando os dois')
  })

  await checar('mesmo com negociação, B NÃO consegue mudar o nome do lead de A (dado do dono, não de funil)', async () => {
    const { error } = await b.client.from('leads').update({ nome: 'hackeado' }).eq('id', leadDeAId)
    exigir(error != null, 'B conseguiu alterar o nome de um lead de outro corretor')
    const { data } = await a.client.from('leads').select('nome').eq('id', leadDeAId).single()
    exigir(data!.nome !== 'hackeado', 'o nome do lead de A foi alterado por B')
  })

  await checar('com a mesma negociação, A consegue mudar a etapa do imóvel de B (mover cliente move imóvel vinculado)', async () => {
    const { error } = await a.client
      .from('imoveis')
      .update({ etapa: 'e', em_negociacao_flag: true })
      .eq('id', imovelDeBId)
    exigir(!error, error?.message ?? '')
    const { data } = await b.client.from('imoveis').select('etapa').eq('id', imovelDeBId).single()
    exigir(data!.etapa === 'e', 'a etapa do imóvel de B não mudou mesmo com A tendo negociação ligando os dois')
  })

  await checar('mesmo vinculado, A NÃO consegue mudar o valor de venda do imóvel de B (só o dono do imóvel preenche)', async () => {
    const { error } = await a.client.from('imoveis').update({ valor_venda: 999999 }).eq('id', imovelDeBId)
    exigir(error != null, 'A conseguiu alterar valor_venda de um imóvel de outro corretor')
    const { data } = await b.client.from('imoveis').select('valor_venda').eq('id', imovelDeBId).single()
    exigir(data!.valor_venda == null, 'valor_venda do imóvel de B foi alterado por A')
  })

  let negociacaoSoDeAId = ''
  await checar('B (não participa) NÃO consegue atualizar uma negociação só entre A e A mesmo', async () => {
    const { data: nego, error: erroCria } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelDeAId,
        lead_id: leadDeAId,
        corretor_imovel_id: a.corretorId,
        corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!erroCria, erroCria?.message ?? '')
    negociacaoSoDeAId = nego!.id

    const { error } = await b.client.from('negociacoes').update({ status: 'revertida' }).eq('id', nego!.id)
    exigir(!error, error?.message ?? '') // RLS bloqueia silenciosamente (0 linhas)
    const { data } = await a.client.from('negociacoes').select('status').eq('id', nego!.id).single()
    exigir(data!.status === 'ativa', 'B conseguiu alterar uma negociação da qual não participa')
  })

  // ---------- TRIGGER DE SINCRONIA (migração 12) ----------
  // Testa o trigger direto na tabela negociacoes — sem passar por nenhuma
  // tela — pra provar que a sincronia (etapa de lead/imóvel, criação de
  // venda, notificação) é do BANCO, não de código React que alguém
  // esqueceria de chamar. Ver PLANO_TRIGGER_SINCRONIA_NEGOCIACAO.md.
  console.log('\nTRIGGER DE SINCRONIA (INSERT/UPDATE em negociacoes propaga sozinho — migração 12)')

  async function criarImovelTeste(client: SupabaseClient, corretorResponsavelId: string, numero: string) {
    const imovel: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      corretorResponsavelId,
      etapa: 'd',
      enderecoRua: MARCADOR,
      enderecoNumero: numero,
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
    const { data, error } = await client.from('imoveis').insert(imovelParaRow(imovel)).select().single()
    exigir(!error, error?.message ?? '')
    return data!.id as string
  }

  async function criarLeadTeste(client: SupabaseClient, corretorResponsavelId: string, sufixo: string) {
    const { data, error } = await client
      .from('leads')
      .insert({
        ...leadParaRow({ corretorResponsavelId, etapa: 3, nome: `${MARCADOR}-${sufixo}` }),
        codigo: `${MARCADOR}-GATILHO-${sufixo}-${Date.now()}`,
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    return data!.id as string
  }

  const negociacoesGatilho: string[] = []
  const imoveisGatilho: string[] = []
  const leadsGatilho: string[] = []

  let imovelG1 = '', leadG1 = '', negG1 = ''
  await checar('INSERT (mesmo corretor dos dois lados): imóvel e lead avançam sozinhos, sem UPDATE manual', async () => {
    imovelG1 = await criarImovelTeste(a.client, a.corretorId, '10')
    leadG1 = await criarLeadTeste(a.client, a.corretorId, '1')
    imoveisGatilho.push(imovelG1)
    leadsGatilho.push(leadG1)

    const { data, error } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelG1,
        lead_id: leadG1,
        corretor_imovel_id: a.corretorId,
        corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    negG1 = data!.id
    negociacoesGatilho.push(negG1)

    const { data: imovel } = await a.client.from('imoveis').select('etapa, em_negociacao_flag').eq('id', imovelG1).single()
    exigir(imovel!.etapa === 'e', `imóvel deveria estar 'e' sozinho, veio '${imovel!.etapa}'`)
    exigir(imovel!.em_negociacao_flag === true, 'em_negociacao_flag deveria ser true')
    const { data: lead } = await a.client.from('leads').select('etapa').eq('id', leadG1).single()
    exigir(lead!.etapa === 4, `lead deveria estar na etapa 4 sozinho, veio ${lead!.etapa}`)
  })

  let imovelG2 = '', leadG2 = ''
  await checar('INSERT cross-corretor (cliente de B negocia imóvel de A): lead avança, imóvel de A NÃO avança, fica pendente + notificado', async () => {
    imovelG2 = await criarImovelTeste(a.client, a.corretorId, '11')
    leadG2 = await criarLeadTeste(b.client, b.corretorId, '2')
    imoveisGatilho.push(imovelG2)
    leadsGatilho.push(leadG2)

    const { data, error } = await b.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelG2,
        lead_id: leadG2,
        corretor_imovel_id: a.corretorId,
        corretor_cliente_id: b.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!error, error?.message ?? '')
    negociacoesGatilho.push(data!.id)

    const { data: lead } = await b.client.from('leads').select('etapa, pendente_aprovacao_imoveis').eq('id', leadG2).single()
    exigir(lead!.etapa === 4, `lead de B deveria avançar pra 4 sozinho, veio ${lead!.etapa}`)
    exigir(
      (lead!.pendente_aprovacao_imoveis ?? []).includes(imovelG2),
      'imóvel de A deveria estar pendente de aprovação no lead de B',
    )
    const { data: imovel } = await a.client.from('imoveis').select('etapa').eq('id', imovelG2).single()
    exigir(imovel!.etapa === 'd', `imóvel de A não deveria avançar sozinho, veio '${imovel!.etapa}'`)

    const { data: notifs } = await a.client
      .from('notificacoes')
      .select('id, tipo_evento, acao_pendente')
      .eq('tipo_evento', 'E16')
      .order('criada_em', { ascending: false })
      .limit(1)
    exigir((notifs?.length ?? 0) === 1, 'A deveria ter recebido uma notificação E16 de aprovação pendente')
    exigir(
      notifs![0].acao_pendente?.imovelId === imovelG2 && notifs![0].acao_pendente?.leadId === leadG2,
      'notificação E16 não aponta pro lead/imóvel certos',
    )
  })

  await checar('UPDATE status → revertida (sem outra ativa): lead e imóvel voltam sozinhos', async () => {
    const { error } = await a.client.from('negociacoes').update({ status: 'revertida' }).eq('id', negG1)
    exigir(!error, error?.message ?? '')

    const { data: lead } = await a.client.from('leads').select('etapa').eq('id', leadG1).single()
    exigir(lead!.etapa === 3, `lead deveria voltar pra 3 sozinho, veio ${lead!.etapa}`)
    const { data: imovel } = await a.client.from('imoveis').select('etapa, em_negociacao_flag').eq('id', imovelG1).single()
    exigir(imovel!.etapa === 'd', `imóvel deveria voltar pra 'd' sozinho, veio '${imovel!.etapa}'`)
    exigir(imovel!.em_negociacao_flag === false, 'em_negociacao_flag deveria voltar a false')
  })

  let imovelG3 = '', leadG3 = '', negG3 = ''
  await checar('UPDATE status → concluida: lead vai pra 5, imóvel vai pra "f", venda nasce sozinha (sem chamar criarVenda)', async () => {
    imovelG3 = await criarImovelTeste(a.client, a.corretorId, '12')
    leadG3 = await criarLeadTeste(b.client, b.corretorId, '3')
    imoveisGatilho.push(imovelG3)
    leadsGatilho.push(leadG3)

    // aprova primeiro (imóvel de A, cliente de B) — mesma mecânica do teste anterior
    const { data: neg, error: erroNeg } = await b.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelG3,
        lead_id: leadG3,
        corretor_imovel_id: a.corretorId,
        corretor_cliente_id: b.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
      .select()
      .single()
    exigir(!erroNeg, erroNeg?.message ?? '')
    negG3 = neg!.id
    negociacoesGatilho.push(negG3)
    await a.client.from('imoveis').update({ etapa: 'e', em_negociacao_flag: true }).eq('id', imovelG3) // aprovação manual (fora do escopo deste trigger)

    // A (dono do imóvel) confirma a venda — só muda o status, sem tocar em mais nada
    const { error } = await a.client
      .from('negociacoes')
      .update({ status: 'concluida', data_fim: new Date().toISOString(), valor_negociado: 555000 })
      .eq('id', negG3)
    exigir(!error, error?.message ?? '')

    const { data: lead } = await a.client.from('leads').select('etapa').eq('id', leadG3).single()
    exigir(lead!.etapa === 5, `lead deveria ir pra 5 sozinho, veio ${lead!.etapa}`)
    const { data: imovel } = await a.client.from('imoveis').select('etapa, data_venda').eq('id', imovelG3).single()
    exigir(imovel!.etapa === 'f', `imóvel deveria ir pra 'f' sozinho, veio '${imovel!.etapa}'`)
    exigir(imovel!.data_venda != null, 'data_venda deveria ter sido preenchida sozinha')

    const { data: venda } = await a.client.from('vendas').select('valor_venda, revertida').eq('negociacao_id', negG3).single()
    exigir(venda != null, 'a venda deveria ter nascido sozinha, sem chamar criarVenda')
    exigir(Number(venda!.valor_venda) === 555000, `valor_venda deveria ser 555000, veio ${venda?.valor_venda}`)
    exigir(venda!.revertida === false, 'venda recém-criada não deveria estar revertida')

    const { data: notifs } = await b.client
      .from('notificacoes')
      .select('id')
      .eq('tipo_evento', 'E17')
      .eq('destinatario_corretor_id', b.corretorId)
      .order('criada_em', { ascending: false })
      .limit(1)
    exigir((notifs?.length ?? 0) === 1, 'B (corretor do cliente) deveria ter sido notificado da venda confirmada por A')
  })

  await checar('concluir uma negociação reverte AUTOMATICAMENTE as outras negociações ativas do mesmo lead', async () => {
    const imovelP = await criarImovelTeste(a.client, a.corretorId, '13')
    const imovelQ = await criarImovelTeste(a.client, a.corretorId, '14')
    const leadZ = await criarLeadTeste(a.client, a.corretorId, '4')
    imoveisGatilho.push(imovelP, imovelQ)
    leadsGatilho.push(leadZ)

    const { data: negP } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelP, lead_id: leadZ, corretor_imovel_id: a.corretorId, corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(), status: 'ativa',
      })
      .select()
      .single()
    const { data: negQ } = await a.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelQ, lead_id: leadZ, corretor_imovel_id: a.corretorId, corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(), status: 'ativa',
      })
      .select()
      .single()
    negociacoesGatilho.push(negP!.id, negQ!.id)

    // fecha com P — Q não tem mais razão de continuar ativa, o cliente já comprou
    await a.client
      .from('negociacoes')
      .update({ status: 'concluida', data_fim: new Date().toISOString(), valor_negociado: 300000 })
      .eq('id', negP!.id)

    const { data: negQDepois } = await a.client.from('negociacoes').select('status').eq('id', negQ!.id).single()
    exigir(negQDepois!.status === 'revertida', `negociação Q deveria ter sido revertida sozinha, veio '${negQDepois!.status}'`)
    const { data: imovelQDepois } = await a.client.from('imoveis').select('etapa').eq('id', imovelQ).single()
    exigir(imovelQDepois!.etapa === 'd', `imóvel Q deveria ter voltado pra 'd' sozinho, veio '${imovelQDepois!.etapa}'`)
    const { data: leadZDepois } = await a.client.from('leads').select('etapa').eq('id', leadZ).single()
    exigir(leadZDepois!.etapa === 5, `lead deveria estar na etapa 5 (fechou com P), veio ${leadZDepois!.etapa}`)
  })

  await checar('reabrir negociação concluída notifica quem NÃO pediu a reabertura', async () => {
    // negG3 está 'concluida' (teste anterior) — A (dono do imóvel) reabre
    const { error } = await a.client.from('negociacoes').update({ status: 'ativa' }).eq('id', negG3)
    exigir(!error, error?.message ?? '')

    const { data: lead } = await a.client.from('leads').select('etapa').eq('id', leadG3).single()
    exigir(lead!.etapa === 4, `lead deveria voltar pra 4 sozinho, veio ${lead!.etapa}`)
    const { data: imovel } = await a.client.from('imoveis').select('etapa').eq('id', imovelG3).single()
    exigir(imovel!.etapa === 'e', `imóvel deveria voltar pra 'e' sozinho, veio '${imovel!.etapa}'`)

    const { data: notifs } = await b.client
      .from('notificacoes')
      .select('id')
      .eq('tipo_evento', 'E17')
      .eq('destinatario_corretor_id', b.corretorId)
      .order('criada_em', { ascending: false })
      .limit(1)
    exigir((notifs?.length ?? 0) === 1, 'B (corretor do cliente) deveria ter sido notificado da reabertura feita por A')
  })

  await checar('B NÃO consegue criar uma negociação entre dois corretores dos quais não participa', async () => {
    const { error } = await b.client
      .from('negociacoes')
      .insert({
        imovel_id: imovelG1,
        lead_id: leadG1,
        corretor_imovel_id: a.corretorId,
        corretor_cliente_id: a.corretorId,
        data_inicio: new Date().toISOString(),
        status: 'ativa',
      })
    exigir(error != null, 'B conseguiu inserir uma negociação entre dois corretores dos quais não participa')
  })

  await checar('limpar dados do trigger de sincronia', async () => {
    // vendas primeiro: o trigger de conclusão criou pelo menos uma, e ela
    // referencia negociacao_id sem cascade — apagar a negociação antes falha
    for (const id of imoveisGatilho) await a.client.from('vendas').delete().eq('imovel_id', id)
    for (const id of negociacoesGatilho) await a.client.from('negociacoes').delete().eq('id', id)
    for (const id of leadsGatilho) await a.client.from('leads').delete().eq('id', id)
    for (const id of imoveisGatilho) await a.client.from('imoveis').delete().eq('id', id)
  })

  // ---------- RLS DE INSERT POR DONO (migração 15, achado de auditoria) ----------
  console.log('\nRLS DE INSERT POR DONO (equipe_insere genérica travada — migração 15)')

  await checar('B NÃO consegue criar um lead atribuindo A como responsável', async () => {
    const { error } = await b.client.from('leads').insert({
      ...leadParaRow({ corretorResponsavelId: a.corretorId, etapa: 1, nome: `${MARCADOR}-insert-alheio` }),
      codigo: `${MARCADOR}-INSERT-${Date.now()}`,
    })
    exigir(error != null, 'B conseguiu criar um lead atribuindo A como corretor responsável')
  })

  await checar('B NÃO consegue criar um imóvel atribuindo A como responsável', async () => {
    const imovel: Omit<Imovel, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      corretorResponsavelId: a.corretorId,
      etapa: 'a',
      enderecoRua: MARCADOR,
      enderecoNumero: '99',
      bairro: 'Centro',
      cidade: 'Ribeirão Preto',
      estado: 'SP',
      cep: '',
      lat: 0,
      lng: 0,
      tipo: 'apartamento',
      quartos: 1,
      suites: 0,
      vagas: 0,
      banheiros: 1,
      emNegociacaoFlag: false,
    }
    const { error } = await b.client.from('imoveis').insert(imovelParaRow(imovel))
    exigir(error != null, 'B conseguiu criar um imóvel atribuindo A como corretor responsável')
  })

  await checar('B NÃO consegue criar pesos_score/preferencias/dismisses/interesses atribuindo A como dono', async () => {
    const { error: erroPesos } = await b.client.from('pesos_score').insert({ corretor_id: a.corretorId, pesos: {} })
    exigir(erroPesos != null, 'B conseguiu inserir pesos_score em nome de A')

    const { error: erroPref } = await b.client
      .from('preferencias_notificacao')
      .insert({ corretor_id: a.corretorId, janela_digest: 'tempo_real' })
    exigir(erroPref != null, 'B conseguiu inserir preferencias_notificacao em nome de A')

    const { error: erroDismiss } = await b.client
      .from('dismisses')
      .insert({ corretor_id: a.corretorId, lead_id: leadDeAId, imovel_id: imovelDeAId })
    exigir(erroDismiss != null, 'B conseguiu inserir dismisses em nome de A')

    const { error: erroInteresse } = await b.client
      .from('interesses_posteriores')
      .insert({ corretor_id: a.corretorId, imovel_id: imovelDeAId })
    exigir(erroInteresse != null, 'B conseguiu inserir interesses_posteriores em nome de A')
  })

  await checar('fluxo legítimo continua funcionando: B cria pesos_score/dismisses pra SI MESMO', async () => {
    const { error: erroPesos } = await b.client
      .from('pesos_score')
      .upsert({ corretor_id: b.corretorId, pesos: {} })
    exigir(!erroPesos, erroPesos?.message ?? '')
    const { error: erroDismiss } = await b.client
      .from('dismisses')
      .insert({ corretor_id: b.corretorId, lead_id: leadDeAId, imovel_id: imovelDeAId })
    exigir(!erroDismiss, erroDismiss?.message ?? '')
    // limpeza pontual — não faz parte do dataset marcado por MARCADOR
    await a.client.from('dismisses').delete().eq('corretor_id', b.corretorId).eq('lead_id', leadDeAId)
  })

  // ---------- SEGURANÇA — permissões negativas com sessão realmente não-admin ----------
  console.log('\nSEGURANÇA (testado com uma sessão de verdade sem privilégio de admin)')

  await checar('B (não-admin) NÃO consegue promover o próprio papel para admin', async () => {
    await b.client.from('corretores').update({ papel: 'admin' }).eq('id', b.corretorId)
    // RLS bloqueia silenciosamente (0 linhas afetadas) em vez de erro — a
    // verificação real é reler o dado com a sessão de A
    const { data } = await a.client.from('corretores').select('papel').eq('id', b.corretorId).single()
    exigir(data!.papel === 'corretor', 'B conseguiu se promover a admin — falha grave de RLS')
  })

  await checar('função "equipe" (deploy corrigido, migração 15/achado 2): alterar_papel funciona e reverte de ponta a ponta', async () => {
    // Prova que checar error nas chamadas do admin.from(...).update(...) e
    // admin.auth.admin.* (correção real da Edge Function) não quebrou o
    // caminho de sucesso — só passou a reportar falha quando ela acontece.
    async function chamarEquipe(sessao: { access_token: string }, corpo: unknown) {
      const res = await fetch(`${e.VITE_SUPABASE_URL}/functions/v1/equipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: e.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${sessao.access_token}`,
        },
        body: JSON.stringify(corpo),
      })
      return { status: res.status, corpo: await res.json() }
    }

    const { data: sessaoA } = await a.client.auth.getSession()
    try {
      const paraAdmin = await chamarEquipe(sessaoA.session!, {
        acao: 'alterar_papel',
        corretorId: b.corretorId,
        papel: 'admin',
      })
      exigir(paraAdmin.status === 200 && paraAdmin.corpo.ok === true, `promover falhou: ${JSON.stringify(paraAdmin.corpo)}`)
      const { data: depoisPromover } = await a.client.from('corretores').select('papel').eq('id', b.corretorId).single()
      exigir(depoisPromover?.papel === 'admin', 'papel não mudou pra admin de verdade no banco')
    } finally {
      // reverte SEMPRE, mesmo se a asserção acima falhar — B precisa voltar a
      // ser não-admin pros testes de segurança logo abaixo fazerem sentido
      const paraCorretor = await chamarEquipe(sessaoA.session!, {
        acao: 'alterar_papel',
        corretorId: b.corretorId,
        papel: 'corretor',
      })
      exigir(paraCorretor.status === 200 && paraCorretor.corpo.ok === true, `reverter falhou: ${JSON.stringify(paraCorretor.corpo)}`)
    }
    const { data: depoisReverter } = await a.client.from('corretores').select('papel').eq('id', b.corretorId).single()
    exigir(depoisReverter?.papel === 'corretor', 'papel não voltou pra corretor de verdade no banco — B ficou admin')
  })

  await checar('B (não-admin) recebe 403 da função "equipe" ao tentar uma ação de admin', async () => {
    const { data: sessao } = await b.client.auth.getSession()
    const res = await fetch(`${e.VITE_SUPABASE_URL}/functions/v1/equipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: e.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${sessao.session!.access_token}`,
      },
      body: JSON.stringify({ acao: 'criar_direto', nome: 'x', email: 'nao-deveria-existir@teste.local' }),
    })
    exigir(res.status === 403, `esperava 403, veio ${res.status}`)
  })

  await checar('B (não-admin) NÃO consegue apagar um registro (delete é admin-only)', async () => {
    await b.client.from('leads').delete().eq('id', leadDeAId)
    const { data } = await a.client.from('leads').select('id').eq('id', leadDeAId).maybeSingle()
    exigir(data != null, 'B conseguiu apagar um lead sem ser admin — falha grave de RLS')
  })

  // ---------- LIMPEZA ----------
  console.log('\nLIMPEZA (dados marcados deste script — a conta fixture do corretor B NÃO é apagada)')
  await checar('remover imóvel, cliente, vínculos, negociações e notificações de teste', async () => {
    // negociacoes primeiro: FK sem cascade pra leads/imoveis (mesmo motivo
    // de teste-fluxos.ts) — apagar o imóvel/lead antes falharia
    await a.client.from('negociacoes').delete().eq('id', negociacaoVinculoId)
    await a.client.from('negociacoes').delete().eq('id', negociacaoSoDeAId)
    for (const id of vinculosTeste) await a.client.from('vinculos').delete().eq('id', id)
    for (const id of notificacoesTeste) await a.client.from('notificacoes').delete().eq('id', id)
    await a.client.from('leads').delete().eq('id', leadDeAId)
    // imovelDeAId e imovelDeBId têm o mesmo endereco_rua (MARCADOR) — um filtro só pega os dois
    await a.client.from('imoveis').delete().eq('endereco_rua', MARCADOR)

    const { data: sobrouImovel } = await a.client.from('imoveis').select('id').eq('endereco_rua', MARCADOR)
    const { data: sobrouLead } = await a.client.from('leads').select('id').like('codigo', `${MARCADOR}%`)
    exigir((sobrouImovel?.length ?? 0) === 0, 'sobrou imóvel de teste')
    exigir((sobrouLead?.length ?? 0) === 0, 'sobrou cliente de teste')
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
