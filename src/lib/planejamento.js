// Planejamento da obra (Last Planner): EAP, longo, médio e curto prazo.
// Regras puras: código automático da EAP, árvore, dias úteis, validação.
// Sem React, sem banco, sem `window`. Teste em tests/planejamento.mjs.
import { diaDaSemana, diasEntre, fmtDiaMes, somarDias } from './regras.js'
import { rotuloMes } from './orcamento.js'

// ─── Calendário de trabalho (dias úteis) ────────────────────────────────────
// Dias de trabalho pelo nome do dia (como `diaDaSemana` devolve).
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
// Feriados nacionais fixos de 2026 e 2027 (mais a Sexta-feira Santa).
// ⚠ A lista acaba em 2027: antes de 2028, acrescente o ano (tests/planejamento.mjs avisa).
// Ainda não há tela para feriado da cidade nem para mudar os dias de trabalho.
export const FERIADOS_NACIONAIS = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15', '2026-11-20', '2026-12-25',
  '2027-01-01', '2027-03-26', '2027-04-21', '2027-05-01', '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
]
export const CALENDARIO_PADRAO = { dias: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], feriados: FERIADOS_NACIONAIS }

export const ehDiaUtil = (iso, cal = CALENDARIO_PADRAO) => cal.dias.includes(diaDaSemana(iso)) && !cal.feriados.includes(iso)

// O próprio dia, se for útil; senão, o próximo dia útil.
export function proximoDiaUtil(iso, cal = CALENDARIO_PADRAO) {
  let d = iso
  for (let k = 0; k < 30 && !ehDiaUtil(d, cal); k++) d = somarDias(d, 1)
  return d
}

// Quantos dias úteis de `inicio` a `fim`, contando os dois.
export function diasUteis(inicio, fim, cal = CALENDARIO_PADRAO) {
  if (!inicio || !fim || fim < inicio) return 0
  let n = 0
  for (let d = inicio; d <= fim; d = somarDias(d, 1)) if (ehDiaUtil(d, cal)) n++
  return n
}

// ─── EAP ────────────────────────────────────────────────────────────────────
export const NIVEL_MAXIMO = 3
// Atividade de verdade (não é grupo nem arquivada): a que entra no quadro e recebe restrição.
export const ehFolha = (l) => !l.arquivada && l.filhos === 0 // como a planilha da licitação: 1 → 1.1 → 1.1.1

const irmaos = (lista, paiId) => lista.filter((a) => (a.pai_id || null) === (paiId || null)).sort((a, b) => a.ordem - b.ordem)

// Monta a EAP na ordem de leitura, com código, nível e o que vem dos filhos.
// Atividade arquivada (ou dentro de uma arquivada) fica sem código e não
// entra nas contas do pai; aparece só quando `comArquivadas`.
// Pai com filhos ativos: datas = do primeiro início ao último fim dos filhos;
// progresso = média dos filhos pesada pelos dias úteis de cada um.
export function montarEap(atividades, { comArquivadas = false, cal = CALENDARIO_PADRAO } = {}) {
  const linhas = []
  function visitar(paiId, prefixo, nivel, dentroDeArquivada) {
    let n = 0
    const saida = []
    for (const a of irmaos(atividades, paiId)) {
      const arquivada = dentroDeArquivada || !!a.arquivada
      const codigo = arquivada ? null : `${prefixo}${++n}`
      const linha = { ...a, codigo, nivel, arquivada, filhos: 0 }
      if (!arquivada || comArquivadas) linhas.push(linha)
      const filhos = visitar(a.id, codigo ? `${codigo}.` : prefixo, nivel + 1, arquivada).filter((f) => !f.arquivada)
      linha.filhos = filhos.length
      if (filhos.length) {
        linha.inicio = filhos.reduce((m, f) => (f.inicio < m ? f.inicio : m), filhos[0].inicio)
        linha.fim = filhos.reduce((m, f) => (f.fim > m ? f.fim : m), filhos[0].fim)
        const pesos = filhos.map((f) => Math.max(1, diasUteis(f.inicio, f.fim, cal)))
        const total = pesos.reduce((s, p) => s + p, 0)
        linha.progresso = Math.round(filhos.reduce((s, f, k) => s + f.progresso * pesos[k], 0) / total)
      }
      linha.dias_uteis = diasUteis(linha.inicio, linha.fim, cal)
      saida.push(linha)
    }
    return saida
  }
  visitar(null, '', 1, false)
  return linhas
}

