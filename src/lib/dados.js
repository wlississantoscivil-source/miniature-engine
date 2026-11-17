// CAMADA DE DADOS — a única porta de entrada dos dados.
// Nenhuma tela lê o mock ou o Supabase direto: tudo passa por estas funções.
// Hoje lê dos dados de exemplo (USAR_MOCK). Na etapa do Supabase, só o miolo
// deste arquivo muda; as telas continuam chamando as mesmas funções.
//
// Regra de ouro: a permissão é conferida AQUI, não na tela. Quem não tem
// Financeiro na obra (o mestre, sempre) não recebe nenhum valor em R$.
import * as mock from './mockData.js'
import {
  acessoNaObra, calcularDiarias, contarLancamentos, dentro, estadoPresencaHoje, gastosPorCategoria, hoje,
  nfAtrasada, ordenarObras, plural, quinzenaDe, relatoriosDisponiveis, soma, somarAcessos, somarDias,
} from './regras.js'
import { completarCusto, religarEtapas } from './planilha.js'
import { fluxoMensal, orcadoPorEtapa } from './orcamento.js'

export const USAR_MOCK = true

const SEM_PERMISSAO = 'Você não tem liberação para isso nesta obra. Fale com o engenheiro.'
const ok = (data) => Promise.resolve({ data: structuredClone(data), erro: null })
const falha = (erro) => Promise.resolve({ data: null, erro })
const porId = (lista, id) => lista.find((x) => x.id === id)
const nomeDe = (id) => porId(mock.profiles, id)?.nome || '—'

// Congela o total das diárias pagas, como o banco faz no momento do pagamento.
for (const pd of mock.pagamentos_diarias) {
  if (pd.valor_total == null) {
    const linhas = calcularDiarias({
      funcionarios: mock.funcionarios.filter((f) => f.obra_id === pd.obra_id),
      presencas: mock.presencas, diarias: mock.diarias_funcionarios,
      periodo: { inicio: pd.quinzena_inicio, fim: pd.quinzena_fim },
    })
    pd.valor_total = soma(linhas, 'a_pagar')
  }
}

const acesso = (perfil, obraId) => acessoNaObra(perfil, mock.membros_obra, obraId)
const obrasVisiveis = (perfil) => mock.obras.filter((o) => acesso(perfil, o.id).ver)
const obrasComFinanceiro = (perfil) => mock.obras.filter((o) => acesso(perfil, o.id).financeiro)
const presencaLancadaEm = (obraId, data) => mock.presencas.some((p) => p.obra_id === obraId && p.data === data)

function valorDiariasNoPeriodo(obraId, periodo) {
  const linhas = calcularDiarias({
    funcionarios: mock.funcionarios.filter((f) => f.obra_id === obraId),
    presencas: mock.presencas.filter((p) => p.obra_id === obraId),
    diarias: mock.diarias_funcionarios, periodo,
  })
  return soma(linhas, 'a_pagar')
}

// ─── Sessão de exemplo (troca pelo login do Supabase depois) ────────────────
export const listarPerfisDeExemplo = () => ok(mock.profiles)

export function entrar(email) {
  const p = mock.profiles.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase())
  return p ? ok(p) : falha('Email ou senha incorretos.')
}

export function criarConta({ nome, email, whatsapp }) {
  if (mock.profiles.some((x) => x.email.toLowerCase() === email.toLowerCase())) return falha('Já existe uma conta com este email.')
  const p = { id: `u-${Date.now()}`, nome, email, whatsapp: whatsapp || '', role: 'Pendente', ativo: true }
  mock.profiles.push(p)
  return ok(p)
}

