import { useState } from 'react'
import { Menu, useCarregar } from '../components/index.jsx'
import { avisosPainel, temFinanceiro } from '../lib/dados.js'
import Obras from '../screens/obras.jsx'
import Obra from '../screens/obra.jsx'
import ExtratoFornecedor from '../screens/extrato-fornecedor.jsx'
import Fechamento from '../screens/fechamento.jsx'
import ComprasGeral from '../screens/compras-geral.jsx'
import NotasPendentes from '../screens/notas-pendentes.jsx'
import Fornecedores from '../screens/fornecedores.jsx'
import Relatorios from '../screens/relatorios.jsx'
import Usuarios from '../screens/usuarios.jsx'
import Perfil from '../screens/perfil.jsx'
import Mais from '../screens/mais.jsx'

// Casca do Engenheiro e do Auxiliar.
// Navegação por estado (sem endereço no navegador): uma pilha de telas.
// O módulo aberto dentro de uma obra mora nos params da rota, para o "voltar"
// de um extrato ou fechamento cair de novo no mesmo módulo.
const DO_MENU = { obra: 'obras', extrato: 'obras', fechamento: 'obras' }

export default function AppEscritorio({ perfil, onSair }) {
  const [pilha, setPilha] = useState([{ screen: 'obras', params: {} }])
  const rota = pilha[pilha.length - 1]
  const topo = () => window.scrollTo(0, 0)
  const goto = (screen, params = {}) => { setPilha((p) => [...p, { screen, params }]); topo() }
  const voltar = () => setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p))
  const irDoMenu = (screen) => { setPilha([{ screen, params: {} }]); topo() }
  // Volta na pilha até a tela pedida (para o caminho clicável). `novos` troca
  // params dela, ex.: voltar à obra já na grade de módulos ({ aba: null }).
  const voltarAte = (screen, novos) => {
    setPilha((p) => {
      const i = p.map((r) => r.screen).lastIndexOf(screen)
      if (i < 0) return [{ screen, params: {} }]
      const alvo = novos ? { ...p[i], params: { ...p[i].params, ...novos } } : p[i]
      return [...p.slice(0, i), alvo]
    })
    topo()
  }
  const setParams = (novos) => {
    setPilha((p) => [...p.slice(0, -1), { ...p[p.length - 1], params: { ...p[p.length - 1].params, ...novos } }])
    topo()
  }
  const avisos = useCarregar(() => avisosPainel(perfil), [perfil.id])

  const fin = temFinanceiro(perfil)
  const relatorios = { id: 'relatorios', rotulo: 'Relatórios', icone: 'down' }
  const itens = [
    { id: 'obras', rotulo: 'Obras', icone: 'obras' },
    ...(fin ? [
      { id: 'compras', rotulo: 'Lista de compras', curto: 'Compras', icone: 'compras' },
      { id: 'notas', rotulo: 'Notas pendentes', curto: 'Notas', icone: 'notas', badge: avisos.data?.compras_aguardando },
      { id: 'fornecedores', rotulo: 'Fornecedores', icone: 'forn' },
    ] : []),
    // A barra do celular já tem 5 itens: Relatórios fica dentro de "Mais" lá.
    { ...relatorios, soLateral: true },
  ]
  const extras = [
    ...(perfil.role === 'Engenheiro' ? [{ id: 'usuarios', rotulo: 'Usuários', icone: 'colab' }] : []),
    { id: 'perfil', rotulo: 'Meu perfil', icone: 'user' },
  ]

  const p = { perfil, goto, voltar: pilha.length > 1 ? voltar : undefined, voltarAte, setParams, params: rota.params }
  let corpo
  switch (rota.screen) {
    case 'obra': corpo = <Obra key={rota.params.obraId} {...p} />; break
    case 'extrato': corpo = <ExtratoFornecedor {...p} />; break
    case 'fechamento': corpo = <Fechamento {...p} />; break
    case 'compras': corpo = <ComprasGeral {...p} />; break
    case 'notas': corpo = <NotasPendentes {...p} />; break
    case 'fornecedores': corpo = <Fornecedores {...p} />; break
    case 'relatorios': corpo = <Relatorios {...p} />; break
    case 'usuarios': corpo = <Usuarios {...p} />; break
    case 'perfil': corpo = <Perfil {...p} onSair={onSair} />; break
    case 'mais': corpo = <Mais itens={[relatorios, ...extras]} onIr={goto} onSair={onSair} perfil={perfil} />; break
    default: corpo = <Obras {...p} />
  }

  // No celular, Relatórios aberto pelo "Mais" acende o "Mais".
  const ativo = DO_MENU[rota.screen] || rota.screen
  return (
    <div className="app">
      <Menu itens={itens} extras={extras} ativo={ativo} onIr={irDoMenu} perfil={perfil} onSair={onSair} />
      <main className="main">{corpo}</main>
    </div>
  )
}
