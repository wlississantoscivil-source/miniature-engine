-- Carga inicial do Minha Obra: os dados de exemplo de src/lib/mockData.js.
-- Gerado por scripts/gerar-seed.mjs em 20/11/2026. Não edite à mão: rode o script.
-- Pode rodar de novo sem duplicar (on conflict do nothing). Não apaga nada.
begin;

-- id fixo a partir do id do mock ('o1' → sempre o mesmo uuid)
create function pg_temp.u(t text) returns uuid language sql immutable as $$
  select (substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-4' || substr(h, 14, 3) || '-a' || substr(h, 18, 3) || '-' || substr(h, 21, 12))::uuid
  from md5('minha-obra:' || t) h
$$;

-- profiles (5)
insert into public.profiles (id, nome, email, whatsapp, role, ativo) values
  (pg_temp.u('u-wlisses'), 'Wlisses', 'wlisses@exemplo.com', '', 'Engenheiro', true),
  (pg_temp.u('u-carlos'), 'Carlos', 'carlos@exemplo.com', '', 'Mestre', true),
  (pg_temp.u('u-joaquim'), 'Joaquim', 'joaquim@exemplo.com', '', 'Mestre', true),
  (pg_temp.u('u-ana'), 'Ana', 'ana@exemplo.com', '', 'Auxiliar', true),
  (pg_temp.u('u-pedro'), 'Pedro', 'pedro@exemplo.com', '', 'Pendente', true)
on conflict do nothing;

-- obras (5)
insert into public.obras (id, nome, tipo, orgao_contratante, numero_contrato, endereco, data_inicio, data_prevista_fim, status, criado_por) values
  (pg_temp.u('o1'), 'Escola Municipal Vila Nova', 'Escola', 'Prefeitura de Caruaru', '045/2026', 'Caruaru', '2026-08-03', '2027-03-30', 'Em andamento', pg_temp.u('u-wlisses')),
  (pg_temp.u('o2'), 'UBS Centro', 'UBS', 'Prefeitura de Bezerros', '112/2026', 'Bezerros', '2026-09-01', '2027-02-28', 'Em andamento', pg_temp.u('u-wlisses')),
  (pg_temp.u('o3'), 'Refeitório Escola Agrícola', 'Refeitório', 'Governo do Estado', 'SE-0331/2026', 'Vitória de Santo Antão', '2026-10-01', '2027-01-31', 'Em andamento', pg_temp.u('u-wlisses')),
  (pg_temp.u('o4'), 'Escola Rural Sítio Pedra', 'Escola', 'Prefeitura de Caruaru', '019/2026', 'Caruaru (zona rural)', '2026-04-06', '2026-12-18', 'Paralisada', pg_temp.u('u-wlisses')),
  (pg_temp.u('o5'), 'UBS Vila Rica', 'UBS', 'Prefeitura de Gravatá', '077/2025', 'Gravatá', '2025-11-10', '2026-07-31', 'Concluída', pg_temp.u('u-wlisses'))
on conflict do nothing;

-- membros_obra (8)
insert into public.membros_obra (id, obra_id, profile_id, pode_financeiro, pode_presenca_diario, pode_medicao) values
  (pg_temp.u('m1'), pg_temp.u('o1'), pg_temp.u('u-carlos'), false, true, false),
  (pg_temp.u('m2'), pg_temp.u('o2'), pg_temp.u('u-joaquim'), false, true, false),
  (pg_temp.u('m3'), pg_temp.u('o3'), pg_temp.u('u-joaquim'), false, true, false),
  (pg_temp.u('m4'), pg_temp.u('o1'), pg_temp.u('u-ana'), true, true, false),
  (pg_temp.u('m5'), pg_temp.u('o2'), pg_temp.u('u-ana'), true, false, false),
  (pg_temp.u('m6'), pg_temp.u('o3'), pg_temp.u('u-ana'), true, false, false),
  (pg_temp.u('m7'), pg_temp.u('o4'), pg_temp.u('u-ana'), true, false, false),
  (pg_temp.u('m8'), pg_temp.u('o5'), pg_temp.u('u-ana'), true, false, false)
on conflict do nothing;

-- fornecedores (6)
insert into public.fornecedores (id, nome, documento, contato, whatsapp, chave_pix, categoria_padrao, ativo, criado_por) values
  (pg_temp.u('f1'), 'Casa do Construtor Ltda', '12.345.678/0001-90', 'Márcia', '81999990001', '12.345.678/0001-90', 'Material', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('f2'), 'Areal São José', '23.456.789/0001-01', 'Seu José', '81999990002', 'arealsaojose@exemplo.com', 'Material', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('f3'), 'Loca Máquinas', '34.567.890/0001-12', 'Renato', '81999990003', '34.567.890/0001-12', 'Aluguel de equipamento', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('f4'), 'Zé Pedreiro Empreitadas', '456.789.012-34', 'Zé', '81999990004', '456.789.012-34', 'Mão de obra', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('f5'), 'Elétrica Luz', '56.789.012/0001-34', 'Fábio', '', '', 'Material', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('f6'), 'Topografia Silva', '67.890.123/0001-45', 'Eng. Silva', '81999990006', 'topografiasilva@exemplo.com', 'Serviço', true, pg_temp.u('u-wlisses'))
on conflict do nothing;

-- planilhas_obra (1)
insert into public.planilhas_obra (id, obra_id, bdi_percentual, objeto, referencia_precos, total_geral_planilha, total_sem_bdi_planilha, arquivo_nome, importada_em, importada_por) values
  (pg_temp.u('pl1'), pg_temp.u('o1'), 25, 'CONSTRUÇÃO DA ESCOLA MUNICIPAL VILA NOVA', 'SINAPI 09/2026', 1248300, 998640, 'planilha-vila-nova.xlsx', '2026-08-01T10:00:00-03:00', pg_temp.u('u-wlisses'))
on conflict do nothing;

-- etapas_obra (5)
insert into public.etapas_obra (id, obra_id, numero, nome, nivel, etapa_pai_id, ordem) values
  (pg_temp.u('et1'), pg_temp.u('o1'), '1', 'SERVIÇOS PRELIMINARES', 1, null, 1),
  (pg_temp.u('et2'), pg_temp.u('o1'), '2', 'FUNDAÇÃO', 1, null, 3),
  (pg_temp.u('et3'), pg_temp.u('o1'), '3', 'ALVENARIA', 1, null, 6),
  (pg_temp.u('et4'), pg_temp.u('o1'), '4', 'REVESTIMENTO', 1, null, 9),
  (pg_temp.u('et5'), pg_temp.u('o1'), '5', 'COBERTURA', 1, null, 12)
on conflict do nothing;

-- itens_contrato (8)
insert into public.itens_contrato (id, obra_id, etapa_id, item, codigo, banco, descricao, unidade, quantidade, preco_unitario, custo_unitario, total, ordem) values
  (pg_temp.u('ic1'), pg_temp.u('o1'), pg_temp.u('et1'), '1.1', '98525', 'SINAPI', 'LOCAÇÃO E LIMPEZA DO TERRENO', 'm²', 1200, 18.7, 14.96, 22440, 2),
  (pg_temp.u('ic2'), pg_temp.u('o1'), pg_temp.u('et2'), '2.1', '96523', 'SINAPI', 'ESCAVAÇÃO MANUAL', 'm³', 180, 65, 52, 11700, 4),
  (pg_temp.u('ic3'), pg_temp.u('o1'), pg_temp.u('et2'), '2.2', '96557', 'SINAPI', 'CONCRETO ARMADO DA FUNDAÇÃO', 'm³', 95, 1980, 1584, 188100, 5),
  (pg_temp.u('ic4'), pg_temp.u('o1'), pg_temp.u('et3'), '3.1', '103324', 'SINAPI', 'ALVENARIA DE BLOCO CERÂMICO', 'm²', 2400, 98, 78.4, 235200, 7),
  (pg_temp.u('ic5'), pg_temp.u('o1'), pg_temp.u('et3'), '3.2', '93184', 'SINAPI', 'VERGAS E CONTRAVERGAS', 'm', 380, 72, 57.6, 27360, 8),
  (pg_temp.u('ic6'), pg_temp.u('o1'), pg_temp.u('et4'), '4.1', '87879', 'SINAPI', 'CHAPISCO', 'm²', 4800, 9.5, 7.6, 45600, 10),
  (pg_temp.u('ic7'), pg_temp.u('o1'), pg_temp.u('et4'), '4.2', '87529', 'SINAPI', 'REBOCO INTERNO E EXTERNO', 'm²', 4800, 48, 38.4, 230400, 11),
  (pg_temp.u('ic8'), pg_temp.u('o1'), pg_temp.u('et5'), '5.1', '94201', 'SINAPI', 'ESTRUTURA DE MADEIRA E TELHA CERÂMICA', 'm²', 1300, 375, 300, 487500, 13)
on conflict do nothing;

-- fechamentos (3)
insert into public.fechamentos (id, obra_id, fornecedor_id, quinzena_inicio, quinzena_fim, status, fechado_por, fechado_em) values
  (pg_temp.u('fc1'), pg_temp.u('o3'), pg_temp.u('f4'), '2026-10-16', '2026-10-31', 'Fechado', pg_temp.u('u-wlisses'), '2026-11-02T18:00:00-03:00'),
  (pg_temp.u('fc2'), pg_temp.u('o2'), pg_temp.u('f1'), '2026-10-16', '2026-10-31', 'Fechado', pg_temp.u('u-wlisses'), '2026-11-02T18:05:00-03:00'),
  (pg_temp.u('fc3'), pg_temp.u('o1'), pg_temp.u('f1'), '2026-11-01', '2026-11-15', 'Rascunho', null, null)
on conflict do nothing;

-- pagamentos (4)
insert into public.pagamentos (id, obra_id, fornecedor_id, fechamento_id, data, valor, forma, observacao, criado_por, created_at) values
  (pg_temp.u('p1'), pg_temp.u('o2'), pg_temp.u('f1'), pg_temp.u('fc2'), '2026-10-25', 1120, 'Pix', null, pg_temp.u('u-wlisses'), '2026-10-25T10:00:00-03:00'),
  (pg_temp.u('p2'), pg_temp.u('o3'), pg_temp.u('f6'), null, '2026-10-24', 1500, 'Transferência', null, pg_temp.u('u-wlisses'), '2026-10-24T15:30:00-03:00'),
  (pg_temp.u('p3'), pg_temp.u('o3'), pg_temp.u('f4'), pg_temp.u('fc1'), '2026-11-03', 5800, 'Pix', null, pg_temp.u('u-wlisses'), '2026-11-03T09:10:00-03:00'),
  (pg_temp.u('p4'), pg_temp.u('o2'), pg_temp.u('f5'), null, '2026-11-09', 1000, 'Boleto', 'Adiantamento', pg_temp.u('u-ana'), '2026-11-09T13:45:00-03:00')
on conflict do nothing;

-- notas_fiscais (5)
insert into public.notas_fiscais (id, obra_id, fornecedor_id, numero, data_emissao, valor, arquivo_tipo, pagamento_id, criado_por, created_at) values
  (pg_temp.u('nf1'), pg_temp.u('o1'), pg_temp.u('f3'), '4521', '2026-11-02', 600, 'pdf', null, pg_temp.u('u-ana'), '2026-11-02T14:20:00-03:00'),
  (pg_temp.u('nf2'), pg_temp.u('o2'), pg_temp.u('f5'), '889', '2026-11-06', 2340.5, 'imagem', null, pg_temp.u('u-ana'), '2026-11-06T16:05:00-03:00'),
  (pg_temp.u('nf3'), pg_temp.u('o2'), pg_temp.u('f1'), '12033', '2026-10-23', 1120, 'pdf', pg_temp.u('p1'), pg_temp.u('u-wlisses'), '2026-10-23T11:00:00-03:00'),
  (pg_temp.u('nf4'), pg_temp.u('o3'), pg_temp.u('f6'), '77', '2026-10-21', 1500, 'pdf', pg_temp.u('p2'), pg_temp.u('u-wlisses'), '2026-10-21T10:30:00-03:00'),
  (pg_temp.u('nf5'), pg_temp.u('o3'), pg_temp.u('f4'), '310', '2026-11-01', 5800, 'imagem', pg_temp.u('p3'), pg_temp.u('u-wlisses'), '2026-11-01T08:40:00-03:00')
on conflict do nothing;

-- compras (12)
insert into public.compras (id, obra_id, fornecedor_id, data, descricao, categoria, valor, status, numero_pedido, grupo_id, observacao, nota_fiscal_id, fechamento_id, criado_por, created_at, etapa_id) values
  (pg_temp.u('c1'), pg_temp.u('o1'), pg_temp.u('f1'), '2026-11-03', '50 sacos de cimento CP-II', 'Material', 1850, 'Aguardando NF', null, null, null, null, pg_temp.u('fc3'), pg_temp.u('u-wlisses'), '2026-11-03T09:15:00-03:00', pg_temp.u('et3')),
  (pg_temp.u('c2'), pg_temp.u('o1'), pg_temp.u('f2'), '2026-11-07', 'Areia média 6 m³', 'Material', 900, 'Aguardando NF', null, null, null, null, null, pg_temp.u('u-ana'), '2026-11-07T09:15:00-03:00', pg_temp.u('et4')),
  (pg_temp.u('c3'), pg_temp.u('o1'), pg_temp.u('f3'), '2026-11-01', 'Betoneira 400 L – 15 dias', 'Aluguel de equipamento', 600, 'NF recebida', null, null, null, pg_temp.u('nf1'), null, pg_temp.u('u-wlisses'), '2026-11-01T09:15:00-03:00', null),
  (pg_temp.u('c4'), pg_temp.u('o1'), pg_temp.u('f4'), '2026-11-14', 'Alvenaria bloco 1ª quinzena', 'Mão de obra', 7200, 'Aguardando NF', null, null, null, null, null, pg_temp.u('u-wlisses'), '2026-11-14T09:15:00-03:00', pg_temp.u('et3')),
  (pg_temp.u('c5'), pg_temp.u('o2'), pg_temp.u('f1'), '2026-10-22', 'Argamassa AC-II 40 sacos', 'Material', 1120, 'Paga', null, null, null, pg_temp.u('nf3'), pg_temp.u('fc2'), pg_temp.u('u-wlisses'), '2026-10-22T09:15:00-03:00', null),
  (pg_temp.u('c6'), pg_temp.u('o2'), pg_temp.u('f5'), '2026-11-05', 'Cabos 2,5 mm e eletrodutos', 'Material', 2340.5, 'NF recebida', null, null, null, pg_temp.u('nf2'), null, pg_temp.u('u-ana'), '2026-11-05T09:15:00-03:00', null),
  (pg_temp.u('c7'), pg_temp.u('o2'), pg_temp.u('f3'), '2026-11-10', 'Andaime 20 peças – 30 dias', 'Aluguel de equipamento', 850, 'Aguardando NF', null, null, null, null, null, pg_temp.u('u-wlisses'), '2026-11-10T09:15:00-03:00', null),
  (pg_temp.u('c8'), pg_temp.u('o3'), pg_temp.u('f6'), '2026-10-20', 'Locação da obra', 'Serviço', 1500, 'Paga', null, null, null, pg_temp.u('nf4'), null, pg_temp.u('u-wlisses'), '2026-10-20T09:15:00-03:00', null),
  (pg_temp.u('c9'), pg_temp.u('o3'), pg_temp.u('f2'), '2026-11-12', 'Brita 1 – 10 m³', 'Material', 1400, 'Aguardando NF', null, null, null, null, null, pg_temp.u('u-ana'), '2026-11-12T09:15:00-03:00', null),
  (pg_temp.u('c10'), pg_temp.u('o3'), pg_temp.u('f4'), '2026-10-31', 'Fundação 2ª quinzena out', 'Mão de obra', 5800, 'Paga', null, null, null, pg_temp.u('nf5'), pg_temp.u('fc1'), pg_temp.u('u-wlisses'), '2026-10-31T09:15:00-03:00', null),
  (pg_temp.u('c11'), pg_temp.u('o1'), pg_temp.u('f4'), '2026-11-10', 'Reboco interno bloco B', 'Material', 4000, 'Aguardando NF', 'P-0042', pg_temp.u('g1'), null, null, null, pg_temp.u('u-wlisses'), '2026-11-10T09:15:00-03:00', pg_temp.u('et4')),
  (pg_temp.u('c12'), pg_temp.u('o1'), pg_temp.u('f4'), '2026-11-10', 'Reboco interno bloco B', 'Mão de obra', 6000, 'Aguardando NF', 'P-0042', pg_temp.u('g1'), null, null, null, pg_temp.u('u-wlisses'), '2026-11-10T09:15:00-03:00', pg_temp.u('et4'))
on conflict do nothing;

-- itens_lista_compra (6)
insert into public.itens_lista_compra (id, obra_id, descricao, quantidade, unidade, para_quando, fornecedor_sugerido_id, status, compra_id, observacao, criado_por) values
  (pg_temp.u('l1'), pg_temp.u('o1'), 'Cimento CP-II 50 kg', 50, 'saco', '2026-11-18', pg_temp.u('f1'), 'A comprar', null, null, pg_temp.u('u-wlisses')),
  (pg_temp.u('l2'), pg_temp.u('o1'), 'Bloco cerâmico 9×19×19', 2000, 'un', null, null, 'A comprar', null, null, pg_temp.u('u-wlisses')),
  (pg_temp.u('l3'), pg_temp.u('o1'), 'Areia média', 6, 'm³', null, pg_temp.u('f2'), 'Comprado', pg_temp.u('c2'), null, pg_temp.u('u-wlisses')),
  (pg_temp.u('l4'), pg_temp.u('o2'), 'Cimento CP-II 50 kg', 30, 'saco', '2026-11-14', pg_temp.u('f1'), 'A comprar', null, null, pg_temp.u('u-wlisses')),
  (pg_temp.u('l5'), pg_temp.u('o2'), 'Disjuntor 20A', 12, 'un', null, pg_temp.u('f5'), 'A comprar', null, null, pg_temp.u('u-wlisses')),
  (pg_temp.u('l6'), pg_temp.u('o2'), 'Tinta acrílica 18 L', 4, 'lata', null, null, 'Cancelado', null, null, pg_temp.u('u-wlisses'))
on conflict do nothing;

-- funcionarios (32)
insert into public.funcionarios (id, obra_id, nome, funcao, vinculo, chave_pix, ativo, criado_por) values
  (pg_temp.u('fu1'), pg_temp.u('o1'), 'Antônio', 'Pedreiro', 'Diarista', '81 98801-0001', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu2'), pg_temp.u('o1'), 'Severino', 'Pedreiro', 'Diarista', '81 98802-0002', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu3'), pg_temp.u('o1'), 'José Carlos', 'Pedreiro', 'Diarista', '81 98803-0003', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu4'), pg_temp.u('o1'), 'Francisco', 'Servente', 'Diarista', '81 98804-0004', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu5'), pg_temp.u('o1'), 'Josué', 'Servente', 'Diarista', '81 98805-0005', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu6'), pg_temp.u('o1'), 'Raimundo', 'Servente', 'Diarista', '81 98806-0006', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu7'), pg_temp.u('o1'), 'Edvaldo', 'Servente', 'Diarista', '81 98807-0007', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu8'), pg_temp.u('o1'), 'Cícero', 'Carpinteiro', 'Diarista', '81 98808-0008', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu9'), pg_temp.u('o1'), 'Damião', 'Carpinteiro', 'Diarista', '81 98809-0009', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu10'), pg_temp.u('o1'), 'Givaldo', 'Armador', 'Diarista', '81 98810-0010', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu11'), pg_temp.u('o1'), 'Manoel', 'Pedreiro', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu12'), pg_temp.u('o1'), 'Rivaldo', 'Pedreiro', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu13'), pg_temp.u('o1'), 'Genival', 'Servente', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu14'), pg_temp.u('o1'), 'Luiz', 'Servente', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu15'), pg_temp.u('o1'), 'Adeildo', 'Servente', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu16'), pg_temp.u('o1'), 'Moisés', 'Encarregado', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu17'), pg_temp.u('o2'), 'Valdir', 'Pedreiro', 'Diarista', '81 98817-0017', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu18'), pg_temp.u('o2'), 'Ednaldo', 'Pedreiro', 'Diarista', '81 98818-0018', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu19'), pg_temp.u('o2'), 'Gilson', 'Servente', 'Diarista', '81 98819-0019', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu20'), pg_temp.u('o2'), 'Marcos', 'Servente', 'Diarista', '81 98820-0020', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu21'), pg_temp.u('o2'), 'Reginaldo', 'Servente', 'Diarista', '81 98821-0021', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu22'), pg_temp.u('o2'), 'Joel', 'Servente', 'Diarista', '81 98822-0022', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu23'), pg_temp.u('o2'), 'Ailton', 'Eletricista', 'Diarista', '81 98823-0023', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu24'), pg_temp.u('o2'), 'Zezinho', 'Carpinteiro', 'Diarista', '81 98824-0024', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu25'), pg_temp.u('o2'), 'Paulo', 'Servente', 'Diarista', '81 98825-0025', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu26'), pg_temp.u('o3'), 'Erivaldo', 'Pedreiro', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu27'), pg_temp.u('o3'), 'Jailson', 'Pedreiro', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu28'), pg_temp.u('o3'), 'Robério', 'Pedreiro', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu29'), pg_temp.u('o3'), 'Nivaldo', 'Servente', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu30'), pg_temp.u('o3'), 'Elias', 'Servente', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu31'), pg_temp.u('o3'), 'Wellington', 'Servente', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses')),
  (pg_temp.u('fu32'), pg_temp.u('o3'), 'Jurandir', 'Armador', 'Do empreiteiro', '', true, pg_temp.u('u-wlisses'))
