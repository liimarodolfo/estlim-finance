-- ESTLIM · virada de mes e marcacao de atrasados, agendadas com pg_cron

create extension if not exists pg_cron with schema pg_catalog;

-- ============ ATRASADOS ============
-- Despesa pendente com vencimento no passado vira atrasada.
-- Receita a receber nao "atrasa": quem deve e o outro lado.
create or replace function fn_marcar_atrasados()
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

-- ============ VIRADA DE MES ============
-- Replica as contas fixas do mes anterior para o mes corrente.
-- Decisao do Rodolfo em 14/09/2026: conta fixa de valor variavel nasce SEM
-- valor, com o selo "Adicionar valor", em vez de herdar a media dos 3 ultimos
-- pagos. Isso substitui o que a especificacao tecnica original descrevia.
-- Nao duplica: pula o que ja existe no mes de destino.
create or replace function fn_virada_mes(p_referencia date default current_date)
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

  -- O mes novo ja comeca com os atrasados do passado marcados.
  perform fn_marcar_atrasados();
  return v_qtd;
end $$;

revoke all on function fn_marcar_atrasados() from public;
revoke all on function fn_virada_mes(date) from public;

-- ============ AGENDAMENTOS ============
-- Dia 1 as 00:10 (horario do servidor, UTC) replica as fixas.
-- Todo dia as 03:00 remarca os atrasados.
select cron.schedule('estlim-virada-de-mes', '10 0 1 * *', $cron$ select fn_virada_mes(); $cron$);
select cron.schedule('estlim-atrasados',     '0 3 * * *',  $cron$ select fn_marcar_atrasados(); $cron$);
