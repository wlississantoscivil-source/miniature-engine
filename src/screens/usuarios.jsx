import { Topo, StatusTag, Carregando, Empty, useCarregar, useEmBreve } from '../components/index.jsx'
import { listarUsuarios } from '../lib/dados.js'

// Usuários (só engenheiro): quem espera liberação e quem já usa o sistema.
export default function Usuarios({ perfil, voltar }) {
  const dados = useCarregar(() => listarUsuarios(perfil), [perfil.id])
  const emBreve = useEmBreve()
  return (
    <>
      <Topo titulo="Usuários" onVoltar={voltar} />
      <div className="ct">
        <Carregando estado={dados}>{(lista) => {
          const pendentes = lista.filter((u) => u.role === 'Pendente')
          const ativos = lista.filter((u) => u.role !== 'Pendente')
          return (
            <>
              {pendentes.length > 0 && (
                <div className="card list">
                  <div className="list-h"><span className="nm">Aguardando liberação</span></div>
                  {pendentes.map((u) => (
                    <div className="row at" key={u.id}>
                      <div className="tx"><div className="tt">{u.nome}</div><div className="mt">{u.email}</div></div>
                      <button className="btn pri sm" onClick={emBreve}>Liberar</button>
                    </div>
                  ))}
                </div>
              )}
              {ativos.length <= 1 ? <Empty icone="colab" titulo="Só você por enquanto." /> : (
                <div className="card list">
                  {ativos.map((u) => (
                    <button className="row btnrow" key={u.id} onClick={emBreve}>
                      <div className="tx">
                        <div className="tt">{u.nome}</div>
                        <div className="mt">{u.email}{u.role === 'Engenheiro' ? ' · todas as obras' : u.obras.length ? ` · ${u.obras.join(', ')}` : ''}</div>
                      </div>
                      <StatusTag s={u.role} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        }}</Carregando>
      </div>
    </>
  )
}
