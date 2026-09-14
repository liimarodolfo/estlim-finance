# ESTLIM · Especificação Técnica

Referência para os Épicos 1, 2 e 8. O Claude Code deve implementar as migrations a partir daqui, ajustando o que as respostas do Épico 0 exigirem.

## 1. Estrutura de pastas

```
src/
├── lib/          supabase.ts, formatters.ts (moeda, data DD/MM/AAAA, hora 24h), masks.ts
├── store/        useFiltros.ts (mês, ano, dono, filtro de lista), useTema.ts
├── hooks/        useLancamentos, useCarteiras, useCategorias, useDashboard, usePagamentos, useBalanco, usePerfil, useInvestimentos, useCorretoras
├── features/
│   ├── dashboard/  lancamentos/  carteira/  agenda/  categorias/  investimentos/  perfil/  auth/
├── ui/           Sheet, Toast, CheckCircle, Chip, MiniBadge, StatusBadge, CardGradiente,
│                 SeletorCor, InputData, InputHora, InputTelefone, BotaoPill, FAB, BottomNav
├── styles/       tokens.css (variáveis light/dark copiadas do v27)
└── types/        database.ts (gerado pelo Supabase)
supabase/
├── migrations/   0001_schema.sql, 0002_rls.sql, 0003_functions.sql, 0004_triggers.sql, 0005_cron.sql
├── seed.sql
└── functions/    virada-mes/, notificacoes-push/
```

## 2. Schema (Postgres)

```sql
-- enums
create type dono_tipo as enum ('Rodolfo','Thainy','Casal','RLiima');
create type lanc_tipo as enum ('receita','despesa','investimento');
create type invest_sub as enum ('ativo','caixinha');
create type instituicao_tipo as enum ('banco','corretora');
create type natureza_tipo as enum ('fixa','avulsa','parcelada');
create type valor_tipo as enum ('fixo','variavel');
create type status_tipo as enum ('pendente','pago','atrasado');
create type metodo_tipo as enum ('pix','credito','debito','dinheiro','transferencia');
create type carteira_tipo as enum ('conta','cartao','dinheiro');
create type ajuste_tipo as enum ('entrada','retirada');

create table casais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz default now()
);

create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  casal_id uuid not null references casais(id),
  nome text not null,
  telefone text,
  foto_url text,
  criado_em timestamptz default now()
);

create table carteiras (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  dono dono_tipo not null,
  tipo carteira_tipo not null,
  nome text not null,
  banco text,              -- slug da marca ou 'custom'
  banco_nome text,         -- nome digitado quando custom
  bandeira text,           -- mastercard | visa | elo
  funcao text,             -- ex: 'Débito e Crédito'
  cor_gradiente text,
  descricao text,          -- ex: 'Ag 0912 · CC 34871-2'
  saldo numeric(12,2) default 0,
  limite numeric(12,2) default 0,
  usado numeric(12,2) default 0,
  dia_fechamento smallint,
  dia_vencimento smallint,
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  nome text not null,
  icone text default 'fa-tag',
  cor text default '#12a06e',
  orcamento_mensal numeric(12,2) default 0,
  protegida boolean default false   -- Salário e Ajuste de saldo
);

create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  tipo lanc_tipo not null,
  descricao text not null,
  pagar_a text,
  natureza natureza_tipo not null default 'avulsa',
  tipo_valor valor_tipo not null default 'fixo',
  valor_previsto numeric(12,2),          -- null = "Adicionar valor"
  data_emissao date,
  data_vencimento date not null,
  status status_tipo not null default 'pendente',
  categoria_id uuid references categorias(id),
  forma_metodo metodo_tipo,
  forma_ref text,                        -- id da carteira ou 'Rodolfo'/'Thainy' para dinheiro
  dono dono_tipo not null,
  cartao_id uuid references carteiras(id) on delete set null,  -- fatura automática
  investimento_id uuid references investimentos(id) on delete set null,  -- destino do aporte
  grupo_parcelas uuid,
  parcela_atual smallint,
  parcela_total smallint,
  criado_por uuid references perfis(id),
  criado_em timestamptz default now()
);
create index on lancamentos (casal_id, data_vencimento);
create index on lancamentos (casal_id, status);
create index on lancamentos (grupo_parcelas);
create index on lancamentos (cartao_id);

create table corretoras (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  nome text not null,
  logo_url text,                         -- Storage, bucket 'corretoras'
  cor text default '#6d4aff',
  criado_em timestamptz default now()
);

create table investimentos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  sub invest_sub not null,               -- ativo | caixinha
  nome text not null,
  descricao text,
  valor numeric(12,2) not null default 0,
  rentabilidade text,                    -- texto livre, ex: '110% CDI'
  instituicao_tipo instituicao_tipo not null,
  carteira_id uuid references carteiras(id),   -- quando instituicao_tipo = 'banco'
  corretora_id uuid references corretoras(id), -- quando instituicao_tipo = 'corretora'
  dono dono_tipo not null,
  criado_em timestamptz default now(),
  constraint chk_instituicao check (
    (instituicao_tipo = 'banco' and carteira_id is not null and corretora_id is null) or
    (instituicao_tipo = 'corretora' and corretora_id is not null and carteira_id is null)
  )
);
create index on investimentos (casal_id, sub);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null unique references lancamentos(id) on delete cascade,
  data_pagamento date not null,
  hora_pagamento time not null,          -- capturada no clique do check
  valor_pago numeric(12,2) not null,
  forma_metodo metodo_tipo,
  forma_ref text,
  confirmado_por uuid references perfis(id),
  criado_em timestamptz default now()
);

create table balancos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  mes smallint not null,
  ano smallint not null,
  receitas_previstas numeric(12,2), receitas_realizadas numeric(12,2),
  despesas_previstas numeric(12,2), despesas_realizadas numeric(12,2),
  aprovado boolean default false,
  aprovado_por uuid references perfis(id),
  aprovado_em timestamptz,
  unique (casal_id, mes, ano)
);

create table ajustes (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  carteira_id uuid not null references carteiras(id),
  tipo ajuste_tipo not null,
  valor numeric(12,2) not null,
  motivo text not null check (length(trim(motivo)) > 0),   -- obrigatório
  lancamento_id uuid references lancamentos(id),
  criado_por uuid references perfis(id),
  criado_em timestamptz default now()
);
```

