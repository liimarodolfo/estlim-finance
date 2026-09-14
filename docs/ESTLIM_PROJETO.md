# ESTLIM · Documento Mestre do Projeto

Sistema de planejamento e controle financeiro do casal Rodolfo e Thainy, incluindo o perfil PJ RLiima (CNPJ de Empresário Individual). Substitui a planilha anual de abas mensais (Jan a Dez) que o casal usa hoje.

**Stack**: React 18 + Vite + TypeScript + Tailwind + Framer Motion + Recharts + TanStack Query + Zustand + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) + PWA.

**Referência visual obrigatória**: `ESTLIM_v40.html`. É o protótipo funcional aprovado, com design system, animações, máscaras e comportamentos definidos. Ele não é inspiração, é especificação. Nada de redesenhar.

---

## 1. Objetivo do produto

Registrar previsões de receitas e contas a pagar, controlar o que já foi pago ou recebido, acompanhar cartões e saldos, e prever com precisão quanto sobra no mês. A palavra-chave do projeto é **previsibilidade**.

## 2. Perfis (donos)

| Perfil | Natureza | Cor no app |
|---|---|---|
| Rodolfo | PF | Gradiente azul |
| Thainy | PF | Gradiente rosa |
| Casal | Compartilhado | (usado só como responsável de lançamento) |
| RLiima | PJ, Empresário Individual | Gradiente grafite/preto |
| Geral | Consolidação dos três | Gradiente verde da marca |

## 3. Módulos (mapa funcional)

1. **Dashboard/Home**, nesta ordem: card de saldo previsto do mês (gradiente, número animado), Resumo rápido (seis indicadores com ícone: saldo em contas, a pagar no mês, usado nos cartões, a receber no mês, patrimônio investido e aportes do mês), donut de gastos por categoria e barras de receitas x despesas dos últimos 6 meses (lado a lado no desktop, empilhados no mobile com a lista de categorias antes do donut), próximos vencimentos, Destaques e, fechando a tela, o **Balanço do mês**. O Balanço é o relatório detalhado, sem repetir os indicadores do Resumo: barra de progresso de lançamentos concluídos; tabela de receitas item a item com previsto, realizado e variação; tabela de despesas agrupadas por categoria (com ícone e cor) com previsto, realizado e variação, onde gastar menos que o previsto é destacado em verde; tabela de aportes por investimento de destino; três indicadores (resultado do mês realizado x previsto, taxa de economia sobre o recebido, precisão medida em contas ainda sem valor); o fechamento projetado com a fórmula explícita (saldo em contas hoje, mais a receber, menos a pagar, menos aportes); e as ações de aprovar balanço e criar ajuste.
2. **Lançamentos**: lista agrupada em A pagar / A receber / Concluídos, com filtros (Todos, Receitas, Despesas, Fixas, Parcelas, Pendentes, Concluídos), check circular de baixa, CRUD completo em bottom sheet.
3. **Carteira**: seletor de perfil (Geral, Rodolfo, Thainy, RLiima) que filtra tudo abaixo; card principal com saldo, faturas em aberto e limite livre do perfil selecionado; seções Contas e Cartões por dono; ajuste de saldo nos perfis individuais.
4. **Agenda**: calendário mensal com marcadores por dia (receita/despesa) e lista de lançamentos do dia selecionado.
5. **Categorias**: lista com orçamento mensal, barra de consumo e alerta de estouro; CRUD com **seletor de ícone e cor obrigatórios**. As categorias padrão nascem com ícone e cor definidos; toda categoria nova exige escolher um ícone (biblioteca de 40 ícones FontAwesome) e uma cor (paleta de 12), que passam a identificar a categoria em toda a interface: lista de lançamentos, legenda do gráfico de gastos, agenda e tela de categorias.
5b. **Investimentos**: patrimônio total do casal, dividido em duas subcategorias (Ativos e Caixinhas), cada investimento com nome, descrição, valor aplicado, rentabilidade, titular e a instituição onde está aplicado (uma conta já cadastrada na Carteira ou uma corretora). Cadastro de corretoras com nome e upload de logo.
6. **Perfil**: foto, nome, e-mail, telefone e atualização de senha.
7. **Navegação por meses**: pills Jan a Dez, o ano inteiro navegável.
8. **Notificações**: central no sino e toasts animados.

## 4. Regras de negócio (as que definem o sistema)

