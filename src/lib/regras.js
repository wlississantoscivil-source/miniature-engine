// Regras puras do Minha Obra: datas, quinzenas, dinheiro, permissões e contas.
// Sem React, sem banco, sem `window`: tudo aqui roda no Node e tem teste em tests/.

// ─── Vocabulário (idêntico ao CHECK do banco, ver PRD-BACKEND.md) ───────────
export const CATEGORIAS = ['Material', 'Mão de obra', 'Aluguel de equipamento', 'Serviço', 'Outros']
export const STATUS_OBRA = ['Em andamento', 'Paralisada', 'Concluída']
export const TIPOS_OBRA = ['Escola', 'UBS', 'Refeitório', 'Outro']
export const STATUS_COMPRA = ['Aguardando NF', 'NF recebida', 'Paga']
export const STATUS_ITEM_LISTA = ['A comprar', 'Comprado', 'Cancelado']
export const SITUACOES = ['Presente', 'Falta', 'Atestado', 'Folga']
export const FORMAS_PAGAMENTO = ['Pix', 'Boleto', 'Transferência', 'Dinheiro']
export const DIAS_NF_ATRASADA = 7 // [DESCOBRIR NO USO]
export const HORA_AVISO_PRESENCA = 10 // [DESCOBRIR NO USO]
export const DIAS_CORRECAO_MESTRE = 3 // [DESCOBRIR NO USO]

// ─── Datas (sempre 'AAAA-MM-DD', no fuso local — nunca toISOString) ─────────
const z = (n) => String(n).padStart(2, '0')
export const isoLocal = (d) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
export const hoje = () => isoLocal(new Date())
// Data e hora no fuso local: 'AAAA-MM-DDTHH:MM:SS'.
export const momentoLocal = (d = new Date()) => `${isoLocal(d)}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`
const paraData = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}
export const somarDias = (iso, n) => {
  const d = paraData(iso)
  d.setDate(d.getDate() + n)
  return isoLocal(d)
}
export const diasEntre = (de, ate) => Math.round((paraData(ate) - paraData(de)) / 86400000)
export const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
export const fmtDiaMes = (iso) => (iso ? fmtData(iso).slice(0, 5) : '')
const SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const diaDaSemana = (iso) => SEMANA[paraData(iso).getDay()]
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// ─── Dinheiro ───────────────────────────────────────────────────────────────
export const brl = (v) =>
  'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const soma = (lista, campo = 'valor') => lista.reduce((t, x) => t + Number(x[campo] || 0), 0)

// ─── Quinzenas: 1–15 e 16–último dia do mês ─────────────────────────────────
export function quinzenaDe(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  if (d <= 15) return { inicio: `${a}-${z(m)}-01`, fim: `${a}-${z(m)}-15` }
  const ultimo = new Date(a, m, 0).getDate()
  return { inicio: `${a}-${z(m)}-16`, fim: `${a}-${z(m)}-${z(ultimo)}` }
}
export const quinzenaAnterior = (q) => quinzenaDe(somarDias(q.inicio, -1))
export const quinzenaSeguinte = (q) => quinzenaDe(somarDias(q.fim, 1))
export const dentro = (iso, q) => iso >= q.inicio && iso <= q.fim
export function rotuloQuinzena(q) {
  const [a, m, d] = q.inicio.split('-').map(Number)
  return `${d === 1 ? '1ª' : '2ª'} quinzena ${MESES[m - 1]}/${a}`
}

// ─── Permissões (PLANO, matriz de permissões) ───────────────────────────────
// Devolve o que a pessoa pode fazer numa obra. Engenheiro pode tudo em todas.
export function acessoNaObra(perfil, membros, obraId) {
  const nada = { ver: false, financeiro: false, presenca: false, medicao: false, engenheiro: false }
  if (!perfil || !perfil.ativo) return nada
  if (perfil.role === 'Engenheiro') return { ver: true, financeiro: true, presenca: true, medicao: true, engenheiro: true }
  const m = membros.find((x) => x.obra_id === obraId && x.profile_id === perfil.id)
  if (!m) return nada
  if (perfil.role === 'Mestre') return { ...nada, ver: true, presenca: true }
  if (perfil.role === 'Auxiliar') {
    return { ver: true, financeiro: !!m.pode_financeiro, presenca: !!m.pode_presenca_diario, medicao: !!m.pode_medicao, engenheiro: false }
  }
  return nada
}

// Abas da obra. Diário (fase 2) já aparece, com dados de exemplo; Medição (fase 3) ainda não.
export const ABAS_OBRA = [
  { id: 'resumo', rotulo: 'Resumo', precisa: 'financeiro' },
  { id: 'orcado', rotulo: 'Orçado x Realizado', precisa: 'financeiro' },
  { id: 'fluxo', rotulo: 'Fluxo de caixa', precisa: 'financeiro' },
  { id: 'lista', rotulo: 'Lista de compras', precisa: 'financeiro' },
  { id: 'fornecedores', rotulo: 'Fornecedores', precisa: 'financeiro' },
  { id: 'notas', rotulo: 'Notas', precisa: 'financeiro' },
  { id: 'pagamentos', rotulo: 'Pagamentos', precisa: 'financeiro' },
  { id: 'presenca', rotulo: 'Presença', precisa: 'presenca' },
  { id: 'diario', rotulo: 'Diário', precisa: 'presenca' },
  { id: 'planejamento', rotulo: 'Planejamento', precisa: 'ver' },
  { id: 'equipe', rotulo: 'Equipe', precisa: 'engenheiro' },
]
export const abasVisiveis = (acesso) => ABAS_OBRA.filter((a) => acesso[a.precisa])

