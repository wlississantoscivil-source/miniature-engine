// Dados de exemplo (PRD-FRONTEND.md, "Dados de exemplo").
// Mesmos nomes de tabela e de coluna do PRD-BACKEND.md: viram a carga inicial do banco depois.
// Presenças são geradas em relação a hoje, para o painel sempre ter "hoje" e "ontem".
import { hoje, somarDias, diaDaSemana } from './regras.js'

export const profiles = [
  { id: 'u-wlisses', nome: 'Wlisses', email: 'wlisses@exemplo.com', whatsapp: '', role: 'Engenheiro', ativo: true },
  { id: 'u-carlos', nome: 'Carlos', email: 'carlos@exemplo.com', whatsapp: '', role: 'Mestre', ativo: true },
  { id: 'u-joaquim', nome: 'Joaquim', email: 'joaquim@exemplo.com', whatsapp: '', role: 'Mestre', ativo: true },
  { id: 'u-ana', nome: 'Ana', email: 'ana@exemplo.com', whatsapp: '', role: 'Auxiliar', ativo: true },
  { id: 'u-pedro', nome: 'Pedro', email: 'pedro@exemplo.com', whatsapp: '', role: 'Pendente', ativo: true },
]

export const obras = [
  { id: 'o1', nome: 'Escola Municipal Vila Nova', tipo: 'Escola', orgao_contratante: 'Prefeitura de Caruaru', numero_contrato: '045/2026', endereco: 'Caruaru', data_inicio: '2026-08-03', data_prevista_fim: '2027-03-30', status: 'Em andamento' },
  { id: 'o2', nome: 'UBS Centro', tipo: 'UBS', orgao_contratante: 'Prefeitura de Bezerros', numero_contrato: '112/2026', endereco: 'Bezerros', data_inicio: '2026-09-01', data_prevista_fim: '2027-02-28', status: 'Em andamento' },
  { id: 'o3', nome: 'Refeitório Escola Agrícola', tipo: 'Refeitório', orgao_contratante: 'Governo do Estado', numero_contrato: 'SE-0331/2026', endereco: 'Vitória de Santo Antão', data_inicio: '2026-10-01', data_prevista_fim: '2027-01-31', status: 'Em andamento' },
  { id: 'o4', nome: 'Escola Rural Sítio Pedra', tipo: 'Escola', orgao_contratante: 'Prefeitura de Caruaru', numero_contrato: '019/2026', endereco: 'Caruaru (zona rural)', data_inicio: '2026-04-06', data_prevista_fim: '2026-12-18', status: 'Paralisada' },
  { id: 'o5', nome: 'UBS Vila Rica', tipo: 'UBS', orgao_contratante: 'Prefeitura de Gravatá', numero_contrato: '077/2025', endereco: 'Gravatá', data_inicio: '2025-11-10', data_prevista_fim: '2026-07-31', status: 'Concluída' },
]

export const membros_obra = [
  { id: 'm1', obra_id: 'o1', profile_id: 'u-carlos', pode_financeiro: false, pode_presenca_diario: true, pode_medicao: false },
  { id: 'm2', obra_id: 'o2', profile_id: 'u-joaquim', pode_financeiro: false, pode_presenca_diario: true, pode_medicao: false },
  { id: 'm3', obra_id: 'o3', profile_id: 'u-joaquim', pode_financeiro: false, pode_presenca_diario: true, pode_medicao: false },
  { id: 'm4', obra_id: 'o1', profile_id: 'u-ana', pode_financeiro: true, pode_presenca_diario: true, pode_medicao: false },
  { id: 'm5', obra_id: 'o2', profile_id: 'u-ana', pode_financeiro: true, pode_presenca_diario: false, pode_medicao: false },
  { id: 'm6', obra_id: 'o3', profile_id: 'u-ana', pode_financeiro: true, pode_presenca_diario: false, pode_medicao: false },
  { id: 'm7', obra_id: 'o4', profile_id: 'u-ana', pode_financeiro: true, pode_presenca_diario: false, pode_medicao: false },
  { id: 'm8', obra_id: 'o5', profile_id: 'u-ana', pode_financeiro: true, pode_presenca_diario: false, pode_medicao: false },
]