on conflict do nothing;

-- diarias_funcionarios (19)
insert into public.diarias_funcionarios (id, obra_id, funcionario_id, valor, vigente_desde, criado_por) values
  (pg_temp.u('d-fu1'), pg_temp.u('o1'), pg_temp.u('fu1'), 180, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu2'), pg_temp.u('o1'), pg_temp.u('fu2'), 180, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu3'), pg_temp.u('o1'), pg_temp.u('fu3'), 180, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu4'), pg_temp.u('o1'), pg_temp.u('fu4'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu5'), pg_temp.u('o1'), pg_temp.u('fu5'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu6'), pg_temp.u('o1'), pg_temp.u('fu6'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu7'), pg_temp.u('o1'), pg_temp.u('fu7'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu8'), pg_temp.u('o1'), pg_temp.u('fu8'), 200, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu9'), pg_temp.u('o1'), pg_temp.u('fu9'), 200, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu10'), pg_temp.u('o1'), pg_temp.u('fu10'), 200, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu17'), pg_temp.u('o2'), pg_temp.u('fu17'), 180, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu18'), pg_temp.u('o2'), pg_temp.u('fu18'), 180, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu19-a'), pg_temp.u('o2'), pg_temp.u('fu19'), 110, '2026-09-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu19-b'), pg_temp.u('o2'), pg_temp.u('fu19'), 120, '2026-11-06', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu20'), pg_temp.u('o2'), pg_temp.u('fu20'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu21'), pg_temp.u('o2'), pg_temp.u('fu21'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu22'), pg_temp.u('o2'), pg_temp.u('fu22'), 120, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu23'), pg_temp.u('o2'), pg_temp.u('fu23'), 200, '2026-08-01', pg_temp.u('u-wlisses')),
  (pg_temp.u('d-fu24'), pg_temp.u('o2'), pg_temp.u('fu24'), 200, '2026-08-01', pg_temp.u('u-wlisses'))
