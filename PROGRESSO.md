# PROGRESSO · ESTLIM

Arquivo vivo. O Claude Code le no inicio de toda sessao e atualiza ao fim de cada entrega. E a memoria do projeto entre sessoes.

## BLOQUEIOS

| # | Bloqueio | Impacto | Como resolver |
|---|---|---|---|
| B1 | Push para o GitHub bloqueado pelo modo automatico da sessao | Commits ficam locais ate alguem empurrar | Rodolfo empurra pelo GitHub Desktop, ou libera uma regra de Bash para `git push` nas configuracoes do Claude Code |
| B2 | Projeto na Vercel ainda nao criado | Sem deploy publicado | Precisa do teamId da conta pessoal (a conta Hobby nao aparece em `list_teams`) e de um build valido no repositorio. Fica para o fim do Epico 1, quando existir app para buildar |
| B3 | Variaveis de ambiente na Vercel nao cadastradas | Build publicado sem Supabase | Depende de B2. As tres variaveis estao em `.env.example` |
| B4 | Senha do banco Supabase (`SUPABASE_DB_PASSWORD`) nao informada | CLI do Supabase nao consegue rodar `db push` | Nao bloqueia: as migrations vao ser aplicadas pelo MCP do Supabase e versionadas em `supabase/migrations` do mesmo jeito |

Nenhum bloqueio impede o andamento dos epicos 1 e 2.

## Decisoes tomadas

| Data | Decisao | Origem |
|---|---|---|
| 14/09/2026 | Repositorio `liimarodolfo/estlim-finance`, privado, ja existente e conectado pelo GitHub Desktop | Bloco 1 |
| 14/09/2026 | Projeto Supabase existente: ESTLIM-Finance, ref `uxxgvbiuknitylnmkcvr`, Postgres 17 | Bloco 1 |
| 14/09/2026 | Regiao us-east-1 mantida. Nao vale recriar o projeto so pela latencia | Bloco 1 |
| 14/09/2026 | Deploy na Vercel, conta pessoal, plano Hobby, sem custo | Bloco 1 |
| 14/09/2026 | Dominio: `estlim-finance.vercel.app`, sem dominio proprio por enquanto | Bloco 1 |
| 14/09/2026 | Gerenciador de pacotes: pnpm | Bloco 1 |
| 14/09/2026 | Migrations aplicadas pelo MCP do Supabase, sempre versionadas em `supabase/migrations` | Decisao tecnica |
| 14/09/2026 | Dois logins no mesmo casal, ambos com acesso total de leitura e escrita | Bloco 4 |
| 14/09/2026 | E-mails: rodolfo@rliima.com (Rodolfo) e thainy@rliima.com (Thainy) | Bloco 4 |
| 14/09/2026 | Estrutura multi-inquilino por `casal_id` com RLS, preparada para SaaS futuro | Bloco 4 |
| 14/09/2026 | Dados iniciais cadastrados manualmente pelo app. O seed cria so casal, perfis e categorias padrao | Bloco 2 |
| 14/09/2026 | Mes do app fecha no dia 1, mes calendario | Bloco 5 |
| 14/09/2026 | Balanco mensal pode ser aprovado por qualquer um dos dois, com registro de quem e quando | Bloco 5 |
| 14/09/2026 | Push de vencimento em tres gatilhos: vespera, no dia e no atraso | Bloco 5 |
| 14/09/2026 | **Virada de mes: contas fixas de valor variavel nascem SEM valor**, com o dot vermelho de notificacao ate o valor ser preenchido. Isso substitui a regra da media dos 3 ultimos pagos que estava na secao 4.1 do documento mestre e na `fn_virada_mes` da especificacao tecnica | Bloco 5, resposta explicita do Rodolfo |

## Suposicoes assumidas

Quando faltar resposta e o padrao sugerido for usado, registrar aqui para validacao posterior.