// ─── Obras ──────────────────────────────────────────────────────────────────
export function listarObrasPainel(perfil, agora = new Date()) {
  const dia = hoje()
  const lista = obrasVisiveis(perfil).map((o) => {
    const a = acesso(perfil, o.id)
    const emAndamento = o.status === 'Em andamento'
    const presenca = emAndamento ? estadoPresencaHoje(presencaLancadaEm(o.id, dia), agora.getHours()) : null
    const linha = { ...o, acesso: a, presenca_hoje: presenca }
    let pendente = presenca === 'atrasada'
    if (a.financeiro) {
      const compras = mock.compras.filter((c) => c.obra_id === o.id)
      const aguardando = compras.filter((c) => c.status === 'Aguardando NF')
      linha.aguardando_nf = contarLancamentos(aguardando)
      linha.nf_atrasada = aguardando.some((c) => nfAtrasada(c, dia))
      linha.a_pagar = soma(compras) - soma(mock.pagamentos.filter((p) => p.obra_id === o.id))
      linha.fechamentos_rascunho = mock.fechamentos.filter((f) => f.obra_id === o.id && f.status === 'Rascunho').length
      pendente = pendente || linha.nf_atrasada || linha.fechamentos_rascunho > 0
    }
    linha.tem_pendencia = pendente
    return linha
  })
  return ok(ordenarObras(lista))
}

export function avisosPainel(perfil) {
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  return ok({
    fechamentos_rascunho: mock.fechamentos.filter((f) => ids.includes(f.obra_id) && f.status === 'Rascunho').length,
    compras_aguardando: contarLancamentos(mock.compras.filter((c) => ids.includes(c.obra_id) && c.status === 'Aguardando NF')),
  })
}

// Para o seletor de obra do mestre e o cabeçalho da obra: sem nenhum valor.
export const listarMinhasObras = (perfil) =>
  ok(obrasVisiveis(perfil).filter((o) => o.status !== 'Concluída').map((o) => ({ id: o.id, nome: o.nome, tipo: o.tipo, orgao_contratante: o.orgao_contratante, status: o.status })))

export function obterObra(perfil, obraId) {
  const a = acesso(perfil, obraId)
  if (!a.ver) return falha(SEM_PERMISSAO)
  return ok({ ...porId(mock.obras, obraId), acesso: a })
}

// ─── Gastos (obra × categoria) ──────────────────────────────────────────────
export function gastosPorObra(perfil, periodo) {
  const linhas = obrasComFinanceiro(perfil).map((o) => {
    const compras = mock.compras.filter((c) => c.obra_id === o.id && (!periodo || dentro(c.data, periodo)))
    const diarias = valorDiariasNoPeriodo(o.id, periodo || { inicio: '1900-01-01', fim: '2999-12-31' })
    return { obra: { id: o.id, nome: o.nome }, ...gastosPorCategoria(compras, diarias) }
  })
  return ok(linhas.filter((l) => l.total > 0))
}

// ─── Resumo da obra ─────────────────────────────────────────────────────────
export function resumoObra(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const dia = hoje()
  const q = quinzenaDe(dia)
  const mes = { inicio: dia.slice(0, 8) + '01', fim: dia.slice(0, 8) + '31' }
  const compras = mock.compras.filter((c) => c.obra_id === obraId)
  const pags = mock.pagamentos.filter((p) => p.obra_id === obraId)
  const aguardando = compras.filter((c) => c.status === 'Aguardando NF')
  const presMes = mock.presencas.filter((p) => p.obra_id === obraId && dentro(p.data, mes) && p.situacao === 'Presente')

  const atividades = [
    ...compras.map((c) => ({ quando: c.created_at, texto: `${nomeDe(c.criado_por)} lançou compra: ${c.descricao}` })),
    ...mock.notas_fiscais.filter((n) => n.obra_id === obraId).map((n) => ({ quando: n.created_at, texto: `${nomeDe(n.criado_por)} anexou NF ${n.numero}` })),
    ...pags.map((p) => ({ quando: p.created_at, texto: `${nomeDe(p.criado_por)} registrou pagamento` })),
    ...ultimosLancamentosPresenca(obraId),
  ].sort((a, b) => (a.quando < b.quando ? 1 : -1)).slice(0, 5)

  return ok({
    comprado_quinzena: soma(compras.filter((c) => dentro(c.data, q))),
    aguardando_qtd: contarLancamentos(aguardando),
    aguardando_valor: soma(aguardando),
    a_pagar: soma(compras) - soma(pags),
    pago_mes: soma(pags.filter((p) => dentro(p.data, mes))),
    gastos: gastosPorCategoria(compras, valorDiariasNoPeriodo(obraId, { inicio: '1900-01-01', fim: '2999-12-31' })),
    homem_dia_mes: presMes.length,
    atividades,
  })
}

