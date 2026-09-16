# PROGRESSO · ESTLIM

Arquivo vivo. O Claude Code le no inicio de toda sessao e atualiza ao fim de cada entrega. E a memoria do projeto entre sessoes.

## BLOQUEIOS

| # | Bloqueio | Impacto | Como resolver |
|---|---|---|---|
| B1 | Push para o GitHub bloqueado pelo modo automatico da sessao | Commits ficam locais ate alguem empurrar | Rodolfo empurra pelo GitHub Desktop, ou libera uma regra de Bash para `git push` nas configuracoes do Claude Code |
| B7 | Resolvido em 16/09/2026 | Push implementado ponta a ponta. O segredo nao precisou da CLI: o Vault do Supabase guarda as chaves e a Edge Function as le pela chave de servico | Falta so o Rodolfo tocar em Ativar notificacoes no iPhone, com o app instalado na tela de inicio |
| B8 | Protecao contra senha vazada desligada no Supabase Auth | O unico alerta que sobrou no linter de seguranca | Ligar em Authentication > Policies > Password Security no painel. E um clique |
| B2 | Resolvido em 15/09/2026 | Projeto `estlim-finance` criado na conta `rodolfo-liimas-projects`, com o repositorio `liimarodolfo/estlim-finance` conectado na branch `main` | Feito pelo Rodolfo no painel. O MCP da Vercel so consegue criar deploy: `create_git_project` devolve 403 pedindo reautenticacao do escopo, e nao existe ferramenta nenhuma para variavel de ambiente |
| B3 | Resolvido em 15/09/2026 | As tres variaveis cadastradas nos tres ambientes | Feito pelo Rodolfo, importando o `.env.vercel` |
| B4 | Senha do banco Supabase (`SUPABASE_DB_PASSWORD`) nao informada | `pnpm types:supabase` e a CLI nao rodam | Contornado: as migrations vao pelo MCP e os tipos sao gerados pelo MCP tambem. Informar a senha so se quiser rodar a CLI localmente |
| B5 | Tela de Perfil nunca rodou com uma conta de verdade | Foto, salvar dados e troca de senha compilam e estao escritos, mas nao conferi na tela | Rodolfo abre o Perfil, troca a foto e salva o nome. Se algo sair torto, e so avisar |

Nenhum bloqueio impede o andamento dos epicos 1 e 2.

## Publicacao

| Item | Onde |
|---|---|
| Repositorio | github.com/liimarodolfo/estlim-finance, branch `main` |
| Projeto Vercel | `estlim-finance`, conta `rodolfo-liimas-projects`, plano Hobby |
| Endereco | https://estlim-finance.vercel.app |
| Banco | Supabase `ESTLIM-Finance`, ref `uxxgvbiuknitylnmkcvr` |

