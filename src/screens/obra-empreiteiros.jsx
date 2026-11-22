import { useState } from 'react'
import { Empty, Faixa, Icon, Seg, Sheet, Tag, useCarregar, useToast } from '../components/index.jsx'
import { ativarContratoEmpreiteiro, contratosEmpreiteiros, criarContratoEmpreiteiro, moverContratoEmpreiteiro } from '../lib/dados.js'
import {
  ATIVO, erroMover, errosContrato, GLOBAL, lerValorContrato, POR_ESCOPO, STATUS_CONTRATO, temFicha, textoPercentual, TIPOS_CONTRATO, totalDoFormulario,
  UNIDADES_EMPREITEIRO,
} from '../lib/empreiteiros.js'
import { brl, plural } from '../lib/regras.js'
import FichaMedicao from './obra-empreiteiros-ficha.jsx'

// Medições de empreiteiros: o fluxo do contrato (Kanban), o cadastro do valor
// ao ativar e, pelo cartão, a Ficha de Medição (obra-empreiteiros-ficha.jsx),
// aberta em params.sub = id do contrato. Mover é por botão (sem arrastar).
// Quem decide se pode mover ou medir é dados.js.

const DESCARTAR = 'O que você preencheu será descartado. Sair mesmo assim?'
const soNumero = (v) => v.replace(/[^\d.,]/g, '')
let chaveLinha = 0
const linhaVazia = () => ({ chave: ++chaveLinha, descricao: '', unidade: 'm²', quantidade: '', preco_unitario: '' })
const paraTexto = (n) => (n == null ? '' : String(n).replace('.', ','))

// Formulário do valor: começa do que o contrato já tinha (se voltou de coluna).
function formDoContrato(c) {
  if (c.tipo === POR_ESCOPO && c.itens.length) {
    return {
      tipo: c.tipo, valor_global: '',
      itens: c.itens.map((i) => ({ chave: ++chaveLinha, descricao: i.descricao, unidade: i.unidade, quantidade: paraTexto(i.quantidade), preco_unitario: paraTexto(i.preco_unitario) })),
    }
  }
  return { tipo: c.tipo || GLOBAL, valor_global: paraTexto(c.valor_global), itens: [linhaVazia()] }
}
const valorPreenchido = (f) => !!f.valor_global || f.itens.some((i) => i.descricao || i.quantidade || i.preco_unitario)

// Um campo mostra o erro depois de mexido, e todos depois de tentar salvar.
function useAvisos(erros) {
  const [tocado, setTocado] = useState({})
  const [tentou, setTentou] = useState(false)
  return {
    aviso: (c) => ((tentou || tocado[c]) && erros[c]) || null,
    tocar: (c) => setTocado((t) => ({ ...t, [c]: true })),
    tentar: () => { setTentou(true); return !Object.keys(erros).length },
    confira: tentou && Object.keys(erros).length > 0,
  }
}

