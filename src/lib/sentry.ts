import * as Sentry from '@sentry/react'
import type { Corretor } from '@/domain/types'

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

/** Monitoramento de erros em produção. Sem VITE_SENTRY_DSN, vira no-op. */
export function inicializarSentry() {
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? 'producao' : 'desenvolvimento',
    // só erros; sem gravação de sessão nem tracing — mantém o tier gratuito folgado
    sampleRate: 1.0,
    tracesSampleRate: 0,
  })

  // gancho de verificação: abrir o site com ?teste-sentry dispara um evento de teste
  if (new URLSearchParams(window.location.search).has('teste-sentry')) {
    Sentry.captureMessage('Teste de integração Sentry — NAVIS COM VOCÊ')
  }
}

/** Anexa o corretor logado aos erros (facilita saber quem foi afetado) */
export function sentryDefinirUsuario(corretor: Corretor | null) {
  if (!dsn) return
  Sentry.setUser(corretor ? { email: corretor.email, username: corretor.nome } : null)
}

export function sentryHabilitado() {
  return Boolean(dsn)
}

export { Sentry }
