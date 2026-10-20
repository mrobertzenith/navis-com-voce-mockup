import { Copy, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { textoDosLinks, urlWhatsapp, type ResultadoLinks } from '@/lib/compartilhar'

interface BarraCompartilharProps {
  selecionados: number
  resultado: ResultadoLinks
  onLimpar: () => void
}

/** Barra fixa que aparece quando há imóveis selecionados: copia ou envia só os links. */
export function BarraCompartilhar({ selecionados, resultado, onLimpar }: BarraCompartilharProps) {
  const { toast } = useToast()
  if (selecionados === 0) return null
  const { links, semLink } = resultado
  const semNada = links.length === 0

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoDosLinks(links))
      toast({
        title: links.length === 1 ? 'Link copiado' : `${links.length} links copiados`,
        description: semLink > 0 ? `${semLink} sem link de anúncio ficou de fora.` : undefined,
      })
    } catch {
      toast({ title: 'Não consegui copiar', description: 'Tente de novo.', variant: 'destructive' })
    }
  }

  function enviarWhatsapp() {
    window.open(urlWhatsapp(links), '_blank', 'noopener,noreferrer')
    if (semLink > 0) {
      toast({ title: `${semLink} sem link de anúncio ficou de fora` })
    }
  }

  return (
    <div
      role="region"
      aria-label="Compartilhar imóveis selecionados"
      className="sticky bottom-0 z-20 mt-3 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-card"
    >
      <span className="mr-auto text-sm text-ink">
        {selecionados} {selecionados === 1 ? 'selecionado' : 'selecionados'}
        {semLink > 0 && <span className="ml-1 text-xs text-warning">({semLink} sem link)</span>}
      </span>
      <Button variant="outline" size="sm" onClick={copiar} disabled={semNada}>
        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
        Copiar links
      </Button>
      <Button size="sm" onClick={enviarWhatsapp} disabled={semNada}>
        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
        Enviar no WhatsApp
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onLimpar} aria-label="Limpar seleção">
        <X className="h-4 w-4" strokeWidth={1.5} />
      </Button>
    </div>
  )
}