export default function MedicoesEmpreiteiros({ perfil, obra, sub, setSub }) {
  const carga = useCarregar(() => contratosEmpreiteiros(perfil, obra.id), [obra.id])
  const [local, setLocal] = useState(null) // o quadro depois da última gravação
  const [novo, setNovo] = useState(null) // campos do Novo contrato
  const [ativando, setAtivando] = useState(null) // { contrato, form }
  const [ocupado, setOcupado] = useState(false)
  const toast = useToast()

  // Só vale o quadro desta obra: trocar de obra nunca mostra o da anterior.
  const quadro = local?.obra_id === obra.id ? local : carga.data?.obra_id === obra.id ? carga.data : null

  async function gravar(promessa, aviso) {
    setOcupado(true)
    const { data, erro } = await promessa
    setOcupado(false)
    if (erro) { toast(erro); return false }
    setLocal(data)
    if (aviso) toast(aviso)
    return true
  }

  if (sub) {
    // Ao voltar, o quadro relê os números (a ficha pode ter lançado boletim).
    const voltar = () => { setLocal(null); carga.recarregar(); setSub(null) }
    return <FichaMedicao perfil={perfil} obra={obra} contratoId={sub} onVoltar={voltar} />
  }

  if (!quadro && carga.erro) {
    return (
      <div className="ct">
        <div className="card pad col">
          <p className="err" role="alert">{carga.erro}</p>
          <button className="btn sec" onClick={carga.recarregar}><Icon n="repeat" />Tentar de novo</button>
        </div>
      </div>
    )
  }
  if (!quadro) return <div className="ct"><div className="loading">Carregando…</div></div>

  const abrirNovo = () => setNovo({ empreiteiro: '', descricao: '' })
  const fecharNovo = () => {
    if ((novo.empreiteiro || novo.descricao) && !window.confirm(DESCARTAR)) return
    setNovo(null)
  }
  const fecharValor = () => {
    if (valorPreenchido(ativando.form) && !window.confirm(DESCARTAR)) return
    setAtivando(null)
  }
  // Otimista: o cartão muda de coluna na hora; se o banco recusar, volta. A regra
  // (lib) é perguntada antes, para o cartão não pular para onde não pode ir.
  const mover = async (c, destino) => {
    const recusa = erroMover(c, destino, c)
    if (recusa) { toast(recusa); return }
    const antes = quadro
    setLocal({ ...quadro, contratos: quadro.contratos.map((x) => (x.id === c.id ? { ...x, status: destino } : x)) })
    if (!(await gravar(moverContratoEmpreiteiro(perfil, obra.id, c.id, destino), `Movido para ${destino}.`))) setLocal(antes)
  }
  const avancar = (c, destino) => (destino === ATIVO ? setAtivando({ contrato: c, form: formDoContrato(c) }) : mover(c, destino))

  return (
    <div className="ct">
      <Faixa acao={<button className="btn pri" onClick={abrirNovo}><Icon n="plus" />Novo contrato</button>} />

      {!quadro.contratos.length ? (
        <Empty icone="regua" titulo="Nenhum contrato de empreiteiro nesta obra." texto="Cadastre o primeiro: ele nasce em Em elaboração e você leva até Aprovado / ativo.">
          <button className="btn pri" onClick={abrirNovo}><Icon n="plus" />Novo contrato</button>
        </Empty>
      ) : (
        <div className="look kanban emp-quadro">
          {STATUS_CONTRATO.map((status, k) => {
            const cartoes = quadro.contratos.filter((c) => c.status === status)
            const antes = STATUS_CONTRATO[k - 1]
            const depois = STATUS_CONTRATO[k + 1]
            return (
              <section key={status} className="look-col" aria-label={status}>
                <header className="look-cab"><b>{status}</b><span>{plural(cartoes.length, 'contrato', 'contratos')}</span></header>
                {!cartoes.length && <p className="look-vazio">Nada aqui.</p>}
                {cartoes.map((c) => (
                  <CartaoContrato key={c.id} c={c} ocupado={ocupado} antes={antes} depois={depois}
                    onVoltar={() => mover(c, antes)} onAvancar={() => avancar(c, depois)} onFicha={() => setSub(c.id)} />
                ))}
              </section>
            )
          })}
        </div>
      )}

      <Sheet aberta={!!novo} onFechar={fecharNovo} titulo="Novo contrato">
        {novo && (
          <FormNovoContrato campos={novo} setCampos={setNovo} sugestoes={quadro.sugestoes} ocupado={ocupado} onCancelar={fecharNovo}
            onSalvar={async () => { if (await gravar(criarContratoEmpreiteiro(perfil, obra.id, novo), 'Contrato criado em Em elaboração.')) setNovo(null) }} />
        )}
      </Sheet>

      <Sheet aberta={!!ativando} onFechar={fecharValor} titulo="Valor do contrato">
        {ativando && (
          <FormValor key={ativando.contrato.id} contrato={ativando.contrato} form={ativando.form} ocupado={ocupado} onCancelar={fecharValor}
            setForm={(fn) => setAtivando((a) => ({ ...a, form: fn(a.form) }))}
            onSalvar={async () => {
              if (await gravar(ativarContratoEmpreiteiro(perfil, obra.id, ativando.contrato.id, ativando.form), 'Contrato ativado. Já pode receber medição.')) setAtivando(null)
            }} />
        )}
      </Sheet>
    </div>
  )
}

