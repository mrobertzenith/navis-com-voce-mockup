// Edge Function "equipe" — operações de gestão de corretores que exigem
// privilégio de administrador da plataforma (service role):
//   convidar        → cria usuário no Auth (envia e-mail de convite) + linha em corretores
//   desativar       → status 'suspenso' + banimento do login
//   reativar        → status 'ativo' + remove banimento
//   resetar_senha   → reenvia e-mail de redefinição
//   excluir         → apaga convite errado (só se nunca fez login)
//
// Segurança: o chamador precisa estar logado E ter papel 'admin' na tabela
// corretores. O service role nunca chega ao navegador.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function resposta(status: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1) Quem chama precisa estar logado
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const anon = createClient(url, anonKey)
  const {
    data: { user },
  } = await anon.auth.getUser(jwt)
  if (!user?.email) return resposta(401, { erro: 'Não autenticado' })

  // 2) ...e ser admin da equipe
  const admin = createClient(url, serviceKey)
  const { data: chamador } = await admin
    .from('corretores')
    .select('id, papel')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()
  if (chamador?.papel !== 'admin') return resposta(403, { erro: 'Apenas administradores' })

  const corpo = await req.json().catch(() => ({}))
  const acao = corpo.acao as string
  const redirectTo = typeof corpo.redirectTo === 'string' ? corpo.redirectTo : undefined

  try {
    // criar_direto: para a fase sem domínio de e-mail verificado — cria a conta
    // já confirmada com senha provisória, que o admin repassa por WhatsApp
    if (acao === 'criar_direto') {
      const { nome, email, telefoneWhatsapp, creci, cidade, estado } = corpo
      if (!nome || !email) return resposta(400, { erro: 'Nome e e-mail são obrigatórios' })
      const emailNorm = String(email).trim().toLowerCase()

      const { data: existente } = await admin
        .from('corretores')
        .select('id')
        .eq('email', emailNorm)
        .maybeSingle()
      if (existente) return resposta(409, { erro: 'Já existe corretor com esse e-mail' })

      const senhaProvisoria = 'Navis-' +
        Array.from(crypto.getRandomValues(new Uint8Array(9)))
          .map((b) => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'[b % 54])
          .join('')

      const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
        email: emailNorm,
        password: senhaProvisoria,
        email_confirm: true,
      })
      if (erroCriar) return resposta(400, { erro: `Criação falhou: ${erroCriar.message}` })

      const { data: corretor, error: erroInsert } = await admin
        .from('corretores')
        .insert({
          auth_user_id: criado.user.id,
          nome,
          email: emailNorm,
          telefone_whatsapp: telefoneWhatsapp ?? '',
          creci: creci ?? '',
          cidade: cidade ?? 'Ribeirão Preto',
          estado: estado ?? 'SP',
          status: 'ativo',
          papel: 'corretor',
        })
        .select()
        .single()
      if (erroInsert) {
        await admin.auth.admin.deleteUser(criado.user.id)
        return resposta(400, { erro: 'Falha ao cadastrar corretor' })
      }
      return resposta(200, { ok: true, corretor, senhaProvisoria })
    }

    if (acao === 'convidar') {
      const { nome, email, telefoneWhatsapp, creci, cidade, estado } = corpo
      if (!nome || !email) return resposta(400, { erro: 'Nome e e-mail são obrigatórios' })
      const emailNorm = String(email).trim().toLowerCase()

      const { data: existente } = await admin
        .from('corretores')
        .select('id')
        .eq('email', emailNorm)
        .maybeSingle()
      if (existente) return resposta(409, { erro: 'Já existe corretor com esse e-mail' })

      const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(
        emailNorm,
        redirectTo ? { redirectTo } : undefined,
      )
      if (erroConvite) return resposta(400, { erro: `Convite falhou: ${erroConvite.message}` })

      const { data: corretor, error: erroInsert } = await admin
        .from('corretores')
        .insert({
          auth_user_id: convite.user.id,
          nome,
          email: emailNorm,
          telefone_whatsapp: telefoneWhatsapp ?? '',
          creci: creci ?? '',
          cidade: cidade ?? 'Ribeirão Preto',
          estado: estado ?? 'SP',
          status: 'pendente_onboarding',
          papel: 'corretor',
        })
        .select()
        .single()
      if (erroInsert) {
        await admin.auth.admin.deleteUser(convite.user.id)
        return resposta(400, { erro: 'Falha ao cadastrar corretor' })
      }
      return resposta(200, { ok: true, corretor })
    }

    // demais ações operam sobre um corretor existente
    const corretorId = corpo.corretorId as string
    if (!corretorId) return resposta(400, { erro: 'corretorId é obrigatório' })
    const { data: alvo } = await admin
      .from('corretores')
      .select('id, email, papel, status, auth_user_id')
      .eq('id', corretorId)
      .maybeSingle()
    if (!alvo) return resposta(404, { erro: 'Corretor não encontrado' })

    if (acao === 'desativar') {
      if (alvo.id === chamador.id) return resposta(400, { erro: 'Você não pode desativar a si mesmo' })
      await admin.from('corretores').update({ status: 'suspenso' }).eq('id', alvo.id)
      if (alvo.auth_user_id) {
        await admin.auth.admin.updateUserById(alvo.auth_user_id, { ban_duration: '876000h' })
      }
      return resposta(200, { ok: true })
    }

    if (acao === 'reativar') {
      await admin.from('corretores').update({ status: 'ativo' }).eq('id', alvo.id)
      if (alvo.auth_user_id) {
        await admin.auth.admin.updateUserById(alvo.auth_user_id, { ban_duration: 'none' })
      }
      return resposta(200, { ok: true })
    }

    if (acao === 'resetar_senha') {
      const { error } = await admin.auth.resetPasswordForEmail(
        alvo.email,
        redirectTo ? { redirectTo } : undefined,
      )
      if (error) return resposta(400, { erro: `Envio falhou: ${error.message}` })
      return resposta(200, { ok: true })
    }

    if (acao === 'excluir') {
      // só permite excluir convite que nunca foi usado (sem login registrado)
      if (alvo.auth_user_id) {
        const { data: u } = await admin.auth.admin.getUserById(alvo.auth_user_id)
        if (u?.user?.last_sign_in_at) {
          return resposta(400, { erro: 'Corretor já acessou o sistema — use Desativar' })
        }
        await admin.auth.admin.deleteUser(alvo.auth_user_id)
      }
      await admin.from('corretores').delete().eq('id', alvo.id)
      return resposta(200, { ok: true })
    }

    return resposta(400, { erro: `Ação desconhecida: ${acao}` })
  } catch (e) {
    return resposta(500, { erro: e instanceof Error ? e.message : 'Erro interno' })
  }
})