## 3. RLS

Padrão para todas as tabelas de dados: leitura e escrita apenas de linhas do próprio casal.

```sql
create or replace function meu_casal() returns uuid language sql stable as $$
  select casal_id from perfis where id = auth.uid()
$$;

alter table lancamentos enable row level security;
create policy sel on lancamentos for select using (casal_id = meu_casal());
create policy ins on lancamentos for insert with check (casal_id = meu_casal());
create policy upd on lancamentos for update using (casal_id = meu_casal());
create policy del on lancamentos for delete using (casal_id = meu_casal());
```
Replicar para carteiras, categorias, balancos, ajustes, corretoras, investimentos e pagamentos (neste caso via join com lancamentos). `perfis`: cada um lê o próprio perfil e os do mesmo casal, e edita apenas o próprio.

## 4. View da fatura sincronizada

```sql
create view v_lancamentos as
select l.*,
  case
    when l.cartao_id is not null and l.status <> 'pago'
      then c.usado
    else l.valor_previsto
  end as valor_exibido,
  case
    when l.cartao_id is not null and l.status <> 'pago'
      then c.dia_vencimento
    else extract(day from l.data_vencimento)::int
  end as dia_exibido
from lancamentos l
left join carteiras c on c.id = l.cartao_id;
```
O frontend consome `v_lancamentos`, então nunca precisa recalcular a fatura.

## 5. Funções e triggers (Épico 8)

**Fatura automática ao criar cartão**
```sql
create or replace function fn_criar_fatura() returns trigger language plpgsql as $$
declare conta_id uuid; cat_id uuid;
begin
  if new.tipo <> 'cartao' then return new; end if;
  select id into conta_id from carteiras
    where casal_id = new.casal_id and tipo = 'conta' and dono = new.dono limit 1;
  select id into cat_id from categorias
    where casal_id = new.casal_id
      and nome = case when new.dono = 'RLiima' then 'Empresa RLiima' else 'Dívidas e parcelas' end;
  insert into lancamentos (casal_id, tipo, descricao, pagar_a, natureza, tipo_valor,
    valor_previsto, data_vencimento, categoria_id, forma_metodo, forma_ref, dono, cartao_id)
  values (new.casal_id, 'despesa', 'Fatura ' || new.nome, new.nome, 'fixa', 'variavel',
    new.usado, make_date(extract(year from current_date)::int,
                         extract(month from current_date)::int,
                         least(coalesce(new.dia_vencimento,10), 28)),
    cat_id, 'debito', conta_id::text, new.dono, new.id);
  return new;
end $$;
create trigger trg_criar_fatura after insert on carteiras
  for each row execute function fn_criar_fatura();
```

