import { Icon } from '../components/index.jsx'

export default function Aguardando({ onSair }) {
  return (
    <div className="auth">
      <div className="auth-box">
        <div className="auth-brand"><i />Minha Obra</div>
        <div className="card empty">
          <div className="ic"><Icon n="key" /></div>
          <h2>Conta aguardando liberação do administrador.</h2>
          <p>Avise o engenheiro responsável que você se cadastrou.</p>
          <button className="btn sec" onClick={onSair}>Sair</button>
        </div>
      </div>
    </div>
  )
}
