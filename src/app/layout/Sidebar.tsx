import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, Bell, Settings, ListChecks, UsersRound } from 'lucide-react'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meus-imoveis', label: 'Meus Imóveis', icon: Building2 },
  { to: '/meus-clientes', label: 'Meus Clientes', icon: Users },
  { to: '/todos-imoveis', label: 'Todos os Imóveis', icon: ListChecks },
  { to: '/todos-clientes', label: 'Todos os Clientes', icon: UsersRound },
  { to: '/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/configuracoes/score', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  return (
    <nav className="hidden w-56 shrink-0 border-r border-border bg-surface p-4 md:block">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-card px-3 py-2 text-sm font-medium font-body text-text-mut transition-colors hover:bg-bg hover:text-ink',
                  isActive && 'bg-bg text-ink',
                )
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
