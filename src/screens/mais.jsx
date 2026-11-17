import { Topo, Icon } from '../components/index.jsx'

// "Mais" da barra do celular: os itens que não cabem nos 5 botões.
export default function Mais({ itens, onIr, onSair, perfil }) {
  return (
    <>
      <Topo titulo="Mais" sub={`${perfil.nome} · ${perfil.role}`} />
      <div className="ct">
        <div className="card list">
          {itens.map((it) => (
            <button className="row btnrow" key={it.id} onClick={() => onIr(it.id)}>
              <Icon n={it.icone} /><div className="tx"><div className="tt">{it.rotulo}</div></div><span className="chev"><Icon n="next" /></span>
            </button>
          ))}
          <button className="row btnrow" onClick={onSair}>
            <Icon n="sair" /><div className="tx"><div className="tt">Sair</div></div>
          </button>
        </div>
      </div>
    </>
  )
}