function ultimosLancamentosPresenca(obraId) {
  const porDia = new Map()
  for (const p of mock.presencas) if (p.obra_id === obraId && !porDia.has(p.data)) porDia.set(p.data, p)
  return [...porDia.values()].map((p) => ({ quando: p.created_at, texto: `${nomeDe(p.criado_por)} lançou presença` }))
}

// ─── Lista de compras ───────────────────────────────────────────────────────
const comFornecedor = (i) => ({ ...i, fornecedor: porId(mock.fornecedores, i.fornecedor_sugerido_id) || null })

export function listaComprasObra(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  return ok(mock.itens_lista_compra.filter((i) => i.obra_id === obraId).map(comFornecedor))
}

export function listaComprasGeral(perfil) {
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  return ok(mock.itens_lista_compra
    .filter((i) => ids.includes(i.obra_id) && i.status === 'A comprar')
    .map((i) => ({ ...comFornecedor(i), obra: { id: i.obra_id, nome: porId(mock.obras, i.obra_id).nome } })))
}

// ─── Fornecedores, extrato e fechamento ─────────────────────────────────────
// Quinzena de um pagamento: a do fechamento ligado; sem fechamento, a da data.
function quinzenaDoPagamento(p) {
  const f = p.fechamento_id && porId(mock.fechamentos, p.fechamento_id)
  return f ? { inicio: f.quinzena_inicio, fim: f.quinzena_fim } : quinzenaDe(p.data)
}

function totaisFornecedor(obraId, fornecedorId, q) {
  const compras = mock.compras.filter((c) => c.obra_id === obraId && c.fornecedor_id === fornecedorId && dentro(c.data, q))
  const pags = mock.pagamentos.filter((p) => p.obra_id === obraId && p.fornecedor_id === fornecedorId && quinzenaDoPagamento(p).inicio === q.inicio)
  const comprado = soma(compras)
  const semNF = soma(compras.filter((c) => c.status === 'Aguardando NF'))
  const pago = soma(pags)
  return { compras, pags, comprado, com_nf: comprado - semNF, sem_nf: semNF, pago, saldo: comprado - pago }
}

export function fornecedoresDaQuinzena(perfil, obraId, q) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const ids = new Set([
    ...mock.compras.filter((c) => c.obra_id === obraId && dentro(c.data, q)).map((c) => c.fornecedor_id),
    ...mock.pagamentos.filter((p) => p.obra_id === obraId && quinzenaDoPagamento(p).inicio === q.inicio).map((p) => p.fornecedor_id),
  ])
  return ok([...ids].map((fid) => {
    const t = totaisFornecedor(obraId, fid, q)
    const fech = mock.fechamentos.find((f) => f.obra_id === obraId && f.fornecedor_id === fid && f.quinzena_inicio === q.inicio)
    return { fornecedor: porId(mock.fornecedores, fid), comprado: t.comprado, com_nf: t.com_nf, sem_nf: t.sem_nf, pago: t.pago, saldo: t.saldo, fechamento: fech || null }
  }).sort((a, b) => a.fornecedor.nome.localeCompare(b.fornecedor.nome, 'pt-BR')))
}

