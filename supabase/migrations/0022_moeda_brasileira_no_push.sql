-- ESTLIM · o valor da notificacao sai em real, nao em dolar
--
-- A primeira notificacao de teste chegou com "R$ 1,800.00". Os simbolos G e D
-- do to_char seguem o lc_numeric do banco, que aqui e en_US, entao o separador
-- de milhar virava virgula e o decimal virava ponto.
--
-- Com mascara literal os separadores ficam fixos no formato americano, e o
-- translate os inverte para o brasileiro de forma previsivel, sem depender de
-- configuracao nenhuma do servidor.

create or replace function private.fn_moeda_br(p_valor numeric)
returns text language sql immutable set search_path = public as $$
  select 'R$ ' || translate(to_char(coalesce(p_valor, 0), 'FM999,999,990.00'), ',.', '.,')
$$;

-- fn_avisos_para_push passa a usar o formatador. A definicao completa dela
-- esta na 0023, que tambem acerta o fuso das datas.
