import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Cliente Supabase, ou null quando as variáveis de ambiente não existem.
 * Sem .env.local o app segue 100% no mock (MSW + localStorage) — o que permite
 * rodar testes e desenvolvimento offline sem tocar no banco real.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const supabaseHabilitado = supabase !== null
