// Medições de empreiteiros: o contrato de cada empreiteiro na obra, o fluxo
// dele (Em elaboração → Enviado p/ aprovação → Aprovado / ativo → Concluído),
// o valor (global ou por escopo) e quanto já foi medido.
// Regra pura: sem React, sem banco. É o que os testes conferem.
import { numero } from './planilha.js'
import { quinzenaDe } from './regras.js'

export const STATUS_CONTRATO = ['Em elaboração', 'Enviado p/ aprovação', 'Aprovado / ativo', 'Concluído']
export const [ELABORACAO, ENVIADO, ATIVO, CONCLUIDO] = STATUS_CONTRATO
export const TIPOS_CONTRATO = ['Global', 'Por escopo']
export const [GLOBAL, POR_ESCOPO] = TIPOS_CONTRATO
export const UNIDADES_EMPREITEIRO = ['m²', 'm', 'un', 'vb']

// Centavos como o round() do banco: 1,005 → 1,01. O toPrecision tira o lixo do
// ponto flutuante (1,005 × 100 = 100,49999…) antes de arredondar.
const centavos = (v) => Math.round(Number((v * 100).toPrecision(12))) / 100
// Quantidade medida: 4 casas, como o banco guardaria (numeric(14,4)).
const quatroCasas = (v) => Math.round(v * 10000) / 10000
// Folga para comparar quantidades com casas decimais (0,0001 é o que o banco guardaria).
const FOLGA = 0.00005

const totalItem = (i) => centavos(Number(i.quantidade) * Number(i.preco_unitario))
export const totalEscopo = (itens) => centavos(itens.reduce((t, i) => t + totalItem(i), 0))

// Quanto de cada item já foi medido, somando todos os boletins do contrato.
export function acumuladoPorItem(boletins, boletimItens) {
  const ids = new Set(boletins.map((b) => b.id))
  const acc = {}
  for (const l of boletimItens) if (ids.has(l.boletim_id)) acc[l.item_id] = (acc[l.item_id] || 0) + Number(l.quantidade)
  return acc
}

// Resumo do contrato: valor total, medido (R$ e %), saldo e se fechou 100%.
// O medido é a soma dos boletins (o mesmo R$ que vai para o "a pagar"); no Por
// escopo, "fechou 100%" é pelas quantidades de cada item.
// Contrato sem valor cadastrado (ainda em elaboração) devolve tudo nulo.
export function resumoContrato(contrato, itens, boletins, boletimItens) {
  const doContrato = boletins.filter((b) => b.contrato_id === contrato.id)
  const vazio = { valor_total: null, medido: 0, percentual: 0, saldo: null, completo: false, n_boletins: doContrato.length }
  const medido = centavos(doContrato.reduce((t, b) => t + Number(b.valor || 0), 0))
  if (contrato.tipo === GLOBAL) {
    const valor = Number(contrato.valor_global)
    return { ...vazio, valor_total: valor, medido, percentual: valor ? (medido / valor) * 100 : 0, saldo: centavos(valor - medido), completo: medido >= valor - 0.005 }
  }
  if (contrato.tipo === POR_ESCOPO) {
    const meus = itens.filter((i) => i.contrato_id === contrato.id)
    if (!meus.length) return vazio
    const acc = acumuladoPorItem(doContrato, boletimItens)
    const valor = totalEscopo(meus)
    const completo = meus.every((i) => (acc[i.id] || 0) >= Number(i.quantidade) - FOLGA)
    return { ...vazio, valor_total: valor, medido, percentual: valor ? (medido / valor) * 100 : 0, saldo: centavos(valor - medido), completo }
  }
  return vazio
}

