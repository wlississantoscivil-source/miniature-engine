// CAMADA DE DADOS — a única porta de entrada dos dados.
// Nenhuma tela lê o mock ou o Supabase direto: tudo passa por estas funções.
// No navegador lê do Supabase (USAR_MOCK = false); fora dele (os testes do
// `npm run check`, que rodam no Node) lê dos dados de exemplo de mockData.js.
// As contas e as permissões abaixo são as MESMAS nos dois casos: o banco só
// troca de onde vêm as listas (`db`).
//
// Regra de ouro: a permissão é conferida AQUI, não na tela. Quem não tem
// Financeiro na obra (o mestre, sempre) não recebe nenhum valor em R$.
// ⚠ Até o passo 10 (login), o banco está aberto (modo desenvolvimento): a
// carga traz todas as linhas e esta camada é a única tranca. Com a RLS de
// verdade, cada pessoa só recebe do banco as linhas que pode ver.
import * as exemplo from './mockData.js'
import {
  acessoNaObra, calcularDiarias, contarLancamentos, dentro, DIARIO_REPETIDO, diarioPendente, errosDiario, estadoPresencaHoje, gastosPorCategoria, hoje,
  momentoLocal, nfAtrasada, ordenarObras, plural, quinzenaDe, relatoriosDisponiveis, soma, somarAcessos, somarDias,
} from './regras.js'
import { completarCusto, religarEtapas, totaisItens } from './planilha.js'
import { fluxoMensal, orcadoPorEtapa } from './orcamento.js'
import {
  CALENDARIO_PADRAO, erroCausa, erroDesarquivar, erroProgresso, errosAtividade, errosRestricao, erroSubtarefa, montarEap, novoPrazo, podeEditarEap,
  progressoPeloStatus, proximaOrdem, semanaDe, STATUS_ATIVIDADE, statusPeloProgresso, trocarOrdem,
} from './planejamento.js'

export const USAR_MOCK = false
// import.meta.env só existe dentro do Vite (o app). No Node (testes) fica no mock.
const COM_BANCO = !USAR_MOCK && !!import.meta.env

const SEM_PERMISSAO = 'Você não tem liberação para isso nesta obra. Fale com o engenheiro.'
const SEM_CONEXAO = 'Não consegui falar com o banco. Confira a internet e tente de novo.'
const ok = (data) => Promise.resolve({ data: structuredClone(data), erro: null })
const falha = (erro) => Promise.resolve({ data: null, erro })
const porId = (lista, id) => lista.find((x) => x.id === id)
const nomeDe = (id) => porId(db.profiles, id)?.nome || '—'

// ─── Carga do banco ─────────────────────────────────────────────────────────
// Lê as tabelas inteiras e guarda por 15 s (ou até a próxima gravação).
// Lê de 1.000 em 1.000: o Supabase corta em 1.000 linhas sem avisar.
const TABELAS = [
  'profiles', 'obras', 'membros_obra', 'fornecedores', 'planilhas_obra', 'etapas_obra', 'itens_contrato',
  'medicoes', 'fechamentos', 'pagamentos', 'notas_fiscais', 'compras', 'itens_lista_compra',
  'funcionarios', 'presencas', 'diarias_funcionarios', 'pagamentos_diarias', 'diarios_obra', 'fotos',
]
// Colunas com fuso (timestamptz): viram o horário local 'AAAA-MM-DDTHH:MM:SS'.
// Colunas `date` chegam como 'AAAA-MM-DD' e ficam como estão (sem UTC).
const MOMENTOS = ['created_at', 'updated_at', 'fechado_em', 'importada_em', 'aprovado_em']
const VALIDADE_MS = 15000

let db = COM_BANCO ? Object.fromEntries(TABELAS.map((t) => [t, []])) : exemplo
let carga = null
let conexao = null

async function banco() {
  if (!conexao) conexao = (await import('./supabase.js')).supabase
  return conexao
}

async function lerTabela(supabase, tabela) {
  const linhas = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select('*').order('id').range(de, de + 999)
    if (error) throw Object.assign(error, { tabela })
    linhas.push(...data)
    if (data.length < 1000) break
  }
  for (const l of linhas) for (const c of MOMENTOS) if (l[c]) l[c] = momentoLocal(new Date(l[c]))
  return linhas
}

async function carregar() {
  const supabase = await banco()
  const listas = await Promise.all(TABELAS.map((t) => lerTabela(supabase, t)))
  return Object.fromEntries(TABELAS.map((t, k) => [t, listas[k]]))
}

// Garante `db` atualizado. Devolve null, ou o { erro } para a tela mostrar.
async function pronto() {
  if (!COM_BANCO) return null
  if (!carga || Date.now() - carga.quando > VALIDADE_MS) carga = { quando: Date.now(), promessa: carregar() }
  try {
    db = await carga.promessa
    return null
  } catch (e) {
    carga = null
    // Sem código = a rede caiu. Com código = o banco recusou (ex.: 42501, GRANT faltando).
    return { data: null, erro: erroDoBanco(e, `leitura do banco${e.tabela ? ` (${e.tabela})` : ''}`) }
  }
}
const esquecerCarga = () => { carga = null }

// Erro do Supabase → frase para a tela (nunca recusa calada).
function erroDoBanco(error, contexto) {
  console.error(`Minha Obra — ${contexto}:`, error)
  if (!error.code) return SEM_CONEXAO
  if (error.code === '23505') return 'Isso já existe (registro repetido).'
  if (error.code === '23503') return 'Falta um cadastro ligado a isto (pessoa ou obra). Recarregue a página e tente de novo.'
  if (error.code === '23514') return 'O banco recusou um valor fora da lista permitida.'
  if (error.code === '42501') return 'O banco recusou: sem liberação para esta tabela.'
  return error.message || 'O banco recusou o pedido.'
}

// Congela o total das diárias pagas do mock, como o banco faz no momento do pagamento.
for (const pd of exemplo.pagamentos_diarias) {
  if (pd.valor_total == null) {
    const linhas = calcularDiarias({
      funcionarios: exemplo.funcionarios.filter((f) => f.obra_id === pd.obra_id),
      presencas: exemplo.presencas, diarias: exemplo.diarias_funcionarios,
      periodo: { inicio: pd.quinzena_inicio, fim: pd.quinzena_fim },
    })
    pd.valor_total = soma(linhas, 'a_pagar')
  }
}

