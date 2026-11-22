// Dados de exemplo (PRD-FRONTEND.md, "Dados de exemplo").
// Mesmos nomes de tabela e de coluna do PRD-BACKEND.md: viram a carga inicial do banco depois.
// Presenças são geradas em relação a hoje, para o painel sempre ter "hoje" e "ontem".
import { hoje, somarDias, diaDaSemana } from './regras.js'
import { semanaDe } from './planejamento.js'

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
  custo_unitario: Math.round((preco_unitario / 1.25) * 100) / 100,
  total: Math.round(quantidade * preco_unitario * 100) / 100, ordem,
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

// ─── Diário de obra (fase 2) ─────────────────────────────────────────────────
// Viram a carga do banco pelo scripts/gerar-seed.mjs (seed aplicado em 20/11/2026).
// Escola Vila Nova: os 6 últimos dias úteis até ontem (1 com chuva à tarde, 2 com fotos).
// UBS Centro: 1 dia, para conferir que trocar de obra troca o diário.
// O efetivo não é guardado: é contado na presença do mesmo dia.
function diasUteisAte(ultimo, n) {
  const dias = []
  for (let d = ultimo; dias.length < n; d = somarDias(d, -1)) {
    const sem = diaDaSemana(d)
    if (sem !== 'Domingo' && sem !== 'Sábado') dias.push(d)
  }
  return dias
}
const [e1, e2, e3, e4, e5, e6] = diasUteisAte(somarDias(HOJE, -1), 6)
const [u1] = diasUteisAte(somarDias(HOJE, -1), 1)

export const diarios_obra = [
  { id: 'do1', obra_id: 'o1', data: e1, clima_manha: 'Bom', clima_tarde: 'Bom', servicos: 'Alvenaria do bloco B, eixos 3 a 5\nChapisco das paredes internas do bloco A', ocorrencias: null, criado_por: 'u-carlos', created_at: `${e1}T17:10:00` },
  { id: 'do2', obra_id: 'o1', data: e2, clima_manha: 'Nublado', clima_tarde: 'Chuva', servicos: 'Reboco interno do bloco B (sala 3)\nArmação das vigas da cobertura', ocorrencias: 'Chuva forte às 14h parou o reboco externo. Equipe passou para serviço interno.', criado_por: 'u-carlos', created_at: `${e2}T17:25:00` },
  { id: 'do3', obra_id: 'o1', data: e3, clima_manha: 'Bom', clima_tarde: 'Nublado', servicos: 'Concretagem das vigas do bloco B\nLimpeza do canteiro', ocorrencias: 'Visita do fiscal da prefeitura às 10h, sem pendências.', criado_por: 'u-carlos', created_at: `${e3}T16:50:00` },
  { id: 'do4', obra_id: 'o1', data: e4, clima_manha: 'Bom', clima_tarde: 'Bom', servicos: 'Fôrmas das vigas do bloco B\nAssentamento de tubulação de esgoto', ocorrencias: 'Cimento chegou com 1 dia de atraso.', criado_por: 'u-carlos', created_at: `${e4}T17:05:00` },
  { id: 'do5', obra_id: 'o1', data: e5, clima_manha: 'Bom', clima_tarde: 'Bom', servicos: 'Alvenaria do bloco B, eixos 1 a 3', ocorrencias: null, criado_por: 'u-carlos', created_at: `${e5}T17:00:00` },
  { id: 'do6', obra_id: 'o1', data: e6, clima_manha: 'Nublado', clima_tarde: 'Nublado', servicos: 'Marcação da alvenaria do bloco B\nRecebimento de 8.000 blocos cerâmicos', ocorrencias: null, criado_por: 'u-wlisses', created_at: `${e6}T18:30:00` },
  { id: 'do7', obra_id: 'o2', data: u1, clima_manha: 'Bom', clima_tarde: 'Nublado', servicos: 'Instalação elétrica dos consultórios\nPintura da recepção (1ª demão)', ocorrencias: null, criado_por: 'u-joaquim', created_at: `${u1}T16:40:00` },
]

