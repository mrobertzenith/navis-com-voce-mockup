import { http, HttpResponse } from 'msw'
import { imoveisDb } from '@/mocks/db/imoveisDb'

export const imoveisHandlers = [
  http.get('/api/imoveis', () => {
    return HttpResponse.json(imoveisDb.getAll())
  }),

  http.post('/api/imoveis', async ({ request }) => {
    const dados = await request.json()
    const criado = imoveisDb.create(dados as Parameters<typeof imoveisDb.create>[0])
    return HttpResponse.json(criado, { status: 201 })
  }),

  http.patch('/api/imoveis/:id', async ({ params, request }) => {
    const patch = await request.json()
    const atualizado = imoveisDb.update(params.id as string, patch as Record<string, unknown>)
    if (!atualizado) {
      return HttpResponse.json({ message: 'Imóvel não encontrado' }, { status: 404 })
    }
    return HttpResponse.json(atualizado)
  }),
]