export const fornecedores = [
  { id: 'f1', nome: 'Casa do Construtor Ltda', documento: '12.345.678/0001-90', contato: 'Márcia', whatsapp: '81999990001', chave_pix: '12.345.678/0001-90', categoria_padrao: 'Material', ativo: true },
  { id: 'f2', nome: 'Areal São José', documento: '23.456.789/0001-01', contato: 'Seu José', whatsapp: '81999990002', chave_pix: 'arealsaojose@exemplo.com', categoria_padrao: 'Material', ativo: true },
  { id: 'f3', nome: 'Loca Máquinas', documento: '34.567.890/0001-12', contato: 'Renato', whatsapp: '81999990003', chave_pix: '34.567.890/0001-12', categoria_padrao: 'Aluguel de equipamento', ativo: true },
  { id: 'f4', nome: 'Zé Pedreiro Empreitadas', documento: '456.789.012-34', contato: 'Zé', whatsapp: '81999990004', chave_pix: '456.789.012-34', categoria_padrao: 'Mão de obra', ativo: true },
  { id: 'f5', nome: 'Elétrica Luz', documento: '56.789.012/0001-34', contato: 'Fábio', whatsapp: '', chave_pix: '', categoria_padrao: 'Material', ativo: true },
  { id: 'f6', nome: 'Topografia Silva', documento: '67.890.123/0001-45', contato: 'Eng. Silva', whatsapp: '81999990006', chave_pix: 'topografiasilva@exemplo.com', categoria_padrao: 'Serviço', ativo: true },
]

const compra = (id, obra_id, fornecedor_id, data, descricao, categoria, valor, status, extra = {}) => ({
  id, obra_id, fornecedor_id, data, descricao, categoria, valor, status,
  numero_pedido: null, grupo_id: null, observacao: null, nota_fiscal_id: null, fechamento_id: null,
  criado_por: 'u-wlisses', created_at: `${data}T09:15:00`, ...extra,
})

export const compras = [
  compra('c1', 'o1', 'f1', '2026-11-03', '50 sacos de cimento CP-II', 'Material', 1850, 'Aguardando NF', { fechamento_id: 'fc3' }),
  compra('c2', 'o1', 'f2', '2026-11-07', 'Areia média 6 m³', 'Material', 900, 'Aguardando NF', { criado_por: 'u-ana' }),
  compra('c3', 'o1', 'f3', '2026-11-01', 'Betoneira 400 L – 15 dias', 'Aluguel de equipamento', 600, 'NF recebida', { nota_fiscal_id: 'nf1' }),
  compra('c4', 'o1', 'f4', '2026-11-14', 'Alvenaria bloco 1ª quinzena', 'Mão de obra', 7200, 'Aguardando NF'),
  compra('c5', 'o2', 'f1', '2026-10-22', 'Argamassa AC-II 40 sacos', 'Material', 1120, 'Paga', { nota_fiscal_id: 'nf3', fechamento_id: 'fc2' }),
  compra('c6', 'o2', 'f5', '2026-11-05', 'Cabos 2,5 mm e eletrodutos', 'Material', 2340.5, 'NF recebida', { nota_fiscal_id: 'nf2', criado_por: 'u-ana' }),
  compra('c7', 'o2', 'f3', '2026-11-10', 'Andaime 20 peças – 30 dias', 'Aluguel de equipamento', 850, 'Aguardando NF'),
  compra('c8', 'o3', 'f6', '2026-10-20', 'Locação da obra', 'Serviço', 1500, 'Paga', { nota_fiscal_id: 'nf4' }),
  compra('c9', 'o3', 'f2', '2026-11-12', 'Brita 1 – 10 m³', 'Material', 1400, 'Aguardando NF', { criado_por: 'u-ana' }),
  compra('c10', 'o3', 'f4', '2026-10-31', 'Fundação 2ª quinzena out', 'Mão de obra', 5800, 'Paga', { nota_fiscal_id: 'nf5', fechamento_id: 'fc1' }),
  // Compra dividida: empreiteiro com material + mão de obra, mesmo grupo_id.
  compra('c11', 'o1', 'f4', '2026-11-10', 'Reboco interno bloco B', 'Material', 4000, 'Aguardando NF', { grupo_id: 'g1', numero_pedido: 'P-0042' }),
  compra('c12', 'o1', 'f4', '2026-11-10', 'Reboco interno bloco B', 'Mão de obra', 6000, 'Aguardando NF', { grupo_id: 'g1', numero_pedido: 'P-0042' }),
]