Todo push na `main` publica sozinho. Conectar o repositorio nao dispara build: a
Vercel espera o primeiro push depois da conexao.

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
| 14/09/2026 | Tailwind 4 com os tokens do prototipo expostos via @theme, e o tema por atributo data-theme, nao por classe | Epico 1 |
| 14/09/2026 | react-router-dom 6.30 com as future flags do 7 ligadas, recharts 3, framer-motion 12 | Epico 1 |
| 14/09/2026 | CSS do prototipo portado em tres arquivos: tokens.css e prototipo.css sao copia fiel, correcoes.css isola cada divergencia com o motivo escrito | Epico 1 |
| 14/09/2026 | Fonte Inter servida pelo pacote @fontsource-variable e FontAwesome so no conjunto solid, que e o unico usado no prototipo. O app nao depende de CDN | Epico 1 |
| 14/09/2026 | `meu_casal()` mora no schema `private`, nao em `public`. O PostgREST so expoe `public`, entao a funcao nao vira rota REST e o linter de seguranca fica limpo. Revogar o execute dela nao era opcao: policy precisa de execute na funcao que chama | Epico 2 |
| 14/09/2026 | Tres regras de negocio ficaram no schema, nao so na tela: motivo de ajuste obrigatorio, valor obrigatorio em lancamento de valor fixo, e aporte nunca no credito | Epico 2 |
| 14/09/2026 | Numeracao das migrations deslocada: storage e o ajuste de seguranca ocuparam 0003 a 0005, entao o Epico 8 comeca em `0006_functions.sql` | Epico 2 |
| 14/09/2026 | Cadastro fechado por convite. A tabela `convites` guarda os e-mails liberados e um gatilho recusa qualquer outro no proprio banco, ja que a rota de signup fica aberta na internet com a anon key | Epico 3 |
| 14/09/2026 | A tela de login e a unica desenhada fora do prototipo, que nao cobre autenticacao. Usa so os tokens e componentes que ja existem, sem linguagem visual nova | Epico 3 |
| 14/09/2026 | A troca de senha reautentica com a senha atual antes de trocar, porque o Supabase nao confere sozinho no `updateUser` | Epico 3 |
| 14/09/2026 | Cadastro fechado de vez: o botao de primeiro acesso saiu da tela e o convite passou a valer uma vez so | Epico 4 |
| 14/09/2026 | O Sheet fica sempre no DOM e so troca de classe, como no prototipo, em vez de montar e desmontar. Montar na hora criava corrida com a classe `open` e a transicao de entrada nao acontecia. Fechado, recebe `inert` | Epico 4 |
| 14/09/2026 | O catalogo do design system em `/catalogo` e ferramenta de desenvolvimento: existe so no `pnpm dev` e some do build de producao, onde a rota cai no nao encontrado, atras do login como todas as outras | Epico 4 |
| 14/09/2026 | Excluir carteira nao apaga historico: sem movimento a carteira some de vez, com movimento ela e arquivada (`ativo = false`) e sai das telas. Conta com investimento aplicado nao sai de jeito nenhum | Epico 5 |
| 14/09/2026 | O formulario de conta ganhou o campo Descricao, que o prototipo nao tem. Sem ele o "Ag 0912 · CC 34871-2" que aparece na linha da conta nunca poderia ser preenchido | Epico 5 |
| 14/09/2026 | Pagar um lancamento nao mexe no saldo da conta. O saldo so muda por ajuste, como no prototipo. Quem acompanha o realizado e o Balanco | Epico 5 |
| 14/09/2026 | Salario e Investimentos ficam fora da lista de orcamento da tela de Categorias: uma e receita, a outra e transferencia de patrimonio, e nenhuma das duas e consumo do mes. Continuam existindo para os lancamentos | Epico 6 |
| 14/09/2026 | Excluir categoria comum remaneja os lancamentos dela para Contas fixas antes de apagar, para nenhum lancamento ficar orfao | Epico 6 |
| 14/09/2026 | Todo erro do Supabase e convertido em Error na fronteira dos hooks. Sem isso o toast imprimia "[object Object]", porque o Supabase devolve objeto simples e nao Error | Epico 6 |
| 14/09/2026 | Os graficos sao os do prototipo (donut em SVG na mao e barras em CSS), nao Recharts. Recharts continua instalado, mas usar mudaria o desenho, e o prototipo e especificacao | Epico 10 |
| 14/09/2026 | O ciclo da baixa virou um hook compartilhado (`useFluxoDeBaixa`), porque acontece na lista de Lancamentos, nos proximos vencimentos do Dashboard e na Agenda | Epico 10 |
| 14/09/2026 | Icones do PWA gerados por script proprio (`scripts/gerar-icones.mjs`), desenhando a marca direto em PNG com zlib, em vez de trazer uma biblioteca de imagem so para rasterizar um SVG | Epico 13 |
| 14/09/2026 | `fn_virada_mes` e `fn_marcar_atrasados` moram no schema `private`. No `public` elas viravam rota REST, e sao security definer que atravessam todos os casais: qualquer anonimo poderia disparar replicacao de contas fixas no banco inteiro | Epico 14 |
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
| 1 | Fundacao tecnica | concluido | epico/1-fundacao-tecnica | 14/09/2026 |
| 2 | Banco de dados e seguranca | concluido | epico/2-banco-e-seguranca | 14/09/2026 |
| 3 | Autenticacao e Perfil | concluido | epico/3-auth-e-perfil | 14/09/2026 |
| 4 | Design system | concluido | epico/4-design-system | 14/09/2026 |
| 5 | Carteiras | concluido | epico/5-carteiras | 14/09/2026 |
| 6 | Categorias e Investimentos | concluido | epico/6-categorias-e-investimentos | 14/09/2026 |
| 7 | Lancamentos | concluido | epico/7-lancamentos | 14/09/2026 |
| 8 | Automacoes no banco | concluido | epico/7-lancamentos | 14/09/2026 |
| 9 | Check de baixa e pagamentos | concluido | epico/7-lancamentos | 14/09/2026 |
| 10 | Dashboard e Balanco | concluido | epico/7-lancamentos | 14/09/2026 |
| 11 | Agenda | concluido | epico/7-lancamentos | 14/09/2026 |
| 12 | Realtime e notificacoes | concluido | epico/7-lancamentos | 14/09/2026 |
| 13 | PWA, offline e deploy | concluido | epico/7-lancamentos | 14/09/2026 |
| 14 | Qualidade e entrega | concluido | epico/7-lancamentos | 14/09/2026 |

Status possiveis: a fazer, em andamento, concluido, bloqueado.

Sobre a coluna Branch: do Epico 7 em diante tudo saiu na mesma branch. Os epicos
7, 8 e 9 sao inseparaveis na pratica (o CRUD de lancamento depende das funcoes do
banco, que dependem do ciclo da baixa), e o Rodolfo pediu para seguir ate o fim
sem parar. Cada epico tem o proprio commit, com o que foi feito e o que foi
testado escrito na mensagem.

## Pontos de design a confirmar

| # | Ponto | Situacao |
|---|---|---|
| D1 | Em telas de 375px o rotulo "Lancamentos" na aba ativa da navegacao fica cortado. Conferi no proprio `ESTLIM_v40.html` na mesma largura e o corte acontece igual, entao mantive fiel ao prototipo em vez de mexer por conta propria. Os principios de design pedem rotulo legivel, entao vale decidir: encurtar o rotulo para "Lancar", aumentar a proporcao da aba ativa, ou deixar como esta | aguardando Rodolfo |
| D3 | A tela de login nao tem botao de tema, porque o botao mora na topbar e a topbar nao aparece antes do login. Quem entrar pela primeira vez ve o tema claro | aguardando Rodolfo, se incomodar eu coloco o botao |
| D2 | As pills de mes rolam sozinhas para deixar o mes ativo visivel. O prototipo nao faz isso e abre sempre em Jan, mesmo com Ago ativo. Considerei defeito e corrigi | aplicado, avisar |

## Diario de sessoes

### Sessao 9 · 16/09/2026 · O push funcionando, e o fuso que ele revelou

A notificacao chegou no iPhone do Rodolfo no primeiro teste, o que fechou o
caminho inteiro: assinatura, envio pela Apple, service worker e exibicao. Mas
chegou com os acentos virando losango, e a caca a esse defeito descobriu outro
bem maior.

**Os acentos.** Conferi primeiro que nao era o meu terminal: os bytes saiam como
UTF-8 correto. Passar o payload como Buffer com encoding explicito nao resolveu.
O que resolveu foi mandar o JSON em ASCII puro, com os acentos escapados em
\uXXXX, deixando o JSON.parse do service worker reconstruir do outro lado.
Confirmado com um teste que trazia as duas versoes na mesma notificacao: "SEM
acento: Serao a vista" e "COM acento: Serão à vista", as duas legiveis.

