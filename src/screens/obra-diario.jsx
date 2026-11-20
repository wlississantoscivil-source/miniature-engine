import { useEffect, useRef, useState } from 'react'
import { Topo, Faixa, Sheet, Tag, Empty, Icon, useCarregar, useToast } from '../components/index.jsx'
import { efetivoDoDia, listarDiarios, salvarDiario } from '../lib/dados.js'
import { CLIMAS, climaRuim, diaDaSemana, diarioPendente, errosDiario, fmtData, hoje, momentoLocal } from '../lib/regras.js'

// Módulo Diário de obra: um diário por dia por obra.
// Histórico do mais recente para o mais antigo; "Lançar diário de hoje" abre a
// folha que sobe com o formulário. As fotos ficam só na miniatura deste aparelho
// enquanto a tela está aberta: ainda não há onde guardar o arquivo (Storage).
// O rascunho (campos + fotos) mora aqui, fora do formulário: se a gravação
// falhar, a folha reabre com tudo o que foi digitado.
const rascunhoVazio = () => ({ campos: { data: hoje(), clima_manha: '', clima_tarde: '', servicos: '', ocorrencias: '' }, fotos: [] })
const temConteudo = ({ campos: c, fotos }) => !!(c.servicos.trim() || c.ocorrencias.trim() || c.clima_manha || c.clima_tarde || fotos.length)
const soltarFotos = (fotos) => fotos.forEach((x) => URL.revokeObjectURL(x.url))
const FUNDOS = ['#8A6A4F', '#5E7A63', '#4A6B87', '#9A5B3C']

export default function Diario({ perfil, obra, embutida, seletor }) {
  const dados = useCarregar(() => listarDiarios(perfil, obra.id), [obra.id])
  const [lista, setLista] = useState([])
  const [rascunho, setRascunho] = useState(null) // null = folha fechada
  const toast = useToast()

  useEffect(() => { if (dados.data) setLista(dados.data.diarios) }, [dados.data])

  const abrir = () => setRascunho(rascunhoVazio())
  // Fechar (Cancelar ou tocar fora da folha) com algo preenchido pergunta antes.
  const fechar = () => {
    if (temConteudo(rascunho) && !window.confirm('O que você preencheu será descartado. Sair mesmo assim?')) return
    soltarFotos(rascunho.fotos)
    setRascunho(null)
  }

  // Otimista: entra na lista e a folha fecha na hora; se a gravação falhar,
  // o dia sai da lista e a folha reabre com o rascunho.
  async function salvar(efetivo) {
    const { campos, fotos } = rascunho
    const provisorio = {
      ...campos, servicos: campos.servicos.trim(), ocorrencias: campos.ocorrencias.trim() || null, id: `novo-${campos.data}`, autor: perfil.nome, efetivo, created_at: momentoLocal(),
      fotos: fotos.map((x, k) => ({ id: k, url: x.url, legenda: x.legenda.trim() })),
    }
    const antes = lista
    setLista([provisorio, ...lista].sort((a, b) => (a.data < b.data ? 1 : -1)))
    setRascunho(null)
    const { data, erro } = await salvarDiario(perfil, obra.id, campos)
    if (erro) {
      setLista(antes)
      setRascunho({ campos, fotos })
      return toast(erro)
    }
    // Não relê a lista: as miniaturas (que não vão para o banco) somem só ao sair da tela.
    setLista((l) => l.map((d) => (d.id === provisorio.id ? { ...d, id: data.id } : d)))
    toast('Diário salvo.')
  }

  const pendente = diarioPendente(obra.status, lista.some((d) => d.data === hoje()))
  const faixa = <Faixa acao={<button className="btn pri" onClick={abrir}><Icon n="plus" />Lançar diário de hoje</button>} />

  let corpo
  if (dados.carregando && !dados.data) corpo = <div className="loading">Carregando…</div>
  else if (dados.erro) {
    corpo = (
      <div className="card pad col">
        <div className="err" role="alert">{dados.erro}</div>
        <button className="btn sec" onClick={dados.recarregar}><Icon n="repeat" />Tentar de novo</button>
      </div>
    )
  } else if (!lista.length) {
    corpo = (
      <Empty icone="diario" titulo="Nenhum dia lançado no diário desta obra." texto="Registre o clima, os serviços do dia e as fotos.">
        <button className="btn pri" onClick={abrir}><Icon n="plus" />Lançar o primeiro diário</button>
      </Empty>
    )
  } else {
    corpo = (
      <>
        {pendente && (
          <button className="alert at" onClick={abrir}><Icon n="diario" /><span>Diário de hoje ainda não lançado<small>Clima, serviços e fotos do dia</small></span><span className="go">Lançar ›</span></button>
        )}
        <div className="sec-h"><span className="lab">{lista.length} {lista.length === 1 ? 'dia lançado' : 'dias lançados'}</span></div>
        {lista.map((d) => <CartaoDia key={d.id} d={d} />)}
      </>
    )
  }

  const conteudo = (
    <div className="ct">
      {faixa}
      {corpo}
      <Sheet aberta={!!rascunho} onFechar={fechar} titulo="Diário do dia">
        {rascunho && <FormDiario perfil={perfil} obra={obra} existentes={lista} rascunho={rascunho} setRascunho={setRascunho} onSalvar={salvar} onCancelar={fechar} />}
      </Sheet>
    </div>
  )

  if (embutida) return conteudo
  return (
    <>
      <Topo titulo="Diário de Obra" sub={obra.nome}>{seletor}</Topo>
      {conteudo}
    </>
  )
}