// Fotos de exemplo: sem arquivo de verdade (a tela desenha um quadro com a legenda).
export const fotos = [
  { id: 'fo1', obra_id: 'o1', diario_id: 'do1', arquivo_path: null, legenda: 'Bloco B, eixo 4', criado_por: 'u-carlos', created_at: `${e1}T15:02:00` },
  { id: 'fo2', obra_id: 'o1', diario_id: 'do1', arquivo_path: null, legenda: 'Chapisco sala 2', criado_por: 'u-carlos', created_at: `${e1}T15:10:00` },
  { id: 'fo3', obra_id: 'o1', diario_id: 'do2', arquivo_path: null, legenda: 'Chuva às 14h', criado_por: 'u-carlos', created_at: `${e2}T14:05:00` },
  { id: 'fo4', obra_id: 'o1', diario_id: 'do2', arquivo_path: null, legenda: 'Armação das vigas', criado_por: 'u-carlos', created_at: `${e2}T11:30:00` },
  { id: 'fo5', obra_id: 'o1', diario_id: 'do2', arquivo_path: null, legenda: null, criado_por: 'u-carlos', created_at: `${e2}T11:31:00` },
]

// ─── Planejamento (EAP, cronograma, restrições e semana) ────────────────────
// No banco: tabelas atividades_plano, restricoes_plano e subtarefas_plano (o seed vem daqui).
// Datas em relação a hoje, para o cronograma e a semana atual sempre terem o que mostrar.
// Todas as abas usam esta MESMA lista. Grupo (pai) não tem status nem datas próprias
// que valham: datas e progresso vêm dos filhos (planejamento.js).
// status (só nas atividades, não nos grupos): 'A fazer' · 'Em andamento' · 'Concluído'
// (os nomes das colunas do quadro da semana). Concluído = 100%; A fazer = 0%.
// causa_nao_realizado + semana_nao_realizado (segunda da semana): marcada "Não realizado" naquela semana.
// Atividade "impedida" = tem restrição aberta (lista `restricoes_plano`, abaixo).
const d = (n) => somarDias(HOJE, n)
const grupo = (id, obra_id, ordem, titulo, de, ate) => ({ id, obra_id, pai_id: null, ordem, titulo, inicio: d(de), fim: d(ate), progresso: 0, status: null, causa_nao_realizado: null, semana_nao_realizado: null, arquivada: false })
const ativ = (id, obra_id, pai_id, ordem, titulo, de, ate, progresso, status) => ({ id, obra_id, pai_id, ordem, titulo, inicio: d(de), fim: d(ate), progresso, status, causa_nao_realizado: null, semana_nao_realizado: null, arquivada: false })
export const atividades_plano = [
  // Escola Municipal Vila Nova (obra cheia): 5 grupos, 8 atividades.
  grupo('pa1', 'o1', 1, 'Demolição', -20, -12),
  ativ('pa2', 'o1', 'pa1', 1, 'Demolição do muro antigo e retirada do entulho', -20, -12, 100, 'Concluído'),
  grupo('pa3', 'o1', 2, 'Alvenaria e reboco', -15, 10),
  // passou do prazo: acumula na semana, e foi marcada como não realizada nesta semana (falta de pedreiro)
  { ...ativ('pa4', 'o1', 'pa3', 1, 'Alvenaria do bloco B', -15, -3, 80, 'Em andamento'), causa_nao_realizado: 'Mão de obra', semana_nao_realizado: semanaDe(HOJE) },
  ativ('pa5', 'o1', 'pa3', 2, 'Reboco interno das salas 1 a 4', -4, 10, 25, 'Em andamento'),
  grupo('pa6', 'o1', 3, 'Hidráulica', -8, 12),
  ativ('pa7', 'o1', 'pa6', 1, 'Tubulação de esgoto', -8, 0, 100, 'Concluído'),
  ativ('pa8', 'o1', 'pa6', 2, 'Água fria e caixa d’água', -2, 12, 30, 'Em andamento'), // impedida: caixa d'água não chegou
  grupo('pa9', 'o1', 4, 'Elétrica', -6, 15),
  ativ('pa10', 'o1', 'pa9', 1, 'Eletrodutos embutidos', -6, 1, 100, 'Concluído'),
  ativ('pa11', 'o1', 'pa9', 2, 'Fiação e quadros', 2, 15, 0, 'A fazer'), // impedida: projeto revisado sem aprovação
  grupo('pa12', 'o1', 5, 'Acabamento', 12, 30),
  ativ('pa13', 'o1', 'pa12', 1, 'Piso cerâmico das salas', 12, 30, 0, 'A fazer'),
  // UBS Centro (poucos registros): 1 grupo e 2 atividades.
  grupo('pb1', 'o2', 1, 'Instalações e pintura', -6, 20),
  ativ('pb2', 'o2', 'pb1', 1, 'Instalação elétrica dos consultórios', -6, 8, 35, 'Em andamento'),
  ativ('pb3', 'o2', 'pb1', 2, 'Pintura da recepção', 2, 20, 0, 'A fazer'),
]

