// Regras de negócio do Minha Obra (src/lib/regras.js).
// Node puro: `node tests/regras.mjs`. Importe com `.js` explícito.
import {
  quinzenaDe, rotuloQuinzena, quinzenaAnterior, brl, diariaVigente, calcularDiarias,
  gastosPorCategoria, acessoNaObra, abasVisiveis, podeEditarPresenca, estadoPresencaHoje,
  nfAtrasada, mensagemCobrancaNF, contarLancamentos, plural, relatoriosDisponiveis, somarAcessos,
} from '../src/lib/regras.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Quinzenas
conferir('dia 15 é da 1ª quinzena', quinzenaDe('2026-11-15'), { inicio: '2026-11-01', fim: '2026-11-15' })
conferir('dia 16 é da 2ª quinzena, até o fim do mês', quinzenaDe('2026-11-16'), { inicio: '2026-11-16', fim: '2026-11-30' })
conferir('fevereiro termina no dia 28', quinzenaDe('2027-02-20').fim, '2027-02-28')
conferir('outubro termina no dia 31', quinzenaDe('2026-10-31').fim, '2026-10-31')
conferir('anterior da 1ª de nov é a 2ª de out', quinzenaAnterior(quinzenaDe('2026-11-03')), { inicio: '2026-10-16', fim: '2026-10-31' })
conferir('rótulo da quinzena', rotuloQuinzena(quinzenaDe('2026-11-03')), '1ª quinzena nov/2026')

// Dinheiro
conferir('formato R$ 1.234,56', brl(2340.5).replace(/\s/g, ' '), 'R$ 2.340,50')

// Diárias: valor muda no meio da quinzena
const diarias = [
  { funcionario_id: 'f1', valor: 110, vigente_desde: '2026-09-01' },
  { funcionario_id: 'f1', valor: 120, vigente_desde: '2026-11-06' },
]
conferir('diária antes da troca', diariaVigente(diarias, 'f1', '2026-11-05'), 110)
conferir('diária no dia da troca', diariaVigente(diarias, 'f1', '2026-11-06'), 120)
conferir('sem diária cadastrada', diariaVigente(diarias, 'f2', '2026-11-06'), null)

const funcionarios = [
  { id: 'f1', vinculo: 'Diarista' },
  { id: 'f2', vinculo: 'Diarista' },
  { id: 'f3', vinculo: 'Do empreiteiro' },
]
const presencas = [
  { funcionario_id: 'f1', data: '2026-11-04', situacao: 'Presente' },
  { funcionario_id: 'f1', data: '2026-11-05', situacao: 'Presente' },
  { funcionario_id: 'f1', data: '2026-11-06', situacao: 'Presente' },
  { funcionario_id: 'f1', data: '2026-11-09', situacao: 'Falta' },
  { funcionario_id: 'f2', data: '2026-11-04', situacao: 'Presente' },
  { funcionario_id: 'f3', data: '2026-11-04', situacao: 'Presente' },
]
const linhas = calcularDiarias({ funcionarios, presencas, diarias, periodo: { inicio: '2026-11-01', fim: '2026-11-15' } })
const f1 = linhas.find((l) => l.funcionario.id === 'f1')
conferir('dias presentes contados', f1.dias, 3)
conferir('usa o valor de cada dia (110+110+120)', f1.a_pagar, 340)
conferir('marca que o valor variou', f1.variou, true)
conferir('diarista sem diária fica marcado', linhas.find((l) => l.funcionario.id === 'f2').sem_valor, true)
conferir('"Do empreiteiro" não entra nas diárias', linhas.some((l) => l.funcionario.id === 'f3'), false)

// Gastos: compra dividida soma nas duas categorias; mão de obra = empreiteiros + diárias
const g = gastosPorCategoria([
  { categoria: 'Material', valor: 4000 },
  { categoria: 'Mão de obra', valor: 6000 },
], 500)
conferir('material da compra dividida', g.Material, 4000)
conferir('mão de obra = empreiteiro + diárias', g['Mão de obra'], 6500)
conferir('partes da mão de obra', [g.empreiteiros, g.diarias], [6000, 500])
conferir('total', g.total, 10500)