export const notas_fiscais = [
  { id: 'nf1', obra_id: 'o1', fornecedor_id: 'f3', numero: '4521', data_emissao: '2026-11-02', valor: 600, arquivo_tipo: 'pdf', pagamento_id: null, criado_por: 'u-ana', created_at: '2026-11-02T14:20:00' },
  { id: 'nf2', obra_id: 'o2', fornecedor_id: 'f5', numero: '889', data_emissao: '2026-11-06', valor: 2340.5, arquivo_tipo: 'imagem', pagamento_id: null, criado_por: 'u-ana', created_at: '2026-11-06T16:05:00' },
  { id: 'nf3', obra_id: 'o2', fornecedor_id: 'f1', numero: '12033', data_emissao: '2026-10-23', valor: 1120, arquivo_tipo: 'pdf', pagamento_id: 'p1', criado_por: 'u-wlisses', created_at: '2026-10-23T11:00:00' },
  { id: 'nf4', obra_id: 'o3', fornecedor_id: 'f6', numero: '77', data_emissao: '2026-10-21', valor: 1500, arquivo_tipo: 'pdf', pagamento_id: 'p2', criado_por: 'u-wlisses', created_at: '2026-10-21T10:30:00' },
  { id: 'nf5', obra_id: 'o3', fornecedor_id: 'f4', numero: '310', data_emissao: '2026-11-01', valor: 5800, arquivo_tipo: 'imagem', pagamento_id: 'p3', criado_por: 'u-wlisses', created_at: '2026-11-01T08:40:00' },
]

export const pagamentos = [
  { id: 'p1', obra_id: 'o2', fornecedor_id: 'f1', fechamento_id: 'fc2', data: '2026-10-25', valor: 1120, forma: 'Pix', observacao: null, criado_por: 'u-wlisses', created_at: '2026-10-25T10:00:00' },
  { id: 'p2', obra_id: 'o3', fornecedor_id: 'f6', fechamento_id: null, data: '2026-10-24', valor: 1500, forma: 'Transferência', observacao: null, criado_por: 'u-wlisses', created_at: '2026-10-24T15:30:00' },
  { id: 'p3', obra_id: 'o3', fornecedor_id: 'f4', fechamento_id: 'fc1', data: '2026-11-03', valor: 5800, forma: 'Pix', observacao: null, criado_por: 'u-wlisses', created_at: '2026-11-03T09:10:00' },
  { id: 'p4', obra_id: 'o2', fornecedor_id: 'f5', fechamento_id: null, data: '2026-11-09', valor: 1000, forma: 'Boleto', observacao: 'Adiantamento', criado_por: 'u-ana', created_at: '2026-11-09T13:45:00' },
]

export const fechamentos = [
  { id: 'fc1', obra_id: 'o3', fornecedor_id: 'f4', quinzena_inicio: '2026-10-16', quinzena_fim: '2026-10-31', status: 'Fechado', fechado_por: 'u-wlisses', fechado_em: '2026-11-02T18:00:00' },
  { id: 'fc2', obra_id: 'o2', fornecedor_id: 'f1', quinzena_inicio: '2026-10-16', quinzena_fim: '2026-10-31', status: 'Fechado', fechado_por: 'u-wlisses', fechado_em: '2026-11-02T18:05:00' },
  { id: 'fc3', obra_id: 'o1', fornecedor_id: 'f1', quinzena_inicio: '2026-11-01', quinzena_fim: '2026-11-15', status: 'Rascunho', fechado_por: null, fechado_em: null },
]

const item = (id, obra_id, descricao, quantidade, unidade, para_quando, fornecedor_sugerido_id, status, compra_id = null) => ({
  id, obra_id, descricao, quantidade, unidade, para_quando, fornecedor_sugerido_id, status, compra_id, observacao: null, criado_por: 'u-wlisses',
})

export const itens_lista_compra = [
  item('l1', 'o1', 'Cimento CP-II 50 kg', 50, 'saco', '2026-11-18', 'f1', 'A comprar'),
  item('l2', 'o1', 'Bloco cerâmico 9×19×19', 2000, 'un', null, null, 'A comprar'),
  item('l3', 'o1', 'Areia média', 6, 'm³', null, 'f2', 'Comprado', 'c2'),
  item('l4', 'o2', 'Cimento CP-II 50 kg', 30, 'saco', '2026-11-14', 'f1', 'A comprar'),
  item('l5', 'o2', 'Disjuntor 20A', 12, 'un', null, 'f5', 'A comprar'),
  item('l6', 'o2', 'Tinta acrílica 18 L', 4, 'lata', null, null, 'Cancelado'),
]

