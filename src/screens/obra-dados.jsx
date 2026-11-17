import { Faixa, Icon, useEmBreve } from '../components/index.jsx'
import { fmtData } from '../lib/regras.js'
import PlanilhaLicitacao from './obra-planilha.jsx'

// Dados da obra (botão Editar, só engenheiro). Sub-abas: Dados e Planilha da licitação.
export default function DadosObra({ perfil, obra, sub, setSub }) {
  const emBreve = useEmBreve()
  const aba = sub || 'dados'
  return (
    <div className="ct">
      <Faixa abas={[{ id: 'dados', rotulo: 'Dados' }, { id: 'planilha', rotulo: 'Planilha da licitação' }]} ativa={aba} onTroca={setSub}
        acao={aba === 'dados' && <button className="btn pri" onClick={emBreve}><Icon n="edit" />Editar dados</button>} />
      {aba === 'planilha' ? <PlanilhaLicitacao perfil={perfil} obra={obra} /> : (
        <div className="card dl">
          <div><span className="lab">Nome</span><b>{obra.nome}</b></div>
          <div><span className="lab">Tipo</span><b>{obra.tipo}</b></div>
          <div><span className="lab">Órgão contratante</span><b>{obra.orgao_contratante}</b></div>
          <div><span className="lab">Nº do contrato</span><b>{obra.numero_contrato || '—'}</b></div>
          <div><span className="lab">Endereço / cidade</span><b>{obra.endereco || '—'}</b></div>
          <div><span className="lab">Status</span><b>{obra.status}</b></div>
          <div><span className="lab">Início</span><b>{fmtData(obra.data_inicio)}</b></div>
          <div><span className="lab">Previsão de término</span><b>{obra.data_prevista_fim ? fmtData(obra.data_prevista_fim) : '—'}</b></div>
        </div>
      )}
    </div>
  )
}
