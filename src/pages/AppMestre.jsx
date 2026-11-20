import { useState } from 'react'
import { Menu, Topo, Carregando, Empty, useCarregar } from '../components/index.jsx'
import { listarMinhasObras } from '../lib/dados.js'
import Presenca from '../screens/obra-presenca.jsx'
import Diario from '../screens/obra-diario.jsx'
import Perfil from '../screens/perfil.jsx'

// Casca do Mestre: Presença, Diário e Perfil. A obra escolhida vale para os dois módulos.
// O mestre nunca chama função de dinheiro, e a camada de dados também recusa.
const MODULOS = {
  presenca: { titulo: 'Presença', Modulo: Presenca },
  diario: { titulo: 'Diário de Obra', Modulo: Diario },
}

export default function AppMestre({ perfil, onSair }) {
  const [tela, setTela] = useState('presenca')
  const [obraId, setObraId] = useState(null)
  const obras = useCarregar(() => listarMinhasObras(perfil), [perfil.id])

  const itens = [
    { id: 'presenca', rotulo: 'Presença', icone: 'presenca' },
    { id: 'diario', rotulo: 'Diário', icone: 'diario' },
    { id: 'perfil', rotulo: 'Perfil', icone: 'user' },
  ]

  let corpo
  if (tela === 'perfil') corpo = <Perfil perfil={perfil} onSair={onSair} />
  else {
    corpo = (
      <Carregando estado={obras}>{(lista) => {
        if (!lista.length) {
          return (
            <>
              <Topo titulo={MODULOS[tela].titulo} />
              <div className="ct"><Empty icone="obras" titulo="Você ainda não foi liberado em nenhuma obra." texto="Fale com o engenheiro." /></div>
            </>
          )
        }
        const atual = lista.find((o) => o.id === obraId) || lista[0]
        const seletor = lista.length > 1 && (
          <select className="osel" aria-label="Obra" value={atual.id} onChange={(e) => setObraId(e.target.value)}>
            {lista.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        )
        const { Modulo } = MODULOS[tela]
        return <Modulo key={atual.id} perfil={perfil} obra={atual} seletor={seletor} />
      }}</Carregando>
    )
  }

  return (
    <div className="app">
      <Menu itens={itens} ativo={tela} onIr={setTela} perfil={perfil} onSair={onSair} />
      <main className="main">{corpo}</main>
    </div>
  )
}
