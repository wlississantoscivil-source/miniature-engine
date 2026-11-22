-- ============================================================
-- A causa de "não realizado" da subtarefa passa a guardar a SEMANA, como a
-- da atividade (revisão de código de 20/11/2026): sem ela, a falha de uma
-- semana continuava contando nas causas das semanas seguintes.
-- As subtarefas que já tinham causa recebem a semana em que foram gravadas
-- (segunda-feira, no horário de Brasília).
-- ============================================================
alter table public.subtarefas_plano
  add column semana_nao_realizado date
    check (semana_nao_realizado is null or extract(isodow from semana_nao_realizado) = 1); -- sempre uma segunda

update public.subtarefas_plano
   set semana_nao_realizado = date_trunc('week', created_at at time zone 'America/Recife')::date
 where causa_nao_realizado is not null;

alter table public.subtarefas_plano
  add constraint subtarefas_plano_causa_com_semana
    check ((causa_nao_realizado is null) = (semana_nao_realizado is null));
