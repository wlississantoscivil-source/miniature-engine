import { Faixa, Tag, Carregando, Empty, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { pagamentosObra } from '../lib/dados.js'
import { brl, fmtData, rotuloQuinzena } from '../lib/regras.js'

// Pagamentos da obra, mais recentes primeiro. Sem NF ligada = "Sem nota".
export default function ObraPagamentos({ perfil, obra }) {
  const dados = useCarregar(() => pagamentosObra(perfil, obra.id), [obra.id])
  const emBreve = useEmBreve()
  return (
    <div className="ct">
      <Faixa acao={<button className="btn pri" onClick={emBreve}><Icon n="pay" />Registrar pagamento</button>} />
      <Carregando estado={dados}>{(lista) => !lista.length
        ? <Empty icone="pay" titulo="Nenhum pagamento registrado nesta obra." />
        : (
          <div className="card list">
            {lista.map((p) => (
              <div className="row" key={p.id}>
                <div className="tx">
                  <div className="tt">{p.fornecedor.nome}</div>
                  <div className="mt">{fmtData(p.data)} · {p.forma} · {rotuloQuinzena(p.quinzena)}</div>
                  <div className="note">{p.notas.length ? `NF ${p.notas.map((n) => n.numero).join(', ')}` : (p.observacao || '')}</div>
                </div>
                <div className="val">{brl(p.valor)}<div>{p.notas.length ? <Tag tom="ok">Com nota</Tag> : <Tag tom="cr">Sem nota</Tag>}</div></div>
              </div>
            ))}
          </div>
        )}</Carregando>
    </div>
  )
}
