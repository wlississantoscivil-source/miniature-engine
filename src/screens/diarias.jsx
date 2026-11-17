import { useState } from 'react'
import { QuinzenaSel, Tag, Carregando, Empty, Icon, useCarregar, useEmBreve, useToast } from '../components/index.jsx'
import { diariasQuinzena } from '../lib/dados.js'
import { brl, fmtData, hoje, plural, quinzenaDe } from '../lib/regras.js'

// Diárias da quinzena: dias "Presente" × diária vigente. Sub-aba do módulo
// Presença, só para quem tem Financeiro na obra. O mestre nunca chega aqui.
export default function Diarias({ perfil, obra }) {
  const [q, setQ] = useState(quinzenaDe(hoje()))
  const dados = useCarregar(() => diariasQuinzena(perfil, obra.id, q), [obra.id, q.inicio])
  const emBreve = useEmBreve()
  const toast = useToast()

  return (
    <>
      <div className="card pad"><QuinzenaSel q={q} onChange={setQ} /></div>
      <Carregando estado={dados}>{(d) => (
        <>
          <div className="sec-h">
            {d.pagamento
              ? <Tag tom="ok">Paga em {fmtData(d.pagamento.data_pagamento)} · {d.pagamento.forma}</Tag>
              : <Tag tom="at">Em aberto</Tag>}
            <div className="h2">Total {brl(d.pagamento ? d.pagamento.valor_total : d.total)}</div>
          </div>
          {d.sem_diaria > 0 && <div className="alert at"><Icon n="warn" />{plural(d.sem_diaria, 'diarista sem valor de diária', 'diaristas sem valor de diária')} — cadastre em Equipe</div>}
          {!d.linhas.length ? <Empty icone="pay" titulo="Nenhum diarista com presença nesta quinzena." /> : (
            <div className="card list">
              {d.linhas.map((l) => (
                <div className={`row${l.sem_valor ? ' at' : ''}`} key={l.funcionario.id}>
                  <div className="tx">
                    <div className="tt">{l.funcionario.nome} <span className="note">· {l.funcionario.funcao}</span></div>
                    <div className="mt">
                      {l.dias} dias × {l.diaria != null ? brl(l.diaria) : 'sem diária'}{l.variou ? ' · valor variou' : ''}
                      {l.faltas > 0 && ` · ${plural(l.faltas, 'falta/atestado', 'faltas/atestados')}`}
                    </div>
                    {l.funcionario.chave_pix && (
                      <button className="link" onClick={() => { navigator.clipboard?.writeText(l.funcionario.chave_pix); toast('Chave Pix copiada.') }}>Pix {l.funcionario.chave_pix} · copiar</button>
                    )}
                  </div>
                  <div className="val">{brl(l.a_pagar)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="btns no-print">
            {!d.pagamento && <button className="btn pri" onClick={emBreve}><Icon n="check" />Marcar como paga</button>}
            <button className="btn sec" onClick={() => window.print()}><Icon n="down" />Imprimir / Salvar PDF</button>
            <button className="btn sec" onClick={emBreve}>Exportar CSV</button>
          </div>
        </>
      )}</Carregando>
    </>
  )
}
