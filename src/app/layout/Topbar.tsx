import { Link } from 'react-router-dom'
import { Bell, RotateCcw, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { MobileNav } from '@/app/layout/MobileNav'
import { Button } from '@/components/ui/button'
import { useDemoStore } from '@/stores/demoStore'
import { useNotificacoesStore } from '@/stores/notificacoesStore'

export function Topbar() {
  const resetarDemo = useDemoStore((s) => s.resetarDemo)
  const naoLidas = useNotificacoesStore((s) => s.notificacoes.filter((n) => !n.lida).length)

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5">
        <MobileNav />
        <span className="truncate font-heading text-base font-bold text-ink sm:text-lg">
          NAVIS COM VOCÊ
        </span>
        <span className="hidden font-body text-xs text-text-soft sm:inline">by Navis</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" aria-label="Notificações" asChild className="relative">
          <Link to="/notificacoes">
            <Bell strokeWidth={1.5} />
            {naoLidas > 0 && (
              <motion.span
                className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-semibold text-white"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                {naoLidas}
              </motion.span>
            )}
          </Link>
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
