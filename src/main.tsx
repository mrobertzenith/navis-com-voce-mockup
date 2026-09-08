import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/components/ui/use-toast'
import { inject } from '@vercel/analytics'
import { Sentry, inicializarSentry, sentryHabilitado } from '@/lib/sentry'
import '@/styles/globals.css'

inicializarSentry()
// Vercel Web Analytics — só conta acessos em produção (nada roda em dev/mock)
if (import.meta.env.PROD) inject()

/**
 * Rede de segurança contra falha silenciosa: qualquer gravação ou leitura que
 * falhe avisa o corretor. Sem isso, um erro do banco faz o botão "não fazer
 * nada" e a lista aparecer vazia — foi assim que o cadastro de cliente ficou
 * quebrado sem ninguém saber o motivo.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
  mutationCache: new MutationCache({
    onError: (erro, _vars, _ctx, mutation) => {
      // telas com mensagem própria (ex.: Equipe) se marcam para não avisar duas vezes
      if (mutation.meta?.erroTratadoNaTela) return
      toast({
        title: 'Não foi possível salvar',
        description: erro instanceof Error ? erro.message : 'Tente de novo em instantes.',
        variant: 'destructive',
      })
    },
  }),
  queryCache: new QueryCache({
    onError: () => {
      toast({
        title: 'Não foi possível carregar os dados',
        description: 'Verifique sua conexão e recarregue a página.',
        variant: 'destructive',
      })
    },
  }),
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
