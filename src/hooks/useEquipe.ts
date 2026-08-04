import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Corretor } from '@/domain/types'
import { supabase } from '@/lib/supabase'

const EQUIPE_KEY = ['equipe'] as const

/** URL para onde os e-mails de convite/recuperação devem levar */
function urlDefinirSenha(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}definir-senha`
}

async function fetchEquipe(): Promise<Corretor[]> {
  const { data, error } = await supabase!
    .from('corretores')
    .select('*')
    .order('nome', { ascending: true })
  if (error) throw new Error('Falha ao carregar a equipe')
  return data.map((row) => ({
    id: String(row.id),
    papel: row.papel as Corretor['papel'],
    nome: String(row.nome),
    creci: String(row.creci ?? ''),
    cidade: String(row.cidade ?? ''),
    estado: String(row.estado ?? ''),
    email: String(row.email ?? ''),
    telefoneWhatsapp: String(row.telefone_whatsapp ?? ''),
    fotoUrl: (row.foto_url as string | null) ?? undefined,
    status: row.status as Corretor['status'],
    criadoEm: String(row.criado_em ?? ''),
  }))
}

interface AcaoEquipe {
  acao:
    | 'convidar'
    | 'criar_direto'
    | 'desativar'
    | 'reativar'
    | 'resetar_senha'
    | 'excluir'
    | 'alterar_papel'
  corretorId?: string
  papel?: 'admin' | 'corretor'
  nome?: string
  email?: string
  telefoneWhatsapp?: string
  creci?: string
  cidade?: string
  estado?: string
}

interface RespostaEquipe {
  ok?: boolean
  /** presente só na resposta de criar_direto — exibida uma única vez ao admin */
  senhaProvisoria?: string
}

async function executarAcao(payload: AcaoEquipe): Promise<RespostaEquipe> {
  // getSession renova o token se tiver expirado (Safari iOS às vezes não
  // renova em segundo plano); com a sessão garantida, mandamos o token explícito
  const {
    data: { session },
  } = await supabase!.auth.getSession()
  if (!session) throw new Error('Sua sessão expirou. Recarregue a página e entre de novo.')
  const { data, error } = await supabase!.functions.invoke('equipe', {
    body: { ...payload, redirectTo: urlDefinirSenha() },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) {
    // o corpo da resposta de erro da função traz a mensagem amigável
    const contexto = (error as { context?: Response }).context
    if (contexto) {
      const corpo = await contexto.json().catch(() => null)
      if (corpo?.erro) throw new Error(corpo.erro)
    }
    throw new Error('A operação falhou. Tente novamente.')
  }
  if (data?.erro) throw new Error(data.erro)
  return (data ?? {}) as RespostaEquipe
}

export function useEquipe() {
  return useQuery({ queryKey: EQUIPE_KEY, queryFn: fetchEquipe })
}

export function useAcaoEquipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: executarAcao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPE_KEY })
    },
  })
}
