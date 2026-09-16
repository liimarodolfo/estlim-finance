-- ESTLIM · o dono passa a ser sempre uma pessoa ou a empresa
--
-- "Casal" existia como dono desde o inicio, e na pratica virou o balde onde
-- caia tudo o que era dos dois: 8 lancamentos, R$ 9.859,26. Isso tirava o
-- sentido do relatorio por pessoa, onde o Casal aparecia com R$ 8.359,26 de
-- despesa e nenhuma receita, sem responder de quem era.
--
-- Decisao do Rodolfo em 16/09/2026: tudo o que estava em Casal passa para a
-- Thainy, e a partir daqui e sempre Rodolfo, Thainy ou RLiima.
--
-- Por que constraint e nao remover o valor do enum: tirar um rotulo de um enum
-- exige recriar o tipo e reescrever toda coluna e toda view que depende dele,
-- inclusive a v_lancamentos. O risco nao paga o ganho, porque a constraint ja
-- deixa o valor inalcancavel. Do lado de fora o efeito e o mesmo: Casal nao
-- aparece em lugar nenhum e nao pode voltar.
--
-- Nenhum gatilho de lancamentos reage a coluna dono, entao este update nao
-- mexe em saldo, em limite usado nem dispara notificacao.

update lancamentos   set dono = 'Thainy' where dono = 'Casal';
update carteiras     set dono = 'Thainy' where dono = 'Casal';
update investimentos set dono = 'Thainy' where dono = 'Casal';

alter table lancamentos   add constraint chk_dono_sem_casal check (dono <> 'Casal');
alter table carteiras     add constraint chk_dono_sem_casal check (dono <> 'Casal');
alter table investimentos add constraint chk_dono_sem_casal check (dono <> 'Casal');
