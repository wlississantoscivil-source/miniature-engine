import { useState } from 'react'
import { Topo, QuinzenaSel, StatusTag, Carregando, Kpi, Icon, SheetMensagem, useCarregar, useEmBreve, useToast } from '../components/index.jsx'
import { extratoFornecedor } from '../lib/dados.js'
import { brl, fmtData, mensagemCobrancaNF } from '../lib/regras.js'

// Extrato de um fornecedor dentro de uma obra, numa quinzena.
export default function ExtratoFornecedor({ perfil, goto, voltar, voltarAte, params }) {
  const [q, setQ] = useState(params.q)
  const [msg, setMsg] = useState(null)
  const dados = useCarregar(() => extratoFornecedor(perfil, params.obraId, params.fornecedorId, q), [q.inicio])
  const emBreve = useEmBreve()
  const toast = useToast()

  return (
    <Carregando estado={dados}>{(e) => {
      const f = e.fornecedor
      // Compra dividida aparece como um lançamento só.
      const grupos = []
      for (const c of e.compras) {
        const g = c.grupo_id && grupos.find((x) => x.grupo_id === c.grupo_id)
        if (g) g.partes.push(c)
        else grupos.push({ grupo_id: c.grupo_id, partes: [c] })
      }
      return (
        <>
          <Topo titulo={f.nome} sub={e.obra.nome} onVoltar={voltar} caminho={[
            { rotulo: 'Início', onClick: () => voltarAte('obras') },
            { rotulo: 'Obras', onClick: () => voltarAte('obras') },
            { rotulo: e.obra.nome, onClick: () => voltarAte('obra', { aba: null, sub: null }) },
            { rotulo: 'Fornecedores', onClick: voltar },
            { rotulo: f.nome },
          ]} />
          <div className="ct">
            <div className="card pad col">
              <div className="note">{f.documento || 'Sem CNPJ/CPF'} · WhatsApp {f.whatsapp || 'não cadastrado'}</div>
              {f.chave_pix && (
                <div className="btns" style={{ alignItems: 'center' }}>
                  <span className="mono">Pix: {f.chave_pix}</span>
                  <button className="btn sec sm" onClick={() => { navigator.clipboard?.writeText(f.chave_pix); toast('Chave Pix copiada.') }}>Copiar</button>
                </div>
              )}
              <QuinzenaSel q={q} onChange={setQ} />
            </div>
            <div className="kpis">
              <Kpi tom="t" rotulo="Comprado" valor={brl(e.totais.comprado)} />
              <Kpi tom={e.totais.sem_nf ? 'cr' : 'ok'} rotulo="Sem NF" valor={brl(e.totais.sem_nf)} />
              <Kpi tom="ok" rotulo="Pago" valor={brl(e.totais.pago)} />
              <Kpi tom="at" rotulo="Saldo" valor={brl(e.totais.saldo)} />
            </div>
            <div className="btns">
              <button className="btn wa" disabled={!f.whatsapp || !e.pendentes_obra.length}
                onClick={() => setMsg({ titulo: 'Cobrar NF no WhatsApp', para: f.nome, texto: mensagemCobrancaNF(f, [{ obra: e.obra, compras: e.pendentes_obra }]) })}>
                <Icon n="wa" />Cobrar NF no WhatsApp
              </button>
              <button className="btn sec" onClick={emBreve}><Icon n="clip" />Anexar NF</button>
              <button className="btn sec" onClick={emBreve}><Icon n="pay" />Registrar pagamento</button>
              {e.fechamento && <button className="btn esc" onClick={() => goto('fechamento', { fechamentoId: e.fechamento.id })}><Icon n="folha" />Ver fechamento</button>}
            </div>
            {!f.whatsapp && <p className="note">Sem WhatsApp cadastrado: o botão de cobrança fica desligado.</p>}

            <div className="card list">
              <div className="list-h"><span className="nm">Compras da quinzena</span></div>
              {!grupos.length && <div className="row"><span className="note">Nenhuma compra nesta quinzena.</span></div>}
              {grupos.map((g) => {
                const c = g.partes[0]
                const total = g.partes.reduce((t, x) => t + x.valor, 0)
                return (
                  <div className="row" key={c.id}>
                    <div className="tx">
                      <div className="tt">{c.descricao}</div>
                      <div className="mt">{fmtData(c.data)} · {g.partes.map((x) => x.categoria).join(' + ')}{c.numero_pedido ? ` · pedido ${c.numero_pedido}` : ''}</div>
                      {g.partes.length > 1 && <div className="split">{g.partes.map((x) => `${x.categoria} ${brl(x.valor)}`).join(' · ')}</div>}
                    </div>
                    <div className="val">{brl(total)}<div><StatusTag s={c.status} /></div></div>
                  </div>
                )
              })}
            </div>

            <div className="grid2">
              <div className="card list">
                <div className="list-h"><span className="nm">Notas fiscais</span></div>
                {!e.notas.length && <div className="row"><span className="note">Nenhuma NF nesta quinzena.</span></div>}
                {e.notas.map((n) => (
                  <div className="row" key={n.id}><div className="tx"><div className="tt">NF {n.numero}</div><div className="mt">{fmtData(n.data_emissao)}</div></div><div className="val">{brl(n.valor)}</div></div>
                ))}
              </div>
              <div className="card list">
                <div className="list-h"><span className="nm">Pagamentos</span></div>
                {!e.pagamentos.length && <div className="row"><span className="note">Nenhum pagamento nesta quinzena.</span></div>}
                {e.pagamentos.map((p) => (
                  <div className="row" key={p.id}><div className="tx"><div className="tt">{p.forma}</div><div className="mt">{fmtData(p.data)}</div></div><div className="val">{brl(p.valor)}</div></div>
                ))}
              </div>
            </div>
          </div>
          <SheetMensagem msg={msg} onFechar={() => setMsg(null)} />
        </>
      )
    }}</Carregando>
  )
}
