// A planilha depois de gravada (src/lib/dados.js): o que a tela mostra tem que
// ser o que a planilha diz, não uma conta refeita.
import * as dados from '../src/lib/dados.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const perfis = (await dados.listarPerfisDeExemplo()).data
const wlisses = perfis.find((p) => p.nome === 'Wlisses')

// Dados de exemplo da Escola Vila Nova (PRD-FRONTEND): R$ 1.248.300,00 com BDI.
const antes = (await dados.obterPlanilha(wlisses, 'o1')).data
conferir('exemplo: total com e sem BDI', [antes.resumo.total, antes.resumo.sem_bdi], [1248300, 998640])

// Planilha inventada com total arredondado linha a linha (3 × 0,335 → 1,01).
const leitura = {
  etapas: [{ numero: '1', nome: 'SERVIÇOS', nivel: 1, ordem: 1 }],
  itens: [1, 2].map((k) => ({
    item: `1.${k}`, codigo: `C${k}`, banco: 'Próprio', descricao: `ITEM ${k}`, unidade: 'un',
    quantidade: 3, preco_unitario: 0.335, custo_unitario: 0.27, total: 1.01, etapa_numero: '1', ordem: k + 1,
  })),
  erros: [], avisos: [], info: {}, totaisPlanilha: { geral: 2.02, sem_bdi: 1.62 },
}
const r = await dados.importarPlanilha(wlisses, 'o2', { leitura, bdi_percentual: 24, arquivo_nome: 'teste.xlsx' })
conferir('importação grava sem erro', r.erro, null)
const depois = (await dados.obterPlanilha(wlisses, 'o2')).data
conferir('depois de gravar, o total é o da coluna Total', depois.resumo.total, 2.02)
conferir('a coluna Total de cada item fica gravada', depois.itens.map((i) => i.total), [1.01, 1.01])
conferir('data da importação no formato local', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(depois.planilha.importada_em), true)

console.log(`${ok}/${tot} — planilha gravada`)
process.exit(ok === tot ? 0 : 1)