// ─── Relatórios ─────────────────────────────────────────────────────────────
// Fases já construídas. Relatório de fase futura não aparece.
export const FASES_PRONTAS = [1]
// `porObra`: só faz sentido com uma obra escolhida (não em "Todas as obras").
// Formato dos arquivos: o engenheiro ainda vai mandar o modelo de cada um.
export const RELATORIOS = [
  { id: 'gastos', titulo: 'Gastos por obra e categoria', formatos: ['CSV'], precisa: 'financeiro', fase: 1, porObra: false },
  { id: 'fechamento', titulo: 'Fechamento da quinzena por fornecedor', formatos: ['PDF'], precisa: 'financeiro', fase: 1, porObra: true },
  { id: 'diarias', titulo: 'Diárias da quinzena', formatos: ['PDF', 'CSV'], precisa: 'financeiro', fase: 1, porObra: true },
  { id: 'presenca', titulo: 'Presença do mês', formatos: ['CSV'], precisa: 'presenca', fase: 1, porObra: true },
  { id: 'orcado', titulo: 'Orçado x Realizado por etapa', formatos: ['Exportar'], precisa: 'financeiro', fase: 1, porObra: true },
  { id: 'fluxo', titulo: 'Fluxo de caixa mês a mês', formatos: ['Exportar'], precisa: 'financeiro', fase: 1, porObra: false },
  { id: 'diario', titulo: 'Diário de obra do período', formatos: ['PDF'], precisa: 'presenca', fase: 2, porObra: true },
  { id: 'medicao', titulo: 'Boletim de medição', formatos: ['PDF', 'CSV'], precisa: 'medicao', fase: 3, porObra: true },
]
export const relatoriosDisponiveis = (acesso, fases = FASES_PRONTAS) =>
  RELATORIOS.filter((r) => fases.includes(r.fase) && acesso[r.precisa])

// Acesso somado de várias obras ("Todas as obras"): basta ter em uma.
export const somarAcessos = (acessos) => ({
  financeiro: acessos.some((a) => a.financeiro),
  presenca: acessos.some((a) => a.presenca),
  medicao: acessos.some((a) => a.medicao),
})

// ─── Presença ───────────────────────────────────────────────────────────────
// 'lancada' | 'atrasada' (depois das 10h sem presença) | 'pendente' (antes das 10h)
export function estadoPresencaHoje(lancada, horaAgora) {
  if (lancada) return 'lancada'
  return horaAgora >= HORA_AVISO_PRESENCA ? 'atrasada' : 'pendente'
}

// Mestre corrige hoje e os 3 dias anteriores; engenheiro e auxiliar, qualquer dia.
export function podeEditarPresenca(perfil, dataIso, hojeIso) {
  if (!perfil) return false
  if (dataIso > hojeIso) return false
  if (perfil.role !== 'Mestre') return true
  return diasEntre(dataIso, hojeIso) <= DIAS_CORRECAO_MESTRE
}

// ─── Diárias ────────────────────────────────────────────────────────────────
// A diária de um dia é a de maior `vigente_desde` que seja <= aquele dia.
export function diariaVigente(diarias, funcionarioId, dataIso) {
  const validas = diarias
    .filter((d) => d.funcionario_id === funcionarioId && d.vigente_desde <= dataIso)
    .sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1))
  return validas.length ? Number(validas[0].valor) : null
}

// Uma linha por diarista com presença no período. "Do empreiteiro" não entra.
export function calcularDiarias({ funcionarios, presencas, diarias, periodo }) {
  const linhas = []
  for (const f of funcionarios) {
    if (f.vinculo !== 'Diarista') continue
    const dele = presencas.filter((p) => p.funcionario_id === f.id && dentro(p.data, periodo))
    if (!dele.length) continue
    const presentes = dele.filter((p) => p.situacao === 'Presente')
    let total = 0
    let semValor = false
    const valores = new Set()
    for (const p of presentes) {
      const v = diariaVigente(diarias, f.id, p.data)
      if (v == null) semValor = true
      else {
        total += v
        valores.add(v)
      }
    }
    linhas.push({
      funcionario: f,
      dias: presentes.length,
      faltas: dele.filter((p) => p.situacao === 'Falta' || p.situacao === 'Atestado').length,
      diaria: valores.size ? Math.max(...valores) : null,
      variou: valores.size > 1,
      sem_valor: semValor,
      a_pagar: total,
    })
  }
  return linhas
}

