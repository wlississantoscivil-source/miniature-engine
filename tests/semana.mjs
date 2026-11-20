// Curto prazo: quem entra na semana, PPC, causas de "não realizado" e o checklist.
import * as dados from '../src/lib/dados.js'
import { atividadesDaSemana, causasDaSemana, montarEap, ppcDaSemana, progressoPeloStatus, semanaDe, tomPpc } from '../src/lib/planejamento.js'
import { hoje } from '../src/lib/regras.js'

let passou = 0
let total = 0
function conferir(nome, veio, esperado) {
  total++
  if (JSON.stringify(veio) === JSON.stringify(esperado)) passou++
  else console.log(`  ✗ ${nome}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(veio)}`)
}

const SEM = '2026-11-23' // segunda
const a = (id, inicio, fim, status, extra = {}) => ({ id, pai_id: 'G', ordem: 1, titulo: id, inicio, fim, progresso: 0, status, ...extra })
const linhas = montarEap([
  { id: 'G', pai_id: null, ordem: 1, titulo: 'G', inicio: '2026-11-01', fim: '2026-12-31', progresso: 0 },
  a('cruza', '2026-11-20', '2026-11-24', 'Em andamento'),
  a('dentro', '2026-11-24', '2026-11-26', 'Concluído'),
  a('acumulada', '2026-11-02', '2026-11-13', 'A fazer'),
  a('velha-pronta', '2026-11-02', '2026-11-13', 'Concluído'),
  a('futura', '2026-12-01', '2026-12-10', 'A fazer'),
  a('domingo', '2026-11-29', '2026-12-03', 'A fazer'),
])
const semana = atividadesDaSemana(linhas, SEM)
conferir('entra quem cruza a semana e a acumulada; grupo não entra', semana.map((l) => l.id), ['cruza', 'dentro', 'acumulada', 'domingo'])
conferir('acumulada marcada', semana.filter((l) => l.acumulada).map((l) => l.id), ['acumulada'])
conferir('PPC = 1 de 4 = 25%', ppcDaSemana(semana), { total: 4, concluidas: 1, ppc: 25 })
conferir('semana vazia não tem PPC', ppcDaSemana([]).ppc, null)
conferir('tom do PPC', [tomPpc(30), tomPpc(60), tomPpc(80), tomPpc(null)], ['cr', 'at', '', ''])
conferir('progresso acompanha o quadro', [progressoPeloStatus('Concluído', 40), progressoPeloStatus('Em andamento', 100), progressoPeloStatus('A fazer', 100), progressoPeloStatus('A fazer', 30)], [100, 90, 0, 30])
const causas = causasDaSemana(
  [{ id: 'x', causa_nao_realizado: 'Clima', semana_nao_realizado: SEM }, { id: 'y', causa_nao_realizado: 'Material', semana_nao_realizado: '2026-11-16' }],
  [{ atividade_id: 'x', feita: false, causa_nao_realizado: 'Clima' }, { atividade_id: 'x', feita: true, causa_nao_realizado: null }, { atividade_id: 'z', feita: false, causa_nao_realizado: 'Projeto' }],
  SEM,
)
conferir('causas só desta semana e só das atividades dela', causas, [{ causa: 'Clima', n: 2 }])

// Camada de dados (mock relativo a hoje)
const perfis = (await dados.listarPerfisDeExemplo()).data
const wlisses = perfis.find((p) => p.nome === 'Wlisses')
const carlos = perfis.find((p) => p.nome === 'Carlos')
const esta = semanaDe(hoje())
const escola = (await dados.listarPlanejamento(wlisses, 'o1')).data
const daSemana = atividadesDaSemana(montarEap(escola.atividades), esta)
conferir('escola: há atividade na semana e alguma concluída (PPC aparece)', [daSemana.length > 0, ppcDaSemana(daSemana).concluidas > 0], [true, true])
conferir('UBS: subtarefas só dela', (await dados.listarPlanejamento(wlisses, 'o2')).data.subtarefas.every((s) => s.obra_id === 'o2'), true)

const moveu = await dados.moverNaSemana(carlos, 'o1', 'pa4', 'Concluído')
const pa4 = moveu.data.atividades.find((x) => x.id === 'pa4')
conferir('mestre move no quadro; concluir zera a causa e vai a 100%', [moveu.erro, pa4.status, pa4.progresso, pa4.causa_nao_realizado], [null, 'Concluído', 100, null])
conferir('concluída não pode ser "não realizado"', (await dados.marcarNaoRealizado(carlos, 'o1', 'pa4', 'Clima', esta)).erro, 'Esta atividade já foi concluída.')
conferir('"não realizado" sem causa é recusado', (await dados.marcarNaoRealizado(carlos, 'o1', 'pa5', '', esta)).erro, 'Escolha a causa: o que impediu de fazer?')
const nr = await dados.marcarNaoRealizado(carlos, 'o1', 'pa5', 'Clima', esta)
conferir('"não realizado" guarda causa e semana', (({ causa_nao_realizado, semana_nao_realizado }) => [causa_nao_realizado, semana_nao_realizado])(nr.data.atividades.find((x) => x.id === 'pa5')), ['Clima', esta])
conferir('grupo não entra no quadro', (await dados.moverNaSemana(wlisses, 'o1', 'pa3', 'Concluído')).erro !== null, true)
conferir('coluna inexistente recusada', (await dados.moverNaSemana(wlisses, 'o1', 'pa5', 'Feito')).erro, 'Escolha uma coluna do quadro.')

const comSub = await dados.salvarSubtarefa(carlos, 'o1', 'pa5', '  Reboco da sala 4 ')
const nova = comSub.data.subtarefas.find((s) => s.titulo === 'Reboco da sala 4')
conferir('mestre cria subtarefa, com nome limpo', !!nova, true)
conferir('subtarefa vazia recusada', (await dados.salvarSubtarefa(carlos, 'o1', 'pa5', ' ')).erro, 'Diga o que precisa ser feito.')
const nrSub = await dados.marcarSubtarefa(carlos, 'o1', nova.id, false, 'Material')
conferir('subtarefa não realizada guarda a causa', nrSub.data.subtarefas.find((s) => s.id === nova.id).causa_nao_realizado, 'Material')
const feita = await dados.marcarSubtarefa(carlos, 'o1', nova.id, true)
conferir('marcar feita limpa a causa', (({ feita: f, causa_nao_realizado }) => [f, causa_nao_realizado])(feita.data.subtarefas.find((s) => s.id === nova.id)), [true, null])
conferir('mestre não mexe em obra que não é dele', (await dados.moverNaSemana(carlos, 'o2', 'pb2', 'Concluído')).erro !== null, true)

conferir('"não realizado" com semana que não é segunda é recusado', (await dados.marcarNaoRealizado(wlisses, 'o1', 'pa8', 'Clima', '2026-11-25')).erro, 'Semana inválida. Recarregue a página.')
await dados.arquivarAtividade(wlisses, 'o1', 'pa8', true)
conferir('subtarefa de atividade arquivada não é marcada', (await dados.marcarSubtarefa(wlisses, 'o1', 'st7', true)).erro, 'Esta subtarefa não existe mais. Recarregue a página.')
await dados.arquivarAtividade(wlisses, 'o1', 'pa8', false)

console.log(`semana: ${passou}/${total}`)
process.exit(passou === total ? 0 : 1)