function CartaoContrato({ c, ocupado, antes, depois, onVoltar, onAvancar, onFicha }) {
  return (
    <article className="card look-card emp-card">
      <div className="look-desc">{c.empreiteiro}</div>
      <div className="look-mt">{c.descricao}</div>
      {c.valor_total != null && (
        <div className="emp-valor"><span className="num">{brl(c.valor_total)}</span><Tag tom="ne" plain>{c.tipo}</Tag></div>
      )}
      {c.status === ATIVO && (
        <>
          <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c.percentual)} aria-label="Medido">
            <i style={{ width: `${Math.min(c.percentual, 100)}%` }} />
          </div>
          <div className="look-mt">
            <span className="num">{textoPercentual(c.percentual, c.completo)}</span> medido · {c.n_boletins ? plural(c.n_boletins, 'boletim', 'boletins') : 'nenhum boletim'}
          </div>
        </>
      )}
      {temFicha(c) && (
        <button className={`btn ${c.status === ATIVO ? 'pri' : 'sec'} sm`} onClick={onFicha}><Icon n="regua" />Ficha de medição</button>
      )}
      <div className="emp-mover">
        {antes && <button className="btn sec sm" disabled={ocupado} onClick={onVoltar} aria-label={`Voltar para ${antes}`}><Icon n="back" />Voltar</button>}
        {depois && <button className="btn sec sm emp-avancar" disabled={ocupado} onClick={onAvancar} aria-label={`Avançar para ${depois}`}>Avançar<Icon n="next" /></button>}
      </div>
    </article>
  )
}

function FormNovoContrato({ campos, setCampos, sugestoes, ocupado, onSalvar, onCancelar }) {
  const erros = errosContrato(campos)
  const { aviso, tocar, tentar, confira } = useAvisos(erros)
  const mudar = (c, v) => { setCampos((f) => ({ ...f, [c]: v })); tocar(c) }
  const enviar = (e) => { e.preventDefault(); if (tentar()) onSalvar() }
  return (
    <form className="col" onSubmit={enviar} noValidate>
      <div className="field">
        <label htmlFor="ce-emp">Empreiteiro</label>
        <input id="ce-emp" className="inp" list="ce-sugestoes" value={campos.empreiteiro} maxLength={120} autoFocus required
          onChange={(e) => mudar('empreiteiro', e.target.value)} placeholder="Ex.: Gesso Nordeste" />
        <datalist id="ce-sugestoes">{sugestoes.map((s) => <option key={s} value={s} />)}</datalist>
        {aviso('empreiteiro') && <div className="err" role="alert">{aviso('empreiteiro')}</div>}
      </div>
      <div className="field">
        <label htmlFor="ce-desc">Serviço contratado</label>
        <input id="ce-desc" className="inp" value={campos.descricao} maxLength={200} required
          onChange={(e) => mudar('descricao', e.target.value)} placeholder="Ex.: Forro de gesso das salas" />
        {aviso('descricao') && <div className="err" role="alert">{aviso('descricao')}</div>}
      </div>
      <p className="note">O contrato nasce em <b>Em elaboração</b>. O valor você cadastra quando ele for aprovado.</p>
      {confira && <div className="err" role="alert">Confira os campos marcados acima.</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado}><Icon n="check" />Criar</button>
      </div>
    </form>
  )
}

