-- ESTLIM · schema base
-- Multi-inquilino por casal_id desde o inicio, como decidido no Epico 0.
-- Valores monetarios sempre numeric(12,2), nunca float.

-- ============ ENUMS ============
create type dono_tipo        as enum ('Rodolfo','Thainy','Casal','RLiima');
create type lanc_tipo        as enum ('receita','despesa','investimento');
create type invest_sub       as enum ('ativo','caixinha');
create type instituicao_tipo as enum ('banco','corretora');
create type natureza_tipo    as enum ('fixa','avulsa','parcelada');
create type valor_tipo       as enum ('fixo','variavel');
create type status_tipo      as enum ('pendente','pago','atrasado');
create type metodo_tipo      as enum ('pix','credito','debito','dinheiro','transferencia');
create type carteira_tipo    as enum ('conta','cartao','dinheiro');
create type ajuste_tipo      as enum ('entrada','retirada');

-- ============ CASAIS E PERFIS ============
create table casais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  casal_id uuid not null references casais(id),
  nome text not null,
  telefone text,
  foto_url text,
  criado_em timestamptz not null default now()
);
create index perfis_casal_idx on perfis (casal_id);

-- ============ CARTEIRAS ============
create table carteiras (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  dono dono_tipo not null,
  tipo carteira_tipo not null,
  nome text not null,
  banco text,                        -- slug da marca ou 'custom'
  banco_nome text,                   -- nome digitado quando custom
  bandeira text,                     -- mastercard | visa | elo
  funcao text,                       -- ex: Debito e Credito
  cor_gradiente text,
  descricao text,                    -- ex: Ag 0912 · CC 34871-2
  saldo numeric(12,2) not null default 0,
  limite numeric(12,2) not null default 0,
  usado numeric(12,2) not null default 0,
  dia_fechamento smallint check (dia_fechamento between 1 and 31),
  dia_vencimento smallint check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index carteiras_casal_idx on carteiras (casal_id, tipo);

-- ============ CATEGORIAS ============
create table categorias (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  nome text not null,
  icone text not null default 'fa-tag',
  cor text not null default '#12a06e',
  orcamento_mensal numeric(12,2) not null default 0,
  protegida boolean not null default false,   -- Salario, Ajuste de saldo e Investimentos
  unique (casal_id, nome)
);

-- ============ CORRETORAS E INVESTIMENTOS ============
-- Vem antes de lancamentos porque o aporte referencia o investimento de destino.
create table corretoras (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  nome text not null,
  logo_url text,                     -- Storage, bucket corretoras
  cor text not null default '#6d4aff',
  criado_em timestamptz not null default now()
);
create index corretoras_casal_idx on corretoras (casal_id);

create table investimentos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  sub invest_sub not null,           -- ativo | caixinha
  nome text not null,
  descricao text,
  valor numeric(12,2) not null default 0,
  rentabilidade text,                -- texto livre, ex: 110% CDI
  instituicao_tipo instituicao_tipo not null,
  carteira_id uuid references carteiras(id),    -- quando instituicao_tipo = banco
  corretora_id uuid references corretoras(id),  -- quando instituicao_tipo = corretora
  dono dono_tipo not null,
  criado_em timestamptz not null default now(),
  -- Banco e corretora nunca convivem no mesmo investimento.
  constraint chk_instituicao check (
    (instituicao_tipo = 'banco'     and carteira_id is not null and corretora_id is null) or
    (instituicao_tipo = 'corretora' and corretora_id is not null and carteira_id is null)
  )
);
create index investimentos_casal_idx on investimentos (casal_id, sub);

-- ============ LANCAMENTOS ============
create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  tipo lanc_tipo not null,
  descricao text not null,
  pagar_a text,
  natureza natureza_tipo not null default 'avulsa',
  tipo_valor valor_tipo not null default 'fixo',
  valor_previsto numeric(12,2),      -- null significa o selo Adicionar valor
  data_emissao date,
  data_vencimento date not null,
  status status_tipo not null default 'pendente',
  categoria_id uuid references categorias(id),
  forma_metodo metodo_tipo,
  forma_ref text,                    -- id da carteira, ou Rodolfo / Thainy no dinheiro
  dono dono_tipo not null,
  cartao_id uuid references carteiras(id) on delete set null,           -- fatura automatica
  investimento_id uuid references investimentos(id) on delete set null, -- destino do aporte
  grupo_parcelas uuid,
  parcela_atual smallint,
  parcela_total smallint,
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now(),
  -- Aporte nunca sai no credito, porque nao existe investir parcelado na fatura.
  constraint chk_aporte_sem_credito check (tipo <> 'investimento' or forma_metodo is distinct from 'credito'),
  -- Valor so pode faltar em lancamento de valor variavel.
  constraint chk_valor_obrigatorio check (tipo_valor = 'variavel' or valor_previsto is not null),
  constraint chk_parcelas check (
    (parcela_atual is null and parcela_total is null) or
    (parcela_atual between 1 and parcela_total)
  )
);
create index lancamentos_venc_idx   on lancamentos (casal_id, data_vencimento);
create index lancamentos_status_idx on lancamentos (casal_id, status);
create index lancamentos_grupo_idx  on lancamentos (grupo_parcelas);
create index lancamentos_cartao_idx on lancamentos (cartao_id);
create index lancamentos_invest_idx on lancamentos (investimento_id);

-- ============ PAGAMENTOS ============
-- Uma linha por baixa. Data e hora sao as do clique no check, nunca as do vencimento.
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null unique references lancamentos(id) on delete cascade,
  data_pagamento date not null,
  hora_pagamento time not null,
  valor_pago numeric(12,2) not null,
  forma_metodo metodo_tipo,
  forma_ref text,
  confirmado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);

-- ============ BALANCOS ============
create table balancos (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  mes smallint not null check (mes between 1 and 12),
  ano smallint not null,
  receitas_previstas numeric(12,2),
  receitas_realizadas numeric(12,2),
  despesas_previstas numeric(12,2),
  despesas_realizadas numeric(12,2),
  aprovado boolean not null default false,
  aprovado_por uuid references perfis(id),
  aprovado_em timestamptz,
  unique (casal_id, mes, ano)
);

-- ============ AJUSTES ============
-- Motivo obrigatorio no proprio schema, para nao depender so da validacao da tela.
create table ajustes (
  id uuid primary key default gen_random_uuid(),
  casal_id uuid not null references casais(id),
  carteira_id uuid not null references carteiras(id),
  tipo ajuste_tipo not null,
  valor numeric(12,2) not null check (valor > 0),
  motivo text not null check (length(trim(motivo)) > 0),
  lancamento_id uuid references lancamentos(id),
  criado_por uuid references perfis(id),
  criado_em timestamptz not null default now()
);
create index ajustes_casal_idx on ajustes (casal_id, criado_em desc);

-- ============ VIEW DA FATURA SINCRONIZADA ============
-- O frontend le daqui, entao nunca recalcula fatura na tela.
-- security_invoker garante que a view respeita o RLS de quem consulta.
create view v_lancamentos with (security_invoker = true) as
select
  l.*,
  case
    when l.cartao_id is not null and l.status <> 'pago' then c.usado
    else l.valor_previsto
  end as valor_exibido,
  case
    when l.cartao_id is not null and l.status <> 'pago' then c.dia_vencimento
    else extract(day from l.data_vencimento)::int
  end as dia_exibido
from lancamentos l
left join carteiras c on c.id = l.cartao_id;
