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
| `0007_convite_vale_uma_vez.sql` | Convite de uso unico, fechando o cadastro de vez |
| `0008_ajuste_e_exclusao_de_carteira.sql` | `fn_criar_ajuste` e `fn_excluir_carteira` |
| `0009_categorias_protegidas_e_exclusoes.sql` | Trava das categorias de sistema e as exclusoes de categoria, corretora e investimento |
| `0010_mensagens_de_erro_em_portugues.sql` | So o texto das excecoes, que aparecem no toast |
| `0011_parcelas_e_fatura_automatica.sql` | `fn_criar_lancamentos` e os gatilhos da fatura, do aporte e do status |
| `0012_virada_de_mes_e_atrasados.sql` | Virada de mes e atrasados, agendados com pg_cron |
| `0013_so_despesa_nasce_atrasada.sql` | Receita vencida segue pendente, nao atrasada |
| `0014_realtime.sql` | Tabelas na publicacao do Realtime |
| `0015_endurecimento_das_funcoes.sql` | `search_path` fixo em tudo e as funcoes do cron fora da API |
| `0016_categoria_por_tipo.sql` | Categoria passa a dizer se serve a despesa, a receita ou a ambas |
| `0017_observacoes_comprovante_e_baixa_no_cadastro.sql` | Colunas novas em `lancamentos`, bucket `comprovantes` e o check de ja pago no cadastro |
| `0018_saldo_automatico_das_contas.sql` | Gatilho que faz o saldo da conta seguir os pagamentos, mais o recalculo retroativo |

A numeracao 0003, 0004 e 0005 estava reservada na especificacao tecnica para funcoes,
triggers e cron. Como storage e o ajuste de seguranca entraram antes, a ordem do disco
deixou de bater com a do documento. Vale a ordem do disco.

## Decisoes que valem lembrar

- O saldo da conta nao e digitado, e consequencia. Quem move e o gatilho
  `trg_saldo_da_conta`, que olha a forma do PAGAMENTO, nao a do lancamento, porque a
  tela de baixa deixa pagar por um caminho diferente do previsto. So mexe quando a
  referencia aponta para uma carteira `tipo = 'conta'`: cartao de credito e as
  referencias de dinheiro (`'Rodolfo'`, `'Thainy'`) passam batido, e por isso o teste de
  formato de uuid vem antes do cast, senao a baixa em dinheiro estouraria.
- O `usado` do cartao continua sendo preenchido a mao, de proposito. Somar toda despesa
  no credito ao limite utilizado quebraria a fatura automatica em compra parcelada, que
  gera as N parcelas de uma vez.
- O comprovante guarda o caminho no bucket, nunca a URL assinada. Link assinado vence; o
  caminho nao.

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
