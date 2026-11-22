import { useEffect, useState } from 'react'
import { Faixa, Kpi, Seg, Sheet, Tag, Topo, Empty, Icon, useCarregar, useToast } from '../components/index.jsx'
import {
  arquivarAtividade, listarPlanejamento, marcarNaoRealizado, marcarSubtarefa, moverAtividade, moverNaSemana, moverRestricao, resolverRestricao, salvarAtividade,
  salvarProgresso, salvarRestricao, salvarSubtarefa, subtarefaNaoRealizada,
} from '../lib/dados.js'
import {
  abasPlanejamento, atividadesDaSemana, CAUSAS_NAO_REALIZADO, causasDaSemana, CONCLUIDO, diasUteis, ehFolha, erroCausa, erroDesarquivar, erroProgresso,
  errosAtividade, errosRestricao, erroSubtarefa, escalaCronograma, montarEap, montarLookahead, naoRealizadaNaSemana, NIVEL_MAXIMO, paisPossiveis,
  podeMarcarNaoRealizado, podeMexerNaSemana, podeVoltarSemana, ppcDaSemana, prazoNovaRestricao, progressoPrevisto, proximoDiaUtil, restricaoVencida,
  restricoesAbertas, resumoPrazo, rotuloSemana, SEMANAS_LOOKAHEAD, semanaDe, situacaoPrazo, statusDe, STATUS_ATIVIDADE, subtarefasDe, textoReal,
  TIPOS_RESTRICAO, tomPpc, tomReal,
} from '../lib/planejamento.js'
import { fmtData, fmtDiaMes, hoje, plural, somarDias } from '../lib/regras.js'

// Módulo Planejamento (Last Planner): EAP → Longo prazo → Médio prazo → Curto prazo.
// REGRA DE OURO: as quatro abas leem e mudam a MESMA lista de atividades (e as
// restrições e subtarefas ligadas a elas), que mora aqui (`plano`). Toda gravação
// devolve as listas inteiras da obra e `aplicar` troca o estado de uma vez; nenhuma aba guarda cópia.
// Grava no banco (atividades_plano, restricoes_plano, subtarefas_plano) pela camada de dados.
// Na barra do Mestre (sem `embutida`) só existe o Curto prazo, com o seletor de obra no topo.
export default function Planejamento({ perfil, obra, sub, setSub, embutida, seletor }) {
  const dados = useCarregar(() => listarPlanejamento(perfil, obra.id), [obra.id])
  // { atividades, restricoes, subtarefas } da obra: o estado ÚNICO das quatro abas.
  const [plano, aplicar] = useState(null)
  const [subLocal, setSubLocal] = useState(null)
  const trocarAba = setSub || setSubLocal
  const abas = abasPlanejamento(perfil.role)
  const pedida = setSub ? sub : subLocal
  const aba = abas.some((a) => a.id === pedida) ? pedida : abas[0].id

  useEffect(() => { if (dados.data) aplicar(dados.data) }, [dados.data])

  let corpo
  if (dados.erro) {
    corpo = (
      <div className="card pad col">
        <div className="err" role="alert">{dados.erro}</div>
        <button className="btn sec" onClick={dados.recarregar}><Icon n="repeat" />Tentar de novo</button>
      </div>
    )
  } else if (!plano) corpo = <div className="loading">Carregando…</div>
  else {
    const { atividades, restricoes, subtarefas } = plano
    const comum = { perfil, obra, atividades, restricoes, subtarefas, aplicar, calendario: dados.data.calendario, podeEditar: dados.data.podeEditarEap }
    const irParaEap = () => trocarAba('eap')
    if (aba === 'eap') corpo = <AbaEap {...comum} />
    else if (aba === 'longo') corpo = <AbaLongo {...comum} irParaEap={irParaEap} />
    else if (aba === 'medio') corpo = <AbaMedio {...comum} irParaEap={irParaEap} />
    else corpo = <AbaCurto {...comum} irParaEap={irParaEap} />
  }

  const conteudo = (
    <div className="ct">
      <Faixa abas={abas} ativa={aba} onTroca={trocarAba} />
      {corpo}
    </div>
  )
  if (embutida) return conteudo
  return (
    <>
      <Topo titulo="Semana" sub={obra.nome}>{seletor}</Topo>
      {conteudo}
    </>
  )
}

// Toda gravação das abas: chama a camada de dados, avisa o erro em português e,
// se deu certo, troca o estado único do módulo. Devolve true/false.
function useGravar(aplicar) {
  const [ocupado, setOcupado] = useState(false)
  const toast = useToast()
  async function gravar(promessa, aviso) {
    setOcupado(true)
    const { data, erro } = await promessa
    setOcupado(false)
    if (erro) { toast(erro); return false }
    aplicar(data)
    if (aviso) toast(aviso)
    return true
  }
  return { ocupado, gravar }
}

// Texto da pergunta antes de descartar um formulário preenchido.
const DESCARTAR = 'O que você preencheu será descartado. Sair mesmo assim?'

// Avisos de formulário: um campo mostra o erro depois de mexido (ou dos que já
// nascem preenchidos), e todos depois de tentar salvar.
function useAvisos(erros, jaTocados) {
  const [tocado, setTocado] = useState(jaTocados)
  const [tentou, setTentou] = useState(false)
  return {
    aviso: (c) => ((tentou || tocado[c]) && erros[c]) || null,
    tocar: (c) => setTocado((t) => ({ ...t, [c]: true })),
    tentar: () => { setTentou(true); return !Object.keys(erros).length },
    confira: tentou && Object.keys(erros).length > 0,
  }
}