const acesso = (perfil, obraId) => acessoNaObra(perfil, db.membros_obra, obraId)
const obrasVisiveis = (perfil) => db.obras.filter((o) => acesso(perfil, o.id).ver)
const obrasComFinanceiro = (perfil) => db.obras.filter((o) => acesso(perfil, o.id).financeiro)
const presencaLancadaEm = (obraId, data) => db.presencas.some((p) => p.obra_id === obraId && p.data === data)

function valorDiariasNoPeriodo(obraId, periodo) {
  const linhas = calcularDiarias({
    funcionarios: db.funcionarios.filter((f) => f.obra_id === obraId),
    presencas: db.presencas.filter((p) => p.obra_id === obraId),
    diarias: db.diarias_funcionarios, periodo,
  })
  return soma(linhas, 'a_pagar')
}

// ─── Sessão de exemplo (troca pelo login do Supabase no passo 10) ───────────
export async function listarPerfisDeExemplo() {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  return ok(db.profiles)
}

export async function entrar(email) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const p = db.profiles.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase())
  return p ? ok(p) : falha('Email ou senha incorretos.')
}

export async function criarConta({ nome, email, whatsapp }) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (db.profiles.some((x) => x.email.toLowerCase() === email.toLowerCase())) return falha('Já existe uma conta com este email.')
  const p = { nome, email, whatsapp: whatsapp || '', role: 'Pendente', ativo: true }
  if (COM_BANCO) {
    const { data, error } = await (await banco()).from('profiles').insert(p).select().single()
    if (error) return falha(error.code === '23505' ? 'Já existe uma conta com este email.' : erroDoBanco(error, 'criar conta'))
    esquecerCarga()
    return ok(data)
  }
  p.id = `u-${Date.now()}`
  db.profiles.push(p)
  return ok(p)
}

// ─── Obras ──────────────────────────────────────────────────────────────────
export async function listarObrasPainel(perfil, agora = new Date()) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const dia = hoje()
  const lista = obrasVisiveis(perfil).map((o) => {
    const a = acesso(perfil, o.id)
    const emAndamento = o.status === 'Em andamento'
    const presenca = emAndamento ? estadoPresencaHoje(presencaLancadaEm(o.id, dia), agora.getHours()) : null
    const linha = { ...o, acesso: a, presenca_hoje: presenca }
    let pendente = presenca === 'atrasada'
    if (a.financeiro) {
      const compras = db.compras.filter((c) => c.obra_id === o.id)
      const aguardando = compras.filter((c) => c.status === 'Aguardando NF')
      linha.aguardando_nf = contarLancamentos(aguardando)
      linha.nf_atrasada = aguardando.some((c) => nfAtrasada(c, dia))
      linha.a_pagar = soma(compras) - soma(db.pagamentos.filter((p) => p.obra_id === o.id))
      linha.fechamentos_rascunho = db.fechamentos.filter((f) => f.obra_id === o.id && f.status === 'Rascunho').length
      pendente = pendente || linha.nf_atrasada || linha.fechamentos_rascunho > 0
    }
    linha.tem_pendencia = pendente
    return linha
  })
  return ok(ordenarObras(lista))
}

export async function avisosPainel(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  return ok({
    fechamentos_rascunho: db.fechamentos.filter((f) => ids.includes(f.obra_id) && f.status === 'Rascunho').length,
    compras_aguardando: contarLancamentos(db.compras.filter((c) => ids.includes(c.obra_id) && c.status === 'Aguardando NF')),
  })
}

// Para o seletor de obra do mestre e o cabeçalho da obra: sem nenhum valor.
export async function listarMinhasObras(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  return ok(obrasVisiveis(perfil).filter((o) => o.status !== 'Concluída').map((o) => ({ id: o.id, nome: o.nome, tipo: o.tipo, orgao_contratante: o.orgao_contratante, status: o.status })))
}

export async function obterObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const a = acesso(perfil, obraId)
  if (!a.ver) return falha(SEM_PERMISSAO)
  return ok({ ...porId(db.obras, obraId), acesso: a })
}

// ─── Gastos (obra × categoria) ──────────────────────────────────────────────
export async function gastosPorObra(perfil, periodo) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const linhas = obrasComFinanceiro(perfil).map((o) => {
    const compras = db.compras.filter((c) => c.obra_id === o.id && (!periodo || dentro(c.data, periodo)))
    const diarias = valorDiariasNoPeriodo(o.id, periodo || { inicio: '1900-01-01', fim: '2999-12-31' })
    return { obra: { id: o.id, nome: o.nome }, ...gastosPorCategoria(compras, diarias) }
  })
  return ok(linhas.filter((l) => l.total > 0))
}

// ─── Resumo da obra ─────────────────────────────────────────────────────────
export async function resumoObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const dia = hoje()
  const q = quinzenaDe(dia)
  const mes = { inicio: dia.slice(0, 8) + '01', fim: dia.slice(0, 8) + '31' }
  const compras = db.compras.filter((c) => c.obra_id === obraId)
  const pags = db.pagamentos.filter((p) => p.obra_id === obraId)
  const aguardando = compras.filter((c) => c.status === 'Aguardando NF')
  const presMes = db.presencas.filter((p) => p.obra_id === obraId && dentro(p.data, mes) && p.situacao === 'Presente')

  const atividades = [
    ...compras.map((c) => ({ quando: c.created_at, texto: `${nomeDe(c.criado_por)} lançou compra: ${c.descricao}` })),
    ...db.notas_fiscais.filter((n) => n.obra_id === obraId).map((n) => ({ quando: n.created_at, texto: `${nomeDe(n.criado_por)} anexou NF ${n.numero}` })),
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
  for (const p of db.presencas) if (p.obra_id === obraId && !porDia.has(p.data)) porDia.set(p.data, p)
  return [...porDia.values()].map((p) => ({ quando: p.created_at, texto: `${nomeDe(p.criado_por)} lançou presença` }))
}

// ─── Lista de compras ───────────────────────────────────────────────────────
const comFornecedor = (i) => ({ ...i, fornecedor: porId(db.fornecedores, i.fornecedor_sugerido_id) || null })

