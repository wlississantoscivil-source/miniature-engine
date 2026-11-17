import { useState } from 'react'
import { Topo, Tag, Carregando, Empty, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { listarFornecedores } from '../lib/dados.js'
import { brl } from '../lib/regras.js'

// Cadastro geral de fornecedores (usado em todas as obras).
export default function Fornecedores({ perfil }) {
  const [busca, setBusca] = useState('')
  const dados = useCarregar(() => listarFornecedores(perfil), [perfil.id])
  const emBreve = useEmBreve()

  return (
    <>
      <Topo titulo="Fornecedores" sub="Cadastro geral" acoes={<button className="btn pri sm" onClick={emBreve}><Icon n="plus" />Novo</button>} />
      <div className="ct">
        <input className="inp" placeholder="Buscar por nome" aria-label="Buscar fornecedor" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Carregando estado={dados}>{(lista) => {
          if (!lista.length) return <Empty icone="forn" titulo="Nenhum fornecedor cadastrado." />
          const vis = lista.filter((f) => f.nome.toLowerCase().includes(busca.trim().toLowerCase()))
          if (!vis.length) return <Empty icone="forn" titulo="Nenhum fornecedor com esse nome." />
          return (
            <div className="card list">
              {vis.map((f) => (
                <div className="row" key={f.id}>
                  <div className="tx">
                    <div className="tt">{f.nome}</div>
                    <div className="mt">{f.categoria_padrao} · {f.obras} {f.obras === 1 ? 'obra' : 'obras'}{f.whatsapp ? '' : ' · sem WhatsApp'}</div>
                  </div>
                  <div className="val">
                    {f.aguardando_nf > 0 ? <><span className="cr-tx">{brl(f.aguardando_nf)}</span><div className="note">aguardando NF</div></> : <Tag tom="ok">Em dia</Tag>}
                  </div>
                </div>
              ))}
            </div>
          )
        }}</Carregando>
      </div>
    </>
  )
}
