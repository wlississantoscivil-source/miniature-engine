// A regra mais importante do app: o mestre nunca RECEBE valor em R$.
// Não basta esconder na tela — a camada de dados não pode entregar.
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const perfis = (await dados.listarPerfisDeExemplo()).data
const carlos = perfis.find((p) => p.nome === 'Carlos')
const joaquim = perfis.find((p) => p.nome === 'Joaquim')
const ana = perfis.find((p) => p.nome === 'Ana')
const pedro = perfis.find((p) => p.nome === 'Pedro')
const wlisses = perfis.find((p) => p.nome === 'Wlisses')

// Procura qualquer campo de dinheiro em qualquer nível do objeto.
const CAMPOS_R$ = ['valor', 'a_pagar', 'diaria', 'valor_total', 'aguardando_nf', 'comprado', 'pago', 'saldo']
function temValor(obj) {
  if (Array.isArray(obj)) return obj.some(temValor)
  if (obj && typeof obj === 'object') return Object.entries(obj).some(([k, v]) => CAMPOS_R$.includes(k) || temValor(v))
  return false
}

const painelCarlos = (await dados.listarObrasPainel(carlos)).data
conferir('mestre vê só a obra dele', painelCarlos.map((o) => o.id), ['o1'])
conferir('painel do mestre sem nenhum R$', temValor(painelCarlos), false)
conferir('Joaquim vê as duas obras dele', (await dados.listarMinhasObras(joaquim)).data.map((o) => o.id).sort(), ['o2', 'o3'])

const pres = (await dados.presencaDoDia(carlos, 'o1', '2026-11-16')).data
conferir('presença do mestre traz funcionários', pres.funcionarios.length, 16)
conferir('presença do mestre sem valor de diária', temValor(pres), false)

for (const [nome, chamada] of [
  ['compras/fornecedores', () => dados.fornecedoresDaQuinzena(carlos, 'o1', { inicio: '2026-11-01', fim: '2026-11-15' })],
  ['notas', () => dados.notasObra(carlos, 'o1')],
  ['pagamentos', () => dados.pagamentosObra(carlos, 'o1')],
  ['diárias', () => dados.diariasQuinzena(carlos, 'o1', { inicio: '2026-11-01', fim: '2026-11-15' })],
  ['resumo', () => dados.resumoObra(carlos, 'o1')],
  ['lista de compras', () => dados.listaComprasObra(carlos, 'o1')],
  ['cadastro de fornecedores', () => dados.listarFornecedores(carlos)],
]) {
  const r = await chamada()
  conferir(`mestre recusado em ${nome}`, [r.data, !!r.erro], [null, true])
}
conferir('gastos do mestre vêm vazios', (await dados.gastosPorObra(carlos)).data, [])
conferir('notas pendentes do mestre vêm vazias', (await dados.notasPendentesGeral(carlos)).data, [])

// Pendente não vê nada
conferir('pendente não vê obra nenhuma', (await dados.listarObrasPainel(pedro)).data, [])

// Auxiliar: Ana tem Financeiro em todas, Presença só na Escola Vila Nova
conferir('auxiliar sem presença na UBS é recusada', !!(await dados.presencaDoDia(ana, 'o2', '2026-11-16')).erro, true)
conferir('auxiliar com presença na Escola é aceita', !!(await dados.presencaDoDia(ana, 'o1', '2026-11-16')).erro, false)
conferir('auxiliar não vê Equipe', !!(await dados.equipeObra(ana, 'o1')).erro, true)
conferir('auxiliar não vê Usuários', !!(await dados.listarUsuarios(ana)).erro, true)

// Gastos batem com as compras de exemplo (Escola Vila Nova)
const escola = (await dados.gastosPorObra(wlisses)).data.find((l) => l.obra.id === 'o1')
conferir('material da Escola = 1850 + 900 + 4000', escola.Material, 6750)
conferir('empreiteiros da Escola = 7200 + 6000', escola.empreiteiros, 13200)
conferir('aluguel da Escola', escola['Aluguel de equipamento'], 600)

// Compra dividida (Zé Pedreiro, reboco bloco B) conta uma vez só
const painel = (await dados.listarObrasPainel(wlisses)).data
conferir('Escola tem 4 lançamentos aguardando NF', painel.find((o) => o.id === 'o1').aguardando_nf, 4)
conferir('aviso do topo soma 6 lançamentos', (await dados.avisosPainel(wlisses)).data.compras_aguardando, 6)

// Grade de módulos: cada pessoa só vê a pendência do que pode abrir
conferir('mestre vê só a pendência de presença e diário', Object.keys((await dados.pendenciasObra(carlos, 'o1')).data), ['presenca', 'diario'])
conferir('auxiliar na UBS não vê presença nem equipe',
  Object.keys((await dados.pendenciasObra(ana, 'o2')).data).sort(), ['fluxo', 'fornecedores', 'lista', 'notas', 'orcado', 'pagamentos', 'resumo'])
