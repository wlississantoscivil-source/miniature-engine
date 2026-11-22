-- ============================================================
-- Subir/Descer uma atividade na EAP: tudo de uma vez ou nada.
-- Antes eram duas gravações soltas (trocar a ordem de duas irmãs): se a
-- segunda falhasse, as duas ficavam com a mesma ordem e o Subir/Descer
-- travava (revisão de código de 20/11/2026).
-- Regra IGUAL à de moverEntreIrmas em src/lib/planejamento.js: anda uma
-- posição pulando as irmãs arquivadas e renumera TODAS as irmãs 1, 2, 3…
-- (o que também conserta ordem repetida). Empate de ordem: pelo id.
-- security invoker: valem as regras (RLS) de quem chama.
-- ============================================================
create or replace function public.mover_atividade(p_id uuid, p_direcao integer)
returns integer -- quantas linhas mudaram (0 = já estava na ponta)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_obra uuid;
  v_pai  uuid;
  v_ids  uuid[];
  v_arq  boolean[];
  k      integer;
  j      integer;
  n      integer;
begin
  if p_direcao not in (-1, 1) then
    raise exception 'Direção inválida: use -1 (subir) ou 1 (descer).';
  end if;
  select obra_id, pai_id into v_obra, v_pai from atividades_plano where id = p_id;
  if not found then
    raise exception 'Esta atividade não existe mais. Recarregue a página.';
  end if;
  -- trava as irmãs até o fim da transação: dois cliques ao mesmo tempo não se atropelam
  perform 1 from atividades_plano
   where obra_id = v_obra and pai_id is not distinct from v_pai for update;
  select array_agg(id order by ordem, id), array_agg(arquivada order by ordem, id)
    into v_ids, v_arq
    from atividades_plano
   where obra_id = v_obra and pai_id is not distinct from v_pai;
  k := array_position(v_ids, p_id);
  j := k + p_direcao;
  while j between 1 and array_length(v_ids, 1) and v_arq[j] loop
    j := j + p_direcao;
  end loop;
  if j < 1 or j > array_length(v_ids, 1) then
    return 0;
  end if;
  v_ids[k] := v_ids[j];
  v_ids[j] := p_id;
  update atividades_plano t
     set ordem = x.pos
    from unnest(v_ids) with ordinality as x(id, pos)
   where t.id = x.id and t.ordem <> x.pos;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.mover_atividade(uuid, integer) to authenticated, service_role;