// Cartão de um dia: a primeira linha dos serviços; tocar mostra tudo e quem lançou.
function CartaoDia({ d }) {
  const [aberto, setAberto] = useState(false)
  const linhas = d.servicos.split('\n').filter(Boolean)
  return (
    <div className="card pad col">
      <button className="diario-cab" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        <div className="diario-dia"><b>{d.data.slice(8, 10)}</b><span>{diaDaSemana(d.data).slice(0, 3)}</span></div>
        <div className="tx">
          <div className="tt">{fmtData(d.data)} · {diaDaSemana(d.data)}</div>
          <div className="mt">{aberto ? linhas.join(' · ') : linhas[0]}{!aberto && linhas.length > 1 ? ` (+${linhas.length - 1})` : ''}</div>
        </div>
      </button>
      <div className="btns">
        <Tag tom={climaRuim(d.clima_manha) ? 'at' : 'ne'}>Manhã: {d.clima_manha}</Tag>
        <Tag tom={climaRuim(d.clima_tarde) ? 'at' : 'ne'}>Tarde: {d.clima_tarde}</Tag>
        <Tag tom="ne">{d.efetivo == null ? 'Presença não lançada' : `Efetivo ${d.efetivo}`}</Tag>
        {d.fotos.length > 0 && <Tag tom="ne">{d.fotos.length} {d.fotos.length === 1 ? 'foto' : 'fotos'}</Tag>}
      </div>
      {aberto && d.ocorrencias && <div><div className="lab">Ocorrências</div><div>{d.ocorrencias}</div></div>}
      {d.fotos.length > 0 && <Miniaturas fotos={d.fotos} />}
      {aberto && <div className="stamp">Lançado por {d.autor} · {fmtData(d.created_at.slice(0, 10))} {d.created_at.slice(11, 16)}</div>}
    </div>
  )
}

function Miniaturas({ fotos }) {
  return (
    <div className="photos">
      {fotos.map((foto, k) => (
        <div key={foto.id} className="ph" style={foto.url ? null : { background: `linear-gradient(135deg,${FUNDOS[k % FUNDOS.length]},#3B2A22)` }}>
          {foto.url && <img src={foto.url} alt={foto.legenda || 'Foto do diário'} />}
          {foto.legenda && <span>{foto.legenda}</span>}
        </div>
      ))}
    </div>
  )
}

function EscolhaClima({ rotulo, valor, erro, onEscolher }) {
  return (
    <div className="field">
      <span className="flabel">{rotulo}</span>
      <div className="wx" role="radiogroup" aria-label={rotulo}>
        {CLIMAS.map((c) => (
          <button type="button" key={c} role="radio" aria-checked={valor === c} className={valor === c ? `on${climaRuim(c) ? ' ch' : ''}` : ''} onClick={() => onEscolher(c)}>{c}</button>
        ))}
      </div>
      {erro && <div className="err" role="alert">{erro}</div>}
    </div>
  )
}

