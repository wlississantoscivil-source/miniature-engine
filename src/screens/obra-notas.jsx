import { useState } from 'react'
import { Faixa, Tag, Carregando, Empty, Icon, SheetMensagem, useCarregar, useEmBreve } from '../components/index.jsx'
import { notasObra } from '../lib/dados.js'
import { brl, diasEsperandoNF, fmtData, hoje, mensagemCobrancaNF, nfAtrasada } from '../lib/regras.js'

// Notas fiscais da obra: Aguardando NF · NF recebida · Paga.
export default function ObraNotas({ perfil, obra, sub, setSub }) {
  const filtro = sub || 'Aguardando NF'
  const [msg, setMsg] = useState(null)
  const dados = useCarregar(() => notasObra(perfil, obra.id), [obra.id])
  const emBreve = useEmBreve()
  const dia = hoje()

  return (
    <div className="ct">
      <Carregando estado={dados}>{(d) => {
        const recebidas = d.notas.filter((n) => !n.pagamento_id)
        const pagas = d.notas.filter((n) => n.pagamento_id)
        const opcoes = [
          { id: 'Aguardando NF', rotulo: 'Aguardando NF', n: d.aguardando.length },
          { id: 'NF recebida', rotulo: 'NF recebida', n: recebidas.length },
          { id: 'Paga', rotulo: 'Paga', n: pagas.length },
        ]
        let corpo
        if (filtro === 'Aguardando NF') {
          const grupos = Object.values(d.aguardando.reduce((g, c) => {
            (g[c.fornecedor.id] ||= { fornecedor: c.fornecedor, compras: [] }).compras.push(c)
            return g
          }, {}))
          corpo = !grupos.length ? <Empty icone="notas" titulo="Nenhuma nota pendente." /> : grupos.map((g) => (
            <div className="card list" key={g.fornecedor.id}>
              <div className="list-h">
                <span className="nm">{g.fornecedor.nome}</span>
                <button className="btn wa sm tot" disabled={!g.fornecedor.whatsapp}
                  onClick={() => setMsg({ titulo: 'Cobrar NF no WhatsApp', para: g.fornecedor.nome, texto: mensagemCobrancaNF(g.fornecedor, [{ obra: d.obra, compras: g.compras }]) })}>
                  <Icon n="wa" />Cobrar no WhatsApp
                </button>
              </div>
              {g.compras.map((c) => (
                <div className={`row${nfAtrasada(c, dia) ? ' cr' : ''}`} key={c.id}>
                  <div className="tx"><div className="tt">{c.descricao}</div><div className="mt">{fmtData(c.data)} · há {diasEsperandoNF(c, dia)} dias</div></div>
                  <div className="val">{brl(c.valor)}</div>
                </div>
              ))}
            </div>
          ))
        } else {
          const lista = filtro === 'Paga' ? pagas : recebidas
          corpo = !lista.length ? <Empty icone="notas" titulo={filtro === 'Paga' ? 'Nenhuma nota paga.' : 'Nenhuma nota recebida aguardando pagamento.'} /> : (
            <div className="card list">
              {lista.map((n) => (
                <div className="row" key={n.id}>
                  <div className="tx">
                    <div className="tt">NF {n.numero} · {n.fornecedor.nome}</div>
                    <div className="mt">Emitida {fmtData(n.data_emissao)} · {n.compras.length} {n.compras.length === 1 ? 'compra' : 'compras'} · {n.arquivo_tipo === 'pdf' ? 'PDF' : 'Foto'}</div>
                  </div>
                  <div className="val">{brl(n.valor)}<div>{n.pagamento ? <Tag tom="ne">Paga {fmtData(n.pagamento.data)}</Tag> : <Tag tom="ok">Recebida</Tag>}</div></div>
                </div>
              ))}
            </div>
          )
        }
        return (
          <>
            <Faixa abas={opcoes} ativa={filtro} onTroca={setSub}
              acao={<button className="btn pri" onClick={emBreve}><Icon n="clip" />Anexar NF</button>} />
            {corpo}
          </>
        )
      }}</Carregando>
      <SheetMensagem msg={msg} onFechar={() => setMsg(null)} />
    </div>
  )
}
