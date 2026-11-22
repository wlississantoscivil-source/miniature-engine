// Orçado x Realizado e Fluxo de Caixa. Regra pura, com teste em tests/orcamento.mjs.

const centavos = (v) => Math.round(v * 100) / 100
export const LIMITE_ATENCAO = 0.9 // [DESCOBRIR NO USO] acima de 90% do orçado fica âmbar

// Etapa e todas as que estão dentro dela ("3" contém "3.1" e "3.1.2").
const dentroDe = (numero, outra) => outra === numero || outra.startsWith(`${numero}.`)

function linhaEtapa(etapa, etapas, itens, compras) {
  const ids = new Set(etapas.filter((e) => dentroDe(etapa.numero, e.numero)).map((e) => e.id))
  const orcado = centavos(itens.filter((i) => ids.has(i.etapa_id)).reduce((t, i) => t + Number(i.quantidade) * Number(i.custo_unitario), 0))
  const realizado = centavos(compras.filter((c) => ids.has(c.etapa_id)).reduce((t, c) => t + Number(c.valor), 0))
  const pct = orcado > 0 ? realizado / orcado : null
  let estado = 'ok'
  if (realizado > orcado) estado = 'estourou'
  else if (pct != null && pct >= LIMITE_ATENCAO) estado = 'atencao'
  return { etapa, orcado, realizado, diferenca: centavos(orcado - realizado), pct, estado }
}

// Por etapa de nível 1 (com as filhas para abrir), mais Administração
// (compras sem etapa) e Mão de obra própria (diárias, que não têm etapa).
export function orcadoPorEtapa({ etapas, itens, compras, valorDiarias = 0 }) {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const linhas = ordenadas.filter((e) => e.nivel === 1).map((e) => ({
    ...linhaEtapa(e, ordenadas, itens, compras),
    filhas: ordenadas.filter((f) => f.nivel === 2 && dentroDe(e.numero, f.numero)).map((f) => linhaEtapa(f, ordenadas, itens, compras)),
  }))
  const administracao = centavos(compras.filter((c) => !c.etapa_id).reduce((t, c) => t + Number(c.valor), 0))
  const orcado = centavos(linhas.reduce((t, l) => t + l.orcado, 0))
  const realizado = centavos(linhas.reduce((t, l) => t + l.realizado, 0) + administracao + valorDiarias)
  return {
    linhas,
    administracao,
    mao_obra_propria: centavos(valorDiarias),
    estouradas: linhas.filter((l) => l.estado === 'estourou').length,
    total: { orcado, realizado, diferenca: centavos(orcado - realizado), pct: orcado > 0 ? realizado / orcado : null },
  }
}

// ─── Fluxo de caixa ─────────────────────────────────────────────────────────
const mesDe = (iso) => iso.slice(0, 7)
const somarMes = (mes, n) => {
  const [a, m] = mes.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const rotuloMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(0, 4)}`

// Mês a mês, do início da obra até `mesesFrente` depois do mês atual.
// Passado = realizado; mês atual e futuros = previsto.
// - pagamentos: [{ data, valor }] a fornecedores
// - pagamentosDiarias: [{ data_pagamento, valor_total }]
// - aPagarFornecedores: total das compras ainda não pagas (entra no mês atual)
// - diariasEmAberto: [{ fim, valor }] quinzenas sem pagamento (no mês do fim;
//   se o fim já passou, no mês atual, porque está atrasada)
// - empreiteirosAPagar: [{ pagar_em, valor }] boletins de empreiteiro não pagos
//   (no mês do pagar_em; se já passou, no mês atual)
// - medicoes: [{ valor, valor_recebido, data_recebimento, data_prevista_recebimento, status }]
//   (fase 3; vazio na fase 1)
export function fluxoMensal({ inicio, hojeIso, mesesFrente = 3, pagamentos = [], pagamentosDiarias = [], aPagarFornecedores = 0, diariasEmAberto = [], empreiteirosAPagar = [], medicoes = [] }) {
  const atual = mesDe(hojeIso)
  const ate = somarMes(atual, mesesFrente)
  const meses = []
  for (let m = mesDe(inicio); m <= ate; m = somarMes(m, 1)) meses.push(m)
  const noMes = (m) => (iso) => iso && mesDe(iso) === m
  const mesPrevisto = (iso) => (mesDe(iso) < atual ? atual : mesDe(iso))

  let acumulado = 0
  return meses.map((m) => {
    const recebidas = medicoes.filter((x) => noMes(m)(x.data_recebimento)).reduce((t, x) => t + Number(x.valor_recebido), 0)
    const aReceber = medicoes
      .filter((x) => x.status === 'Aprovada' && !x.data_recebimento && x.data_prevista_recebimento && mesPrevisto(x.data_prevista_recebimento) === m)
      .reduce((t, x) => t + Number(x.valor), 0)
    const fornecedores = pagamentos.filter((p) => noMes(m)(p.data)).reduce((t, p) => t + Number(p.valor), 0)
    const diarias = pagamentosDiarias.filter((p) => noMes(m)(p.data_pagamento)).reduce((t, p) => t + Number(p.valor_total), 0)
    const aPagar = (m === atual ? Number(aPagarFornecedores) : 0) +
      diariasEmAberto.filter((d) => mesPrevisto(d.fim) === m).reduce((t, d) => t + Number(d.valor), 0) +
      empreiteirosAPagar.filter((b) => mesPrevisto(b.pagar_em) === m).reduce((t, b) => t + Number(b.valor), 0)
    const entradas = recebidas + aReceber
    const saidas = fornecedores + diarias + aPagar
    const saldo = centavos(entradas - saidas)
    acumulado = centavos(acumulado + saldo)
    return {
      // O mês atual mistura o que já saiu com o que ainda vai sair.
      mes: m, previsto: m >= atual, atual: m === atual,
      entradas_recebidas: centavos(recebidas), entradas_a_receber: centavos(aReceber),
      saidas_fornecedores: centavos(fornecedores), saidas_diarias: centavos(diarias), saidas_a_pagar: centavos(aPagar),
      saldo, acumulado,
    }
  })
}
