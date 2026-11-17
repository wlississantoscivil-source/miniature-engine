import { Carregando, Icon, Tag, useCarregar } from '../components/index.jsx'
import { fluxoCaixa } from '../lib/dados.js'
import { brl } from '../lib/regras.js'
import { rotuloMes } from '../lib/orcamento.js'

// Fluxo de caixa da obra, mês a mês. Passado = realizado; atual e futuro = previsto.
// Fase 1: só saídas. As entradas (medições) chegam com o módulo Medição.
export default function FluxoCaixa({ perfil, obra }) {
  const dados = useCarregar(() => fluxoCaixa(perfil, obra.id), [obra.id])
  return (
    <div className="ct">
      <Carregando estado={dados}>{(d) => (
        <>
          {!d.entradas_disponiveis && <div className="alert at"><Icon n="warn" />As entradas (medições) chegam com o módulo Medição. Por enquanto o fluxo mostra só o que sai.</div>}
          <div className="card scroll-x">
            <table className="tbl stack fluxo">
              <thead>
                <tr>
                  <th>Mês</th>
                  {d.entradas_disponiveis && <><th className="r">Recebido</th><th className="r">A receber</th></>}
                  <th className="r">Fornecedores pagos</th><th className="r">Diárias pagas</th><th className="r">A pagar</th>
                  <th className="r">Saldo do mês</th><th className="r">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {d.meses.map((m) => (
                  <tr key={m.mes} className={m.previsto ? 'previsto' : ''}>
                    <td className="full"><b>{rotuloMes(m.mes)}</b> {m.atual ? <Tag tom="at">Mês atual</Tag> : m.previsto ? <Tag tom="ne">Previsto</Tag> : <Tag tom="ok">Realizado</Tag>}</td>
                    {d.entradas_disponiveis && <><Cel r="Recebido" v={m.entradas_recebidas} /><Cel r="A receber" v={m.entradas_a_receber} /></>}
                    <Cel r="Fornecedores pagos" v={-m.saidas_fornecedores} />
                    <Cel r="Diárias pagas" v={-m.saidas_diarias} />
                    <Cel r="A pagar" v={-m.saidas_a_pagar} />
                    <Cel r="Saldo do mês" v={m.saldo} forte />
                    <Cel r="Acumulado" v={m.acumulado} forte />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}</Carregando>
    </div>
  )
}

function Cel({ r, v, forte }) {
  return (
    <td className="r">
      <span className="cel"><span className="cel-r">{r}</span>
        <span className={v < 0 && forte ? 'cr-tx' : ''}>{forte ? <b>{brl(v)}</b> : v === 0 ? '—' : brl(v)}</span>
      </span>
    </td>
  )
}
