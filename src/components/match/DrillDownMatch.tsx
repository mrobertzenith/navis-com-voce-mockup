import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ListaMatches, type MatchItem } from '@/components/match/ListaMatches'

interface DrillDownMatchProps {
  aberto: boolean
  titulo: string
  matches: MatchItem[]
  onFechar: () => void
  onAbrir: (id: string) => void
  onDismiss: (id: string) => void
}

export function DrillDownMatch({ aberto, titulo, matches, onFechar, onAbrir, onDismiss }: DrillDownMatchProps) {
  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <ListaMatches matches={matches} onAbrir={onAbrir} onDismiss={onDismiss} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