on conflict do nothing;

-- pagamentos_diarias (1)
insert into public.pagamentos_diarias (id, obra_id, quinzena_inicio, quinzena_fim, valor_total, data_pagamento, forma, criado_por) values
  (pg_temp.u('pd1'), pg_temp.u('o1'), '2026-10-16', '2026-10-31', 16400, '2026-11-03', 'Pix', pg_temp.u('u-wlisses'))
on conflict do nothing;

-- diarios_obra (7)
insert into public.diarios_obra (id, obra_id, data, clima_manha, clima_tarde, servicos, ocorrencias, criado_por, created_at) values
  (pg_temp.u('do1'), pg_temp.u('o1'), '2026-11-19', 'Bom', 'Bom', 'Alvenaria do bloco B, eixos 3 a 5
Chapisco das paredes internas do bloco A', null, pg_temp.u('u-carlos'), '2026-11-19T17:10:00-03:00'),
  (pg_temp.u('do2'), pg_temp.u('o1'), '2026-11-18', 'Nublado', 'Chuva', 'Reboco interno do bloco B (sala 3)
Armação das vigas da cobertura', 'Chuva forte às 14h parou o reboco externo. Equipe passou para serviço interno.', pg_temp.u('u-carlos'), '2026-11-18T17:25:00-03:00'),
  (pg_temp.u('do3'), pg_temp.u('o1'), '2026-11-17', 'Bom', 'Nublado', 'Concretagem das vigas do bloco B
Limpeza do canteiro', 'Visita do fiscal da prefeitura às 10h, sem pendências.', pg_temp.u('u-carlos'), '2026-11-17T16:50:00-03:00'),
  (pg_temp.u('do4'), pg_temp.u('o1'), '2026-11-16', 'Bom', 'Bom', 'Fôrmas das vigas do bloco B
Assentamento de tubulação de esgoto', 'Cimento chegou com 1 dia de atraso.', pg_temp.u('u-carlos'), '2026-11-16T17:05:00-03:00'),
  (pg_temp.u('do5'), pg_temp.u('o1'), '2026-11-13', 'Bom', 'Bom', 'Alvenaria do bloco B, eixos 1 a 3', null, pg_temp.u('u-carlos'), '2026-11-13T17:00:00-03:00'),
  (pg_temp.u('do6'), pg_temp.u('o1'), '2026-11-12', 'Nublado', 'Nublado', 'Marcação da alvenaria do bloco B
Recebimento de 8.000 blocos cerâmicos', null, pg_temp.u('u-wlisses'), '2026-11-12T18:30:00-03:00'),
  (pg_temp.u('do7'), pg_temp.u('o2'), '2026-11-19', 'Bom', 'Nublado', 'Instalação elétrica dos consultórios
Pintura da recepção (1ª demão)', null, pg_temp.u('u-joaquim'), '2026-11-19T16:40:00-03:00')
on conflict do nothing;

-- fotos (5)
insert into public.fotos (id, obra_id, diario_id, arquivo_path, legenda, criado_por, created_at) values
  (pg_temp.u('fo1'), pg_temp.u('o1'), pg_temp.u('do1'), null, 'Bloco B, eixo 4', pg_temp.u('u-carlos'), '2026-11-19T15:02:00-03:00'),
  (pg_temp.u('fo2'), pg_temp.u('o1'), pg_temp.u('do1'), null, 'Chapisco sala 2', pg_temp.u('u-carlos'), '2026-11-19T15:10:00-03:00'),
  (pg_temp.u('fo3'), pg_temp.u('o1'), pg_temp.u('do2'), null, 'Chuva às 14h', pg_temp.u('u-carlos'), '2026-11-18T14:05:00-03:00'),
  (pg_temp.u('fo4'), pg_temp.u('o1'), pg_temp.u('do2'), null, 'Armação das vigas', pg_temp.u('u-carlos'), '2026-11-18T11:30:00-03:00'),
  (pg_temp.u('fo5'), pg_temp.u('o1'), pg_temp.u('do2'), null, null, pg_temp.u('u-carlos'), '2026-11-18T11:31:00-03:00')
on conflict do nothing;

-- presencas (809)
insert into public.presencas (id, obra_id, funcionario_id, data, situacao, criado_por, created_at)
select pg_temp.u('pr-' || eq.fs[i] || '-' || v.d), pg_temp.u(v.o), pg_temp.u(eq.fs[i]), v.d::date,
       case substr(v.s, i, 1) when 'P' then 'Presente' when 'F' then 'Falta' when 'A' then 'Atestado' else 'Folga' end,
       pg_temp.u(v.c), (v.d || 'T' || v.h || ':00-03:00')::timestamptz
from (values
  ('2026-10-16','o1','u-carlos','07:30','PPAPPPPPPPPPPPPF'),
  ('2026-10-16','o2','u-joaquim','07:30','PPPPPPPPP'),
  ('2026-10-16','o3','u-joaquim','07:30','APPPPPP'),
  ('2026-10-19','o1','u-carlos','07:30','PPPPPPPPFPPPPPPP'),
  ('2026-10-19','o2','u-joaquim','07:30','PPAPPPPPP'),
  ('2026-10-19','o3','u-joaquim','07:30','PPPPPPF'),
  ('2026-10-20','o1','u-carlos','07:30','PFPPPPPPPPPAPPPP'),
  ('2026-10-20','o2','u-joaquim','07:30','PPPPPPPPF'),
  ('2026-10-20','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-10-21','o1','u-carlos','07:30','PPPPAPPPPPPPPPPP'),
  ('2026-10-21','o2','u-joaquim','07:30','PFPPPPPPP'),
  ('2026-10-21','o3','u-joaquim','07:30','PPAPPPP'),
  ('2026-10-22','o1','u-carlos','07:30','PPPPPPPPPPFPPPPP'),
  ('2026-10-22','o2','u-joaquim','07:30','PPPPAPPPP'),
  ('2026-10-22','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-10-23','o1','u-carlos','07:30','PPPFPPPPPPPPPAPP'),
  ('2026-10-23','o2','u-joaquim','07:30','PPPPPPPPP'),
  ('2026-10-23','o3','u-joaquim','07:30','PFPPPPP'),
  ('2026-10-26','o1','u-carlos','07:30','PPPPPPAPPPPPPPPP'),
  ('2026-10-26','o2','u-joaquim','07:30','PPPFPPPPP'),
  ('2026-10-26','o3','u-joaquim','07:30','PPPPAPP'),
  ('2026-10-27','o1','u-carlos','07:30','PPPPPPPPPPPPFPPP'),
  ('2026-10-27','o2','u-joaquim','07:30','PPPPPPAPP'),
  ('2026-10-27','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-10-28','o1','u-carlos','07:30','PPPPPFPPPPPPPPPA'),
  ('2026-10-28','o2','u-joaquim','07:30','PPPPPPPPP'),
  ('2026-10-28','o3','u-joaquim','07:30','PPPFPPP'),
  ('2026-10-29','o1','u-carlos','07:30','PPPPPPPPAPPPPPPP'),
  ('2026-10-29','o2','u-joaquim','07:30','PPPPPFPPP'),
  ('2026-10-29','o3','u-joaquim','07:30','PPPPPPA'),
  ('2026-10-30','o1','u-carlos','07:30','PAPPPPPPPPPPPPFP'),
  ('2026-10-30','o2','u-joaquim','07:30','PPPPPPPPA'),
  ('2026-10-30','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-11-02','o1','u-carlos','07:30','PPPPPPPFPPPPPPPP'),
  ('2026-11-02','o2','u-joaquim','07:30','PAPPPPPPP'),
  ('2026-11-02','o3','u-joaquim','07:30','PPPPPFP'),
  ('2026-11-03','o1','u-carlos','07:30','FPPPPPPPPPAPPPPP'),
  ('2026-11-03','o2','u-joaquim','07:30','PPPPPPPFP'),
  ('2026-11-03','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-11-04','o1','u-carlos','07:30','PPPAPPPPPPPPPPPP'),
  ('2026-11-04','o2','u-joaquim','07:30','FPPPPPPPP'),
  ('2026-11-04','o3','u-joaquim','07:30','PAPPPPP'),
  ('2026-11-05','o1','u-carlos','07:30','PPPPPPPPPFPPPPPP'),
  ('2026-11-05','o2','u-joaquim','07:30','PPPAPPPPP'),
  ('2026-11-05','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-11-06','o1','u-carlos','07:30','PPFPPPPPPPPPAPPP'),
  ('2026-11-06','o2','u-joaquim','07:30','PPPPPPPPP'),
  ('2026-11-06','o3','u-joaquim','07:30','FPPPPPP'),
  ('2026-11-09','o1','u-carlos','07:30','PPPPPAPPPPPPPPPP'),
  ('2026-11-09','o2','u-joaquim','07:30','PPFPPPPPP'),
  ('2026-11-09','o3','u-joaquim','07:30','PPPAPPP'),
  ('2026-11-10','o1','u-carlos','07:30','PPPPPPPPPPPFPPPP'),
  ('2026-11-10','o2','u-joaquim','07:30','PPPPPAPPP'),
  ('2026-11-10','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-11-11','o1','u-carlos','07:30','PPPPFPPPPPPPPPAP'),
  ('2026-11-11','o2','u-joaquim','07:30','PPPPPPPPP'),
  ('2026-11-11','o3','u-joaquim','07:30','PPFPPPP'),
  ('2026-11-12','o1','u-carlos','07:30','PPPPPPPAPPPPPPPP'),
  ('2026-11-12','o2','u-joaquim','07:30','PPPPFPPPP'),
  ('2026-11-12','o3','u-joaquim','07:30','PPPPPAP'),
  ('2026-11-13','o1','u-carlos','07:30','APPPPPPPPPPPPFPP'),
  ('2026-11-13','o2','u-joaquim','07:30','PPPPPPPAP'),
  ('2026-11-13','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-11-16','o1','u-carlos','07:30','PPPPPPFPPPPPPPPP'),
  ('2026-11-16','o2','u-joaquim','07:30','APPPPPPPP'),
  ('2026-11-16','o3','u-joaquim','07:30','PPPPFPP'),
  ('2026-11-17','o1','u-carlos','07:30','PPPPPPPPPAPPPPPP'),
  ('2026-11-17','o2','u-joaquim','07:30','PPPPPPFPP'),
  ('2026-11-17','o3','u-joaquim','07:30','PPPPPPP'),
  ('2026-11-18','o1','u-carlos','07:30','PPAPPPPPPPPPPPPF'),
  ('2026-11-18','o2','u-joaquim','07:30','PPPPPPPPP'),
  ('2026-11-18','o3','u-joaquim','07:30','APPPPPP'),
  ('2026-11-19','o1','u-carlos','07:30','PPPPPPPPFPPPPPPP'),
  ('2026-11-19','o2','u-joaquim','07:30','PPAPPPPPP'),
  ('2026-11-19','o3','u-joaquim','07:30','PPPPPPF'),
  ('2026-11-20','o2','u-joaquim','07:42','PPPPPPPPF')
) v(d, o, c, h, s)
join (values
  ('o1', array['fu1','fu2','fu3','fu4','fu5','fu6','fu7','fu8','fu9','fu10','fu11','fu12','fu13','fu14','fu15','fu16']),
  ('o2', array['fu17','fu18','fu19','fu20','fu21','fu22','fu23','fu24','fu25']),
  ('o3', array['fu26','fu27','fu28','fu29','fu30','fu31','fu32'])
) eq(o, fs) on eq.o = v.o
cross join lateral generate_series(1, length(v.s)) i
where substr(v.s, i, 1) <> '-'
on conflict do nothing;

commit;