// ─── Funcionários ───────────────────────────────────────────────────────────
const NOMES = ['Antônio', 'Severino', 'José Carlos', 'Francisco', 'Josué', 'Raimundo', 'Edvaldo', 'Cícero', 'Damião', 'Givaldo',
  'Manoel', 'Rivaldo', 'Genival', 'Luiz', 'Adeildo', 'Moisés', 'Valdir', 'Ednaldo', 'Gilson', 'Marcos', 'Reginaldo',
  'Joel', 'Ailton', 'Zezinho', 'Paulo', 'Erivaldo', 'Jailson', 'Robério', 'Nivaldo', 'Elias', 'Wellington', 'Jurandir']
let n = 0
const func = (obra_id, funcao, vinculo) => {
  n++
  return { id: `fu${n}`, obra_id, nome: NOMES[n - 1], funcao, vinculo, chave_pix: vinculo === 'Diarista' ? `81 9${String(8800 + n).padStart(4, '0')}-00${String(n).padStart(2, '0')}` : '', ativo: true, criado_por: 'u-wlisses' }
}
const diariasBase = { Pedreiro: 180, Servente: 120, Carpinteiro: 200, Armador: 200, Eletricista: 200 }

export const funcionarios = [
  // Escola Vila Nova: 10 diaristas + 6 do empreiteiro
  ...['Pedreiro', 'Pedreiro', 'Pedreiro', 'Servente', 'Servente', 'Servente', 'Servente', 'Carpinteiro', 'Carpinteiro', 'Armador'].map((f) => func('o1', f, 'Diarista')),
  ...['Pedreiro', 'Pedreiro', 'Servente', 'Servente', 'Servente', 'Encarregado'].map((f) => func('o1', f, 'Do empreiteiro')),
  // UBS Centro: 9 diaristas
  ...['Pedreiro', 'Pedreiro', 'Servente', 'Servente', 'Servente', 'Servente', 'Eletricista', 'Carpinteiro', 'Servente'].map((f) => func('o2', f, 'Diarista')),
  // Refeitório: 7 do empreiteiro
  ...['Pedreiro', 'Pedreiro', 'Pedreiro', 'Servente', 'Servente', 'Servente', 'Armador'].map((f) => func('o3', f, 'Do empreiteiro')),
]

const ubs = funcionarios.filter((f) => f.obra_id === 'o2')
const serventeQueMuda = ubs[2] // diária de R$ 110 para R$ 120 em 06/11
const semDiaria = ubs[8] // diarista sem diária cadastrada

export const diarias_funcionarios = funcionarios
  .filter((f) => f.vinculo === 'Diarista' && f !== semDiaria)
  .flatMap((f) => (f === serventeQueMuda
    ? [
        { id: `d-${f.id}-a`, obra_id: f.obra_id, funcionario_id: f.id, valor: 110, vigente_desde: '2026-09-01' },
        { id: `d-${f.id}-b`, obra_id: f.obra_id, funcionario_id: f.id, valor: 120, vigente_desde: '2026-11-06' },
      ]
    : [{ id: `d-${f.id}`, obra_id: f.obra_id, funcionario_id: f.id, valor: diariasBase[f.funcao], vigente_desde: '2026-08-01' }]))

// ─── Presenças: dias úteis desde 16/10; Escola e Refeitório até ontem, UBS até hoje ──
const HOJE = hoje()
const ultimoDia = { o1: somarDias(HOJE, -1), o2: HOJE, o3: somarDias(HOJE, -1) }
const lancadoPor = { o1: 'u-carlos', o2: 'u-joaquim', o3: 'u-joaquim' }

function gerarPresencas() {
  const lista = []
  let k = 0
  for (let dia = '2026-10-16'; dia <= HOJE; dia = somarDias(dia, 1)) {
    const sem = diaDaSemana(dia)
    if (sem === 'Domingo' || sem === 'Sábado') continue
    k++
    for (const f of funcionarios) {
      if (dia > ultimoDia[f.obra_id]) continue
      const num = Number(f.id.slice(2))
      const r = (num * 7 + k * 3) % 23
      const situacao = r === 0 ? 'Falta' : r === 1 ? 'Atestado' : 'Presente'
      const hora = dia === HOJE ? '07:42' : '07:30'
      lista.push({ id: `pr-${f.id}-${dia}`, obra_id: f.obra_id, funcionario_id: f.id, data: dia, situacao, criado_por: lancadoPor[f.obra_id], created_at: `${dia}T${hora}:00` })
    }
  }
  return lista
}
export const presencas = gerarPresencas()

