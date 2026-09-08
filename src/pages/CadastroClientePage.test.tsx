import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CadastroClientePage } from '@/pages/CadastroClientePage'
import { useToast } from '@/components/ui/use-toast'

// Testes de regressão do bug #1/#2 da rodada 08/09: o wizard salvava um cadastro
// incompleto quando um submit chegava ao formulário antes do último passo (uma
// condição de corrida que só reproduzia com timing realista de clique — ver
// ESTRATEGIA_QA.md §1.4). A trava adicionada em CadastroClientePage.tsx não tinha
// nenhum teste protegendo-a: este arquivo existe para que remover a trava por engano
// quebre o CI, não a produção.

const criarLeadMock = vi.fn()
const atualizarLeadMock = vi.fn()

vi.mock('@/hooks/useLeads', () => ({
  useLeads: () => ({ data: [] }),
  useCriarLead: () => ({ mutate: criarLeadMock, isPending: false }),
  useAtualizarLead: () => ({ mutate: atualizarLeadMock, isPending: false }),
}))

vi.mock('@/hooks/useImoveis', () => ({
  useImoveis: () => ({ data: [] }),
}))

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/clientes/novo']}>
      <Routes>
        <Route path="/clientes/novo" element={<CadastroClientePage />} />
        <Route path="/meus-clientes" element={<div>Meus Clientes</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Preenche o passo 1 (Identificação) e avança para o passo 2. */
async function preencherPasso1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome'), 'Cliente de Teste')
  await user.click(screen.getByRole('button', { name: 'Próximo' }))
  await screen.findByText('Passo 2 de 3')
}

/** Preenche os campos obrigatórios do passo 2 (Perfil de busca), sem avançar. */
async function preencherPasso2(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Apartamento/i }))

  // Estado é um Select do Radix, sem <label for> associado — localiza pelo
  // placeholder "UF" mostrado dentro do trigger e abre o popover. O texto do
  // placeholder tem pointer-events:none (truque do próprio Radix para repassar
  // o clique ao botão por baixo), então o clique precisa mirar o combobox.
  const triggerEstado = screen.getByText('UF').closest('[role="combobox"]') as HTMLElement
  await user.click(triggerEstado)
  await user.click(await screen.findByRole('option', { name: /São Paulo/ }))

  await user.type(screen.getByLabelText('Cidade'), 'Ribeirão Preto')
  await user.type(screen.getByLabelText('Bairros de interesse (um ou mais)'), 'Centro')
  await user.click(screen.getByRole('button', { name: 'Adicionar' }))

  await user.type(screen.getByLabelText('Até (R$)'), '500000')
}

describe('CadastroClientePage — wizard de cadastro de cliente', () => {
  afterEach(() => {
    criarLeadMock.mockClear()
    atualizarLeadMock.mockClear()
  })

  it('conclui o cadastro normalmente quando o formulário é enviado no último passo', async () => {
    const user = userEvent.setup()
    renderPagina()

    await preencherPasso1(user)
    await preencherPasso2(user)
    await user.click(screen.getByRole('button', { name: 'Próximo' }))
    await screen.findByText('Passo 3 de 3')

    await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))

    await waitFor(() => expect(criarLeadMock).toHaveBeenCalledTimes(1))
    const payload = criarLeadMock.mock.calls[0][0]
    expect(payload.nome).toBe('Cliente de Teste')
    expect(payload.perfilBusca.cidade).toBe('Ribeirão Preto')
    expect(payload.perfilBusca.bairros).toEqual(['Centro'])
  })

  it('NUNCA persiste um submit que chega ao formulário fora do último passo', async () => {
    const user = userEvent.setup()
    const { container } = renderPagina()
    const { result: toastState } = renderHook(() => useToast())

    await preencherPasso1(user)
    await preencherPasso2(user)
    // Ainda no passo 2 — em vez de clicar "Próximo", simula o que a condição de
    // corrida original fazia: um evento de submit chega direto ao <form>, sem
    // passar pelo botão "Próximo" nem pela troca de passo.
    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    // dá tempo para o resolver assíncrono do zod rodar, se for o caso
    await new Promise((r) => setTimeout(r, 50))

    expect(criarLeadMock).not.toHaveBeenCalled()
    expect(atualizarLeadMock).not.toHaveBeenCalled()

    // e o usuário é devolvido para o último passo com um aviso, não deixado no vazio
    await screen.findByText('Passo 3 de 3')
    expect(
      toastState.current.toasts.some((t) => String(t.title).includes('Cadastro incompleto')),
    ).toBe(true)
  })
})
