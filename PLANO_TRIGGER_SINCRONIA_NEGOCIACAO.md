# Plano: centralizar sincronia lead↔imóvel num trigger de banco

Documento de planejamento — não executar sem aprovação, mesmo padrão de
`PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md`. Motivado por uma observação
direta do usuário: "quero as melhores práticas de desenvolvimento de um
sênior, nunca pedi gambiarras" — em resposta a eu ter corrigido, na mesma
sessão, seis bugs diferentes que eram todos o mesmo problema estrutural.

## A.1 O problema, com endereço certo

"Quando um card muda, sincroniza o card vinculado e notifica quem não
pediu a mudança" está reescrito à mão em **6 lugares** — nem parecidos o
suficiente pra copiar-colar com segurança, nem centralizados o bastante pra
corrigir uma vez só:

| # | Arquivo:linha | Transição | Sincroniza | Notifica? |
|---|---|---|---|---|
| 1 | `MeusClientesPage.tsx:188-223` | lead sai de "Em negociação" (reversão) | reverte `negociacoes` ativas do lead + devolve imóvel próprio pra 'd' | não (só imóvel PRÓPRIO é tocado) |
| 2 | `MeusClientesPage.tsx:226-320` | lead entra em "Em negociação" | cria `negociacoes`, avança imóvel próprio pra 'e', ou marca pendente+notifica se de outro corretor | sim (E16, só se cross-corretor) |
| 3 | `MeusClientesPage.tsx:334-370` | lead volta de "Negócio Fechado" pra "Em negociação" | reabre `negociacoes`, reverte `vendas`, devolve imóvel pra 'e' | sim (E17, só se cross-corretor) |
| 4 | `MeusClientesPage.tsx:419-450` (`desvincularNegociacao`) | desvincular 1 negociação sem mexer nas outras | reverte 1 `negociacoes`, devolve imóvel próprio se for o caso | não |
| 5 | `MeusImoveisPage.tsx:165-223` | imóvel sai de "Em negociação"/"Vendido" pra "Publicado" | reverte TODAS `negociacoes`/`vendas` do imóvel, devolve lead(s) pra etapa 3 | sim (E17, só se cross-corretor) |
| 6 | `MeusImoveisPage.tsx:229-292` | imóvel vai pra "Vendido" | conclui `negociacoes`, cria `vendas`, avança lead pra 5, reverte concorrentes | sim (E17, só se cross-corretor) |
| 7 | `MeusImoveisPage.tsx:297-338` | imóvel volta de "Vendido" pra "Em negociação" | reabre `negociacoes`, reverte `vendas`, devolve lead pra 4 | sim (E17, só se cross-corretor) |
| 8 | `MeusImoveisPage.tsx:340-399` | imóvel entra em "Em negociação" | cria `negociacoes`, avança lead pra 4, ou marca pendente+notifica se de outro corretor | sim (E16, só se cross-corretor) |

Todos os 8 pontos giram em torno da MESMA coisa: uma linha de `negociacoes`
mudando de `status`, ou uma linha de `vendas` mudando de `revertida`. O
resto (etapa do lead, etapa do imóvel, notificação) é sempre uma FUNÇÃO
dessa mudança — não deveria ser reimplementado a cada tela que toca a
tabela.

