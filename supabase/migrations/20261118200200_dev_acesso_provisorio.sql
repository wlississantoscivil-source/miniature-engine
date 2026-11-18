-- ============================================================
-- ⚠ TEMPORÁRIO — MODO DESENVOLVIMENTO. publico-de-proposito
--
-- O app ainda não tem login (o passo 10 do curso liga). Sem login, o
-- navegador fala com o banco como "anon" (quem não entrou). Para a tela
-- funcionar até lá, esta migration abre TODAS as tabelas para anon e
-- para quem está logado, com uma regra "dev_provisorio" que libera tudo.
--
-- Só é aceitável porque o app roda apenas no computador do engenheiro,
-- com dados de exemplo. NÃO publique na Vercel com isto ligado.
--
-- NO PASSO 10 (login e banco): uma migration nova desfaz exatamente isto
-- (drop policy "dev_provisorio" em cada tabela, revoke ... from anon,
-- revoke execute ... from anon) e cria as regras de verdade, por obra e
-- por perfil, como estão em PRD-BACKEND.md, "Permissões".
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'obras', 'membros_obra', 'fornecedores', 'planilhas_obra', 'etapas_obra',
    'itens_contrato', 'medicoes', 'fechamentos', 'pagamentos', 'notas_fiscais', 'compras',
    'itens_lista_compra', 'funcionarios', 'presencas', 'diarias_funcionarios', 'pagamentos_diarias'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    execute format(
      'create policy "dev_provisorio" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant execute on function public.importar_planilha(uuid, numeric, jsonb, jsonb, jsonb, uuid) to anon;
