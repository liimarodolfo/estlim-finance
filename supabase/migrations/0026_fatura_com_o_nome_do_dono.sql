-- ESTLIM · a fatura passa a dizer de quem ela e
--
-- O nome da fatura e gerado pelo gatilho, e saia so como "Fatura Azul
-- Infinite". Com dois cartoes de bandeira parecida, ou com o mesmo cartao em
-- perfis diferentes, a lista nao respondia a pergunta mais simples: e do
-- Rodolfo ou da Thainy? Agora sai "Fatura Azul Infinite - Rodolfo".
--
-- O separador e hifen, nao travessao, pela regra de escrita do projeto.

create or replace function private.fn_criar_fatura()
returns trigger language plpgsql set search_path = public as $$
declare
  v_conta uuid;
  v_categoria uuid;
begin
  if new.tipo <> 'cartao' then return new; end if;

  select id into v_conta from carteiras
   where casal_id = new.casal_id and tipo = 'conta' and dono = new.dono and ativo
   order by criado_em limit 1;

  select id into v_categoria from categorias
   where casal_id = new.casal_id
     and nome = case when new.dono = 'RLiima' then 'Empresa RLiima' else 'Dívidas e parcelas' end;

  insert into lancamentos (
    casal_id, tipo, descricao, pagar_a, natureza, tipo_valor, valor_previsto,
    data_vencimento, categoria_id, forma_metodo, forma_ref, dono, cartao_id, criado_por
  ) values (
    new.casal_id, 'despesa', 'Fatura ' || new.nome || ' - ' || new.dono,
    new.nome, 'fixa', 'variavel',
    null,
    private.fn_data_no_mes(
      extract(year from private.fn_hoje())::int,
      extract(month from private.fn_hoje())::int,
      coalesce(new.dia_vencimento, 10)
    ),
    v_categoria, 'debito', v_conta::text, new.dono, new.id, auth.uid()
  );

  return new;
end $$;

-- As faturas que ja existem ganham o nome novo. O valor e calculado a partir do
-- cartao e do dono, entao rodar de novo nao acrescenta o nome duas vezes.
--
-- Nenhum gatilho de lancamentos reage a descricao, entao isto nao mexe em
-- saldo, em limite usado nem dispara notificacao. E a fn_virada_mes, que evita
-- duplicata comparando descricao, continua coerente porque as linhas antigas e
-- as novas passam a usar a mesma regra.
update lancamentos l
   set descricao = 'Fatura ' || c.nome || ' - ' || l.dono
  from carteiras c
 where c.id = l.cartao_id
   and l.descricao is distinct from 'Fatura ' || c.nome || ' - ' || l.dono;
