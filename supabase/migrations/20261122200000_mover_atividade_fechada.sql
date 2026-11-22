-- ============================================================
-- Fecha a função mover_atividade (Planejamento) para o "público" do Postgres.
-- Achado da revisão de código de 22/11/2026: toda função nasce executável por
-- PUBLIC (qualquer um, sem login). A 20261120190000 deu o acesso a
-- `authenticated` mas não tirou o de PUBLIC — então o `revoke … from anon`
-- do passo 10 não fecharia nada. Mesmo padrão de importar_planilha.
-- O `anon` continua com a liberação EXPLÍCITA de desenvolvimento
-- (20261120190100), que sai no passo 10.
-- ============================================================
revoke all on function public.mover_atividade(uuid, integer) from public;
grant execute on function public.mover_atividade(uuid, integer) to authenticated, service_role;
