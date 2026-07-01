import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <PlaceholderPage titulo="Dashboard" /> },
        { path: 'meus-imoveis', element: <PlaceholderPage titulo="Meus Imóveis" /> },
        { path: 'meus-clientes', element: <PlaceholderPage titulo="Meus Clientes" /> },
        { path: 'imoveis/novo', element: <PlaceholderPage titulo="Cadastro de Imóvel" /> },
        { path: 'leads/novo', element: <PlaceholderPage titulo="Cadastro de Lead" /> },
        { path: 'todos-imoveis', element: <PlaceholderPage titulo="Todos os Imóveis" /> },
        { path: 'todos-leads', element: <PlaceholderPage titulo="Todos os Leads" /> },
        { path: 'todos-corretores', element: <PlaceholderPage titulo="Todos os Corretores" /> },
        { path: 'imoveis-perdidos', element: <PlaceholderPage titulo="Imóveis Perdidos" /> },
        { path: 'notificacoes', element: <PlaceholderPage titulo="Notificações" /> },
        {
          path: 'configuracoes/score',
          element: <PlaceholderPage titulo="Configurações > Score" />,
        },
        { path: 'design-system', element: <DesignSystemPage /> },
      ],
    },
    { path: '/login', element: <PlaceholderPage titulo="Login" /> },
    { path: '/onboarding', element: <PlaceholderPage titulo="Onboarding" /> },
  ],
  { basename: '/navis-com-voce-mockup/' },
)
