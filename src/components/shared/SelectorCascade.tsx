import { useState } from 'react'
import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UFS } from '@/lib/localizacao'
import { encontrarEquivalente } from '@/domain/normalizacao'
import { useLocaisConhecidos } from '@/hooks/useLocaisConhecidos'
import { cn } from '@/lib/cn'

/** Sugestões de digitação a partir do que a equipe já cadastrou */
function Sugestoes({ id, itens }: { id: string; itens: string[] }) {
  return (
    <datalist id={id}>
      {itens.map((item) => (
        <option key={item} value={item} />
      ))}
    </datalist>
  )
}

/**
 * Localização livre — sem cerca geográfica: UF completa (27 estados),
 * cidade e bairro como texto. O CEP (nas páginas) preenche tudo sozinho.
 */

interface SelectorCascadeUnicoProps {
  estado: string
  cidade: string
  bairro: string
  onChange: (valores: { estado: string; cidade: string; bairro: string }) => void
  className?: string
}

/** UF > Cidade > Bairro com bairro único — usado no cadastro de imóvel. */
export function SelectorCascadeUnico({ estado, cidade, bairro, onChange, className }: SelectorCascadeUnicoProps) {
  const conhecidos = useLocaisConhecidos()
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      <div className="flex flex-col gap-1.5">
        <Label>Estado</Label>
        <Select value={estado} onValueChange={(v) => onChange({ estado: v, cidade, bairro })}>
          <SelectTrigger>
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            {UFS.map((e) => (
              <SelectItem key={e.sigla} value={e.sigla}>
                {e.sigla} — {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loc-cidade">Cidade</Label>
        <Input
          id="loc-cidade"
          list="sug-cidades"
          value={cidade}
          onChange={(e) => onChange({ estado, cidade: e.target.value, bairro })}
          placeholder="Ex.: Ribeirão Preto"
        />
        <Sugestoes id="sug-cidades" itens={conhecidos.cidades} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loc-bairro">Bairro</Label>
        <Input
          id="loc-bairro"
          list="sug-bairros"
          value={bairro}
          onChange={(e) => onChange({ estado, cidade, bairro: e.target.value })}
          // ao sair do campo, adota a grafia já usada pela equipe para o mesmo bairro
          onBlur={(e) => {
            const equivalente = encontrarEquivalente(e.target.value, conhecidos.bairros)
            if (equivalente && equivalente !== e.target.value) {
              onChange({ estado, cidade, bairro: equivalente })
            }
          }}
          placeholder="Ex.: Centro"
        />
        <Sugestoes id="sug-bairros" itens={conhecidos.bairros} />
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

/** UF > Cidade > Bairros múltiplos (tags) — usado no perfil de busca do cliente. */
export function SelectorCascadeMultiplo({
  estado,
  cidade,
  bairros,
  onChangeLocalizacao,
  onToggleBairro,
  className,
}: SelectorCascadeMultiploProps) {
  const [novoBairro, setNovoBairro] = useState('')
  const conhecidos = useLocaisConhecidos()

  function adicionarBairro() {
    const limpo = novoBairro.trim()
    if (!limpo) return
    // já está na lista deste cliente (mesmo escrito de outro jeito)? não duplica
    if (encontrarEquivalente(limpo, bairros)) {
      setNovoBairro('')
      return
    }
    // a equipe já usa uma grafia para este bairro? adota ela
    onToggleBairro(encontrarEquivalente(limpo, conhecidos.bairros) ?? limpo)
    setNovoBairro('')
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={(v) => onChangeLocalizacao({ estado: v, cidade })}>
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((e) => (
                <SelectItem key={e.sigla} value={e.sigla}>
                  {e.sigla} — {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loc-cidade-multi">Cidade</Label>
          <Input
            id="loc-cidade-multi"
            list="sug-cidades-multi"
            value={cidade}
            onChange={(e) => onChangeLocalizacao({ estado, cidade: e.target.value })}
            placeholder="Ex.: Ribeirão Preto"
          />
          <Sugestoes id="sug-cidades-multi" itens={conhecidos.cidades} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="loc-novo-bairro">Bairros de interesse (um ou mais)</Label>
        <div className="flex gap-2">
          <Input
            id="loc-novo-bairro"
            list="sug-bairros-multi"
            value={novoBairro}
            onChange={(e) => setNovoBairro(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarBairro()
              }
            }}
            placeholder="Digite o bairro e pressione Enter"
          />
          <Button type="button" variant="outline" onClick={adicionarBairro} className="shrink-0">
            Adicionar
          </Button>
          <Sugestoes id="sug-bairros-multi" itens={conhecidos.bairros} />
        </div>
        {bairros.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {bairros.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => onToggleBairro(b)}
                className="flex items-center gap-1 rounded-chip border border-primary bg-primary/5 px-2.5 py-1 text-sm text-ink"
                aria-label={`Remover ${b}`}
              >
                {b}
                <X className="h-3 w-3" strokeWidth={1.5} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