export async function listaComprasObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  return ok(db.itens_lista_compra.filter((i) => i.obra_id === obraId).map(comFornecedor))
}

export async function listaComprasGeral(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  return ok(db.itens_lista_compra
    .filter((i) => ids.includes(i.obra_id) && i.status === 'A comprar')
    .map((i) => ({ ...comFornecedor(i), obra: { id: i.obra_id, nome: porId(db.obras, i.obra_id).nome } })))
}

// ─── Fornecedores, extrato e fechamento ─────────────────────────────────────
// Quinzena de um pagamento: a do fechamento ligado; sem fechamento, a da data.
function quinzenaDoPagamento(p) {
  const f = p.fechamento_id && porId(db.fechamentos, p.fechamento_id)
  return f ? { inicio: f.quinzena_inicio, fim: f.quinzena_fim } : quinzenaDe(p.data)
}

function totaisFornecedor(obraId, fornecedorId, q) {
  const compras = db.compras.filter((c) => c.obra_id === obraId && c.fornecedor_id === fornecedorId && dentro(c.data, q))
  const pags = db.pagamentos.filter((p) => p.obra_id === obraId && p.fornecedor_id === fornecedorId && quinzenaDoPagamento(p).inicio === q.inicio)
  const comprado = soma(compras)
  const semNF = soma(compras.filter((c) => c.status === 'Aguardando NF'))
  const pago = soma(pags)
  return { compras, pags, comprado, com_nf: comprado - semNF, sem_nf: semNF, pago, saldo: comprado - pago }
}

export async function fornecedoresDaQuinzena(perfil, obraId, q) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const ids = new Set([
    ...db.compras.filter((c) => c.obra_id === obraId && dentro(c.data, q)).map((c) => c.fornecedor_id),
    ...db.pagamentos.filter((p) => p.obra_id === obraId && quinzenaDoPagamento(p).inicio === q.inicio).map((p) => p.fornecedor_id),
  ])
  return ok([...ids].map((fid) => {
    const t = totaisFornecedor(obraId, fid, q)
    const fech = db.fechamentos.find((f) => f.obra_id === obraId && f.fornecedor_id === fid && f.quinzena_inicio === q.inicio)
    return { fornecedor: porId(db.fornecedores, fid), comprado: t.comprado, com_nf: t.com_nf, sem_nf: t.sem_nf, pago: t.pago, saldo: t.saldo, fechamento: fech || null }
  }).sort((a, b) => a.fornecedor.nome.localeCompare(b.fornecedor.nome, 'pt-BR')))
}

export async function extratoFornecedor(perfil, obraId, fornecedorId, q) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const t = totaisFornecedor(obraId, fornecedorId, q)
  const nfIds = new Set(t.compras.map((c) => c.nota_fiscal_id).filter(Boolean))
  return ok({
    fornecedor: porId(db.fornecedores, fornecedorId),
    obra: porId(db.obras, obraId),
    compras: t.compras.sort((a, b) => (a.data < b.data ? -1 : 1)),
    notas: db.notas_fiscais.filter((n) => nfIds.has(n.id)),
    pagamentos: t.pags,
    pendentes_obra: db.compras.filter((c) => c.obra_id === obraId && c.fornecedor_id === fornecedorId && c.status === 'Aguardando NF'),
    fechamento: db.fechamentos.find((f) => f.obra_id === obraId && f.fornecedor_id === fornecedorId && f.quinzena_inicio === q.inicio) || null,
    totais: { comprado: t.comprado, com_nf: t.com_nf, sem_nf: t.sem_nf, pago: t.pago, saldo: t.saldo },
  })
}

export async function obterFechamento(perfil, fechamentoId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const f = porId(db.fechamentos, fechamentoId)
  if (!f || !acesso(perfil, f.obra_id).financeiro) return falha(SEM_PERMISSAO)
  const q = { inicio: f.quinzena_inicio, fim: f.quinzena_fim }
  const t = totaisFornecedor(f.obra_id, f.fornecedor_id, q)
  return ok({
    ...f, fechado_por_nome: f.fechado_por ? nomeDe(f.fechado_por) : null,
    obra: porId(db.obras, f.obra_id), fornecedor: porId(db.fornecedores, f.fornecedor_id),
    compras: t.compras, pagamentos: t.pags,
    totais: { comprado: t.comprado, com_nf: t.com_nf, sem_nf: t.sem_nf, pago: t.pago, saldo: t.saldo },
  })
}

// ─── Notas fiscais ──────────────────────────────────────────────────────────
export async function notasObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const forn = (id) => porId(db.fornecedores, id)
  return ok({
    obra: porId(db.obras, obraId),
    aguardando: db.compras.filter((c) => c.obra_id === obraId && c.status === 'Aguardando NF').map((c) => ({ ...c, fornecedor: forn(c.fornecedor_id) })),
    notas: db.notas_fiscais.filter((n) => n.obra_id === obraId).map((n) => ({
      ...n, fornecedor: forn(n.fornecedor_id),
      compras: db.compras.filter((c) => c.nota_fiscal_id === n.id),
      pagamento: n.pagamento_id ? porId(db.pagamentos, n.pagamento_id) : null,
    })),
  })
}

export async function notasPendentesGeral(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  return ok(db.compras
    .filter((c) => ids.includes(c.obra_id) && c.status === 'Aguardando NF')
    .map((c) => ({ ...c, fornecedor: porId(db.fornecedores, c.fornecedor_id), obra: porId(db.obras, c.obra_id) })))
}

// ─── Pagamentos ─────────────────────────────────────────────────────────────
export async function pagamentosObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  return ok(db.pagamentos
    .filter((p) => p.obra_id === obraId)
    .map((p) => ({
      ...p, fornecedor: porId(db.fornecedores, p.fornecedor_id), quinzena: quinzenaDoPagamento(p),
      notas: db.notas_fiscais.filter((n) => n.pagamento_id === p.id),
    }))
    .sort((a, b) => (a.data < b.data ? 1 : -1)))
}

