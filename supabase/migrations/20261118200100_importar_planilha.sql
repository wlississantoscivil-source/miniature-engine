-- ============================================================
-- Importar a planilha da licitação: tudo ou nada (PRD-BACKEND,
-- planilhas_obra). Recebe as etapas e os itens já lidos e conferidos
-- no navegador (lib/planilha.js). Com medição na obra, recusa.
-- As compras voltam para a etapa nova de MESMO NÚMERO; as que não
-- acharem ficam sem etapa (= Administração) e são contadas.
-- ============================================================
create or replace function public.importar_planilha(
  p_obra_id uuid,
  p_bdi     numeric,
  p_info    jsonb,   -- objeto, referencia_precos, total_geral, total_sem_bdi, arquivo_nome
  p_etapas  jsonb,   -- [{numero, nome, nivel, ordem, numero_pai}]
  p_itens   jsonb,   -- [{etapa_numero, item, codigo, banco, descricao, unidade, quantidade, preco_unitario, custo_unitario, total, ordem}]
  p_por     uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_antigas jsonb;
  v_etapas  int;
  v_itens   int;
  v_sem_par int;
begin
  if exists (select 1 from medicoes where obra_id = p_obra_id) then
    raise exception 'A obra já tem medição: a planilha não pode mais ser trocada.';
  end if;
  if coalesce(jsonb_array_length(p_itens), 0) = 0 then
    raise exception 'A planilha não tem nenhum item para importar.';
  end if;

  -- Guarda o NÚMERO da etapa de cada compra antes de apagar as etapas.
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'numero', e.numero)), '[]'::jsonb)
    into v_antigas
    from compras c join etapas_obra e on e.id = c.etapa_id
   where c.obra_id = p_obra_id;

  delete from itens_contrato where obra_id = p_obra_id;
  delete from etapas_obra where obra_id = p_obra_id;  -- compras.etapa_id fica vazio (on delete set null)

  insert into etapas_obra (obra_id, numero, nome, nivel, ordem)
  select p_obra_id, e->>'numero', e->>'nome', (e->>'nivel')::int, (e->>'ordem')::int
    from jsonb_array_elements(p_etapas) e;
  get diagnostics v_etapas = row_count;

  update etapas_obra f
     set etapa_pai_id = pai.id
    from jsonb_array_elements(p_etapas) e
    join etapas_obra pai on pai.obra_id = p_obra_id and pai.numero = e->>'numero_pai'
   where f.obra_id = p_obra_id and f.numero = e->>'numero';

  insert into itens_contrato (obra_id, etapa_id, item, codigo, banco, descricao, unidade,
                              quantidade, preco_unitario, custo_unitario, total, ordem)
  select p_obra_id, et.id, i->>'item', i->>'codigo', i->>'banco', i->>'descricao', i->>'unidade',
         (i->>'quantidade')::numeric, (i->>'preco_unitario')::numeric, (i->>'custo_unitario')::numeric,
         (i->>'total')::numeric, (i->>'ordem')::int
    from jsonb_array_elements(p_itens) i
    left join etapas_obra et on et.obra_id = p_obra_id and et.numero = i->>'etapa_numero';
  get diagnostics v_itens = row_count;

  update compras c
     set etapa_id = et.id
    from jsonb_array_elements(v_antigas) a
    join etapas_obra et on et.obra_id = p_obra_id and et.numero = a->>'numero'
   where c.id = (a->>'id')::uuid;

  select count(*) into v_sem_par
    from jsonb_array_elements(v_antigas) a
   where not exists (select 1 from etapas_obra et where et.obra_id = p_obra_id and et.numero = a->>'numero');

  insert into planilhas_obra (obra_id, bdi_percentual, objeto, referencia_precos, total_geral_planilha,
                              total_sem_bdi_planilha, arquivo_nome, importada_em, importada_por)
  values (p_obra_id, coalesce(p_bdi, 0), p_info->>'objeto', p_info->>'referencia_precos',
          (p_info->>'total_geral')::numeric, (p_info->>'total_sem_bdi')::numeric,
          p_info->>'arquivo_nome', now(), p_por)
  on conflict (obra_id) do update set
    bdi_percentual = excluded.bdi_percentual, objeto = excluded.objeto,
    referencia_precos = excluded.referencia_precos, total_geral_planilha = excluded.total_geral_planilha,
    total_sem_bdi_planilha = excluded.total_sem_bdi_planilha, arquivo_nome = excluded.arquivo_nome,
    importada_em = excluded.importada_em, importada_por = excluded.importada_por;

  return jsonb_build_object('etapas', v_etapas, 'itens', v_itens, 'compras_sem_etapa', v_sem_par);
end;
$$;

revoke all on function public.importar_planilha(uuid, numeric, jsonb, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.importar_planilha(uuid, numeric, jsonb, jsonb, jsonb, uuid) to authenticated, service_role;
