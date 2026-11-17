// Orçado x Realizado e Fluxo de Caixa (src/lib/orcamento.js).
import { orcadoPorEtapa, fluxoMensal, rotuloMes } from '../src/lib/orcamento.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Duas etapas com o mesmo nome (como 3 e 23 de Aporá) e uma subetapa.
const etapas = [
  { id: 'e3', numero: '3', nome: 'FUNDAÇÕES', nivel: 1, ordem: 1 },
  { id: 'e31', numero: '3.1', nome: 'ESTACAS', nivel: 2, ordem: 2 },
  { id: 'e23', numero: '23', nome: 'FUNDAÇÕES', nivel: 1, ordem: 4 },
]
const itens = [
  { etapa_id: 'e3', quantidade: 10, custo_unitario: 100 }, // 1.000
  { etapa_id: 'e31', quantidade: 5, custo_unitario: 200 }, // 1.000 (conta na 3)
  { etapa_id: 'e23', quantidade: 0, custo_unitario: 999 }, // zerado: 0
  { etapa_id: 'e23', quantidade: 2, custo_unitario: 250 }, // 500
]
const compras = [
  { etapa_id: 'e31', valor: 1850 }, // 92,5% da etapa 3 → atenção
  { etapa_id: 'e23', valor: 700 }, // estourou a 23
  { etapa_id: null, valor: 300 }, // Administração
]
const r = orcadoPorEtapa({ etapas, itens, compras, valorDiarias: 1200 })

conferir('uma linha por etapa de nível 1, separadas pelo número', r.linhas.map((l) => l.etapa.numero), ['3', '23'])
conferir('orçado soma a subetapa e ignora o zerado', r.linhas.map((l) => l.orcado), [2000, 500])
conferir('realizado da subetapa conta na etapa de cima', r.linhas[0].realizado, 1850)
conferir('filha aparece para abrir', r.linhas[0].filhas.map((f) => [f.etapa.numero, f.realizado]), [['3.1', 1850]])
conferir('acima de 90% fica em atenção', r.linhas[0].estado, 'atencao')
conferir('acima do orçado estourou', [r.linhas[1].estado, r.linhas[1].diferenca], ['estourou', -200])
conferir('compras sem etapa vão para Administração', r.administracao, 300)
conferir('diárias vão para Mão de obra própria', r.mao_obra_propria, 1200)
conferir('total realizado soma tudo', r.total, { orcado: 2500, realizado: 4050, diferenca: -1550, pct: 1.62 })
conferir('conta as estouradas', r.estouradas, 1)

// Fluxo de caixa
const f = fluxoMensal({
  inicio: '2026-09-01', hojeIso: '2026-11-17', mesesFrente: 2,
  pagamentos: [{ data: '2026-10-25', valor: 1120 }, { data: '2026-11-09', valor: 1000 }],
  pagamentosDiarias: [{ data_pagamento: '2026-11-03', valor_total: 16400 }],
  aPagarFornecedores: 2190.5,
  diariasEmAberto: [{ fim: '2026-11-15', valor: 9000 }, { fim: '2026-11-30', valor: 4000 }, { fim: '2026-10-31', valor: 500 }],
})
conferir('meses do início até 2 à frente', f.map((m) => m.mes), ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01'])
conferir('passado é realizado, atual e futuro previsto', f.map((m) => m.previsto), [false, false, true, true, true])
conferir('pagamento no mês da data', f[1].saidas_fornecedores, 1120)
conferir('diárias pagas no mês do pagamento', f[2].saidas_diarias, 16400)
conferir('a pagar e diárias em aberto (inclusive atrasadas) no mês atual', f[2].saidas_a_pagar, 2190.5 + 9000 + 4000 + 500)
conferir('sem medição, nenhuma entrada (fase 1)', f.every((m) => m.entradas_recebidas === 0 && m.entradas_a_receber === 0), true)
conferir('saldo acumulado', f.map((m) => m.acumulado), [0, -1120, -34210.5, -34210.5, -34210.5])

// Fase 3: entradas pelas medições
const g = fluxoMensal({
  inicio: '2026-10-01', hojeIso: '2026-11-17', mesesFrente: 1,
  medicoes: [
    { status: 'Aprovada', valor: 142000, valor_recebido: 140000, data_recebimento: '2026-11-14' },
    { status: 'Aprovada', valor: 50000, data_prevista_recebimento: '2026-12-20' },
    { status: 'Rascunho', valor: 99999, data_prevista_recebimento: '2026-12-20' },
  ],
})
conferir('recebida entra pelo valor recebido, no mês em que caiu', g[1].entradas_recebidas, 140000)
conferir('aprovada não recebida entra como a receber', g[2].entradas_a_receber, 50000)
conferir('rascunho não entra', g[2].entradas_a_receber, 50000)
conferir('rótulo do mês', rotuloMes('2026-11'), 'nov/2026')

console.log(`${ok}/${tot} — orcamento`)
process.exit(ok === tot ? 0 : 1)
