import { useState } from 'react'
import { KeyRound, ShieldOff, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
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
  const [form, setForm] = useState({ nome: '', email: '', telefoneWhatsapp: '', creci: '' })

  function executar(payload: Parameters<typeof acao.mutate>[0], sucesso: string) {
    acao.mutate(payload, {
      onSuccess: () => toast({ title: sucesso }),
      onError: (e) => toast({ title: 'Não deu certo', description: e.message, variant: 'destructive' }),
    })
  }

  function convidar(e: React.FormEvent) {
    e.preventDefault()
    acao.mutate(
      { acao: 'convidar', ...form },
      {
        onSuccess: () => {
          toast({
            title: 'Convite enviado',
            description: `${form.nome} vai receber um e-mail para criar a senha.`,
          })
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
            <DialogTitle>Convidar corretor</DialogTitle>
            <DialogDescription>
              A pessoa recebe um e-mail com um link para criar a própria senha.
            </DialogDescription>
          </DialogHeader>
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
              {acao.isPending ? 'Enviando…' : 'Enviar convite'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