**Achado extra, relevante pra decisão de produto (não é bug, é
inconsistência de comportamento que a centralização vai expor):** hoje, ao
criar uma negociação cross-corretor pelo lado do IMÓVEL (#8), o lead do
outro corretor avança de etapa IMEDIATAMENTE, só com notificação
informativa — não existe aprovação de verdade bloqueando. Já pelo lado do
CLIENTE (#2), o imóvel de outro corretor SÓ avança depois que o dono aprova
explicitamente (`NotificacoesPage.aprovar`). É a mesma operação (negociação
cross-corretor) tratada de dois jeitos diferentes dependendo de quem
iniciou. Ver §A.5 — decisão necessária antes de implementar o trigger.

## A.2 Desenho proposto

`negociacoes.status` e `vendas.revertida` passam a ser a ÚNICA coisa que o
app escreve pra essas transições. Um trigger no banco reage e propaga —
simétrico, testado uma vez, impossível de esquecer numa tela nova.

```sql
-- ---------- 1. Criar negociação (INSERT) ----------
-- substitui os blocos #2 e #8: app só faz insert into negociacoes(...);
-- o trigger decide quem avança de verdade e quem fica pendente.
create function propaga_criacao_negociacao()
returns trigger language plpgsql as $$
declare
  quem_criou uuid := corretor_atual_id();
begin
  -- lado do imóvel: só avança de verdade se quem criou É o dono do imóvel
  if new.corretor_imovel_id = quem_criou then
    update imoveis set etapa = 'e', em_negociacao_flag = true
      where id = new.imovel_id and etapa <> 'e';
  end if;

  -- lado do lead: só avança de verdade se quem criou É o dono do lead
  if new.corretor_cliente_id = quem_criou and new.lead_id is not null then
    update leads set etapa = 4 where id = new.lead_id and etapa < 4;
  end if;

  -- pendência + notificação pro lado que NÃO participou da decisão
  if new.corretor_imovel_id <> quem_criou then
    update leads set pendente_aprovacao_imoveis = array_append(pendente_aprovacao_imoveis, new.imovel_id)
      where id = new.lead_id;
    insert into notificacoes (destinatario_corretor_id, tipo_evento, titulo, corpo, acao_pendente)
      values (new.corretor_imovel_id, 'E16', 'Aprovação pendente', '...', jsonb_build_object('leadId', new.lead_id, 'imovelId', new.imovel_id));
  elsif new.corretor_cliente_id <> quem_criou then
    insert into notificacoes (destinatario_corretor_id, tipo_evento, titulo, corpo)
      values (new.corretor_cliente_id, 'E16', 'Aprovação pendente', '...');
  end if;
  return new;
end;
$$;
create trigger trg_propaga_criacao_negociacao after insert on negociacoes
  for each row execute function propaga_criacao_negociacao();

-- ---------- 2. Mudança de status (UPDATE) ----------
-- substitui os blocos #1, #3, #4, #5, #6 (parte), #7: app só faz
-- update negociacoes set status = 'revertida' | 'concluida' | 'ativa' ...
create function propaga_mudanca_status_negociacao()
returns trigger language plpgsql as $$
declare
  quem_mudou uuid := corretor_atual_id();
  outra_ativa boolean;
begin
  if old.status = new.status then return new; end if;

  if new.status = 'revertida' then
    outra_ativa := exists (select 1 from negociacoes where lead_id = new.lead_id and status = 'ativa' and id <> new.id);
    if not outra_ativa then
      update leads set etapa = 3, pendente_aprovacao_imoveis = array_remove(pendente_aprovacao_imoveis, new.imovel_id)
        where id = new.lead_id and etapa in (4, 5, 6);
      if (select corretor_responsavel_id from leads where id = new.lead_id) <> quem_mudou then
        insert into notificacoes (...) values (..., 'E17', ...);
      end if;
    end if;
    outra_ativa := exists (select 1 from negociacoes where imovel_id = new.imovel_id and status in ('ativa','concluida') and id <> new.id);
    if not outra_ativa then
      update imoveis set etapa = 'd', em_negociacao_flag = false where id = new.imovel_id and etapa = 'e';
      if (select corretor_responsavel_id from imoveis where id = new.imovel_id) <> quem_mudou then
        insert into notificacoes (...) values (..., 'E17', ...);
      end if;
    end if;
    -- reverte a venda ligada, se houver (parte do bloco #5/#7)
    update vendas set revertida = true, justificativa_reversao = 'Negociação revertida'
      where negociacao_id = new.id and revertida = false;
  end if;

  if new.status = 'concluida' then
    update leads set etapa = 5 where id = new.lead_id;
    -- cria a venda automaticamente a partir da própria negociação —
    -- elimina o criarVenda.mutate manual (bloco #6), fonte de um bug real
    -- desta sessão (card avançava sem a venda existir)
    insert into vendas (negociacao_id, imovel_id, lead_id, corretor_imovel_id, corretor_cliente_id, valor_venda, data_venda, revertida)
      values (new.id, new.imovel_id, new.lead_id, new.corretor_imovel_id, new.corretor_cliente_id, new.valor_negociado, now(), false)
      on conflict (negociacao_id) do nothing; -- reversão+reconclusão não duplica
    if (select corretor_responsavel_id from leads where id = new.lead_id) <> quem_mudou then
      insert into notificacoes (...) values (..., 'E17', ...);
    end if;
  end if;

  if new.status = 'ativa' and old.status in ('revertida', 'concluida') then
    -- reversão de venda/negociação de volta pra ativa (blocos #3, #7)
    update leads set etapa = 4 where id = new.lead_id and etapa <> 4;
    update imoveis set etapa = 'e', em_negociacao_flag = true where id = new.imovel_id and etapa <> 'e';
    update vendas set revertida = true, justificativa_reversao = 'Reaberta pelo corretor'
      where negociacao_id = new.id and revertida = false;
    -- notifica os dois lados que não iniciaram a reversão
  end if;

  return new;
end;
$$;
create trigger trg_propaga_mudanca_status_negociacao after update of status on negociacoes
  for each row execute function propaga_mudanca_status_negociacao();
```

(Pseudo-SQL — o texto exato de cada notificação, o tratamento de
`clienteExterno`/negociação sem `lead_id`, e o `unique index` em
`vendas(negociacao_id)` pro `on conflict` precisam ser fechados na
implementação, não neste plano.)

## A.3 O que desaparece do app

- `MeusClientesPage.tsx` e `MeusImoveisPage.tsx` deixam de chamar
  `atualizarLead`/`atualizarImovel`/`criarNotificacao`/`criarVenda` pro
  lado VINCULADO em qualquer um dos 8 pontos — só continuam atualizando o
  PRÓPRIO registro que o usuário está arrastando (ex.: `patchFinal` do
  card que foi solto) e criando/mudando o status de `negociacoes`/`vendas`.
- `desvincularNegociacao` (bloco #4) vira, na prática, `atualizarNegociacao
  .mutate({ status: 'revertida' })` puro — o resto já é o trigger.
- Estimativa: os dois arquivos devem perder ~120-150 linhas de lógica de
  sincronia duplicada.

## A.4 O que NÃO muda

- Transições que não envolvem negociação (a→b→c→d do imóvel, 1→2→3→7→8 do
  lead) continuam escritas direto pelo app — não há "vínculo" pra
  centralizar aí.
- Os gates de UI (`gatesLead.ts`/`gatesImovel.ts`, que decidem que campos
  pedir antes de confirmar) não mudam — eles decidem o que PEDIR, o
  trigger decide o que PROPAGAR depois que o dado já foi salvo.
- RLS de `leads`/`imoveis` (migração 11, já em produção) continua
  necessária — o trigger roda com os privilégios de quem chamou (não é
  `security definer`), então as mesmas regras de coluna permitida se
  aplicam. Isso é bom: se o trigger tentar propagar algo que a RLS não
  deixaria, ele falha alto (erro), não silencioso — mais uma rede de
  segurança, não menos.

## A.5 Decisão necessária antes de implementar

A inconsistência do §A.1 (aprovação bloqueia num sentido, não bloqueia no
outro) vai ficar Óbvia e LADO A LADO no mesmo trigger assim que eu for
escrevê-lo — não dá pra centralizar sem decidir os dois casos igual.
Pergunta pro PO: negociação cross-corretor iniciada pelo lado do IMÓVEL
deveria também esperar aprovação do dono do LEAD antes do card dele
avançar (hoje não espera), ou o comportamento atual (avança na hora,
notificação é só um aviso) é o certo e o lado do CLIENTE que deveria vira
igual a esse (aprovação deixa de bloquear o imóvel também)?

## A.6 Testes

- `teste-fluxos-cross-corretor.ts` ganha casos para cada um dos 8 pontos,
  chamando só `negociacoes`/`vendas` diretamente (sem passar pelas telas)
  e conferindo que `leads`/`imoveis`/`notificacoes` mudam sozinhos — hoje
  isso só é testável de verdade clicando na tela, porque a lógica mora lá.
- Regressão explícita do bug de hoje: concluir uma negociação sem que a
  `vendas` correspondente exista deve ser IMPOSSÍVEL depois do trigger
  (a criação da venda deixa de depender do app lembrar de chamar
  `criarVenda`).

## A.7 Esforço estimado

- 2 funções de trigger + testes: ~1 dia (a lógica já está mapeada acima,
  o trabalho é escrever com cuidado e cobrir os casos de borda de
  `clienteExterno`/negociação sem `lead_id`).
- Simplificação de `MeusClientesPage.tsx`/`MeusImoveisPage.tsx`: ~meio dia,
  maior risco de regressão visual/UX do que de lógica (a lógica passa a
  ser garantida pelo banco).
- **Total: ~1,5 dia**, incluindo a decisão do §A.5 antes de começar.

---

Ordem sugerida: resolver §A.5 com o PO → implementar os 2 triggers →
migrar os 8 pontos um de cada vez, com `teste-fluxos-cross-corretor.ts`
cobrindo cada um antes de seguir pro próximo (mesma disciplina das duas
frentes já fechadas em `PLANO_ARQUITETURA_NEGOCIACOES_E_RLS.md`).
