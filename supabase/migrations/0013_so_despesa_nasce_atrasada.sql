-- ESTLIM · so despesa nasce atrasada
-- fn_criar_lancamentos marcava como atrasado qualquer lancamento com
-- vencimento no passado, inclusive receita. Isso contradiz fn_marcar_atrasados,
-- que so olha despesa, e a regra do produto: receita a receber nao atrasa,
-- porque quem deve e o outro lado. Apareceu na tela: um salario retroativo
-- entrou com o selo vermelho de atrasado.
--
-- Unica mudanca no corpo da funcao: o case do status ganhou a condicao
-- `p_tipo = 'despesa'`. O resto e identico a 0011.

create or replace function fn_criar_lancamentos(
  p_tipo lanc_tipo, p_descricao text, p_pagar_a text, p_natureza natureza_tipo,
  p_tipo_valor valor_tipo, p_valor numeric, p_data_emissao date, p_data_vencimento date,
  p_categoria_id uuid, p_forma_metodo metodo_tipo, p_forma_ref text, p_dono dono_tipo,
  p_investimento_id uuid default null, p_parcelas int default 1
) returns uuid
language plpgsql
as $$
declare
  v_casal uuid := private.meu_casal();
  v_grupo uuid;
  v_total int := greatest(coalesce(p_parcelas, 1), 1);
  v_dia int;
  v_cartao carteiras%rowtype;
  v_primeiro uuid;
  v_id uuid;
  v_data date;
  k int;
begin
  if v_casal is null then
    raise exception 'Sessão sem perfil. Entre de novo.' using errcode = 'insufficient_privilege';
  end if;
  if p_descricao is null or length(trim(p_descricao)) = 0 then
    raise exception 'Informe a descrição do lançamento.' using errcode = 'check_violation';
  end if;

  if p_natureza <> 'parcelada' then
    v_total := 1;
  end if;

  v_dia := extract(day from p_data_vencimento)::int;
  if p_forma_metodo = 'credito' and p_forma_ref is not null then
    select * into v_cartao from carteiras where id = p_forma_ref::uuid and tipo = 'cartao';
    if found and v_cartao.dia_vencimento is not null then
      v_dia := v_cartao.dia_vencimento;
    end if;
  end if;

  if v_total > 1 then
    v_grupo := gen_random_uuid();
  end if;

  for k in 0 .. v_total - 1 loop
    v_data := private.fn_data_no_mes(
      extract(year  from (p_data_vencimento + (k || ' month')::interval))::int,
      extract(month from (p_data_vencimento + (k || ' month')::interval))::int,
      v_dia
    );

    insert into lancamentos (
      casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
      data_emissao, data_vencimento, status, categoria_id, forma_metodo, forma_ref,
      dono, investimento_id, grupo_parcelas, parcela_atual, parcela_total, criado_por
    ) values (
      v_casal, p_tipo, trim(p_descricao), p_pagar_a, p_natureza, p_tipo_valor, p_valor,
      p_data_emissao, v_data,
      case when p_tipo = 'despesa' and v_data < current_date
           then 'atrasado'::status_tipo
           else 'pendente'::status_tipo end,
      p_categoria_id, p_forma_metodo, p_forma_ref, p_dono, p_investimento_id,
      v_grupo,
      case when v_total > 1 then k + 1 end,
      case when v_total > 1 then v_total end,
      auth.uid()
    ) returning id into v_id;

    if k = 0 then v_primeiro := v_id; end if;
  end loop;

  return v_primeiro;
end $$;

-- Conserta o que ja tinha entrado errado.
update lancamentos set status = 'pendente'
 where status = 'atrasado' and tipo <> 'despesa';
