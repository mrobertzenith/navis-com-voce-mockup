import { Bell, RotateCcw, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDemoStore } from '@/stores/demoStore'

export function Topbar() {
  const resetarDemo = useDemoStore((s) => s.resetarDemo)

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-lg font-bold text-ink">NAVIS COM VOCÊ</span>
        <span className="font-body text-xs text-text-soft">by Navis</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell strokeWidth={1.5} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetarDemo}
          className="text-text-mut"
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