function FormDiario({ perfil, obra, existentes, rascunho, setRascunho, onSalvar, onCancelar }) {
  const { campos, fotos } = rascunho
  // A data já nasce preenchida: o aviso dela (dia repetido, fora do prazo) aparece na hora.
  const [tocado, setTocado] = useState({ data: true })
  const [tentou, setTentou] = useState(false)
  const arquivo = useRef(null)
  const efetivo = useCarregar(() => efetivoDoDia(perfil, obra.id, campos.data), [obra.id, campos.data])

  const erros = errosDiario(perfil, campos, existentes)
  const aviso = (c) => ((tentou || tocado[c]) && erros[c]) || null
  const mudar = (c, valor) => {
    setRascunho((r) => ({ ...r, campos: { ...r.campos, [c]: valor } }))
    setTocado((t) => ({ ...t, [c]: true }))
  }
  const mudarFotos = (fn) => setRascunho((r) => ({ ...r, fotos: fn(r.fotos) }))

  const addFotos = (e) => {
    const novas = [...e.target.files].filter((x) => x.type.startsWith('image/')).map((x) => ({ url: URL.createObjectURL(x), legenda: '' }))
    mudarFotos((v) => [...v, ...novas])
    e.target.value = ''
  }
  const tirarFoto = (k) => {
    if (!window.confirm('Tirar esta foto do diário?')) return
    URL.revokeObjectURL(fotos[k].url)
    mudarFotos((v) => v.filter((_, i) => i !== k))
  }
  const legenda = (k, txt) => mudarFotos((v) => v.map((x, i) => (i === k ? { ...x, legenda: txt } : x)))

  const enviar = (e) => {
    e.preventDefault()
    setTentou(true)
    if (Object.keys(erros).length) return
    onSalvar(efetivo.data?.efetivo ?? null)
  }

  return (
    <form className="col" onSubmit={enviar} noValidate>
      <div className="field">
        <label htmlFor="d-data">Data</label>
        <input id="d-data" className="inp" type="date" max={hoje()} value={campos.data} onChange={(e) => mudar('data', e.target.value)} required />
        {aviso('data') && <div className="err" role="alert">{aviso('data')}</div>}
      </div>

      <EscolhaClima rotulo="Clima de manhã" valor={campos.clima_manha} erro={aviso('clima_manha')} onEscolher={(c) => mudar('clima_manha', c)} />
      <EscolhaClima rotulo="Clima à tarde" valor={campos.clima_tarde} erro={aviso('clima_tarde')} onEscolher={(c) => mudar('clima_tarde', c)} />

      <div className="field">
        <span className="flabel">Efetivo</span>
        <div className="muted">
          {efetivo.carregando ? 'Contando…' : efetivo.erro ? efetivo.erro
            : efetivo.data.efetivo == null ? 'Presença não lançada neste dia (lance em Presença).'
              : `${efetivo.data.efetivo} ${efetivo.data.efetivo === 1 ? 'pessoa presente' : 'pessoas presentes'} (vem da Presença)`}
        </div>
      </div>

      <div className="field">
        <label htmlFor="d-serv">Serviços executados · um por linha</label>
        <textarea id="d-serv" value={campos.servicos} onChange={(e) => mudar('servicos', e.target.value)} placeholder="Ex.: Alvenaria do bloco B, eixos 3 a 5" required />
        {aviso('servicos') && <div className="err" role="alert">{aviso('servicos')}</div>}
      </div>
      <div className="field">
        <label htmlFor="d-oc">Ocorrências (opcional)</label>
        <textarea id="d-oc" style={{ minHeight: 84 }} value={campos.ocorrencias} onChange={(e) => mudar('ocorrencias', e.target.value)} placeholder="Atrasos, falta de material, chuva, visita do fiscal…" />
      </div>

      <div className="field">
        <span className="flabel">Fotos (opcional)</span>
        <div className="photos">
          {fotos.map((x, k) => (
            <div key={x.url} className="col" style={{ gap: 6 }}>
              <div className="ph"><img src={x.url} alt={x.legenda || `Foto ${k + 1}`} /></div>
              <input className="inp" aria-label={`Legenda da foto ${k + 1}`} placeholder="Legenda" value={x.legenda} onChange={(e) => legenda(k, e.target.value)} />
              <button type="button" className="btn sec sm" onClick={() => tirarFoto(k)}>Tirar</button>
            </div>
          ))}
          <button type="button" className="ph add" onClick={() => arquivo.current.click()}><Icon n="plus" />Adicionar foto</button>
        </div>
        <input ref={arquivo} type="file" accept="image/*" capture="environment" multiple hidden onChange={addFotos} />
        <div className="stamp">As fotos ainda não são guardadas: aparecem só até você sair desta tela.</div>
      </div>

      {tentou && Object.keys(erros).length > 0 && <div className="err" role="alert">Confira os campos marcados acima.</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri"><Icon n="check" />Salvar diário</button>
      </div>
    </form>
  )
}
