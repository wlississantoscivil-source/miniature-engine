-- ============================================================
-- Minha Obra — Diário de obra (fase 2, PRD-BACKEND.md).
-- Um diário por dia por obra. O efetivo NÃO é guardado: é a contagem de
-- "Presente" em presencas da mesma obra e data.
-- Os textos do CHECK de clima são IDÊNTICOS a CLIMAS em src/lib/regras.js.
-- ============================================================

-- ─── diarios_obra ───────────────────────────────────────────
create table public.diarios_obra (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras (id) on delete cascade,
  data           date not null,
  clima_manha    text not null check (clima_manha in ('Bom', 'Nublado', 'Chuva', 'Impraticável')),
  clima_tarde    text not null check (clima_tarde in ('Bom', 'Nublado', 'Chuva', 'Impraticável')),
  servicos       text not null check (length(trim(servicos)) > 0),
  ocorrencias    text,
  criado_por     uuid not null references public.profiles (id) on update cascade,
  atualizado_por uuid references public.profiles (id) on update cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (obra_id, data) -- também serve de índice para "diários desta obra, por data"
);
create trigger diarios_obra_updated_at before update on public.diarios_obra
  for each row execute function public.tocar_updated_at();

-- ─── fotos ──────────────────────────────────────────────────
-- arquivo_path: o caminho do arquivo no Storage, bucket `fotos` (privado: a tela vai
-- precisar pedir um endereço temporário para mostrar a foto).
-- Opcional ATÉ o Storage entrar: hoje as fotos dos dados de exemplo não têm
-- arquivo, e as tiradas no app ficam só na miniatura do aparelho.
create table public.fotos (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.obras (id) on delete cascade,
  diario_id    uuid not null references public.diarios_obra (id) on delete cascade,
  arquivo_path text,
  legenda      text,
  criado_por   uuid not null references public.profiles (id) on update cascade,
  created_at   timestamptz not null default now()
);
create index fotos_obra_idx on public.fotos (obra_id);
create index fotos_diario_idx on public.fotos (diario_id);

-- ─── RLS ligada e liberação para quem está logado ───────────
alter table public.diarios_obra enable row level security;
alter table public.fotos enable row level security;

grant select, insert, update, delete on public.diarios_obra to authenticated, service_role;
grant select, insert, update, delete on public.fotos to authenticated, service_role;
