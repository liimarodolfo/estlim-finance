# PROGRESSO · ESTLIM

Arquivo vivo. O Claude Code le no inicio de toda sessao e atualiza ao fim de cada entrega. E a memoria do projeto entre sessoes.

## BLOQUEIOS

| # | Bloqueio | Impacto | Como resolver |
|---|---|---|---|
| B1 | Push para o GitHub bloqueado pelo modo automatico da sessao | Commits ficam locais ate alguem empurrar | Rodolfo empurra pelo GitHub Desktop, ou libera uma regra de Bash para `git push` nas configuracoes do Claude Code |
| B2 | Projeto na Vercel ainda nao criado | Sem deploy publicado | Precisa do teamId da conta pessoal (a conta Hobby nao aparece em `list_teams`) e de um build valido no repositorio. Fica para o fim do Epico 1, quando existir app para buildar |
| B3 | Variaveis de ambiente na Vercel nao cadastradas | Build publicado sem Supabase | Depende de B2. As tres variaveis estao em `.env.example` |
| B4 | Senha do banco Supabase (`SUPABASE_DB_PASSWORD`) nao informada | `pnpm types:supabase` e a CLI nao rodam | Contornado: as migrations vao pelo MCP e os tipos sao gerados pelo MCP tambem. Informar a senha so se quiser rodar a CLI localmente |
| B5 | Tela de Perfil nunca rodou com uma conta de verdade | Foto, salvar dados e troca de senha compilam e estao escritos, mas nao conferi na tela | Rodolfo abre o Perfil, troca a foto e salva o nome. Se algo sair torto, e so avisar |

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

## Pontos de design a confirmar

| # | Ponto | Situacao |
|---|---|---|
| D1 | Em telas de 375px o rotulo "Lancamentos" na aba ativa da navegacao fica cortado. Conferi no proprio `ESTLIM_v40.html` na mesma largura e o corte acontece igual, entao mantive fiel ao prototipo em vez de mexer por conta propria. Os principios de design pedem rotulo legivel, entao vale decidir: encurtar o rotulo para "Lancar", aumentar a proporcao da aba ativa, ou deixar como esta | aguardando Rodolfo |
| D3 | A tela de login nao tem botao de tema, porque o botao mora na topbar e a topbar nao aparece antes do login. Quem entrar pela primeira vez ve o tema claro | aguardando Rodolfo, se incomodar eu coloco o botao |
| D2 | As pills de mes rolam sozinhas para deixar o mes ativo visivel. O prototipo nao faz isso e abre sempre em Jan, mesmo com Ago ativo. Considerei defeito e corrigi | aplicado, avisar |

## Diario de sessoes

### Sessao 1 · 14/09/2026 · Epico 0
- Feito: leitura dos cinco documentos; copia do CLAUDE.md para a raiz e dos demais para `docs/`; `.gitignore`, `.env.example` e `.env.local` preenchido com a URL e a anon key do projeto ESTLIM-Finance (confirmado fora do versionamento); levantamento do ambiente (Node 24.14, pnpm 11.1.3, git 2.53, sem gh, sem CLI da Vercel e sem CLI do Supabase); confirmacao de que o banco esta vazio; entrevista dos blocos 1 a 5; primeiro commit local (`fdf6076`).
- Pendente: push para o GitHub (B1), projeto e variaveis na Vercel (B2 e B3).
- Proximo passo: Epico 1, fundacao tecnica.

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
| Projeto sem testes automatizados | O Epico 14 monta a suite. Ate la a validacao e build, lint e conferencia visual nos dois temas |

## Ideias para versoes futuras

- Importador da planilha atual (CSV)
- Metas de economia e reserva de emergencia
- Projecao de fluxo de caixa de 90 dias
- Relatorio anual consolidado e comparativo entre meses
- Multi-inquilino aberto (SaaS) aproveitando o RLS ja existente
- Push tambem para lancamentos sem valor preenchido