Uma coisa atrapalhou o diagnostico: todas as notificacoes de teste usavam a
mesma etiqueta, e o iOS as empilha. O Rodolfo estava vendo as antigas junto das
novas, e por duas rodadas achamos que a correcao nao tinha pegado.

**A moeda.** Peguei esse antes de ele avisar, simulando o disparo automatico: o
valor saia "R$ 1,800.00". Os simbolos G e D do to_char seguem o lc_numeric do
banco, que e en_US. Com mascara literal e translate, virou "R$ 1.800,00". Teria
passado batido ate a primeira notificacao de verdade, com o valor errado.

**O fuso, que era o problema grande.** O Rodolfo perguntou qual timezone eu
estava usando. O banco roda em UTC, e todas as funcoes usavam current_date e
localtime. Medido no proprio banco: uma despesa no credito lancada as 11h30
daqui nascia paga as 14h30. E entre 21h e meia-noite o banco ja acha que e o dia
seguinte, o que erra status de atrasado, ciclo da fatura e os avisos de
vencimento.

Os registros antigos escaparam por sorte: todos vieram pelo app, que manda o
relogio do aparelho. O estrago estava so no que o banco grava sozinho, que e
justamente o que acabou de nascer com o push e com a baixa automatica do
credito.

Sete funcoes foram reescritas com `private.fn_hoje()` e
`private.fn_agora_hora()`. Explicitas em vez de mudar a configuracao da sessao,
para valerem igual no cron, no PostgREST e no SQL Editor.

O cron tambem estava torto, e esse ninguem tinha percebido: a virada de mes
rodava as 00:10 UTC do dia 1, que e 21:10 do dia 30 ou 31 aqui. Ela acontecia
antes de o mes virar. Passou para 03:10 UTC, que e 00:10 daqui.

E no frontend havia o mesmo erro em miniatura: o mes corrente saia de
`toISOString`, em UTC, e entre 21h e meia-noite a fatura pareceria fechada antes
da hora.

### Sessao 8 · 16/09/2026 · Push no celular

O sino da topbar so falava com o app aberto. Agora as contas avisam no celular
com o app fechado.

**O que o iOS exige, e que decide o desenho.** Push no iPhone so funciona com o
app instalado na tela de inicio, do iOS 16.4 em diante; no Safari em aba a API
nem existe. A permissao precisa sair de um toque do usuario, senao o sistema
recusa em silencio. E nao ha agendamento local: quem dispara "vence amanha" e o
servidor, nunca o aparelho.

**O bloqueio B7 caiu por um caminho que eu nao tinha visto.** Quando o registrei,
achei que a chave privada precisaria ser colada por ele no painel, porque o MCP
nao configura segredo de Edge Function. Mas o projeto tem o Vault do Supabase
instalado: as chaves ficam la, criptografadas, e a Edge Function as le pela
chave de servico. Nenhum passo manual sobrou.

**As pecas.** Tabela `assinaturas_push` com RLS por perfil; tres segredos no
Vault (chave VAPID, token do cron, endereco da funcao) lidos por funcoes negadas
a anon e authenticated; `fn_avisos_para_push` montando os quatro avisos ja
agrupados por tipo; a Edge Function `enviar-push` com web-push; e o pg_cron
chamando por pg_net as 9h de Brasilia.

**A mudanca mais invasiva foi no service worker.** Ele era gerado pelo plugin, o
que dava o cache offline mas nao deixava espaco para nada mais: push exige um
handler proprio. O arquivo passou a ser escrito a mao em `src/sw.ts`, com o
precache igual ao de antes e os handlers de `push` e `notificationclick` no fim.
Tocar na notificacao leva a janela ja aberta para a tela do aviso, em vez de
abrir outra.

Um detalhe que custou tempo: com `injectManifest` o plugin gera o SW como modulo
ES por padrao, e service worker como modulo tem suporte irregular. Como o alvo
aqui e justamente o Safari, o formato foi fixado em `iife`.

**O que deu para testar e o que nao deu.** A Edge Function foi exercitada de
verdade: responde 200 com o token certo, 401 sem ele e 401 com token errado, e a
`web-push` carrega no Deno. As funcoes do banco rodam. O build gera o SW com os
dois handlers. A tela de Perfil detecta o estado do aparelho e mostrou
corretamente o caso de permissao negada.

O que nao deu: o navegador embutido do painel **nao registra service worker
nenhum**, nem um trivial de uma linha, entao o ciclo completo (assinar, o
servidor enviar, a notificacao aparecer) so pode ser confirmado no aparelho do
Rodolfo. Isso esta dito na resposta, sem enfeite.

### Sessao 7 · 15/09/2026 · A fatura na lista

O Rodolfo descreveu o fluxo do cartao do jeito dele: durante o mes a fatura so
acumula o que foi lancado; no fechamento aparece a opcao de informar o valor
total; a diferenca vira gasto do cartao; e o valor informado e o que vai ser
pago. O modelo ja era esse desde a sessao 4. O que faltava era a tela mostrar.

Ele escolheu: a opcao de fechar continua no dia de FECHAMENTO, a linha da fatura
passa a mostrar o valor a pagar, e a fatura aberta ganha grupo proprio.

**A armadilha do "mostrar o valor a pagar".** No exemplo dele, uma compra de
R$ 100 e fatura fechada em R$ 500. Se a linha da fatura mostra R$ 500 e a linha
da compra mostra R$ 100 no mesmo grupo, o subtotal soma R$ 600 e mente: os
R$ 100 estao DENTRO dos R$ 500.