// A atividade e tudo o que está dentro dela.
function descendentes(atividades, id) {
  const ids = [id]
  for (let k = 0; k < ids.length; k++) for (const a of atividades) if (a.pai_id === ids[k]) ids.push(a.id)
  return ids
}
// Maior profundidade abaixo da atividade (0 = sem filhos).
const alturaDe = (atividades, id) => {
  const filhos = atividades.filter((a) => a.pai_id === id)
  return filhos.length ? 1 + Math.max(...filhos.map((f) => alturaDe(atividades, f.id))) : 0
}

// Onde a atividade pode ficar: qualquer ativa até o nível 2, fora ela mesma
// e o que está dentro dela, e sem passar do nível 3 com os filhos que ela já tem.
export function paisPossiveis(atividades, id = null) {
  const proibidos = id ? descendentes(atividades, id) : []
  const altura = id ? alturaDe(atividades, id) : 0
  return montarEap(atividades).filter((l) => !proibidos.includes(l.id) && l.nivel + 1 + altura <= NIVEL_MAXIMO)
}

// Erros do formulário de atividade, por campo. Vazio = pode salvar.
// `temFilhos`: as datas vêm dos filhos, então não são cobradas.
export function errosAtividade(campos, atividades, { id = null, temFilhos = false } = {}) {
  const e = {}
  if (!campos.titulo?.trim()) e.titulo = 'Diga o nome da atividade.'
  else if (campos.titulo.trim().length > 120) e.titulo = 'Use até 120 letras.'
  if (!temFilhos) {
    if (!campos.inicio) e.inicio = 'Diga quando começa.'
    if (!campos.fim) e.fim = 'Diga quando termina.'
    else if (campos.inicio && campos.fim < campos.inicio) e.fim = 'O fim não pode ser antes do início.'
    if (campos.inicio && campos.fim && !e.fim && diasUteis(campos.inicio, campos.fim) === 0) e.fim = 'O período não tem nenhum dia útil.'
  }
  if (campos.pai_id && !paisPossiveis(atividades, id).some((l) => l.id === campos.pai_id)) {
    e.pai_id = `Não dá para pôr aqui: a EAP vai até o nível ${NIVEL_MAXIMO} e uma atividade não fica dentro dela mesma.`
  }
  return e
}

// Filho de grupo arquivado não volta sozinho: o grupo precisa voltar antes.
export function erroDesarquivar(atividades, id) {
  const a = atividades.find((x) => x.id === id)
  for (let pai = atividades.find((x) => x.id === a?.pai_id); pai; pai = atividades.find((x) => x.id === pai.pai_id)) {
    if (pai.arquivada) return `Está dentro de "${pai.titulo}", que está arquivado. Desarquive o grupo primeiro.`
  }
  return null
}

// Próximo número de ordem entre os irmãos (vai para o fim da lista).
export const proximaOrdem = (atividades, paiId) => Math.max(0, ...irmaos(atividades, paiId).map((a) => a.ordem)) + 1

// Troca a atividade de lugar com a irmã de cima (-1) ou de baixo (+1), entre as ativas.
// Devolve as duas linhas com a ordem nova, ou [] se já está na ponta.
export function trocarOrdem(atividades, id, direcao) {
  const a = atividades.find((x) => x.id === id)
  if (!a) return []
  const lado = irmaos(atividades, a.pai_id).filter((x) => !x.arquivada)
  const k = lado.findIndex((x) => x.id === id)
  const outra = lado[k + direcao]
  if (!outra) return []
  return [{ id: a.id, ordem: outra.ordem }, { id: outra.id, ordem: a.ordem }]
}

// ─── Abas e permissões do módulo ────────────────────────────────────────────
// Ciclo de uso: EAP → Longo prazo → Médio prazo (restrições) → Curto prazo (semana).
const ABAS_PLANEJAMENTO = [
  { id: 'eap', rotulo: 'EAP' },
  { id: 'longo', rotulo: 'Longo prazo' },
  { id: 'medio', rotulo: 'Médio prazo' },
  { id: 'curto', rotulo: 'Curto prazo' },
]
// O mestre só trabalha a semana (curto prazo); engenheiro e auxiliar veem tudo.
export const abasPlanejamento = (role) => (role === 'Mestre' ? ABAS_PLANEJAMENTO.filter((a) => a.id === 'curto') : ABAS_PLANEJAMENTO)
// Montar e mudar a EAP: quem vê a obra, menos o mestre.
export const podeEditarEap = (role, acesso) => !!acesso?.ver && role !== 'Mestre'

