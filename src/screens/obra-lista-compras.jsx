import { useState } from 'react'
import { Faixa, StatusTag, Carregando, Empty, Icon, SheetMensagem, useCarregar, useEmBreve, useToast } from '../components/index.jsx'
import { listaComprasObra } from '../lib/dados.js'
import { fmtData, hoje, mensagemPedidoItens } from '../lib/regras.js'

// Lista de compras da obra: o que precisa ser comprado, antes de virar compra.
export default function ListaCompras({ perfil, obra, sub, setSub }) {
  const filtro = sub || 'A comprar'
  const [marcados, setMarcados] = useState([])
  const [msg, setMsg] = useState(null)
  const dados = useCarregar(() => listaComprasObra(perfil, obra.id), [obra.id])
  const emBreve = useEmBreve()
  const toast = useToast()
  const dia = hoje()

  const alternar = (id) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  function pedir(itens) {
    const sel = itens.filter((i) => marcados.includes(i.id))
    const forn = sel.find((i) => i.fornecedor)?.fornecedor
    if (!forn) return toast('Escolha um fornecedor sugerido para os itens marcados.')
    setMsg({ titulo: 'Pedir no WhatsApp', para: forn.nome, texto: mensagemPedidoItens(forn, [{ obra, itens: sel }]) })
  }

  return (
    <div className="ct">
      <Faixa abas={['A comprar', 'Comprado', 'Cancelado', 'Todos']} ativa={filtro} onTroca={(f) => { setSub(f); setMarcados([]) }} />
      <form className="card pad" style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); emBreve() }}>
        <input className="inp" placeholder="Adicionar item (ex.: Cimento CP-II 50 kg)" aria-label="Novo item" />
        <button className="btn pri" aria-label="Adicionar"><Icon n="plus" /></button>
      </form>
      <Carregando estado={dados}>{(itens) => {
        const vis = itens
          .filter((i) => filtro === 'Todos' || i.status === filtro)
          .sort((a, b) => (a.para_quando || '9999') < (b.para_quando || '9999') ? -1 : 1)
        if (!vis.length) return <Empty icone="compras" titulo="Nada para comprar nesta obra." />
        return (
          <>
            <div className="card list">
              {vis.map((i) => {
                const atrasado = i.status === 'A comprar' && i.para_quando && i.para_quando < dia
                return (
                  <label className={`row${atrasado ? ' cr' : ''}`} key={i.id}>
                    {i.status === 'A comprar' && <input type="checkbox" className="check" checked={marcados.includes(i.id)} onChange={() => alternar(i.id)} />}
                    <div className="tx">
                      <div className="tt">{i.descricao}{i.quantidade ? ` – ${i.quantidade} ${i.unidade || ''}` : ''}</div>
                      <div className="mt">
                        {i.fornecedor ? i.fornecedor.nome : 'Sem fornecedor'}
                        {i.para_quando && ` · para ${fmtData(i.para_quando)}`}
                        {atrasado && ' · atrasado'}
                      </div>
                    </div>
                    <StatusTag s={i.status} />
                  </label>
                )
              })}
            </div>
            {marcados.length > 0 && (
              <div className="sticky-save btns">
                <button className="btn pri" onClick={emBreve}>Gerar compra ({marcados.length})</button>
                <button className="btn wa" onClick={() => pedir(itens)}><Icon n="wa" />Pedir no WhatsApp</button>
              </div>

            )}
          </>
        )
      }}</Carregando>
      <SheetMensagem msg={msg} onFechar={() => setMsg(null)} />
    </div>
  )
}
