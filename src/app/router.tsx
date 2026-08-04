import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { RequireAuth } from '@/app/RequireAuth'
import { LoginPage } from '@/pages/LoginPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { MeusImoveisPage } from '@/pages/MeusImoveisPage'
import { MeusClientesPage } from '@/pages/MeusClientesPage'
import { CadastroImovelPage } from '@/pages/CadastroImovelPage'
import { CadastroClientePage } from '@/pages/CadastroClientePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { TodosImoveisPage } from '@/pages/TodosImoveisPage'
import { TodosClientesPage } from '@/pages/TodosClientesPage'
import { RankingCorretoresPage } from '@/pages/RankingCorretoresPage'
import { NotificacoesPage } from '@/pages/NotificacoesPage'
import { ConfiguracoesScorePage } from '@/pages/ConfiguracoesScorePage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'meus-imoveis', element: <MeusImoveisPage /> },
        { path: 'meus-clientes', element: <MeusClientesPage /> },
        { path: 'imoveis/novo', element: <CadastroImovelPage /> },
        { path: 'imoveis/:id/editar', element: <CadastroImovelPage /> },
        { path: 'clientes/novo', element: <CadastroClientePage /> },
        { path: 'clientes/:id/editar', element: <CadastroClientePage /> },
        { path: 'todos-imoveis', element: <TodosImoveisPage /> },
        { path: 'todos-clientes', element: <TodosClientesPage /> },
        { path: 'ranking-corretores', element: <RankingCorretoresPage /> },
        { path: 'todos-corretores', element: <PlaceholderPage titulo="Todos os Corretores" /> },
        { path: 'imoveis-perdidos', element: <PlaceholderPage titulo="Imóveis Perdidos" /> },
        { path: 'notificacoes', element: <NotificacoesPage /> },
        { path: 'configuracoes/score', element: <ConfiguracoesScorePage /> },
      ],
    },
    { path: '/login', element: <LoginPage /> },
    { path: '/onboarding', element: <OnboardingPage /> },
  ],
  { basename: '/navis-com-voce-mockup/' },
)
