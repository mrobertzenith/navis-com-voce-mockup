import { http, HttpResponse } from 'msw'
import { leadsDb } from '@/mocks/db/leadsDb'

export const leadsHandlers = [
  http.get('/api/leads', () => {
    return HttpResponse.json(leadsDb.getAll())
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
