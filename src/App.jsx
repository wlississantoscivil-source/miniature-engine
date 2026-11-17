import { useState } from 'react'
import { ToastProvider } from './components/index.jsx'
import Login from './pages/Login.jsx'
import CriarConta from './pages/CriarConta.jsx'
import Aguardando from './pages/Aguardando.jsx'
import AppEscritorio from './pages/AppEscritorio.jsx'
import AppMestre from './pages/AppMestre.jsx'

// Escolhe a "casca" certa para cada perfil.
// Por enquanto o login é de exemplo (lib/dados.js); com o Supabase, este arquivo
// passa a escutar supabase.auth.onAuthStateChange e buscar a linha em profiles.
export default function App() {
  const [perfil, setPerfil] = useState(null)
  const [tela, setTela] = useState('login')
  const sair = () => { setPerfil(null); setTela('login') }

  let corpo
  if (!perfil) {
    corpo = tela === 'criar'
      ? <CriarConta onCriada={setPerfil} onVoltar={() => setTela('login')} />
      : <Login onEntrar={setPerfil} onCriarConta={() => setTela('criar')} />
  } else if (perfil.role === 'Pendente' || !perfil.ativo) {
    corpo = <Aguardando onSair={sair} />
  } else if (perfil.role === 'Mestre') {
    corpo = <AppMestre perfil={perfil} onSair={sair} />
  } else {
    corpo = <AppEscritorio perfil={perfil} onSair={sair} />
  }
  return <ToastProvider>{corpo}</ToastProvider>
}