Por isso a fatura foi para um grupo so dela, "Faturas do cartao", em qualquer
estado. O subtotal desse grupo soma o que sai da conta; os outros grupos somam
competencia e nunca contem fatura. Nenhum subtotal duplica, e a fatura ganha o
destaque que ele queria. Isso tambem atende o "grupo separado" que ele pediu
para a fatura aberta, sem criar dois lugares diferentes conforme o estado.

A linha ficou assim, fechada:

  Fatura Azul Infinite
  R$ 119,00 lancados em detalhe . R$ 383,79 do cartao
                                           - R$ 502,79

O numero em destaque e o que sai da conta. A composicao fica no subtitulo,
porque parte dela ja aparece nas linhas das proprias compras.

Testado com o exemplo dele ponta a ponta: cartao novo, compra de R$ 100, fatura
aberta acumulando, fechamento em R$ 500 pela tela, e a linha passando a mostrar
"R$ 100,00 lancados em detalhe . R$ 400,00 do cartao" com - R$ 500,00. O Balanco
continua somando por competencia e fechou em R$ 1.356,24 com os dois cartoes, o
que confere: 502,79 mais 500 mais 193,45 mais 160.

### Sessao 6 · 15/09/2026 · Instalar o app no Safari

O Rodolfo abriu no Safari e o convite para instalar nao apareceu.

Nao e defeito do app. O evento `beforeinstallprompt`, que o ESTLIM usa para
oferecer o botao Instalar, so existe no Chromium: a Apple nunca o implementou.
No iPhone, no iPad e no Safari do Mac a instalacao e sempre manual, e nenhuma
API permite disparar aquele convite. Conferido do outro lado tambem: o manifest
esta valido em producao, o apple-touch-icon e 180x180 exato e responde 200, e as
metas do iOS ja estavam no index.html. Nao havia o que consertar no PWA.

O que dava para fazer era parar de ficar mudo. Agora o app detecta o motor e
ensina o caminho certo: no iOS, Compartilhar e Adicionar a Tela de Inicio; no
Safari do Mac, o menu Arquivo e Adicionar ao Dock. A pilula usa o mesmo desenho
das outras do PWA, tem "Agora nao", e a dispensa fica no localStorage, que e
preferencia de aparelho e nao dado de negocio.

Detalhes que a deteccao precisa acertar, e por isso viraram teste: o iPad desde
o iPadOS 13 se anuncia como Macintosh, e o que o separa de um Mac de verdade e
ter tela sensivel ao toque; Chrome e Edge trazem a palavra Safari no user agent
e nao podem ser confundidos com ele; e no iOS todo navegador usa o WebKit, entao
o Chrome de iPhone recebe as mesmas instrucoes do Safari. Sao 10 testes novos,
total de 50.

De quebra, a barra de status do iOS instalado ganhou
`apple-mobile-web-app-status-bar-style`, que acompanha o tema. Sem ela a barra
ficava branca fixa e sumia no tema escuro.

### Sessao 5 · 15/09/2026 · Fidelidade ao prototipo e o gesto no mobile

O Rodolfo apontou duas coisas: no celular da para arrastar a tela para os lados,
e o design system nao foi aplicado direito, com a fonte dos numeros do Resumo
rapido em outro tamanho e peso.

**O gesto lateral.** Nenhuma rota tem scroll horizontal de verdade: o
`scrollWidth` bate com a largura em todas as sete. O prototipo ja usa
`overflow-x:clip` no html, mas isso segura o scroll, nao o GESTO: no celular
arrastar para o lado encadeia para o navegador e vira bounce lateral ou swipe de
voltar pagina, e a tela inteira parece se deslocar. Resolvido com
`overscroll-behavior-x: none` no html e no body, e `contain` nas tres faixas que
rolam de proposito, para o gesto parar nelas em vez de vazar.

**A fidelidade.** O CSS estava correto: comparando o bloco `<style>` do
`ESTLIM_v40.html` com `prototipo.css` mais `tokens.css`, linha a linha, faltam
zero regras. O problema era o JSX, que trocou as TAGS que o prototipo usa como
gancho de estilo. O prototipo estiliza por seletor de elemento, entao trocar a
tag apaga a regra em silencio:

- `.stat-card b` era o numero do Resumo rapido. Ele saia de um `<span>` do
  NumeroAnimado, entao caia para 15px e peso normal em vez de 21px e peso 800
  (18px no mobile), sem o tracking e sem tabular-nums. Era exatamente o que ele
  viu.
- `.hero-value` traz `margin: 8px 0 6px`, que uma caixa inline ignora. O valor
  do saldo estava num `<span>`, e o card ficava mais apertado que o desenho.
- No donut, a legenda vinha antes do SVG. No mobile o `order` do prototipo
  reordenava e escondia o erro; no desktop os dois apareciam espelhados.
- `.tx[onclick]`, `.bank-row[onclick]` e `.cat-row[onclick]` dao cursor de mao e
  hover no prototipo. O React nao emite `onclick` como atributo, entao aquelas
  regras nunca casavam: as linhas clicaveis ficavam sem cursor e sem realce.
  Reescritas em `correcoes.css` no gancho que o React usa, o `role`.
- StatusBadge e MiniBadge usavam `<span>` onde o prototipo usa `<i>`. Sem efeito
  visual, porque o reset ja neutraliza o italico, mas fora da estrutura de
  referencia.

Conferido medindo os estilos computados do prototipo e da implementacao lado a
lado, na mesma largura: hero-value, hero-label, hero-sub, hero-stat b,
stat-card b, sc-lbl, sc-ico, section-title, card, month-pill, legend-item b,
tx-info b, tx-val b, tx-status e mini-badge batem todos, tamanho, peso,
tracking, padding e raio.