// ─── Longo prazo: previsto x real e escala do cronograma ────────────────────
// Previsto = parte dos dias úteis do período que já passou (até ontem).
export function progressoPrevisto(linha, dia, cal = CALENDARIO_PADRAO) {
  if (dia <= linha.inicio) return 0
  if (dia > linha.fim) return 100
  const total = diasUteis(linha.inicio, linha.fim, cal)
  return total ? Math.round((diasUteis(linha.inicio, somarDias(dia, -1), cal) / total) * 100) : 0
}

// Folga antes de acender o âmbar: até 10 pontos abaixo do previsto ainda é "em dia".
const TOLERANCIA_PREVISTO = 10
// Situação no prazo, para a cor da barra. Só pinta o que pede ação (regra visual).
export function situacaoPrazo(linha, dia, cal = CALENDARIO_PADRAO) {
  if (linha.progresso >= 100) return { texto: 'Concluída', tom: 'ne' }
  if (linha.fim < dia) return { texto: 'Atrasada', tom: 'cr' }
  const previsto = progressoPrevisto(linha, dia, cal)
  if (previsto - linha.progresso > TOLERANCIA_PREVISTO) return { texto: 'Abaixo do previsto', tom: 'at' }
  if (linha.inicio > dia) return { texto: 'Não começou', tom: 'ne' }
  return { texto: 'Em dia', tom: 'ne' }
}

// Tom do "Real" da obra: âmbar só quando passa da folga abaixo do previsto.
export const tomReal = ({ previsto, real }) => (previsto - real > TOLERANCIA_PREVISTO ? 'at' : '')

// A obra inteira: média dos grupos principais pesada pelos dias úteis.
export function resumoPrazo(linhas, dia, cal = CALENDARIO_PADRAO) {
  const topo = linhas.filter((l) => l.nivel === 1 && !l.arquivada)
  const folhas = linhas.filter(ehFolha)
  const pesos = topo.map((l) => Math.max(1, l.dias_uteis))
  const total = pesos.reduce((s, p) => s + p, 0)
  const media = (f) => (total ? Math.round(topo.reduce((s, l, k) => s + f(l) * pesos[k], 0) / total) : 0)
  return {
    previsto: media((l) => progressoPrevisto(l, dia, cal)),
    real: media((l) => l.progresso),
    atrasadas: folhas.filter((l) => situacaoPrazo(l, dia, cal).tom === 'cr').length,
    abaixo: folhas.filter((l) => situacaoPrazo(l, dia, cal).tom === 'at').length,
  }
}

const primeiroDoMes = (iso) => `${iso.slice(0, 7)}-01`
const proximoMes = (iso) => {
  const [a, m] = iso.split('-').map(Number)
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
}

// Colunas do cronograma (semanas de segunda a domingo, ou meses) cobrindo
// todas as atividades. `pos(iso)` diz onde a data cai, em % da largura.
export function escalaCronograma(linhas, modo) {
  const ativas = linhas.filter((l) => !l.arquivada && l.inicio && l.fim)
  if (!ativas.length) return { colunas: [], pos: () => 0 }
  const min = ativas.reduce((m, l) => (l.inicio < m ? l.inicio : m), ativas[0].inicio)
  const max = ativas.reduce((m, l) => (l.fim > m ? l.fim : m), ativas[0].fim)
  const colunas = []
  if (modo === 'semana') {
    for (let d = semanaDe(min); d <= max; d = somarDias(d, 7)) colunas.push({ inicio: d, fim: somarDias(d, 6), rotulo: fmtDiaMes(d) })
  } else {
    for (let d = primeiroDoMes(min); d <= max; d = proximoMes(d)) colunas.push({ inicio: d, fim: somarDias(proximoMes(d), -1), rotulo: rotuloMes(d) })
  }
  const ini = colunas[0].inicio
  const dias = diasEntre(ini, colunas[colunas.length - 1].fim) + 1
  // Início da data = borda esquerda do dia; use somarDias(fim, 1) para a borda direita.
  const pos = (iso) => Math.min(100, Math.max(0, (diasEntre(ini, iso) / dias) * 100))
  return { colunas, pos }
}

// Progresso digitado: número inteiro de 0 a 100.
export function erroProgresso(valor) {
  if (valor === '' || valor == null) return 'Diga o progresso, de 0 a 100.'
  if (!/^\d+$/.test(String(valor))) return 'Use só números, sem vírgula.'
  if (Number(valor) > 100) return 'O máximo é 100%.'
  return null
}

