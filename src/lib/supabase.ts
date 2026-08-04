import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Tipo do link de autenticação presente na URL (convite ou recuperação de senha).
 * Capturado ANTES do createClient, que processa e limpa o hash da URL.
 * Enquanto pendente, o app leva o usuário para a página "Definir senha";
 * depois de salvar a senha, consumirLinkAuth() libera a navegação normal
 * (sem isso, o guarda de rota devolveria o usuário pra lá em loop).
 */
let linkAuthPendente: 'invite' | 'recovery' | null =
  typeof window !== 'undefined'
    ? ((/type=(invite|recovery)/.exec(window.location.hash)?.[1] as 'invite' | 'recovery') ?? null)
    : null

export function tipoLinkAuthPendente() {
  return linkAuthPendente
}

export function consumirLinkAuth() {
  linkAuthPendente = null
}

/**
 * Cliente Supabase, ou null quando as variáveis de ambiente não existem.
 * Sem .env.local o app segue 100% no mock (MSW + localStorage) — o que permite
 * rodar testes e desenvolvimento offline sem tocar no banco real.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const supabaseHabilitado = supabase !== null
