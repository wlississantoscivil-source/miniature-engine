-- ============================================================
-- Minha Obra — Planejamento (Last Planner): EAP, restrições e semana.
-- Uma lista de atividades por obra, em árvore (pai_id), que as 4 abas usam.
-- Os textos dos CHECK são IDÊNTICOS às listas de src/lib/planejamento.js:
--   status  → STATUS_ATIVIDADE · tipo → TIPOS_RESTRICAO · causa → CAUSAS_NAO_REALIZADO
-- Datas e progresso de um GRUPO (atividade com filhos) são calculados pelo app a
-- partir dos filhos; as colunas do grupo guardam só o que ele tinha antes.
-- ============================================================

-- ─── atividades_plano (a EAP) ───────────────────────────────
create table public.atividades_plano (
  id                   uuid primary key default gen_random_uuid(),
  obra_id              uuid not null references public.obras (id) on delete cascade,
  pai_id               uuid,
  ordem                integer not null check (ordem > 0),
  titulo               text not null check (length(trim(titulo)) between 1 and 120),
  inicio               date not null,
  fim                  date not null,
  progresso            integer not null default 0 check (progresso between 0 and 100),
  status               text check (status in ('A fazer', 'Em andamento', 'Concluído')),
  causa_nao_realizado  text check (causa_nao_realizado in ('Material', 'Mão de obra', 'Projeto', 'Clima', 'Equipamento', 'Método', 'Segurança', 'Logística', 'Atividade anterior atrasada', 'Outro')),
  semana_nao_realizado date check (semana_nao_realizado is null or extract(isodow from semana_nao_realizado) = 1), -- sempre uma segunda
  arquivada            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (fim >= inicio),
  check ((causa_nao_realizado is null) = (semana_nao_realizado is null)),
  -- (obra_id, id) único: deixa pai, restrição e subtarefa apontarem para a MESMA obra.
  unique (obra_id, id),
  foreign key (obra_id, pai_id) references public.atividades_plano (obra_id, id) on delete cascade
);
create index atividades_plano_obra_idx on public.atividades_plano (obra_id);
create trigger atividades_plano_updated_at before update on public.atividades_plano
  for each row execute function public.tocar_updated_at();

-- ─── restricoes_plano (médio prazo) ─────────────────────────
-- A semana em que a restrição aparece no quadro é a do prazo.
create table public.restricoes_plano (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.obras (id) on delete cascade,
  atividade_id uuid not null,
  descricao    text not null check (length(trim(descricao)) between 1 and 200),
  tipo         text not null check (tipo in ('Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística')),
  prazo        date not null,
  responsavel  text not null check (length(trim(responsavel)) between 1 and 60),
  resolvida    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (obra_id, atividade_id) references public.atividades_plano (obra_id, id) on delete cascade
);
create index restricoes_plano_obra_idx on public.restricoes_plano (obra_id);
create trigger restricoes_plano_updated_at before update on public.restricoes_plano
  for each row execute function public.tocar_updated_at();

-- ─── subtarefas_plano (checklist da semana) ─────────────────
create table public.subtarefas_plano (
  id                  uuid primary key default gen_random_uuid(),
  obra_id             uuid not null references public.obras (id) on delete cascade,
  atividade_id        uuid not null,
  ordem               integer not null check (ordem > 0),
  titulo              text not null check (length(trim(titulo)) between 1 and 120),
  feita               boolean not null default false,
  causa_nao_realizado text check (causa_nao_realizado in ('Material', 'Mão de obra', 'Projeto', 'Clima', 'Equipamento', 'Método', 'Segurança', 'Logística', 'Atividade anterior atrasada', 'Outro')),
  created_at          timestamptz not null default now(),
  check (not (feita and causa_nao_realizado is not null)), -- feita não tem causa de "não realizado"
  foreign key (obra_id, atividade_id) references public.atividades_plano (obra_id, id) on delete cascade
);
create index subtarefas_plano_obra_idx on public.subtarefas_plano (obra_id);

-- ─── RLS ligada e liberação para quem está logado ───────────
alter table public.atividades_plano enable row level security;
alter table public.restricoes_plano enable row level security;
alter table public.subtarefas_plano enable row level security;

grant select, insert, update, delete on public.atividades_plano to authenticated, service_role;
grant select, insert, update, delete on public.restricoes_plano to authenticated, service_role;
grant select, insert, update, delete on public.subtarefas_plano to authenticated, service_role;
