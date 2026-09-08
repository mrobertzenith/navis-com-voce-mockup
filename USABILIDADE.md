# Retorno ao documento de usabilidade — Navis, set/2026

Resposta ponto a ponto ao documento **"Usabilidade Navis com você"**, com o que foi
implementado, como foi verificado e o que muda para quem usa o sistema.
Tudo aplicado em produção (https://navis-crm.vercel.app).

---

## 1. Botão "Concluir cadastro" do cliente não funcionava · **IMPORTANTE** ✅ corrigido

**Causa:** o app enviava "sem visitas agendadas" como valor nulo, e a coluna do banco não
aceita nulo — o banco recusava o cadastro. Como a tela não tinha tratamento de erro, o
clique não produzia nada: nem sucesso, nem mensagem. Todo cadastro de cliente na etapa
"Novo Cliente" falhava, sempre.

**Correção em duas camadas:**
- a conversão de dados nunca mais grava nulo em campo obrigatório do banco — vale para
  todos os campos de lista, não só este (`src/lib/supabaseMap.ts`);
- as telas de cliente e de imóvel agora **mostram o erro** quando o banco recusa algo, em
  vez de falhar em silêncio. O botão "Próximo" também avisa quando há campo inválido.

**Verificação:** cadastro completo pela interface → "Cliente #2401 criado com sucesso",
registro conferido no banco. O bloqueio relatado no item 6 do documento
("não consegui evoluir além de Publicado") está desfeito.

## 2. Variação na escrita do bairro · **IMPORTANTE** ✅ resolvido

**Pergunta do documento:** "Jardim Botânico", "Jd. Botanico", "jd Botanico",
"Olhos d'Água", "Olhos dagua" — como o sistema lida?

**Resposta: todas essas formas são reconhecidas como o mesmo bairro.** A comparação
ignora acento, maiúscula, pontuação e expande abreviações comuns de endereço
(jd, vl, pq, res, cj, sta, sto, pres…). "Jardim das Flores" e "Jardim Flores" também
se encontram.

**Além de tolerar, o sistema previne:** os cadastros sugerem os bairros e cidades que a
equipe já usou. Se o corretor digita "jd botanico" e alguém já cadastrou
"Jardim Botânico", o sistema **adota a grafia existente** — a base não se enche de
variações do mesmo lugar.

**Verificação:** 9 testes automatizados com os exemplos exatos do documento
(`src/domain/normalizacao.test.ts`), mais teste na interface: digitei "jd botanico" e o
cliente foi salvo com "Jardim Botânico".

> Limite conhecido: nomes realmente diferentes continuam diferentes ("Centro" ≠ "Centro
> Norte", "Alto da Boa Vista" ≠ "Boa Vista") — o sistema não adivinha intenção, só
> reconhece grafias do mesmo nome.

## 3. Fotos no cadastro de imóvel · ✅ removidas por completo

Não é mais opcional: **deixou de existir**. O passo "Fotos" saiu do cadastro (agora são
4 passos, não 5), o campo, o componente de upload e as imagens de exemplo foram
excluídos do sistema, e a coluna de fotos foi removida do banco.

## 4. Imagem no card do imóvel · ✅ removida

Cards e detalhe do imóvel não exibem mais imagem alguma — ficaram só com o conteúdo
que importa (tipo, endereço, valor, características). Mais limpo, como pedido.

## 5. Diferenciais livres, com memória · ✅ implementado

No passo "Diferenciais", além da lista padrão, o corretor pode **escrever seus próprios
diferenciais** ("Vista para a serra", "Aceita permuta", "Portaria 24h"…).

- **Não entram no cálculo de match** — como observado no documento, não há padrão comum
  entre corretores. A tela deixa isso explícito para o corretor.
- **Aparecem no detalhe do imóvel**, para qualquer corretor que abrir o card.
- **Memória:** o sistema lembra os termos que a equipe já usou e os oferece como
  sugestão de um clique, evitando dez formas de escrever a mesma coisa.

---

## Sobre os testes que vocês planejaram

Os cinco imóveis reais cadastrados (um em cada etapa) estão preservados — nada foi
apagado. Com o cadastro de cliente destravado, a sequência planejada no documento agora
é possível:

| Teste planejado | Situação |
|---|---|
| Cadastrar clientes com cada perfil | liberado |
| Cliente sem imóvel na base, e depois imóvel com o perfil dele | liberado |
| Evoluir imóvel além de "Publicado" | liberado (dependia de ter cliente) |
| Testes cruzados com o login da Julia | liberado |

**Nota de transparência:** a remoção das fotos apagou a coluna correspondente no banco.
Se algum dos cinco imóveis tinha link de foto preenchido, esse link foi descartado junto —
efeito pretendido do pedido, mas registrado aqui para não haver surpresa.

**Sugestão para a próxima rodada:** ao testar com dois logins, observe o comportamento
cross-corretor (aprovação de negociação com imóvel de outro corretor) — é o fluxo mais
complexo do sistema e o que menos recebeu teste de uso real até agora.
