import { Bell, RotateCcw, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDemoStore } from '@/stores/demoStore'

export function Topbar() {
  const resetarDemo = useDemoStore((s) => s.resetarDemo)

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate font-heading text-base font-bold text-ink sm:text-lg">
          NAVIS COM VOCÊ
        </span>
        <span className="hidden font-body text-xs text-text-soft sm:inline">by Navis</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetarDemo}
          className="text-text-mut sm:hidden"
          aria-label="Resetar demo"
        >
          <RotateCcw strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetarDemo}
          className="hidden text-text-mut sm:inline-flex"
        >
          <RotateCcw strokeWidth={1.5} />
          Resetar demo
        </Button>
        <Button variant="ghost" size="icon" aria-label="Perfil">
          <User strokeWidth={1.5} />
        </Button>
      </div>
    </header>
  )
}