// "58,7%" — uma casa, sem passar de 100 por arredondamento quando ainda falta.
export function textoPercentual(p, completo) {
  const v = completo ? 100 : Math.min(Math.floor(p * 10) / 10, 99.9)
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`
}

// A ficha abre para contrato ativo ou concluído; só o ativo, sem 100%, recebe medição.
export const temFicha = (c) => c.status === ATIVO || c.status === CONCLUIDO
export const podeMedir = (c) => c.status === ATIVO && !c.completo
// Boletim não pago com a data de pagar já passada.
export const boletimAtrasado = (b, dia) => !b.pago && b.pagar_em < dia

// ─── Mover no fluxo ─────────────────────────────────────────────────────────
// Devolve o motivo de recusa, ou null. Ir para "Aprovado / ativo" vindo de
// "Enviado" não passa por aqui: exige o cadastro do valor (ativarContrato).
export function erroMover(contrato, destino, resumo) {
  const de = STATUS_CONTRATO.indexOf(contrato.status)
  const para = STATUS_CONTRATO.indexOf(destino)
  if (para < 0) return 'Coluna desconhecida.'
  if (Math.abs(para - de) !== 1) return 'O contrato anda uma coluna por vez.'
  if (destino === ATIVO && de < para) return 'Cadastre o valor do contrato para ativar.'
  if (destino === CONCLUIDO && !resumo.completo) {
    return `Só dá para concluir com 100% medido. Este contrato está com ${textoPercentual(resumo.percentual, false)}.`
  }
  if (contrato.status === ATIVO && destino === ENVIADO && resumo.n_boletins > 0) {
    return 'Este contrato já tem medição lançada: não volta para aprovação.'
  }
  return null
}

// ─── Formulários ────────────────────────────────────────────────────────────
export function errosContrato({ empreiteiro, descricao }) {
  const e = {}
  if (!String(empreiteiro || '').trim()) e.empreiteiro = 'Diga quem é o empreiteiro.'
  if (!String(descricao || '').trim()) e.descricao = 'Descreva o serviço contratado.'
  return e
}

const positivo = (txt, vazio, ruim) => {
  const n = numero(txt)
  if (n == null) return { erro: vazio }
  if (!Number.isFinite(n) || n <= 0) return { erro: ruim }
  return { n }
}

// Cadastro do valor. Recebe o formulário com textos ("1.234,56") e devolve
// { erros, dados }. Chaves dos erros das linhas: "i0.quantidade", "i2.descricao"…
export function lerValorContrato({ tipo, valor_global, itens = [] }) {
  const erros = {}
  if (!TIPOS_CONTRATO.includes(tipo)) return { erros: { tipo: 'Escolha Global ou Por escopo.' }, dados: null }
  if (tipo === GLOBAL) {
    const v = positivo(valor_global, 'Digite o valor total do contrato.', 'O valor precisa ser um número maior que zero.')
    if (v.erro) erros.valor_global = v.erro
    return { erros, dados: v.erro ? null : { tipo, valor_global: centavos(v.n), itens: [] } }
  }
  if (!itens.length) erros.itens = 'Adicione pelo menos um item.'
  const lidos = itens.map((i, k) => {
    if (!String(i.descricao || '').trim()) erros[`i${k}.descricao`] = 'Descreva o item.'
    if (!UNIDADES_EMPREITEIRO.includes(i.unidade)) erros[`i${k}.unidade`] = 'Escolha a unidade.'
    const q = positivo(i.quantidade, 'Digite a quantidade.', 'Quantidade maior que zero.')
    const p = positivo(i.preco_unitario, 'Digite o preço unitário.', 'Preço maior que zero.')
    if (q.erro) erros[`i${k}.quantidade`] = q.erro
    if (p.erro) erros[`i${k}.preco_unitario`] = p.erro
    return { descricao: String(i.descricao || '').trim(), unidade: i.unidade, quantidade: q.n, preco_unitario: p.n == null ? null : centavos(p.n) }
  })
  return { erros, dados: Object.keys(erros).length ? null : { tipo, valor_global: null, itens: lidos } }
}

// Total que a tela mostra enquanto a pessoa digita (linhas incompletas contam 0).
export function totalDoFormulario({ tipo, valor_global, itens = [] }) {
  if (tipo === GLOBAL) {
    const n = numero(valor_global)
    return Number.isFinite(n) && n > 0 ? centavos(n) : 0
  }
  return totalEscopo(itens.map((i) => {
    const q = numero(i.quantidade)
    const p = numero(i.preco_unitario)
    return { quantidade: Number.isFinite(q) ? q : 0, preco_unitario: Number.isFinite(p) ? p : 0 }
  }))
}

// ─── Boletim de medição (Ficha de Medição) ──────────────────────────────────
// Boletins numerados por contrato (nº 1, nº 2…). No Global a pessoa digita o %
// OU o R$; no Por escopo, em cada item, a quantidade OU o % OU o R$. A FONTE DA
// VERDADE do escopo é a QUANTIDADE: o que for digitado vira quantidade (4 casas)
// e o % e o R$ saem dela, para não acumular erro de arredondamento.
// Cada campo digitado chega como { campo, texto }.

export const proximoNumero = (boletins) => boletins.reduce((m, b) => Math.max(m, b.numero), 0) + 1

// O boletim vai para o "a pagar" junto com o fechamento: fim da quinzena da medição.
export const pagarEmPadrao = (data) => quinzenaDe(data).fim

const lido = (texto) => {
  const n = numero(texto)
  return n == null ? null : Number.isFinite(n) && n >= 0 ? n : NaN
}
const pct = (parte, todo) => (todo ? (parte / todo) * 100 : 0)
const fmtQtd = (q) => q.toLocaleString('pt-BR', { maximumFractionDigits: 4 })

// Uma linha do escopo: devolve quantidade, % e R$ desta medição e o novo acumulado.
export function calcularLinha(item, acumuladoAntes, entrada) {
  const contratada = Number(item.quantidade)
  const preco = Number(item.preco_unitario)
  const n = entrada ? lido(entrada.texto) : null
  let erro = null
  let q = 0
  if (Number.isNaN(n)) erro = 'Digite um número.'
  else if (n != null) {
    if (entrada.campo === 'quantidade') q = n
    else if (entrada.campo === 'percentual') q = (contratada * n) / 100
    else q = preco ? n / preco : 0
    q = quatroCasas(q)
  }
  const saldo = quatroCasas(contratada - acumuladoAntes)
  if (!erro && q > saldo + FOLGA) {
    erro = `Passa de 100% do item: o saldo a medir é ${fmtQtd(Math.max(saldo, 0))} ${item.unidade}.`
  }
  const acumulado = acumuladoAntes + q
  return {
    item_id: item.id, quantidade: q, percentual: pct(q, contratada), valor: centavos(q * preco),
    percentual_anterior: pct(acumuladoAntes, contratada),
    acumulado, percentual_acumulado: pct(acumulado, contratada), completo: acumulado >= contratada - FOLGA, saldo, erro,
  }
}

// O boletim inteiro, recalculado a cada tecla.
// form: { data, pagar_em, global: {campo,texto}, linhas: { [item_id]: {campo,texto} } }
// resumo: o de resumoContrato; acumulados: acumuladoPorItem do contrato.
export function calcularBoletim(contrato, itens, resumo, acumulados, form) {
  const erros = {}
  if (!form.data) erros.data = 'Diga a data da medição.'
  if (!form.pagar_em) erros.pagar_em = 'Diga quando este boletim deve ser pago.'
  let linhas = []
  let total = 0
  if (contrato.tipo === GLOBAL) {
    const g = form.global
    const n = g ? lido(g.texto) : null
    if (Number.isNaN(n)) erros.global = 'Digite um número.'
    else if (n != null) total = centavos(g.campo === 'percentual' ? (resumo.valor_total * n) / 100 : n)
    if (!erros.global && total > resumo.saldo + 0.005) {
      erros.global = `Passa de 100% do contrato: o saldo a medir é ${resumo.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
    }
  } else {
    linhas = itens.map((i) => calcularLinha(i, acumulados[i.id] || 0, form.linhas?.[i.id]))
    linhas.forEach((l) => { if (l.erro) erros[`l.${l.item_id}`] = l.erro })
    total = centavos(linhas.reduce((t, l) => t + l.valor, 0))
  }
  if (!Object.keys(erros).some((k) => k === 'global' || k.startsWith('l.')) && total <= 0) {
    erros.total = 'Digite o que foi executado nesta medição.'
  }
  const novoAcumulado = centavos(resumo.medido + total)
  // Fecha 100%? No Global pelo R$; no Por escopo, todo item com a quantidade inteira.
  const novoCompleto = contrato.tipo === GLOBAL ? novoAcumulado >= resumo.valor_total - 0.005 : linhas.length > 0 && linhas.every((l) => l.completo)
  return {
    linhas, total, percentual: pct(total, resumo.valor_total),
    novo_acumulado: novoAcumulado, novo_percentual: pct(novoAcumulado, resumo.valor_total),
    novo_saldo: centavos(resumo.valor_total - novoAcumulado), novo_completo: novoCompleto, erros,
  }
}

// Boletim pago ou não: o que entra no "a pagar" da obra, na data programada.
export const boletinsAPagar = (boletins) => boletins.filter((b) => !b.pago).map((b) => ({ pagar_em: b.pagar_em, valor: Number(b.valor) }))
