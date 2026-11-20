// Planejamento: código automático da EAP, dias úteis, validação, permissões e
// troca de obra (cada obra vê só a sua EAP).
import * as dados from '../src/lib/dados.js'
import { diasUteis, ehDiaUtil, erroDesarquivar, erroProgresso, FERIADOS_NACIONAIS, tomReal, escalaCronograma, proximoDiaUtil, errosAtividade, montarEap, paisPossiveis, progressoPrevisto, resumoPrazo, situacaoPrazo, statusPeloProgresso, trocarOrdem } from '../src/lib/planejamento.js'

let passou = 0
let total = 0
function conferir(nome, veio, esperado) {
  total++
  if (JSON.stringify(veio) === JSON.stringify(esperado)) passou++
  else console.log(`  ✗ ${nome}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(veio)}`)
}

// ─── Dias úteis ─────────────────────────────────────────────────────────────
conferir('sábado não é dia útil', ehDiaUtil('2026-11-21'), false)
conferir('20/11 (Consciência Negra) não é dia útil', ehDiaUtil('2026-11-20'), false)
conferir('segunda 23/11 é dia útil', ehDiaUtil('2026-11-23'), true)
conferir('semana de 16 a 22/11 tem 4 dias úteis (feriado na sexta)', diasUteis('2026-11-16', '2026-11-22'), 4)
conferir('próximo dia útil depois do feriado de sexta 20/11 é segunda 23/11', proximoDiaUtil('2026-11-20'), '2026-11-23')
conferir('dia útil fica como está', proximoDiaUtil('2026-11-23'), '2026-11-23')
conferir('fim antes do início = 0', diasUteis('2026-11-20', '2026-11-10'), 0)
conferir('sábado trabalhado conta', diasUteis('2026-11-21', '2026-11-21', { dias: ['Sábado'], feriados: [] }), 1)

// ─── Código automático e contas do pai ──────────────────────────────────────
const a = (id, pai_id, ordem, extra = {}) => ({ id, pai_id, ordem, titulo: id, inicio: '2026-11-23', fim: '2026-11-27', progresso: 0, arquivada: false, ...extra })
const base = [
  a('B', null, 2),
  a('A', null, 1),
  a('A2', 'A', 2, { inicio: '2026-12-01', fim: '2026-12-04', progresso: 0 }),
  a('A1', 'A', 1, { inicio: '2026-11-23', fim: '2026-11-27', progresso: 100 }),
  a('A11', 'A1', 1, { progresso: 50 }),
]
const eap = montarEap(base)
conferir('códigos na ordem de leitura', eap.map((l) => `${l.codigo} ${l.id}`), ['1 A', '1.1 A1', '1.1.1 A11', '1.2 A2', '2 B'])
conferir('níveis', eap.map((l) => l.nivel), [1, 2, 3, 2, 1])
const A = eap.find((l) => l.id === 'A')
conferir('pai começa no 1º início e termina no último fim', [A.inicio, A.fim], ['2026-11-23', '2026-12-04'])
// A1 tem um filho com 50% → A1 = 50%; A = (50×5 + 0×4) / 9 = 28%
conferir('progresso do pai pesado por dias úteis', [eap.find((l) => l.id === 'A1').progresso, A.progresso], [50, 28])

const comArquivada = base.map((x) => (x.id === 'A1' ? { ...x, arquivada: true } : x))
conferir('arquivada some e o código dos irmãos fecha o buraco', montarEap(comArquivada).map((l) => `${l.codigo} ${l.id}`), ['1 A', '1.1 A2', '2 B'])
conferir('filho de arquivada também sai', montarEap(comArquivada, { comArquivadas: true }).filter((l) => l.arquivada).map((l) => l.id), ['A1', 'A11'])

// ─── Onde cada atividade pode ficar ─────────────────────────────────────────
conferir('não fica dentro dela mesma nem de um filho', paisPossiveis(base, 'A').map((l) => l.id), [])
conferir('nível 3 não recebe filho', paisPossiveis(base).some((l) => l.id === 'A11'), false)
conferir('B (sem filhos) pode ir para dentro de A1', paisPossiveis(base, 'B').some((l) => l.id === 'A1'), true)

