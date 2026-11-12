import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CadastroImovelPage } from '@/pages/CadastroImovelPage'
import { useToast } from '@/components/ui/use-toast'

// Espelha CadastroClientePage.test.tsx: mesma trava, mesmo risco, mesma classe de
// regressão (ESTRATEGIA_QA.md §1.4 e §2, camada 3).

const imoveisMock = vi.hoisted(() => ({ lista: [] as Array<Record<string, unknown>> }))
const criarImovelMock = vi.fn()
const atualizarImovelMock = vi.fn()
const criarNotificacaoMock = vi.fn()

vi.mock('@/hooks/useImoveis', () => ({
  useImoveis: () => ({ data: imoveisMock.lista, isLoading: false }),
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

// useRegistrarAtividade() chama useQueryClient() — sem QueryClientProvider na
// árvore de teste (mesmo motivo do comentário acima sobre useLeads), precisa
// mockar também.
vi.mock('@/hooks/useAtividades', () => ({
  useRegistrarAtividade: () => ({ mutate: vi.fn() }),
}))

function renderEdicao(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/imoveis/${id}/editar`]}>
      <Routes>
        <Route path="/imoveis/:id/editar" element={<CadastroImovelPage />} />
        <Route path="/meus-imoveis" element={<div>Meus Imóveis</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

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

  describe('CNM e link do anúncio', () => {
    async function ateOPasso4(user: ReturnType<typeof userEvent.setup>) {
      await preencherPasso1(user)
      await preencherPasso2(user)
      await avancar(user)
      await screen.findByText('Passo 3 de 4')
      await avancar(user)
      await screen.findByText('Passo 4 de 4')
    }

    it('CNM é opcional: cadastra sem CNM e o texto não diz que é obrigatório', async () => {
      const user = userEvent.setup()
      renderPagina()
      await ateOPasso4(user)
      expect(screen.queryByText(/obrigatório para avançar/i)).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))
      await waitFor(() => expect(criarImovelMock).toHaveBeenCalledTimes(1))
      expect(criarImovelMock.mock.calls[0][0].cnm).toBeUndefined()
    })

    it('permite informar o link já no cadastro', async () => {
      const user = userEvent.setup()
      renderPagina()
      await ateOPasso4(user)
      await user.type(screen.getByLabelText(/link do anúncio/i), 'https://site.com/imovel/1')
      await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))
      await waitFor(() => expect(criarImovelMock).toHaveBeenCalledTimes(1))
      expect(criarImovelMock.mock.calls[0][0].linkAnuncioUrl).toBe('https://site.com/imovel/1')
    })

    it('recusa link que não é uma URL completa e explica o erro', async () => {
      const user = userEvent.setup()
      renderPagina()
      await ateOPasso4(user)
      await user.type(screen.getByLabelText(/link do anúncio/i), 'site.com/imovel')
      await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))
      expect(await screen.findByText(/começando com http/i)).toBeInTheDocument()
      expect(criarImovelMock).not.toHaveBeenCalled()
    })

    it('REGRESSÃO: link cadastrado por engano pode ser corrigido depois (e deixa de contar como quebrado)', async () => {
      imoveisMock.lista = [
        {
          id: 'im-edit', corretorResponsavelId: 'cor-1', etapa: 'd',
          enderecoRua: 'Rua Teste', enderecoNumero: '100', bairro: 'Centro', cidade: 'Ribeirão Preto', estado: 'SP',
          cep: '14000-000', lat: 0, lng: 0, tipo: 'apartamento',
          quartos: 2, suites: 0, vagas: 1, banheiros: 1, areaPrivativaM2: 70, valorAnuncio: 400000,
          linkAnuncioUrl: 'https://errado.com/1', linkQuebrado: true, emNegociacaoFlag: false,
          criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z',
        },
      ]
      const user = userEvent.setup()
      renderEdicao('im-edit')
      await screen.findByText('Passo 1 de 4')
      await avancar(user)
      await avancar(user)
      await avancar(user)
      await screen.findByText('Passo 4 de 4')

      const campo = screen.getByLabelText(/link do anúncio/i) as HTMLInputElement
      expect(campo.value).toBe('https://errado.com/1') // vem preenchido: dá pra ver o que está errado
      await user.clear(campo)
      await user.type(campo, 'https://certo.com/9')
      await user.click(screen.getByRole('button', { name: /salvar|concluir/i }))

      await waitFor(() => expect(atualizarImovelMock).toHaveBeenCalledTimes(1))
      const { patch } = atualizarImovelMock.mock.calls[0][0]
      expect(patch.linkAnuncioUrl).toBe('https://certo.com/9')
      expect(patch.linkQuebrado).toBe(false)
      imoveisMock.lista = []
    })
  })
})