| # | Suposicao | Onde impacta | Como derrubar |
|---|---|---|---|
| S1 | Nenhuma conta, cartao, carteira de dinheiro ou investimento vai no seed. Tudo entra pelas telas de CRUD | Epico 2 (seed), epicos 5 e 6 | Basta cadastrar pelo app, ou pedir um seed com os dados reais |
| S2 | Categorias padrao: Moradia, Alimentacao, Transporte, Dividas e parcelas, Contas fixas, Lazer, Empresa RLiima, Salario, Ajuste de saldo e Investimentos. Protegidas: Salario, Ajuste de saldo e Investimentos | Epico 2 (seed), Epico 6 | Pedir alteracao da lista |
| S3 | Orcamento mensal de todas as categorias comeca em zero, ou seja, sem alerta de estouro ate ser definido | Epico 6 | Definir o orcamento na tela de Categorias |
| S4 | Carteiras de dinheiro em especie de Rodolfo e Thainy existem como fonte do metodo Dinheiro, com saldo zero | Epicos 5 e 7 | Ajustar saldo ou excluir a carteira |
| S5 | Importador da planilha em CSV fica fora da primeira versao, listado em ideias futuras | Escopo | Pedir como epico extra |
| S6 | Nome do casal no banco: "Esteves Liima" | Epico 2 (seed) | Trocar por migration |
| S7 | Sem relatorio anual consolidado na primeira versao | Escopo | Pedir como epico extra |
| S8 | Notificacao de "Adicionar valor" existe como notificacao no app (sino e dot vermelho), nao como push no celular | Epico 12 | Pedir push tambem para esse gatilho |

## Status dos epicos

| # | Epico | Status | Branch | Concluido em |
|---|---|---|---|---|
| 0 | Descoberta e configuracao | concluido | main | 14/09/2026 |
| 1 | Fundacao tecnica | a fazer | epico/1-fundacao-tecnica | |
| 2 | Banco de dados e seguranca | a fazer | epico/2-banco-e-seguranca | |
| 3 | Autenticacao e Perfil | a fazer | epico/3-auth-e-perfil | |
| 4 | Design system | a fazer | epico/4-design-system | |
| 5 | Carteiras | a fazer | epico/5-carteiras | |
| 6 | Categorias e Investimentos | a fazer | epico/6-categorias-e-investimentos | |
| 7 | Lancamentos | a fazer | epico/7-lancamentos | |
| 8 | Automacoes no banco | a fazer | epico/8-automacoes-no-banco | |
| 9 | Check de baixa e pagamentos | a fazer | epico/9-baixa-e-pagamentos | |
| 10 | Dashboard e Balanco | a fazer | epico/10-dashboard-e-balanco | |
| 11 | Agenda | a fazer | epico/11-agenda | |
| 12 | Realtime e notificacoes | a fazer | epico/12-realtime-e-notificacoes | |
| 13 | PWA, offline e deploy | a fazer | epico/13-pwa-e-deploy | |
| 14 | Qualidade e entrega | a fazer | epico/14-qualidade-e-entrega | |

Status possiveis: a fazer, em andamento, concluido, bloqueado.

## Diario de sessoes

### Sessao 1 · 14/09/2026 · Epico 0
- Feito: leitura dos cinco documentos; copia do CLAUDE.md para a raiz e dos demais para `docs/`; `.gitignore`, `.env.example` e `.env.local` preenchido com a URL e a anon key do projeto ESTLIM-Finance (confirmado fora do versionamento); levantamento do ambiente (Node 24.14, pnpm 11.1.3, git 2.53, sem gh, sem CLI da Vercel e sem CLI do Supabase); confirmacao de que o banco esta vazio; entrevista dos blocos 1 a 5; primeiro commit local (`fdf6076`).
- Pendente: push para o GitHub (B1), projeto e variaveis na Vercel (B2 e B3).
- Proximo passo: Epico 1, fundacao tecnica.

## Divida tecnica

| Item | Motivo do adiamento |
|---|---|
| CLI do Supabase nao instalada | As migrations vao pelo MCP. Instalar quando for preciso rodar Edge Functions localmente (Epico 12) |
| CLI da Vercel nao instalada | Deploy pelo git. Instalar se for preciso cadastrar variaveis de ambiente por linha de comando |
| `fn_virada_mes` da especificacao tecnica descreve a media dos 3 ultimos pagos | Contradiz a decisao de 14/09/2026. Implementar com valor nulo e corrigir o texto do documento no Epico 8 |

## Ideias para versoes futuras

- Importador da planilha atual (CSV)
- Metas de economia e reserva de emergencia
- Projecao de fluxo de caixa de 90 dias
- Relatorio anual consolidado e comparativo entre meses
- Multi-inquilino aberto (SaaS) aproveitando o RLS ja existente
- Push tambem para lancamentos sem valor preenchido