### 4.1 Natureza e valor
- Natureza: **fixa mensal**, **avulsa** ou **parcelada**.
- Valor: **fixo** ou **variável**.
- Lançamentos de valor variável podem ser salvos **sem valor**. Aparecem na lista com o selo "Adicionar valor" e geram notificação persistente até que o valor seja informado.
- Contas fixas replicam para o mês seguinte automaticamente. Se variáveis, o novo mês nasce com valor previsto igual à média dos 3 últimos valores pagos, ou sem valor quando não houver histórico.

### 4.2 Check de pago/recebido com timestamp
- Cada lançamento tem um check circular. Ao tocar, o sistema **captura a data e a hora do clique** e preenche Data de pagamento (ou Data de recebimento).
- Fluxo rápido: valor fixo já definido conclui em um toque.
- Fluxo com confirmação: valor variável ou sem valor abre o sheet com data e hora já preenchidas com o momento do clique, pedindo valor e forma.
- Tocar no check de um concluído desfaz a baixa e recalcula o status (pendente ou atrasado).
- Nomenclatura segue o tipo: pago/recebido, Data de pagamento/Data de recebimento.
- Na edição de um item concluído, a Data pago/Data recebido aparece e pode ser alterada.

### 4.3 Forma de pagamento em dois níveis (método + fonte)
Despesas: **Pix** (escolher a conta), **Cartão de Crédito** (escolher o cartão), **Cartão de Débito** (escolher a conta), **Dinheiro** (escolher a carteira física: Rodolfo ou Thainy).
Receitas: **Pix** (conta), **Transferência** (conta), **Dinheiro** (carteira).
O rótulo do campo fonte muda conforme o método. Persistir `forma_metodo` e `forma_ref`; exibir "Método · Fonte" (ex: "Crédito · Nubank").

### 4.4 Fatura automática dinâmica
- Criar um cartão de crédito **cria automaticamente** uma despesa fixa de valor variável vinculada a ele, vencendo no dia de vencimento do cartão, debitando da conta do mesmo dono.
- O valor da fatura pendente é **sempre igual ao limite já utilizado** do cartão.
- Marcar a fatura como paga **zera o usado** do cartão (libera o limite). Desfazer restaura pelo valor pago.
- Excluir um cartão remove suas faturas pendentes e preserva as pagas como histórico.
- Faturas de cartões do dono RLiima entram na categoria Empresa RLiima.

### 4.5 Parcelamento
- Salvar uma despesa parcelada em N vezes gera **N lançamentos**, um por mês, vinculados por grupo, numerados X/N (ex: "Geladeira nova 2/5").
- Compra no crédito: o vencimento de cada parcela vem do **dia de vencimento do cartão** e permanece sincronizado se o cartão mudar.

### 4.6 Balanço mensal e ajustes
- Balanço compara previsto x realizado (receitas, despesas, resultado) e é **aprovado manualmente**, registrando data e responsável.
- Ajustes de carteira (entrada ou retirada) nivelam saldos. O **motivo é obrigatório**: sem motivo, não salva, e a validação ocorre antes de qualquer alteração de saldo.
- Todo ajuste vira um lançamento pago na categoria Ajuste de saldo, com data, hora, valor, conta e motivo.
- Perfis individuais da Carteira têm botão "Ajustar saldo" no card, já filtrado pelas contas daquele dono.

### 4.7 Status
`pendente` → `pago` (via check) e `atrasado` derivado (pendente com vencimento anterior a hoje).

### 4.8 Investimentos
- Além de Despesa e Receita, existe o terceiro tipo de lançamento: **Investimento** (aporte).
- Um investimento pertence a uma de duas subcategorias: **Ativo** (ações, fundos, tesouro, CDB, FII) ou **Caixinha** (reservas com objetivo, como viagem, reforma, provisão de impostos).
- Cada investimento tem nome, descrição, valor aplicado, rentabilidade (texto livre, ex: "110% CDI"), titular (Rodolfo, Thainy, Casal ou RLiima) e **instituição**.
- A instituição é de um de dois tipos: **Banco**, sempre escolhido entre as contas já cadastradas na Carteira (o investimento mora numa conta que já existe), ou **Corretora**, escolhida entre as corretoras cadastradas.
- **Corretoras** são cadastradas pelo usuário com nome e upload de logo (imagem até 2 MB). Sem logo, o sistema exibe as iniciais sobre uma cor. Uma corretora com investimentos vinculados não pode ser excluída.
- Um lançamento do tipo Investimento é um **aporte**: tem destino (o investimento), sai de uma conta pela forma de pagamento (Pix, Transferência, Débito ou Dinheiro, nunca crédito) e, quando marcado como aplicado pelo check, **soma o valor ao investimento de destino**. Desfazer a baixa subtrai o valor de volta.
- Aportes não entram na soma de despesas do mês, porque são transferência de patrimônio e não consumo. Aparecem no grupo "A investir" da lista, no destaque de aportes previstos e nos cards de patrimônio do Dashboard.
- Excluir um investimento desvincula os aportes históricos, preservando o registro dos lançamentos.

