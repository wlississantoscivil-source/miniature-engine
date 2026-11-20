// Médio prazo: quadro de restrições por semana, mover e validar.
import * as dados from '../src/lib/dados.js'
import { errosRestricao, montarEap, montarLookahead, novoPrazo, podeVoltarSemana, restricaoVencida, rotuloSemana, semanaDe } from '../src/lib/planejamento.js'

let passou = 0
let total = 0
function conferir(nome, veio, esperado) {
  total++
  if (JSON.stringify(veio) === JSON.stringify(esperado)) passou++
  else console.log(`  ✗ ${nome}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(veio)}`)
}

const DIA = '2026-11-25' // quarta; semana atual começa 23/11
conferir('semana começa na segunda', [semanaDe(DIA), semanaDe('2026-11-23'), semanaDe('2026-11-29')], ['2026-11-23', '2026-11-23', '2026-11-23'])

const linhas = montarEap([
  { id: 'G', pai_id: null, ordem: 1, titulo: 'G', inicio: '2026-11-23', fim: '2026-12-20', progresso: 0 },
  { id: 'A', pai_id: 'G', ordem: 1, titulo: 'A', inicio: '2026-11-23', fim: '2026-12-04', progresso: 10 },
  { id: 'B', pai_id: 'G', ordem: 2, titulo: 'B', inicio: '2026-12-07', fim: '2026-12-20', progresso: 0 },
])
const r = (id, prazo, extra = {}) => ({ id, atividade_id: 'A', descricao: id, tipo: 'Material', prazo, responsavel: 'Ana', resolvida: false, ...extra })
const restricoes = [
  r('vencida', '2026-11-10'),
  r('esta', '2026-11-27'),
  r('proxima', '2026-12-02', { responsavel: 'Carlos', atividade_id: 'B' }),
  r('longe', '2027-02-01'),
  r('resolvida', '2026-11-24', { resolvida: true }),
]
const q = montarLookahead(restricoes, linhas, { dia: DIA, semanas: 3 })
conferir('3 colunas a partir da semana atual', q.colunas.map((c) => c.inicio), ['2026-11-23', '2026-11-30', '2026-12-07'])
conferir('vencida fica na semana atual, junto com a desta semana', q.colunas[0].restricoes.map((x) => x.id), ['vencida', 'esta'])
conferir('resolvida escondida por padrão', q.colunas.flatMap((c) => c.restricoes).some((x) => x.resolvida), false)
conferir('as que passam da última coluna são contadas', q.depois, 1)
conferir('atividades e impedidas por semana', q.colunas.map((c) => [c.atividades, c.impedidas]), [[1, 1], [1, 1], [1, 1]])
conferir('filtro por responsável', montarLookahead(restricoes, linhas, { dia: DIA, semanas: 3, responsavel: 'Carlos' }).colunas.flatMap((c) => c.restricoes.map((x) => x.id)), ['proxima'])
conferir('mostrar resolvidas', montarLookahead(restricoes, linhas, { dia: DIA, semanas: 3, comResolvidas: true }).colunas[0].restricoes.map((x) => x.id), ['vencida', 'resolvida', 'esta'])
conferir('lista de responsáveis em ordem', q.responsaveis, ['Ana', 'Carlos'])
conferir('vencida = aberta e com prazo antes de hoje', [restricaoVencida(restricoes[0], DIA), restricaoVencida(restricoes[4], '2026-12-30')], [true, false])

conferir('mover para frente anda 7 dias', novoPrazo(restricoes[2], 1, DIA), { prazo: '2026-12-09' })
conferir('mover vencida para frente conta de hoje', novoPrazo(restricoes[0], 1, DIA), { prazo: '2026-12-02' })
conferir('não volta para semana que já passou', !!novoPrazo(restricoes[1], -1, DIA).erro, true)
conferir('voltar para esta semana nunca fica antes de hoje', novoPrazo(r('x', '2026-11-30'), -1, DIA), { prazo: DIA })

conferir('formulário vazio', Object.keys(errosRestricao({ descricao: '', tipo: '', prazo: '', responsavel: '', atividade_id: '' }, linhas)), ['descricao', 'tipo', 'prazo', 'responsavel', 'atividade_id'])
conferir('grupo não recebe restrição', !!errosRestricao({ descricao: 'x', tipo: 'Material', prazo: DIA, responsavel: 'Ana', atividade_id: 'G' }, linhas).atividade_id, true)
conferir('tipo fora da lista recusado', !!errosRestricao({ descricao: 'x', tipo: 'Clima', prazo: DIA, responsavel: 'Ana', atividade_id: 'A' }, linhas).tipo, true)

conferir('restrição nova não nasce vencida; a antiga pode manter o prazo', [
  errosRestricao({ descricao: 'x', tipo: 'Material', prazo: '2026-11-20', responsavel: 'Ana', atividade_id: 'A' }, linhas, { dia: DIA, nova: true }).prazo,
  errosRestricao({ descricao: 'x', tipo: 'Material', prazo: '2026-11-20', responsavel: 'Ana', atividade_id: 'A' }, linhas, { dia: DIA }).prazo,
], ['O prazo não pode ser antes de hoje.', undefined])
conferir('voltar semana: só se não cair no passado', [podeVoltarSemana(restricoes[1], DIA), podeVoltarSemana(restricoes[2], DIA), podeVoltarSemana(restricoes[0], DIA)], [false, true, false])
conferir('rótulos de semana', [rotuloSemana('2026-11-23', '2026-11-23'), rotuloSemana('2026-11-30', '2026-11-23'), rotuloSemana('2026-11-16', '2026-11-23'), rotuloSemana('2026-12-07', '2026-11-23')], ['Esta semana', 'Próxima semana', 'Semana passada', 'Semana de 07/12'])

// Camada de dados
const perfis = (await dados.listarPerfisDeExemplo()).data
const wlisses = perfis.find((p) => p.nome === 'Wlisses')
const carlos = perfis.find((p) => p.nome === 'Carlos')
const escola = (await dados.listarPlanejamento(wlisses, 'o1')).data
const ubs = (await dados.listarPlanejamento(wlisses, 'o2')).data
conferir('escola tem 3 restrições, UBS 1', [escola.restricoes.length, ubs.restricoes.length], [3, 1])
conferir('nada da escola na UBS', ubs.restricoes.some((x) => x.obra_id !== 'o2'), false)
const nova = await dados.salvarRestricao(wlisses, 'o1', { descricao: '  Falta de pedreiro  ', tipo: 'Mão de obra', prazo: '2026-12-01', responsavel: 'Carlos', atividade_id: 'pa5' })
const criada = nova.data.restricoes.find((x) => x.descricao === 'Falta de pedreiro')
conferir('cria restrição aberta e com texto limpo', [!!criada, criada?.resolvida], [true, false])
conferir('resolver', (await dados.resolverRestricao(wlisses, 'o1', criada.id, true)).data.restricoes.find((x) => x.id === criada.id).resolvida, true)
conferir('mover uma semana', (await dados.moverRestricao(wlisses, 'o1', criada.id, 1, '2026-11-25')).data.restricoes.find((x) => x.id === criada.id).prazo, '2026-12-08')
conferir('mestre não cria restrição', (await dados.salvarRestricao(carlos, 'o1', { descricao: 'x', tipo: 'Material', prazo: '2026-12-01', responsavel: 'Ana', atividade_id: 'pa5' })).erro !== null, true)

console.log(`restrições: ${passou}/${total}`)
process.exit(passou === total ? 0 : 1)
