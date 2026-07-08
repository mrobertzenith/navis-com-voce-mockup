import { useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { ChipTipoImovel } from '@/components/imovel/ChipTipoImovel'
import { CarouselFotos } from '@/components/imovel/CarouselFotos'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import type { Imovel, Lead } from '@/domain/types'
import { formatM2, formatPreco } from '@/lib/format'
import { CORRETORES, CORRETOR_LOGADO_ID, nomeCorretor } from '@/mocks/data/corretores'
import { fotoPadrao } from '@/mocks/data/fotosImoveis'

interface ModalDetalheImovelProps {
  imovel: Imovel | null
  meusLeads: Lead[]
  onClose: () => void
}

function areaPrincipal(imovel: Imovel): number | undefined {
  return imovel.areaPrivativaM2 ?? imovel.areaConstruidaM2 ?? imovel.areaTerrenoM2
}

export function ModalDetalheImovel({ imovel, meusLeads, onClose }: ModalDetalheImovelProps) {
  const { toast } = useToast()
  const [leadSelecionado, setLeadSelecionado] = useState<string>('')

  if (!imovel) return null

  const corretor = CORRETORES.find((c) => c.id === imovel.corretorResponsavelId)
  const diferenciais = [
    imovel.elevador && 'Elevador',
    imovel.mobiliado && 'Mobiliado',
    imovel.lazer && 'Lazer',
    imovel.varanda && 'Varanda',
    imovel.churrasqueira && 'Churrasqueira',
    imovel.aceitaPet && 'Aceita pet',
  ].filter(Boolean) as string[]

  function copiarLink() {
    if (imovel!.linkAnuncioUrl) {
      navigator.clipboard.writeText(imovel!.linkAnuncioUrl)
      toast({ title: 'Link copiado' })
    }
  }

  function adicionarACliente() {
    if (!leadSelecionado) return
    toast({ title: 'Vínculo registrado', description: 'Imóvel adicionado ao perfil do cliente selecionado.' })
    setLeadSelecionado('')
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {imovel.enderecoRua}, {imovel.enderecoNumero}
          </DialogTitle>
          <DialogDescription>
            {imovel.bairro} · {imovel.cidade}/{imovel.estado}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <CarouselFotos fotos={imovel.fotos ?? [fotoPadrao(imovel.tipo)]} />

          <ChipTipoImovel tipo={imovel.tipo} />

          <p className="font-mono text-xl font-semibold text-ink">
            {formatPreco(imovel.valorAnuncio ?? imovel.valorEstimado)}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm text-text-mut">
            {imovel.quartos > 0 && <span>{imovel.quartos} quartos</span>}
            {imovel.suites > 0 && <span>{imovel.suites} suítes</span>}
            {imovel.vagas > 0 && <span>{imovel.vagas} vagas</span>}
            {imovel.banheiros > 0 && <span>{imovel.banheiros} banheiros</span>}
            {areaPrincipal(imovel) != null && <span>{formatM2(areaPrincipal(imovel))}</span>}
          </div>

          {diferenciais.length > 0 && (
            <p className="text-sm text-text-mut">Diferenciais: {diferenciais.join(', ')}</p>
          )}

          {imovel.nomeCondominio && (
            <p className="text-sm text-text-mut">Condomínio: {imovel.nomeCondominio}</p>
          )}

          {imovel.linkAnuncioUrl && (
            <div className="flex items-center gap-2 rounded-card border border-border bg-bg p-2">
              <a
                href={imovel.linkAnuncioUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-xs text-primary hover:underline"
              >
                {imovel.linkAnuncioUrl}
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copiarLink}>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between rounded-card border border-border p-3">
            <div>
              <p className="text-sm font-medium text-ink">{nomeCorretor(imovel.corretorResponsavelId)}</p>
              <p className="text-xs text-text-soft">Corretor responsável</p>
            </div>
            {corretor && imovel.corretorResponsavelId !== CORRETOR_LOGADO_ID && (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://wa.me/55${corretor.telefoneWhatsapp}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>

          {meusLeads.length > 0 && (
            <div className="flex items-end gap-2 border-t border-border pt-3">
              <div className="flex-1">
                <Select value={leadSelecionado} onValueChange={setLeadSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar a um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {meusLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={adicionarACliente} disabled={!leadSelecionado}>
                Adicionar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
