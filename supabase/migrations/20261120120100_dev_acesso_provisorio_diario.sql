-- ============================================================
-- ⚠ TEMPORÁRIO — MODO DESENVOLVIMENTO. publico-de-proposito
--
-- Mesma regra provisória de 20261118200200_dev_acesso_provisorio.sql,
-- agora para as tabelas do Diário. Sem login, o navegador fala com o banco
-- como "anon"; esta regra "dev_provisorio" libera tudo até o passo 10.
--
-- NO PASSO 10 (login e banco): desfazer junto com a outra (drop policy
-- "dev_provisorio", revoke ... from anon) e criar as regras de verdade de
-- PRD-BACKEND.md, "Permissões" → `funcionarios`, `presencas`, `diarios_obra`, `fotos`.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['diarios_obra', 'fotos'] loop
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    execute format(
      'create policy "dev_provisorio" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
