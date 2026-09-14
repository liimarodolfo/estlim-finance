# Banco do ESTLIM

Projeto Supabase `ESTLIM-Finance`, ref `uxxgvbiuknitylnmkcvr`, Postgres 17, regiao us-east-1.

## Como o schema muda

Schema so muda por migration versionada nesta pasta, nunca pelo painel. As migrations
sao aplicadas pelo MCP do Supabase (decisao do Epico 0, para nao depender da senha do
banco) e o arquivo aqui e sempre identico ao que o banco recebeu.

Depois de cada migration, regerar os tipos:

```bash
pnpm types:supabase
```

## Migrations

| Arquivo | O que faz |
|---|---|
| `0001_schema.sql` | Enums, as onze tabelas, indices e a view `v_lancamentos` da fatura sincronizada |
| `0002_rls.sql` | RLS em todas as tabelas, por `casal_id` |
| `0003_storage.sql` | Buckets `avatares` e `corretoras`, privados, 2 MB, so imagem |
| `0004_endurecimento.sql` | Revogacoes sugeridas pelo linter. Quebrou o RLS e foi corrigida pela seguinte |
| `0005_meu_casal_em_schema_privado.sql` | Move `meu_casal()` para o schema `private` e refaz as policies |
| `0006_convites_e_perfil_no_cadastro.sql` | Tabela `convites` e o gatilho que abre o perfil no cadastro |

A numeracao 0003, 0004 e 0005 estava reservada na especificacao tecnica para funcoes,
triggers e cron. Como storage e o ajuste de seguranca entraram antes, o Epico 8 comeca
em `0007_functions.sql`.

## Decisoes que valem lembrar

- `private.meu_casal()` e `security definer` de proposito. Se fosse invoker, a policy de
  `perfis` chamaria a si mesma e entraria em recursao. Ela mora em `private` porque o
  PostgREST so expoe `public`, e assim a funcao nao vira rota REST. Revogar o `execute`
  dela do papel `authenticated` nao e alternativa: policy precisa de `execute` na funcao
  que chama, e sem isso o RLS inteiro para de responder.
- A view `v_lancamentos` usa `security_invoker = true`. Sem isso a view rodaria com os
  direitos do dono e furaria o RLS.
- O cadastro e fechado por convite. Como o app usa a anon key, a rota de signup fica
  aberta na internet; o gatilho `private.fn_perfil_no_cadastro()` recusa qualquer e-mail
  que nao esteja em `convites` e, para os convidados, ja cria o perfil no casal certo.
  Liberar mais alguem depois e uma linha em `convites`.
- Tres regras de negocio ja estao no schema, nao so na tela: motivo de ajuste obrigatorio,
  valor obrigatorio quando o lancamento e de valor fixo, e aporte nunca no credito.

## Testes

`testes/rls_e_restricoes.sql` monta dois casais, confere o isolamento nos quatro verbos e
testa as restricoes de schema, limpando tudo no fim. Rodar com o papel de servico.

## Seed

`seed.sql` cria o casal Esteves Liima e as dez categorias padrao, com icone e cor iguais
aos do prototipo. E idempotente. Contas, cartoes, investimentos e lancamentos entram pelo
proprio app.
