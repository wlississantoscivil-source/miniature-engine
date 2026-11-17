import { Kpi, Carregando, Empty, useCarregar } from '../components/index.jsx'
import { resumoObra } from '../lib/dados.js'
import { CATEGORIAS, brl, fmtData } from '../lib/regras.js'

// Resumo da obra: números da quinzena, gasto por categoria e últimas atividades.
export default function Resumo({ perfil, obra }) {
  const dados = useCarregar(() => resumoObra(perfil, obra.id), [obra.id])
  return (
    <div className="ct">
      <Carregando estado={dados}>{(r) => {
        if (!r.gastos.total && !r.homem_dia_mes) return <Empty titulo="Ainda não há lançamentos nesta obra." />
        const maior = Math.max(...CATEGORIAS.map((c) => r.gastos[c]), 1)
        return (
          <>
            <div className="kpis">
              <Kpi tom="t" rotulo="Comprado na quinzena" valor={brl(r.comprado_quinzena)} />
              <Kpi tom={r.aguardando_qtd ? 'cr' : 'ok'} rotulo="Aguardando NF" valor={r.aguardando_qtd} detalhe={brl(r.aguardando_valor)} />
              <Kpi tom="at" rotulo="A pagar" valor={brl(r.a_pagar)} />
              <Kpi tom="ok" rotulo="Pago no mês" valor={brl(r.pago_mes)} />
            </div>
            <div className="grid2">
              <div className="card pad">
                <div className="h2">Gasto por categoria</div>
                <div className="note">Desde o início da obra · total {brl(r.gastos.total)}</div>
                <div className="bars">
                  {CATEGORIAS.map((c) => (
                    <div className="bar" key={c}>
                      <div className="l">{c}<b>{brl(r.gastos[c])}</b></div>
                      <div className="tr"><i style={{ width: `${(r.gastos[c] / maior) * 100}%` }} /></div>
                      {c === 'Mão de obra' && <div className="sub">Empreiteiros {brl(r.gastos.empreiteiros)} · Diárias {brl(r.gastos.diarias)}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="col">
                <div className="card pad">
                  <span className="lab">Presença no mês</span>
                  <div className="big" style={{ marginTop: 6 }}>{r.homem_dia_mes}</div>
                  <div className="note">homem-dia (soma de “Presente”)</div>
                </div>
                <div className="card list">
                  <div className="list-h"><span className="nm">Últimas atividades</span></div>
                  {r.atividades.length === 0 && <div className="row"><span className="note">Nada lançado ainda.</span></div>}
                  {r.atividades.map((a, i) => (
                    <div className="row" key={i}>
                      <div className="tx"><div className="tt">{a.texto}</div><div className="mt">{fmtData(a.quando.slice(0, 10))} · {a.quando.slice(11, 16)}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      }}</Carregando>
    </div>
  )
}
