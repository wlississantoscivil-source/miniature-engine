// Leitor da planilha da licitação (src/lib/planilha.js).
// A planilha abaixo é inventada, no MESMO FORMATO da planilha real de Aporá
// (que não entra no projeto: é uma proposta real, com endereço).
import {
  lerPlanilha, conferir, completarCusto, religarEtapas, rotuloEtapa, numero, identificarColunas, totaisItens,
} from '../src/lib/planilha.js'

let ok = 0
let tot = 0
function conferir_(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const _ = null
const linhas = [
  ['Á Comissão Permanente de Licitação', _, _, _, _, _, _, _, _, _],
  ['Objeto: ', _, _, _, _, 'Encargos Sociais:', _, _, _, _],
  ['CONSTRUÇÃO DE QUADRA E ESCOLA', _, _, _, _, 'Horista: 101,70%', _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  ['Localidade:', _, _, _, _, 'BDI:', _, 'BDI: ', _, _],
  ['Rua Exemplo, s/n', _, _, _, _, 0.277, _, 0.2097, _, _],
  ['Agente Executivo:', _, _, _, _, 'Referência:', _, _, _, _],
  ['Prefeitura Exemplo', _, _, _, _, 'SINAPI 03/2024 \nORSE 02/2024', _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _],
  ['Item', 'Código', 'Banco', 'Descrição', 'Und', 'Quant.', 'Valor Unit', 'Valor Unit com BDI', 'Total', 'Peso (%)'],
  [' 1 ', _, _, 'SERVIÇOS PRELIMINARES', _, _, _, _, 100, 0.01],
  [' 1.1 ', ' 74209/001 ', 'SINAPI', 'PLACA DE OBRA', 'm²', 0, 474.29, 605.66, 0, 0],
  [' 1.2 ', ' C0371 ', 'SEINFRA', 'BARRACÃO', 'UN', 2, 40, 51.11, 102.22, 0.01],
  [' 3 ', _, _, 'FUNDAÇÕES', _, _, _, _, 1000, 0.1],
  [' 3.1 ', _, _, 'ESTACAS', _, _, _, _, 1000, 0.1],
  [' 3.1.1 ', ' 101 ', 'Próprio', 'ESTACA ESCAVADA', 'm', 10, 78.3, 100, 1000, 0.1],
  [' 23 ', _, _, 'FUNDAÇÕES', _, _, _, _, 500, 0.05],
  [' 23.1 ', ' 102 ', 'ORSE', 'SAPATA', 'm³', '2,5', '156,6', '200,00', 500, 0.05],
  [_, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, 'Total sem BDI', _, 1254.5, _, _],
  [_, _, _, _, _, 'Total do BDI', _, 377.12, _, _],
  [_, _, _, _, _, 'Total Geral', _, 1602.22, _, _],
  ['Cidade, 05 de maio de 2026.', _, _, _, _, _, _, _, _, _],
  ['____________', _, _, _, _, _, _, _, _, _],
]
const r = lerPlanilha(linhas)

conferir_('acha o cabeçalho pela palavra, não pela posição', r.linhaCabecalho, 10)
conferir_('colunas reconhecidas pelo nome', [r.colunas.item, r.colunas.custo, r.colunas.preco, r.colunas.total], [0, 6, 7, 8])
conferir_('BDI do cabeçalho em % (só o primeiro)', r.info.bdi_percentual, 27.7)
conferir_('referência junta as linhas', r.info.referencia_precos, 'SINAPI 03/2024, ORSE 02/2024')
conferir_('objeto lido de baixo do rótulo', r.info.objeto, 'CONSTRUÇÃO DE QUADRA E ESCOLA')
conferir_('etapas com nível', r.etapas.map((e) => [e.numero, e.nivel]), [['1', 1], ['3', 1], ['3.1', 2], ['23', 1]])
conferir_('itens contados, para no "Total sem BDI"', r.itens.length, 4)
conferir_('número e código sem espaços em volta', [r.itens[0].item, r.itens[0].codigo], ['1.1', '74209/001'])
conferir_('item com quantidade 0 entra', r.itens[0].quantidade, 0)
conferir_('item fica na etapa logo acima (subetapa)', r.itens[2].etapa_numero, '3.1')
conferir_('unidade como veio', r.itens[1].unidade, 'UN')
conferir_('número em texto brasileiro', [r.itens[3].quantidade, r.itens[3].custo_unitario], [2.5, 156.6])
conferir_('custo sem BDI vem da coluna Valor Unit', r.itens[1].custo_unitario, 40)
conferir_('totais do rodapé', r.totaisPlanilha, { sem_bdi: 1254.5, geral: 1602.22 })
conferir_('sem erros', r.erros, [])
conferir_('nomes repetidos ficam separados pelo número', [rotuloEtapa(r.etapas[1]), rotuloEtapa(r.etapas[3])], ['3 – FUNDAÇÕES', '23 – FUNDAÇÕES'])
conferir_('sem etapa = Administração', rotuloEtapa(null), 'Sem etapa / Administração')

const c = conferir(r, 27.7)
conferir_('soma dos totais bate com o Total Geral', c.diferenca_total, 0)
conferir_('soma sem BDI bate com o Total sem BDI', c.diferenca_sem_bdi, 0)
conferir_('conta os zerados', c.zerados, 1)

// Planilha sem a coluna sem BDI: custo = preço ÷ (1 + BDI)
const soPreco = identificarColunas(['Item', 'Código', 'Descrição', 'Unid.', 'Quantidade', 'Preço Unitário', 'Preço Total'])
conferir_('uma unitária só é o preço', [soPreco.preco, soPreco.custo, soPreco.total, soPreco.unidade], [5, undefined, 6, 3])
conferir_('custo calculado pelo BDI quando falta a coluna', completarCusto([{ preco_unitario: 125, custo_unitario: null }], 25)[0].custo_unitario, 100)

// Erros apontados
const ruim = lerPlanilha([
  ['Item', 'Código', 'Descrição', 'Und', 'Quant.', 'Valor Unit com BDI', 'Total'],
  [' 1.1 ', ' 9 ', 'ITEM SEM ETAPA', 'm', 1, 10, 10],
  [' 1 ', _, 'ETAPA', _, _, _, _],
  [' 1.2 ', ' 8 ', 'QUANTIDADE RUIM', 'm', 'abc', 10, 10],
  [' 1 ', _, 'ETAPA REPETIDA', _, _, _, _],
])
conferir_('aponta item antes de etapa, quantidade ruim e etapa repetida', ruim.erros.map((e) => e.linha), [2, 4, 5])
// Etapa de nível 4 (3.1.2.1): o banco só guarda até 3 níveis. Antes passava e o
// banco recusava a importação inteira com uma mensagem genérica.
const fundo = lerPlanilha([
  ['Item', 'Código', 'Descrição', 'Und', 'Quant.', 'Valor Unit com BDI', 'Total'],
  [' 1 ', _, 'ETAPA', _, _, _, _],
  [' 1.1.1.1 ', _, 'NÍVEL 4', _, _, _, _],
  [' 1.1.1.1.1 ', ' 7 ', 'ITEM DO NÍVEL 4', 'm', 1, 10, 10],
])
conferir_('etapa de nível 4 é erro, e o item dela também', fundo.erros.map((e) => e.linha), [3, 4])
conferir_('etapa de nível 4 não entra', fundo.etapas.map((e) => e.numero), ['1'])
conferir_('sem cabeçalho dá erro geral', lerPlanilha([['a', 'b']]).ok, false)
conferir_('número vazio é null, lixo é NaN', [numero(''), Number.isNaN(numero('abc'))], [null, true])

// Reimportar: compras voltam para a etapa de mesmo número
const antigas = [{ id: 'e1', numero: '3' }, { id: 'e2', numero: '9' }]
const novas = [{ id: 'n1', numero: '3' }]
const rel = religarEtapas([{ id: 'c1', etapa_id: 'e1' }, { id: 'c2', etapa_id: 'e2' }, { id: 'c3', etapa_id: null }], antigas, novas)
conferir_('religa pelo número; sem par vai para Administração', rel.compras.map((x) => x.etapa_id), ['n1', null, null])
conferir_('conta as que ficaram sem par', rel.semPar, 1)

// Total da obra = soma da coluna Total (arredondada linha a linha), não quantidade × preço.
// 3 × 0,335 = 1,005 por linha; a planilha arredonda para 1,01 → 2,02 (q × p daria 2,01).
const doisItens = [
  { quantidade: 3, preco_unitario: 0.335, custo_unitario: 0.27, total: 1.01 },
  { quantidade: 3, preco_unitario: 0.335, custo_unitario: 0.27, total: 1.01 },
]
conferir_('total soma a coluna Total da planilha', totaisItens(doisItens), { total: 2.02, sem_bdi: 1.62 })

console.log(`${ok}/${tot} — planilha`)
process.exit(ok === tot ? 0 : 1)
