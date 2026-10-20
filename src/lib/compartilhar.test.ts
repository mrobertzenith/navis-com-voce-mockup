import { describe, expect, it } from 'vitest'
import { reunirLinks, textoDosLinks, urlWhatsapp } from '@/lib/compartilhar'

describe('compartilhar — só o link vai pro cliente', () => {
  it('junta os links, ignora imóvel sem link e conta quantos ficaram de fora', () => {
    const r = reunirLinks([
      { linkAnuncioUrl: 'https://site.com/imovel/1' },
      { linkAnuncioUrl: undefined },
      { linkAnuncioUrl: '  ' },
      { linkAnuncioUrl: 'https://site.com/imovel/2' },
    ])
    expect(r.links).toEqual(['https://site.com/imovel/1', 'https://site.com/imovel/2'])
    expect(r.semLink).toBe(2)
  })

  it('não repete o mesmo link duas vezes', () => {
    const r = reunirLinks([{ linkAnuncioUrl: 'https://a.com/1' }, { linkAnuncioUrl: 'https://a.com/1' }])
    expect(r.links).toEqual(['https://a.com/1'])
    expect(r.semLink).toBe(0)
  })

  it('texto é um link por linha, sem nenhum dado do cadastro', () => {
    expect(textoDosLinks(['https://a.com/1', 'https://a.com/2'])).toBe('https://a.com/1\nhttps://a.com/2')
  })

  it('link do WhatsApp abre sem número (corretor escolhe a conversa) com o texto codificado', () => {
    const url = urlWhatsapp(['https://a.com/1?x=1&y=2', 'https://a.com/2'])
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    expect(decodeURIComponent(url.split('text=')[1])).toBe('https://a.com/1?x=1&y=2\nhttps://a.com/2')
  })
})
