import { useState } from 'react'
import { Seg, Empty, Carregando, useCarregar, useEmBreve, Icon } from '../components/index.jsx'
import { gastosPorObra } from '../lib/dados.js'
import { CATEGORIAS, brl, hoje, somarDias } from '../lib/regras.js'

// Gastos: obra × categoria. Responde "quanto gastei com o quê em cada obra".
function periodoDe(id) {
  const d = hoje()
  if (id === 'mes') return { inicio: d.slice(0, 8) + '01', fim: d }
  if (id === '3m') return { inicio: somarDias(d, -90), fim: d }
  if (id === 'ano') return { inicio: d.slice(0, 4) + '-01-01', fim: d }
  return null
}

export default function Gastos({ perfil }) {
  const [per, setPer] = useState('tudo')
  const dados = useCarregar(() => gastosPorObra(perfil, periodoDe(per)), [perfil.id, per])
  const emBreve = useEmBreve()

  return (
    <>
      <Seg valor={per} onChange={setPer} opcoes={[
        { id: 'mes', rotulo: 'Este mês' }, { id: '3m', rotulo: 'Últimos 3 meses' },
        { id: 'ano', rotulo: 'Este ano' }, { id: 'tudo', rotulo: 'Desde o início' },
      ]} />
      <Carregando estado={dados}>{(linhas) => {
        if (!linhas.length) return <Empty icone="tabela" titulo="Nenhuma compra lançada no período." />
        const tot = Object.fromEntries([...CATEGORIAS, 'total', 'empreiteiros', 'diarias'].map((c) => [c, linhas.reduce((t, l) => t + l[c], 0)]))
        return (
          <div className="card">
            <div className="list-h">
              <span className="nm">Gastos por categoria</span>
              <button className="btn sec sm tot" onClick={emBreve}><Icon n="down" />Exportar CSV</button>
            </div>
            <div className="scroll-x">
              <table className="tbl stack gastos">
                <thead>
                  <tr><th>Obra</th>{CATEGORIAS.map((c) => <th key={c} className="r">{c}</th>)}<th className="r">Total</th></tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.obra.id}>
                      <td className="full"><b>{l.obra.nome}</b></td>
                      {CATEGORIAS.map((c) => (
                        <td key={c} className="r">
                          <Celula rotulo={c} valor={l[c]} />
                          {c === 'Mão de obra' && <div className="split">Empreit. {brl(l.empreiteiros)} · Diárias {brl(l.diarias)}</div>}
                        </td>
                      ))}
                      <td className="r"><Celula rotulo="Total" valor={l.total} forte /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="full">Total geral</td>
                    {CATEGORIAS.map((c) => <td key={c} className="r"><Celula rotulo={c} valor={tot[c]} /></td>)}
                    <td className="r"><Celula rotulo="Total" valor={tot.total} forte /></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      }}</Carregando>
    </>
  )
}

// No celular a tabela vira cartão: cada célula mostra o nome da categoria ao lado.
function Celula({ rotulo, valor, forte }) {
  return (
    <span className="cel">
      <span className="cel-r">{rotulo}</span>
      {forte ? <b>{brl(valor)}</b> : brl(valor)}
    </span>
  )
}