export function extratoFornecedor(perfil, obraId, fornecedorId, q) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const t = totaisFornecedor(obraId, fornecedorId, q)
  const nfIds = new Set(t.compras.map((c) => c.nota_fiscal_id).filter(Boolean))
  return ok({
    fornecedor: porId(mock.fornecedores, fornecedorId),
    obra: porId(mock.obras, obraId),
    compras: t.compras.sort((a, b) => (a.data < b.data ? -1 : 1)),
    notas: mock.notas_fiscais.filter((n) => nfIds.has(n.id)),
    pagamentos: t.pags,
    pendentes_obra: mock.compras.filter((c) => c.obra_id === obraId && c.fornecedor_id === fornecedorId && c.status === 'Aguardando NF'),
    fechamento: mock.fechamentos.find((f) => f.obra_id === obraId && f.fornecedor_id === fornecedorId && f.quinzena_inicio === q.inicio) || null,
    totais: { comprado: t.comprado, com_nf: t.com_nf, sem_nf: t.sem_nf, pago: t.pago, saldo: t.saldo },
  })
}

export function obterFechamento(perfil, fechamentoId) {
  const f = porId(mock.fechamentos, fechamentoId)
  if (!f || !acesso(perfil, f.obra_id).financeiro) return falha(SEM_PERMISSAO)
  const q = { inicio: f.quinzena_inicio, fim: f.quinzena_fim }
  const t = totaisFornecedor(f.obra_id, f.fornecedor_id, q)
  return ok({
    ...f, fechado_por_nome: f.fechado_por ? nomeDe(f.fechado_por) : null,
    obra: porId(mock.obras, f.obra_id), fornecedor: porId(mock.fornecedores, f.fornecedor_id),
    compras: t.compras, pagamentos: t.pags,
    totais: { comprado: t.comprado, com_nf: t.com_nf, sem_nf: t.sem_nf, pago: t.pago, saldo: t.saldo },
  })
}

// ─── Notas fiscais ──────────────────────────────────────────────────────────
export function notasObra(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const forn = (id) => porId(mock.fornecedores, id)
  return ok({
    obra: porId(mock.obras, obraId),
    aguardando: mock.compras.filter((c) => c.obra_id === obraId && c.status === 'Aguardando NF').map((c) => ({ ...c, fornecedor: forn(c.fornecedor_id) })),
    notas: mock.notas_fiscais.filter((n) => n.obra_id === obraId).map((n) => ({
      ...n, fornecedor: forn(n.fornecedor_id),
      compras: mock.compras.filter((c) => c.nota_fiscal_id === n.id),
      pagamento: n.pagamento_id ? porId(mock.pagamentos, n.pagamento_id) : null,
    })),
  })
}

export function notasPendentesGeral(perfil) {
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  return ok(mock.compras
    .filter((c) => ids.includes(c.obra_id) && c.status === 'Aguardando NF')
    .map((c) => ({ ...c, fornecedor: porId(mock.fornecedores, c.fornecedor_id), obra: porId(mock.obras, c.obra_id) })))
}

// ─── Pagamentos ─────────────────────────────────────────────────────────────
export function pagamentosObra(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  return ok(mock.pagamentos
    .filter((p) => p.obra_id === obraId)
    .map((p) => ({
      ...p, fornecedor: porId(mock.fornecedores, p.fornecedor_id), quinzena: quinzenaDoPagamento(p),
      notas: mock.notas_fiscais.filter((n) => n.pagamento_id === p.id),
    }))
    .sort((a, b) => (a.data < b.data ? 1 : -1)))
}

// ─── Presença ───────────────────────────────────────────────────────────────
// Devolve funcionários SEM valor de diária: a diária mora em outra tabela.
export function presencaDoDia(perfil, obraId, data) {
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  const funcs = mock.funcionarios.filter((f) => f.obra_id === obraId && f.ativo)
    .map((f) => ({ id: f.id, nome: f.nome, funcao: f.funcao, vinculo: f.vinculo }))
  const doDia = mock.presencas.filter((p) => p.obra_id === obraId && p.data === data)
  const anteriores = mock.presencas.filter((p) => p.obra_id === obraId && p.data < data && p.data >= somarDias(data, -10))
  const diaAnterior = anteriores.reduce((m, p) => (p.data > m ? p.data : m), '')
  const primeiro = doDia[0]
  return ok({
    funcionarios: funcs,
    marcacoes: Object.fromEntries(doDia.map((p) => [p.funcionario_id, p.situacao])),
    anterior: Object.fromEntries(anteriores.filter((p) => p.data === diaAnterior).map((p) => [p.funcionario_id, p.situacao])),
    lancamento: primeiro ? { por: nomeDe(primeiro.criado_por), hora: primeiro.created_at.slice(11, 16) } : null,
  })
}

