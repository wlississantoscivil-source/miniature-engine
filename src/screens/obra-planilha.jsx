import { useState } from 'react'
import { Carregando, Empty, Icon, Tag, useCarregar, useToast } from '../components/index.jsx'
import { importarPlanilha, obterPlanilha } from '../lib/dados.js'
import { brl, fmtData } from '../lib/regras.js'
import { conferir, lerPlanilha, rotuloEtapa } from '../lib/planilha.js'

// Planilha da licitação (dentro de Dados da obra; importar é só do engenheiro).
// O leitor de Excel (SheetJS) é carregado só aqui, na hora de ler o arquivo,
// para o resto do app não ficar mais pesado.
const NOMES_COLUNA = {
  item: 'Item', codigo: 'Código', banco: 'Banco', descricao: 'Descrição', unidade: 'Unidade',
  quantidade: 'Quantidade', custo: 'Valor unit. sem BDI', preco: 'Valor unit. com BDI', total: 'Total',
}
const qtd = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 })

export default function PlanilhaLicitacao({ perfil, obra }) {
  const dados = useCarregar(() => obterPlanilha(perfil, obra.id), [obra.id])
  const [previa, setPrevia] = useState(null) // { linhas, leitura, arquivo, bdi, forcadas }
  const [lendo, setLendo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const toast = useToast()

  async function escolherArquivo(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setErro('')
    if (!/\.xlsx?$/i.test(arquivo.name)) return setErro('Escolha um arquivo do Excel (.xlsx).')
    if (arquivo.size > 10 * 1024 * 1024) return setErro('O arquivo passa de 10 MB.')
    setLendo(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' })
      // Uma aba só (como em Aporá) ou a primeira; com várias, a pessoa troca na prévia.
      const abas = wb.SheetNames
      const linhasDe = (nome) => XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: null, blankrows: true })
      const aba = abas[0]
      const linhas = linhasDe(aba)
      const leitura = lerPlanilha(linhas)
      setPrevia({ arquivo: arquivo.name, abas, aba, linhasDe, linhas, leitura, forcadas: {}, bdi: leitura.info?.bdi_percentual ?? '' })
    } catch (_e) {
      setErro('Não consegui ler este arquivo. Ele abre no Excel? Se abrir, salve de novo como .xlsx e tente outra vez.')
    }
    setLendo(false)
  }

  const trocarAba = (aba) => {
    const linhas = previa.linhasDe(aba)
    const leitura = lerPlanilha(linhas)
    setPrevia({ ...previa, aba, linhas, leitura, forcadas: {}, bdi: leitura.info?.bdi_percentual ?? previa.bdi })
  }
  const trocarColuna = (chave, indice) => {
    const forcadas = { ...previa.forcadas, [chave]: indice === '' ? undefined : Number(indice) }
    setPrevia({ ...previa, forcadas, leitura: lerPlanilha(previa.linhas, forcadas) })
  }

  async function confirmar() {
    setSalvando(true)
    const { data, erro: falha } = await importarPlanilha(perfil, obra.id, { leitura: previa.leitura, bdi_percentual: previa.bdi, arquivo_nome: previa.arquivo })
    setSalvando(false)
    if (falha) return setErro(falha)
    setPrevia(null)
    toast(data.compras_sem_etapa
      ? `Planilha importada. ${data.compras_sem_etapa} compras ficaram em "Sem etapa / Administração".`
      : 'Planilha importada.')
    dados.recarregar()
  }

  return (
    <Carregando estado={dados}>{(d) => {
      const seletor = d.pode_importar && (
        <label className={`btn ${d.planilha ? 'sec' : 'pri'}`} style={{ cursor: 'pointer' }}>
          <Icon n="clip" />{lendo ? 'Lendo…' : d.planilha ? 'Trocar planilha' : 'Anexar planilha (.xlsx)'}
          <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={escolherArquivo} disabled={lendo} />
        </label>
      )
      if (previa) return <Previa previa={previa} setPrevia={setPrevia} trocarAba={trocarAba} trocarColuna={trocarColuna} confirmar={confirmar} salvando={salvando} erro={erro} />
      return (
        <>
          {erro && <div className="alert cr"><Icon n="warn" />{erro}</div>}
          {!d.planilha || !d.itens.length ? (
            <Empty icone="tabela" titulo="Esta obra ainda não tem a planilha da licitação."
              texto={perfil.role === 'Engenheiro' ? 'Anexe o arquivo .xlsx para usar o Orçado x Realizado e a Medição.' : 'Só o engenheiro importa a planilha.'}>
              {seletor}
            </Empty>
          ) : (
            <>
              <div className="card pad col">
                <div className="sec-h">
                  <div>
                    <div className="h2">{d.planilha.arquivo_nome || 'Planilha da licitação'}</div>
                    <div className="note">Importada em {fmtData(d.planilha.importada_em.slice(0, 10))}{d.planilha.importada_por_nome ? ` por ${d.planilha.importada_por_nome}` : ''}</div>
                  </div>
                  {seletor}
                </div>
                {d.tem_medicao && <div className="alert at"><Icon n="warn" />A obra já tem medição: a planilha não pode mais ser trocada.</div>}
                {d.planilha.objeto && <div><span className="lab">Objeto</span><div>{d.planilha.objeto}</div></div>}
                <div className="dl">
                  <div><span className="lab">Referência</span><b>{d.planilha.referencia_precos || '—'}</b></div>
                  <div><span className="lab">BDI</span><b>{Number(d.planilha.bdi_percentual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</b></div>
                  <div><span className="lab">Etapas · itens</span><b>{d.resumo.etapas} · {d.resumo.itens}{d.resumo.zerados ? ` (${d.resumo.zerados} com quantidade 0)` : ''}</b></div>
                  <div><span className="lab">Total com BDI · sem BDI</span><b>{brl(d.resumo.total)} · {brl(d.resumo.sem_bdi)}</b></div>
                </div>
              </div>
              <TabelaPlanilha etapas={d.etapas} itens={d.itens} />
            </>
          )}
        </>
      )
    }}</Carregando>
  )
}

// A planilha como ficou: etapas (com o número) e itens, na ordem do arquivo.
function TabelaPlanilha({ etapas, itens }) {
  const linhas = [
    ...etapas.map((e) => ({ tipo: 'etapa', ordem: e.ordem, e })),
    ...itens.map((i) => ({ tipo: 'item', ordem: i.ordem, i })),
  ].sort((a, b) => a.ordem - b.ordem)
  return (
    <div className="card scroll-x planilha-box">
      <table className="tbl planilha">
        <thead><tr><th>Item</th><th>Código</th><th>Banco</th><th>Descrição</th><th>Und</th><th className="r">Quant.</th><th className="r">Unit. sem BDI</th><th className="r">Unit. com BDI</th><th className="r">Total</th></tr></thead>
        <tbody>
          {linhas.map((l) => (l.tipo === 'etapa'
            ? <tr key={`e${l.e.numero}`} className={`etapa n${l.e.nivel}`}><td colSpan={9}>{rotuloEtapa(l.e)}</td></tr>
            : (
              <tr key={`i${l.ordem}`} className={Number(l.i.quantidade) === 0 ? 'zerado' : ''}>
                <td>{l.i.item}</td><td>{l.i.codigo}</td><td>{l.i.banco}</td><td className="desc">{l.i.descricao}</td><td>{l.i.unidade}</td>
                <td className="r">{qtd(l.i.quantidade)}</td><td className="r">{brl(l.i.custo_unitario)}</td><td className="r">{brl(l.i.preco_unitario)}</td>
                <td className="r">{brl(l.i.total ?? l.i.quantidade * l.i.preco_unitario)}</td>
              </tr>
            )))}
        </tbody>
      </table>
    </div>
  )
}

function Previa({ previa, setPrevia, trocarAba, trocarColuna, confirmar, salvando, erro }) {
  const { leitura } = previa
  const c = leitura.ok ? conferir(leitura, previa.bdi) : null
  const podeConfirmar = leitura.ok && !leitura.erros.length && leitura.itens.length > 0
  const cab = leitura.cabecalho || []
  return (
    <>
      <div className="card pad col">
        <div className="sec-h">
          <div><span className="lab">Prévia · nada foi gravado ainda</span><div className="h2">{previa.arquivo}</div></div>
          <Tag tom={podeConfirmar ? 'ok' : 'cr'}>{podeConfirmar ? 'Pronta para importar' : 'Precisa de correção'}</Tag>
        </div>
        {previa.abas.length > 1 && (
          <div className="field">
            <label htmlFor="pl-aba">Aba da planilha</label>
            <select id="pl-aba" className="inp" value={previa.aba} onChange={(e) => trocarAba(e.target.value)}>
              {previa.abas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        )}
        {leitura.erroGeral && <div className="alert cr"><Icon n="warn" />{leitura.erroGeral}</div>}
        {leitura.info?.objeto && <div><span className="lab">Objeto</span><div>{leitura.info.objeto}</div></div>}
        <div className="dl">
          <div><span className="lab">Referência</span><b>{leitura.info?.referencia_precos || '—'}</b></div>
          <div>
            <label className="lab" htmlFor="pl-bdi">% de BDI da obra</label>
            <input id="pl-bdi" className="inp" inputMode="decimal" style={{ marginTop: 6 }} value={previa.bdi}
              onChange={(e) => setPrevia({ ...previa, bdi: e.target.value.replace(',', '.') })} />
            <div className="note">{leitura.colunas?.custo != null ? 'Informação: o custo sem BDI vem da coluna da planilha.' : 'A planilha não tem valor sem BDI: o custo será preço ÷ (1 + BDI).'}</div>
          </div>
        </div>
      </div>

      {cab.length > 0 && (
        <div className="card pad col">
          <span className="lab">Colunas identificadas (linha {leitura.linhaCabecalho} do arquivo)</span>
          <div className="colunas">
            {Object.entries(NOMES_COLUNA).map(([chave, nome]) => (
              <label key={chave} className="field">
                <span className="flabel">{nome}</span>
                <select className="inp" value={leitura.colunas[chave] ?? ''} onChange={(e) => trocarColuna(chave, e.target.value)}>
                  <option value="">— nenhuma —</option>
                  {cab.map((t, i) => <option key={i} value={i}>{String(t ?? `(coluna ${i + 1})`).trim() || `(coluna ${i + 1})`}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {c && (
        <div className="kpis">
          <div className="card kpi t"><span className="lab">Etapas</span><span className="n">{leitura.etapas.length}</span></div>
          <div className="card kpi t"><span className="lab">Itens</span><span className="n">{leitura.itens.length}</span><div className="d">{c.zerados} com quantidade 0</div></div>
          <div className={`card kpi ${c.diferenca_total ? 'at' : 'ok'}`}><span className="lab">Total com BDI</span><span className="n" style={{ fontSize: 22 }}>{brl(c.total)}</span>
            <div className="d">{c.diferenca_total == null ? 'sem "Total Geral" na planilha' : c.diferenca_total === 0 ? 'Soma dos itens bate com o Total Geral da planilha ✓' : `Diferença de ${brl(c.diferenca_total)} para o Total Geral`}</div></div>
          <div className={`card kpi ${c.diferenca_sem_bdi ? 'at' : 'ok'}`}><span className="lab">Total sem BDI</span><span className="n" style={{ fontSize: 22 }}>{brl(c.sem_bdi)}</span>
            <div className="d">{c.diferenca_sem_bdi == null ? 'sem "Total sem BDI" na planilha' : c.diferenca_sem_bdi === 0 ? 'Bate com o Total sem BDI ✓' : `Diferença de ${brl(c.diferenca_sem_bdi)} (arredondamento)`}</div></div>
        </div>
      )}

      {leitura.erros.length > 0 && (
        <div className="card list">
          <div className="list-h"><span className="nm cr-tx">{leitura.erros.length} {leitura.erros.length === 1 ? 'linha com erro' : 'linhas com erro'}</span></div>
          {leitura.erros.map((e, k) => <div className="row cr" key={k}><div className="tx"><div className="tt">Linha {e.linha}</div><div>{e.msg}</div></div></div>)}
        </div>
      )}
      {leitura.avisos.length > 0 && (
        <div className="card list">
          <div className="list-h"><span className="nm">{leitura.avisos.length} {leitura.avisos.length === 1 ? 'aviso' : 'avisos'} (não impedem a importação)</span></div>
          {leitura.avisos.slice(0, 30).map((e, k) => <div className="row at" key={k}><div className="tx"><div className="tt">Linha {e.linha}</div><div>{e.msg}</div></div></div>)}
        </div>
      )}

      {leitura.ok && <TabelaPlanilha etapas={leitura.etapas} itens={leitura.itens.map((i) => ({ ...i, custo_unitario: i.custo_unitario ?? i.preco_unitario / (1 + (Number(previa.bdi) || 0) / 100) }))} />}

      {erro && <div className="alert cr"><Icon n="warn" />{erro}</div>}
      <div className="sticky-save btns">
        <button className="btn pri" disabled={!podeConfirmar || salvando} onClick={confirmar}><Icon n="check" />{salvando ? 'Importando…' : 'Confirmar importação'}</button>
        <button className="btn sec" onClick={() => setPrevia(null)}>Cancelar</button>
      </div>
    </>
  )
}