conferir('engenheiro vê a pendência de notas da Escola', (await dados.pendenciasObra(wlisses, 'o1')).data.notas.texto, '4 aguardando NF')
conferir('mestre não lista fechamentos', !!(await dados.fechamentosObra(carlos, 'o1')).erro, true)

// Relatórios: o mestre não tem nenhum; a auxiliar só vê o que foi liberado
conferir('mestre sem relatórios', (await dados.relatoriosPara(carlos, 'o1')).data, [])
conferir('mestre sem obras nos relatórios', (await dados.obrasDosRelatorios(carlos)).data, [])
const ids = async (p, o) => (await dados.relatoriosPara(p, o)).data.map((r) => r.id)
conferir('Ana na UBS: só financeiros', await ids(ana, 'o2'), ['gastos', 'fechamento', 'diarias', 'orcado', 'fluxo'])
conferir('Ana na Escola: financeiros + presença', await ids(ana, 'o1'), ['gastos', 'fechamento', 'diarias', 'presenca', 'orcado', 'fluxo'])
conferir('engenheiro em todas: fase 1 inteira', await ids(wlisses, ''), ['gastos', 'fechamento', 'diarias', 'presenca', 'orcado', 'fluxo'])

// Planilha da licitação, Orçado x Realizado e Fluxo: o mestre nunca recebe
for (const [nome, chamada] of [
  ['planilha', () => dados.obterPlanilha(carlos, 'o1')],
  ['orçado x realizado', () => dados.orcadoRealizado(carlos, 'o1')],
  ['fluxo de caixa', () => dados.fluxoCaixa(carlos, 'o1')],
]) {
  const r = await chamada()
  conferir(`mestre recusado em ${nome}`, [r.data, !!r.erro], [null, true])
}
conferir('auxiliar vê a planilha mas não importa', [(await dados.obterPlanilha(ana, 'o1')).data.pode_importar,
  !!(await dados.importarPlanilha(ana, 'o1', { leitura: { itens: [{}] } })).erro], [false, true])

// Orçado x Realizado da Escola Vila Nova (PRD-FRONTEND, critérios de aceite)
const oxr = (await dados.orcadoRealizado(wlisses, 'o1')).data
const porNum = (n) => oxr.linhas.find((l) => l.etapa.numero === n)
conferir('3 – Alvenaria realizado = cimento + alvenaria do Zé', porNum('3').realizado, 9050)
conferir('4 – Revestimento realizado = areia + reboco dividido', porNum('4').realizado, 10900)
conferir('betoneira cai em Administração', oxr.administracao, 600)
conferir('orçado sem BDI da obra', oxr.total.orcado, 998640)
conferir('diárias em Mão de obra própria', oxr.mao_obra_propria > 0, true)
conferir('UBS sem planilha mostra só as categorias', (await dados.orcadoRealizado(wlisses, 'o2')).data.sem_planilha, true)

// Fluxo da Escola: diárias de out pagas em 03/11 caem em novembro
const fluxo = (await dados.fluxoCaixa(wlisses, 'o1')).data
conferir('fluxo sem entradas na fase 1', fluxo.entradas_disponiveis, false)
conferir('diárias pagas em nov/2026', fluxo.meses.find((x) => x.mes === '2026-11').saidas_diarias > 0, true)

// Importar: troca etapas e itens e religa as compras pelo número
const leitura = {
  etapas: [{ numero: '3', nome: 'ALVENARIA', nivel: 1, numero_pai: null, ordem: 1 }, { numero: '9', nome: 'NOVA', nivel: 1, numero_pai: null, ordem: 3 }],
  itens: [{ item: '3.1', codigo: '1', banco: 'SINAPI', descricao: 'X', unidade: 'm²', quantidade: 0, preco_unitario: 10, custo_unitario: null, etapa_numero: '3', ordem: 2 }],
  info: {}, totaisPlanilha: {},
}
const imp = (await dados.importarPlanilha(wlisses, 'o1', { leitura, bdi_percentual: 25, arquivo_nome: 'nova.xlsx' })).data
conferir('importou 2 etapas e 1 item', [imp.etapas, imp.itens], [2, 1])
conferir('compras da etapa 4 (sem par) foram para Administração', imp.compras_sem_etapa, 3)
const depois = (await dados.orcadoRealizado(wlisses, 'o1')).data
conferir('compras da etapa 3 continuam na nova 3', depois.linhas.find((l) => l.etapa.numero === '3').realizado, 9050)
conferir('custo calculado pelo BDI quando a planilha não traz', (await dados.obterPlanilha(wlisses, 'o1')).data.itens[0].custo_unitario, 8)

console.log(`${ok}/${tot} — mestre-sem-valores`)
process.exit(ok === tot ? 0 : 1)