// ─── Presença ───────────────────────────────────────────────────────────────
// Devolve funcionários SEM valor de diária: a diária mora em outra tabela.
export async function presencaDoDia(perfil, obraId, data) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  const funcs = db.funcionarios.filter((f) => f.obra_id === obraId && f.ativo)
    .map((f) => ({ id: f.id, nome: f.nome, funcao: f.funcao, vinculo: f.vinculo }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) // ordem alfabética (decisão de 18/11/2026)
  const doDia = db.presencas.filter((p) => p.obra_id === obraId && p.data === data)
  const anteriores = db.presencas.filter((p) => p.obra_id === obraId && p.data < data && p.data >= somarDias(data, -10))
  const diaAnterior = anteriores.reduce((m, p) => (p.data > m ? p.data : m), '')
  const primeiro = doDia[0]
  return ok({
    funcionarios: funcs,
    marcacoes: Object.fromEntries(doDia.map((p) => [p.funcionario_id, p.situacao])),
    anterior: Object.fromEntries(anteriores.filter((p) => p.data === diaAnterior).map((p) => [p.funcionario_id, p.situacao])),
    lancamento: primeiro ? { por: nomeDe(primeiro.criado_por), hora: primeiro.created_at.slice(11, 16) } : null,
  })
}

export async function salvarPresenca(perfil, obraId, data, marcacoes) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  if (COM_BANCO) {
    // Um envio só: quem já tinha linha no dia é corrigido (guarda o autor original),
    // quem não tinha ganha linha nova. A chave única (funcionário + dia) evita duplicar.
    // As linhas do dia são lidas AGORA do banco, não da carga guardada: outro aparelho
    // pode ter lançado o mesmo dia há poucos segundos, e o autor dele tem que ficar.
    const supabase = await banco()
    const { data: doDia, error: erroLeitura } = await supabase.from('presencas')
      .select('id, funcionario_id, criado_por').eq('obra_id', obraId).eq('data', data)
    if (erroLeitura) return falha(erroDoBanco(erroLeitura, 'ler presença do dia'))
    const linhas = Object.entries(marcacoes).map(([funcionario_id, situacao]) => {
      const existente = doDia.find((p) => p.funcionario_id === funcionario_id)
      return existente
        ? { id: existente.id, obra_id: obraId, funcionario_id, data, situacao, criado_por: existente.criado_por, atualizado_por: perfil.id }
        : { obra_id: obraId, funcionario_id, data, situacao, criado_por: perfil.id }
    })
    if (!linhas.length) return ok({ salvo: true })
    const { error } = await supabase.from('presencas')
      .upsert(linhas, { onConflict: 'funcionario_id,data', defaultToNull: false })
    esquecerCarga()
    if (error) return falha(erroDoBanco(error, 'salvar presença'))
    return ok({ salvo: true })
  }
  const agora = new Date()
  const hora = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  for (const [funcionario_id, situacao] of Object.entries(marcacoes)) {
    const existente = db.presencas.find((p) => p.funcionario_id === funcionario_id && p.data === data)
    if (existente) {
      existente.situacao = situacao
      existente.atualizado_por = perfil.id
    } else {
      db.presencas.push({ id: `pr-${funcionario_id}-${data}`, obra_id: obraId, funcionario_id, data, situacao, criado_por: perfil.id, created_at: `${data}T${hora}:00` })
    }
  }
  return ok({ salvo: true })
}

// ─── Diárias da quinzena (nunca para o mestre) ──────────────────────────────
export async function diariasQuinzena(perfil, obraId, q) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const linhas = calcularDiarias({
    funcionarios: db.funcionarios.filter((f) => f.obra_id === obraId),
    presencas: db.presencas.filter((p) => p.obra_id === obraId),
    diarias: db.diarias_funcionarios, periodo: q,
  })
  const semDiaria = db.funcionarios.filter((f) => f.obra_id === obraId && f.vinculo === 'Diarista' && f.ativo &&
    !db.diarias_funcionarios.some((d) => d.funcionario_id === f.id)).length
  return ok({
    linhas,
    total: soma(linhas, 'a_pagar'),
    sem_diaria: semDiaria,
    pagamento: db.pagamentos_diarias.find((p) => p.obra_id === obraId && p.quinzena_inicio === q.inicio) || null,
  })
}

// ─── Equipe da obra (só engenheiro) ─────────────────────────────────────────
export async function equipeObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).engenheiro) return falha(SEM_PERMISSAO)
  const dia = hoje()
  return ok({
    funcionarios: db.funcionarios.filter((f) => f.obra_id === obraId).map((f) => {
      const vigente = db.diarias_funcionarios.filter((d) => d.funcionario_id === f.id && d.vigente_desde <= dia)
        .sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1))[0]
      return { ...f, diaria: vigente ? vigente.valor : null, diaria_desde: vigente ? vigente.vigente_desde : null }
    }),
    acessos: db.membros_obra.filter((m) => m.obra_id === obraId).map((m) => ({ ...m, pessoa: porId(db.profiles, m.profile_id) })),
  })
}