// ─── Aba EAP ────────────────────────────────────────────────────────────────
// Árvore com código automático. Tocar numa linha abre o que dá para fazer com ela.
function AbaEap({ perfil, obra, atividades, aplicar, calendario, podeEditar }) {
  const [verArquivadas, setVerArquivadas] = useState(false)
  const [escolhida, setEscolhida] = useState(null) // linha com as ações abertas
  const [form, setForm] = useState(null) // { id?, campos, temFilhos }
  const { ocupado, gravar } = useGravar(aplicar)

  const linhas = montarEap(atividades, { comArquivadas: verArquivadas, cal: calendario })
  const ativas = linhas.filter((l) => !l.arquivada).length
  const arquivadas = montarEap(atividades, { comArquivadas: true }).filter((l) => l.arquivada).length

  const novo = (pai_id = '') => {
    setEscolhida(null)
    setForm({ id: null, temFilhos: false, campos: { titulo: '', pai_id, inicio: hoje(), fim: proximoDiaUtil(hoje(), calendario) } })
  }
  const editar = (l) => {
    setEscolhida(null)
    setForm({ id: l.id, temFilhos: l.filhos > 0, campos: { titulo: l.titulo, pai_id: l.pai_id || '', inicio: l.inicio, fim: l.fim } })
  }
  const mover = (l, direcao) => gravar(moverAtividade(perfil, obra.id, l.id, direcao))
  const arquivar = async (l) => {
    const dentro = l.filhos ? ` e ${plural(l.filhos, 'subatividade', 'subatividades')} dentro dela` : ''
    if (!l.arquivada && !window.confirm(`Arquivar "${l.titulo}"${dentro}? Sai da EAP e das contas, mas pode ser desarquivada depois.`)) return
    if (await gravar(arquivarAtividade(perfil, obra.id, l.id, !l.arquivada), l.arquivada ? 'Atividade desarquivada.' : 'Atividade arquivada.')) setEscolhida(null)
  }
  const salvar = async (campos) => {
    if (await gravar(salvarAtividade(perfil, obra.id, campos, form.id), form.id ? 'Atividade salva.' : 'Atividade criada.')) setForm(null)
  }

  const acao = podeEditar && <button className="btn pri" onClick={() => novo()}><Icon n="plus" />Atividade</button>

  if (!atividades.length) {
    return (
      <Empty icone="plano" titulo="A EAP desta obra está vazia." texto="Divida a obra em grupos (Estrutura, Alvenaria, Elétrica…) e cada grupo em atividades com início e fim.">
        {acao && <button className="btn pri" onClick={() => novo()}><Icon n="plus" />Criar a primeira atividade</button>}
        <FormSheet form={form} setForm={setForm} atividades={atividades} calendario={calendario} ocupado={ocupado} onSalvar={salvar} />
      </Empty>
    )
  }

  return (
    <>
      <div className="sec-h eap-h">
        <span className="lab">{plural(ativas, 'atividade', 'atividades')}{arquivadas > 0 && ` · ${plural(arquivadas, 'arquivada', 'arquivadas')}`}</span>
        {arquivadas > 0 && (
          <label className="eap-tg"><input type="checkbox" checked={verArquivadas} onChange={(e) => setVerArquivadas(e.target.checked)} />Mostrar arquivadas</label>
        )}
        {acao}
      </div>
      {ativas === 0 && !verArquivadas && <div className="card pad muted">Todas as atividades estão arquivadas. Marque "Mostrar arquivadas" para trazê-las de volta.</div>}
      <div className="card list eap">
        {linhas.map((l) => {
          const Linha = podeEditar ? 'button' : 'div'
          return (
            <Linha key={l.id} className={`row n${l.nivel}${l.arquivada ? ' arq' : ''}`} style={{ paddingLeft: 16 + (l.nivel - 1) * 22 }} onClick={podeEditar ? () => setEscolhida(l) : undefined}>
              <span className="eap-cod num">{l.codigo || '—'}</span>
              <div className="tx">
                <div className="tt">{l.titulo}</div>
                <div className="mt"><span className="num">{fmtDiaMes(l.inicio)} a {fmtDiaMes(l.fim)}</span> · {plural(l.dias_uteis, 'dia útil', 'dias úteis')}{l.filhos > 0 && ` · ${plural(l.filhos, 'subatividade', 'subatividades')}`}</div>
              </div>
              <div className="val">
                {l.arquivada ? <Tag tom="ne">Arquivada</Tag> : <span className="num">{l.progresso}%</span>}
              </div>
              {podeEditar && <Icon n="next" />}
            </Linha>
          )
        })}
      </div>
      {!podeEditar && <div className="note">Só o engenheiro e o auxiliar mudam a EAP.</div>}

      <Sheet aberta={!!escolhida} onFechar={() => setEscolhida(null)} titulo={escolhida ? `${escolhida.codigo || 'Arquivada'} · ${escolhida.titulo}` : ''}>
        {escolhida && (
          <div className="col">
            <p className="note"><span className="num">{fmtData(escolhida.inicio)} a {fmtData(escolhida.fim)}</span> · {plural(escolhida.dias_uteis, 'dia útil', 'dias úteis')}</p>
            {!escolhida.arquivada && <button className="btn sec" disabled={ocupado} onClick={() => editar(escolhida)}><Icon n="edit" />Editar</button>}
            {!escolhida.arquivada && escolhida.nivel < NIVEL_MAXIMO && <button className="btn sec" disabled={ocupado} onClick={() => novo(escolhida.id)}><Icon n="plus" />Adicionar subatividade</button>}
            {!escolhida.arquivada && (
              <div className="acts">
                <button className="btn sec" disabled={ocupado} onClick={() => mover(escolhida, -1)}>Subir</button>
                <button className="btn sec" disabled={ocupado} onClick={() => mover(escolhida, 1)}>Descer</button>
              </div>
            )}
            {escolhida.arquivada && erroDesarquivar(atividades, escolhida.id)
              ? <p className="note">{erroDesarquivar(atividades, escolhida.id)}</p>
              : <button className="btn sec" disabled={ocupado} onClick={() => arquivar(escolhida)}>{escolhida.arquivada ? 'Desarquivar' : 'Arquivar'}</button>}
            <button className="btn sec" onClick={() => setEscolhida(null)}>Fechar</button>
          </div>
        )}
      </Sheet>
      <FormSheet form={form} setForm={setForm} atividades={atividades} calendario={calendario} ocupado={ocupado} onSalvar={salvar} />
    </>
  )
}

