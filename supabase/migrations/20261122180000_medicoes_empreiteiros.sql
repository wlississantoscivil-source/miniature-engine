-- ============================================================
-- Minha Obra — Medições de empreiteiros (22/11/2026).
-- O contrato de cada empreiteiro na obra, seus itens (contrato Por escopo),
-- os boletins de medição e a quantidade medida de cada item em cada boletim.
-- NÃO confundir com `itens_contrato` / `medicoes` (medição do ÓRGÃO, fase 3).
-- Os textos dos CHECK são IDÊNTICOS às listas de src/lib/empreiteiros.js:
--   status → STATUS_CONTRATO · tipo → TIPOS_CONTRATO · unidade → UNIDADES_EMPREITEIRO
-- Dinheiro em numeric(14,2); quantidade medida em numeric(14,4) (a fonte da
-- verdade do contrato Por escopo: o R$ sai dela).
-- ============================================================

-- ─── contratos_empreiteiro (os cartões do Kanban) ───────────
create table public.contratos_empreiteiro (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.obras (id) on delete cascade,
  empreiteiro  text not null check (length(trim(empreiteiro)) between 1 and 120),
  descricao    text not null check (length(trim(descricao)) between 1 and 200),
  status       text not null default 'Em elaboração'
               check (status in ('Em elaboração', 'Enviado p/ aprovação', 'Aprovado / ativo', 'Concluído')),
  tipo         text check (tipo in ('Global', 'Por escopo')),
  valor_global numeric(14,2) check (valor_global > 0),
  criado_em    date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Global tem valor fechado; Por escopo não (o total é a soma dos itens).
  check (valor_global is null or tipo = 'Global'),
  check (tipo is distinct from 'Global' or valor_global is not null),
  -- Ativo ou concluído sempre tem valor cadastrado.
  check (status not in ('Aprovado / ativo', 'Concluído') or tipo is not null),
  unique (obra_id, id)
);
create index contratos_empreiteiro_obra_idx on public.contratos_empreiteiro (obra_id);
create index contratos_empreiteiro_obra_status_idx on public.contratos_empreiteiro (obra_id, status);
create trigger contratos_empreiteiro_updated_at before update on public.contratos_empreiteiro
  for each row execute function public.tocar_updated_at();

-- ─── itens_empreiteiro (tabela do contrato Por escopo) ──────
create table public.itens_empreiteiro (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras (id) on delete cascade,
  contrato_id    uuid not null,
  ordem          integer not null check (ordem > 0),
  descricao      text not null check (length(trim(descricao)) between 1 and 160),
  unidade        text not null check (unidade in ('m²', 'm', 'un', 'vb')),
  quantidade     numeric(14,4) not null check (quantidade > 0),
  preco_unitario numeric(14,2) not null check (preco_unitario > 0),
  created_at     timestamptz not null default now(),
  unique (obra_id, id),
  foreign key (obra_id, contrato_id) references public.contratos_empreiteiro (obra_id, id) on delete cascade
);
create index itens_empreiteiro_obra_idx on public.itens_empreiteiro (obra_id);
create index itens_empreiteiro_contrato_idx on public.itens_empreiteiro (contrato_id);

-- ─── boletins_empreiteiro (Medição nº 1, nº 2…) ─────────────
-- `valor` é o que vai para o "a pagar" da obra em `pagar_em`.
create table public.boletins_empreiteiro (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references public.obras (id) on delete cascade,
  contrato_id uuid not null,
  numero      integer not null check (numero > 0),
  data        date not null,
  valor       numeric(14,2) not null check (valor > 0),
  pagar_em    date not null,
  pago        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (contrato_id, numero), -- clique duplo não cria dois "nº 3"
  unique (obra_id, id),
  foreign key (obra_id, contrato_id) references public.contratos_empreiteiro (obra_id, id) on delete cascade
);
create index boletins_empreiteiro_obra_idx on public.boletins_empreiteiro (obra_id);
create index boletins_empreiteiro_contrato_idx on public.boletins_empreiteiro (contrato_id);
create index boletins_empreiteiro_a_pagar_idx on public.boletins_empreiteiro (obra_id, pagar_em) where not pago;
create trigger boletins_empreiteiro_updated_at before update on public.boletins_empreiteiro
  for each row execute function public.tocar_updated_at();