// ─── Status da semana (quadro do curto prazo) ───────────────────────────────
export const STATUS_ATIVIDADE = ['A fazer', 'Em andamento', 'Concluído']
// Mudou o progresso: o status acompanha (100% = Concluído; começou = Em andamento).
export function statusPeloProgresso(status, progresso) {
  if (progresso >= 100) return 'Concluído'
  if (progresso > 0) return 'Em andamento'
  return status === 'Concluído' ? 'Em andamento' : status || STATUS_ATIVIDADE[0]
}

// ─── Médio prazo (lookahead): restrições por semana ─────────────────────────
// Restrição = o que impede a atividade de começar ou seguir. A semana dela é a do prazo.
export const TIPOS_RESTRICAO = ['Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística']
export const SEMANAS_LOOKAHEAD = [3, 4, 5, 6]

// Segunda-feira da semana da data (a semana vai de segunda a domingo).
export const semanaDe = (iso) => somarDias(iso, -DIAS_SEMANA.indexOf(diaDaSemana(iso)))

// "Esta semana", "Próxima semana", "Semana passada" ou "Semana de dd/mm" (segundas-feiras).
export function rotuloSemana(semana, atual) {
  if (semana === atual) return 'Esta semana'
  if (semana === somarDias(atual, 7)) return 'Próxima semana'
  if (semana === somarDias(atual, -7)) return 'Semana passada'
  return `Semana de ${fmtDiaMes(semana)}`
}

// Restrição aberta com prazo antes de hoje.
export const restricaoVencida = (r, dia) => !r.resolvida && r.prazo < dia
// Atividade impedida = tem restrição aberta.
export const restricoesAbertas = (restricoes, atividadeId) => restricoes.filter((r) => r.atividade_id === atividadeId && !r.resolvida)

