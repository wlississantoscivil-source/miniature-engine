import { useEffect, useState } from 'react'
import { Topo, Faixa, Carregando, Empty, Icon, useCarregar, useEmBreve, useToast } from '../components/index.jsx'
import { presencaDoDia, salvarPresenca } from '../lib/dados.js'
import { SITUACOES, diaDaSemana, fmtData, hoje, podeEditarPresenca, somarDias } from '../lib/regras.js'
import Diarias from './diarias.jsx'

const SIGLA = { Presente: 'P', Falta: 'F', Atestado: 'A', Folga: 'FG' }

// Módulo Presença. É a tela inicial do mestre e um módulo da obra.
// Sub-abas: Presença e, para quem tem Financeiro, Diárias da quinzena.
// Nada é gravado até tocar em "Salvar presença".
export default function Presenca({ perfil, obra, embutida, seletor, sub, setSub }) {
  const comDiarias = perfil.role !== 'Mestre' && obra.acesso?.financeiro
  const emBreve = useEmBreve()
  const faixa = (
    <Faixa abas={comDiarias ? [{ id: 'presenca', rotulo: 'Presença' }, { id: 'diarias', rotulo: 'Diárias da quinzena' }] : null}
      ativa={sub || 'presenca'} onTroca={setSub}
      acao={<button className="btn pri" onClick={emBreve}><Icon n="plus" />Funcionário</button>} />
  )
  if (comDiarias && sub === 'diarias') return <div className="ct">{faixa}<Diarias perfil={perfil} obra={obra} /></div>
  return <ListaPresenca perfil={perfil} obra={obra} embutida={embutida} seletor={seletor} faixa={faixa} />
}

function ListaPresenca({ perfil, obra, embutida, seletor, faixa }) {
  const [data, setData] = useState(hoje())
  const [marc, setMarc] = useState({})
  const [mudou, setMudou] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const dados = useCarregar(() => presencaDoDia(perfil, obra.id, data), [obra.id, data])
  const toast = useToast()
  const emBreve = useEmBreve()
  const dia = hoje()
  const editavel = podeEditarPresenca(perfil, data, dia)
  const mestre = perfil.role === 'Mestre'

  useEffect(() => {
    if (dados.data) { setMarc(dados.data.marcacoes); setMudou(false) }
  }, [dados.data])

  // Trocar de dia com marcação não salva perde o que foi marcado: pergunta antes.
  const irParaDia = (novo) => {
    if (mudou && !window.confirm('A presença deste dia não foi salva. Sair mesmo assim?')) return
    setData(novo)
  }
  const marcar = (fid, s) => { setMarc((m) => ({ ...m, [fid]: s })); setMudou(true) }
  const repetir = () => {
    if (!Object.keys(dados.data.anterior).length) return toast('Não há presença do dia anterior para repetir.')
    setMarc({ ...dados.data.anterior }); setMudou(true)
  }
  async function salvar() {
    setSalvando(true)
    const { erro } = await salvarPresenca(perfil, obra.id, data, marc)
    setSalvando(false)
    if (erro) return toast(erro)
    toast('Salvo.')
    dados.recarregar()
  }

  const conteudo = (
    <div className="ct">
      {faixa}
      <div className="card pad col">
        <div className="qsel">
          <button onClick={() => irParaDia(somarDias(data, -1))} aria-label="Dia anterior"><Icon n="back" /></button>
          <div className="q">{data === dia ? 'Hoje' : diaDaSemana(data)}<small>{fmtData(data)}</small></div>
          <button onClick={() => irParaDia(somarDias(data, 1))} disabled={data >= dia} aria-label="Dia seguinte"><Icon n="next" /></button>
        </div>
      </div>
      <Carregando estado={dados}>{(d) => {
        if (!d.funcionarios.length) {
          return <Empty icone="colab" titulo="Cadastre os funcionários desta obra para lançar a presença."><button className="btn pri" onClick={emBreve}><Icon n="plus" />Funcionário</button></Empty>
        }
        const presentes = Object.values(marc).filter((s) => s === 'Presente').length
        return (
          <>
            <div className="pres-top">
              <div className="counter"><b>{presentes}</b><span>presentes de {d.funcionarios.length}</span></div>
              <div className="btns" style={{ marginLeft: 'auto' }}>
                {editavel && <button className="btn sec sm" onClick={repetir}><Icon n="repeat" />Repetir presença do dia anterior</button>}
                {!mestre && <button className="btn sec sm" onClick={emBreve}><Icon n="down" />Exportar mês</button>}
              </div>
            </div>
            {d.lancamento && !mudou && <div className="alert ok"><Icon n="check" />Presença lançada por {d.lancamento.por} às {d.lancamento.hora}</div>}
            {!editavel && <div className="alert at"><Icon n="warn" />Dia só para leitura: o mestre corrige até 3 dias atrás.</div>}
            <div className="card">
              {d.funcionarios.map((f) => (
                <div className="emp" key={f.id}>
                  <div className="who"><b>{f.nome}</b><span>{f.funcao}{f.vinculo === 'Do empreiteiro' ? ' · do empreiteiro' : ''}</span></div>
                  <div className="opts">
                    {SITUACOES.map((s) => (
                      <button key={s} disabled={!editavel} className={`${SIGLA[s]}${marc[f.id] === s ? ' on' : ''}`} onClick={() => marcar(f.id, s)} aria-pressed={marc[f.id] === s}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {editavel && (
              <div className="sticky-save">
                <button className="btn pri full" disabled={salvando || !mudou} onClick={salvar}><Icon n="check" />{salvando ? 'Salvando…' : 'Salvar presença'}</button>
              </div>
            )}
          </>
        )
      }}</Carregando>
    </div>
  )

  if (embutida) return conteudo
  return (
    <>
      <Topo titulo={data === dia ? 'Presença de hoje' : 'Presença'} sub={obra.nome}>{seletor}</Topo>
      {conteudo}
    </>
  )
}
