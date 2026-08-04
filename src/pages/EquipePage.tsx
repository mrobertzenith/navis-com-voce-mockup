import { useState } from 'react'
import { Copy, Crown, KeyRound, ShieldOff, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { Corretor } from '@/domain/types'
import { useAcaoEquipe, useEquipe } from '@/hooks/useEquipe'
import { formatTelefone } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'

const STATUS_LABEL: Record<Corretor['status'], { texto: string; classe: string }> = {
  ativo: { texto: 'Ativo', classe: 'bg-success/10 text-success' },
  pendente_onboarding: { texto: 'Convite enviado', classe: 'bg-warning/10 text-warning' },
  suspenso: { texto: 'Desativado', classe: 'bg-danger/10 text-danger' },
}

export function EquipePage() {
  const { data: equipe = [], isLoading } = useEquipe()
  const acao = useAcaoEquipe()
  const { toast } = useToast()
  const eu = useAuthStore((s) => s.corretor)
  const [convidando, setConvidando] = useState(false)
  const [modo, setModo] = useState<'convidar' | 'criar_direto'>('convidar')
  const [form, setForm] = useState({ nome: '', email: '', telefoneWhatsapp: '', creci: '' })
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; email: string; senha: string } | null>(null)

  function executar(payload: Parameters<typeof acao.mutate>[0], sucesso: string) {
    acao.mutate(payload, {
      onSuccess: () => toast({ title: sucesso }),
      onError: (e) => toast({ title: 'Não deu certo', description: e.message, variant: 'destructive' }),
    })
  }

  function convidar(e: React.FormEvent) {
    e.preventDefault()
    acao.mutate(
      { acao: modo, ...form },
      {
        onSuccess: (resultado) => {
          if (modo === 'criar_direto' && resultado.senhaProvisoria) {
            setSenhaGerada({ nome: form.nome, email: form.email, senha: resultado.senhaProvisoria })
          } else {
            toast({
              title: 'Convite enviado',
              description: `${form.nome} vai receber um e-mail para criar a senha.`,
            })
          }
          setConvidando(false)
          setForm({ nome: '', email: '', telefoneWhatsapp: '', creci: '' })
        },
        onError: (err) =>
          toast({ title: 'Não deu certo', description: err.message, variant: 'destructive' }),
      },
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Equipe</h1>
          <p className="text-sm text-text-mut">
            Convide corretores, desative quem saiu e reenvie acessos — sem sair do NAVIS.
          </p>
        </div>
        <Button onClick={() => setConvidando(true)}>
          <UserPlus className="h-4 w-4" strokeWidth={1.5} />
          Convidar corretor
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-mut">Carregando equipe…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {equipe.map((c) => {
            const status = STATUS_LABEL[c.status]
            const souEu = c.id === eu?.id
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-3 sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-ink">{c.nome}</p>
                    {c.papel === 'admin' && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                        Admin
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${status.classe}`}
                    >
                      {status.texto}
                    </span>
                  </div>
                  <p className="truncate text-sm text-text-mut">
                    {c.email}
                    {c.telefoneWhatsapp && ` · ${formatTelefone(c.telefoneWhatsapp)}`}
                    {c.creci && ` · CRECI ${c.creci}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {c.status !== 'suspenso' &&
                    (c.papel === 'admin' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={acao.isPending || souEu}
                        title={souEu ? 'Você não pode remover o próprio papel de admin' : undefined}
                        onClick={() =>
                          executar(
                            { acao: 'alterar_papel', corretorId: c.id, papel: 'corretor' },
                            `${c.nome} não é mais admin`,
                          )
                        }
                      >
                        <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Remover admin
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={acao.isPending}
                        onClick={() =>
                          executar(
                            { acao: 'alterar_papel', corretorId: c.id, papel: 'admin' },
                            `${c.nome} agora é admin`,
                          )
                        }
                      >
                        <Crown className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Tornar admin
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={acao.isPending || c.status === 'suspenso'}
                    onClick={() =>
                      executar(
                        { acao: 'resetar_senha', corretorId: c.id },
                        'E-mail de redefinição enviado',
                      )
                    }
                  >
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Redefinir senha
                  </Button>
                  {c.status === 'suspenso' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={acao.isPending}
                      onClick={() =>
                        executar({ acao: 'reativar', corretorId: c.id }, 'Corretor reativado')
                      }
                    >
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Reativar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={acao.isPending || souEu}
                      title={souEu ? 'Você não pode desativar a si mesmo' : undefined}
                      onClick={() =>
                        executar({ acao: 'desativar', corretorId: c.id }, 'Corretor desativado')
                      }
                    >
                      <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Desativar
                    </Button>
                  )}
                  {c.status === 'pendente_onboarding' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger"
                      aria-label="Excluir convite"
                      disabled={acao.isPending}
                      onClick={() =>
                        executar({ acao: 'excluir', corretorId: c.id }, 'Convite excluído')
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={convidando} onOpenChange={setConvidando}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar corretor</DialogTitle>
            <DialogDescription>
              {modo === 'convidar'
                ? 'A pessoa recebe um e-mail com um link para criar a própria senha.'
                : 'O sistema gera uma senha provisória para você enviar por WhatsApp.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-1 rounded-card border border-border p-1">
            <button
              type="button"
              onClick={() => setModo('convidar')}
              className={`flex-1 rounded-card px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === 'convidar' ? 'bg-primary text-white' : 'text-text-mut hover:text-ink'
              }`}
            >
              Convite por e-mail
            </button>
            <button
              type="button"
              onClick={() => setModo('criar_direto')}
              className={`flex-1 rounded-card px-3 py-1.5 text-sm font-medium transition-colors ${
                modo === 'criar_direto' ? 'bg-primary text-white' : 'text-text-mut hover:text-ink'
              }`}
            >
              Senha provisória
            </button>
          </div>
          <form onSubmit={convidar} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-nome">Nome</Label>
              <Input
                id="eq-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eq-email">E-mail</Label>
              <Input
                id="eq-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eq-tel">WhatsApp</Label>
                <Input
                  id="eq-tel"
                  value={form.telefoneWhatsapp}
                  onChange={(e) => setForm({ ...form, telefoneWhatsapp: e.target.value })}
                  placeholder="16999998888"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eq-creci">CRECI</Label>
                <Input
                  id="eq-creci"
                  value={form.creci}
                  onChange={(e) => setForm({ ...form, creci: e.target.value })}
                  placeholder="00000-F/SP"
                />
              </div>
            </div>
            <Button type="submit" disabled={acao.isPending} className="mt-1">
              {acao.isPending
                ? 'Processando…'
                : modo === 'convidar'
                  ? 'Enviar convite'
                  : 'Criar acesso'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={senhaGerada !== null} onOpenChange={(open) => !open && setSenhaGerada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso criado para {senhaGerada?.nome}</DialogTitle>
            <DialogDescription>
              Envie estes dados por WhatsApp. A senha aparece <strong>só esta vez</strong> —
              depois de fechar, use "Redefinir senha" se precisar de outra.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 rounded-card border border-border bg-bg p-4 font-mono text-sm">
            <p>
              <span className="text-text-soft">site: </span>
              {window.location.origin}
            </p>
            <p>
              <span className="text-text-soft">e-mail: </span>
              {senhaGerada?.email}
            </p>
            <p>
              <span className="text-text-soft">senha: </span>
              <strong>{senhaGerada?.senha}</strong>
            </p>
          </div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(
                `Seu acesso ao NAVIS COM VOCÊ:\n${window.location.origin}\ne-mail: ${senhaGerada?.email}\nsenha: ${senhaGerada?.senha}`,
              )
              toast({ title: 'Copiado', description: 'Cole no WhatsApp do corretor.' })
            }}
          >
            <Copy className="h-4 w-4" strokeWidth={1.5} />
            Copiar tudo
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
