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
| `0019_fatura_liquida_e_credito_ja_pago.sql` | Fatura desconta o que ja foi lancado em detalhe, despesa no credito nasce paga, e o pagamento passa a bastar-se para ser desfeito |
| `0020_fatura_acumula_e_fecha.sql` | A fatura aberta acumula sozinha, fecha com confirmacao, o `usado` vira derivado e o dia de fechamento passa a valer |
| `0021_push_no_celular.sql` | Assinaturas de push por aparelho, os avisos do dia, e o cron que chama a Edge Function |
| `0022_moeda_brasileira_no_push.sql` | O valor da notificacao sai em real, nao no formato americano |
| `0023_relogio_de_brasilia.sql` | Todas as funcoes passam a usar o horario de Brasilia, e o cron e reescrito pelo que vale aqui |
| `0024_avisos_entre_o_casal.sql` | Gatilhos que avisam o outro quando alguem lanca ou da baixa |
| `0025_anon_key_no_gateway_do_push.sql` | O push para de depender do verify_jwt, que um deploy zera |
| `0026_fatura_com_o_nome_do_dono.sql` | A fatura automatica passa a nascer como "Fatura <cartao> - <dono>" |
| `0027_sem_casal_no_dono.sql` | Casal deixa de ser dono: o que era dele passa para a Thainy |

A numeracao 0003, 0004 e 0005 estava reservada na especificacao tecnica para funcoes,
triggers e cron. Como storage e o ajuste de seguranca entraram antes, a ordem do disco
deixou de bater com a do documento. Vale a ordem do disco.

## Edge Functions

`enviar-push` manda as notificacoes do dia. A fonte esta em
`supabase/functions/enviar-push/index.ts` e foi publicada pelo MCP.

Ela roda com `verify_jwt` desligado de proposito. Nao e afrouxamento: com o
verify ligado, o Supabase aceitaria qualquer JWT do projeto, inclusive a anon
key, que qualquer pessoa le no bundle do app. No lugar disso a funcao confere um
token proprio, que vive no Vault e so a chave de servico consegue ler. E mais
estrito, nao menos.

Tres segredos vivem no Vault e nunca em coluna comum nem no codigo:
`vapid_private` (a chave que assina as mensagens), `token_cron_push` (o que o
cron apresenta) e `url_push` (o endereco da funcao). As funcoes que os leem sao
negadas a `anon` e `authenticated`, e concedidas so a `service_role`.

Para um teste manual, a funcao aceita `{"teste_para": "<uuid do perfil>"}` no
corpo e manda um aviso unico para os aparelhos daquele perfil.

## Decisoes que valem lembrar

- **O aviso de evento vai para o outro, nunca para quem fez.** Quem acabou de
  cadastrar ja sabe o que cadastrou, e receber a propria acao de volta e o
  caminho mais curto para a pessoa desligar a notificacao. Disso saem as tres
  excecoes: escrita sem `auth.uid()` nao avisa, porque e o cron e a virada de
  mes replica dezenas de linhas de uma vez; parcela de numero 2 em diante nao
  avisa, porque a compra foi uma so; e baixa que nasce na mesma transacao do
  lancamento nao avisa, porque o aviso de "novo lancamento" ja saiu no mesmo
  instante. Esta ultima cobre a despesa no credito, o ajuste de saldo e o check
  "ja foi paga" do cadastro.
- **A Edge Function nao pode depender do `verify_jwt`.** Ele e configuracao do
  painel e volta ao padrao ligado a cada deploy. Ja quebrou o push inteiro em
  silencio, inclusive o aviso diario, porque o token do Vault nao e um JWT e o
  gateway passou a recusar antes de a funcao rodar. Agora vao dois headers: a
  anon key no `Authorization`, que e publica e so serve para o gateway deixar
  passar, e o segredo do Vault no `x-token-push`, que e a prova de verdade.
- **Aviso que falha nao pode derrubar o lancamento.** Os gatilhos de
  notificacao terminam em `exception when others then raise warning`, porque o
  lancamento e o fato e o aviso e so o recado.

- **O banco roda em UTC, e ninguem deve confiar nisso.** `current_date` e
  `localtime` estao proibidos nas funcoes: use `private.fn_hoje()` e
  `private.fn_agora_hora()`, que devolvem o horario de Brasilia. Sao explicitas
  de proposito, para valerem igual no cron, no PostgREST e no SQL Editor, sem
  depender de configuracao de sessao. O que o UTC causava: despesa no credito
  lancada as 11h30 nascia paga as 14h30, e entre 21h e meia-noite o banco ja
  achava que era o dia seguinte, errando status, virada de mes e avisos.
- **O pg_cron agenda em UTC.** Os horarios sao escritos pelo que valem aqui:
  `10 3 1 * *` e 00:10 do dia 1 em Brasilia. Antes a virada estava em
  `10 0 1 * *`, que e 21:10 do dia 30 ou 31, ou seja, rodava antes de o mes
  virar.
