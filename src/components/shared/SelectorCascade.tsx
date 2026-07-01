import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { BAIRROS_BASE } from '@/mocks/data/bairros'
import { cn } from '@/lib/cn'

interface SelectorCascadeUnicoProps {
  estado: string
  cidade: string
  bairro: string
  onChange: (valores: { estado: string; cidade: string; bairro: string }) => void
  className?: string
}

/** Estado > Cidade > Bairro com seleção única de bairro — usado no cadastro de imóvel. */
export function SelectorCascadeUnico({ estado, cidade, bairro, onChange, className }: SelectorCascadeUnicoProps) {
  const cidades = BAIRROS_BASE.find((e) => e.sigla === estado)?.cidades ?? []
  const bairros = cidades.find((c) => c.nome === cidade)?.bairros ?? []

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      <div className="flex flex-col gap-1.5">
        <Label>Estado</Label>
        <Select value={estado} onValueChange={(v) => onChange({ estado: v, cidade: '', bairro: '' })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {BAIRROS_BASE.map((e) => (
              <SelectItem key={e.sigla} value={e.sigla}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Cidade</Label>
        <Select
          value={cidade}
          onValueChange={(v) => onChange({ estado, cidade: v, bairro: '' })}
          disabled={!estado}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {cidades.map((c) => (
              <SelectItem key={c.nome} value={c.nome}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Bairro</Label>
        <Select value={bairro} onValueChange={(v) => onChange({ estado, cidade, bairro: v })} disabled={!cidade}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {bairros.map((b) => (
              <SelectItem key={b.nome} value={b.nome}>
                {b.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

interface SelectorCascadeMultiploProps {
  estado: string
  cidade: string
  bairros: string[]
  onChangeLocalizacao: (valores: { estado: string; cidade: string }) => void
  onToggleBairro: (bairro: string) => void
  className?: string
}

/** Estado > Cidade > Bairros (multi-seleção via chips) — usado no perfil de busca do lead. */
export function SelectorCascadeMultiplo({
  estado,
  cidade,
  bairros,
  onChangeLocalizacao,
  onToggleBairro,
  className,
}: SelectorCascadeMultiploProps) {
  const cidades = BAIRROS_BASE.find((e) => e.sigla === estado)?.cidades ?? []
  const bairrosDisponiveis = cidades.find((c) => c.nome === cidade)?.bairros ?? []

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={(v) => onChangeLocalizacao({ estado: v, cidade: '' })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {BAIRROS_BASE.map((e) => (
                <SelectItem key={e.sigla} value={e.sigla}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Cidade</Label>
          <Select value={cidade} onValueChange={(v) => onChangeLocalizacao({ estado, cidade: v })} disabled={!estado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {cidades.map((c) => (
                <SelectItem key={c.nome} value={c.nome}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cidade && (
        <div className="flex flex-col gap-1.5">
          <Label>Bairros (selecione um ou mais)</Label>
          <div className="flex flex-wrap gap-2">
            {bairrosDisponiveis.map((b) => {
              const selecionado = bairros.includes(b.nome)
              return (
                <button
                  key={b.nome}
                  type="button"
                  onClick={() => onToggleBairro(b.nome)}
                  className={cn(
                    'rounded-chip border px-3 py-1.5 text-sm font-body transition-colors',
                    selecionado
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-surface text-text-mut hover:bg-bg',
                  )}
                >
                  {b.nome}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
