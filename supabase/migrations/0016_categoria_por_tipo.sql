-- ESTLIM · categoria de despesa e categoria de receita
-- Uma categoria passa a dizer para que tipo de lancamento ela serve, para o
-- formulario so oferecer o que faz sentido. 'ambas' existe porque Ajuste de
-- saldo aparece nos dois lados (entrada e retirada), Investimentos recebe tanto
-- o aporte quanto o resgate, e a Empresa RLiima recebe tanto a receita da PJ
-- quanto a fatura do cartao dela.

create type categoria_tipo as enum ('despesa','receita','ambas');

alter table categorias add column tipo categoria_tipo not null default 'despesa';

-- Classificacao do que ja existe, olhando o uso real de cada uma.
update categorias set tipo = 'receita' where nome in ('Salário','Pro-labore');
update categorias set tipo = 'ambas'   where nome in ('Ajuste de saldo','Investimentos','Empresa RLiima');

-- Orcamento mensal so faz sentido em categoria de despesa.
update categorias set orcamento_mensal = 0 where tipo = 'receita';