- **O payload do push vai em ASCII puro.** Os acentos seguem escapados em
  `\uXXXX` e o `JSON.parse` do service worker os reconstroi. Enviar o texto com
  bytes multibyte fazia os acentos chegarem no iPhone como losango de
  substituicao, e nem passar o Buffer com encoding explicito resolvia.

- **Push no iOS so existe com o app instalado na tela de inicio**, do iOS 16.4
  em diante. No Safari em aba a API nem aparece, e por isso a tela de Perfil
  detecta esse caso e explica em vez de mostrar um botao que nao funcionaria.
- **Nao ha agendamento local em PWA.** Quem dispara "vence amanha" e o servidor,
  pelo `pg_cron`, nunca o aparelho. E o motivo de o push depender do cron e nao
  de um timer no navegador.
- **Os avisos vao agrupados por tipo.** Tres contas vencendo amanha viram uma
  notificacao, nao tres: senao vira spam e o usuario desliga tudo.
- **Assinatura que responde 404 ou 410 e apagada na hora.** Significa aparelho
  sem o app ou permissao revogada, e insistir so gasta invocacao. Erro
  passageiro apenas conta uma falha, e depois de cinco a assinatura para de ser
  tentada.

- O saldo da conta nao e digitado, e consequencia. Quem move e o gatilho
  `trg_saldo_da_conta`, que olha a forma do PAGAMENTO, nao a do lancamento, porque a
  tela de baixa deixa pagar por um caminho diferente do previsto. So mexe quando a
  referencia aponta para uma carteira `tipo = 'conta'`: cartao de credito e as
  referencias de dinheiro (`'Rodolfo'`, `'Thainy'`) passam batido, e por isso o teste de
  formato de uuid vem antes do cast, senao a baixa em dinheiro estouraria.
- **O `usado` do cartao e derivado, nunca digitado.** Ele e a soma das faturas que ainda
  nao foram pagas: a aberta vale o que ja foi lancado nela, a fechada vale o confirmado.
  Mantido por `private.fn_recalcula_usado`, chamado por gatilho em `lancamentos` e em
  `pagamentos`.
- **A fatura tem dois tempos.** Aberta, ela acumula as compras do ciclo sozinha e nao tem
  excedente. Fechada, vale o valor confirmado, e o que passa da soma das compras e o
  excedente, que e o que entrou nela sem ter sido lancado em detalhe. Fechar so vale do
  acumulado para cima: abaixo disso sobraria um excedente negativo, que nao existe.
- **O dia de fechamento decide o ciclo.** `private.fn_ciclo_do_cartao` escolhe a fatura de
  uma compra: passou do fechamento, vai para a proxima; e ciclo ja fechado ou pago nao
  recebe compra nova. O campo `dia_fechamento` estava no schema desde a 0001 sem nunca ser
  usado.
- **Caixa e competencia sao numeros diferentes, e a view expoe os dois.** `valor_caixa`
  e o que sai da conta quando a fatura for paga, sempre o valor cheio. `valor_exibido` e
  `valor_realizado` sao de competencia: na fatura valem o liquido, ja sem o que foi
  lancado em detalhe naquele ciclo. Somar o caixa no balanco conta a mesma compra duas
  vezes; somar o liquido na projecao deixa o casal otimista no valor do detalhado.
- **A fatura paga congela sozinha**, porque `valor_caixa` cai em `pagamentos.valor_pago`
  quando existe baixa. Nao ha gatilho de congelamento, e por isso nao ha dependencia da
  ordem alfabetica dos gatilhos de `pagamentos`.
- **Fora do ciclo aberto a fatura nao le o `usado`.** Ele e um numero so, do mes corrente,
  nao uma serie. A fatura de um mes passado usa o que `fn_virada_mes` congelou em
  `valor_previsto` antes de replicar. Sem isso, duas faturas em aberto mostrariam o mesmo
  valor e a duplicacao voltaria por outra porta.
- **O pagamento guarda `lanc_tipo` e `cartao_id`.** Nao e estado duplicado por descuido:
  na exclusao em cascata o lancamento pai ja nao existe, e consultar ele ali fazia o
  saldo somar em vez de subtrair (erro de 2x em receita) e a fatura nunca devolver o
  limite. O pagamento e um fato historico e precisa bastar-se para ser desfeito.
- **Despesa no credito nasce paga por gatilho em `lancamentos`, nao na RPC.** Ha tres
  caminhos de escrita (a funcao, o update da tela de edicao e o insert da virada de mes)
  e a regra vale nos tres. A guarda `valor_previsto > 0` e obrigatoria: sem ela a virada
  de mes estoura o `not null` de `valor_pago` dentro do cron, para todos os casais.
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