Licao para o resto do projeto: quando o prototipo estiliza por tag, a tag e
parte da especificacao. Um `<span>` no lugar de um `<b>` nao quebra nada, nao
avisa, e some do teste. O NumeroAnimado agora recebe qual elemento renderizar.

### Sessao 4 · 15/09/2026 · A fatura acumula e fecha

O Rodolfo apontou o buraco que a sessao 3 deixou. Ela resolveu a fatura JA
FECHADA, descontando dela o que foi lancado em detalhe. Mas durante o ciclo
aberto ele ainda nao sabe o valor fechado, e a fatura ficava em zero enquanto
ele ia lancando compras. Nas palavras dele: "a somatoria no cartao vai
automaticamente apenas pelos valores das despesas lancadas. Quando chegar a data
de fechamento, nao pode mais lancar naquele cartao e temos que confirmar o valor
final, podendo alterar sempre para mais, nunca para menos, e esse valor
excedente entra como gastos Cartao de Credito".

**O modelo novo.** A fatura tem dois tempos. Aberta, ela vale a soma das compras
daquele ciclo e acumula sozinha: ninguem digita nada. Fechada, vale o valor
confirmado, e o que passa da soma e o excedente, que e o que entrou nela sem ter
sido lancado em detalhe. Fechar so vale do acumulado para cima.

Com isso `carteiras.usado` deixou de ser um campo digitado e virou derivado: a
soma das faturas que ainda nao foram pagas. O campo na tela da Carteira virou so
leitura, e o fechamento passou para o "Adicionar valor" da propria fatura, na
lista, que era onde ele ja pedia atencao.

E o `dia_fechamento`, que estava no schema desde a 0001 sem nunca ser usado,
passou a valer: a compra depois do fechamento vai para a proxima fatura, e um
ciclo ja fechado ou pago nao recebe compra nova. Isso substitui a decisao da
sessao 3 de o ciclo ser a data digitada.

O `trg_fatura_pagamento` saiu de cena. Ele existia so para zerar e restaurar o
`usado`; agora a fatura paga simplesmente sai da soma das que estao em aberto.
Manter os dois seria ter duas fontes de verdade para o mesmo numero, com a ordem
alfabetica dos gatilhos decidindo qual vence.

Testado no banco e na tela: a fatura nasce aberta e vazia; duas compras a levam
a R$ 244,70 com o `usado` acompanhando; fechar em R$ 100 e recusado com a
mensagem certa; fechar em R$ 300 deixa R$ 55,30 de excedente; compra nova no
ciclo fechado vai para outubro sozinha; compra em 03/09 fica em setembro e em
20/09 vai para outubro, pelo dia de fechamento; pagar a fatura debita a conta em
R$ 300 e o balanco conta so R$ 55,30; desfazer devolve tudo. O bloco 11 da suite
foi reescrito para o modelo novo e passa inteiro, e o bloco 2 acompanhou, porque
o `usado` nao e mais input.

Confirmado tambem, a pedido dele: clicar no check de uma fatura ja abria a tela
de confirmacao com data, hora, valor, forma de pagamento e conta. Isso ja valia
desde o Epico 7, porque a fatura e de valor variavel e sempre passa por esse
sheet. Nada precisou mudar.

### Sessao 3 · 15/09/2026 · Fatura liquida e credito que nasce pago

O Rodolfo achou uma despesa contada duas vezes. Ele digita a mao o valor fechado
da fatura do cartao em `carteiras.usado`, porque tem gasto que nao controla item
a item. Mas tambem cadastra as despesas que controla, e elas foram pagas naquele
mesmo cartao. Os R$ 119,00 da Hospedagem RLiima ja estavam dentro dos R$ 502,79
da fatura, e o app somava os dois: R$ 975,24 em vez de R$ 856,24.

Nenhum dos dez pontos de soma do frontend distinguia as duas coisas, entao era
duplicacao estrutural, nao um caso isolado.

**O que mudou.** A fatura passa a valer o usado menos o que ja foi lancado em
detalhe naquele ciclo. Ela vira a sobra nao detalhada: cada despesa que o
usuario lanca a descasca para a categoria certa, e a soma continua fechando no
valor que o banco cobra. E toda despesa no credito nasce paga, porque quem
quitou a compra foi a operadora: a divida migrou para a fatura, que e paga
depois. A baixa dela aponta para o cartao, entao nenhuma conta se move.

**A distincao que sustenta isso.** O mesmo lancamento passou a ter dois valores,
e a view expoe os dois. `valor_caixa` e o que sai da conta quando a fatura for
paga, sempre cheio. `valor_exibido` e `valor_realizado` sao de competencia, ja
liquidos. Sem `valor_realizado` a correcao nao resolveria nada: ela so mudaria a
duplicacao da coluna Previsto para a Realizado, onde ela apareceria depois de a
fatura ser paga, que e quando ninguem mais esta olhando.

**Tres defeitos encontrados no caminho, dois deles meus:**

- **Excluir uma receita paga dobrava o saldo da conta.** Confirmado no banco:
  1.000 virava 1.500 na baixa e 2.000 ao excluir. Na exclusao em cascata o
  lancamento pai ja nao existe, entao o gatilho do saldo nao achava o tipo, caia
  no ramo de despesa e somava em vez de subtrair. Em despesa o erro coincidia
  com o certo, e por isso o teste da sessao passada passou. Pelo mesmo motivo,
  excluir uma fatura paga nunca devolvia o limite do cartao. O pagamento passou
  a guardar `lanc_tipo` e `cartao_id`: ele e um fato historico e precisa
  bastar-se para ser desfeito.
- **Receita vencida voltou a nascer atrasada.** A migration 0017 reescreveu
  `fn_criar_lancamentos` e perdeu o guard que a 0013 tinha acrescentado.
