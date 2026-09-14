# Épico 0 · Perguntas iniciais e credenciais

Este é o roteiro que o Claude Code deve executar na **primeira sessão**, antes de escrever qualquer código. O objetivo é coletar tudo de uma vez para trabalhar com autonomia depois.

Instruções para o Claude Code: faça as perguntas em blocos, aguarde as respostas de cada bloco, e ao final gere `PROGRESSO.md` com as decisões registradas e `.env.local` com as credenciais. Se alguma resposta faltar, use o padrão sugerido e registre a suposição em `PROGRESSO.md`.

---

## Bloco 1 · Acessos e infraestrutura

1. Qual o nome e a visibilidade do repositório no GitHub (privado é o padrão sugerido)? Já existe ou devo criar?
2. Você já criou o projeto no Supabase? Se sim, me passe a **Project URL** e a **anon public key** (nunca a service_role). Se não, prefere criar pelo painel ou que eu use a CLI do Supabase?
3. Em qual região o projeto Supabase está ou deve ficar (sugestão: São Paulo, para menor latência)?
4. Vamos usar a Vercel para deploy? Já tem conta conectada ao GitHub?
5. Terá domínio próprio (ex: estlim.app, estlim.rliima.com.br) ou o subdomínio da Vercel resolve por enquanto?
6. Qual gerenciador de pacotes prefere: npm, pnpm ou yarn (sugestão: pnpm)?

## Bloco 2 · Contas, cartões e dados iniciais

7. Quais contas bancárias existem hoje, com banco, dono (Rodolfo, Thainy ou RLiima) e saldo atual aproximado?
8. Quais cartões de crédito, com banco, dono, bandeira, limite, dia de fechamento e dia de vencimento?
9. A conta e o cartão da RLiima têm alguma particularidade (função débito e crédito, nome exibido)?
10. Existem carteiras de dinheiro em espécie a controlar além de Rodolfo e Thainy?
11. Devo importar os dados da planilha atual? Se sim, você consegue exportar um mês em CSV para eu criar o importador, ou prefere cadastrar manualmente pelo app?

## Bloco 3 · Categorias e lançamentos recorrentes

12. Confirma as categorias iniciais (Moradia, Alimentação, Transporte, Dívidas e parcelas, Contas fixas, Lazer, Empresa RLiima, Salário, Ajuste de saldo, Investimentos)? Quer adicionar ou remover alguma?
13. Qual o orçamento mensal de cada categoria, se já houver definido?
14. Liste as contas fixas mensais recorrentes com: descrição, a quem se paga, valor fixo ou variável, dia de vencimento, forma de pagamento e responsável.
15. Liste as receitas recorrentes com: descrição, de quem se recebe, valor fixo ou variável, dia de recebimento e conta de destino.
16. Há parcelamentos em andamento hoje? Para cada um: descrição, valor da parcela, parcela atual, total de parcelas e cartão ou conta.

## Bloco 3b · Investimentos

16b. Quais investimentos existem hoje? Para cada um: nome, é Ativo ou Caixinha, descrição, valor aplicado, rentabilidade, titular e onde está aplicado (conta de qual banco ou qual corretora).
16c. Quais corretoras usam? Tem os logos em PNG para eu subir no cadastro?
16d. Há aportes mensais recorrentes? Para cada um: valor, dia, conta de origem e investimento de destino.
16e. O valor do investimento é atualizado só pelos aportes registrados, ou você pretende ajustar manualmente o saldo conforme o rendimento (sugestão: ambos, com edição manual do valor a qualquer momento).

## Bloco 4 · Usuários e acesso ao app

17. Quem terá login: só você, ou você e a Thainy com contas separadas?
18. Se forem dois logins, ambos enxergam e editam tudo, ou a Thainy tem alguma restrição?
19. E-mails que serão usados no cadastro.
20. Quer que eu já deixe a estrutura preparada para múltiplos casais (multi-inquilino via RLS), pensando em um possível SaaS futuro? (sugestão: sim, o custo é zero agora e evita refatoração depois)

## Bloco 5 · Preferências de produto

21. O mês do app fecha no dia 1 ou em outro dia (alguns casais fecham no dia do salário)?
22. Quer notificações push de vencimentos no celular? Em quais gatilhos (véspera, no dia, atraso)?
23. O balanço mensal deve ser aprovado por qualquer um dos dois ou só por você?
24. Ao virar o mês, contas fixas variáveis devem nascer com a média dos 3 últimos valores pagos (sugestão) ou sem valor, exigindo "Adicionar valor"?
25. Quer um relatório anual consolidado já na primeira versão ou fica para depois?

---

## Credenciais a receber e onde guardar

Gere o `.env.local` (e adicione ao `.gitignore`) neste formato:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NOME=ESTLIM
```

Guardadas fora do repositório, no ambiente da Vercel e localmente:
- `SUPABASE_SERVICE_ROLE_KEY` (só para Edge Functions e scripts de seed, nunca no frontend)
- `SUPABASE_DB_PASSWORD` (para a CLI e migrations)
- Token do GitHub, se for necessário para automações

Checklist de conexões que o usuário precisa autorizar:
- [ ] GitHub conectado (repositório criado e com acesso de escrita)
- [ ] Supabase conectado (URL, anon key, senha do banco e CLI autenticada)
- [ ] Vercel conectada ao repositório, com as variáveis de ambiente cadastradas
- [ ] Storage do Supabase com bucket `avatares` criado e políticas definidas

## Saída obrigatória do Épico 0

1. `PROGRESSO.md` criado, com as respostas registradas, as suposições assumidas e os bloqueios pendentes.
2. `.env.local` preenchido e ignorado pelo git.
3. Repositório inicializado com `docs/` (documento mestre, CLAUDE.md, protótipo v27) e primeiro commit.
4. Épicos confirmados ou ajustados conforme as respostas, listados no `PROGRESSO.md` com status "a fazer".
