-- ============================================================
-- Minha Obra — tabelas da fase 1 (PRD-BACKEND.md).
-- Toda tabela de obra tem obra_id. Os textos dos CHECK são IDÊNTICOS
-- aos de src/lib/regras.js (com acento e maiúscula): divergiu, o
-- salvamento falha calado.
--
-- profiles ainda NÃO está ligada ao login (auth.users): o app roda sem
-- login até o passo 10. Por isso toda chave que aponta para profiles usa
-- "on update cascade": no passo 10 o gatilho de cadastro troca o id do
-- perfil de exemplo pelo id do login (mesmo email) e tudo acompanha.
-- ============================================================

-- updated_at automático
create or replace function public.tocar_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── profiles ───────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text not null,
  whatsapp   text,
  role       text not null default 'Pendente'
             check (role in ('Pendente', 'Engenheiro', 'Mestre', 'Auxiliar')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index profiles_email_unico on public.profiles (lower(email));

-- ─── obras (nenhum R$ aqui: o mestre lê esta tabela) ───────
create table public.obras (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  tipo              text not null check (tipo in ('Escola', 'UBS', 'Refeitório', 'Outro')),
  orgao_contratante text not null,
  numero_contrato   text,
  endereco          text,
  data_inicio       date not null,
  data_prevista_fim date,
  status            text not null default 'Em andamento'
                    check (status in ('Em andamento', 'Paralisada', 'Concluída')),
  criado_por        uuid not null references public.profiles (id) on update cascade,
  created_at        timestamptz not null default now()
);
create index obras_status_idx on public.obras (status);

-- ─── membros_obra ───────────────────────────────────────────
create table public.membros_obra (
  id                   uuid primary key default gen_random_uuid(),
  obra_id              uuid not null references public.obras (id) on delete cascade,
  profile_id           uuid not null references public.profiles (id) on update cascade on delete cascade,
  pode_financeiro      boolean not null default false,
  pode_presenca_diario boolean not null default false,
  pode_medicao         boolean not null default false,
  created_at           timestamptz not null default now(),
  unique (obra_id, profile_id)
);
create index membros_obra_profile_idx on public.membros_obra (profile_id);

-- ─── fornecedores (global: atende várias obras) ────────────
create table public.fornecedores (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  documento        text,
  contato          text,
  whatsapp         text,
  chave_pix        text,
  categoria_padrao text not null
                   check (categoria_padrao in ('Material', 'Mão de obra', 'Aluguel de equipamento', 'Serviço', 'Outros')),
  ativo            boolean not null default true,
  criado_por       uuid not null references public.profiles (id) on update cascade,
  created_at       timestamptz not null default now()
);
create index fornecedores_nome_idx on public.fornecedores (nome);

-- ─── planilha da licitação ──────────────────────────────────
create table public.planilhas_obra (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid not null unique references public.obras (id) on delete cascade,
  bdi_percentual         numeric(5,2) not null default 0 check (bdi_percentual between 0 and 100),
  objeto                 text,
  referencia_precos      text,
  total_geral_planilha   numeric(14,2),
  total_sem_bdi_planilha numeric(14,2),
  arquivo_path           text,
  arquivo_nome           text,
  importada_em           timestamptz,
  importada_por          uuid references public.profiles (id) on update cascade,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger planilhas_obra_updated_at before update on public.planilhas_obra
  for each row execute function public.tocar_updated_at();

create table public.etapas_obra (
  id           uuid primary key default gen_random_uuid(),
  obra_id      uuid not null references public.obras (id) on delete cascade,
  numero       text not null,
  nome         text not null,
  nivel        integer not null check (nivel between 1 and 3),
  etapa_pai_id uuid references public.etapas_obra (id) on delete cascade,
  ordem        integer not null,
  created_at   timestamptz not null default now(),
  unique (obra_id, numero)
);
create index etapas_obra_ordem_idx on public.etapas_obra (obra_id, ordem);

create table public.itens_contrato (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras (id) on delete cascade,
  etapa_id       uuid not null references public.etapas_obra (id) on delete cascade,
  item           text,
  codigo         text not null,
  banco          text,
  descricao      text not null,
  unidade        text not null,
  quantidade     numeric(14,4) not null check (quantidade >= 0),
  preco_unitario numeric(14,2) not null,
  custo_unitario numeric(14,2) not null,
  total          numeric(14,2) not null,
  ordem          integer not null,
  created_at     timestamptz not null default now()
);
create index itens_contrato_ordem_idx on public.itens_contrato (obra_id, ordem);
create index itens_contrato_etapa_idx on public.itens_contrato (etapa_id);

-- Medições são da fase 3; a tabela já existe porque a regra
-- "reimportar a planilha só sem medição" depende dela.
create table public.medicoes (
  id                        uuid primary key default gen_random_uuid(),
  obra_id                   uuid not null references public.obras (id) on delete cascade,
  numero                    integer not null,
  periodo_inicio            date not null,
  periodo_fim               date not null,
  status                    text not null default 'Rascunho' check (status in ('Rascunho', 'Enviada', 'Aprovada')),
  aprovado_por              uuid references public.profiles (id) on update cascade,
  aprovado_em               timestamptz,
  data_prevista_recebimento date,
  valor_recebido            numeric(14,2),
  data_recebimento          date,
  recebido_por              uuid references public.profiles (id) on update cascade,
  criado_por                uuid not null references public.profiles (id) on update cascade,
  created_at                timestamptz not null default now(),
  unique (obra_id, numero)
);

-- ─── financeiro ─────────────────────────────────────────────
create table public.fechamentos (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras (id) on delete cascade,
  fornecedor_id   uuid not null references public.fornecedores (id),
  quinzena_inicio date not null check (extract(day from quinzena_inicio) in (1, 16)),
  quinzena_fim    date not null,
  status          text not null default 'Rascunho' check (status in ('Rascunho', 'Fechado')),
  fechado_por     uuid references public.profiles (id) on update cascade,
  fechado_em      timestamptz,
  observacao      text,
  created_at      timestamptz not null default now(),
  unique (obra_id, fornecedor_id, quinzena_inicio)
);
create index fechamentos_status_idx on public.fechamentos (obra_id, status);

create table public.pagamentos (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references public.obras (id) on delete cascade,
  fornecedor_id    uuid not null references public.fornecedores (id),
  fechamento_id    uuid references public.fechamentos (id) on delete set null,
  data             date not null,
  valor            numeric(14,2) not null check (valor > 0),
  forma            text not null check (forma in ('Pix', 'Boleto', 'Transferência', 'Dinheiro')),
  comprovante_path text,
  observacao       text,
  criado_por       uuid not null references public.profiles (id) on update cascade,
  atualizado_por   uuid references public.profiles (id) on update cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index pagamentos_obra_data_idx on public.pagamentos (obra_id, data);
create index pagamentos_fornecedor_idx on public.pagamentos (fornecedor_id);
create trigger pagamentos_updated_at before update on public.pagamentos
  for each row execute function public.tocar_updated_at();

-- arquivo_path fica opcional por enquanto: o envio do arquivo (Storage) vem depois.
create table public.notas_fiscais (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras (id) on delete cascade,
  fornecedor_id  uuid not null references public.fornecedores (id),
  numero         text not null,
  data_emissao   date not null,
  valor          numeric(14,2) not null,
  arquivo_path   text,
  arquivo_tipo   text not null check (arquivo_tipo in ('imagem', 'pdf')),
  pagamento_id   uuid references public.pagamentos (id) on delete set null,
  criado_por     uuid not null references public.profiles (id) on update cascade,
  atualizado_por uuid references public.profiles (id) on update cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index notas_fiscais_obra_idx on public.notas_fiscais (obra_id);
create index notas_fiscais_pagamento_idx on public.notas_fiscais (pagamento_id);
create trigger notas_fiscais_updated_at before update on public.notas_fiscais
  for each row execute function public.tocar_updated_at();

create table public.compras (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras (id) on delete cascade,
  fornecedor_id   uuid not null references public.fornecedores (id),
  data            date not null,
  descricao       text not null,
  categoria       text not null
                  check (categoria in ('Material', 'Mão de obra', 'Aluguel de equipamento', 'Serviço', 'Outros')),
  valor           numeric(14,2) not null check (valor > 0),
  numero_pedido   text,
  grupo_id        uuid,
  etapa_id        uuid references public.etapas_obra (id) on delete set null,
  observacao      text,
  -- dia 1 ou 16 do mês da compra, calculado pelo banco
  quinzena_inicio date generated always as (
                    make_date(extract(year from data)::int, extract(month from data)::int,
                              case when extract(day from data) <= 15 then 1 else 16 end)) stored,
  status          text not null default 'Aguardando NF' check (status in ('Aguardando NF', 'NF recebida', 'Paga')),
  nota_fiscal_id  uuid references public.notas_fiscais (id) on delete set null,
  fechamento_id   uuid references public.fechamentos (id) on delete set null,
  criado_por      uuid not null references public.profiles (id) on update cascade,
  atualizado_por  uuid references public.profiles (id) on update cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index compras_obra_quinzena_idx on public.compras (obra_id, quinzena_inicio);
create index compras_fornecedor_status_idx on public.compras (fornecedor_id, status);
create index compras_obra_categoria_data_idx on public.compras (obra_id, categoria, data);
create index compras_etapa_idx on public.compras (etapa_id);
create index compras_nota_idx on public.compras (nota_fiscal_id);
create trigger compras_updated_at before update on public.compras
  for each row execute function public.tocar_updated_at();

create table public.itens_lista_compra (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid not null references public.obras (id) on delete cascade,
  descricao              text not null,
  quantidade             numeric(14,4),
  unidade                text,
  para_quando            date,
  fornecedor_sugerido_id uuid references public.fornecedores (id),
  observacao             text,
  status                 text not null default 'A comprar' check (status in ('A comprar', 'Comprado', 'Cancelado')),
  compra_id              uuid references public.compras (id) on delete set null,
  criado_por             uuid not null references public.profiles (id) on update cascade,
  atualizado_por         uuid references public.profiles (id) on update cascade,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index itens_lista_compra_obra_status_idx on public.itens_lista_compra (obra_id, status);
create index itens_lista_compra_fornecedor_idx on public.itens_lista_compra (fornecedor_sugerido_id, status);
create trigger itens_lista_compra_updated_at before update on public.itens_lista_compra
  for each row execute function public.tocar_updated_at();

-- ─── equipe, presença e diárias ─────────────────────────────
create table public.funcionarios (
  id         uuid primary key default gen_random_uuid(),
  obra_id    uuid not null references public.obras (id) on delete cascade,
  nome       text not null,
  funcao     text,
  vinculo    text not null default 'Diarista' check (vinculo in ('Diarista', 'Do empreiteiro')),
  chave_pix  text,
  ativo      boolean not null default true,
  criado_por uuid not null references public.profiles (id) on update cascade,
  created_at timestamptz not null default now()
);
create index funcionarios_obra_idx on public.funcionarios (obra_id, ativo);

create table public.presencas (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras (id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios (id),
  data           date not null,
  situacao       text not null check (situacao in ('Presente', 'Falta', 'Atestado', 'Folga')),
  criado_por     uuid not null references public.profiles (id) on update cascade,
  atualizado_por uuid references public.profiles (id) on update cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (funcionario_id, data)
);
create index presencas_obra_data_idx on public.presencas (obra_id, data);
create trigger presencas_updated_at before update on public.presencas
  for each row execute function public.tocar_updated_at();

-- Separada de funcionarios DE PROPÓSITO: o mestre lê funcionários sem ver valor.
create table public.diarias_funcionarios (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras (id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios (id) on delete cascade,
  valor          numeric(14,2) not null check (valor > 0),
  vigente_desde  date not null,
  criado_por     uuid not null references public.profiles (id) on update cascade,
  created_at     timestamptz not null default now(),
  unique (funcionario_id, vigente_desde)
);
create index diarias_funcionarios_obra_idx on public.diarias_funcionarios (obra_id);

create table public.pagamentos_diarias (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references public.obras (id) on delete cascade,
  quinzena_inicio date not null check (extract(day from quinzena_inicio) in (1, 16)),
  quinzena_fim    date not null,
  valor_total     numeric(14,2) not null,
  data_pagamento  date not null,
  forma           text not null check (forma in ('Pix', 'Transferência', 'Dinheiro')),
  observacao      text,
  criado_por      uuid not null references public.profiles (id) on update cascade,
  created_at      timestamptz not null default now(),
  unique (obra_id, quinzena_inicio)
);

-- ─── RLS ligada em todas + liberação (GRANT) para quem faz login ──
-- A RLS diz QUAIS LINHAS; o GRANT diz se a tabela abre. As regras de
-- verdade (por obra e por perfil) entram no passo 10, com o login.
-- Escrito tabela por tabela (o tests/check-grants.mjs lê estas linhas).
alter table public.profiles enable row level security;
alter table public.obras enable row level security;
alter table public.membros_obra enable row level security;
alter table public.fornecedores enable row level security;
alter table public.planilhas_obra enable row level security;
alter table public.etapas_obra enable row level security;
alter table public.itens_contrato enable row level security;
alter table public.medicoes enable row level security;
alter table public.fechamentos enable row level security;
alter table public.pagamentos enable row level security;
alter table public.notas_fiscais enable row level security;
alter table public.compras enable row level security;
alter table public.itens_lista_compra enable row level security;
alter table public.funcionarios enable row level security;
alter table public.presencas enable row level security;
alter table public.diarias_funcionarios enable row level security;
alter table public.pagamentos_diarias enable row level security;

grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.obras to authenticated, service_role;
grant select, insert, update, delete on public.membros_obra to authenticated, service_role;
grant select, insert, update, delete on public.fornecedores to authenticated, service_role;
grant select, insert, update, delete on public.planilhas_obra to authenticated, service_role;
grant select, insert, update, delete on public.etapas_obra to authenticated, service_role;
grant select, insert, update, delete on public.itens_contrato to authenticated, service_role;
grant select, insert, update, delete on public.medicoes to authenticated, service_role;
grant select, insert, update, delete on public.fechamentos to authenticated, service_role;
grant select, insert, update, delete on public.pagamentos to authenticated, service_role;
grant select, insert, update, delete on public.notas_fiscais to authenticated, service_role;
grant select, insert, update, delete on public.compras to authenticated, service_role;
grant select, insert, update, delete on public.itens_lista_compra to authenticated, service_role;
grant select, insert, update, delete on public.funcionarios to authenticated, service_role;
grant select, insert, update, delete on public.presencas to authenticated, service_role;
grant select, insert, update, delete on public.diarias_funcionarios to authenticated, service_role;
grant select, insert, update, delete on public.pagamentos_diarias to authenticated, service_role;