// ─── Cadastro geral de fornecedores ─────────────────────────────────────────
export async function listarFornecedores(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const ids = obrasComFinanceiro(perfil).map((o) => o.id)
  if (!ids.length) return falha(SEM_PERMISSAO)
  return ok(db.fornecedores.map((f) => {
    const compras = db.compras.filter((c) => c.fornecedor_id === f.id && ids.includes(c.obra_id))
    return { ...f, obras: new Set(compras.map((c) => c.obra_id)).size, aguardando_nf: soma(compras.filter((c) => c.status === 'Aguardando NF')) }
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
}

// ─── Usuários (só engenheiro) ───────────────────────────────────────────────
export async function listarUsuarios(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (perfil?.role !== 'Engenheiro') return falha(SEM_PERMISSAO)
  return ok(db.profiles.map((p) => ({
    ...p, obras: db.membros_obra.filter((m) => m.profile_id === p.id).map((m) => porId(db.obras, m.obra_id).nome),
  })))
}

// ─── Planilha da licitação ──────────────────────────────────────────────────
// Ver: Financeiro ou Medição na obra. Importar: só o engenheiro, e só sem medição.
const temMedicao = (obraId) => db.medicoes.some((m) => m.obra_id === obraId)

export async function obterPlanilha(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const a = acesso(perfil, obraId)
  if (!a.financeiro && !a.medicao) return falha(SEM_PERMISSAO)
  const pl = db.planilhas_obra.find((p) => p.obra_id === obraId) || null
  const etapas = db.etapas_obra.filter((e) => e.obra_id === obraId).sort((x, y) => x.ordem - y.ordem)
  const itens = db.itens_contrato.filter((i) => i.obra_id === obraId).sort((x, y) => x.ordem - y.ordem)
  return ok({
    planilha: pl ? { ...pl, importada_por_nome: pl.importada_por ? nomeDe(pl.importada_por) : null } : null,
    etapas, itens,
    resumo: {
      etapas: etapas.length, itens: itens.length, zerados: itens.filter((i) => Number(i.quantidade) === 0).length,
      ...totaisItens(itens),
    },
    tem_medicao: temMedicao(obraId),
    pode_importar: a.engenheiro && !temMedicao(obraId),
  })
}

// `leitura` é o resultado de lerPlanilha (lib/planilha.js), já conferido na prévia.
export async function importarPlanilha(perfil, obraId, { leitura, bdi_percentual, arquivo_nome }) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).engenheiro) return falha(SEM_PERMISSAO)
  if (temMedicao(obraId)) return falha('A obra já tem medição: a planilha não pode mais ser trocada.')
  if (!leitura?.itens?.length) return falha('A planilha não tem nenhum item para importar.')
  if (leitura.erros?.length) return falha(`A planilha tem ${leitura.erros.length} erro(s). Corrija o arquivo antes de importar.`)
  if (COM_BANCO) {
    // O banco faz tudo ou nada (função importar_planilha, na migration).
    const etapas = leitura.etapas.map((e) => ({ numero: e.numero, nome: e.nome, nivel: e.nivel, ordem: e.ordem, numero_pai: e.numero_pai || null }))
    const itens = completarCusto(leitura.itens, bdi_percentual).map((i) => ({
      etapa_numero: i.etapa_numero, item: i.item, codigo: i.codigo, banco: i.banco, descricao: i.descricao, unidade: i.unidade,
      quantidade: i.quantidade, preco_unitario: i.preco_unitario, custo_unitario: i.custo_unitario, total: i.total, ordem: i.ordem,
    }))
    const { data, error } = await (await banco()).rpc('importar_planilha', {
      p_obra_id: obraId, p_bdi: Number(bdi_percentual) || 0, p_etapas: etapas, p_itens: itens, p_por: perfil.id,
      p_info: {
        objeto: leitura.info?.objeto || null, referencia_precos: leitura.info?.referencia_precos || null,
        total_geral: leitura.totaisPlanilha?.geral ?? null, total_sem_bdi: leitura.totaisPlanilha?.sem_bdi ?? null,
        arquivo_nome: arquivo_nome || null,
      },
    })
    esquecerCarga()
    if (error) return falha(erroDoBanco(error, 'importar planilha'))
    return ok(data)
  }
  const sufixo = Date.now().toString(36)
  const etapasAntigas = db.etapas_obra.filter((e) => e.obra_id === obraId)
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
    preco_unitario: i.preco_unitario, custo_unitario: i.custo_unitario, total: i.total, ordem: i.ordem,
  }))
  // Compras voltam para a etapa de mesmo número; sem par, Administração.
  const comprasObra = db.compras.filter((c) => c.obra_id === obraId)
  const { compras: religadas, semPar } = religarEtapas(comprasObra, etapasAntigas, etapasNovas)
  for (const c of religadas) porId(db.compras, c.id).etapa_id = c.etapa_id

  const trocar = (lista, novos) => {
    for (let k = lista.length - 1; k >= 0; k--) if (lista[k].obra_id === obraId) lista.splice(k, 1)
    lista.push(...novos)
  }
  trocar(db.etapas_obra, etapasNovas)
  trocar(db.itens_contrato, itensNovos)
  trocar(db.planilhas_obra, [{
    id: `pl-${sufixo}`, obra_id: obraId, bdi_percentual: Number(bdi_percentual) || 0,
    objeto: leitura.info?.objeto || null, referencia_precos: leitura.info?.referencia_precos || null,
    total_geral_planilha: leitura.totaisPlanilha?.geral ?? null, total_sem_bdi_planilha: leitura.totaisPlanilha?.sem_bdi ?? null,
    arquivo_nome: arquivo_nome || null, importada_em: momentoLocal(), importada_por: perfil.id,
  }])
  return ok({ etapas: etapasNovas.length, itens: itensNovos.length, compras_sem_etapa: semPar })
}

// ─── Orçado x Realizado ─────────────────────────────────────────────────────
const TUDO = { inicio: '1900-01-01', fim: '2999-12-31' }

export async function orcadoRealizado(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const compras = db.compras.filter((c) => c.obra_id === obraId)
  const diarias = valorDiariasNoPeriodo(obraId, TUDO)
  const etapas = db.etapas_obra.filter((e) => e.obra_id === obraId)
  if (!etapas.length) return ok({ sem_planilha: true, gastos: gastosPorCategoria(compras, diarias) })
  return ok({
    sem_planilha: false,
    ...orcadoPorEtapa({ etapas, itens: db.itens_contrato.filter((i) => i.obra_id === obraId), compras, valorDiarias: diarias }),
  })
}

// ─── Fluxo de caixa (fase 1: só saídas; entradas chegam com a Medição) ──────
export async function fluxoCaixa(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  const obra = porId(db.obras, obraId)
  const dia = hoje()
  const compras = db.compras.filter((c) => c.obra_id === obraId)
  const pags = db.pagamentos.filter((p) => p.obra_id === obraId)
  // Diárias em aberto: cada quinzena com presença e sem pagamento registrado.
  const presencasObra = db.presencas.filter((p) => p.obra_id === obraId)
  const diariasEmAberto = []
  if (presencasObra.length) {
    const primeira = presencasObra.reduce((m, p) => (p.data < m ? p.data : m), dia)
    for (let q = quinzenaDe(primeira); q.inicio <= dia; q = quinzenaDe(somarDias(q.fim, 1))) {
      if (db.pagamentos_diarias.some((p) => p.obra_id === obraId && p.quinzena_inicio === q.inicio)) continue
      const valor = valorDiariasNoPeriodo(obraId, q)
      if (valor > 0) diariasEmAberto.push({ fim: q.fim, valor })
    }
  }
  return ok({
    entradas_disponiveis: false, // vira true com a Medição (fase 3)
    meses: fluxoMensal({
      inicio: obra.data_inicio, hojeIso: dia,
      pagamentos: pags,
      pagamentosDiarias: db.pagamentos_diarias.filter((p) => p.obra_id === obraId),
      aPagarFornecedores: Math.max(0, soma(compras) - soma(pags)),
      diariasEmAberto,
    }),
  })
}

