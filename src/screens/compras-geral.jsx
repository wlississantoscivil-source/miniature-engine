import { useState } from 'react'
import { Topo, Carregando, Empty, Icon, SheetMensagem, useCarregar, useEmBreve } from '../components/index.jsx'
import { listaComprasGeral } from '../lib/dados.js'
import { fmtData, hoje, mensagemPedidoItens } from '../lib/regras.js'

// Itens "A comprar" de todas as obras, agrupados por fornecedor sugerido e por obra.
export default function ComprasGeral({ perfil }) {
  const [obraFiltro, setObraFiltro] = useState('')
  const [msg, setMsg] = useState(null)
  const dados = useCarregar(() => listaComprasGeral(perfil), [perfil.id])
  const emBreve = useEmBreve()
  const dia = hoje()

  return (
    <>
      <Topo titulo="Lista de compras" sub="Todas as obras" />
      <div className="ct">
        <Carregando estado={dados}>{(itens) => {
          const obras = [...new Map(itens.map((i) => [i.obra.id, i.obra])).values()]
          const vis = itens.filter((i) => !obraFiltro || i.obra.id === obraFiltro)
          if (!itens.length) return <Empty icone="compras" titulo="Nenhum item para comprar em nenhuma obra." />
          const grupos = Object.values(vis.reduce((g, i) => {
            const k = i.fornecedor?.id || 'sem';
            (g[k] ||= { fornecedor: i.fornecedor, itens: [] }).itens.push(i)
            return g
          }, {})).sort((a, b) => (!a.fornecedor ? 1 : !b.fornecedor ? -1 : a.fornecedor.nome.localeCompare(b.fornecedor.nome, 'pt-BR')))
          return (
            <>
              <select className="inp" value={obraFiltro} onChange={(e) => setObraFiltro(e.target.value)} aria-label="Filtrar por obra">
                <option value="">Todas as obras</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              {grupos.map((g) => {
                const porObra = Object.values(g.itens.reduce((m, i) => { (m[i.obra.id] ||= { obra: i.obra, itens: [] }).itens.push(i); return m }, {}))
                return (
                  <div className="card list" key={g.fornecedor?.id || 'sem'}>
                    <div className="list-h">
                      <span className="nm">{g.fornecedor ? g.fornecedor.nome : 'Sem fornecedor'}</span>
                      {g.fornecedor && (
                        <div className="btns tot">
                          <button className="btn wa sm" onClick={() => setMsg({ titulo: 'Pedir no WhatsApp', para: g.fornecedor.nome, texto: mensagemPedidoItens(g.fornecedor, porObra) })}><Icon n="wa" />Pedir</button>
                          <button className="btn pri sm" onClick={emBreve}>Gerar compra</button>
                        </div>
                      )}
                    </div>
                    {porObra.map((po) => po.itens.map((i) => (
                      <div className={`row${i.para_quando && i.para_quando < dia ? ' cr' : ''}`} key={i.id}>
                        <div className="tx">
                          <div className="tt">{i.descricao}{i.quantidade ? ` – ${i.quantidade} ${i.unidade || ''}` : ''}</div>
                          <div className="mt">{po.obra.nome}{i.para_quando ? ` · para ${fmtData(i.para_quando)}` : ''}</div>
                        </div>
                      </div>
                    )))}
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
