-- ============================================================
-- Fecha as funções das Medições de empreiteiros para o "público" do Postgres.
-- Revisão de código de 22/11/2026: toda função nasce executável por PUBLIC
-- (qualquer um, inclusive quem não fez login). A migration 20261122180000 deu
-- o acesso a `authenticated` mas não tirou o de PUBLIC — então o `revoke …
-- from anon` do passo 10 não fecharia nada. Mesmo padrão de importar_planilha
-- (20261118200100): revoke de public, grant só para quem pode.
-- O `anon` continua com a liberação EXPLÍCITA de desenvolvimento
-- (20261122180100), que sai no passo 10.
-- ============================================================
revoke all on function public.ativar_contrato_empreiteiro(uuid, text, numeric, jsonb) from public;
revoke all on function public.salvar_boletim_empreiteiro(uuid, date, date, numeric, jsonb) from public;
grant execute on function public.ativar_contrato_empreiteiro(uuid, text, numeric, jsonb) to authenticated, service_role;
grant execute on function public.salvar_boletim_empreiteiro(uuid, date, date, numeric, jsonb) to authenticated, service_role;