**Pagar fatura zera o limite usado, desfazer restaura**
```sql
create or replace function fn_fatura_pagamento() returns trigger language plpgsql as $$
declare card_id uuid;
begin
  if TG_OP = 'INSERT' then
    select cartao_id into card_id from lancamentos where id = new.lancamento_id;
    if card_id is not null then update carteiras set usado = 0 where id = card_id; end if;
  elsif TG_OP = 'DELETE' then
    select cartao_id into card_id from lancamentos where id = old.lancamento_id;
    if card_id is not null then update carteiras set usado = old.valor_pago where id = card_id; end if;
  end if;
  return null;
end $$;
create trigger trg_fatura_pagamento after insert or delete on pagamentos
  for each row execute function fn_fatura_pagamento();
```

**Aporte movimenta o investimento**
```sql
create or replace function fn_aporte_investimento() returns trigger language plpgsql as $$
declare inv_id uuid; v numeric(12,2);
begin
  if TG_OP = 'INSERT' then
    select investimento_id into inv_id from lancamentos
      where id = new.lancamento_id and tipo = 'investimento';
    if inv_id is not null then
      update investimentos set valor = valor + new.valor_pago where id = inv_id;
    end if;
  elsif TG_OP = 'DELETE' then
    select investimento_id into inv_id from lancamentos
      where id = old.lancamento_id and tipo = 'investimento';
    if inv_id is not null then
      update investimentos set valor = greatest(0, valor - old.valor_pago) where id = inv_id;
    end if;
  end if;
  return null;
end $$;
create trigger trg_aporte_investimento after insert or delete on pagamentos
  for each row execute function fn_aporte_investimento();
```

**Geração de parcelas** (`fn_gerar_parcelas(p_base jsonb, p_total int)`): usa `generate_series(0, p_total-1)` inserindo um lançamento por mês com `data_vencimento = data_base + (k || ' month')::interval`, `grupo_parcelas` compartilhado e `parcela_atual = k+1`. Quando `forma_metodo = 'credito'`, o dia do vencimento vem do `dia_vencimento` do cartão referenciado. Cruza a virada de ano naturalmente.

**Virada de mês** (`fn_virada_mes()`, agendada com pg_cron no dia 1 às 00:10): replica lançamentos `natureza = 'fixa'` do mês anterior; quando `tipo_valor = 'variavel'`, o novo `valor_previsto` é a média dos 3 últimos `valor_pago` daquela descrição, ou null se não houver histórico.

**Atrasados** (pg_cron diário): `update lancamentos set status = 'atrasado' where status = 'pendente' and data_vencimento < current_date;`

**Ajuste atômico** (`fn_criar_ajuste(...)`): valida motivo não vazio, atualiza o saldo da carteira, insere em `ajustes` e cria o lançamento pago espelho, tudo na mesma transação.

**Dashboard** (`fn_dashboard(p_mes, p_ano)`): retorna jsonb com receitas e despesas previstas e realizadas, contagem de pendências, gastos agrupados por categoria, série dos 6 meses anteriores, patrimônio investido total (com quebra entre ativos e caixinhas) e aportes do mês, em uma chamada só. Lançamentos de tipo `investimento` nunca entram nas somas de despesa.

## 6. Realtime

```ts
supabase.channel('estlim')
  .on('postgres_changes',{event:'*',schema:'public',table:'lancamentos'},
      () => qc.invalidateQueries({queryKey:['lancamentos']}))
  .on('postgres_changes',{event:'*',schema:'public',table:'carteiras'},
      () => qc.invalidateQueries({queryKey:['carteiras']}))
  .subscribe();
```

## 7. Storage

Bucket `avatares`, privado, com política que permite ao usuário ler e escrever apenas no caminho `{auth.uid()}/`. Upload com limite de 2 MB e validação de tipo de imagem.

Bucket `corretoras`, para os logos enviados pelo usuário, com leitura permitida ao casal dono do registro e escrita por membros do casal. Mesmo limite de 2 MB e validação de imagem. Sem logo, a interface exibe as iniciais da corretora sobre a cor cadastrada.

## 8. Testes mínimos (Épico 14)

1. Baixa com timestamp: check grava data e hora do clique.
2. Fatura: criar cartão gera fatura; valor acompanha o usado; pagar zera; desfazer restaura.
3. Parcelas: N lançamentos numerados, vencimento do cartão no crédito, virada de ano correta.
4. Ajuste: sem motivo falha e não altera saldo; com motivo altera saldo e cria lançamento.
5. RLS: usuário de um casal não lê linha de outro.
6. Formatos: datas DD/MM/AAAA e horas 24h em toda a interface.
7. Aporte: marcar como aplicado soma ao investimento de destino; desfazer subtrai; aportes não entram na soma de despesas.
8. Investimento: o check de integridade impede banco e corretora preenchidos ao mesmo tempo, e corretora com investimentos vinculados não pode ser excluída.
