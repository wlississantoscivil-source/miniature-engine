// Leitor da planilha da licitação. Regra pura: recebe as linhas já tiradas do
// .xlsx (uma lista de listas de células, como o SheetJS entrega com
// `sheet_to_json(aba, { header: 1, raw: true, defval: null })`) e devolve
// etapas, itens, erros e conferências. O SheetJS em si fica na tela.
//
// Feito em cima da planilha real da escola de Aporá (aba "SINTETICO"):
// - cabeçalho solto em cima: rótulo numa célula e valor logo abaixo dela
//   (Objeto, BDI, Referência);
// - tabela: Item | Código | Banco | Descrição | Und | Quant. | Valor Unit |
//   Valor Unit com BDI | Total | Peso (%);
// - linha sem código = etapa ("3", "3.1", "3.1.1"); com código = item;
// - no fim, "Total sem BDI", "Total do BDI" e "Total Geral".
// Fiel à planilha: nada é renomeado; a etapa vale pelo NÚMERO, nunca pelo nome
// (Aporá repete "FUNDAÇÕES" em 3 e 23).

// Texto comparável: sem acento, minúsculo, sem pontuação nas pontas.
export const normalizar = (v) =>
  String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const texto = (v) => (v == null ? '' : String(v).trim())

// Número de verdade ou texto "1.234,56" / "1234.56". Vazio = null; lixo = NaN.
export function numero(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(/^r\$\s*/i, '')
  if (!s) return null
  const br = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+,\d+$/.test(s)
  const n = Number(br ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : NaN
}

const centavos = (v) => Math.round(v * 100) / 100

// ─── Colunas ────────────────────────────────────────────────────────────────
// Reconhece cada coluna pelo nome, aceitando variações de órgão para órgão.
export function identificarColunas(cabecalho) {
  const col = {}
  const nomes = cabecalho.map(normalizar)
  const unitarias = []
  nomes.forEach((n, i) => {
    if (!n) return
    if (col.item == null && /^(item|it)$/.test(n)) col.item = i
    else if (col.codigo == null && /^cod/.test(n)) col.codigo = i
    else if (col.banco == null && /^(banco|fonte|base)/.test(n)) col.banco = i
    else if (col.descricao == null && /^(descri|especifica|discrimina)/.test(n)) col.descricao = i
    else if (col.unidade == null && /^(und|unid|un\b|un\.?$)/.test(n)) col.unidade = i
    else if (col.quantidade == null && /^(quant|qtd|qtde)/.test(n)) col.quantidade = i
    else if (/unit/.test(n)) unitarias.push({ i, n })
    else if (col.total == null && /^(total|valor total|preco total|vl\.? total)/.test(n)) col.total = i
    else if (col.peso == null && /^peso/.test(n)) col.peso = i
  })
  // Coluna unitária: "com BDI" = preço; "sem BDI" ou a outra = custo.
  const com = unitarias.find((u) => /com bdi/.test(u.n))
  const sem = unitarias.find((u) => /sem bdi|custo/.test(u.n))
  if (com) {
    col.preco = com.i
    const outra = sem || unitarias.find((u) => u !== com)
    if (outra) col.custo = outra.i
  } else if (sem) {
    col.custo = sem.i
    const outra = unitarias.find((u) => u !== sem)
    if (outra) col.preco = outra.i
  } else if (unitarias.length) {
    // Uma unitária só, sem dizer se tem BDI: é o preço do contrato.
    col.preco = unitarias[0].i
  }
  return col
}

export const COLUNAS_OBRIGATORIAS = ['item', 'descricao', 'quantidade', 'preco']

// A linha de cabeçalho é a primeira que tem "Item" e "Descrição".
export function acharCabecalho(linhas) {
  return linhas.findIndex((l) => {
    const n = (l || []).map(normalizar)
    return n.some((c) => /^(item|it)$/.test(c)) && n.some((c) => /^(descri|especifica|discrimina)/.test(c))
  })
}

// ─── Cabeçalho solto (acima da tabela) ──────────────────────────────────────
// Rótulo numa célula; valor logo abaixo ou, se não houver, logo à direita.
function valorDoRotulo(linhas, r, c) {
  const abaixo = linhas[r + 1]?.[c]
  if (abaixo != null && abaixo !== '') return abaixo
  const linha = linhas[r] || []
  for (let k = c + 1; k < linha.length; k++) if (linha[k] != null && linha[k] !== '') return linha[k]
  return null
}

export function lerInformacoes(linhas, ateLinha) {
  const info = { objeto: null, bdi_percentual: null, referencia_precos: null }
  for (let r = 0; r < ateLinha; r++) {
    (linhas[r] || []).forEach((cel, c) => {
      const n = normalizar(cel)
      if (!n) return
      if (info.objeto == null && /^objeto:?$/.test(n)) info.objeto = texto(valorDoRotulo(linhas, r, c)) || null
      else if (info.bdi_percentual == null && /^bdi:?$/.test(n)) {
        // Só o primeiro BDI: o segundo do cabeçalho de Aporá (diferenciado) é ignorado.
        const v = numero(valorDoRotulo(linhas, r, c))
        if (Number.isFinite(v)) info.bdi_percentual = centavos(v < 1 ? v * 100 : v)
      } else if (info.referencia_precos == null && /^refer/.test(n)) {
        info.referencia_precos = texto(valorDoRotulo(linhas, r, c)).replace(/\s*\n\s*/g, ', ') || null
      }
    })
  }
  return info
}

// ─── Linhas do orçamento ────────────────────────────────────────────────────
const FIM = /^(total sem bdi|total do bdi|total geral|total com bdi|valor total da obra)/

// Lê a planilha inteira. `colunasForcadas` deixa a pessoa corrigir na prévia.
export function lerPlanilha(linhas, colunasForcadas) {
  const iCab = acharCabecalho(linhas)
  if (iCab < 0) {
    return { ok: false, erroGeral: 'Não achei a linha de cabeçalho da tabela (com "Item" e "Descrição").', etapas: [], itens: [], erros: [], avisos: [] }
  }
  const colunas = { ...identificarColunas(linhas[iCab]), ...(colunasForcadas || {}) }
  const faltando = COLUNAS_OBRIGATORIAS.filter((k) => colunas[k] == null)
  const info = lerInformacoes(linhas, iCab)
  const res = {
    ok: true, cabecalho: linhas[iCab], linhaCabecalho: iCab + 1, colunas, faltando, info,
    etapas: [], itens: [], erros: [], avisos: [], totaisPlanilha: { sem_bdi: null, geral: null },
  }
  if (faltando.length) {
    res.ok = false
    res.erroGeral = `Não achei a coluna de: ${faltando.join(', ')}. Escolha a coluna certa na prévia.`
    return res
  }

  const cel = (l, k) => (colunas[k] == null ? null : l[colunas[k]])
  const porNumero = new Map()
  let etapaAtual = null
  let ordem = 0

  for (let r = iCab + 1; r < linhas.length; r++) {
    const l = linhas[r] || []
    const linhaNum = r + 1
    // Fim da tabela: "Total sem BDI", "Total Geral"... em qualquer coluna.
    const rotuloFim = l.map(normalizar).find((c) => FIM.test(c))
    if (rotuloFim) {
      // Lê os totais do rodapé (rótulo e valor à direita), até a linha acabar.
      for (let k = r; k < Math.min(linhas.length, r + 6); k++) {
        const lk = linhas[k] || []
        lk.forEach((c, j) => {
          const n = normalizar(c)
          const valor = lk.slice(j + 1).map(numero).find((x) => Number.isFinite(x))
          if (/^total sem bdi/.test(n)) res.totaisPlanilha.sem_bdi = valor ?? null
          if (/^total geral|^valor total da obra/.test(n)) res.totaisPlanilha.geral = valor ?? null
        })
      }
      break
    }
    const item = texto(cel(l, 'item'))
    const codigo = texto(cel(l, 'codigo'))
    const descricao = texto(cel(l, 'descricao'))
    if (!item && !codigo && !descricao) continue // linha vazia

    if (!codigo) {
      // Etapa ou subetapa: o nível vem do número.
      if (!item) { res.avisos.push({ linha: linhaNum, msg: 'Linha sem número nem código: ignorada.' }); continue }
      if (porNumero.has(item)) { res.erros.push({ linha: linhaNum, msg: `Número de etapa repetido: ${item}.` }); continue }
      const nivel = item.split('.').filter(Boolean).length
      // O banco guarda etapas de nível 1 a 3 (PRD-BACKEND, etapas_obra).
      if (nivel > 3) {
        res.erros.push({ linha: linhaNum, msg: `A etapa ${item} tem ${nivel} níveis; o app aceita até 3 (ex.: 3.1.2).` })
        etapaAtual = null
        continue
      }
      const pai = item.includes('.') ? item.split('.').slice(0, -1).join('.') : null
      const etapa = { numero: item, nome: descricao, nivel, numero_pai: pai, ordem: ++ordem, linha: linhaNum }
      if (pai && !porNumero.has(pai)) res.avisos.push({ linha: linhaNum, msg: `A etapa ${item} não tem a etapa ${pai} acima dela.` })
      res.etapas.push(etapa)
      porNumero.set(item, etapa)
      etapaAtual = etapa
      continue
    }

    // Item de serviço.
    const quantidade = numero(cel(l, 'quantidade'))
    const preco = numero(cel(l, 'preco'))
    const custoLido = numero(cel(l, 'custo'))
    const total = numero(cel(l, 'total'))
    const motivos = []
    if (!etapaAtual) motivos.push('item antes de qualquer etapa')
    if (!Number.isFinite(quantidade)) motivos.push('quantidade não é número')
    if (!Number.isFinite(preco)) motivos.push('preço não é número')
    if (colunas.custo != null && custoLido != null && !Number.isFinite(custoLido)) motivos.push('valor sem BDI não é número')
    if (motivos.length) { res.erros.push({ linha: linhaNum, msg: `${item || codigo}: ${motivos.join('; ')}.` }); continue }
    if (Number.isFinite(total) && Math.abs(centavos(quantidade * preco) - total) > 0.05) {
      res.avisos.push({ linha: linhaNum, msg: `${item}: quantidade × preço (${centavos(quantidade * preco)}) diferente do total da linha (${total}).` })
    }
    res.itens.push({
      item, codigo, banco: texto(cel(l, 'banco')) || null, descricao, unidade: texto(cel(l, 'unidade')),
      quantidade, preco_unitario: preco,
      // Total da linha como está na planilha (já arredondado linha a linha).
      total: Number.isFinite(total) ? total : centavos(quantidade * preco),
      // Sem coluna de valor sem BDI, o custo sai na hora de gravar (preço ÷ (1 + BDI)).
      custo_unitario: Number.isFinite(custoLido) ? custoLido : null,
      etapa_numero: etapaAtual.numero, ordem: ++ordem, linha: linhaNum,
    })
  }
  return res
}

// Custo sem BDI de cada item: o da planilha; sem ele, preço ÷ (1 + BDI).
export function completarCusto(itens, bdiPercentual) {
  const fator = 1 + (Number(bdiPercentual) || 0) / 100
  return itens.map((i) => ({ ...i, custo_unitario: i.custo_unitario ?? centavos(i.preco_unitario / fator) }))
}

// Totais da obra. O com BDI soma a coluna Total da planilha (já arredondada
// linha a linha), nunca quantidade × preço: a soma não bate com o arquivo.
export function totaisItens(itens) {
  return {
    total: centavos(itens.reduce((t, i) => t + Number(i.total), 0)),
    sem_bdi: centavos(itens.reduce((t, i) => t + i.quantidade * i.custo_unitario, 0)),
  }
}

// Conferências da prévia: soma dos itens × totais lidos do rodapé.
export function conferir(leitura, bdiPercentual) {
  const itens = completarCusto(leitura.itens, bdiPercentual)
  const { total, sem_bdi: semBdi } = totaisItens(itens)
  const { geral, sem_bdi: semBdiPlanilha } = leitura.totaisPlanilha || {}
  return {
    total, sem_bdi: semBdi,
    zerados: itens.filter((i) => i.quantidade === 0).length,
    diferenca_total: geral == null ? null : centavos(total - geral),
    diferenca_sem_bdi: semBdiPlanilha == null ? null : centavos(semBdi - semBdiPlanilha),
  }
}

// Mesma planilha numa obra que já tem compras: cada compra volta para a etapa
// de MESMO NÚMERO; sem par, vai para "Sem etapa / Administração" (null).
export function religarEtapas(compras, etapasAntigas, etapasNovas) {
  const numeroAntigo = new Map(etapasAntigas.map((e) => [e.id, e.numero]))
  const idNovo = new Map(etapasNovas.map((e) => [e.numero, e.id]))
  let semPar = 0
  const religadas = compras.map((c) => {
    if (!c.etapa_id) return c
    const novo = idNovo.get(numeroAntigo.get(c.etapa_id))
    if (!novo) semPar++
    return { ...c, etapa_id: novo || null }
  })
  return { compras: religadas, semPar }
}

// "3 – FUNDAÇÕES": a etapa aparece sempre com o número (os nomes se repetem).
export const rotuloEtapa = (e) => (e ? `${e.numero} – ${String(e.nome).replace(/\s*\n\s*/g, ' ')}` : 'Sem etapa / Administração')
