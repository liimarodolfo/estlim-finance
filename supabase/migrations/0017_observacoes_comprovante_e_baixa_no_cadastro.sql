-- ESTLIM · observacoes, comprovante de pagamento e baixa ja no cadastro
--
-- Tres coisas que faltavam no formulario de lancamento:
--   1. um campo livre de observacoes;
--   2. o anexo do comprovante, guardado no Storage;
--   3. o check "ja foi paga/recebida", que grava a baixa junto com o
--      lancamento, com data e hora editaveis em vez do instante do clique.
--
-- A regra do check de baixa continua valendo: quem marca pelo botao da lista
-- tem a data e a hora do clique capturadas. Aqui e outra coisa, o cadastro
-- retroativo de algo que ja aconteceu, entao a data e a hora sao informadas.

-- ============ COLUNAS ============
-- A view foi criada com l.*, que o Postgres congela na lista de colunas do
-- momento. Sem recriar, as colunas novas nao chegam ao frontend.
drop view v_lancamentos;

alter table lancamentos
  add column observacoes     text,
  add column comprovante_url text;

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

-- A view nasce de novo, entao o grant tambem. Ela e security_invoker: quem le
-- continua passando pelo RLS de lancamentos.
grant select on v_lancamentos to authenticated;

-- ============ BUCKET DOS COMPROVANTES ============
-- Privado, primeira pasta do caminho e o casal_id, igual ao de corretoras.
-- Aceita imagem e PDF, porque comprovante de banco costuma vir em PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes','comprovantes', false, 5242880,
        array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy comprovantes_sel on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = private.meu_casal()::text);
create policy comprovantes_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = private.meu_casal()::text);
create policy comprovantes_upd on storage.objects for update to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = private.meu_casal()::text)
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = private.meu_casal()::text);
create policy comprovantes_del on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = private.meu_casal()::text);

-- ============ CRIAR LANCAMENTO, AGORA COM OBSERVACOES E BAIXA ============
drop function if exists fn_criar_lancamentos(
  lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date,
  uuid, metodo_tipo, text, dono_tipo, uuid, int
);

create or replace function fn_criar_lancamentos(
  p_tipo lanc_tipo,
  p_descricao text,
  p_pagar_a text,
  p_natureza natureza_tipo,
  p_tipo_valor valor_tipo,
  p_valor numeric,
  p_data_emissao date,
  p_data_vencimento date,
  p_categoria_id uuid,
  p_forma_metodo metodo_tipo,
  p_forma_ref text,
  p_dono dono_tipo,
  p_investimento_id uuid default null,
  p_parcelas int default 1,
  p_observacoes text default null,
  p_comprovante_url text default null,
  p_pago boolean default false,
  p_pago_data date default null,
  p_pago_hora time default null
) returns uuid
language plpgsql
set search_path = public
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
  if p_pago and p_valor is null then
    raise exception 'Informe o valor para marcar como já pago.' using errcode = 'check_violation';
  end if;

  if p_natureza <> 'parcelada' then
    v_total := 1;
  end if;

  -- No credito, quem manda no dia do vencimento e o cartao.
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
      dono, investimento_id, grupo_parcelas, parcela_atual, parcela_total,
      observacoes, comprovante_url, criado_por
    ) values (
      v_casal, p_tipo, trim(p_descricao), p_pagar_a, p_natureza, p_tipo_valor, p_valor,
      p_data_emissao, v_data,
      case when v_data < current_date then 'atrasado'::status_tipo else 'pendente'::status_tipo end,
      p_categoria_id, p_forma_metodo, p_forma_ref, p_dono, p_investimento_id,
      v_grupo,
      case when v_total > 1 then k + 1 end,
      case when v_total > 1 then v_total end,
      nullif(trim(coalesce(p_observacoes, '')), ''), p_comprovante_url,
      auth.uid()
    ) returning id into v_id;

    if k = 0 then v_primeiro := v_id; end if;
  end loop;

  -- A baixa do cadastro vale so para a primeira parcela. Marcar 5 parcelas
  -- futuras como pagas de uma vez nao existe no mundo real.
  if p_pago then
    insert into pagamentos (
      lancamento_id, data_pagamento, hora_pagamento, valor_pago,
      forma_metodo, forma_ref, confirmado_por
    ) values (
      v_primeiro, coalesce(p_pago_data, current_date), coalesce(p_pago_hora, localtime),
      p_valor, p_forma_metodo, p_forma_ref, auth.uid()
    );
  end if;

  return v_primeiro;
end $$;

revoke all on function fn_criar_lancamentos(
  lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date,
  uuid, metodo_tipo, text, dono_tipo, uuid, int, text, text, boolean, date, time
) from public;
grant execute on function fn_criar_lancamentos(
  lanc_tipo, text, text, natureza_tipo, valor_tipo, numeric, date, date,
  uuid, metodo_tipo, text, dono_tipo, uuid, int, text, text, boolean, date, time
) to authenticated;
