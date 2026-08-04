import { Navigate } from 'react-router-dom'
import { supabaseHabilitado, tipoLinkAuthPendente } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** Bloqueia as rotas do app quando há backend real e ninguém logado. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const corretor = useAuthStore((s) => s.corretor)
  // link de convite/recuperação: antes de qualquer coisa, definir a senha
  if (supabaseHabilitado && tipoLinkAuthPendente()) return <Navigate to="/definir-senha" replace />
  if (supabaseHabilitado && !corretor) return <Navigate to="/login" replace />
  return children
}

/** Restringe uma rota ao papel admin (a tela Equipe). */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const corretor = useAuthStore((s) => s.corretor)
  if (supabaseHabilitado && corretor?.papel !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}
