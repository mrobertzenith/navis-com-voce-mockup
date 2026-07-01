import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export interface ColunaDef {
  id: string
  label: string
}

interface KanbanBoardProps<T> {
  colunas: ColunaDef[]
  itensPorColuna: Record<string, T[]>
  getItemId: (item: T) => string
  renderCard: (item: T, opts: { onMover?: () => void }) => ReactNode
  isColunaValidaParaDrag?: (itemId: string, colunaOrigemId: string, colunaDestinoId: string) => boolean
  onSolicitarMovimentacao: (itemId: string, colunaOrigemId: string, colunaDestinoId: string) => void
}

export function KanbanBoard<T>({
  colunas,
  itensPorColuna,
  getItemId,
  renderCard,
  isColunaValidaParaDrag,
  onSolicitarMovimentacao,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [colunaMobileAtiva, setColunaMobileAtiva] = useState(colunas[0]?.id)
  const [itemParaMover, setItemParaMover] = useState<{ id: string; colunaOrigemId: string } | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function encontrarColunaDoItem(itemId: string): string | undefined {
    return colunas.find((c) => itensPorColuna[c.id]?.some((item) => getItemId(item) === itemId))?.id
  }

  function encontrarItem(itemId: string): T | undefined {
    for (const coluna of colunas) {
      const item = itensPorColuna[coluna.id]?.find((i) => getItemId(i) === itemId)
      if (item) return item
    }
    return undefined
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const itemId = String(event.active.id)
    const colunaDestinoId = event.over ? String(event.over.id) : undefined
    const colunaOrigemId = encontrarColunaDoItem(itemId)
    setActiveId(null)

    if (!colunaDestinoId || !colunaOrigemId || colunaDestinoId === colunaOrigemId) return

    if (isColunaValidaParaDrag && !isColunaValidaParaDrag(itemId, colunaOrigemId, colunaDestinoId)) {
      return
    }

    onSolicitarMovimentacao(itemId, colunaOrigemId, colunaDestinoId)
  }

  const itemAtivo = activeId ? encontrarItem(activeId) : undefined

  return (
    <>
      {/* Desktop: colunas com DnD */}
      <div className="hidden md:block">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {colunas.map((coluna) => {
              const estadoDrag = activeId
                ? isColunaValidaParaDrag
                  ? isColunaValidaParaDrag(activeId, encontrarColunaDoItem(activeId) ?? '', coluna.id)
                    ? coluna.id === encontrarColunaDoItem(activeId)
                      ? undefined
                      : ('valida' as const)
                    : ('invalida' as const)
                  : undefined
                : undefined

              return (
                <KanbanColumn
                  key={coluna.id}
                  id={coluna.id}
                  label={coluna.label}
                  count={itensPorColuna[coluna.id]?.length ?? 0}
                  estadoDrag={estadoDrag}
                >
                  {(itensPorColuna[coluna.id] ?? []).map((item) => (
                    <KanbanCard key={getItemId(item)} id={getItemId(item)}>
                      {renderCard(item, {})}
                    </KanbanCard>
                  ))}
                </KanbanColumn>
              )
            })}
          </div>
          <DragOverlay>{itemAtivo ? renderCard(itemAtivo, {}) : null}</DragOverlay>
        </DndContext>
      </div>

      {/* Mobile: seletor de coluna + lista vertical */}
      <div className="md:hidden">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {colunas.map((coluna) => (
            <button
              key={coluna.id}
              onClick={() => setColunaMobileAtiva(coluna.id)}
              className={cn(
                'shrink-0 rounded-chip border border-border px-3 py-1.5 text-xs font-medium font-body text-text-mut',
                colunaMobileAtiva === coluna.id && 'border-primary bg-primary/10 text-primary',
              )}
            >
              {coluna.label} ({itensPorColuna[coluna.id]?.length ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {(itensPorColuna[colunaMobileAtiva ?? ''] ?? []).map((item) => (
            <div key={getItemId(item)}>
              {renderCard(item, {
                onMover: () => setItemParaMover({ id: getItemId(item), colunaOrigemId: colunaMobileAtiva! }),
              })}
            </div>
          ))}
        </div>
      </div>

      <Sheet open={itemParaMover != null} onOpenChange={(open) => !open && setItemParaMover(null)}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Mover para</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-2">
            {colunas
              .filter((c) => c.id !== itemParaMover?.colunaOrigemId)
              .map((coluna) => (
                <Button
                  key={coluna.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    if (itemParaMover) {
                      onSolicitarMovimentacao(itemParaMover.id, itemParaMover.colunaOrigemId, coluna.id)
                    }
                    setItemParaMover(null)
                  }}
                >
                  {coluna.label}
                </Button>
              ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
