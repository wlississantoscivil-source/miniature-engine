// Medições de empreiteiros (etapa 1): valor do contrato, % medido, regras de
// mover no Kanban, cadastro do valor e troca de obra.
import * as dados from '../src/lib/dados.js'
import { acumuladoPorItem, boletimAtrasado, calcularBoletim, calcularLinha, erroMover, podeMedir, temFicha, lerValorContrato, pagarEmPadrao, proximoNumero, resumoContrato, textoPercentual, totalDoFormulario, totalEscopo } from '../src/lib/empreiteiros.js'
import { fluxoMensal } from '../src/lib/orcamento.js'
import * as mock from '../src/lib/mockData.js'

let passou = 0
let total = 0
function conferir(nome, veio, esperado) {
  total++
  if (JSON.stringify(veio) === JSON.stringify(esperado)) passou++
  else console.log(`  ✗ ${nome}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(veio)}`)
}

// ─── Contas ─────────────────────────────────────────────────────────────────
const { itens_empreiteiro: itens, boletins_empreiteiro: bol, boletim_itens_empreiteiro: bi } = mock
const contrato = (id) => mock.contratos_empreiteiro.find((c) => c.id === id)
conferir('drywall: 200×80 + 200×40 + 50×120 = 30.000', totalEscopo(itens.filter((i) => i.contrato_id === 'ce2')), 30000)
const drywall = resumoContrato(contrato('ce2'), itens, bol, bi)
// placas 140×80 + juntas 100×40 + tabica 20×120 = 11.200 + 4.000 + 2.400
conferir('drywall medido pelas quantidades dos 2 boletins', [drywall.medido, drywall.saldo, drywall.n_boletins, drywall.completo], [17600, 12400, 2, false])
conferir('drywall 58,6% (não arredonda para cima)', textoPercentual(drywall.percentual, drywall.completo), '58,6%')
const gesso = resumoContrato(contrato('ce1'), itens, bol, bi)
conferir('gesso global: 9.000 de 30.000 = 30%', [gesso.valor_total, gesso.medido, textoPercentual(gesso.percentual, gesso.completo)], [30000, 9000, '30%'])
conferir('contrapiso concluído fechou 100%', resumoContrato(contrato('ce5'), itens, bol, bi).completo, true)
conferir('contrato sem valor: tudo nulo', resumoContrato(contrato('ce3'), itens, bol, bi).valor_total, null)
conferir('99,96% não vira 100% na tela', textoPercentual(99.96, false), '99,9%')

// ─── Mover ──────────────────────────────────────────────────────────────────
conferir('não pula coluna', erroMover({ status: 'Em elaboração' }, 'Aprovado / ativo', {}), 'O contrato anda uma coluna por vez.')
conferir('ativar exige o cadastro do valor', erroMover({ status: 'Enviado p/ aprovação' }, 'Aprovado / ativo', {}), 'Cadastre o valor do contrato para ativar.')
conferir('concluir com 58% é bloqueado', erroMover({ status: 'Aprovado / ativo' }, 'Concluído', drywall), 'Só dá para concluir com 100% medido. Este contrato está com 58,6%.')
conferir('com boletim não volta para aprovação', !!erroMover({ status: 'Aprovado / ativo' }, 'Enviado p/ aprovação', gesso), true)
conferir('sem boletim volta', erroMover({ status: 'Aprovado / ativo' }, 'Enviado p/ aprovação', { n_boletins: 0 }), null)
conferir('concluído pode reabrir', erroMover({ status: 'Concluído' }, 'Aprovado / ativo', {}), null)

