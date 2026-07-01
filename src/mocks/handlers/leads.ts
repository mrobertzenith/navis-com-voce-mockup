import { http, HttpResponse } from 'msw'
import { leadsDb } from '@/mocks/db/leadsDb'

export const leadsHandlers = [
  http.get('/api/leads', () => {
    return HttpResponse.json(leadsDb.getAll())
  }),

  http.post('/api/leads', async ({ request }) => {
    const dados = await request.json()
    const criado = leadsDb.create(dados as Parameters<typeof leadsDb.create>[0])
    return HttpResponse.json(criado, { status: 201 })
  }),

  http.patch('/api/leads/:id', async ({ params, request }) => {
    const patch = await request.json()
    const atualizado = leadsDb.update(params.id as string, patch as Record<string, unknown>)
    if (!atualizado) {
      return HttpResponse.json({ message: 'Lead não encontrado' }, { status: 404 })
    }
    return HttpResponse.json(atualizado)
  }),
]