// ─── Pendências de cada módulo da obra (para a grade de módulos) ────────────
// Só devolve os módulos que a pessoa pode abrir. tom: ok | at | cr | ''
export async function pendenciasObra(perfil, obraId, agora = new Date()) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  const a = acesso(perfil, obraId)
  if (!a.ver) return falha(SEM_PERMISSAO)
  const dia = hoje()
  const obra = porId(db.obras, obraId)
  const p = {}
  if (a.financeiro) {
    const compras = db.compras.filter((c) => c.obra_id === obraId)
    const aguardando = compras.filter((c) => c.status === 'Aguardando NF')
    const itens = db.itens_lista_compra.filter((i) => i.obra_id === obraId && i.status === 'A comprar')
    const itensAtrasados = itens.filter((i) => i.para_quando && i.para_quando < dia).length
    const rascunhos = db.fechamentos.filter((f) => f.obra_id === obraId && f.status === 'Rascunho').length
    const pagsObra = db.pagamentos.filter((pg) => pg.obra_id === obraId)
    const semNota = pagsObra.filter((pg) => !db.notas_fiscais.some((n) => n.pagamento_id === pg.id)).length
    const nAg = contarLancamentos(aguardando)
    p.resumo = { texto: 'Números da obra', tom: '' }
    const etapas = db.etapas_obra.filter((e) => e.obra_id === obraId)
    if (!etapas.length) p.orcado = { texto: 'Sem planilha', tom: '' }
    else {
      const oxr = orcadoPorEtapa({ etapas, itens: db.itens_contrato.filter((i) => i.obra_id === obraId), compras, valorDiarias: 0 })
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
    const temDiarioHoje = db.diarios_obra.some((d) => d.obra_id === obraId && d.data === dia)
    if (obra.status !== 'Em andamento') {
      p.presenca = p.diario = { texto: `Obra ${obra.status.toLowerCase()}`, tom: '' }
    } else {
      const est = estadoPresencaHoje(presencaLancadaEm(obraId, dia), agora.getHours())
      p.presenca = est === 'lancada' ? { texto: 'Lançada hoje', tom: 'ok' } : { texto: 'Presença não lançada', tom: est === 'atrasada' ? 'cr' : 'at' }
      p.diario = diarioPendente(obra.status, temDiarioHoje, dia) ? { texto: 'Diário de hoje não lançado', tom: 'at' }
        : { texto: temDiarioHoje ? 'Lançado hoje' : 'Clima, serviços e fotos', tom: '' }
    }
  }
  if (a.engenheiro) {
    const semDiaria = db.funcionarios.filter((f) => f.obra_id === obraId && f.vinculo === 'Diarista' && f.ativo &&
      !db.diarias_funcionarios.some((d) => d.funcionario_id === f.id)).length
    p.equipe = semDiaria ? { texto: plural(semDiaria, 'diarista sem diária', 'diaristas sem diária'), tom: 'at' } : { texto: 'Funcionários e acessos', tom: '' }
  }
  return ok(p)
}

export async function fechamentosObra(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).financeiro) return falha(SEM_PERMISSAO)
  return ok(db.fechamentos.filter((f) => f.obra_id === obraId)
    .map((f) => ({ ...f, fornecedor: porId(db.fornecedores, f.fornecedor_id), total: soma(totaisFornecedor(obraId, f.fornecedor_id, { inicio: f.quinzena_inicio, fim: f.quinzena_fim }).compras) }))
    .sort((a, b) => (a.quinzena_inicio < b.quinzena_inicio ? 1 : -1)))
}

// ─── Relatórios ─────────────────────────────────────────────────────────────
// Obras que aparecem no seletor: as que têm Financeiro ou Presença liberados.
export async function obrasDosRelatorios(perfil) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (perfil?.role === 'Mestre') return ok([])
  return ok(obrasVisiveis(perfil)
    .filter((o) => { const a = acesso(perfil, o.id); return a.financeiro || a.presenca || a.medicao })
    .map((o) => ({ id: o.id, nome: o.nome })))
}

// obraId vazio = "Todas as obras". O mestre não tem relatório nenhum.
export async function relatoriosPara(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!perfil || perfil.role === 'Mestre' || perfil.role === 'Pendente') return ok([])
  const ac = obraId ? acesso(perfil, obraId) : somarAcessos(obrasVisiveis(perfil).map((o) => acesso(perfil, o.id)))
  return ok(relatoriosDisponiveis(ac))
}

// Para o menu: a pessoa tem Financeiro em alguma obra?
export const temFinanceiro = (perfil) => obrasComFinanceiro(perfil).length > 0

// ─── Diário de obra (fase 2) ────────────────────────────────────────────────
// No banco desde 20/11/2026 (`diarios_obra` e `fotos`). O efetivo não é guardado:
// é a contagem de "Presente" na presença da mesma obra e data.
// Fotos: a tabela guarda só o endereço (`arquivo_path`), mas o envio do arquivo
// (Storage) ainda não existe. As fotos tiradas no app NÃO são gravadas: ficam só
// na miniatura da tela até sair dela. As de exemplo vêm sem arquivo.
const efetivoEm = (obraId, data) => {
  const doDia = db.presencas.filter((p) => p.obra_id === obraId && p.data === data)
  return doDia.length ? doDia.filter((p) => p.situacao === 'Presente').length : null
}
const diariosDaObra = (obraId) => db.diarios_obra.filter((d) => d.obra_id === obraId)

export async function listarDiarios(perfil, obraId) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  const diarios = diariosDaObra(obraId)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .map((d) => ({
      ...d,
      efetivo: efetivoEm(obraId, d.data),
      autor: nomeDe(d.criado_por),
      fotos: db.fotos.filter((f) => f.diario_id === d.id).map((f) => ({ id: f.id, legenda: f.legenda, url: f.arquivo_path || null })),
    }))
  return ok({ diarios, hoje: hoje() })
}