function FormValor({ contrato, form, setForm, ocupado, onSalvar, onCancelar }) {
  const { erros } = lerValorContrato(form)
  const { aviso, tocar, tentar, confira } = useAvisos(erros)
  const total = totalDoFormulario(form)
  const mudar = (c, v) => { setForm((f) => ({ ...f, [c]: v })); tocar(c) }
  const mudarItem = (k, c, v) => {
    setForm((f) => ({ ...f, itens: f.itens.map((i, j) => (j === k ? { ...i, [c]: v } : i)) }))
    tocar(`i${k}.${c}`)
  }
  const adicionar = () => setForm((f) => ({ ...f, itens: [...f.itens, linhaVazia()] }))
  const remover = (k) => {
    const i = form.itens[k]
    if ((i.descricao || i.quantidade || i.preco_unitario) && !window.confirm(`Remover o item ${k + 1}${i.descricao ? ` (${i.descricao})` : ''}?`)) return
    setForm((f) => ({ ...f, itens: f.itens.filter((_, j) => j !== k) }))
  }
  const enviar = (e) => { e.preventDefault(); if (tentar()) onSalvar() }
  const totalLinha = (i) => totalDoFormulario({ tipo: POR_ESCOPO, itens: [i] })

  return (
    <form className="col" onSubmit={enviar} noValidate>
      <p className="note"><b>{contrato.empreiteiro}</b> · {contrato.descricao}</p>
      <Seg grande opcoes={TIPOS_CONTRATO} valor={form.tipo} onChange={(t) => mudar('tipo', t)} />

      {form.tipo === GLOBAL ? (
        <div className="field">
          <label htmlFor="cv-global">Valor total fechado (R$)</label>
          <input id="cv-global" className="inp num" type="text" inputMode="decimal" autoFocus value={form.valor_global} placeholder="0,00"
            onChange={(e) => mudar('valor_global', soNumero(e.target.value))} />
          {aviso('valor_global') && <div className="err" role="alert">{aviso('valor_global')}</div>}
        </div>
      ) : (
        <div className="emp-itens">
          {form.itens.map((i, k) => (
            <div className="card pad emp-item" key={i.chave}>
              <div className="emp-item-top">
                <b>Item <span className="num">{k + 1}</span></b>
                <button type="button" className="link" onClick={() => remover(k)} aria-label={`Remover o item ${k + 1}`}>Remover</button>
              </div>
              <div className="field">
                <label htmlFor={`cv-d-${i.chave}`}>Descrição</label>
                <input id={`cv-d-${i.chave}`} className="inp" value={i.descricao} maxLength={160} placeholder="Ex.: Placas de drywall"
                  onChange={(e) => mudarItem(k, 'descricao', e.target.value)} />
                {aviso(`i${k}.descricao`) && <div className="err" role="alert">{aviso(`i${k}.descricao`)}</div>}
              </div>
              <div className="emp-item-nums">
                <div className="field">
                  <label htmlFor={`cv-u-${i.chave}`}>Unidade</label>
                  <select id={`cv-u-${i.chave}`} className="inp" value={i.unidade} onChange={(e) => mudarItem(k, 'unidade', e.target.value)}>
                    {UNIDADES_EMPREITEIRO.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`cv-q-${i.chave}`}>Quantidade</label>
                  <input id={`cv-q-${i.chave}`} className="inp num" type="text" inputMode="decimal" value={i.quantidade} placeholder="0"
                    onChange={(e) => mudarItem(k, 'quantidade', soNumero(e.target.value))} />
                </div>
                <div className="field">
                  <label htmlFor={`cv-p-${i.chave}`}>Preço unit. (R$)</label>
                  <input id={`cv-p-${i.chave}`} className="inp num" type="text" inputMode="decimal" value={i.preco_unitario} placeholder="0,00"
                    onChange={(e) => mudarItem(k, 'preco_unitario', soNumero(e.target.value))} />
                </div>
              </div>
              {(aviso(`i${k}.quantidade`) || aviso(`i${k}.preco_unitario`)) && (
                <div className="err" role="alert">{[aviso(`i${k}.quantidade`), aviso(`i${k}.preco_unitario`)].filter(Boolean).join(' ')}</div>
              )}
              <div className="emp-item-tot">Total do item <b className="num">{brl(totalLinha(i))}</b></div>
            </div>
          ))}
          {aviso('itens') && <div className="err" role="alert">{aviso('itens')}</div>}
          <button type="button" className="btn sec" onClick={adicionar}><Icon n="plus" />Adicionar item</button>
        </div>
      )}

      <div className="card pad emp-total">
        <span className="lab">Valor total do contrato</span>
        <b className="num">{brl(total)}</b>
      </div>
      {confira && <div className="err" role="alert">Confira os campos marcados acima.</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado}><Icon n="check" />Ativar contrato</button>
      </div>
    </form>
  )
}
