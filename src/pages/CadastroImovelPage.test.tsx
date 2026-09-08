import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CadastroImovelPage } from '@/pages/CadastroImovelPage'
import { useToast } from '@/components/ui/use-toast'

// Espelha CadastroClientePage.test.tsx: mesma trava, mesmo risco, mesma classe de
// regressão (ESTRATEGIA_QA.md §1.4 e §2, camada 3).

const criarImovelMock = vi.fn()
const atualizarImovelMock = vi.fn()
const criarNotificacaoMock = vi.fn()

vi.mock('@/hooks/useImoveis', () => ({
  useImoveis: () => ({ data: [], isLoading: false }),
  useCriarImovel: () => ({ mutate: criarImovelMock, isPending: false }),
  useAtualizarImovel: () => ({ mutate: atualizarImovelMock, isPending: false }),
}))

// SelectorCascadeUnico usa useLocaisConhecidos(), que por sua vez lê useLeads() —
// sem mockar aqui também, o teste quebra com "No QueryClient set" mesmo a página
// nunca importando useLeads diretamente.
vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({ data: [] }),
}))

vi.mock('@/hooks/useNotificacoes', () => ({
  useCriarNotificacao: () => ({ mutate: criarNotificacaoMock, isPending: false }),
}))

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/imoveis/novo']}>
      <Routes>
        <Route path="/imoveis/novo" element={<CadastroImovelPage />} />
        <Route path="/meus-imoveis" element={<div>Meus Imóveis</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function avancar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Próximo' }))
}

/** Preenche o passo 1 (Localização) e avança para o passo 2. */
async function preencherPasso1(user: ReturnType<typeof userEvent.setup>) {
  const triggerEstado = screen.getByText('UF').closest('[role="combobox"]') as HTMLElement
  await user.click(triggerEstado)
  await user.click(await screen.findByRole('option', { name: /São Paulo/ }))

  await user.type(screen.getByLabelText('Cidade'), 'Ribeirão Preto')
  await user.type(screen.getByLabelText('Bairro'), 'Centro')
  await user.type(screen.getByLabelText('Rua'), 'Rua Teste')
  await user.type(screen.getByLabelText('Número'), '100')

  await avancar(user)
  await screen.findByText('Passo 2 de 4')
}

/** Seleciona um tipo no passo 2 (quartos/suítes/vagas/banheiros já têm default 0). */
async function preencherPasso2(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Apartamento/i }))
}

describe('CadastroImovelPage — wizard de cadastro de imóvel', () => {
  afterEach(() => {
    criarImovelMock.mockClear()
    atualizarImovelMock.mockClear()
    criarNotificacaoMock.mockClear()
  })

  it('conclui o cadastro normalmente quando o formulário é enviado no último passo', async () => {
    const user = userEvent.setup()
    renderPagina()

    await preencherPasso1(user)
    await preencherPasso2(user)
    await avancar(user)
    await screen.findByText('Passo 3 de 4') // Diferenciais — nenhum campo obrigatório
    await avancar(user)
    await screen.findByText('Passo 4 de 4') // Valor e CNM — nenhum campo obrigatório

    await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))

    await waitFor(() => expect(criarImovelMock).toHaveBeenCalledTimes(1))
    const payload = criarImovelMock.mock.calls[0][0]
    expect(payload.enderecoRua).toBe('Rua Teste')
    expect(payload.tipo).toBe('apartamento')
  })

  it('NUNCA persiste um submit que chega ao formulário fora do último passo', async () => {
    const user = userEvent.setup()
    const { container } = renderPagina()
    const { result: toastState } = renderHook(() => useToast())

    await preencherPasso1(user)
    await preencherPasso2(user)
    // Ainda no passo 2 (de 4) — dispara o submit direto no <form>, simulando a
    // mesma condição de corrida corrigida no wizard de cliente.
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await new Promise((r) => setTimeout(r, 50))

    expect(criarImovelMock).not.toHaveBeenCalled()
    expect(atualizarImovelMock).not.toHaveBeenCalled()

    await screen.findByText('Passo 4 de 4')
    expect(
      toastState.current.toasts.some((t) => String(t.title).includes('Cadastro incompleto')),
    ).toBe(true)
  })
})
