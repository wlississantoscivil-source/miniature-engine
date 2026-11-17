import { useState } from 'react'
import { criarConta } from '../lib/dados.js'

export default function CriarConta({ onCriada, onVoltar }) {
  const [f, setF] = useState({ nome: '', email: '', whatsapp: '', senha: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const campo = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (!f.nome.trim() || !f.email.trim()) return setErro('Preencha o nome e o email.')
    if (f.senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    setSalvando(true)
    const { data, erro: falha } = await criarConta(f)
    setSalvando(false)
    if (falha) return setErro(falha)
    onCriada(data)
  }

  return (
    <div className="auth">
      <form className="auth-box" onSubmit={enviar}>
        <div className="auth-brand"><i />Minha Obra</div>
        <h1 className="h2">Criar conta</h1>
        <div className="field"><label htmlFor="nome">Nome</label><input id="nome" className="inp" value={f.nome} onChange={campo('nome')} autoComplete="name" /></div>
        <div className="field"><label htmlFor="cemail">Email</label><input id="cemail" className="inp" type="email" value={f.email} onChange={campo('email')} autoComplete="email" /></div>
        <div className="field"><label htmlFor="wa">WhatsApp (opcional)</label><input id="wa" className="inp" type="tel" value={f.whatsapp} onChange={campo('whatsapp')} autoComplete="tel" /></div>
        <div className="field"><label htmlFor="csenha">Senha (mínimo 8 caracteres)</label><input id="csenha" className="inp" type="password" value={f.senha} onChange={campo('senha')} autoComplete="new-password" /></div>
        {erro && <div className="err" role="alert">{erro}</div>}
        <button className="btn pri full" disabled={salvando}>{salvando ? 'Criando…' : 'Criar conta'}</button>
        <button type="button" className="link" onClick={onVoltar}>Já tenho conta</button>
      </form>
    </div>
  )
}
