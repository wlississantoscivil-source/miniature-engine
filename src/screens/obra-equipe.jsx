import { Faixa, Tag, Carregando, Empty, Icon, useCarregar, useEmBreve } from '../components/index.jsx'
import { equipeObra } from '../lib/dados.js'
import { brl, fmtData } from '../lib/regras.js'

// Equipe da obra (só engenheiro): funcionários da presença e acessos ao sistema.
export default function Equipe({ perfil, obra }) {
  const dados = useCarregar(() => equipeObra(perfil, obra.id), [obra.id])
  const emBreve = useEmBreve()
  return (
    <div className="ct">
      <Carregando estado={dados}>{(d) => (
        <>
          <Faixa acao={<button className="btn pri" onClick={emBreve}><Icon n="plus" />Funcionário</button>} />
          <div className="card list">
            <div className="list-h">
              <span className="nm">Funcionários da obra</span>
            </div>
            {!d.funcionarios.length && <div className="row"><span className="note">Nenhum funcionário cadastrado nesta obra.</span></div>}
            {d.funcionarios.map((f) => (
              <div className={`row${f.vinculo === 'Diarista' && f.diaria == null ? ' at' : ''}`} key={f.id}>
                <div className="tx">
                  <div className="tt">{f.nome} <span className="note">· {f.funcao}</span></div>
                  <div className="mt">{f.vinculo}{f.chave_pix ? ` · Pix ${f.chave_pix}` : ''}</div>
                </div>
                <div className="val">
                  {f.vinculo === 'Diarista'
                    ? (f.diaria != null ? <>{brl(f.diaria)}<div className="note">desde {fmtData(f.diaria_desde)}</div></> : <Tag tom="at">Sem diária</Tag>)
                    : <Tag tom="ne">Empreiteiro</Tag>}
                </div>
              </div>
            ))}
          </div>
          <div className="card list">
            <div className="list-h">
              <span className="nm">Acessos ao sistema nesta obra</span>
              <button className="btn sec sm tot" onClick={emBreve}>Dar acesso</button>
            </div>
            {!d.acessos.length && <Empty icone="key" titulo="Só o engenheiro tem acesso a esta obra." />}
            {d.acessos.map((a) => (
              <div className="row" key={a.id}>
                <div className="tx">
                  <div className="tt">{a.pessoa.nome}</div>
                  <div className="mt">{a.pessoa.role}</div>
                </div>
                <div className="btns">
                  {a.pode_financeiro && <Tag tom="ok">Financeiro</Tag>}
                  {a.pode_presenca_diario && <Tag tom="ok">Presença e Diário</Tag>}
                  {a.pode_medicao && <Tag tom="ok">Medição</Tag>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}</Carregando>
    </div>
  )
}
