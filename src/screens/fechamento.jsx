import { Topo, StatusTag, Carregando, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { obterFechamento } from '../lib/dados.js'
import { brl, fmtData } from '../lib/regras.js'

// Fechamento quinzenal de um fornecedor numa obra.
export default function Fechamento({ perfil, voltar, voltarAte, params }) {
  const dados = useCarregar(() => obterFechamento(perfil, params.fechamentoId), [params.fechamentoId])
  const emBreve = useEmBreve()
  const eng = perfil.role === 'Engenheiro'

  return (
    <Carregando estado={dados}>{(f) => (
      <>
        <Topo titulo={`Fechamento · ${f.fornecedor.nome}`} sub={`${f.obra.nome} · ${f.obra.orgao_contratante}`} onVoltar={voltar} caminho={[
          { rotulo: 'Início', onClick: () => voltarAte('obras') },
          { rotulo: 'Obras', onClick: () => voltarAte('obras') },
          { rotulo: f.obra.nome, onClick: () => voltarAte('obra', { aba: null, sub: null }) },
          { rotulo: 'Fornecedores', onClick: () => voltarAte('obra') },
          { rotulo: `Fechamento · ${f.fornecedor.nome}` },
        ]} />
        <div className="ct">
          <div className="card pad col">
            <div className="sec-h">
              <div><span className="lab">Período</span><div className="h2">{fmtData(f.quinzena_inicio)} a {fmtData(f.quinzena_fim)}</div></div>
              <StatusTag s={f.status} />
            </div>
            {f.status === 'Fechado' && <div className="note">Fechado por {f.fechado_por_nome} em {fmtData(f.fechado_em.slice(0, 10))}</div>}
          </div>
          <div className="card">
            <div className="scroll-x">
              <table className="tbl stack">
                <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>NF</th><th className="r">Valor</th></tr></thead>
                <tbody>
                  {f.compras.map((c) => (
                    <tr key={c.id}>
                      <td>{fmtData(c.data)}</td>
                      <td className="full"><b>{c.descricao}</b></td>
                      <td className="hide-m">{c.categoria}</td>
                      <td><StatusTag s={c.status} /></td>
                      <td className="r">{brl(c.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="list-t"><span>Total</span><span>{brl(f.totais.comprado)}</span></div>
            <div className="dl">
              <div><span className="lab">Com NF</span><b>{brl(f.totais.com_nf)}</b></div>
              <div><span className="lab">Sem NF</span><b className={f.totais.sem_nf ? 'cr-tx' : ''}>{brl(f.totais.sem_nf)}</b></div>
              <div><span className="lab">Pago</span><b>{brl(f.totais.pago)}</b></div>
              <div><span className="lab">Saldo</span><b>{brl(f.totais.saldo)}</b></div>
            </div>
          </div>
          <div className="btns no-print">
            {f.status === 'Rascunho' && <button className="btn pri" onClick={emBreve}><Icon n="check" />Fechar quinzena</button>}
            {f.status === 'Fechado' && eng && <button className="btn sec" onClick={emBreve}>Reabrir</button>}
            <button className="btn sec" onClick={() => window.print()}><Icon n="down" />Imprimir / Salvar PDF</button>
            <button className="btn wa" onClick={emBreve}><Icon n="wa" />Enviar pelo WhatsApp</button>
          </div>
        </div>
      </>
    )}</Carregando>
  )
}
