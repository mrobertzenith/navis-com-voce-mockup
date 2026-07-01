import { useMemo, useState } from 'react'
import { Bell, BellOff, Handshake, Link2Off, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import type { TipoEvento } from '@/domain/types'
import { formatData } from '@/lib/format'
import { useNotificacoesStore } from '@/stores/notificacoesStore'
import { cn } from '@/lib/cn'

const ICONE_POR_TIPO: Partial<Record<TipoEvento, typeof Bell>> = {
  E2: Users,
  E4: Users,
  E12: Handshake,
  E16: Link2Off,
}

type Filtro = 'todas' | 'nao_lidas' | TipoEvento

export function NotificacoesPage() {
  const notificacoes = useNotificacoesStore((s) => s.notificacoes)
  const marcarComoLida = useNotificacoesStore((s) => s.marcarComoLida)
  const marcarComoNaoLida = useNotificacoesStore((s) => s.marcarComoNaoLida)
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const tiposPresentes = useMemo(
    () => Array.from(new Set(notificacoes.map((n) => n.tipoEvento))),
    [notificacoes],
  )

  const ordenadas = useMemo(
    () =>
      [...notificacoes].sort(
        (a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime(),
      ),
    [notificacoes],
  )

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return ordenadas
    if (filtro === 'nao_lidas') return ordenadas.filter((n) => !n.lida)
    return ordenadas.filter((n) => n.tipoEvento === filtro)
  }, [ordenadas, filtro])

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Notificações</h1>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="nao_lidas">Não lidas</SelectItem>
            {tiposPresentes.map((t) => (
              <SelectItem key={t} value={t}>
                Tipo {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação" description="Não há notificações para este filtro." />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtradas.map((n) => {
            const Icon = ICONE_POR_TIPO[n.tipoEvento] ?? Bell
            return (
              <li
                key={n.id}
                onClick={() => !n.lida && marcarComoLida(n.id)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-card',
                  !n.lida && 'border-primary/30 bg-primary/5',
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{n.titulo}</p>
                    <span className="shrink-0 font-mono text-xs text-text-soft">{formatData(n.criadaEm)}</span>
                  </div>
                  <p className="text-sm text-text-mut">{n.corpo}</p>
                  {n.lida && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 px-2 text-xs text-text-mut"
                      onClick={(e) => {
                        e.stopPropagation()
                        marcarComoNaoLida(n.id)
                      }}
                    >
                      <BellOff className="h-3 w-3" strokeWidth={1.5} />
                      Marcar como não lida
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
