import { Topo, StatusTag, Carregando, Icon, useCarregar } from '../components/index.jsx'
import { obterObra, pendenciasObra } from '../lib/dados.js'
import { abasVisiveis } from '../lib/regras.js'
import Resumo from './obra-resumo.jsx'
import ListaCompras from './obra-lista-compras.jsx'
import ObraFornecedores from './obra-fornecedores.jsx'
import ObraNotas from './obra-notas.jsx'
import ObraPagamentos from './obra-pagamentos.jsx'
import Presenca from './obra-presenca.jsx'
import Diario from './obra-diario.jsx'
import Planejamento from './obra-planejamento.jsx'
import Equipe from './obra-equipe.jsx'
import OrcadoRealizado from './obra-orcado.jsx'
import FluxoCaixa from './obra-fluxo.jsx'
import DadosObra from './obra-dados.jsx'

const ICONE = { resumo: 'tabela', orcado: 'folha', fluxo: 'pay', lista: 'compras', fornecedores: 'forn', notas: 'notas', pagamentos: 'pay', presenca: 'presenca', diario: 'diario', planejamento: 'plano', equipe: 'colab' }
const MODULO = {
  resumo: Resumo, orcado: OrcadoRealizado, fluxo: FluxoCaixa, lista: ListaCompras, fornecedores: ObraFornecedores,
  notas: ObraNotas, pagamentos: ObraPagamentos, presenca: Presenca, diario: Diario, planejamento: Planejamento, equipe: Equipe, dados: DadosObra,
}
// "Dados da obra" não fica na grade: abre pelo botão Editar (só engenheiro).
const DADOS = { id: 'dados', rotulo: 'Dados da obra' }

// Uma obra. Abre na grade de módulos (cada quadrado com a sua pendência);
// tocar num quadrado abre o módulo. O auxiliar só vê os módulos liberados.
// O módulo aberto fica em params.aba e a sub-aba em params.sub.
export default function Obra({ perfil, goto, voltar, voltarAte, setParams, params }) {
  const obra = useCarregar(() => obterObra(perfil, params.obraId), [params.obraId])
  const pend = useCarregar(() => pendenciasObra(perfil, params.obraId), [params.obraId, params.aba])

  return (
    <Carregando estado={obra}>{(o) => {
      const modulos = abasVisiveis(o.acesso)
      const mod = params.aba === 'dados' && o.acesso.engenheiro ? DADOS : modulos.find((m) => m.id === params.aba)
      const irObras = () => voltarAte('obras')
      const caminho = [
        { rotulo: 'Início', onClick: irObras },
        { rotulo: 'Obras', onClick: irObras },
        { rotulo: o.nome, onClick: mod ? () => setParams({ aba: null, sub: null }) : null },
        ...(mod ? [{ rotulo: mod.rotulo }] : []),
      ]
      const acoes = <div className="btns"><StatusTag s={o.status} />{o.acesso.engenheiro && !mod && <button className="btn esc sm" onClick={() => setParams({ aba: 'dados', sub: null })}><Icon n="edit" />Editar</button>}</div>

      if (!mod) {
        return (
          <>
            <Topo titulo={o.nome} sub={`${o.tipo} · ${o.orgao_contratante}`} onVoltar={voltar} acoes={acoes} caminho={caminho} />
            <div className="ct">
              <div className="mods">
                {modulos.map((m) => {
                  const p = pend.data?.[m.id]
                  // Pendência que começa com número ("4 aguardando NF") mostra o número grande.
                  const conta = (p?.tom === 'cr' || p?.tom === 'at') && /^(\d+)\s+(.*)$/.exec(p.texto)
                  const tom = p?.tom === 'cr' || p?.tom === 'at' ? p.tom : ''
                  return (
                    <button key={m.id} className={`card mod ${tom}`} onClick={() => setParams({ aba: m.id, sub: null })}>
                      <span className="mi"><Icon n={ICONE[m.id]} /></span>
                      <b>{m.rotulo}</b>
                      {conta
                        ? <><span className="pn">{conta[1]}</span><span>{conta[2]}</span></>
                        : <span>{p ? p.texto : ' '}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )
      }

      const Modulo = MODULO[mod.id]
      return (
        <>
          <Topo titulo={mod.rotulo} sub={o.nome} onVoltar={() => setParams({ aba: null, sub: null })} acoes={acoes} caminho={caminho} />
          <Modulo perfil={perfil} obra={o} goto={goto} params={params} sub={params.sub} setSub={(sub) => setParams({ sub })} irPara={(aba, sub) => setParams({ aba, sub })} embutida />
        </>
      )
    }}</Carregando>
  )
}