// Restrições (impedimentos) do médio prazo. tipo: Material · Mão de obra · Método ·
// Equipamento · Projeto · Segurança · Logística. A semana em que aparece = a do prazo.
export const restricoes_plano = [
  { id: 'rs1', obra_id: 'o1', atividade_id: 'pa8', descricao: 'Caixa d’água de 5.000 L ainda não entregue pelo fornecedor', tipo: 'Material', prazo: d(3), responsavel: 'Ana', resolvida: false },
  { id: 'rs2', obra_id: 'o1', atividade_id: 'pa11', descricao: 'Revisão do projeto elétrico sem aprovação da fiscalização', tipo: 'Projeto', prazo: d(8), responsavel: 'Wlisses', resolvida: false },
  { id: 'rs3', obra_id: 'o1', atividade_id: 'pa5', descricao: 'Andaime para o pé-direito da sala 3', tipo: 'Equipamento', prazo: d(-2), responsavel: 'Carlos', resolvida: true },
  { id: 'rs4', obra_id: 'o2', atividade_id: 'pb3', descricao: 'Tinta da cor do projeto em falta no fornecedor', tipo: 'Material', prazo: d(5), responsavel: 'Ana', resolvida: false },
]

// Subtarefas (checklist) das atividades, para o quadro da semana.
// Causa de "não realizado" vale para a semana em que foi marcada (aqui: a atual).
const sub = (id, obra_id, atividade_id, ordem, titulo, feita, causa_nao_realizado = null) => ({ id, obra_id, atividade_id, ordem, titulo, feita, causa_nao_realizado, semana_nao_realizado: causa_nao_realizado ? semanaDe(HOJE) : null })
export const subtarefas_plano = [
  sub('st1', 'o1', 'pa5', 1, 'Chapisco das salas 1 e 2', true),
  sub('st2', 'o1', 'pa5', 2, 'Reboco da sala 1', true),
  sub('st3', 'o1', 'pa5', 3, 'Reboco da sala 2', false),
  sub('st4', 'o1', 'pa5', 4, 'Reboco da sala 3', false, 'Equipamento'),
  sub('st5', 'o1', 'pa8', 1, 'Ramal de entrada da Compesa', true),
  sub('st6', 'o1', 'pa8', 2, 'Instalar a caixa d’água', false, 'Material'),
  sub('st7', 'o1', 'pa8', 3, 'Teste de estanqueidade', false),
  sub('st8', 'o2', 'pb2', 1, 'Tomadas do consultório 1', true),
  sub('st9', 'o2', 'pb2', 2, 'Quadro de distribuição', false),
]