// ─── Cadastro do valor ──────────────────────────────────────────────────────
conferir('global aceita "30.000,50"', lerValorContrato({ tipo: 'Global', valor_global: '30.000,50' }).dados?.valor_global, 30000.5)
conferir('global vazio avisa', Object.keys(lerValorContrato({ tipo: 'Global', valor_global: '' }).erros), ['valor_global'])
conferir('global zero avisa', Object.keys(lerValorContrato({ tipo: 'Global', valor_global: '0' }).erros), ['valor_global'])
const linha = (descricao, quantidade, preco_unitario, unidade = 'm²') => ({ descricao, unidade, quantidade, preco_unitario })
conferir('escopo sem itens avisa', Object.keys(lerValorContrato({ tipo: 'Por escopo', itens: [] }).erros), ['itens'])
conferir('escopo: linha incompleta aponta o campo', Object.keys(lerValorContrato({ tipo: 'Por escopo', itens: [linha('Placas', '', '80')] }).erros), ['i0.quantidade'])
conferir('escopo: total ao digitar ignora linha incompleta', totalDoFormulario({ tipo: 'Por escopo', itens: [linha('a', '200', '80'), linha('b', '', '40')] }), 16000)

// ─── Pela camada de dados (mesmas regras, com permissão e troca de obra) ────
const perfis = (await dados.listarPerfisDeExemplo()).data
const eng = perfis.find((p) => p.role === 'Engenheiro')
const ids = (r) => r.data.contratos.map((c) => c.id)
const o1 = await dados.contratosEmpreiteiros(eng, 'o1')
const o2 = await dados.contratosEmpreiteiros(eng, 'o2')
conferir('obra 1 tem os 5 dela', ids(o1), ['ce1', 'ce2', 'ce3', 'ce4', 'ce5'])
conferir('obra 2 tem só os 2 dela', ids(o2), ['ce6', 'ce7'])
conferir('o quadro diz de qual obra é', [o1.data.obra_id, o2.data.obra_id], ['o1', 'o2'])
conferir('sugere o empreiteiro do cadastro de fornecedores', o1.data.sugestoes.includes('Zé Pedreiro Empreitadas'), true)

const criado = await dados.criarContratoEmpreiteiro(eng, 'o2', { empreiteiro: ' Teste ', descricao: 'Piso' })
const novo = criado.data.contratos.find((c) => c.empreiteiro === 'Teste')
conferir('novo contrato nasce em Em elaboração', novo?.status, 'Em elaboração')
conferir('novo contrato não aparece na outra obra', ids(await dados.contratosEmpreiteiros(eng, 'o1')).length, 5)
conferir('sem empreiteiro é recusado', !!(await dados.criarContratoEmpreiteiro(eng, 'o2', { empreiteiro: '', descricao: 'x' })).erro, true)
await dados.moverContratoEmpreiteiro(eng, 'o2', novo.id, 'Enviado p/ aprovação')
conferir('mover direto para ativo é recusado', !!(await dados.moverContratoEmpreiteiro(eng, 'o2', novo.id, 'Aprovado / ativo')).erro, true)
const ativo = await dados.ativarContratoEmpreiteiro(eng, 'o2', novo.id, { tipo: 'Por escopo', itens: [linha('Placas', '10', '80'), linha('Tabica', '5', '120', 'm')] })
const c = ativo.data.contratos.find((x) => x.id === novo.id)
conferir('ativar por escopo grava o total e os itens', [c.status, c.valor_total, c.itens.length], ['Aprovado / ativo', 1400, 2])
conferir('concluir sem medição é recusado', !!(await dados.moverContratoEmpreiteiro(eng, 'o2', novo.id, 'Concluído')).erro, true)
conferir('contrato de outra obra não é achado', !!(await dados.moverContratoEmpreiteiro(eng, 'o1', novo.id, 'Enviado p/ aprovação')).erro, true)

