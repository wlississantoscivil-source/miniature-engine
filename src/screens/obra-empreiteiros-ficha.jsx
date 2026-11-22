import { useState } from 'react'
import { Empty, Icon, Kpi, Tag, useCarregar, useToast } from '../components/index.jsx'
import { fichaMedicaoEmpreiteiro, marcarBoletimPago, salvarBoletimEmpreiteiro } from '../lib/dados.js'
import { ATIVO, boletimAtrasado, calcularBoletim, GLOBAL, pagarEmPadrao, podeMedir, textoPercentual } from '../lib/empreiteiros.js'
import { brl, fmtData, hoje } from '../lib/regras.js'

// Ficha de Medição de um contrato de empreiteiro: resumo, Nova medição
// (boletim numerado) e histórico. As contas são de lib/empreiteiros.js; aqui só
// se mostra o que ela calcula a cada tecla. Grava no banco por dados.js.

const DESCARTAR = 'O que você preencheu será descartado. Sair mesmo assim?'
const soNumero = (v) => v.replace(/[^\d.,]/g, '')
// Sem separador de milhar: o número volta para o campo e precisa ser relido.
const fmt = (n, casas, minimo = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: minimo, maximumFractionDigits: casas, useGrouping: false })
const fmtPct = (p) => `${p.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const formVazio = () => ({ data: hoje(), pagar_em: pagarEmPadrao(hoje()), pagarMexido: false, global: null, linhas: {} })
const preenchido = (f) => !!f.global?.texto || Object.values(f.linhas).some((l) => l.texto)

export default function FichaMedicao({ perfil, obra, contratoId, onVoltar }) {
  const carga = useCarregar(() => fichaMedicaoEmpreiteiro(perfil, obra.id, contratoId), [obra.id, contratoId])
  const [local, setLocal] = useState(null)
  const [form, setForm] = useState(null) // Nova medição aberta
  const [ocupado, setOcupado] = useState(false)
  const toast = useToast()

  const doContrato = (f) => f?.obra_id === obra.id && f.contrato.id === contratoId
  const ficha = doContrato(local) ? local : doContrato(carga.data) ? carga.data : null

  async function gravar(promessa, aviso) {
    setOcupado(true)
    const { data, erro } = await promessa
    setOcupado(false)
    if (erro) { toast(erro); return false }
    setLocal(data)
    toast(aviso)
    return true
  }

  const voltar = () => {
    if (form && preenchido(form) && !window.confirm(DESCARTAR)) return
    onVoltar()
  }
  const botaoVoltar = <button className="btn esc sm emp-voltar" onClick={voltar}><Icon n="back" />Voltar ao quadro</button>

  if (!ficha && carga.erro) {
    return (
      <div className="ct">
        {botaoVoltar}
        <div className="card pad col">
          <p className="err" role="alert">{carga.erro}</p>
          <button className="btn sec" onClick={carga.recarregar}><Icon n="repeat" />Tentar de novo</button>
        </div>
      </div>
    )
  }
  if (!ficha) return <div className="ct">{botaoVoltar}<div className="loading">Carregando…</div></div>

  const c = ficha.contrato
  const ativo = c.status === ATIVO
  const cancelar = () => {
    if (preenchido(form) && !window.confirm(DESCARTAR)) return
    setForm(null)
  }
  // Otimista: o boletim entra no histórico e os números mudam na hora, enquanto
  // o banco grava. Se o banco recusar, tudo volta como estava (e o formulário reabre).
  const salvar = async (conta) => {
    const antes = ficha
    const formAntes = form
    setLocal({
      ...ficha,
      contrato: { ...c, medido: conta.novo_acumulado, percentual: conta.novo_percentual, saldo: conta.novo_saldo, completo: conta.novo_completo },
      proximo_numero: ficha.proximo_numero + 1,
      boletins: [{ id: 'salvando', numero: ficha.proximo_numero, data: form.data, valor: conta.total, pagar_em: form.pagar_em, pago: false, salvando: true }, ...ficha.boletins],
    })
    setForm(null)
    const salvou = await gravar(salvarBoletimEmpreiteiro(perfil, obra.id, c.id, formAntes), `Medição nº ${ficha.proximo_numero} salva. Entrou no a pagar de ${fmtData(formAntes.pagar_em)}.`)
    if (!salvou) { setLocal(antes); setForm(formAntes) }
  }
  const pagar = async (b) => {
    if (!window.confirm(`Marcar a medição nº ${b.numero} (${brl(b.valor)}) como paga? Ela sai do "a pagar" da obra.`)) return
    const antes = ficha
    setLocal({ ...ficha, boletins: ficha.boletins.map((x) => (x.id === b.id ? { ...x, pago: true } : x)) })
    if (!(await gravar(marcarBoletimPago(perfil, obra.id, b.id), `Medição nº ${b.numero} marcada como paga.`))) setLocal(antes)
  }

  return (
    <div className="ct">
      {botaoVoltar}
      <div className="card pad col emp-ficha-cab">
        <div>
          <div className="emp-ficha-nome">{c.empreiteiro}</div>
          <div className="note">{c.descricao}</div>
        </div>
        <div className="btns"><Tag tom="ne" plain>{c.tipo}</Tag><Tag tom={ativo ? 'at' : 'ne'}>{c.status}</Tag></div>
      </div>

      <div className="kpis emp-kpis">
        <Kpi rotulo="Valor total" valor={brl(c.valor_total)} />
        <Kpi rotulo="Medido acumulado" valor={brl(c.medido)} detalhe={textoPercentual(c.percentual, c.completo)} />
        <Kpi rotulo="Saldo a medir" valor={brl(c.saldo)} />
      </div>
      <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c.percentual)} aria-label="Medido acumulado">
        <i style={{ width: `${Math.min(c.percentual, 100)}%` }} />
      </div>

      {!form && podeMedir(c) && (
        <button className="btn pri" disabled={ocupado} onClick={() => setForm(formVazio())}><Icon n="plus" />Nova medição</button>
      )}
      {!ativo && <p className="note">Só contrato Aprovado / ativo recebe medição. Este está em {c.status}.</p>}
      {ativo && c.completo && <p className="note">Contrato 100% medido. Já pode ir para Concluído no quadro.</p>}

      {form && (
        <NovaMedicao ficha={ficha} form={form} setForm={setForm} ocupado={ocupado} onSalvar={salvar} onCancelar={cancelar} />
      )}

      <h2 className="h2">Histórico de medições</h2>
      {!ficha.boletins.length ? (
        <Empty icone="regua" titulo="Nenhuma medição lançada ainda." texto={ativo ? 'Toque em Nova medição para lançar a nº 1.' : ''} />
      ) : (
        <div className="card list">
          {ficha.boletins.map((b) => (
            <div className="row" key={b.id}>
              <div className="tx">
                <div className="tt">Medição nº <span className="num">{b.numero}</span></div>
                <div className="mt"><span className="num">{fmtData(b.data)}</span> · {b.pago ? 'paga' : <>pagar em <span className="num">{fmtData(b.pagar_em)}</span></>}</div>
                {!b.pago && !b.salvando && <button className="link" disabled={ocupado} onClick={() => pagar(b)}>Marcar como paga</button>}
              </div>
              <div className="val">{brl(b.valor)}<div>
                {b.salvando ? <Tag tom="ne">Salvando…</Tag> : b.pago ? <Tag tom="ok">Paga</Tag> : <Tag tom={boletimAtrasado(b, hoje()) ? 'cr' : 'at'}>A pagar</Tag>}
              </div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NovaMedicao({ ficha, form, setForm, ocupado, onSalvar, onCancelar }) {
  const [tentou, setTentou] = useState(false)
  const c = ficha.contrato
  const conta = calcularBoletim(c, c.itens, c, ficha.acumulados, form)
  const erro = (k) => (tentou || k === 'global' || k.startsWith('l.')) && conta.erros[k]

  const mudarData = (data) => setForm((f) => ({ ...f, data, pagar_em: f.pagarMexido || !data ? f.pagar_em : pagarEmPadrao(data) }))
  const digitarGlobal = (campo, texto) => setForm((f) => ({ ...f, global: { campo, texto: soNumero(texto) } }))
  const digitarLinha = (id, campo, texto) => setForm((f) => ({ ...f, linhas: { ...f.linhas, [id]: { campo, texto: soNumero(texto) } } }))
  const enviar = (e) => {
    e.preventDefault()
    setTentou(true)
    if (!Object.keys(conta.erros).length) onSalvar(conta)
  }

  // O campo digitado mostra o texto da pessoa; os outros dois, o que saiu da conta.
  const mostrar = (entrada, campo, derivado, casas, invalido, minimo = 0) => {
    if (entrada?.campo === campo) return entrada.texto
    if (!entrada?.texto || invalido) return ''
    return fmt(derivado, casas, minimo)
  }

  return (
    <form className="card pad col emp-med" onSubmit={enviar} noValidate>
      <h2 className="h2">Medição nº <span className="num">{ficha.proximo_numero}</span></h2>
      <div className="grid2">
        <div className="field">
          <label htmlFor="bm-data">Data da medição</label>
          <input id="bm-data" className="inp" type="date" value={form.data} max={hoje()} onChange={(e) => mudarData(e.target.value)} required />
          {erro('data') && <div className="err" role="alert">{conta.erros.data}</div>}
        </div>
        <div className="field">
          <label htmlFor="bm-pagar">Pagar em</label>
          <input id="bm-pagar" className="inp" type="date" value={form.pagar_em} onChange={(e) => setForm((f) => ({ ...f, pagar_em: e.target.value, pagarMexido: true }))} required />
          {erro('pagar_em') && <div className="err" role="alert">{conta.erros.pagar_em}</div>}
        </div>
      </div>
      <p className="note">Ao salvar, o valor entra no &quot;a pagar&quot; da obra nesta data, junto com o fechamento da quinzena.</p>

      {c.tipo === GLOBAL ? (
        <div className="grid2">
          <div className="field">
            <label htmlFor="bm-pct">% desta medição</label>
            <input id="bm-pct" className="inp num" type="text" inputMode="decimal" placeholder="0"
              value={mostrar(form.global, 'percentual', conta.percentual, 2, !!conta.erros.global && form.global?.campo !== 'percentual')}
              onChange={(e) => digitarGlobal('percentual', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="bm-valor">Valor desta medição (R$)</label>
            <input id="bm-valor" className="inp num" type="text" inputMode="decimal" placeholder="0,00"
              value={mostrar(form.global, 'valor', conta.total, 2, !!conta.erros.global && form.global?.campo !== 'valor', 2)}
              onChange={(e) => digitarGlobal('valor', e.target.value)} />
          </div>
          {erro('global') && <div className="err emp-largo" role="alert">{conta.erros.global}</div>}
        </div>
      ) : (
        <div className="emp-ml-lista">
          <p className="note">Em cada item, digite a quantidade, o % ou o R$: o app calcula os outros dois.</p>
          <div className="emp-ml emp-ml-cab" aria-hidden="true">
            <span>Item</span><span>Quantidade</span><span>%</span><span>R$</span><span>Novo acumulado</span>
          </div>
          {c.itens.map((i, k) => {
            const l = conta.linhas[k]
            const ent = form.linhas[i.id]
            const ruim = !!l.erro
            const acumAntes = ficha.acumulados[i.id] || 0
            return (
              <div className={`emp-ml${ruim ? ' ruim' : ''}`} key={i.id}>
                <div className="emp-ml-nome">
                  <b>{i.descricao}</b>
                  <span className="note">
                    Contratado <span className="num">{fmt(Number(i.quantidade), 4)} {i.unidade}</span> × <span className="num">{brl(i.preco_unitario)}</span>
                    {' · '}já medido <span className="num">{fmt(acumAntes, 4)} {i.unidade}</span>
                  </span>
                </div>
                <div className="field">
                  <label htmlFor={`bm-q-${i.id}`}>Quantidade ({i.unidade})</label>
                  <input id={`bm-q-${i.id}`} className="inp num" type="text" inputMode="decimal" placeholder="0"
                    value={mostrar(ent, 'quantidade', l.quantidade, 4, ruim)} onChange={(e) => digitarLinha(i.id, 'quantidade', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`bm-p-${i.id}`}>%</label>
                  <input id={`bm-p-${i.id}`} className="inp num" type="text" inputMode="decimal" placeholder="0"
                    value={mostrar(ent, 'percentual', l.percentual, 2, ruim)} onChange={(e) => digitarLinha(i.id, 'percentual', e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor={`bm-v-${i.id}`}>R$</label>
                  <input id={`bm-v-${i.id}`} className="inp num" type="text" inputMode="decimal" placeholder="0,00"
                    value={mostrar(ent, 'valor', l.valor, 2, ruim, 2)} onChange={(e) => digitarLinha(i.id, 'valor', e.target.value)} />
                </div>
                <div className="emp-ml-novo">
                  <span className="emp-ml-rot">Novo acumulado</span>
                  <b className="num">{fmtPct(ruim ? l.percentual_anterior : l.percentual_acumulado)}</b>
                </div>
                {ruim && <div className="err emp-ml-err" role="alert">{l.erro}</div>}
              </div>
            )
          })}
        </div>
      )}

      <div className="emp-rodape">
        <div><span className="lab">Total desta medição</span><b className="num">{brl(conta.total)}</b></div>
        <div><span className="lab">Novo acumulado</span><span><b className="num">{brl(conta.novo_acumulado)}</b> <span className="note num">{fmtPct(conta.novo_percentual)}</span></span></div>
        <div><span className="lab">Saldo depois</span><b className="num">{brl(conta.novo_saldo)}</b></div>
      </div>
      {tentou && conta.erros.total && <div className="err" role="alert">{conta.erros.total}</div>}
      {tentou && Object.keys(conta.erros).length > 0 && !conta.erros.total && <div className="err" role="alert">Confira os campos marcados acima.</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado}><Icon n="check" />Salvar medição</button>
      </div>
    </form>
  )
}