-- ─── boletim_itens_empreiteiro (quanto de cada item em cada boletim) ─
create table public.boletim_itens_empreiteiro (
  id         uuid primary key default gen_random_uuid(),
  obra_id    uuid not null references public.obras (id) on delete cascade,
  boletim_id uuid not null,
  item_id    uuid not null,
  quantidade numeric(14,4) not null check (quantidade > 0),
  created_at timestamptz not null default now(),
  unique (boletim_id, item_id),
  foreign key (obra_id, boletim_id) references public.boletins_empreiteiro (obra_id, id) on delete cascade,
  -- item medido não some: apagar item com medição é recusado
  foreign key (obra_id, item_id) references public.itens_empreiteiro (obra_id, id) on delete restrict
);
create index boletim_itens_empreiteiro_obra_idx on public.boletim_itens_empreiteiro (obra_id);
create index boletim_itens_empreiteiro_item_idx on public.boletim_itens_empreiteiro (item_id);

-- ─── RLS ligada e liberação para quem está logado ───────────
alter table public.contratos_empreiteiro enable row level security;
alter table public.itens_empreiteiro enable row level security;
alter table public.boletins_empreiteiro enable row level security;
alter table public.boletim_itens_empreiteiro enable row level security;

grant select, insert, update, delete on public.contratos_empreiteiro to authenticated, service_role;
grant select, insert, update, delete on public.itens_empreiteiro to authenticated, service_role;
grant select, insert, update, delete on public.boletins_empreiteiro to authenticated, service_role;
grant select, insert, update, delete on public.boletim_itens_empreiteiro to authenticated, service_role;

-- ============================================================
-- Ativar o contrato: grava o valor (Global) ou os itens (Por escopo) e muda
-- o status, tudo de uma vez ou nada. Mesma regra de lerValorContrato e
-- ativarContratoEmpreiteiro (src/lib): só sai de "Enviado p/ aprovação".
-- p_itens: [{ descricao, unidade, quantidade, preco_unitario }]
-- security invoker: valem as regras (RLS) de quem chama.
-- ============================================================
create or replace function public.ativar_contrato_empreiteiro(p_contrato uuid, p_tipo text, p_valor numeric, p_itens jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  c contratos_empreiteiro;
begin
  select * into c from contratos_empreiteiro where id = p_contrato for update;
  if not found then
    raise exception 'Este contrato não existe mais. Recarregue a tela.';
  end if;
  if c.status <> 'Enviado p/ aprovação' then
    raise exception 'Só contrato enviado para aprovação pode ser ativado.';
  end if;
  delete from itens_empreiteiro where contrato_id = p_contrato;
  if p_tipo = 'Por escopo' then
    insert into itens_empreiteiro (obra_id, contrato_id, ordem, descricao, unidade, quantidade, preco_unitario)
    select c.obra_id, p_contrato, x.ord::integer, trim(x.it->>'descricao'), x.it->>'unidade',
           (x.it->>'quantidade')::numeric, round((x.it->>'preco_unitario')::numeric, 2)
      from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) with ordinality as x(it, ord);
    if not found then
      raise exception 'Adicione pelo menos um item.';
    end if;
  end if;
  update contratos_empreiteiro
     set tipo = p_tipo,
         valor_global = case when p_tipo = 'Global' then round(p_valor, 2) end,
         status = 'Aprovado / ativo'
   where id = p_contrato;
end $$;