function FormSheet({ form, setForm, atividades, calendario, ocupado, onSalvar }) {
  const fechar = () => {
    if (form?.campos.titulo.trim() && !window.confirm(DESCARTAR)) return
    setForm(null)
  }
  return (
    <Sheet aberta={!!form} onFechar={fechar} titulo={form?.id ? 'Editar atividade' : 'Nova atividade'}>
      {form && <FormAtividade key={form.id || 'nova'} form={form} setForm={setForm} atividades={atividades} calendario={calendario} ocupado={ocupado} onSalvar={onSalvar} onCancelar={fechar} />}
    </Sheet>
  )
}

function FormAtividade({ form, setForm, atividades, calendario, ocupado, onSalvar, onCancelar }) {
  const { campos, id, temFilhos } = form
  const erros = errosAtividade(campos, atividades, { id, temFilhos })
  const { aviso, tocar, tentar, confira } = useAvisos(erros, { inicio: true, fim: true })
  const mudar = (c, valor) => {
    setForm((f) => ({ ...f, campos: { ...f.campos, [c]: valor } }))
    tocar(c)
  }
  const pais = paisPossiveis(atividades, id)
  const duracao = diasUteis(campos.inicio, campos.fim, calendario)

  const enviar = (e) => {
    e.preventDefault()
    if (tentar()) onSalvar(campos)
  }

  return (
    <form className="col" onSubmit={enviar} noValidate>
      <div className="field">
        <label htmlFor="pl-tit">Nome da atividade</label>
        <input id="pl-tit" className="inp" value={campos.titulo} maxLength={120} autoFocus onChange={(e) => mudar('titulo', e.target.value)} placeholder="Ex.: Alvenaria do bloco B" required />
        {aviso('titulo') && <div className="err" role="alert">{aviso('titulo')}</div>}
      </div>
      <div className="field">
        <label htmlFor="pl-pai">Fica dentro de</label>
        <select id="pl-pai" className="inp" value={campos.pai_id} onChange={(e) => mudar('pai_id', e.target.value)}>
          <option value="">Nenhuma (grupo principal)</option>
          {pais.map((l) => <option key={l.id} value={l.id}>{'  '.repeat(l.nivel - 1)}{l.codigo} – {l.titulo}</option>)}
        </select>
        {aviso('pai_id') && <div className="err" role="alert">{aviso('pai_id')}</div>}
      </div>
      {temFilhos ? (
        <p className="note">As datas e o progresso desta atividade vêm das subatividades dela.</p>
      ) : (
        <>
          <div className="grid2">
            <div className="field">
              <label htmlFor="pl-ini">Início</label>
              <input id="pl-ini" className="inp" type="date" value={campos.inicio} onChange={(e) => mudar('inicio', e.target.value)} required />
              {aviso('inicio') && <div className="err" role="alert">{aviso('inicio')}</div>}
            </div>
            <div className="field">
              <label htmlFor="pl-fim">Fim</label>
              <input id="pl-fim" className="inp" type="date" min={campos.inicio || undefined} value={campos.fim} onChange={(e) => mudar('fim', e.target.value)} required />
              {aviso('fim') && <div className="err" role="alert">{aviso('fim')}</div>}
            </div>
          </div>
          {!erros.inicio && !erros.fim && <p className="note">Duração: <b className="num">{plural(duracao, 'dia útil', 'dias úteis')}</b> (segunda a sexta, tirando os feriados nacionais).</p>}
        </>
      )}
      {confira && <div className="err" role="alert">Confira os campos marcados acima.</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado}><Icon n="check" />{id ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  )
}

// ─── Aba Longo prazo (cronograma) ───────────────────────────────────────────
// No computador: barras sobre semanas ou meses (só CSS). No celular: lista.
// A barra é o período; o preenchimento é o real; o traço é o previsto para hoje.
function AbaLongo({ perfil, obra, atividades, aplicar, calendario, podeEditar, irParaEap }) {
  const [modo, setModo] = useState('semana')
  const [editando, setEditando] = useState(null) // linha com o progresso aberto
  const { ocupado, gravar } = useGravar(aplicar)
  const dia = hoje()

  const linhas = montarEap(atividades, { cal: calendario })
  if (!linhas.length) {
    return (
      <Empty icone="plano" titulo="Sem atividades para o cronograma." texto="O cronograma nasce da EAP: crie as atividades com início e fim lá.">
        <button className="btn pri" onClick={irParaEap}>Ir para a EAP</button>
      </Empty>
    )
  }
  const info = (l) => ({ previsto: progressoPrevisto(l, dia, calendario), sit: situacaoPrazo(l, dia, calendario) })
  const resumo = resumoPrazo(linhas, dia, calendario)
  const { colunas, pos } = escalaCronograma(linhas, modo)
  const largura = colunas.length * (modo === 'semana' ? 64 : 180)
  const podeTocar = (l) => podeEditar && ehFolha(l)

  async function salvar(valor) {
    if (await gravar(salvarProgresso(perfil, obra.id, editando.id, valor), 'Progresso salvo.')) setEditando(null)
  }

  return (
    <>
      <div className="kpis">
        <Kpi rotulo="Previsto até hoje" valor={`${resumo.previsto}%`} detalhe="pelo cronograma" />
        <Kpi tom={tomReal(resumo)} rotulo="Real" valor={`${resumo.real}%`} detalhe={textoReal(resumo)} />
        <Kpi tom={resumo.atrasadas ? 'cr' : ''} rotulo="Atrasadas" valor={resumo.atrasadas} detalhe="passaram do fim" />
        <Kpi tom={resumo.abaixo ? 'at' : ''} rotulo="Abaixo do previsto" valor={resumo.abaixo} detalhe="ainda no prazo" />
      </div>

      {/* Computador: gráfico de barras */}
      <div className="card crono">
        <div className="crono-top">
          <Seg opcoes={[{ id: 'semana', rotulo: 'Por semana' }, { id: 'mes', rotulo: 'Por mês' }]} valor={modo} onChange={setModo} />
          <span className="crono-leg"><i className="lg-real" />real <i className="lg-prev" />previsto hoje <i className="lg-hoje" />hoje</span>
        </div>
        <div className="crono-rol">
          <div className="crono-grade" style={{ gridTemplateColumns: `260px ${largura}px` }}>
            <div className="crono-cab crono-nome">Atividade</div>
            <div className="crono-cab crono-tempo">
              {colunas.map((c) => <span key={c.inicio} className="num" style={{ left: `${pos(c.inicio)}%`, width: `${pos(somarDias(c.fim, 1)) - pos(c.inicio)}%` }}>{c.rotulo}</span>)}
            </div>
            {linhas.map((l) => {
              const { previsto, sit } = info(l)
              const Nome = podeTocar(l) ? 'button' : 'div'
              return (
                <div key={l.id} className={`crono-linha n${l.nivel}`}>
                  <Nome className="crono-nome" style={{ paddingLeft: 12 + (l.nivel - 1) * 16 }} onClick={podeTocar(l) ? () => setEditando(l) : undefined} title={`${fmtData(l.inicio)} a ${fmtData(l.fim)}`}>
                    <span className="num eap-cod">{l.codigo}</span><span className="crono-tit">{l.titulo}</span>
                  </Nome>
                  <div className="crono-tempo">
                    {colunas.map((c) => <i key={c.inicio} className="crono-col" style={{ left: `${pos(c.inicio)}%` }} />)}
                    <i className="crono-hoje" style={{ left: `${pos(dia)}%` }} />
                    <div className={`crono-barra ${sit.tom}`} style={{ left: `${pos(l.inicio)}%`, width: `${Math.max(0.8, pos(somarDias(l.fim, 1)) - pos(l.inicio))}%` }} title={`Real ${l.progresso}% · previsto ${previsto}% · ${sit.texto}`}>
                      <i className="real" style={{ width: `${l.progresso}%` }} />
                      {previsto > 0 && previsto < 100 && <i className="prev" style={{ left: `${previsto}%` }} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {podeEditar && <div className="note crono-dica">Toque no nome de uma atividade para atualizar o progresso real.</div>}
      </div>

      {/* Celular: lista */}
      <div className="card list crono-lista">
        {linhas.map((l) => {
          const { previsto, sit } = info(l)
          const Linha = podeTocar(l) ? 'button' : 'div'
          return (
            <Linha key={l.id} className={`row n${l.nivel}`} style={{ paddingLeft: 16 + (l.nivel - 1) * 18 }} onClick={podeTocar(l) ? () => setEditando(l) : undefined}>
              <span className="eap-cod num">{l.codigo}</span>
              <div className="tx">
                <div className="tt">{l.titulo}</div>
                <div className="mt"><span className="num">{fmtDiaMes(l.inicio)} a {fmtDiaMes(l.fim)}</span> · {plural(l.dias_uteis, 'dia útil', 'dias úteis')}</div>
                <div className={`prog crono-prog ${sit.tom === 'ne' ? '' : sit.tom}`}>
                  <i style={{ width: `${l.progresso}%` }} />
                  {previsto > 0 && previsto < 100 && <b style={{ left: `${previsto}%` }} />}
                </div>
                <div className="mt">Real <b className="num">{l.progresso}%</b> · previsto <span className="num">{previsto}%</span>{sit.tom !== 'ne' && <> · <Tag tom={sit.tom}>{sit.texto}</Tag></>}</div>
              </div>
              {podeTocar(l) && <Icon n="next" />}
            </Linha>
          )
        })}
      </div>

      <Sheet aberta={!!editando} onFechar={() => setEditando(null)} titulo={editando ? `${editando.codigo} · ${editando.titulo}` : ''}>
        {editando && <FormProgresso key={editando.id} linha={editando} previsto={info(editando).previsto} ocupado={ocupado} onSalvar={salvar} onCancelar={() => setEditando(null)} />}
      </Sheet>
    </>
  )
}

function FormProgresso({ linha, previsto, ocupado, onSalvar, onCancelar }) {
  const [valor, setValor] = useState(String(linha.progresso))
  const erro = erroProgresso(valor)
  const enviar = (e) => {
    e.preventDefault()
    if (!erro) onSalvar(valor)
  }
  return (
    <form className="col" onSubmit={enviar} noValidate>
      <p className="note"><span className="num">{fmtData(linha.inicio)} a {fmtData(linha.fim)}</span> · pelo cronograma, hoje deveria estar em <b className="num">{previsto}%</b>.</p>
      <div className="field">
        <label htmlFor="pl-prog">Progresso real (%)</label>
        <input id="pl-prog" className="inp num" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} autoFocus value={valor} onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))} />
        {erro && <div className="err" role="alert">{erro}</div>}
      </div>
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado || !!erro}><Icon n="check" />Salvar</button>
      </div>
    </form>
  )
}

// ─── Aba Médio prazo (lookahead / restrições) ───────────────────────────────
// Quadro com uma coluna por semana, da atual até 3 a 6 semanas à frente.
// Cada cartão é uma restrição (o que impede a atividade). Mover = setas, sem arrastar.
// Ícone e cor de cada tipo (as cores em index.css, .tp-*). Tipo novo em TIPOS_RESTRICAO
// precisa de linha aqui e no CSS.
const VISUAL_TIPO = {
  Material: { icone: 'compras', classe: 'tp-material' },
  'Mão de obra': { icone: 'colab', classe: 'tp-mao-de-obra' },
  Método: { icone: 'diario', classe: 'tp-metodo' },
  Equipamento: { icone: 'key', classe: 'tp-equipamento' },
  Projeto: { icone: 'notas', classe: 'tp-projeto' },
  Segurança: { icone: 'warn', classe: 'tp-seguranca' },
  Logística: { icone: 'forn', classe: 'tp-logistica' },
}

function AbaMedio({ perfil, obra, atividades, restricoes, aplicar, calendario, podeEditar, irParaEap }) {
  const [semanas, setSemanas] = useState(4)
  const [responsavel, setResponsavel] = useState('')
  const [comResolvidas, setComResolvidas] = useState(false)
  const [form, setForm] = useState(null) // { id?, campos }
  const { ocupado, gravar } = useGravar(aplicar)
  const dia = hoje()

  const linhas = montarEap(atividades, { cal: calendario })
  const atividadesLivres = linhas.filter(ehFolha)
  if (!atividadesLivres.length) {
    return (
      <Empty icone="plano" titulo="Sem atividades para olhar à frente." texto="As restrições são ligadas às atividades da EAP. Crie as atividades primeiro.">
        <button className="btn pri" onClick={irParaEap}>Ir para a EAP</button>
      </Empty>
    )
  }
  const { colunas, depois, responsaveis } = montarLookahead(restricoes, linhas, { dia, semanas, responsavel, comResolvidas })
  const rotuloAtiv = (id) => {
    const l = linhas.find((x) => x.id === id)
    return l ? `${l.codigo} ${l.titulo}` : 'Atividade arquivada'
  }

  const nova = (prazo = dia) => setForm({ id: null, campos: { atividade_id: '', descricao: '', tipo: '', prazo: prazoNovaRestricao(prazo, dia), responsavel: '' } })
  const editar = (r) => setForm({ id: r.id, campos: { atividade_id: r.atividade_id, descricao: r.descricao, tipo: r.tipo, prazo: r.prazo, responsavel: r.responsavel } })
  const fecharForm = () => {
    if ((form.campos.descricao.trim() || form.campos.atividade_id) && !window.confirm(DESCARTAR)) return
    setForm(null)
  }
  const salvar = async (campos) => {
    if (await gravar(salvarRestricao(perfil, obra.id, campos, form.id), form.id ? 'Restrição salva.' : 'Restrição registrada.')) setForm(null)
  }

  return (
    <>
      <div className="card pad look-filtros">
        <div className="field">
          <span className="flabel">Semanas à frente</span>
          <Seg opcoes={SEMANAS_LOOKAHEAD.map((n) => ({ id: n, rotulo: String(n) }))} valor={semanas} onChange={setSemanas} />
        </div>
        <div className="field">
          <label htmlFor="lk-resp">Responsável</label>
          <select id="lk-resp" className="inp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Todos</option>
            {responsaveis.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <label className="eap-tg"><input type="checkbox" checked={comResolvidas} onChange={(e) => setComResolvidas(e.target.checked)} />Mostrar resolvidas</label>
        {podeEditar && <button className="btn pri" onClick={() => nova()}><Icon n="plus" />Restrição</button>}
      </div>

      {!restricoes.length && (
        <Empty icone="warn" titulo="Nenhuma restrição registrada nesta obra." texto="Antes de a atividade entrar na semana, pergunte: falta material, gente, projeto, equipamento? Cada resposta é uma restrição.">
          {podeEditar && <button className="btn pri" onClick={() => nova()}><Icon n="plus" />Registrar a primeira restrição</button>}
        </Empty>
      )}

      <div className="look">
        {colunas.map((c) => (
          <section key={c.inicio} className="look-col" aria-label={c.rotulo}>
            <header className="look-cab">
              <b>{c.rotulo}</b>
              <span className="num">{fmtDiaMes(c.inicio)} a {fmtDiaMes(c.fim)}</span>
              <span>{plural(c.atividades, 'atividade', 'atividades')}{c.impedidas > 0 && <> · <Tag tom="at">{plural(c.impedidas, 'impedida', 'impedidas')}</Tag></>}</span>
            </header>
            {c.restricoes.length === 0 && <p className="look-vazio">Nenhuma restrição nesta semana.</p>}
            {c.restricoes.map((r) => {
              const vencida = restricaoVencida(r, dia)
              return (
                <article key={r.id} className={`card look-card ${VISUAL_TIPO[r.tipo].classe}${r.resolvida ? ' ok' : ''}`}>
                  <div className="look-tipo"><Icon n={VISUAL_TIPO[r.tipo].icone} />{r.tipo}{r.resolvida && <Tag tom="ne">Resolvida</Tag>}{vencida && <Tag tom="cr">Venceu <span className="num">{fmtDiaMes(r.prazo)}</span></Tag>}</div>
                  <div className="look-desc">{r.descricao}</div>
                  <div className="look-mt">{rotuloAtiv(r.atividade_id)}</div>
                  <div className="look-mt">Prazo <span className="num">{fmtDiaMes(r.prazo)}</span> · {r.responsavel}</div>
                  {podeEditar && (
                    <div className="look-acoes">
                      <button className="btn sec sm" disabled={ocupado || !podeVoltarSemana(r, dia)} aria-label="Semana anterior" onClick={() => gravar(moverRestricao(perfil, obra.id, r.id, -1))}><Icon n="back" /></button>
                      <button className="btn sec sm resolver" disabled={ocupado} onClick={() => gravar(resolverRestricao(perfil, obra.id, r.id, !r.resolvida), r.resolvida ? 'Restrição reaberta.' : 'Restrição resolvida.')}>{r.resolvida ? 'Reabrir' : <><Icon n="check" />Resolver</>}</button>
                      <button className="btn sec sm" disabled={ocupado || r.resolvida} aria-label="Próxima semana" onClick={() => gravar(moverRestricao(perfil, obra.id, r.id, 1))}><Icon n="next" /></button>
                      <button className="btn sec sm" disabled={ocupado} aria-label="Editar" onClick={() => editar(r)}><Icon n="edit" /></button>
                    </div>
                  )}
                </article>
              )
            })}
            {podeEditar && <button className="btn sec sm look-add" onClick={() => nova(c.inicio)}><Icon n="plus" />Nesta semana</button>}
          </section>
        ))}
      </div>
      {depois > 0 && <p className="note">{plural(depois, 'restrição aberta tem', 'restrições abertas têm')} prazo depois dessas semanas. Aumente as semanas à frente para ver.</p>}

      <Sheet aberta={!!form} onFechar={fecharForm} titulo={form?.id ? 'Editar restrição' : 'Nova restrição'}>
        {form && <FormRestricao key={form.id || 'nova'} form={form} setForm={setForm} linhas={linhas} responsaveis={[...new Set([perfil.nome, ...responsaveis])]} ocupado={ocupado} onSalvar={salvar} onCancelar={fecharForm} />}
      </Sheet>
    </>
  )
}

function FormRestricao({ form, setForm, linhas, responsaveis, ocupado, onSalvar, onCancelar }) {
  const { campos, id } = form
  const erros = errosRestricao(campos, linhas, { dia: hoje(), nova: !id })
  const { aviso, tocar, tentar, confira } = useAvisos(erros, { prazo: true })
  const mudar = (c, valor) => {
    setForm((f) => ({ ...f, campos: { ...f.campos, [c]: valor } }))
    tocar(c)
  }
  const enviar = (e) => {
    e.preventDefault()
    if (tentar()) onSalvar(campos)
  }
  return (
    <form className="col" onSubmit={enviar} noValidate>
      <div className="field">
        <label htmlFor="rs-ativ">Atividade impedida</label>
        <select id="rs-ativ" className="inp" value={campos.atividade_id} onChange={(e) => mudar('atividade_id', e.target.value)}>
          <option value="">Escolha…</option>
          {linhas.filter(ehFolha).map((l) => <option key={l.id} value={l.id}>{l.codigo} – {l.titulo}</option>)}
        </select>
        {aviso('atividade_id') && <div className="err" role="alert">{aviso('atividade_id')}</div>}
      </div>
      <div className="field">
        <label htmlFor="rs-desc">O que está impedindo</label>
        <textarea id="rs-desc" style={{ minHeight: 84 }} maxLength={200} value={campos.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Ex.: Caixa d’água ainda não entregue" />
        {aviso('descricao') && <div className="err" role="alert">{aviso('descricao')}</div>}
      </div>
      <div className="field">
        <span className="flabel">Tipo</span>
        <div className="look-tipos" role="radiogroup" aria-label="Tipo">
          {TIPOS_RESTRICAO.map((t) => (
            <button type="button" key={t} role="radio" aria-checked={campos.tipo === t} className={`${VISUAL_TIPO[t].classe}${campos.tipo === t ? ' on' : ''}`} onClick={() => mudar('tipo', t)}><Icon n={VISUAL_TIPO[t].icone} />{t}</button>
          ))}
        </div>
        {aviso('tipo') && <div className="err" role="alert">{aviso('tipo')}</div>}
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="rs-prazo">Resolver até</label>
          <input id="rs-prazo" className="inp" type="date" value={campos.prazo} onChange={(e) => mudar('prazo', e.target.value)} />
          {aviso('prazo') && <div className="err" role="alert">{aviso('prazo')}</div>}
        </div>
        <div className="field">
          <label htmlFor="rs-resp">Responsável</label>
          <input id="rs-resp" className="inp" list="rs-resp-lista" maxLength={60} value={campos.responsavel} onChange={(e) => mudar('responsavel', e.target.value)} placeholder="Quem resolve" />
          <datalist id="rs-resp-lista">{responsaveis.map((n) => <option key={n} value={n} />)}</datalist>
          {aviso('responsavel') && <div className="err" role="alert">{aviso('responsavel')}</div>}
        </div>
      </div>
      {confira && <div className="err" role="alert">Confira os campos marcados acima.</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado}><Icon n="check" />{id ? 'Salvar' : 'Registrar'}</button>
      </div>
    </form>
  )
}

// ─── Aba Curto prazo (quadro da semana + PPC) ───────────────────────────────
// Entra na semana a atividade que cruza a semana ou que deveria ter terminado e
// não terminou (acumulada). Mover por seleção, sem arrastar. "Não realizado"
// sempre pede a causa raiz. PPC = concluídas ÷ planejadas da semana.
function AbaCurto({ perfil, obra, atividades, restricoes, subtarefas, aplicar, calendario, podeEditar, irParaEap }) {
  const atual = semanaDe(hoje())
  const [semana, setSemana] = useState(atual)
  const [causa, setCausa] = useState(null) // { tipo: 'atividade' | 'subtarefa', id, titulo, valor }
  const { ocupado, gravar } = useGravar(aplicar)

  const linhas = montarEap(atividades, { cal: calendario })
  const daSemana = atividadesDaSemana(linhas, semana)
  const { total, concluidas, ppc } = ppcDaSemana(daSemana)
  const causas = causasDaSemana(daSemana, subtarefas, semana)
  // O mestre vê as outras semanas, mas só mexe na atual (a camada de dados também confere).
  const soVer = !podeMexerNaSemana(perfil.role, semana, atual)

  const salvarCausa = async (valor) => {
    const p = causa.tipo === 'atividade'
      ? marcarNaoRealizado(perfil, obra.id, causa.id, valor, semana)
      : subtarefaNaoRealizada(perfil, obra.id, causa.id, valor, semana)
    if (await gravar(p, 'Marcado como não realizado.')) setCausa(null)
  }

  const navegar = (
    <div className="qsel">
      <button onClick={() => setSemana(somarDias(semana, -7))} aria-label="Semana anterior"><Icon n="back" /></button>
      <div className="q">{rotuloSemana(semana, atual)}<small className="num">{fmtData(semana)} a {fmtData(somarDias(semana, 6))}</small></div>
      <button onClick={() => setSemana(somarDias(semana, 7))} aria-label="Próxima semana"><Icon n="next" /></button>
    </div>
  )

  if (!daSemana.length) {
    return (
      <>
        {navegar}
        <Empty icone="plano" titulo="Nenhuma atividade planejada para esta semana." texto="Entram aqui as atividades da EAP cujo período cruza a semana, e as que já deviam ter terminado.">
          {podeEditar && <button className="btn pri" onClick={irParaEap}>Ir para a EAP</button>}
        </Empty>
      </>
    )
  }

  const tom = tomPpc(ppc)
  return (
    <>
      {navegar}
      {soVer && <p className="note">Você pode ver esta semana, mas só mexe na semana atual.</p>}
      <div className={`card pad ppc ${tom}`}>
        <span className="lab">PPC da semana · Percentual do Plano Concluído</span>
        <div className="ppc-linha">
          <b className={`ppc-n num ${tom}`}>{ppc}%</b>
          <span><b className="num">{concluidas}</b> de <b className="num">{total}</b> concluídas</span>
        </div>
        <div className={`prog ${tom}`}><i style={{ width: `${ppc}%` }} /></div>
        {causas.length > 0 && (
          <div className="ppc-causas"><span className="lab">Por que não foi feito</span>{causas.map((c) => <Tag key={c.causa} tom="ne">{c.causa} · {c.n}</Tag>)}</div>
        )}
        {semana < atual && <p className="note">Semanas passadas mostram a situação de hoje: o app ainda não guarda o retrato de cada semana.</p>}
      </div>

      <div className="look kanban">
        {STATUS_ATIVIDADE.map((status) => {
          const cartoes = daSemana.filter((l) => statusDe(l) === status)
          return (
            <section key={status} className="look-col" aria-label={status}>
              <header className="look-cab"><b>{status}</b><span>{plural(cartoes.length, 'atividade', 'atividades')}</span></header>
              {!cartoes.length && <p className="look-vazio">Nada aqui.</p>}
              {cartoes.map((l) => (
                <CartaoSemana key={l.id} l={l} semana={semana} subtarefas={subtarefasDe(subtarefas, l.id)}
                  impedimentos={restricoesAbertas(restricoes, l.id)} ocupado={ocupado} soVer={soVer}
                  onMover={(novo) => gravar(moverNaSemana(perfil, obra.id, l.id, novo), `Movida para ${novo}.`)}
                  onNaoRealizado={() => setCausa({ tipo: 'atividade', id: l.id, titulo: l.titulo, valor: naoRealizadaNaSemana(l, semana) ? l.causa_nao_realizado : '' })}
                  onMarcar={(s, feita) => gravar(marcarSubtarefa(perfil, obra.id, s.id, feita))}
                  onSubNaoFeita={(s) => setCausa({ tipo: 'subtarefa', id: s.id, titulo: s.titulo, valor: naoRealizadaNaSemana(s, semana) ? s.causa_nao_realizado : '' })}
                  onNovaSub={(titulo) => gravar(salvarSubtarefa(perfil, obra.id, l.id, titulo), 'Subtarefa criada.')} />
              ))}
            </section>
          )
        })}
      </div>

      <Sheet aberta={!!causa} onFechar={() => setCausa(null)} titulo="Não realizado">
        {causa && <FormCausa key={causa.id} causa={causa} ocupado={ocupado} onSalvar={salvarCausa} onCancelar={() => setCausa(null)} />}
      </Sheet>
    </>
  )
}

function CartaoSemana({ l, semana, subtarefas, impedimentos, ocupado, soVer, onMover, onNaoRealizado, onMarcar, onSubNaoFeita, onNovaSub }) {
  const [aberto, setAberto] = useState(false)
  const [nova, setNova] = useState('')
  const [tentou, setTentou] = useState(false)
  const feitas = subtarefas.filter((s) => s.feita).length
  const naoRealizada = naoRealizadaNaSemana(l, semana)
  const erroNova = tentou ? erroSubtarefa(nova) : null
  const adicionar = async (e) => {
    e.preventDefault()
    setTentou(true)
    if (erroSubtarefa(nova)) return
    if (await onNovaSub(nova)) {
      setNova('')
      setTentou(false)
    }
  }
  return (
    <article className={`card look-card sem-card${l.status === CONCLUIDO ? ' ok' : ''}`}>
      <div className="look-desc"><span className="num eap-cod">{l.codigo}</span> {l.titulo}</div>
      <div className="look-mt"><span className="num">{fmtDiaMes(l.inicio)} a {fmtDiaMes(l.fim)}</span> · real <span className="num">{l.progresso}%</span></div>
      {(l.acumulada || impedimentos.length > 0 || naoRealizada) && (
        <div className="btns">
          {l.acumulada && <Tag tom="at">Acumulada · fim <span className="num">{fmtDiaMes(l.fim)}</span></Tag>}
          {impedimentos.length > 0 && <Tag tom="at">Impedida · {impedimentos.map((r) => r.tipo).join(', ')}</Tag>}
          {naoRealizada && <Tag tom="cr">Não realizado · {l.causa_nao_realizado}</Tag>}
        </div>
      )}
      <div className="sem-acoes">
        <label className="sr" htmlFor={`mv-${l.id}`}>Mover {l.titulo} para</label>
        <select id={`mv-${l.id}`} className="inp" value={statusDe(l)} disabled={ocupado || soVer} onChange={(e) => onMover(e.target.value)}>
          {STATUS_ATIVIDADE.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {podeMarcarNaoRealizado(l) && !soVer && <button className="btn sec sm" disabled={ocupado} onClick={onNaoRealizado}>Não realizado</button>}
      </div>
      <button className="link sem-sub" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        {subtarefas.length ? <>Subtarefas <span className="num">{feitas}/{subtarefas.length}</span></> : 'Subtarefas'} {aberto ? '▴' : '▾'}
      </button>
      {aberto && (
        <div className="sem-check">
          {subtarefas.map((s) => (
            <div key={s.id} className={`sem-item${s.feita ? ' feita' : ''}`}>
              <label><input type="checkbox" checked={s.feita} disabled={ocupado || soVer} onChange={(e) => onMarcar(s, e.target.checked)} />{s.titulo}</label>
              {!s.feita && naoRealizadaNaSemana(s, semana) && soVer && <span className="sem-causa"><Tag tom="cr">Não realizado · {s.causa_nao_realizado}</Tag></span>}
              {!s.feita && !soVer && (naoRealizadaNaSemana(s, semana)
                ? <button className="sem-causa" onClick={() => onSubNaoFeita(s)}><Tag tom="cr">Não realizado · {s.causa_nao_realizado}</Tag></button>
                : <button className="link" disabled={ocupado} onClick={() => onSubNaoFeita(s)}>Não realizado</button>)}
            </div>
          ))}
          {!soVer && <form className="sem-nova" onSubmit={adicionar} noValidate>
            <input className="inp" aria-label={`Nova subtarefa de ${l.titulo}`} maxLength={120} placeholder="Nova subtarefa" value={nova} onChange={(e) => setNova(e.target.value)} />
            <button type="submit" className="btn sec sm" disabled={ocupado} aria-label="Adicionar subtarefa"><Icon n="plus" /></button>
          </form>}
          {erroNova && <div className="err" role="alert">{erroNova}</div>}
        </div>
      )}
    </article>
  )
}

function FormCausa({ causa, ocupado, onSalvar, onCancelar }) {
  const [valor, setValor] = useState(causa.valor)
  const [tentou, setTentou] = useState(false)
  const enviar = (e) => {
    e.preventDefault()
    setTentou(true)
    if (!erroCausa(valor)) onSalvar(valor)
  }
  return (
    <form className="col" onSubmit={enviar} noValidate>
      <p className="note">{causa.tipo === 'atividade' ? 'Atividade' : 'Subtarefa'}: <b>{causa.titulo}</b>. Qual foi a causa raiz?</p>
      <div className="look-tipos" role="radiogroup" aria-label="Causa">
        {CAUSAS_NAO_REALIZADO.map((c) => (
          <button type="button" key={c} role="radio" aria-checked={valor === c} className={`causa${valor === c ? ' on' : ''}`} onClick={() => setValor(c)}>{c}</button>
        ))}
      </div>
      {tentou && erroCausa(valor) && <div className="err" role="alert">{erroCausa(valor)}</div>}
      <div className="acts">
        <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn pri" disabled={ocupado}><Icon n="check" />Salvar</button>
      </div>
    </form>
  )
}