// ─── Boletim (etapa 2) ──────────────────────────────────────────────────────
const placas = itens.find((i) => i.id === 'ie1') // 200 m² × R$ 80, já medido 140
conferir('quantidade → % e R$', [calcularLinha(placas, 140, { campo: 'quantidade', texto: '20' }).percentual, calcularLinha(placas, 140, { campo: 'quantidade', texto: '20' }).valor], [10, 1600])
conferir('% → quantidade', calcularLinha(placas, 140, { campo: 'percentual', texto: '15' }).quantidade, 30)
conferir('R$ → quantidade', calcularLinha(placas, 140, { campo: 'valor', texto: '2.400,00' }).quantidade, 30)
conferir('R$ quebrado: quantidade em 4 casas e R$ refeito dela', (() => { const l = calcularLinha(placas, 140, { campo: 'valor', texto: '100,01' }); return [l.quantidade, l.valor] })(), [1.2501, 100.01])
conferir('passar de 100% do item trava', calcularLinha(placas, 140, { campo: 'quantidade', texto: '61' }).erro, 'Passa de 100% do item: o saldo a medir é 60 m².')
conferir('exatamente 100% do item passa', calcularLinha(placas, 140, { campo: 'percentual', texto: '30' }).erro, null)
conferir('texto que não é número avisa', calcularLinha(placas, 0, { campo: 'quantidade', texto: '1,2,3' }).erro, 'Digite um número.')

const dw = contrato('ce2')
const dwItens = itens.filter((i) => i.contrato_id === 'ce2')
const dwAcc = acumuladoPorItem(bol.filter((b) => b.contrato_id === 'ce2'), bi)
const base = { data: '2026-11-20', pagar_em: '2026-11-30' }
const b1 = calcularBoletim(dw, dwItens, drywall, dwAcc, { ...base, linhas: { ie1: { campo: 'quantidade', texto: '60' }, ie3: { campo: 'percentual', texto: '10' } } })
// 60×80 + 5×120 = 4.800 + 600
conferir('boletim por escopo: total e novo acumulado', [b1.total, b1.novo_acumulado, b1.novo_saldo, Object.keys(b1.erros)], [5400, 23000, 7000, []])
conferir('boletim vazio é recusado', Object.keys(calcularBoletim(dw, dwItens, drywall, dwAcc, { ...base, linhas: {} }).erros), ['total'])
conferir('global: % vira R$', calcularBoletim(contrato('ce1'), [], gesso, {}, { ...base, global: { campo: 'percentual', texto: '10' } }).total, 3000)
conferir('global: passar do saldo trava', Object.keys(calcularBoletim(contrato('ce1'), [], gesso, {}, { ...base, global: { campo: 'valor', texto: '21000,01' } }).erros), ['global'])
conferir('global: fechar 100% exato passa', calcularBoletim(contrato('ce1'), [], gesso, {}, { ...base, global: { campo: 'percentual', texto: '70' } }).novo_percentual, 100)
conferir('número do próximo boletim', proximoNumero(bol.filter((b) => b.contrato_id === 'ce2')), 3)
conferir('pagar em: fim da quinzena', [pagarEmPadrao('2026-11-06'), pagarEmPadrao('2026-11-20'), pagarEmPadrao('2027-02-16')], ['2026-11-15', '2026-11-30', '2027-02-28'])
const fx = fluxoMensal({ inicio: '2026-10-01', hojeIso: '2026-11-22', mesesFrente: 1, empreiteirosAPagar: [{ pagar_em: '2026-11-15', valor: 100 }, { pagar_em: '2026-12-15', valor: 50 }] })
conferir('fluxo: boletim atrasado no mês atual, futuro no mês dele', fx.map((m) => m.saidas_a_pagar), [0, 100, 50])

