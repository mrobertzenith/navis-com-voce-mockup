import { useState } from 'react'
import { useLinkPreview } from '@/hooks/useLinkPreview'
import { cn } from '@/lib/cn'

interface CapaDoLinkProps {
  url?: string
  className?: string
}

/**
 * "Ilustração do link": mostra a imagem de capa do anúncio, carregada direto
 * do site de origem (nada é guardado no sistema). Sem link, sem imagem ou se
 * a imagem falhar ao carregar, não renderiza nada — o card segue só com texto.
 */
export function CapaDoLink({ url, className }: CapaDoLinkProps) {
  const imagem = useLinkPreview(url)
  const [falhou, setFalhou] = useState<string | null>(null)
  if (!imagem || falhou === imagem) return null
  return (
    <img
      src={imagem}
      alt="Capa do anúncio"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFalhou(imagem)}
      className={cn('bg-bg object-cover', className)}
    />
  )
}