- **A fatura de um mes passado lia o usado de hoje.** Vale desde sempre, mas ia
  doer em duas semanas: a fatura de setembro esta em aberto, e em outubro as
  duas leriam o mesmo numero. Agora a virada de mes congela o valor da fatura
  que fecha, e so o ciclo aberto le o `usado`.

Testado: despesa no credito nasce paga sem mover conta; a fatura de 1.000 com
300 detalhados vale 700 e o caixa segue 1.000; despesa de outro mes ou de outro
cartao nao desconta; detalhado acima do valor zera a fatura e acende o aviso;
credito sem valor nao gera baixa e ganha uma quando o valor chega; trocar
credito por pix apaga a baixa; pagar a fatura debita a conta pelo cheio e entra
liquida no balanco, e desfazer reverte os dois; excluir pago devolve saldo e
limite, inclusive em receita; as 5 parcelas no credito nascem pagas; a virada
aguenta fixa no credito sem valor. Os blocos 2, 3 e 7 da suite continuam
passando com os gatilhos novos. Conferido no navegador nos dois temas: o Balanco
mostra Cartao de Credito R$ 383,79, Empresa RLiima R$ 119,00 e total R$ 856,24,
e o campo da baixa da fatura propoe R$ 502,79.

Corrigido de quebra na suite: a asserção 2c exigia que a fatura debitasse da
conta criada pelo proprio teste, mas o casal ja tem contas de verdade mais
antigas, e a funcao escolhe a mais antiga do dono. O teste supunha banco vazio.

Uma coisa a registrar com honestidade: durante a sessao a baixa da Hospedagem
RLiima sumiu em algum momento e foi restaurada pelo retroativo. Investiguei o
gatilho novo com uma sonda dedicada e ele nao e o responsavel (nem a virada de
mes nem a marcacao de atrasados derrubam a baixa). Nao identifiquei a causa.

### Sessao 2 · 15/09/2026 · Ajustes de uso real
Seis pontos levantados pelo Rodolfo usando o app com dados de verdade.

- **1. Check de "ja foi paga" no cadastro.** O formulario de lancamento ganhou um check que, ao ser ligado, revela data e hora ja preenchidas com o agora e editaveis. Isso grava a baixa junto com o lancamento, na mesma chamada. Nao afrouxa a regra do check da lista: la a data e a hora continuam sendo as do clique. Aqui e outra coisa, o registro retroativo de algo que ja aconteceu. Em parcelada, so a primeira parcela nasce paga.
- **2a. Receita paga se chama "recebida".** O selo de status agora recebe o tipo do lancamento: despesa fica "pago", receita fica "recebido", aporte fica "aplicado", como no prototipo.
- **2b e 6. Saldo da conta segue os pagamentos.** Gatilho `trg_saldo_da_conta` em `pagamentos`: receita recebida numa conta entra, despesa paga por pix, debito ou transferencia sai, aporte sai da conta e entra no investimento, fatura paga sai da conta e zera o cartao. Credito e dinheiro nao encostam em conta nenhuma, porque a referencia da baixa nao aponta para uma carteira tipo `conta`. Desfazer a baixa reverte, e excluir o lancamento tambem, pela cascata. A `fn_criar_ajuste` parou de mexer no saldo na mao: quem move e o pagamento espelho que ela ja criava, senao contaria duas vezes. O motivo continua validado antes de qualquer escrita.
- **2c. Retroativo aplicado.** As quatro baixas que ja existiam foram somadas: o Nubank da RLiima foi de R$ 0,00 para R$ 10.146,55, que e 4.000 + 6.500 - 160 - 193,45. O "Saldo em contas" do resumo rapido parou de mostrar zero.
- **3. Categoria tem tipo.** Enum `categoria_tipo` com despesa, receita e ambas. O cadastro de categoria ganhou o seletor "Serve para", e o formulario de lancamento so oferece as categorias do tipo certo. Salario e Pro-labore viraram receita; Ajuste de saldo, Investimentos e Empresa RLiima ficaram em ambas; o resto e despesa. Categoria de receita nao tem orcamento mensal, entao o campo e a barra somem dela.
- **4. Multiplas categorias por lancamento:** descartado pelo Rodolfo, que preferiu manter uma categoria so.
- **5. Observacoes e comprovante.** Colunas `observacoes` e `comprovante_url` em `lancamentos`, e o bucket privado `comprovantes` com politica por `casal_id`, teto de 5 MB, aceitando imagem e PDF. O que fica gravado e o caminho, nunca a URL assinada, que vence. Remover um anexo enviado na mesma sessao apaga o arquivo do bucket; trocar o anexo de um lancamento salvo apaga o antigo na hora de gravar.

Testado: baixa que passa por conta entra e sai do saldo; desfazer devolve; excluir o lancamento pago devolve pela cascata; credito e dinheiro nao movem conta; aporte sai da conta e entra no investimento; fatura paga por conta zera o cartao e debita a conta, e desfazer reverte os dois; ajuste de entrada e de retirada move o saldo uma vez so; chamada posicional antiga de `fn_criar_lancamentos` continua valendo, e a nova grava observacoes aparadas, comprovante e a baixa na data informada. Conferido no navegador nos dois temas, sem erro de console. Linter de seguranca do Supabase segue so com o alerta de senha vazada, que e um botao do painel.

Corrigido de quebra: `supabase/testes/fluxos_criticos.sql` usava variaveis plpgsql chamadas `saldo` e `usado`, iguais a colunas de `carteiras`. O Postgres recusa por ambiguidade, entao o arquivo nunca rodava do inicio ao fim. As variaveis viraram `v_base` e `v_lido` e as leituras passaram a qualificar a coluna.