export function salvarPresenca(perfil, obraId, data, marcacoes) {
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  const agora = new Date()
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  for (const [funcionario_id, situacao] of Object.entries(marcacoes)) {
    const existente = mock.presencas.find((p) => p.funcionario_id === funcionario_id && p.data === data)
    if (existente) {
      existente.situacao = situacao
      existente.atualizado_por = perfil.id
    } else {
      mock.presencas.push({ id: `pr-${funcionario_id}-${data}`, obra_id: obraId, funcionario_id, data, situacao, criado_por: perfil.id, created_at: `${data}T${hora}:00` })
    }
  }
  return ok({ salvo: true })
}

// ─── Diárias da quinzena (nunca para o mestre) ──────────────────────────────
export function diariasQuinzena(perfil, obraId, q) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const linhas = calcularDiarias({
    funcionarios: mock.funcionarios.filter((f) => f.obra_id === obraId),
    presencas: mock.presencas.filter((p) => p.obra_id === obraId),
    diarias: mock.diarias_funcionarios, periodo: q,
  })
  const semDiaria = mock.funcionarios.filter((f) => f.obra_id === obraId && f.vinculo === 'Diarista' && f.ativo &&
    !mock.diarias_funcionarios.some((d) => d.funcionario_id === f.id)).length
  return ok({
    linhas,
    total: soma(linhas, 'a_pagar'),
    sem_diaria: semDiaria,
    pagamento: mock.pagamentos_diarias.find((p) => p.obra_id === obraId && p.quinzena_inicio === q.inicio) || null,
  })
}

// ─── Equipe da obra (só engenheiro) ─────────────────────────────────────────
export function equipeObra(perfil, obraId) {
  if (!acesso(perfil, obraId).engenheiro) return falha(SEM_PERMISSAO)
  const dia = hoje()
  return ok({
    funcionarios: mock.funcionarios.filter((f) => f.obra_id === obraId).map((f) => {
      const vigente = mock.diarias_funcionarios.filter((d) => d.funcionario_id === f.id && d.vigente_desde <= dia)
        .sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1))[0]
      return { ...f, diaria: vigente ? vigente.valor : null, diaria_desde: vigente ? vigente.vigente_desde : null }
    }),
    acessos: mock.membros_obra.filter((m) => m.obra_id === obraId).map((m) => ({ ...m, pessoa: porId(mock.profiles, m.profile_id) })),
  })
}