// ─── Validação do formulário ────────────────────────────────────────────────
conferir('sem nome e sem datas', Object.keys(errosAtividade({ titulo: ' ', inicio: '', fim: '' }, base)), ['titulo', 'inicio', 'fim'])
conferir('fim antes do início', errosAtividade({ titulo: 'X', inicio: '2026-11-27', fim: '2026-11-23' }, base).fim, 'O fim não pode ser antes do início.')
conferir('só fim de semana', errosAtividade({ titulo: 'X', inicio: '2026-11-21', fim: '2026-11-22' }, base).fim, 'O período não tem nenhum dia útil.')
conferir('pai com filhos não cobra datas', errosAtividade({ titulo: 'A', inicio: '', fim: '' }, base, { id: 'A', temFilhos: true }), {})
conferir('não aceita nível 4', !!errosAtividade({ titulo: 'X', inicio: '2026-11-23', fim: '2026-11-27', pai_id: 'A11' }, base).pai_id, true)

// ─── Subir e descer ─────────────────────────────────────────────────────────
conferir('descer A troca com B', trocarOrdem(base, 'A', 1), [{ id: 'A', ordem: 2 }, { id: 'B', ordem: 1 }])
conferir('subir o primeiro não faz nada', trocarOrdem(base, 'A', -1), [])

// ─── Longo prazo ────────────────────────────────────────────────────────────
// 23 a 27/11 = 5 dias úteis. Na quarta 25, já passaram 2 (seg e ter) → 40%.
const sem = { inicio: '2026-11-23', fim: '2026-11-27', progresso: 40 }
conferir('previsto antes de começar = 0', progressoPrevisto(sem, '2026-11-23'), 0)
conferir('previsto na quarta = 40%', progressoPrevisto(sem, '2026-11-25'), 40)
conferir('previsto depois do fim = 100', progressoPrevisto(sem, '2026-11-28'), 100)
conferir('40% na quarta = em dia', situacaoPrazo(sem, '2026-11-25').texto, 'Em dia')
conferir('20% na sexta = abaixo do previsto', situacaoPrazo({ ...sem, progresso: 20 }, '2026-11-27').tom, 'at')
conferir('passou do fim sem terminar = atrasada', situacaoPrazo(sem, '2026-11-30').tom, 'cr')
conferir('100% nunca é atrasada', situacaoPrazo({ ...sem, progresso: 100 }, '2026-12-30').texto, 'Concluída')
const esc = escalaCronograma([{ inicio: '2026-11-25', fim: '2026-12-02', arquivada: false }], 'semana')
conferir('semanas começam na segunda', esc.colunas.map((c) => c.inicio), ['2026-11-23', '2026-11-30'])
conferir('a 1ª segunda fica na borda esquerda', esc.pos('2026-11-23'), 0)
conferir('meses', escalaCronograma([{ inicio: '2026-11-25', fim: '2027-01-02', arquivada: false }], 'mes').colunas.map((c) => c.rotulo), ['nov/2026', 'dez/2026', 'jan/2027'])
conferir('progresso: letra e vírgula recusadas', [erroProgresso('5,5'), erroProgresso('abc'), erroProgresso('101'), erroProgresso('')].map((x) => !!x), [true, true, true, true])
conferir('progresso: 0 e 100 aceitos', [erroProgresso('0'), erroProgresso(100)], [null, null])
conferir('status acompanha o progresso', [statusPeloProgresso('A fazer', 30), statusPeloProgresso('Em andamento', 100), statusPeloProgresso('Concluído', 0), statusPeloProgresso('A fazer', 0)], ['Em andamento', 'Concluído', 'Em andamento', 'A fazer'])
const rp = resumoPrazo(montarEap([{ id: 'G', pai_id: null, ordem: 1, inicio: '2026-11-23', fim: '2026-11-27', progresso: 0 }, { id: 'F', pai_id: 'G', ordem: 1, inicio: '2026-11-23', fim: '2026-11-27', progresso: 20 }]), '2026-11-30')
conferir('resumo: previsto, real e atrasadas (só atividades, não grupos)', rp, { previsto: 100, real: 20, atrasadas: 1, abaixo: 0 })