### Sessao 1 · 14/09/2026 · Epico 0
- Feito: leitura dos cinco documentos; copia do CLAUDE.md para a raiz e dos demais para `docs/`; `.gitignore`, `.env.example` e `.env.local` preenchido com a URL e a anon key do projeto ESTLIM-Finance (confirmado fora do versionamento); levantamento do ambiente (Node 24.14, pnpm 11.1.3, git 2.53, sem gh, sem CLI da Vercel e sem CLI do Supabase); confirmacao de que o banco esta vazio; entrevista dos blocos 1 a 5; primeiro commit local (`fdf6076`).
- Pendente: push para o GitHub (B1), projeto e variaveis na Vercel (B2 e B3).
- Proximo passo: Epico 1, fundacao tecnica.

### Sessao 1 · 14/09/2026 · Epicos 7 a 14
- Epicos 7, 8 e 9 juntos, porque sao inseparaveis: `fn_criar_lancamentos` gerando 1 ou N parcelas numa transacao, fatura automatica ao criar cartao, gatilhos que zeram o limite, somam no investimento e acertam o status, virada de mes e atrasados no pg_cron. Na tela: lista agrupada com os oito filtros, CRUD completo com os tres tipos, e o check de baixa capturando data e hora do clique.
- Epico 10: Dashboard com card de saldo animado, seis indicadores, donut e barras desenhados como no prototipo, proximos vencimentos com check, Destaques dinamicos e o Balanco detalhado com aprovacao manual.
- Epico 11: Agenda com calendario, marcadores por dia e lista do dia selecionado.
- Epico 12: Realtime nas nove tabelas invalidando so os caches que cada uma suja, e a central de notificacoes com as quatro regras.
- Epico 13: PWA com manifest, service worker, cache offline no IndexedDB com teto de um dia, pilulas de instalacao, versao nova e offline, icones gerados por script e `vercel.json`.
- Epico 14: 40 testes de unidade dos formatadores, mascaras, formas e erros; suite SQL cobrindo os oito fluxos criticos; README de operacao e backup; revisao de responsivo (zero estouro horizontal nas sete telas a 375px) e de acessibilidade (nenhum botao sem nome, nenhuma imagem sem alt, foco visivel).
- Defeitos encontrados e corrigidos no caminho: receita nascendo atrasada, categoria padrao caindo em Ajuste de saldo, numero animado congelando com a aba oculta, cache limpo a cada renovacao de token, e duas funcoes do cron expostas como rota REST.
- Pendente: push no celular (B7), protecao de senha vazada (B8), projeto na Vercel (B2 e B3) e o cadastro dos dados reais.

### Sessao 1 · 14/09/2026 · Epico 6
- Feito: tela de Categorias com orcamento mensal, barra de consumo e alerta de estouro em vermelho; CRUD com icone e cor obrigatorios; as tres categorias do sistema com nome travado e sem lixeira. Tela Investir com patrimonio total, quebra entre Ativos e Caixinhas, listagem agrupada, vinculo com conta cadastrada ou corretora, e CRUD de corretoras com upload de logo para o bucket privado.
- Testado por SQL: renomear e excluir categoria do sistema barrado nos dois caminhos (funcao e delete direto), orcamento dela ainda editavel, categoria comum excluida com o lancamento remanejado para Contas fixas, corretora com investimento recusada, e o check de banco contra corretora mantido.
- Testado na tela, com dados que criei e apaguei depois: barra de consumo cheia e vermelha quando estoura e parcial quando nao, categoria protegida abrindo com o aviso e sem lixeira, upload de logo de verdade indo para o Storage e voltando por URL assinada, criacao de investimento em corretora e em conta, e a recusa de excluir corretora com investimento. Conferido no desktop no tema claro e no mobile no tema escuro.
- Um defeito encontrado e corrigido: o toast imprimia "[object Object]" em qualquer erro vindo do banco, porque o Supabase nao devolve Error. Agora todo hook converte na fronteira.
- Proximo passo: Epico 7, lancamentos, o nucleo do sistema.

### Sessao 1 · 14/09/2026 · Epico 5
- Feito: CRUD de contas e cartoes com seletor de banco (17 marcas mais a opcao de digitar), cor em gradiente, bandeira, funcao, limite, usado e os dias de fechamento e vencimento; tela Carteira com seletor de perfil filtrando card e listas, cores por perfil, contas e cartoes agrupados por dono; ajuste de saldo com motivo obrigatorio. Ajuste e exclusao viraram funcoes no banco, numa transacao so.
- Testado por SQL: motivo em branco nao ajusta e o saldo fica intacto, valor zero recusado, entrada e retirada corretas, lancamento espelho pago na categoria Ajuste de saldo com data e hora, e conta com historico arquivada em vez de apagada.
- Testado na tela, com dados de verdade que criei e apaguei depois: criar conta, criar cartao, editar cartao, ajuste sem motivo barrado com o saldo intacto, ajuste com motivo aplicado, exclusao de cartao sem historico e arquivamento da conta com historico. Conferido no desktop no tema claro e no mobile no tema escuro.
- Proximo passo: Epico 6, categorias e investimentos.

