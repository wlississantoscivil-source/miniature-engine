import { useState } from 'react'
import { Topo, Carregando, Empty, Icon, SheetMensagem, useCarregar } from '../components/index.jsx'
import { notasPendentesGeral } from '../lib/dados.js'
import { brl, diasEsperandoNF, fmtData, hoje, mensagemCobrancaNF, nfAtrasada, soma } from '../lib/regras.js'

// Compras aguardando NF de todas as obras, por fornecedor e, dentro dele, por obra.
export default function NotasPendentes({ perfil, goto }) {
  const [obraFiltro, setObraFiltro] = useState('')
  const [msg, setMsg] = useState(null)
  const dados = useCarregar(() => notasPendentesGeral(perfil), [perfil.id])
  const dia = hoje()

  return (
    <>
      <Topo titulo="Notas pendentes" sub="Todas as obras" />
      <div className="ct">
        <Carregando estado={dados}>{(compras) => {
          if (!compras.length) return <Empty icone="notas" titulo="Nenhuma nota pendente em nenhuma obra." />
          const obras = [...new Map(compras.map((c) => [c.obra.id, c.obra])).values()]
          const vis = compras.filter((c) => !obraFiltro || c.obra.id === obraFiltro)
          const grupos = Object.values(vis.reduce((g, c) => { (g[c.fornecedor.id] ||= { fornecedor: c.fornecedor, compras: [] }).compras.push(c); return g }, {}))
            .sort((a, b) => a.fornecedor.nome.localeCompare(b.fornecedor.nome, 'pt-BR'))
          return (
            <>
              <select className="inp" value={obraFiltro} onChange={(e) => setObraFiltro(e.target.value)} aria-label="Filtrar por obra">
                <option value="">Todas as obras</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              {grupos.map((g) => {
                const porObra = Object.values(g.compras.reduce((m, c) => { (m[c.obra.id] ||= { obra: c.obra, compras: [] }).compras.push(c); return m }, {}))
                return (
                  <div className="card list" key={g.fornecedor.id}>
                    <div className="list-h">
                      <span className="nm">{g.fornecedor.nome}</span>
                      <div className="tot"><span className="lab">Total</span><b>{brl(soma(g.compras))}</b></div>
                    </div>
                    {porObra.map((po) => (
                      <div key={po.obra.id}>
                        <button className="row btnrow" onClick={() => goto('obra', { obraId: po.obra.id, aba: 'notas' })}>
                          <span className="lab">{po.obra.nome}</span>
                        </button>
                        {po.compras.map((c) => (
                          <div className={`row${nfAtrasada(c, dia) ? ' cr' : ''}`} key={c.id}>
                            <div className="tx"><div className="tt">{c.descricao}</div><div className="mt">{fmtData(c.data)} · há {diasEsperandoNF(c, dia)} dias</div></div>
                            <div className="val">{brl(c.valor)}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="list-f">
                      <button className="btn wa sm" disabled={!g.fornecedor.whatsapp}
                        onClick={() => setMsg({ titulo: 'Cobrar NF no WhatsApp', para: g.fornecedor.nome, texto: mensagemCobrancaNF(g.fornecedor, porObra) })}>
                        <Icon n="wa" />Cobrar no WhatsApp
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )
        }}</Carregando>
      </div>
      <SheetMensagem msg={msg} onFechar={() => setMsg(null)} />
    </>
  )
}
