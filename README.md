# ESTLIM

Planejamento e controle financeiro do casal Rodolfo e Thainy, incluindo o perfil PJ RLiima.
Substitui a planilha anual de abas mensais. A palavra-chave do produto é previsibilidade.

## O que rodar no dia a dia

```bash
pnpm install     # primeira vez, ou depois de trocar de branch com dependência nova
pnpm dev         # http://localhost:5173
pnpm validar     # lint, testes e build. Rodar antes de qualquer commit importante
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `pnpm test` | Testes de unidade dos formatadores, máscaras, formas e erros |
| `pnpm test:watch` | O mesmo, reagindo a cada salvamento |
| `pnpm lint` | ESLint, sem `any` e exigindo `import type` |
| `pnpm build` | Checagem de tipos mais o build de produção com o service worker |
| `pnpm preview` | Serve o build pronto, com PWA ligado, em http://localhost:4173 |
| `pnpm icones` | Regera os PNGs do app a partir da marca |
| `pnpm types:supabase` | Regera `src/types/database.ts` do schema (precisa da CLI do Supabase) |

O `.env.local` fica fora do git. Copie o `.env.example` e preencha com a URL e a anon key do
projeto. Nunca coloque a `service_role` no frontend: ela só vale em Edge Functions e scripts.

## Como o projeto está organizado

```
src/
├── app/        rotas, shell, guarda de login, cliente de dados, persistência offline
├── features/   uma pasta por módulo: dashboard, lancamentos, carteira, investimentos,
│               categorias, agenda, perfil, auth, catalogo
├── hooks/      todo acesso a dados vive aqui, sempre via TanStack Query
├── ui/         componentes reutilizáveis do design system
├── lib/        formatadores, máscaras, marcas, formas de pagamento, erros, confete
├── store/      zustand: tema, filtros, toasts, sheets
├── styles/     tokens.css e prototipo.css (cópia fiel do v40), correcoes.css, login.css, pwa.css
└── types/      database.ts, gerado do schema
supabase/
├── migrations/ o schema inteiro, em ordem. Nunca alterar nada pelo painel
├── testes/     fluxos críticos e RLS, em SQL
└── seed.sql    o casal e as dez categorias padrão
scripts/        gerador dos ícones do PWA
docs/           documento mestre, especificação técnica, PROGRESSO e o protótipo v40
```

Regra que não se quebra: **nenhum componente fala com o Supabase direto**. Tudo passa por um
hook em `src/hooks/`. Assim o cache, a invalidação e o tratamento de erro ficam num lugar só.

## Banco de dados

Detalhes em [supabase/README.md](supabase/README.md). O resumo:

- Schema só muda por migration versionada em `supabase/migrations`, aplicada pelo MCP do Supabase.
- Toda tabela tem RLS por `casal_id`. A função que resolve o casal mora no schema `private`,
  fora do alcance da API REST.
- Cinco regras de negócio moram no banco, não só na tela: motivo de ajuste obrigatório, valor
  obrigatório em lançamento de valor fixo, aporte nunca no crédito, categoria de sistema
  intocável, e a fatura do cartão refletindo o limite utilizado.
- Dois agendamentos com pg_cron: virada de mês no dia 1 às 00:10 e marcação de atrasados
  todo dia às 03:00 (horário do servidor, que é UTC).

Depois de cada migration, regerar os tipos e rodar `pnpm build`.

## Testes

| Onde | O que cobre | Como rodar |
|---|---|---|
| `src/lib/*.test.ts` | Moeda em BRL, data em DD/MM/AAAA, hora em 24h, máscaras, formas de pagamento e tradução de erro | `pnpm test` |
| `supabase/testes/fluxos_criticos.sql` | Baixa com timestamp, fatura zerando e restaurando o limite, parcelas com o dia do cartão cruzando o ano, ajuste com motivo obrigatório, aporte somando e subtraindo, integridade de investimento | SQL Editor do painel, com papel de serviço |
| `supabase/testes/rls_e_restricoes.sql` | Isolamento entre casais nos quatro verbos e as restrições de schema | SQL Editor do painel, com papel de serviço |

Os dois scripts SQL limpam tudo o que criam. Se algum passo falhar, a exceção sobe com a
palavra FALHOU e nada fica gravado pela metade.

## Backup

O Supabase no plano gratuito guarda backup automático diário, com retenção curta. Para o
histórico financeiro de vocês isso não basta sozinho. O que fazer:

**Uma vez por mês, depois de aprovar o balanço:**

1. No painel do Supabase, Database > Backups, baixe o backup do dia.
2. Guarde o arquivo em dois lugares diferentes (por exemplo o computador e um drive na nuvem).

**Exportação manual dos dados, quando quiser um CSV legível:**

No SQL Editor, rode e baixe o resultado de cada um:

```sql
select * from v_lancamentos order by data_vencimento;
select l.descricao, p.data_pagamento, p.hora_pagamento, p.valor_pago
  from pagamentos p join lancamentos l on l.id = p.lancamento_id
 order by p.data_pagamento;
select * from carteiras order by tipo, nome;
select * from investimentos order by sub, nome;
select * from ajustes order by criado_em;
```

**Restaurar:** Database > Backups > Restore, no próprio painel. Depois de qualquer restauração,
confira que os dois agendamentos do pg_cron continuam ativos:

```sql
select jobname, schedule, active from cron.job;
```

O que **não** é backup: o cache offline no aparelho. Ele existe para o app abrir sem rede, tem
teto de um dia e some quando alguém sai da conta.

## Publicação

O deploy é na Vercel, ligado ao repositório: todo push na `main` publica. As três variáveis de
ambiente precisam estar cadastradas nos três ambientes (Production, Preview e Development):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_NOME
```

O `vercel.json` já traz as reescritas da SPA e o cabeçalho de cache certo para o `sw.js`, que
não pode ser cacheado, senão a atualização do app nunca chega.

## Quem pode entrar

O cadastro é fechado por convite: a tabela `convites` guarda os e-mails liberados e um gatilho
recusa qualquer outro, mesmo por chamada direta à API. Cada convite vale uma vez.

Para liberar mais alguém depois:

```sql
insert into convites (email, casal_id, nome)
values ('novo@exemplo.com', '00000000-0000-4000-8000-000000000001', 'Nome');
```

## Padrões que não se negociam

- Datas sempre DD/MM/AAAA, horas sempre 24h, moeda em BRL, tudo em português do Brasil.
- Campos de data e hora são inputs mascarados com teclado numérico, nunca `type="date"`.
- Valores em `numeric(12,2)` no banco, jamais float.
- O protótipo `docs/ESTLIM_v40.html` é a especificação visual. Divergências ficam isoladas em
  `src/styles/correcoes.css`, cada uma com o motivo escrito.
- Sem travessão em texto de interface.
