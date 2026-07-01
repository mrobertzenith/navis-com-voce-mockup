import { http, HttpResponse } from 'msw'
import { imoveisHandlers } from '@/mocks/handlers/imoveis'
import { leadsHandlers } from '@/mocks/handlers/leads'

export const handlers = [
  http.get('/api/ping', () => HttpResponse.json({ ok: true })),
  ...imoveisHandlers,
  ...leadsHandlers,
]
