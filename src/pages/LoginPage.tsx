import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import { inicializarAuth } from '@/stores/authStore'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const navigate = useNavigate()
  const { toast } = useToast()

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro(
        error.message.includes('Invalid login credentials')
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.',
      )
      setEnviando(false)
      return
    }
    await inicializarAuth()
    navigate('/dashboard', { replace: true })
  }

  async function esqueciSenha() {
    if (!supabase) return
    if (!email) {
      setErro('Digite seu e-mail acima e clique de novo em "Esqueci minha senha".')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}login`,
    })
    if (!error) {
      toast({
        title: 'E-mail enviado',
        description: 'Confira sua caixa de entrada para redefinir a senha.',
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
            <Anchor className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-xl font-bold text-ink">NAVIS COM VOCÊ</h1>
          <p className="text-sm text-text-mut">Entre com o e-mail e a senha da sua conta</p>
        </div>

        <form onSubmit={entrar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <Button type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
          <button
            type="button"
            onClick={esqueciSenha}
            className="text-sm text-text-mut underline-offset-2 hover:underline"
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}