// Efetivo do dia, para o formulário mostrar antes de salvar (null = presença não lançada).
export async function efetivoDoDia(perfil, obraId, data) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  return ok({ efetivo: efetivoEm(obraId, data) })
}

// As fotos não vão junto: ainda não há onde guardar o arquivo (ver acima).
export async function salvarDiario(perfil, obraId, diario) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  if (!acesso(perfil, obraId).presenca) return falha(SEM_PERMISSAO)
  const erros = errosDiario(perfil, diario, diariosDaObra(obraId))
  if (Object.keys(erros).length) return falha(Object.values(erros)[0])
  const linha = {
    obra_id: obraId, data: diario.data, clima_manha: diario.clima_manha, clima_tarde: diario.clima_tarde,
    servicos: diario.servicos.trim(), ocorrencias: (diario.ocorrencias || '').trim() || null, criado_por: perfil.id,
  }
  if (COM_BANCO) {
    // A carga guardada pode ter até 15 s: outro aparelho pode ter lançado o mesmo dia.
    // A chave única (obra + data) recusa, e a mensagem diz o porquê.
    const supabase = await banco()
    const { data: criado, error } = await supabase.from('diarios_obra').insert(linha).select('id').single()
    esquecerCarga()
    if (error?.code === '23505') return falha(DIARIO_REPETIDO)
    if (error) return falha(erroDoBanco(error, 'salvar diário'))
    return ok({ id: criado.id })
  }
  const id = `do-${obraId}-${diario.data}`
  db.diarios_obra.push({ id, ...linha, created_at: momentoLocal() })
  return ok({ id })
}

// ─── Planejamento (EAP, longo, médio e curto prazo) ─────────────────────────
// ⚠ AINDA SEM TABELA NO BANCO: as atividades ficam só NA MEMÓRIA desta janela,
// começando pelos exemplos de mockData.js, e somem ao recarregar (F5).
// A permissão já é conferida aqui, como será com o banco.
// Toda gravação devolve a lista inteira da obra: a tela troca o estado único
// do módulo de uma vez, e as quatro abas enxergam a mesma coisa.
const plano = { atividades: structuredClone(exemplo.atividades), restricoes: structuredClone(exemplo.restricoes), subtarefas: structuredClone(exemplo.subtarefas) }
const atividadesDaObra = (obraId) => plano.atividades.filter((a) => a.obra_id === obraId)
const restricoesDaObra = (obraId) => plano.restricoes.filter((r) => r.obra_id === obraId)
const subtarefasDaObra = (obraId) => plano.subtarefas.filter((s) => s.obra_id === obraId)
const listasDaObra = (obraId) => ({ atividades: atividadesDaObra(obraId), restricoes: restricoesDaObra(obraId), subtarefas: subtarefasDaObra(obraId) })
const listaPlano = (obraId) => ok(listasDaObra(obraId))
let ultimoIdPlano = 0
// No banco, a obra tem outro id ('o1' do exemplo vira um uuid): os exemplos
// são ligados à obra de mesmo nome. Obra de exemplo que não está no banco fica de fora.
let planoReligado = !COM_BANCO
function religarObrasDoPlano() {
  if (planoReligado) return
  planoReligado = true
  for (const a of [...plano.atividades, ...plano.restricoes, ...plano.subtarefas]) {
    const nome = porId(exemplo.obras, a.obra_id)?.nome
    a.obra_id = db.obras.find((o) => o.nome === nome)?.id || null
  }
}

async function conferirPlano(perfil, obraId, editar) {
  const semBanco = await pronto()
  if (semBanco) return semBanco
  religarObrasDoPlano()
  const a = acesso(perfil, obraId)
  if (!a.ver || (editar && !podeEditarEap(perfil.role, a))) return falha(SEM_PERMISSAO)
  return null
}

export async function listarPlanejamento(perfil, obraId) {
  const barrado = await conferirPlano(perfil, obraId, false)
  if (barrado) return barrado
  return ok({ ...listasDaObra(obraId), calendario: CALENDARIO_PADRAO, podeEditarEap: podeEditarEap(perfil.role, acesso(perfil, obraId)) })
}

// Cria (sem `id`) ou edita uma atividade. Mudou de pai: vai para o fim da lista do pai novo.
export async function salvarAtividade(perfil, obraId, campos, id = null) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  const lista = atividadesDaObra(obraId)
  const atual = id ? lista.find((a) => a.id === id) : null
  if (id && !atual) return falha('Esta atividade não existe mais. Recarregue a página.')
  const temFilhos = !!atual && lista.some((a) => a.pai_id === id && !a.arquivada)
  const erros = errosAtividade(campos, lista, { id, temFilhos })
  if (Object.keys(erros).length) return falha(Object.values(erros)[0])
  const pai_id = campos.pai_id || null
  const linha = { titulo: campos.titulo.trim(), pai_id, inicio: temFilhos ? atual.inicio : campos.inicio, fim: temFilhos ? atual.fim : campos.fim }
  if (atual) {
    if ((atual.pai_id || null) !== pai_id) linha.ordem = proximaOrdem(lista, pai_id)
    Object.assign(atual, linha)
  } else {
    plano.atividades.push({ id: `pl-${Date.now()}-${++ultimoIdPlano}`, obra_id: obraId, ...linha, ordem: proximaOrdem(lista, pai_id), progresso: 0, status: STATUS_ATIVIDADE[0], causa_nao_realizado: null, semana_nao_realizado: null, arquivada: false })
  }
  return listaPlano(obraId)
}

export async function moverAtividade(perfil, obraId, id, direcao) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  for (const t of trocarOrdem(atividadesDaObra(obraId), id, direcao)) porId(plano.atividades, t.id).ordem = t.ordem
  return listaPlano(obraId)
}

// Arquivar não apaga: a atividade (e o que está dentro dela) sai da EAP e das contas, e pode voltar.
export async function arquivarAtividade(perfil, obraId, id, arquivada) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  const a = atividadesDaObra(obraId).find((x) => x.id === id)
  if (!a) return falha('Esta atividade não existe mais. Recarregue a página.')
  if (!arquivada) {
    const erro = erroDesarquivar(atividadesDaObra(obraId), id)
    if (erro) return falha(erro)
  }
  a.arquivada = arquivada
  // Desarquivada volta para o fim da lista: o lugar antigo pode ter sido ocupado.
  if (!arquivada) a.ordem = proximaOrdem(atividadesDaObra(obraId).filter((x) => x.id !== id), a.pai_id)
  return listaPlano(obraId)
}

