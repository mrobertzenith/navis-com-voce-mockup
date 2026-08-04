import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { consumirLinkAuth, supabase } from '@/lib/supabase'
import { inicializarAuth, useAuthStore } from '@/stores/authStore'

/**
 * Destino dos links de convite e de "esqueci minha senha".
 * O Supabase já estabeleceu a sessão a partir do token da URL —
 * aqui a pessoa só escolhe a nova senha.
 */
export function DefinirSenhaPage() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const sessaoCarregada = useAuthStore((s) => s.sessaoCarregada)
  const navigate = useNavigate()

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.')
      return
    }
    setSalvando(true)
    setErro(null)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro(
        error.message.includes('different from the old')
          ? 'A nova senha precisa ser diferente da anterior.'
          : 'Não foi possível salvar. O link pode ter expirado — peça um novo.',
      )
      setSalvando(false)
      return
    }
    consumirLinkAuth()
    await inicializarAuth()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <Anchor className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold text-ink">Criar sua senha</h1>
          <p className="text-sm text-text-mut">
            Escolha a senha que você vai usar para entrar no NAVIS.
          </p>
        </div>

        {sessaoCarregada && (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirma-senha">Repita a senha</Label>
              <Input
                id="confirma-senha"
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
            </div>

            {erro && <p className="text-sm text-danger">{erro}</p>}

            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar e entrar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
