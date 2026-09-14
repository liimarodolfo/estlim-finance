-- ESTLIM · seed
-- Cria o casal e as dez categorias padrao, com icone e cor iguais aos do prototipo v40.
-- Orcamento comeca em zero em todas (suposicao S3 do PROGRESSO): sem alerta de
-- estouro ate o Rodolfo definir o teto de cada uma na tela de Categorias.
-- Contas, cartoes, investimentos e lancamentos entram pelo app (suposicao S1).
-- Idempotente: pode rodar de novo sem duplicar nada.

insert into casais (id, nome)
values ('00000000-0000-4000-8000-000000000001', 'Esteves Liima')
on conflict (id) do nothing;

insert into categorias (casal_id, nome, icone, cor, orcamento_mensal, protegida) values
  ('00000000-0000-4000-8000-000000000001', 'Moradia',            'fa-house',          '#5a2be2', 0, false),
  ('00000000-0000-4000-8000-000000000001', 'Alimentação',        'fa-cart-shopping',  '#ff385c', 0, false),
  ('00000000-0000-4000-8000-000000000001', 'Transporte',         'fa-car',            '#0099ff', 0, false),
  ('00000000-0000-4000-8000-000000000001', 'Dívidas e parcelas', 'fa-credit-card',    '#f5a623', 0, false),
  ('00000000-0000-4000-8000-000000000001', 'Contas fixas',       'fa-bolt',           '#12b48a', 0, false),
  ('00000000-0000-4000-8000-000000000001', 'Lazer',              'fa-clapperboard',   '#c052e8', 0, false),
  ('00000000-0000-4000-8000-000000000001', 'Empresa RLiima',     'fa-building',       '#0e7490', 0, false),
  -- As tres protegidas nao podem ser excluidas nem renomeadas: o sistema depende
  -- delas para o salario, para o espelho do ajuste de saldo e para os aportes.
  ('00000000-0000-4000-8000-000000000001', 'Salário',            'fa-briefcase',      '#12855a', 0, true),
  ('00000000-0000-4000-8000-000000000001', 'Ajuste de saldo',    'fa-scale-balanced', '#6a6a6a', 0, true),
  ('00000000-0000-4000-8000-000000000001', 'Investimentos',      'fa-seedling',       '#6d4aff', 0, true)
on conflict (casal_id, nome) do nothing;
