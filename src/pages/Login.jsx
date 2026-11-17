import { useState } from 'react'
import { entrar, listarPerfisDeExemplo } from '../lib/dados.js'
import { useCarregar } from '../components/index.jsx'

export default function Login({ onEntrar, onCriarConta }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)
  const exemplos = useCarregar(listarPerfisDeExemplo, [])

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (!email || !senha) return setErro('Preencha o email e a senha.')
    setEntrando(true)
    const { data, erro: falha } = await entrar(email)
    setEntrando(false)
    if (falha) return setErro(falha)
    onEntrar(data)
  }

  const entrarComo = async (p) => {
    const { data } = await entrar(p.email)
    onEntrar(data)
  }

  return (
    <div className="auth">
      <form className="auth-box" onSubmit={enviar}>
        <div className="auth-brand"><i />Minha Obra</div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="senha">Senha</label>
          <input id="senha" className="inp" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <div className="err" role="alert">{erro}</div>}
        <button className="btn pri full" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" className="link" onClick={onCriarConta}>Criar conta</button>

        <div className="card pad col" style={{ marginTop: 10 }}>
          <span className="lab">Dados de exemplo · entrar como</span>
          <p className="note">Enquanto o banco não existe, toque numa pessoa para ver o app pelos olhos dela.</p>
          <div className="demo">
            {(exemplos.data || []).map((p) => (
              <button type="button" key={p.id} onClick={() => entrarComo(p)}>{p.nome}<span>{p.role}</span></button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
