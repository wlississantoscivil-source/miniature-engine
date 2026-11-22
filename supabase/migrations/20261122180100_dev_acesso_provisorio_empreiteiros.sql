-- ============================================================
-- ⚠ TEMPORÁRIO — MODO DESENVOLVIMENTO. publico-de-proposito
--
-- Mesma regra provisória de 20261118200200_dev_acesso_provisorio.sql, agora
-- para as Medições de empreiteiros. Pedido explícito do engenheiro (22/11/2026):
-- o app roda só no computador dele, sem login, até o passo 10. Sem login, o
-- navegador fala com o banco como "anon"; a regra "dev_provisorio" libera tudo.
--
-- NO PASSO 10 (login e banco): desfazer junto com as outras
--   drop policy "dev_provisorio" on <cada tabela>; revoke ... from anon;
--   revoke execute on function public.ativar_contrato_empreiteiro(uuid, text, numeric, jsonb) from anon;
--   revoke execute on function public.salvar_boletim_empreiteiro(uuid, date, date, numeric, jsonb) from anon;
-- e criar as regras de verdade: ler e gravar só quem tem Financeiro na obra
-- (o engenheiro, todas). O mestre NUNCA: tudo aqui é R$.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['contratos_empreiteiro', 'itens_empreiteiro', 'boletins_empreiteiro', 'boletim_itens_empreiteiro'] loop
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    execute format(
      'create policy "dev_provisorio" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant execute on function public.ativar_contrato_empreiteiro(uuid, text, numeric, jsonb) to anon;
grant execute on function public.salvar_boletim_empreiteiro(uuid, date, date, numeric, jsonb) to anon;
