-- ============================================================
-- ⚠ TEMPORÁRIO — MODO DESENVOLVIMENTO. publico-de-proposito
--
-- Mesma regra provisória de 20261118200200_dev_acesso_provisorio.sql,
-- agora para as tabelas do Planejamento. Sem login, o navegador fala com o
-- banco como "anon"; esta regra "dev_provisorio" libera tudo até o passo 10.
--
-- NO PASSO 10 (login e banco): desfazer junto com as outras (drop policy
-- "dev_provisorio", revoke ... from anon) e criar as regras de verdade:
--   - ler: quem é membro da obra (o engenheiro, todas);
--   - atividades_plano e restricoes_plano: gravar só Engenheiro e Auxiliar,
--     MENOS as colunas da semana (status, progresso, causa/semana do "não
--     realizado"), que o Mestre da obra também grava;
--   - subtarefas_plano: gravar quem é membro da obra (o Mestre também).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['atividades_plano', 'restricoes_plano', 'subtarefas_plano'] loop
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    execute format(
      'create policy "dev_provisorio" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