-- ============================================================
-- Salvar um boletim: numera (último + 1), confere que NADA passa de 100%
-- acumulado e grava o boletim e as quantidades juntos. Mesma regra de
-- calcularBoletim (src/lib/empreiteiros.js). No Por escopo o R$ é refeito
-- aqui a partir das quantidades (centavos por item, depois soma).
-- p_itens: [{ item_id, quantidade }] (só Por escopo) · p_valor: só Global.
-- Devolve o número do boletim criado.
-- ============================================================
create or replace function public.salvar_boletim_empreiteiro(p_contrato uuid, p_data date, p_pagar_em date, p_valor numeric, p_itens jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  c        contratos_empreiteiro;
  v_total  numeric;
  v_medido numeric;
  v_ruim   text;
  v_num    integer;
  v_id     uuid;
  v_novos  jsonb; -- [{ item_id, q }] só as linhas com quantidade > 0
begin
  -- trava o contrato até o fim: dois boletins ao mesmo tempo não se atropelam
  select * into c from contratos_empreiteiro where id = p_contrato for update;
  if not found then
    raise exception 'Este contrato não existe mais nesta obra.';
  end if;
  if c.status <> 'Aprovado / ativo' then
    raise exception 'Só contrato Aprovado / ativo pode receber medição.';
  end if;

  if c.tipo = 'Global' then
    v_total := round(coalesce(p_valor, 0), 2);
    select coalesce(sum(valor), 0) into v_medido from boletins_empreiteiro where contrato_id = p_contrato;
    if v_total > 0 and v_medido + v_total > c.valor_global then
      raise exception 'Passa de 100%% do contrato.';
    end if;
  else
    select coalesce(jsonb_agg(jsonb_build_object('item_id', x->>'item_id', 'q', round((x->>'quantidade')::numeric, 4))), '[]'::jsonb)
      into v_novos
      from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as x
     where (x->>'quantidade')::numeric > 0;
    if exists (select 1 from jsonb_to_recordset(v_novos) as n(item_id uuid, q numeric) left join itens_empreiteiro i on i.id = n.item_id and i.contrato_id = p_contrato where i.id is null) then
      raise exception 'Um dos itens não é deste contrato. Recarregue a tela.';
    end if;
    select string_agg(i.descricao, ', ') into v_ruim
      from jsonb_to_recordset(v_novos) as n(item_id uuid, q numeric)
      join itens_empreiteiro i on i.id = n.item_id
      cross join lateral (select coalesce(sum(b.quantidade), 0) as acc from boletim_itens_empreiteiro b where b.item_id = i.id) a
     where a.acc + n.q > i.quantidade;
    if v_ruim is not null then
      raise exception 'Passa de 100%% do item: %.', v_ruim;
    end if;
    select coalesce(sum(round(n.q * i.preco_unitario, 2)), 0) into v_total
      from jsonb_to_recordset(v_novos) as n(item_id uuid, q numeric) join itens_empreiteiro i on i.id = n.item_id;
  end if;

  if v_total <= 0 then
    raise exception 'Digite o que foi executado nesta medição.';
  end if;

  select coalesce(max(numero), 0) + 1 into v_num from boletins_empreiteiro where contrato_id = p_contrato;
  insert into boletins_empreiteiro (obra_id, contrato_id, numero, data, valor, pagar_em)
  values (c.obra_id, p_contrato, v_num, p_data, v_total, p_pagar_em)
  returning id into v_id;
  if c.tipo = 'Por escopo' then
    insert into boletim_itens_empreiteiro (obra_id, boletim_id, item_id, quantidade)
    select c.obra_id, v_id, n.item_id, n.q from jsonb_to_recordset(v_novos) as n(item_id uuid, q numeric);
  end if;
  return v_num;
end $$;

grant execute on function public.ativar_contrato_empreiteiro(uuid, text, numeric, jsonb) to authenticated, service_role;
grant execute on function public.salvar_boletim_empreiteiro(uuid, date, date, numeric, jsonb) to authenticated, service_role;
