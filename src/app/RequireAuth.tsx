import { Navigate } from 'react-router-dom'
import { supabaseHabilitado } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** Bloqueia as rotas do app quando há backend real e ninguém logado. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const corretor = useAuthStore((s) => s.corretor)
  if (supabaseHabilitado && !corretor) return <Navigate to="/login" replace />
  return children
}
