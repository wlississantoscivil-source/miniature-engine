import { useState } from 'react'
import { Topo, Seg, Carregando, Empty, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { obrasDosRelatorios, relatoriosPara } from '../lib/dados.js'

// Relatórios (Engenheiro e Auxiliar). A lista vem da camada de dados, que já
// filtra pelas liberações da pessoa. Exportar ainda é "em breve": o engenheiro
// vai mandar o modelo de cada arquivo.
const PERIODOS = [
  { id: 'quinzena', rotulo: 'Quinzena atual' },
  { id: 'quinzena-ant', rotulo: 'Quinzena anterior' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes-ant', rotulo: 'Mês anterior' },
]

export default function Relatorios({ perfil, voltar }) {
  const [obraId, setObraId] = useState('')
  const [periodo, setPeriodo] = useState('quinzena')
  const obras = useCarregar(() => obrasDosRelatorios(perfil), [perfil.id])
  const lista = useCarregar(() => relatoriosPara(perfil, obraId), [perfil.id, obraId])
  const emBreve = useEmBreve()

  return (
    <>
      <Topo titulo="Relatórios" onVoltar={voltar} />
      <div className="ct">
        <div className="card pad col">
          <div className="field">
            <label htmlFor="rel-obra">Obra</label>
            <select id="rel-obra" className="inp" value={obraId} onChange={(e) => setObraId(e.target.value)}>
              <option value="">Todas as obras</option>
              {(obras.data || []).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <span className="flabel">Período</span>
            <Seg opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />
          </div>
        </div>
        <Carregando estado={lista}>{(rels) => !rels.length
          ? <Empty icone="down" titulo="Nenhum relatório liberado para você." texto="Fale com o engenheiro." />
          : (
            <div className="card">
              {rels.map((r) => {
                const falta = r.porObra && !obraId
                return (
                  <div className="rel" key={r.id}>
                    <div className="tx">
                      <div className="tt">{r.titulo}</div>
                      {falta && <div className="note">Escolha uma obra acima para exportar.</div>}
                    </div>
                    <div className="btns">
                      {r.formatos.map((f) => (
                        <button key={f} className="btn sec sm" disabled={falta} onClick={emBreve}><Icon n="down" />{f}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}</Carregando>
      </div>
    </>
  )
}
