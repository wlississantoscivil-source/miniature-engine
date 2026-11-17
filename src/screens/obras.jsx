import { useState } from 'react'
import { Topo, Seg, Tag, StatusTag, Empty, Carregando, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { listarObrasPainel, avisosPainel } from '../lib/dados.js'
import { brl } from '../lib/regras.js'
import Gastos from './gastos.jsx'

// Cada filtro com a cor do seu status (o neutro "Todas" fica no café).
const FILTROS = [
  { id: 'Em andamento', rotulo: 'Em andamento', tom: 'ok' },
  { id: 'Paralisada', rotulo: 'Paralisada', tom: 'at' },
  { id: 'Concluída', rotulo: 'Concluída', tom: 'ne' },
  { id: 'Todas', rotulo: 'Todas' },
]

// Tela inicial do Engenheiro e do Auxiliar.
export default function Obras({ perfil, goto }) {
  const [visao, setVisao] = useState('cartoes')
  const [filtro, setFiltro] = useState('Em andamento')
  const obras = useCarregar(() => listarObrasPainel(perfil), [perfil.id])
  const avisos = useCarregar(() => avisosPainel(perfil), [perfil.id])
  const emBreve = useEmBreve()
  const eng = perfil.role === 'Engenheiro'

  return (
    <>
      <Topo titulo="Obras" sub={perfil.role === 'Auxiliar' ? 'Obras liberadas para você' : 'Todas as obras'}
        acoes={eng && <button className="btn pri sm" onClick={emBreve}><Icon n="plus" />Nova obra</button>} />
      <div className="ct">
        <Seg valor={visao} onChange={setVisao} opcoes={[{ id: 'cartoes', rotulo: 'Cartões' }, { id: 'gastos', rotulo: 'Gastos' }]} />

        {visao === 'gastos' ? <Gastos perfil={perfil} /> : (
          <>
            {avisos.data && (avisos.data.fechamentos_rascunho > 0 || avisos.data.compras_aguardando > 0) && (
              <div className="avisos" role="status">
                <Icon n="warn" />
                {avisos.data.fechamentos_rascunho > 0 && (
                  <button onClick={() => goto('obra', { obraId: obras.data?.find((o) => o.fechamentos_rascunho)?.id, aba: 'fornecedores', anterior: true })}>
                    <b>{avisos.data.fechamentos_rascunho}</b>{avisos.data.fechamentos_rascunho === 1 ? 'fechamento para revisar' : 'fechamentos para revisar'}
                  </button>
                )}
                {avisos.data.compras_aguardando > 0 && (
                  <button onClick={() => goto('notas')}>
                    <b>{avisos.data.compras_aguardando}</b>{avisos.data.compras_aguardando === 1 ? 'compra aguardando NF' : 'compras aguardando NF'}
                  </button>
                )}
              </div>
            )}

            <Seg valor={filtro} onChange={setFiltro} opcoes={FILTROS} />

            <Carregando estado={obras}>{(lista) => {
              const vis = lista.filter((o) => filtro === 'Todas' || o.status === filtro)
              if (!lista.length) {
                return <Empty titulo={perfil.role === 'Auxiliar' ? 'Você ainda não foi liberado em nenhuma obra.' : 'Nenhuma obra cadastrada.'}
                  texto={eng ? 'Toque em Nova obra para começar.' : 'Fale com o engenheiro.'} />
              }
              if (!vis.length) return <Empty titulo={`Nenhuma obra ${filtro.toLowerCase()}.`} texto="Troque o filtro acima para ver as outras." />
              return <div className="obras">{vis.map((o) => <CartaoObra key={o.id} o={o} onAbrir={() => goto('obra', { obraId: o.id })} />)}</div>
            }}</Carregando>
          </>
        )}
      </div>
    </>
  )
}

function CartaoObra({ o, onAbrir }) {
  const pres = o.presenca_hoje
  // Faixa de cor só quando há atraso; obra em dia fica neutra.
  const tom = pres === 'atrasada' || o.nf_atrasada ? 'cr' : ''
  return (
    <button className={`card obra ${tom}`} onClick={onAbrir}>
      <div className="top">
        <div>
          <div className="nm">{o.nome}</div>
          <div className="og">{o.tipo} · {o.orgao_contratante}</div>
        </div>
        <StatusTag s={o.status} />
      </div>
      <div className="stats">
        {o.acesso.financeiro && (
          <>
            <div>
              <span className="lab">Aguardando NF</span>
              <b className={o.nf_atrasada ? 'cr' : ''}>{o.aguardando_nf}</b>
              <div className={`s${o.nf_atrasada ? ' cr' : ''}`}>{o.nf_atrasada ? 'há mais de 7 dias' : 'compras'}</div>
            </div>
            <div>
              <span className="lab">A pagar</span>
              <b>{brl(o.a_pagar).replace('R$ ', '')}</b>
              <div className="s">R$ em aberto</div>
            </div>
          </>
        )}
        <div>
          <span className="lab">Presença hoje</span>
          <div style={{ marginTop: 6 }}>
            {pres === 'lancada' && <Tag tom="ok">Lançada</Tag>}
            {pres === 'atrasada' && <Tag tom="cr">Não lançada</Tag>}
            {pres === 'pendente' && <Tag tom="ne">Não lançada</Tag>}
            {!pres && <Tag tom="ne">—</Tag>}
          </div>
        </div>
      </div>
    </button>
  )
}
