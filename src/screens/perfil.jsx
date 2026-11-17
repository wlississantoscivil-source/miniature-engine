import { Topo, Icon, useEmBreve } from '../components/index.jsx'

// Meu perfil: dados da pessoa, trocar senha e sair.
export default function Perfil({ perfil, voltar, onSair }) {
  const emBreve = useEmBreve()
  return (
    <>
      <Topo titulo="Meu perfil" onVoltar={voltar} />
      <div className="ct">
        <div className="card dl">
          <div><span className="lab">Nome</span><b>{perfil.nome}</b></div>
          <div><span className="lab">Email</span><b>{perfil.email}</b></div>
          <div><span className="lab">WhatsApp</span><b>{perfil.whatsapp || '—'}</b></div>
          <div><span className="lab">Perfil</span><b>{perfil.role}</b></div>
        </div>
        <div className="btns">
          <button className="btn sec" onClick={emBreve}><Icon n="key" />Trocar senha</button>
          <button className="btn esc" onClick={onSair}><Icon n="sair" />Sair</button>
        </div>
      </div>
    </>
  )
}
