// Peças reutilizáveis. Ícones em SVG (nunca emoji), copiados do preview.html.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { brl, quinzenaAnterior, quinzenaSeguinte, rotuloQuinzena, fmtData, quinzenaDe, hoje } from '../lib/regras.js'

const ICONES = {
  obras: <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />,
  compras: <><path d="M5 8h14l-1.4 12H6.4z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  notas: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>,
  forn: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>,
  mais: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  wa: <><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z" /></>,
  repeat: <path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" />,
  check: <path d="M5 12l5 5 9-10" />,
  warn: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>,
  pay: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  clip: <path d="M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7" />,
  colab: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.9.2 5 2.2 5 5.4" /></>,
  diario: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6" /></>,
  tabela: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 14h18M9 4v16" /></>,
  folha: <><path d="M4 6h16v12H4z" /><circle cx="12" cy="12" r="2.5" /><path d="M7 9v.01M17 15v.01" /></>,
  down: <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  key: <><circle cx="8" cy="14" r="4" /><path d="M11 11l9-9M17 5l2 2M15 7l2 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
  sair: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  plano: <><path d="M4 5h9M7 10h10M10 15h9M4 20h8" /><path d="M3 3v18" /></>,
  regua: <><path d="M3 16L16 3l5 5L8 21z" /><path d="M7 12l2 2M10 9l2 2M13 6l2 2" /></>,
  presenca: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M8 2v4M16 2v4M8 13l3 3 5-6" /></>,
}

export function Icon({ n, size }) {
  const st = size ? { width: size, height: size } : undefined
  return <svg className="i" viewBox="0 0 24 24" style={st} aria-hidden="true">{ICONES[n]}</svg>
}

// Etiqueta de status. tom: ok | at | cr | ne
export const Tag = ({ tom = 'ne', children, plain }) => <span className={`tag ${tom}${plain ? ' plain' : ''}`}>{children}</span>

const TOM_STATUS = {
  'Em andamento': 'ok', Paralisada: 'at', 'Concluída': 'ne',
  'Aguardando NF': 'at', 'NF recebida': 'ok', Paga: 'ne',
  'A comprar': 'at', Comprado: 'ok', Cancelado: 'ne',
  Rascunho: 'at', Fechado: 'ok', 'Sem fechamento': 'ne',
  Engenheiro: 'ok', Mestre: 'ne', Auxiliar: 'ne', Pendente: 'at',
}
export const StatusTag = ({ s }) => <Tag tom={TOM_STATUS[s] || 'ne'}>{s}</Tag>

export const Money = ({ v }) => <>{brl(v)}</>