// Progresso real de uma atividade (só as que não têm subatividades: o grupo é calculado).
export async function salvarProgresso(perfil, obraId, id, valor) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  const erro = erroProgresso(valor)
  if (erro) return falha(erro)
  const lista = atividadesDaObra(obraId)
  const a = lista.find((x) => x.id === id)
  if (!a) return falha('Esta atividade não existe mais. Recarregue a página.')
  if (lista.some((x) => x.pai_id === id && !x.arquivada)) return falha('O progresso de um grupo vem das atividades dentro dele.')
  a.progresso = Number(valor)
  a.status = statusPeloProgresso(a.status, a.progresso)
  return listaPlano(obraId)
}

// ─── Restrições (médio prazo) ───────────────────────────────────────────────
// Cria (sem `id`) ou edita uma restrição. Só atividade sem subatividades.
export async function salvarRestricao(perfil, obraId, campos, id = null) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  const erros = errosRestricao(campos, montarEap(atividadesDaObra(obraId)), { dia: hoje(), nova: !id })
  if (Object.keys(erros).length) return falha(Object.values(erros)[0])
  const linha = { atividade_id: campos.atividade_id, descricao: campos.descricao.trim(), tipo: campos.tipo, prazo: campos.prazo, responsavel: campos.responsavel.trim() }
  if (id) {
    const r = restricoesDaObra(obraId).find((x) => x.id === id)
    if (!r) return falha('Esta restrição não existe mais. Recarregue a página.')
    Object.assign(r, linha)
  } else {
    plano.restricoes.push({ id: `rs-${Date.now()}-${++ultimoIdPlano}`, obra_id: obraId, ...linha, resolvida: false })
  }
  return listaPlano(obraId)
}

export async function resolverRestricao(perfil, obraId, id, resolvida) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  const r = restricoesDaObra(obraId).find((x) => x.id === id)
  if (!r) return falha('Esta restrição não existe mais. Recarregue a página.')
  r.resolvida = resolvida
  return listaPlano(obraId)
}

// Uma semana para trás (-1) ou para frente (+1).
export async function moverRestricao(perfil, obraId, id, direcao, dia = hoje()) {
  const barrado = await conferirPlano(perfil, obraId, true)
  if (barrado) return barrado
  const r = restricoesDaObra(obraId).find((x) => x.id === id)
  if (!r) return falha('Esta restrição não existe mais. Recarregue a página.')
  const { prazo, erro } = novoPrazo(r, direcao, dia)
  if (erro) return falha(erro)
  r.prazo = prazo
  return listaPlano(obraId)
}

// ─── Curto prazo (a semana) ─────────────────────────────────────────────────
// O mestre também mexe aqui: quem vê a obra move no quadro e marca o checklist.
const atividadeDaObra = (obraId, id) => atividadesDaObra(obraId).find((a) => a.id === id && !a.arquivada)

export async function moverNaSemana(perfil, obraId, id, status) {
  const barrado = await conferirPlano(perfil, obraId, false)
  if (barrado) return barrado
  if (!STATUS_ATIVIDADE.includes(status)) return falha('Escolha uma coluna do quadro.')
  const a = atividadeDaObra(obraId, id)
  if (!a) return falha('Esta atividade não existe mais. Recarregue a página.')
  if (atividadesDaObra(obraId).some((x) => x.pai_id === id && !x.arquivada)) return falha('Um grupo não entra no quadro: mova as atividades dentro dele.')
  a.status = status
  a.progresso = progressoPeloStatus(status, a.progresso)
  if (status === 'Concluído') Object.assign(a, { causa_nao_realizado: null, semana_nao_realizado: null })
  return listaPlano(obraId)
}

// "Não realizado" na semana: exige a causa raiz. Concluída não pode.
export async function marcarNaoRealizado(perfil, obraId, id, causa, semana) {
  const barrado = await conferirPlano(perfil, obraId, false)
  if (barrado) return barrado
  const erro = erroCausa(causa)
  if (erro) return falha(erro)
  if (!semana || semanaDe(semana) !== semana) return falha('Semana inválida. Recarregue a página.')
  const a = atividadeDaObra(obraId, id)
  if (!a) return falha('Esta atividade não existe mais. Recarregue a página.')
  if (a.status === 'Concluído') return falha('Esta atividade já foi concluída.')
  Object.assign(a, { causa_nao_realizado: causa, semana_nao_realizado: semana })
  return listaPlano(obraId)
}

export async function salvarSubtarefa(perfil, obraId, atividadeId, titulo) {
  const barrado = await conferirPlano(perfil, obraId, false)
  if (barrado) return barrado
  const erro = erroSubtarefa(titulo)
  if (erro) return falha(erro)
  if (!atividadeDaObra(obraId, atividadeId)) return falha('Esta atividade não existe mais. Recarregue a página.')
  const irmas = subtarefasDaObra(obraId).filter((s) => s.atividade_id === atividadeId)
  plano.subtarefas.push({ id: `st-${Date.now()}-${++ultimoIdPlano}`, obra_id: obraId, atividade_id: atividadeId, ordem: Math.max(0, ...irmas.map((s) => s.ordem)) + 1, titulo: titulo.trim(), feita: false, causa_nao_realizado: null })
  return listaPlano(obraId)
}

// Feita = sim/não. `causa` só quando NÃO feita ("Não realizado"); marcar feita limpa a causa.
export async function marcarSubtarefa(perfil, obraId, id, feita, causa = null) {
  const barrado = await conferirPlano(perfil, obraId, false)
  if (barrado) return barrado
  const s = subtarefasDaObra(obraId).find((x) => x.id === id)
  if (!s || !atividadeDaObra(obraId, s.atividade_id)) return falha('Esta subtarefa não existe mais. Recarregue a página.')
  if (causa) {
    const erro = erroCausa(causa)
    if (erro) return falha(erro)
  }
  Object.assign(s, { feita, causa_nao_realizado: feita ? null : causa })
  return listaPlano(obraId)
}