// Diárias da Escola Vila Nova, 2ª quinzena de outubro, pagas em 03/11 por Pix.
// O valor_total é preenchido em dados.js na carga (fica congelado, como no banco).
export const pagamentos_diarias = [
  { id: 'pd1', obra_id: 'o1', quinzena_inicio: '2026-10-16', quinzena_fim: '2026-10-31', valor_total: null, data_pagamento: '2026-11-03', forma: 'Pix', criado_por: 'u-wlisses' },
]

// ─── Planilha da licitação (só a Escola Vila Nova; UBS e Refeitório ficam sem) ──
// Exemplo inventado. O formato do leitor vem da planilha real de Aporá, que não
// entra no projeto. Valor unitário sem BDI = preço ÷ 1,25 (BDI de 25%).
export const planilhas_obra = [
  {
    id: 'pl1', obra_id: 'o1', bdi_percentual: 25, objeto: 'CONSTRUÇÃO DA ESCOLA MUNICIPAL VILA NOVA',
    referencia_precos: 'SINAPI 09/2026', total_geral_planilha: 1248300, total_sem_bdi_planilha: 998640,
    arquivo_nome: 'planilha-vila-nova.xlsx', importada_em: '2026-08-01T10:00:00', importada_por: 'u-wlisses',
  },
]

const etapa = (id, numero, nome, ordem) => ({ id, obra_id: 'o1', numero, nome, nivel: 1, etapa_pai_id: null, ordem })
export const etapas_obra = [
  etapa('et1', '1', 'SERVIÇOS PRELIMINARES', 1),
  etapa('et2', '2', 'FUNDAÇÃO', 3),
  etapa('et3', '3', 'ALVENARIA', 6),
  etapa('et4', '4', 'REVESTIMENTO', 9),
  etapa('et5', '5', 'COBERTURA', 12),
]

const itemC = (id, etapa_id, item, codigo, banco, descricao, unidade, quantidade, preco_unitario, ordem) => ({
  id, obra_id: 'o1', etapa_id, item, codigo, banco, descricao, unidade, quantidade, preco_unitario,
  custo_unitario: Math.round((preco_unitario / 1.25) * 100) / 100, ordem,
})
export const itens_contrato = [
  itemC('ic1', 'et1', '1.1', '98525', 'SINAPI', 'LOCAÇÃO E LIMPEZA DO TERRENO', 'm²', 1200, 18.7, 2),
  itemC('ic2', 'et2', '2.1', '96523', 'SINAPI', 'ESCAVAÇÃO MANUAL', 'm³', 180, 65, 4),
  itemC('ic3', 'et2', '2.2', '96557', 'SINAPI', 'CONCRETO ARMADO DA FUNDAÇÃO', 'm³', 95, 1980, 5),
  itemC('ic4', 'et3', '3.1', '103324', 'SINAPI', 'ALVENARIA DE BLOCO CERÂMICO', 'm²', 2400, 98, 7),
  itemC('ic5', 'et3', '3.2', '93184', 'SINAPI', 'VERGAS E CONTRAVERGAS', 'm', 380, 72, 8),
  itemC('ic6', 'et4', '4.1', '87879', 'SINAPI', 'CHAPISCO', 'm²', 4800, 9.5, 10),
  itemC('ic7', 'et4', '4.2', '87529', 'SINAPI', 'REBOCO INTERNO E EXTERNO', 'm²', 4800, 48, 11),
  itemC('ic8', 'et5', '5.1', '94201', 'SINAPI', 'ESTRUTURA DE MADEIRA E TELHA CERÂMICA', 'm²', 1300, 375, 13),
]

// Medições ficam para a fase 3; a lista existe para a regra "reimportar só sem medição".
export const medicoes = []

// Etapa de cada compra da Escola Vila Nova (as outras obras não têm planilha).
const ETAPA_DA_COMPRA = { c1: 'et3', c4: 'et3', c2: 'et4', c11: 'et4', c12: 'et4' }
for (const c of compras) c.etapa_id = ETAPA_DA_COMPRA[c.id] || null