// Quadro das próximas `semanas` semanas, a partir da atual. Restrição aberta que
// venceu fica na semana atual (em vermelho), para não sumir do quadro.
// `linhas` = montarEap(...): conta as atividades (sem filhos) que cruzam cada semana.
export function montarLookahead(restricoes, linhas, { dia, semanas = 4, responsavel = '', comResolvidas = false }) {
  const atual = semanaDe(dia)
  const colunas = Array.from({ length: semanas }, (_, k) => {
    const inicio = somarDias(atual, 7 * k)
    return { inicio, fim: somarDias(inicio, 6), rotulo: rotuloSemana(inicio, atual), restricoes: [], atividades: 0, impedidas: 0 }
  })
  const ultimaFim = colunas[colunas.length - 1].fim
  let depois = 0
  const visiveis = restricoes
    .filter((r) => (!responsavel || r.responsavel === responsavel) && (comResolvidas || !r.resolvida))
    .sort((a, b) => (a.prazo < b.prazo ? -1 : a.prazo > b.prazo ? 1 : 0))
  for (const r of visiveis) {
    const semana = r.resolvida ? semanaDe(r.prazo) : (r.prazo < atual ? atual : semanaDe(r.prazo))
    const col = colunas.find((c) => c.inicio === semana)
    if (col) col.restricoes.push(r)
    else if (semana > ultimaFim && !r.resolvida) depois++
  }
  for (const c of colunas) {
    const daSemana = linhas.filter((l) => ehFolha(l) && l.progresso < 100 && l.inicio <= c.fim && l.fim >= c.inicio)
    c.atividades = daSemana.length
    c.impedidas = daSemana.filter((l) => restricoesAbertas(restricoes, l.id).length).length
  }
  const responsaveis = [...new Set(restricoes.map((r) => r.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return { colunas, depois, responsaveis }
}

// Mover uma semana para trás (-1) ou para frente (+1): o prazo anda 7 dias.
// Vencida conta a partir de hoje (ela aparece na semana atual). Nunca vai para semana que já passou.
export function novoPrazo(r, direcao, dia) {
  const base = restricaoVencida(r, dia) ? dia : r.prazo
  const prazo = somarDias(base, 7 * direcao)
  if (semanaDe(prazo) < semanaDe(dia)) return { erro: 'Não dá para pôr numa semana que já passou.' }
  return { prazo: prazo < dia ? dia : prazo }
}

// Dá para voltar uma semana? (aberta e sem cair numa semana que já passou)
export const podeVoltarSemana = (r, dia) => !r.resolvida && !novoPrazo(r, -1, dia).erro
// Prazo que já vem no formulário de restrição nova: o início da coluna, nunca antes de hoje.
export const prazoNovaRestricao = (sugerido, dia) => (sugerido < dia ? dia : sugerido)

// Erros do formulário de restrição, por campo. Vazio = pode salvar.
// Restrição nova não nasce com prazo vencido (`dia` = hoje); a antiga pode manter o dela.
export function errosRestricao(campos, linhas, { dia = null, nova = false } = {}) {
  const e = {}
  if (!campos.descricao?.trim()) e.descricao = 'Diga o que está impedindo.'
  else if (campos.descricao.trim().length > 200) e.descricao = 'Use até 200 letras.'
  if (!TIPOS_RESTRICAO.includes(campos.tipo)) e.tipo = 'Escolha o tipo.'
  if (!campos.prazo) e.prazo = 'Diga até quando precisa estar resolvida.'
  else if (nova && dia && campos.prazo < dia) e.prazo = 'O prazo não pode ser antes de hoje.'
  if (!campos.responsavel?.trim()) e.responsavel = 'Diga quem vai resolver.'
  const ativ = linhas.find((l) => l.id === campos.atividade_id)
  if (!ativ) e.atividade_id = 'Escolha a atividade impedida.'
  else if (!ehFolha(ativ)) e.atividade_id = 'Escolha uma atividade (não um grupo nem uma arquivada).'
  return e
}

// ─── Curto prazo: a semana, o quadro e o PPC ────────────────────────────────
// Causa raiz de "Não realizado" (Last Planner): o que impediu de cumprir o combinado.
export const CAUSAS_NAO_REALIZADO = ['Material', 'Mão de obra', 'Projeto', 'Clima', 'Equipamento', 'Método', 'Segurança', 'Logística', 'Atividade anterior atrasada', 'Outro']

// Atividades da semana (começando na segunda `semana`): as que cruzam a semana
// e as que deveriam ter terminado antes dela e não terminaram (acumuladas).
// Só atividades (sem subatividades) e não arquivadas.
export function atividadesDaSemana(linhas, semana) {
  const fim = somarDias(semana, 6)
  return linhas
    .filter(ehFolha)
    .map((l) => ({ ...l, acumulada: l.fim < semana && l.status !== 'Concluído' }))
    .filter((l) => (l.inicio <= fim && l.fim >= semana) || l.acumulada)
}

// PPC = Percentual do Plano Concluído: concluídas ÷ planejadas da semana × 100.
export function ppcDaSemana(daSemana) {
  const total = daSemana.length
  const concluidas = daSemana.filter((l) => l.status === 'Concluído').length
  return { total, concluidas, ppc: total ? Math.round((concluidas / total) * 100) : null }
}
// Tom do PPC: abaixo de 50% vermelho, abaixo de 80% âmbar; dali para cima, neutro.
export const tomPpc = (ppc) => (ppc == null || ppc >= 80 ? '' : ppc < 50 ? 'cr' : 'at')

// Causas de "Não realizado" na semana, da mais frequente para a menos.
export function causasDaSemana(daSemana, subtarefas, semana) {
  const ids = new Set(daSemana.map((l) => l.id))
  const causas = [
    ...daSemana.filter((l) => naoRealizadaNaSemana(l, semana)).map((l) => l.causa_nao_realizado),
    ...subtarefas.filter((s) => ids.has(s.atividade_id) && !s.feita && s.causa_nao_realizado).map((s) => s.causa_nao_realizado),
  ]
  const conta = {}
  for (const c of causas) conta[c] = (conta[c] || 0) + 1
  return Object.entries(conta).map(([causa, n]) => ({ causa, n })).sort((a, b) => b.n - a.n || a.causa.localeCompare(b.causa, 'pt-BR'))
}

// Moveu no quadro: o progresso acompanha (Concluído = 100%; saiu de Concluído = deixa de ser 100%).
export function progressoPeloStatus(status, progresso) {
  if (status === 'Concluído') return 100
  if (progresso < 100) return progresso
  return status === 'Em andamento' ? 90 : 0
}

// Coluna do quadro em que a atividade está (sem status = a primeira, "A fazer").
export const statusDe = (l) => l.status || STATUS_ATIVIDADE[0]
// Foi marcada "Não realizado" NESTA semana?
export const naoRealizadaNaSemana = (l, semana) => l.semana_nao_realizado === semana && !!l.causa_nao_realizado
// Checklist de uma atividade, na ordem em que foi criado.
export const subtarefasDe = (subtarefas, atividadeId) => subtarefas.filter((s) => s.atividade_id === atividadeId).sort((a, b) => a.ordem - b.ordem)

export const erroCausa = (causa) => (CAUSAS_NAO_REALIZADO.includes(causa) ? null : 'Escolha a causa: o que impediu de fazer?')
export function erroSubtarefa(titulo) {
  if (!titulo?.trim()) return 'Diga o que precisa ser feito.'
  if (titulo.trim().length > 120) return 'Use até 120 letras.'
  return null
}
