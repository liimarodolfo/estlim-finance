-- ESTLIM · Casal volta a ser dono, e o que era dele volta para la
--
-- A 0027 tinha tirado o Casal e passado os 8 lancamentos dele para a Thainy.
-- O Rodolfo reviu a decisao no mesmo dia: o Casal faz sentido, e vai ganhar
-- carteira propria quando a conta conjunta existir.
--
-- COMO OS 8 FORAM IDENTIFICADOS
-- A 0027 nao guardou quais linhas mudou, entao a volta foi reconstruida e
-- conferida antes de rodar. Antes dela, a medicao era Casal 8 linhas somando
-- 9.859,26 e Thainy 4 somando 4.607,92. Depois, a Thainy tinha 12. Existe um
-- unico jeito de separar essas 12 em 4 + 8 que devolva as duas somas ao
-- centavo, e ele coincide com o sentido de cada lancamento: ficam com a Thainy
-- o salario dela, o celular dela, o imposto dela e a terapia; voltam para o
-- Casal aluguel, energia, agua, internet, a parcela da chacara, o Cartao de
-- Todos e as duas compras da Maria.
--
-- Nenhum gatilho de lancamentos reage a coluna dono, entao este update nao
-- mexe em saldo, em limite usado nem dispara notificacao.

alter table lancamentos   drop constraint if exists chk_dono_sem_casal;
alter table carteiras     drop constraint if exists chk_dono_sem_casal;
alter table investimentos drop constraint if exists chk_dono_sem_casal;

update lancamentos set dono = 'Casal'
 where dono = 'Thainy'
   and id not in (
     'aa10d416-8e45-4388-b977-263ad3fcf53b',  -- Salario Nui
     'e11f90f7-c6da-4def-ac0c-e07b50e4c528',  -- Terapia
     '4f0029b9-6da4-4170-948f-3f081801cb46',  -- Celular Thainy
     '516edc04-daa9-46f1-80d4-7c3a25e848c4'   -- Imposto Thainy
   );