## 4b. Princípios de design e movimento

- Paleta: verde esmeralda da marca (#12a06e) como primário, tinta azul-marinho (#1c2733) no lugar de preto puro, superfícies em cinza-verde muito claro (#f4f7f6) para se ligarem à marca, roxo (#6d4aff) reservado a investimentos. Semânticas: verde para receitas, vermelho para despesas, âmbar para pendências.
- Tipografia: Inter em toda a interface, com os variantes cv11, ss01 e ss03 ativos e números tabulares em todos os valores. Rótulos em caixa de sentença, nunca em versalete.
- Hierarquia de raios: card de saldo 28px, cards 20px, caixas internas 14px, pills e chips totalmente arredondados.
- Um elemento memorável: o card de saldo, com gradiente em deriva lenta, brilho difuso e trama fina de pontos. Tudo ao redor fica quieto: os cards não levitam no hover e não há brilhos varrendo superfícies.
- Movimento com propósito: uma única orquestração no carregamento (topbar desce, pills de mês entram em cascata, card de saldo sobe, seções seguem, navegação flutuante e FAB fecham a sequência). Depois disso, o movimento só responde a ações: gráficos desenham ao entrar na tela, números contam ao trocar de mês, o indicador da navegação desliza entre abas, checks pulam, toasts entram com mola.
- Navegação flutuante em vidro, destacada do rodapé, com indicador deslizante sob a aba ativa. No mobile as abas inativas mostram só o ícone e a aba ativa se expande revelando o rótulo (legível, sem texto minúsculo); no desktop todas mostram ícone e rótulo. No mobile o cabeçalho (logo, ações e pills de mês) rola junto com a página, sem fixar; no desktop fica fixo no topo. A página nunca tem rolagem horizontal. Ainda no mobile: no gráfico de gastos a lista de categorias vem primeiro e o donut embaixo (nunca lado a lado), e as linhas de lançamentos escondem os badges, mantendo altura uniforme.
- Fundo ambiente: dois brilhos radiais fixos e muito suaves (verde e roxo) dando profundidade ao branco sem competir com o conteúdo.
- Acessibilidade: foco visível em todos os controles e respeito total a prefers-reduced-motion.

## 5. Padrões inegociáveis

- **Datas**: sempre DD/MM/AAAA. Campos de data são inputs mascarados com teclado numérico, nunca o seletor nativo do navegador.
- **Horas**: sempre 24h (HH:MM), com máscara.
- **Moeda**: BRL, formato pt-BR.
- **Idioma**: todo o app em português do Brasil.
- **Mobile first**, com desktop adaptativo até 1270px de largura.
- **Temas light e dark**, com light travado (fundo nunca herdado do navegador).
- **Ícones**: FontAwesome em toda a interface (rótulos de campo, títulos de seção, filtros, métodos de pagamento, navegação).
- **Sem travessão** em qualquer texto da interface.

## 6. Épicos

Cada épico é uma entrega fechada, testável e commitável. A ordem é de dependência.

### Épico 0 · Descoberta e configuração
Entrevista inicial com o Rodolfo (ver `PERGUNTAS_INICIAIS.md`), coleta de credenciais, criação do repositório, do projeto Supabase e do ambiente local. Saída: `.env.local` preenchido, repositório com primeiro commit, `PROGRESSO.md` criado.

### Épico 1 · Fundação técnica
Projeto Vite + React + TS, Tailwind com os tokens do v27 (light e dark), estrutura de pastas, client Supabase tipado, TanStack Query, Zustand, roteamento e shell da aplicação (topbar, pills de meses, bottom nav). Saída: app rodando com navegação entre telas vazias e troca de tema funcionando.

### Épico 2 · Banco de dados e segurança
Migrations com todas as tabelas, enums, índices e RLS por casal. Seed com o casal, os perfis, categorias padrão e carteiras iniciais. Types gerados do banco. Saída: schema versionado e políticas testadas (usuário de um casal não enxerga dados de outro).

### Épico 3 · Autenticação e Perfil
Supabase Auth com e-mail e senha, guarda de rotas, tela de login no design system, tela de Perfil (foto com upload para Storage, nome, e-mail, telefone mascarado, troca de senha com validações). Saída: login funcional e perfil editável.

### Épico 4 · Design system
Componentes reutilizáveis portados fielmente do v27: Sheet (bottom sheet no mobile, modal centralizado no desktop; cabeçalho fixo com título e botão X de fechar, corpo com rolagem interna e barra de rolagem discreta, rodapé fixo com as ações, fechamento por X, toque no fundo ou tecla Esc), Toast com barra de progresso, CheckCircle, Chip, MiniBadge, StatusBadge, CardGradiente com glow blur e shimmer, seletor de cor em gradientes, inputs mascarados (data, hora, telefone), botões com ripple. Saída: catálogo de componentes com as animações do protótipo.

### Épico 5 · Carteiras
CRUD de contas e cartões com seletor de banco (lista dos principais brasileiros + opção de digitar), seletor de cor em gradiente, bandeiras, limite e datas de fechamento e vencimento. Tela Carteira com seletor de perfil filtrando card e listas, cores por perfil, e ajuste de saldo com motivo obrigatório. Saída: Carteira completa e funcional.

### Épico 6 · Categorias e Investimentos
CRUD de categorias com ícone, cor e orçamento mensal; tela com barra de consumo e alerta de estouro; proteção das categorias de sistema (Salário, Ajuste de saldo, Investimentos). CRUD de investimentos com as subcategorias Ativos e Caixinhas, vínculo com conta cadastrada ou corretora, e CRUD de corretoras com upload de logo para o Storage. Tela Investir com patrimônio total, totais por subcategoria e listagem agrupada. Saída: telas Categorias e Investir completas.

### Épico 7 · Lançamentos (núcleo do sistema)
CRUD completo com todos os campos (descrição, pagar a quem, natureza, tipo de valor, valor, emissão, vencimento, categoria, forma em dois níveis, responsável), os três tipos de lançamento (Despesa, Receita e Investimento, este com seleção do investimento de destino), lista agrupada com filtros, edição por toque em qualquer item, exclusão por ícone ao lado de Salvar, troca de tipo entre despesa e receita na edição, e o fluxo "Adicionar valor". Saída: gestão de lançamentos completa.

### Épico 8 · Automações no banco
Funções e triggers em Postgres: fatura automática ao criar cartão, sincronização do valor da fatura com o usado do cartão, zeragem e restauração do limite, geração de parcelas com vencimento dinâmico no crédito, replicação mensal das fixas e marcação de atrasados, agendadas com pg_cron. Saída: regras vivas testadas por SQL.

### Épico 9 · Check de baixa e pagamentos
Check circular com captura de data e hora do clique, fluxo rápido e fluxo com confirmação, desfazer baixa, edição da data de pagamento/recebimento no sheet de edição, efeitos visuais (confetti, flash verde na linha). Inclui o ciclo do aporte: marcar como aplicado soma ao investimento de destino e desfazer subtrai. Saída: ciclo completo de baixa.

### Épico 10 · Dashboard e Balanço
Card de saldo com número animado, Destaques dinâmicos, Resumo rápido, donut e barras animados na entrada com Recharts, próximos vencimentos, Balanço do mês com aprovação manual e criação de ajustes. Saída: Home completa.

### Épico 11 · Agenda
Calendário mensal com marcadores por dia, seleção de dia, lista de lançamentos do dia com check, layout desktop em duas colunas com calendário fixo. Saída: Agenda completa.

### Épico 12 · Realtime e notificações
Subscriptions do Supabase invalidando o cache do React Query (baixa feita num aparelho reflete no outro), central de notificações do sino com regras (atrasados, vencendo em 7 dias, a receber, contas sem valor) e toasts. Saída: sincronização entre dispositivos.

### Épico 13 · PWA, offline e deploy
Manifest com os ícones da marca, service worker, cache offline com persistência do React Query no IndexedDB, botão de instalação, theme-color por tema, deploy na Vercel com variáveis de ambiente e domínio. Saída: app instalável e publicado.

### Épico 14 · Qualidade e entrega
Testes dos fluxos críticos (baixa com timestamp, fatura zerando limite, parcelas geradas, ajuste com motivo), revisão de acessibilidade e responsivo, README de operação e backup. Saída: projeto entregue e documentado.

## 7. Definição de pronto (vale para todo épico)

Um épico só é dado como concluído quando: compila sem erros de TypeScript, passa no lint, o fluxo funciona no mobile e no desktop, nos dois temas, respeita os padrões da seção 5, tem commit com mensagem descritiva, e o `PROGRESSO.md` foi atualizado com o que foi feito e o que ficou pendente.