// ─── Medições de empreiteiros (22/11/2026) ──────────────────────────────────
// No banco desde 22/11/2026 (migration 20261122180000_medicoes_empreiteiros.sql);
// estes dados viram a carga inicial pelo scripts/gerar-seed.mjs. Quase tudo na
// Escola Vila Nova; a UBS Centro tem 2.
// Nomes de empreiteiro fictícios.
const contratoE = (id, obra_id, empreiteiro, descricao, status, tipo = null, valor_global = null) => ({
  id, obra_id, empreiteiro, descricao, status, tipo, valor_global, criado_em: '2026-09-15',
})
export const contratos_empreiteiro = [
  contratoE('ce1', 'o1', 'Gesso Nordeste', 'Forro de gesso das salas de aula', 'Aprovado / ativo', 'Global', 30000),
  contratoE('ce2', 'o1', 'Drywall & Cia', 'Divisórias de drywall da administração', 'Aprovado / ativo', 'Por escopo'),
  contratoE('ce3', 'o1', 'Zé Pedreiro Empreitadas', 'Alvenaria do muro de divisa', 'Em elaboração'),
  contratoE('ce4', 'o1', 'Pinturas Litoral', 'Pintura interna e externa', 'Enviado p/ aprovação'),
  contratoE('ce5', 'o1', 'Zé Pedreiro Empreitadas', 'Contrapiso do pátio coberto', 'Concluído', 'Global', 12000),
  contratoE('ce6', 'o2', 'Hidráulica Bezerros', 'Instalações hidráulicas dos consultórios', 'Em elaboração'),
  contratoE('ce7', 'o2', 'Serralheria Agreste', 'Portões e grades', 'Aprovado / ativo', 'Global', 8500),
]

export const itens_empreiteiro = [
  { id: 'ie1', obra_id: 'o1', contrato_id: 'ce2', ordem: 1, descricao: 'Placas de drywall (montagem)', unidade: 'm²', quantidade: 200, preco_unitario: 80 },
  { id: 'ie2', obra_id: 'o1', contrato_id: 'ce2', ordem: 2, descricao: 'Tratamento de juntas', unidade: 'm²', quantidade: 200, preco_unitario: 40 },
  { id: 'ie3', obra_id: 'o1', contrato_id: 'ce2', ordem: 3, descricao: 'Tabica', unidade: 'm', quantidade: 50, preco_unitario: 120 },
]

// Boletim: no Por escopo a verdade é a quantidade de cada item
// (boletim_itens_empreiteiro); o `valor` é o R$ que saiu dela ao salvar e é o
// que vai para o "a pagar" da obra em `pagar_em` (padrão: fim da quinzena).
export const boletins_empreiteiro = [
  { id: 'be1', obra_id: 'o1', contrato_id: 'ce1', numero: 1, data: '2026-11-06', valor: 9000, pagar_em: '2026-11-15', pago: false },
  { id: 'be2', obra_id: 'o1', contrato_id: 'ce2', numero: 1, data: '2026-10-30', valor: 8000, pagar_em: '2026-10-31', pago: true },
  { id: 'be3', obra_id: 'o1', contrato_id: 'ce2', numero: 2, data: '2026-11-13', valor: 9600, pagar_em: '2026-11-30', pago: false },
  { id: 'be4', obra_id: 'o1', contrato_id: 'ce5', numero: 1, data: '2026-09-25', valor: 6000, pagar_em: '2026-09-30', pago: true },
  { id: 'be5', obra_id: 'o1', contrato_id: 'ce5', numero: 2, data: '2026-10-16', valor: 6000, pagar_em: '2026-10-31', pago: true },
]
export const boletim_itens_empreiteiro = [
  { id: 'bi1', obra_id: 'o1', boletim_id: 'be2', item_id: 'ie1', quantidade: 80 },
  { id: 'bi2', obra_id: 'o1', boletim_id: 'be2', item_id: 'ie2', quantidade: 40 },
  { id: 'bi3', obra_id: 'o1', boletim_id: 'be3', item_id: 'ie1', quantidade: 60 },
  { id: 'bi4', obra_id: 'o1', boletim_id: 'be3', item_id: 'ie2', quantidade: 60 },
  { id: 'bi5', obra_id: 'o1', boletim_id: 'be3', item_id: 'ie3', quantidade: 20 },
]