// ─── Achados da revisão (20/11) ─────────────────────────────────────────────
const comPaiArquivado = base.map((x) => (x.id === 'A' ? { ...x, arquivada: true } : x))
conferir('filho de grupo arquivado não desarquiva sozinho', !!erroDesarquivar(comPaiArquivado, 'A1'), true)
conferir('grupo arquivado pode voltar', erroDesarquivar(comPaiArquivado, 'A'), null)
conferir('KPI Real: âmbar só passando da folga de 10 pontos', [tomReal({ previsto: 50, real: 40 }), tomReal({ previsto: 50, real: 39 })], ['', 'at'])
// A lista de feriados é fixa: este teste quebra no ano em que ela precisar de mais um ano.
conferir('feriados cobrem o ano que vem', FERIADOS_NACIONAIS.some((f) => f.startsWith(String(new Date().getFullYear() + 1))), true)

// ─── Camada de dados: troca de obra e permissões ────────────────────────────
const perfis = (await dados.listarPerfisDeExemplo()).data
const wlisses = perfis.find((p) => p.nome === 'Wlisses')
const carlos = perfis.find((p) => p.nome === 'Carlos')

const escola = (await dados.listarPlanejamento(wlisses, 'o1')).data
const ubs = (await dados.listarPlanejamento(wlisses, 'o2')).data
conferir('Escola Vila Nova tem 13 linhas na EAP (5 grupos, 8 atividades)', escola.atividades.length, 13)
conferir('UBS Centro tem 3', ubs.atividades.length, 3)
conferir('nada da escola aparece na UBS', ubs.atividades.some((x) => x.obra_id !== 'o2'), false)
conferir('engenheiro edita a EAP', escola.podeEditarEap, true)

const doCarlos = await dados.listarPlanejamento(carlos, 'o1')
conferir('mestre lê o planejamento da obra dele', doCarlos.erro, null)
conferir('mestre não edita a EAP', doCarlos.data.podeEditarEap, false)
conferir('mestre não grava na EAP', (await dados.salvarAtividade(carlos, 'o1', { titulo: 'X', inicio: '2026-11-23', fim: '2026-11-27' })).erro !== null, true)
conferir('mestre não lê obra que não é dele', (await dados.listarPlanejamento(carlos, 'o2')).erro !== null, true)

const criou = await dados.salvarAtividade(wlisses, 'o2', { titulo: '  Forro  ', inicio: '2026-11-23', fim: '2026-11-27', pai_id: 'pb1' })
const forro = criou.data.atividades.find((x) => x.titulo === 'Forro')
conferir('nova subatividade entra no fim do pai, com nome limpo', [forro?.pai_id, montarEap(criou.data.atividades).find((l) => l.id === forro?.id)?.codigo], ['pb1', '1.3'])
conferir('não grava sem nome', (await dados.salvarAtividade(wlisses, 'o2', { titulo: '', inicio: '2026-11-23', fim: '2026-11-27' })).erro, 'Diga o nome da atividade.')
const arq = await dados.arquivarAtividade(wlisses, 'o2', forro.id, true)
conferir('arquivar tira da EAP sem apagar', [montarEap(arq.data.atividades).some((l) => l.id === forro.id), arq.data.atividades.some((x) => x.id === forro.id)], [false, true])

const prog = await dados.salvarProgresso(wlisses, 'o1', 'pa11', '50')
conferir('salvar progresso muda o status junto', (({ progresso, status }) => ({ progresso, status }))(prog.data.atividades.find((x) => x.id === 'pa11')), { progresso: 50, status: 'Em andamento' })
conferir('grupo não recebe progresso digitado', (await dados.salvarProgresso(wlisses, 'o1', 'pa9', '50')).erro, 'O progresso de um grupo vem das atividades dentro dele.')
conferir('mestre não muda progresso no cronograma', (await dados.salvarProgresso(carlos, 'o1', 'pa11', '60')).erro !== null, true)

conferir('dados: desarquivar filho de grupo arquivado é recusado', await (async () => {
  await dados.arquivarAtividade(wlisses, 'o1', 'pa12', true)
  const r = await dados.arquivarAtividade(wlisses, 'o1', 'pa13', false)
  await dados.arquivarAtividade(wlisses, 'o1', 'pa12', false)
  return !!r.erro
})(), true)

console.log(`planejamento: ${passou}/${total}`)
process.exit(passou === total ? 0 : 1)