const ficha1 = (await dados.fichaMedicaoEmpreiteiro(eng, 'o1', 'ce2')).data
conferir('ficha: histórico do mais recente para o mais antigo', ficha1.boletins.map((b) => b.numero), [2, 1])
const resumoAntes = (await dados.resumoObra(eng, 'o1')).data.a_pagar
const salvo = await dados.salvarBoletimEmpreiteiro(eng, 'o1', 'ce2', { ...base, linhas: { ie1: { campo: 'quantidade', texto: '60' } } })
conferir('salvar: nº 3 entra e o acumulado sobe na hora', [salvo.data.boletins[0].numero, salvo.data.contrato.medido], [3, 22400])
conferir('salvar: entra no a pagar da obra', (await dados.resumoObra(eng, 'o1')).data.a_pagar - resumoAntes, 4800)
conferir('salvar de novo passando de 100% é recusado', !!(await dados.salvarBoletimEmpreiteiro(eng, 'o1', 'ce2', { ...base, linhas: { ie1: { campo: 'quantidade', texto: '1' } } })).erro, true)
conferir('contrato fora de Ativo não recebe medição', (await dados.salvarBoletimEmpreiteiro(eng, 'o1', 'ce5', { ...base, global: { campo: 'valor', texto: '1' } })).erro, 'Só contrato Aprovado / ativo pode receber medição.')
const pago = await dados.marcarBoletimPago(eng, 'o1', salvo.data.boletins[0].id)
conferir('marcar como paga tira do a pagar', [pago.data.boletins[0].pago, (await dados.resumoObra(eng, 'o1')).data.a_pagar], [true, resumoAntes])
conferir('mestre não abre a ficha', !!(await dados.fichaMedicaoEmpreiteiro(perfis.find((p) => p.role === 'Mestre'), 'o1', 'ce2')).erro, true)

// ─── Consertos da revisão de código (22/11/2026) ────────────────────────────
conferir('centavos como o banco: 1 × 1,005 = 1,01', totalDoFormulario({ tipo: 'Por escopo', itens: [{ quantidade: '1', preco_unitario: '1,005' }] }), 1.01)
// O medido é a soma dos boletins (o R$ do "a pagar"), mesmo com quantidade quebrada.
const cq = { id: 'cq', tipo: 'Por escopo' }
const iq = [{ id: 'iq', contrato_id: 'cq', quantidade: 10, preco_unitario: 33.33 }]
const bq = [{ id: 'bq1', contrato_id: 'cq', valor: 41.66 }, { id: 'bq2', contrato_id: 'cq', valor: 41.66 }]
const biq = [{ boletim_id: 'bq1', item_id: 'iq', quantidade: 1.25 }, { boletim_id: 'bq2', item_id: 'iq', quantidade: 1.25 }]
conferir('medido = soma dos boletins (bate com o a pagar)', resumoContrato(cq, iq, bq, biq).medido, 83.32)
conferir('tem ficha: ativo e concluído sim, enviado não', [temFicha({ status: 'Aprovado / ativo' }), temFicha({ status: 'Concluído' }), temFicha({ status: 'Enviado p/ aprovação', tipo: 'Global' })], [true, true, false])
conferir('pode medir: só ativo sem 100%', [podeMedir({ status: 'Aprovado / ativo', completo: false }), podeMedir({ status: 'Aprovado / ativo', completo: true }), podeMedir({ status: 'Concluído' })], [true, false, false])
conferir('atrasado: não pago com a data passada', [boletimAtrasado({ pago: false, pagar_em: '2026-11-15' }, '2026-11-22'), boletimAtrasado({ pago: true, pagar_em: '2026-11-15' }, '2026-11-22'), boletimAtrasado({ pago: false, pagar_em: '2026-11-30' }, '2026-11-22')], [true, false, false])
conferir('linha guarda o % que já estava medido', calcularLinha(placas, 140, { campo: 'quantidade', texto: '61' }).percentual_anterior, 70)
const fecha = calcularBoletim(contrato('ce1'), [], gesso, {}, { ...base, global: { campo: 'percentual', texto: '70' } })
const naoFecha = calcularBoletim(contrato('ce1'), [], gesso, {}, { ...base, global: { campo: 'percentual', texto: '10' } })
conferir('boletim que fecha 100% avisa (para a tela esconder a Nova medição)', [fecha.novo_completo, naoFecha.novo_completo], [true, false])
conferir('a ficha não abre para contrato só enviado', !!(await dados.fichaMedicaoEmpreiteiro(eng, 'o1', 'ce4')).erro, true)

console.log(`empreiteiros: ${passou}/${total}`)
if (passou !== total) process.exit(1)
