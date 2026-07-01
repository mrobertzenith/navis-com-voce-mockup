import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { Topbar } from '@/app/layout/Topbar'
import { Sidebar } from '@/app/layout/Sidebar'
import { BannerDemo } from '@/components/shared/BannerDemo'
import { ModalDetalheImovel } from '@/components/imovel/ModalDetalheImovel'
import { ModalDetalheCliente } from '@/components/lead/ModalDetalheCliente'
import { useImoveis } from '@/hooks/useImoveis'
import { useLeads } from '@/hooks/useLeads'
import { CORRETOR_LOGADO_ID } from '@/mocks/data/corretores'
import { useUIStore } from '@/stores/uiStore'

export function AppLayout() {
  const { data: imoveis = [] } = useImoveis()
  const { data: leads = [] } = useLeads()
  const modalImovelId = useUIStore((s) => s.modalImovelId)
  const modalLeadId = useUIStore((s) => s.modalLeadId)
  const fecharModais = useUIStore((s) => s.fecharModais)

  const imovelSelecionado = useMemo(
    () => imoveis.find((i) => i.id === modalImovelId) ?? null,
    [imoveis, modalImovelId],
  )
  const leadSelecionado = useMemo(
    () => leads.find((l) => l.id === modalLeadId) ?? null,
    [leads, modalLeadId],
  )
  const meusLeads = useMemo(
    () => leads.filter((l) => l.corretorResponsavelId === CORRETOR_LOGADO_ID && [1, 2, 3].includes(l.etapa)),
    [leads],
  )

  return (
    <div className="flex min-h-screen flex-col">
      <BannerDemo />
      <Topbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 bg-bg">
          <Outlet />
        </main>
      </div>

      {imovelSelecionado && (
        <ModalDetalheImovel imovel={imovelSelecionado} meusLeads={meusLeads} onClose={fecharModais} />
      )}
      {leadSelecionado && <ModalDetalheCliente lead={leadSelecionado} onClose={fecharModais} />}
    </div>
  )
}
