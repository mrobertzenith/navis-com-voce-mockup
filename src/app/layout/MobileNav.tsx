import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useNavItems } from '@/app/layout/Sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'

export function MobileNav() {
  const [aberto, setAberto] = useState(false)
  const navItems = useNavItems()

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        className="md:hidden"
        onClick={() => setAberto(true)}
      >
        <Menu strokeWidth={1.5} />
      </Button>
      <SheetContent side="left" className="flex flex-col p-4">
        <SheetHeader>
          <SheetTitle>NAVIS COM VOCÊ</SheetTitle>
        </SheetHeader>
        <nav className="mt-2">
          <ul className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setAberto(false)}
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
      </SheetContent>
    </Sheet>
  )
}
