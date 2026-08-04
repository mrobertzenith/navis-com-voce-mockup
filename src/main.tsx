import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/toaster'
import { Sentry, inicializarSentry, sentryHabilitado } from '@/lib/sentry'
import '@/styles/globals.css'

inicializarSentry()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
})

async function enableMocking() {
  // Com Supabase configurado (.env.local), os hooks falam com o banco real — MSW nem sobe
  const { supabaseHabilitado } = await import('@/lib/supabase')
  if (supabaseHabilitado) return
  const { worker } = await import('@/mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
}

function TelaDeErro() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <h1 className="font-heading text-lg font-bold text-ink">Algo deu errado</h1>
      <p className="max-w-sm text-sm text-text-mut">
        O problema já foi registrado e vamos investigar. Recarregue a página para continuar.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-white"
      >
        Recarregar
      </button>
    </div>
  )
}

async function bootstrap() {
  await enableMocking()
  const { inicializarAuth } = await import('@/stores/authStore')
  await inicializarAuth()
}

bootstrap().then(() => {
  const app = (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>
  )
  createRoot(document.getElementById('root')!).render(
    sentryHabilitado() ? (
      <Sentry.ErrorBoundary fallback={<TelaDeErro />}>{app}</Sentry.ErrorBoundary>
    ) : (
      app
    ),
  )
})