// Permissões
const membros = [
  { obra_id: 'o1', profile_id: 'ana', pode_financeiro: true, pode_presenca_diario: true, pode_medicao: false },
  { obra_id: 'o2', profile_id: 'ana', pode_financeiro: true, pode_presenca_diario: false, pode_medicao: false },
  { obra_id: 'o1', profile_id: 'carlos', pode_financeiro: false, pode_presenca_diario: true, pode_medicao: false },
]
const ana = { id: 'ana', role: 'Auxiliar', ativo: true }
const carlos = { id: 'carlos', role: 'Mestre', ativo: true }
const pedro = { id: 'pedro', role: 'Pendente', ativo: true }
const ids = (abas) => abas.map((a) => a.id)
conferir('auxiliar com tudo na obra 1 vê presença, sem equipe', ids(abasVisiveis(acessoNaObra(ana, membros, 'o1'))), ['resumo', 'orcado', 'fluxo', 'lista', 'fornecedores', 'notas', 'pagamentos', 'presenca'])
conferir('auxiliar só com financeiro na obra 2 não vê presença', ids(abasVisiveis(acessoNaObra(ana, membros, 'o2'))).includes('presenca'), false)
conferir('mestre nunca tem financeiro', acessoNaObra(carlos, membros, 'o1').financeiro, false)
conferir('mestre vê só presença', ids(abasVisiveis(acessoNaObra(carlos, membros, 'o1'))), ['presenca'])
conferir('mestre não vê obra que não é dele', acessoNaObra(carlos, membros, 'o2').ver, false)
conferir('pendente não vê nada', acessoNaObra(pedro, membros, 'o1').ver, false)
conferir('mestre mesmo com linha financeira continua sem financeiro',
  acessoNaObra(carlos, [{ obra_id: 'o1', profile_id: 'carlos', pode_financeiro: true }], 'o1').financeiro, false)

// Presença
conferir('mestre corrige 3 dias atrás', podeEditarPresenca(carlos, '2026-11-14', '2026-11-17'), true)
conferir('mestre não lança 5 dias atrás', podeEditarPresenca(carlos, '2026-11-12', '2026-11-17'), false)
conferir('engenheiro corrige qualquer dia', podeEditarPresenca({ role: 'Engenheiro' }, '2026-10-01', '2026-11-17'), true)
conferir('ninguém lança o futuro', podeEditarPresenca({ role: 'Engenheiro' }, '2026-11-18', '2026-11-17'), false)
conferir('sem presença antes das 10h é cinza', estadoPresencaHoje(false, 9), 'pendente')
conferir('sem presença depois das 10h é vermelho', estadoPresencaHoje(false, 10), 'atrasada')

// Compra dividida conta como um lançamento só (bug achado na varredura de 17/11/2026)
conferir('duas partes do mesmo grupo = 1 lançamento', contarLancamentos([
  { id: 'c11', grupo_id: 'g1' }, { id: 'c12', grupo_id: 'g1' }, { id: 'c1', grupo_id: null },
]), 2)
conferir('plural com 1', plural(1, 'falta', 'faltas'), '1 falta')
conferir('plural com 2', plural(2, 'falta', 'faltas'), '2 faltas')

// Relatórios: fase futura não aparece; permissão manda
const ver = (ac, fases) => relatoriosDisponiveis(ac, fases).map((r) => r.id)
conferir('fase 1, só presença', ver({ presenca: true }), ['presenca'])
conferir('diário aparece quando a fase 2 existir', ver({ presenca: true }, [1, 2]), ['presenca', 'diario'])
conferir('medição só com liberação de medição', ver({ financeiro: true }, [1, 2, 3]).includes('medicao'), false)
conferir('acesso somado: basta uma obra', somarAcessos([{ financeiro: false, presenca: true }, { financeiro: true }]), { financeiro: true, presenca: true, medicao: false })

// Nota fiscal
conferir('8 dias esperando NF é atraso', nfAtrasada({ status: 'Aguardando NF', data: '2026-11-09' }, '2026-11-17'), true)
conferir('7 dias ainda não é atraso', nfAtrasada({ status: 'Aguardando NF', data: '2026-11-10' }, '2026-11-17'), false)
const msg = mensagemCobrancaNF({ nome: 'Casa do Construtor' }, [{ obra: { nome: 'Escola Vila Nova', orgao_contratante: 'Prefeitura de Caruaru' }, compras: [
  { data: '2026-11-03', descricao: '50 sacos de cimento CP-II', valor: 1850 },
  { data: '2026-11-07', descricao: 'Areia média 6 m³', valor: 900 },
] }]).replace(/ /g, ' ')
conferir('mensagem cita a obra e o órgão', msg.startsWith('Olá, Casa do Construtor! Aqui é da obra Escola Vila Nova (Prefeitura de Caruaru).'), true)
conferir('mensagem traz o total', msg.includes('Total: R$ 2.750,00'), true)

console.log(`${ok}/${tot} — regras`)
process.exit(ok === tot ? 0 : 1)
