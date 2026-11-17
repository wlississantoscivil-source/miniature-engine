import { useState } from 'react'
import { Carregando, Icon, Kpi, Tag, useCarregar } from '../components/index.jsx'
import { orcadoRealizado } from '../lib/dados.js'
import { CATEGORIAS, brl } from '../lib/regras.js'
import { rotuloEtapa } from '../lib/planilha.js'

// Orçado x Realizado por etapa da planilha da licitação.
// Orçado = custo sem BDI dos itens; realizado = compras lançadas na etapa.
const pct = (v) => (v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
const TOM = { estourou: 'cr', atencao: 'at', ok: 'ok' }

export default function OrcadoRealizado({ perfil, obra, irPara }) {
  const dados = useCarregar(() => orcadoRealizado(perfil, obra.id), [obra.id])
  const [aberta, setAberta] = useState(null)

  return (
    <div className="ct">
      <Carregando estado={dados}>{(d) => {
        if (d.sem_planilha) {
          const maior = Math.max(...CATEGORIAS.map((c) => d.gastos[c]), 1)
          return (
            <>
              <div className="alert at">
                <Icon n="warn" />Importe a planilha da licitação para comparar com o orçado.
                {perfil.role === 'Engenheiro' && <button className="go" onClick={() => irPara('dados', 'planilha')}>Importar</button>}
              </div>
              <div className="card pad">
                <div className="h2">Realizado por categoria</div>
                <div className="note">Total {brl(d.gastos.total)}</div>
                <div className="bars">
                  {CATEGORIAS.map((c) => (
                    <div className="bar" key={c}>
                      <div className="l">{c}<b>{brl(d.gastos[c])}</b></div>
                      <div className="tr"><i style={{ width: `${(d.gastos[c] / maior) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )
        }
        const t = d.total
        return (
          <>
            <div className="kpis">
              <Kpi tom="t" rotulo="Orçado (sem BDI)" valor={brl(t.orcado)} />
              <Kpi tom="at" rotulo="Realizado" valor={brl(t.realizado)} detalhe={`${pct(t.pct)} do orçado`} />
              <Kpi tom={t.diferenca < 0 ? 'cr' : 'ok'} rotulo="Diferença" valor={brl(t.diferenca)} />
              <Kpi tom={d.estouradas ? 'cr' : 'ok'} rotulo="Etapas estouradas" valor={d.estouradas} />
            </div>
            <div className="card list">
              <div className="list-h"><span className="nm">Por etapa</span><span className="note tot">toque para abrir as subetapas</span></div>
              {d.linhas.map((l) => (
                <div key={l.etapa.id}>
                  <Linha l={l} onClick={l.filhas.length ? () => setAberta(aberta === l.etapa.id ? null : l.etapa.id) : null} aberta={aberta === l.etapa.id} />
                  {aberta === l.etapa.id && l.filhas.map((f) => <Linha key={f.etapa.id} l={f} filha />)}
                </div>
              ))}
              <div className="row">
                <div className="tx"><div className="tt">Sem etapa / Administração</div><div className="mt">Compras sem etapa · sem orçado</div></div>
                <div className="val">{brl(d.administracao)}</div>
              </div>
              <div className="row">
                <div className="tx"><div className="tt">Mão de obra própria</div><div className="mt">Diárias dos diaristas · sem orçado</div></div>
                <div className="val">{brl(d.mao_obra_propria)}</div>
              </div>
              <div className="list-t"><span>Total da obra</span><span>{brl(t.realizado)} de {brl(t.orcado)}</span></div>
            </div>
          </>
        )
      }}</Carregando>
    </div>
  )
}

function Linha({ l, onClick, aberta, filha }) {
  const Tag2 = onClick ? 'button' : 'div'
  const largura = l.pct == null ? (l.realizado > 0 ? 100 : 0) : Math.min(100, l.pct * 100)
  return (
    <Tag2 className={`row oxr${filha ? ' filha' : ''}${onClick ? ' btnrow' : ''}${l.estado === 'estourou' ? ' cr' : ''}`} onClick={onClick} aria-expanded={onClick ? aberta : undefined}>
      <div className="tx">
        <div className="tt">{rotuloEtapa(l.etapa)}</div>
        <div className={`prog ${TOM[l.estado]}`}><i style={{ width: `${largura}%` }} /></div>
        <div className="mt">
          Orçado {brl(l.orcado)} · Realizado {brl(l.realizado)} · {pct(l.pct)}
        </div>
      </div>
      <div className="val">
        {brl(l.diferenca)}
        <div>{l.estado === 'estourou' ? <Tag tom="cr">Estourou {pct(l.pct - 1)}</Tag> : l.estado === 'atencao' ? <Tag tom="at">Atenção</Tag> : null}</div>
      </div>
      {onClick && <span className="chev"><Icon n={aberta ? 'down' : 'next'} /></span>}
    </Tag2>
  )
}