// ─── Cadastro geral de fornecedores ─────────────────────────────────────────
export function listarFornecedores(perfil) {
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  if (!ids.length) return falha(SEM_PERMISSAO)
  return ok(mock.fornecedores.map((f) => {
    const compras = mock.compras.filter((c) => c.fornecedor_id === f.id && ids.includes(c.obra_id))
    return { ...f, obras: new Set(compras.map((c) => c.obra_id)).size, aguardando_nf: soma(compras.filter((c) => c.status === 'Aguardando NF')) }
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
}

// ─── Usuários (só engenheiro) ───────────────────────────────────────────────
export function listarUsuarios(perfil) {
  if (perfil?.role !== 'Engenheiro') return falha(SEM_PERMISSAO)
  return ok(mock.profiles.map((p) => ({
    ...p, obras: mock.membros_obra.filter((m) => m.profile_id === p.id).map((m) => porId(mock.obras, m.obra_id).nome),
  })))
}

// ─── Planilha da licitação ──────────────────────────────────────────────────
// Ver: Financeiro ou Medição na obra. Importar: só o engenheiro, e só sem medição.
const temMedicao = (obraId) => mock.medicoes.some((m) => m.obra_id === obraId)

export function obterPlanilha(perfil, obraId) {
  const a = acesso(perfil, obraId)
  if (!a.financeiro && !a.medicao) return falha(SEM_PERMISSAO)
  const pl = mock.planilhas_obra.find((p) => p.obra_id === obraId) || null
  const etapas = mock.etapas_obra.filter((e) => e.obra_id === obraId).sort((x, y) => x.ordem - y.ordem)
  const itens = mock.itens_contrato.filter((i) => i.obra_id === obraId).sort((x, y) => x.ordem - y.ordem)
  return ok({
    planilha: pl ? { ...pl, importada_por_nome: pl.importada_por ? nomeDe(pl.importada_por) : null } : null,
    etapas, itens,
    resumo: {
      etapas: etapas.length, itens: itens.length, zerados: itens.filter((i) => Number(i.quantidade) === 0).length,
      total: soma(itens.map((i) => ({ valor: i.quantidade * i.preco_unitario }))),
      sem_bdi: soma(itens.map((i) => ({ valor: i.quantidade * i.custo_unitario }))),
    },
    tem_medicao: temMedicao(obraId),
    pode_importar: a.engenheiro && !temMedicao(obraId),
  })
}

// `leitura` é o resultado de lerPlanilha (lib/planilha.js), já conferido na prévia.
export function importarPlanilha(perfil, obraId, { leitura, bdi_percentual, arquivo_nome }) {
  if (!acesso(perfil, obraId).engenheiro) return falha(SEM_PERMISSAO)
  if (temMedicao(obraId)) return falha('A obra já tem medição: a planilha não pode mais ser trocada.')
  if (!leitura?.itens?.length) return falha('A planilha não tem nenhum item para importar.')
  const sufixo = Date.now().toString(36)
  const etapasAntigas = mock.etapas_obra.filter((e) => e.obra_id === obraId)
  const etapasNovas = leitura.etapas.map((e, k) => ({
    id: `et-${sufixo}-${k}`, obra_id: obraId, numero: e.numero, nome: e.nome, nivel: e.nivel, etapa_pai_id: null, ordem: e.ordem,
  }))
  const idPorNumero = new Map(etapasNovas.map((e) => [e.numero, e.id]))
  for (const e of etapasNovas) {
    const pai = leitura.etapas.find((x) => x.numero === e.numero)?.numero_pai
    e.etapa_pai_id = pai ? idPorNumero.get(pai) || null : null
  }
  const itensNovos = completarCusto(leitura.itens, bdi_percentual).map((i, k) => ({
    id: `ic-${sufixo}-${k}`, obra_id: obraId, etapa_id: idPorNumero.get(i.etapa_numero), item: i.item, codigo: i.codigo,
    banco: i.banco, descricao: i.descricao, unidade: i.unidade, quantidade: i.quantidade,
    preco_unitario: i.preco_unitario, custo_unitario: i.custo_unitario, ordem: i.ordem,
  }))
  // Compras voltam para a etapa de mesmo número; sem par, Administração.
  const comprasObra = mock.compras.filter((c) => c.obra_id === obraId)
  const { compras: religadas, semPar } = religarEtapas(comprasObra, etapasAntigas, etapasNovas)
  for (const c of religadas) porId(mock.compras, c.id).etapa_id = c.etapa_id

  const trocar = (lista, novos) => {
    for (let k = lista.length - 1; k >= 0; k--) if (lista[k].obra_id === obraId) lista.splice(k, 1)
    lista.push(...novos)
  }
  trocar(mock.etapas_obra, etapasNovas)
  trocar(mock.itens_contrato, itensNovos)
  trocar(mock.planilhas_obra, [{
    id: `pl-${sufixo}`, obra_id: obraId, bdi_percentual: Number(bdi_percentual) || 0,
    objeto: leitura.info?.objeto || null, referencia_precos: leitura.info?.referencia_precos || null,
    total_geral_planilha: leitura.totaisPlanilha?.geral ?? null, total_sem_bdi_planilha: leitura.totaisPlanilha?.sem_bdi ?? null,
    arquivo_nome: arquivo_nome || null, importada_em: new Date().toISOString().slice(0, 19), importada_por: perfil.id,
  }])
  return ok({ etapas: etapasNovas.length, itens: itensNovos.length, compras_sem_etapa: semPar })
}

// ─── Orçado x Realizado ─────────────────────────────────────────────────────
const TUDO = { inicio: '1900-01-01', fim: '2999-12-31' }

export function orcadoRealizado(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const compras = mock.compras.filter((c) => c.obra_id === obraId)
  const diarias = valorDiariasNoPeriodo(obraId, TUDO)
  const etapas = mock.etapas_obra.filter((e) => e.obra_id === obraId)
  if (!etapas.length) return ok({ sem_planilha: true, gastos: gastosPorCategoria(compras, diarias) })
  return ok({
    sem_planilha: false,
    ...orcadoPorEtapa({ etapas, itens: mock.itens_contrato.filter((i) => i.obra_id === obraId), compras, valorDiarias: diarias }),
  })
}

// ─── Fluxo de caixa (fase 1: só saídas; entradas chegam com a Medição) ──────
export function fluxoCaixa(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const obra = porId(mock.obras, obraId)
  const dia = hoje()
  const compras = mock.compras.filter((c) => c.obra_id === obraId)
  const pags = mock.pagamentos.filter((p) => p.obra_id === obraId)
  // Diárias em aberto: cada quinzena com presença e sem pagamento registrado.
  const presencasObra = mock.presencas.filter((p) => p.obra_id === obraId)
  const diariasEmAberto = []
  if (presencasObra.length) {
    const primeira = presencasObra.reduce((m, p) => (p.data < m ? p.data : m), dia)
    for (let q = quinzenaDe(primeira); q.inicio <= dia; q = quinzenaDe(somarDias(q.fim, 1))) {
      if (mock.pagamentos_diarias.some((p) => p.obra_id === obraId && p.quinzena_inicio === q.inicio)) continue
      const valor = valorDiariasNoPeriodo(obraId, q)
      if (valor > 0) diariasEmAberto.push({ fim: q.fim, valor })
    }
  }
  return ok({
    entradas_disponiveis: false, // vira true com a Medição (fase 3)
    meses: fluxoMensal({
      inicio: obra.data_inicio, hojeIso: dia,
      pagamentos: pags,
      pagamentosDiarias: mock.pagamentos_diarias.filter((p) => p.obra_id === obraId),
      aPagarFornecedores: Math.max(0, soma(compras) - soma(pags)),
      diariasEmAberto,
    }),
  })
}

// ─── Pendências de cada módulo da obra (para a grade de módulos) ────────────
// Só devolve os módulos que a pessoa pode abrir. tom: ok | at | cr | ''
export function pendenciasObra(perfil, obraId, agora = new Date()) {
  const a = acesso(perfil, obraId)
  if (!a.ver) return falha(SEM_PERMISSAO)
  const dia = hoje()
  const obra = porId(mock.obras, obraId)
  const p = {}
  if (a.financeiro) {
    const compras = mock.compras.filter((c) => c.obra_id === obraId)
    const aguardando = compras.filter((c) => c.status === 'Aguardando NF')
    const itens = mock.itens_lista_compra.filter((i) => i.obra_id === obraId && i.status === 'A comprar')
    const itensAtrasados = itens.filter((i) => i.para_quando && i.para_quando < dia).length
    const rascunhos = mock.fechamentos.filter((f) => f.obra_id === obraId && f.status === 'Rascunho').length
    const pagsObra = mock.pagamentos.filter((pg) => pg.obra_id === obraId)
    const semNota = pagsObra.filter((pg) => !mock.notas_fiscais.some((n) => n.pagamento_id === pg.id)).length
    const nAg = contarLancamentos(aguardando)
    p.resumo = { texto: 'Números da obra', tom: '' }
    const etapas = mock.etapas_obra.filter((e) => e.obra_id === obraId)
    if (!etapas.length) p.orcado = { texto: 'Sem planilha', tom: '' }
    else {
      const oxr = orcadoPorEtapa({ etapas, itens: mock.itens_contrato.filter((i) => i.obra_id === obraId), compras, valorDiarias: 0 })
      p.orcado = oxr.estouradas
        ? { texto: plural(oxr.estouradas, 'etapa estourada', 'etapas estouradas'), tom: 'cr' }
        : { texto: 'Dentro do orçado', tom: 'ok' }
    }
    p.fluxo = { texto: 'Saídas mês a mês', tom: '' }
    p.lista = itens.length
      ? { texto: `${itens.length} para comprar${itensAtrasados ? ` · ${plural(itensAtrasados, 'atrasado', 'atrasados')}` : ''}`, tom: itensAtrasados ? 'cr' : 'at' }
      : { texto: 'Nada para comprar', tom: 'ok' }
    p.fornecedores = rascunhos
      ? { texto: `${rascunhos} ${rascunhos === 1 ? 'fechamento' : 'fechamentos'} para revisar`, tom: 'at' }
      : { texto: 'Fechamentos em dia', tom: 'ok' }
    p.notas = nAg
      ? { texto: `${nAg} aguardando NF`, tom: aguardando.some((c) => nfAtrasada(c, dia)) ? 'cr' : 'at' }
      : { texto: 'Nenhuma NF pendente', tom: 'ok' }
    p.pagamentos = !pagsObra.length ? { texto: 'Nenhum pagamento ainda', tom: '' }
      : semNota ? { texto: `${semNota} sem nota`, tom: 'cr' } : { texto: 'Todos com nota', tom: 'ok' }
  }
  if (a.presenca) {
    if (obra.status !== 'Em andamento') p.presenca = { texto: `Obra ${obra.status.toLowerCase()}`, tom: '' }
    else {
      const est = estadoPresencaHoje(presencaLancadaEm(obraId, dia), agora.getHours())
      p.presenca = est === 'lancada' ? { texto: 'Lançada hoje', tom: 'ok' } : { texto: 'Presença não lançada', tom: est === 'atrasada' ? 'cr' : 'at' }
    }
  }
  if (a.engenheiro) {
    const semDiaria = mock.funcionarios.filter((f) => f.obra_id === obraId && f.vinculo === 'Diarista' && f.ativo &&
      !mock.diarias_funcionarios.some((d) => d.funcionario_id === f.id)).length
    p.equipe = semDiaria ? { texto: plural(semDiaria, 'diarista sem diária', 'diaristas sem diária'), tom: 'at' } : { texto: 'Funcionários e acessos', tom: '' }
  }
  return ok(p)
}

export function fechamentosObra(perfil, obraId) {
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  return ok(mock.fechamentos.filter((f) => f.obra_id === obraId)
    .map((f) => ({ ...f, fornecedor: porId(mock.fornecedores, f.fornecedor_id), total: soma(totaisFornecedor(obraId, f.fornecedor_id, { inicio: f.quinzena_inicio, fim: f.quinzena_fim }).compras) }))
    .sort((a, b) => (a.quinzena_inicio < b.quinzena_inicio ? 1 : -1)))
}

// ─── Relatórios ─────────────────────────────────────────────────────────────
// Obras que aparecem no seletor: as que têm Financeiro ou Presença liberados.
export function obrasDosRelatorios(perfil) {
  if (perfil?.role === 'Mestre') return ok([])
  return ok(obrasVisiveis(perfil)
    .filter((o) => { const a = acesso(perfil, o.id); return a.financeiro || a.presenca || a.medicao })
    .map((o) => ({ id: o.id, nome: o.nome })))
}

// obraId vazio = "Todas as obras". O mestre não tem relatório nenhum.
export function relatoriosPara(perfil, obraId) {
  if (!perfil || perfil.role === 'Mestre' || perfil.role === 'Pendente') return ok([])
  const ac = obraId ? acesso(perfil, obraId) : somarAcessos(obrasVisiveis(perfil).map((o) => acesso(perfil, o.id)))
  return ok(relatoriosDisponiveis(ac))
}

// Para o menu: a pessoa tem Financeiro em alguma obra?
export const temFinanceiro = (perfil) => obrasComFinanceiro(perfil).length > 0
