import { http, HttpResponse } from 'msw'
import { imoveisHandlers } from '@/mocks/handlers/imoveis'

export const handlers = [
  http.get('/api/ping', () => HttpResponse.json({ ok: true })),
  ...imoveisHandlers,
]
