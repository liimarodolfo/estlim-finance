-- ESTLIM · endurecimento apontado pelo linter de seguranca
--
-- 1. search_path fixo em todas as funcoes. Sem isso, quem controla o search_path
--    da sessao pode fazer a funcao chamar outra tabela ou outro operador com o
--    mesmo nome. Em funcao security definer isso e escalada de privilegio.
--
-- 2. fn_virada_mes e fn_marcar_atrasados saem do schema public. As duas sao
--    security definer e atravessam todos os casais, porque quem chama e o cron.
--    No public elas viravam rota REST: qualquer anonimo podia disparar uma
--    replicacao de contas fixas no banco inteiro. Em private, o PostgREST nao
--    enxerga, e o cron continua chamando normalmente.

-- ============ SEARCH PATH FIXO ============
alter function public.fn_criar_ajuste(uuid, ajuste_tipo, numeric, text) set search_path = public;
alter function public.fn_excluir_carteira(uuid)      set search_path = public;
alter function public.fn_excluir_categoria(uuid)     set search_path = public;
alter function public.fn_excluir_corretora(uuid)     set search_path = public;
alter function public.fn_excluir_investimento(uuid)  set search_path = public;
alter function public.fn_criar_lancamentos(
  lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date,
  uuid, metodo_tipo, text, dono_tipo, uuid, int
) set search_path = public;

alter function private.fn_data_no_mes(int, int, int)  set search_path = public;
alter function private.fn_protege_categoria()         set search_path = public;
alter function private.fn_criar_fatura()              set search_path = public;
alter function private.fn_fatura_pagamento()          set search_path = public;
alter function private.fn_aporte_investimento()       set search_path = public;
alter function private.fn_status_do_pagamento()       set search_path = public;

-- ============ AS DUAS DO CRON SAEM DA API ============
create or replace function private.fn_marcar_atrasados()
returns int language plpgsql security definer set search_path = public as $$
declare v_qtd int;
begin
  update lancamentos
     set status = 'atrasado'
   where status = 'pendente'
     and tipo = 'despesa'
     and data_vencimento < current_date;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end $$;

create or replace function private.fn_virada_mes(p_referencia date default current_date)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_inicio date := date_trunc('month', p_referencia)::date;
  v_anterior date := (v_inicio - interval '1 month')::date;
  v_fim_anterior date := (v_inicio - interval '1 day')::date;
  v_qtd int;
begin
  insert into lancamentos (
    casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
    data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref,
    dono, cartao_id, investimento_id, criado_por
  )
  select
    a.casal_id, a.tipo, a.descricao, a.pagar_a, a.natureza, a.tipo_valor,
    case when a.tipo_valor = 'variavel' then null else a.valor_previsto end,
    null,
    private.fn_data_no_mes(
      extract(year from v_inicio)::int,
      extract(month from v_inicio)::int,
      extract(day from a.data_vencimento)::int
    ),
    'pendente', a.categoria_id, a.forma_metodo, a.forma_ref,
    a.dono, a.cartao_id, a.investimento_id, a.criado_por
  from lancamentos a
  where a.natureza = 'fixa'
    and a.data_vencimento between v_anterior and v_fim_anterior
    and not exists (
      select 1 from lancamentos b
       where b.casal_id = a.casal_id
         and b.descricao = a.descricao
         and b.dono = a.dono
         and b.data_vencimento >= v_inicio
         and b.data_vencimento < (v_inicio + interval '1 month')
    );

  get diagnostics v_qtd = row_count;
  perform private.fn_marcar_atrasados();
  return v_qtd;
end $$;

revoke all on function private.fn_marcar_atrasados() from public, anon, authenticated;
revoke all on function private.fn_virada_mes(date)   from public, anon, authenticated;

-- Reagenda apontando para as novas, e derruba as antigas do schema exposto.
select cron.unschedule('estlim-virada-de-mes');
select cron.unschedule('estlim-atrasados');
select cron.schedule('estlim-virada-de-mes', '10 0 1 * *', $cron$ select private.fn_virada_mes(); $cron$);
select cron.schedule('estlim-atrasados',     '0 3 * * *',  $cron$ select private.fn_marcar_atrasados(); $cron$);

drop function if exists public.fn_virada_mes(date);
drop function if exists public.fn_marcar_atrasados();
