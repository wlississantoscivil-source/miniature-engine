import { useState } from 'react'
import { Faixa, QuinzenaSel, StatusTag, Carregando, Empty, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { fechamentosObra, fornecedoresDaQuinzena } from '../lib/dados.js'
import { brl, fmtData, hoje, quinzenaAnterior, quinzenaDe } from '../lib/regras.js'

// Módulo Fornecedores da obra. Sub-abas: Quinzena (comprado, com NF, sem NF,
// pago, saldo por fornecedor) e Fechamentos (os quinzenais da obra).
export default function ObraFornecedores({ perfil, obra, goto, params, sub, setSub }) {
  const emBreve = useEmBreve()
  const aba = sub || 'quinzena'
  return (
    <div className="ct">
      <Faixa abas={[{ id: 'quinzena', rotulo: 'Quinzena' }, { id: 'fechamentos', rotulo: 'Fechamentos' }]} ativa={aba} onTroca={setSub}
        acao={<button className="btn pri" onClick={emBreve}><Icon n="plus" />Lançar compra</button>} />
      {aba === 'fechamentos'
        ? <Fechamentos perfil={perfil} obra={obra} goto={goto} />
        : <Quinzena perfil={perfil} obra={obra} goto={goto} anterior={params.anterior} />}
    </div>
  )
}

function Quinzena({ perfil, obra, goto, anterior }) {
  const atual = quinzenaDe(hoje())
  const [q, setQ] = useState(anterior ? quinzenaAnterior(atual) : atual)
  const dados = useCarregar(() => fornecedoresDaQuinzena(perfil, obra.id, q), [obra.id, q.inicio])
  return (
    <>
      <div className="card pad"><QuinzenaSel q={q} onChange={setQ} /></div>
      <Carregando estado={dados}>{(linhas) => {
        if (!linhas.length) {
          return (
            <Empty icone="forn" titulo="Nenhuma compra lançada nesta obra nesta quinzena.">
              <button className="btn sec" onClick={() => setQ(quinzenaAnterior(q))}><Icon n="back" />Ver quinzena anterior</button>
            </Empty>
          )
        }
        return (
          <div className="card list">
            {linhas.map((l) => (
              <button className="row btnrow" key={l.fornecedor.id} onClick={() => goto('extrato', { obraId: obra.id, fornecedorId: l.fornecedor.id, q })}>
                <div className="tx">
                  <div className="tt">{l.fornecedor.nome}</div>
                  <div className="mt">
                    Com NF {brl(l.com_nf)} · <span className={l.sem_nf > 0 ? 'cr-tx' : ''}>Sem NF {brl(l.sem_nf)}</span> · Pago {brl(l.pago)}
                  </div>
                  <div style={{ marginTop: 6 }}><StatusTag s={l.fechamento ? l.fechamento.status : 'Sem fechamento'} /></div>
                </div>
                <div className="val">{brl(l.comprado)}<div className="note">saldo {brl(l.saldo)}</div></div>
                <span className="chev"><Icon n="next" /></span>
              </button>
            ))}
          </div>
        )
      }}</Carregando>
    </>
  )
}

function Fechamentos({ perfil, obra, goto }) {
  const dados = useCarregar(() => fechamentosObra(perfil, obra.id), [obra.id])
  const emBreve = useEmBreve()
  return (
    <>
      <div className="btns"><button className="btn sec" onClick={emBreve}>Gerar fechamento da quinzena</button></div>
      <Carregando estado={dados}>{(lista) => !lista.length
        ? <Empty icone="folha" titulo="Nenhum fechamento nesta obra ainda." texto="Os fechamentos são criados sozinhos no dia 1º e no dia 16." />
        : (
          <div className="card list">
            {lista.map((f) => (
              <button className="row btnrow" key={f.id} onClick={() => goto('fechamento', { fechamentoId: f.id })}>
                <div className="tx">
                  <div className="tt">{f.fornecedor.nome}</div>
                  <div className="mt">{fmtData(f.quinzena_inicio)} a {fmtData(f.quinzena_fim)}</div>
                  <div style={{ marginTop: 6 }}><StatusTag s={f.status} /></div>
                </div>
                <div className="val">{brl(f.total)}</div>
                <span className="chev"><Icon n="next" /></span>
              </button>
            ))}
          </div>
        )}</Carregando>
    </>
  )
}