// ─── Gastos por categoria (a pergunta de um ano) ────────────────────────────
// Mão de obra = compras de Mão de obra (empreiteiros) + diárias.
export function gastosPorCategoria(compras, valorDiarias = 0) {
  const g = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]))
  for (const c of compras) g[c.categoria] = (g[c.categoria] || 0) + Number(c.valor)
  const empreiteiros = g['Mão de obra']
  g['Mão de obra'] = empreiteiros + valorDiarias
  const total = CATEGORIAS.reduce((t, c) => t + g[c], 0)
  return { ...g, empreiteiros, diarias: valorDiarias, total }
}

// ─── Lançamentos ────────────────────────────────────────────────────────────
// Compra dividida em categorias (mesmo grupo_id) é UM lançamento para quem lê.
export const contarLancamentos = (compras) => new Set(compras.map((c) => c.grupo_id || c.id)).size

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

// ─── Notas fiscais ──────────────────────────────────────────────────────────
export const diasEsperandoNF = (compra, hojeIso) => diasEntre(compra.data, hojeIso)
export const nfAtrasada = (compra, hojeIso) =>
  compra.status === 'Aguardando NF' && diasEsperandoNF(compra, hojeIso) > DIAS_NF_ATRASADA

// Mensagem de cobrança de NF (modelo do PRD-FRONTEND). `grupos` = [{ obra, compras }].
export function mensagemCobrancaNF(fornecedor, grupos) {
  const linhas = [`Olá, ${fornecedor.nome}!`]
  const umaObra = grupos.length === 1
  if (umaObra) linhas[0] += ` Aqui é da obra ${grupos[0].obra.nome} (${grupos[0].obra.orgao_contratante}).`
  linhas.push('Estamos sem a nota fiscal destas compras:')
  let total = 0
  for (const g of grupos) {
    if (!umaObra) linhas.push('', `Obra ${g.obra.nome}:`)
    for (const c of g.compras) {
      linhas.push(`• ${fmtDiaMes(c.data)} – ${c.descricao} – ${brl(c.valor)}`)
      total += Number(c.valor)
    }
  }
  linhas.push(`Total: ${brl(total)}`, 'Pode enviar a NF por aqui? Obrigado!')
  return linhas.join('\n')
}

// Pedido de itens da lista de compras. `grupos` = [{ obra, itens }].
export function mensagemPedidoItens(fornecedor, grupos) {
  const umaObra = grupos.length === 1
  const linhas = [umaObra
    ? `Olá, ${fornecedor.nome}! Preciso destes itens para a obra ${grupos[0].obra.nome}:`
    : `Olá, ${fornecedor.nome}! Preciso destes itens:`]
  for (const g of grupos) {
    if (!umaObra) linhas.push('', `Obra ${g.obra.nome}:`)
    for (const i of g.itens) linhas.push(`• ${i.descricao}${i.quantidade ? ` – ${i.quantidade} ${i.unidade || ''}`.trimEnd() : ''}`)
  }
  linhas.push('Pode me passar o valor e o prazo de entrega?')
  return linhas.join('\n')
}

// ─── Ordem do painel: obras com pendência primeiro, depois por nome ─────────
export function ordenarObras(obras) {
  const peso = { 'Em andamento': 0, Paralisada: 1, 'Concluída': 2 }
  return [...obras].sort((a, b) =>
    (peso[a.status] - peso[b.status]) ||
    (Number(b.tem_pendencia) - Number(a.tem_pendencia)) ||
    a.nome.localeCompare(b.nome, 'pt-BR'))
}

// ─── Diário de obra ──────────────────────────────────────────────────────────
// Mesmos textos do CHECK de `diarios_obra` (PRD-BACKEND.md).
export const CLIMAS = ['Bom', 'Nublado', 'Chuva', 'Impraticável']
export const DIARIO_REPETIDO = 'Já existe diário nesta data. É um por dia.'
// Clima que atrapalha o serviço: ganha cor de atenção.
export const climaRuim = (c) => c === 'Chuva' || c === 'Impraticável'

// O diário de hoje está faltando? Só em obra em andamento e em dia útil.
export function diarioPendente(status, temHoje, dia = hoje()) {
  const sem = diaDaSemana(dia)
  return status === 'Em andamento' && !temHoje && sem !== 'Sábado' && sem !== 'Domingo'
}

// Confere o diário antes de gravar. Devolve { campo: 'mensagem' } (vazio = pode gravar).
export function errosDiario(perfil, diario, existentes, dia = hoje()) {
  const e = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(diario.data || '')) e.data = 'Informe a data.'
  else if (diario.data > dia) e.data = 'O diário não pode ser de um dia que ainda não chegou.'
  else if (!podeEditarPresenca(perfil, diario.data, dia)) e.data = `O mestre lança diário só até ${DIAS_CORRECAO_MESTRE} dias atrás.`
  else if (existentes.some((d) => d.data === diario.data)) e.data = DIARIO_REPETIDO
  if (!CLIMAS.includes(diario.clima_manha)) e.clima_manha = 'Escolha o clima da manhã.'
  if (!CLIMAS.includes(diario.clima_tarde)) e.clima_tarde = 'Escolha o clima da tarde.'
  if (!(diario.servicos || '').trim()) e.servicos = 'Escreva os serviços executados.'
  return e
}