export function Empty({ icone = 'obras', titulo, texto, children }) {
  return (
    <div className="card empty">
      <div className="ic"><Icon n={icone} /></div>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}

export function Kpi({ tom = '', rotulo, valor, detalhe, onClick }) {
  const Tag2 = onClick ? 'button' : 'div'
  return (
    <Tag2 className={`card kpi ${tom}`} onClick={onClick}>
      <span className="lab">{rotulo}</span>
      <span className="n">{valor}</span>
      {detalhe && <div className="d">{detalhe}</div>}
    </Tag2>
  )
}

// Botões de filtro em pílula. Opção com `tom` (ok | at | ne) ganha a cor do status:
// contorno quando solta, preenchida quando escolhida.
export function Seg({ opcoes, valor, onChange, grande }) {
  return (
    <div className={`seg${grande ? ' big' : ''}`} role="tablist">
      {opcoes.map((o) => {
        const id = typeof o === 'string' ? o : o.id
        const rotulo = typeof o === 'string' ? o : o.rotulo
        const tom = typeof o === 'string' ? '' : o.tom ? ` tom-${o.tom}` : ''
        return (
          <button key={id} className={`${valor === id ? 'on' : ''}${tom}`} onClick={() => onChange(id)} role="tab" aria-selected={valor === id}>
            {rotulo}{o.n != null && <span className="c">{o.n}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function QuinzenaSel({ q, onChange }) {
  const atual = quinzenaDe(hoje())
  return (
    <div className="qsel">
      <button onClick={() => onChange(quinzenaAnterior(q))} aria-label="Quinzena anterior"><Icon n="back" /></button>
      <div className="q">{rotuloQuinzena(q)}<small>{fmtData(q.inicio)} a {fmtData(q.fim)}</small></div>
      <button onClick={() => onChange(quinzenaSeguinte(q))} disabled={q.inicio >= atual.inicio} aria-label="Próxima quinzena"><Icon n="next" /></button>
    </div>
  )
}

// Faixa no topo de um módulo: sub-abas à esquerda, botão principal à direita.
export function Faixa({ abas, ativa, onTroca, acao }) {
  if (!abas?.length && !acao) return null
  return (
    <div className="faixa">
      {abas?.length > 1 ? <Seg opcoes={abas} valor={ativa} onChange={onTroca} /> : <span />}
      {acao}
    </div>
  )
}

// Folha que sobe de baixo (no computador vira janela no meio).
export function Sheet({ aberta, onFechar, titulo, children }) {
  if (!aberta) return null
  return (
    <div className="veil on" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="sheet" role="dialog" aria-label={titulo}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}

// Mostra uma mensagem pronta (cobrança de NF, pedido de itens) com botão de copiar.
// Nos dados de exemplo, o WhatsApp não é aberto: os números são de mentira.
export function SheetMensagem({ msg, onFechar }) {
  const toast = useToast()
  return (
    <Sheet aberta={!!msg} onFechar={onFechar} titulo={msg?.titulo || ''}>
      <p className="note">Para: {msg?.para}</p>
      <div className="msg">{msg?.texto}</div>
      <div className="acts">
        <button className="btn sec" onClick={onFechar}>Fechar</button>
        <button className="btn pri" onClick={() => {
          navigator.clipboard?.writeText(msg.texto)
          toast('Mensagem copiada.')
        }}>Copiar mensagem</button>
      </div>
      <p className="note" style={{ marginTop: 12 }}>Com os dados de exemplo o WhatsApp não abre. Com fornecedores de verdade, este botão abre a conversa com a mensagem pronta.</p>
    </Sheet>
  )
}

// Aviso curto no rodapé ("Salvo.").
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [texto, setTexto] = useState('')
  const timer = useRef(null)
  const mostrar = useCallback((t) => {
    setTexto(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setTexto(''), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className={`toast${texto ? ' on' : ''}`} role="status">{texto}</div>
    </ToastCtx.Provider>
  )
}

// Para botões cuja ação chega numa próxima etapa da construção.
export function useEmBreve() {
  const toast = useToast()
  return () => toast('Esta ação chega na próxima etapa da construção.')
}

// Carrega dados da camada de dados com os três estados: carregando, erro, pronto.
export function useCarregar(fn, deps) {
  const [estado, setEstado] = useState({ carregando: true, data: null, erro: null })
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true }))
    fn().then(({ data, erro }) => vivo && setEstado({ carregando: false, data, erro }))
    return () => { vivo = false }
  }, [...deps, versao])
  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}

// Faixa escura do topo de cada tela. `children` recebe as abas da obra ou um seletor.
// `caminho`: [{ rotulo, onClick }] — o último é onde a pessoa está (não clica).
// Só aparece no computador; no celular basta o botão de voltar.
export function Topo({ titulo, sub, onVoltar, acoes, caminho, children }) {
  return (
    <header className="hd">
      <div className="hd-in">
        {caminho && (
          <nav className="trilha" aria-label="Caminho">
            {caminho.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="sep" aria-hidden="true">›</span>}
                {c.onClick && i < caminho.length - 1
                  ? <button onClick={c.onClick}>{c.rotulo}</button>
                  : <span aria-current={i === caminho.length - 1 ? 'page' : undefined}>{c.rotulo}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className={`hd-row${onVoltar ? ' com-voltar' : ''}`}>
          {onVoltar && <button className="back" onClick={onVoltar} aria-label="Voltar"><Icon n="back" /></button>}
          <div className="hd-tit" title={typeof titulo === 'string' ? titulo : undefined}>
            <h1>{titulo}</h1>
            {sub && <div className="sub">{sub}</div>}
          </div>
          {acoes && <div className="push">{acoes}</div>}
        </div>
        {children}
        <div className="hd-pad" />
      </div>
    </header>
  )
}

// Menu: lateral no computador (a partir de 900px) e barra inferior no celular.
// O CSS decide qual aparece; os dois usam a mesma lista de itens.
export function Menu({ itens, extras = [], ativo, onIr, perfil, onSair }) {
  return (
    <>
      <aside className="side">
        <div className="brand"><i />Minha Obra</div>
        <div className="quem">
          <div className="nm">{perfil.nome}</div>
          <div className="rl">{perfil.role}</div>
        </div>
        <nav>
          {itens.map((it) => (
            <button key={it.id} className={ativo === it.id ? 'on' : ''} onClick={() => onIr(it.id)}>
              <Icon n={it.icone} />{it.rotulo}{it.badge ? <span className="badge">{it.badge}</span> : null}
            </button>
          ))}
          {extras.length > 0 && <div className="grp">Conta</div>}
          {extras.map((it) => (
            <button key={it.id} className={ativo === it.id ? 'on' : ''} onClick={() => onIr(it.id)}>
              <Icon n={it.icone} />{it.rotulo}
            </button>
          ))}
        </nav>
        <div className="me">
          <nav><button onClick={onSair}><Icon n="sair" />Sair</button></nav>
        </div>
      </aside>
      <nav className="bnav">
        {itens.filter((it) => !it.soLateral).map((it) => (
          <button key={it.id} className={ativo === it.id ? 'on' : ''} onClick={() => onIr(it.id)}>
            <Icon n={it.icone} />{it.curto || it.rotulo}{it.badge ? <span className="badge">{it.badge}</span> : null}
          </button>
        ))}
        {extras.length > 0 && (
          <button className={ativo === 'mais' || [...extras, ...itens.filter((i) => i.soLateral)].some((e) => e.id === ativo) ? 'on' : ''} onClick={() => onIr('mais')}>
            <Icon n="mais" />Mais
          </button>
        )}
      </nav>
    </>
  )
}

// Envelope dos três estados: carregando / erro / conteúdo.
export function Carregando({ estado, children }) {
  if (estado.carregando && !estado.data) return <div className="loading">Carregando…</div>
  if (estado.erro) return <div className="card pad err">{estado.erro}</div>
  return children(estado.data)
}