### Sessao 1 · 14/09/2026 · Epico 4
- Feito: Sheet completo (bottom sheet no mobile, modal centralizado no desktop, cabecalho e rodape parados, sombra sob o titulo ao rolar, fecha por X, fundo e Esc, `inert` quando fechado); CheckCircle, Chip, MiniBadge, StatusBadge, CardGradiente, seletor de cor em gradiente, seletor de cor solida, seletor com os 40 icones, campos mascarados de data, hora, telefone e moeda, botoes, lixeira, logos de banco, bandeiras, numero que conta, confete e revelacao ao rolar. Catalogo em `/catalogo` para conferencia.
- Testado no catalogo: mascaras (22081990 vira 22/08/1990, 1945 vira 19:45, 123456 vira R$ 1.234,56 e a data volta como 1990-08-22 em ISO), sheet nos dois tamanhos de tela e nos dois temas, sombra do cabecalho ao rolar, fechamento por X e por Esc, FAB virando X enquanto o sheet esta aberto.
- Dois defeitos encontrados e corrigidos: a revelacao ao rolar filtrava por `data-reveal` e, com o StrictMode montando o efeito duas vezes, a segunda passada nao observava nada e tudo abaixo da dobra ficava invisivel; e o check das bolinhas de cor saia como quadrado vazio porque o prototipo embute a FontAwesome com outro nome de familia.
- Proximo passo: Epico 5, carteiras.

### Sessao 1 · 14/09/2026 · Epico 3
- Feito: cadastro fechado por convite, com gatilho que abre o perfil no casal certo; tela de login com entrar, primeiro acesso e recuperacao de senha, mensagens do Supabase traduzidas; guarda que impede qualquer rota sem sessao; tela de Perfil completa com foto no bucket privado (pasta por usuario, 2 MB, tipo validado, URL assinada na leitura), nome, e-mail, telefone mascarado, troca de senha com reautenticacao e sair da conta; avatar da topbar com foto ou iniciais; fila de toasts e campo de senha com olho, adiantados do Epico 4.
- Testado: o gatilho recusa e-mail sem convite e cria o perfil para os convidados; a tela de login e a validacao conferidas no mobile e no desktop, nos dois temas. O fluxo com conta de verdade nao foi testado (B5), porque nao crio conta nem digito senha.
- Pendente: as contas foram criadas, confirmadas e ja entraram no app. Falta so conferir a tela de Perfil com uma conta de verdade (B5).
- Proximo passo: Epico 4, design system.

### Sessao 1 · 14/09/2026 · Epico 2
- Feito: cinco migrations aplicadas e versionadas; onze tabelas, dez enums, indices e a view `v_lancamentos` com `security_invoker`; RLS por `casal_id` em tudo, com pagamentos herdando o dono do lancamento; buckets `avatares` e `corretoras` privados, 2 MB, so imagem; seed do casal e das dez categorias padrao; tipos regerados do schema com atalhos para as telas; script de teste em `supabase/testes/rls_e_restricoes.sql`.
- Testado: usuario de um casal ve so as proprias linhas, e insert, update e delete no casal alheio nao passam. As seis restricoes de schema barram o que devem barrar. Linter de seguranca do Supabase em zero alertas.
- Pendente: perfis dos usuarios (B5), que dependem do Epico 3.
- Proximo passo: Epico 3, autenticacao e perfil.

### Sessao 1 · 14/09/2026 · Epico 1
- Feito: projeto Vite com React 18 e TypeScript estrito; Tailwind 4 com os tokens do prototipo; eslint sem `any` e exigindo `import type`; client Supabase tipado lendo so a anon key; formatadores de moeda, data e hora mais a funcao `agora()` que vai alimentar o check de baixa; mascaras de data, hora, telefone e moeda; stores de tema e de filtros; shell completo com topbar, pills de Jan a Dez, navegacao flutuante de seis abas com indicador deslizante, FAB e ripple global; sete telas vazias, uma por modulo; rotas com as future flags do react-router 7. Build e lint limpos, conferido no mobile e no desktop nos dois temas.
- Pendente: push (B1) e Vercel (B2 e B3). Pontos de design D1 e D2 aguardando sua palavra.
- Proximo passo: Epico 2, banco de dados e seguranca.

## Divida tecnica

| Item | Motivo do adiamento |
|---|---|
| CLI do Supabase nao instalada | As migrations vao pelo MCP. Instalar quando for preciso rodar Edge Functions localmente (Epico 12) |
| CLI da Vercel nao instalada | Deploy pelo git. Instalar se for preciso cadastrar variaveis de ambiente por linha de comando |
| `fn_virada_mes` da especificacao tecnica descreve a media dos 3 ultimos pagos | Contradiz a decisao de 14/09/2026. Implementar com valor nulo e corrigir o texto do documento no Epico 8 |
| Recharts instalado e nao usado | Os graficos seguem o desenho do prototipo. Remover a dependencia se ficar decidido que nunca vai entrar |
| Relatorio anual consolidado fora do escopo | Suposicao S7, para validar depois |
| Fatura de mes futuro so existe depois da virada | As parcelas futuras ja nascem no ato da compra, uma por mes, e aparecem no mes delas. A fatura daquele mes so e criada na virada, e ate la nao ha excedente para mostrar, o que esta certo: ele e desconhecido |
| "Usado nos cartoes" conta so os ciclos nao pagos | Uma compra em 5x aparece com R$ 890 neste mes, nao com os R$ 4.450 comprometidos no cartao de verdade. Decisao do Rodolfo em 15/09/2026 |
| Baixa parcial da fatura reescreve o previsto do mes | Ela zera o `usado` do mesmo jeito e congela o caixa no valor pago. Herdado, e agora mais visivel |
| Anexo enviado com a sheet fechada sem salvar fica no bucket | Ja registrado na sessao 2; o botao de remover cobre o caso deliberado |
| Anexo enviado e sheet fechada sem salvar deixa o arquivo no bucket | O botao de remover cobre o caso deliberado. Limpeza periodica ou varredura de orfaos resolve o resto |

## Ideias para versoes futuras

- Importador da planilha atual (CSV)
- Metas de economia e reserva de emergencia
- Projecao de fluxo de caixa de 90 dias
- Relatorio anual consolidado e comparativo entre meses
- Multi-inquilino aberto (SaaS) aproveitando o RLS ja existente
- Push tambem para lancamentos sem valor preenchido
