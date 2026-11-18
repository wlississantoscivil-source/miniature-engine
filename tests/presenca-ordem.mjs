// A lista de presença vem em ordem alfabética (decisão do engenheiro, 18/11/2026).
// Com o banco, a ordem natural é a do id (aleatória); sem este teste, ninguém nota.
import * as dados from '../src/lib/dados.js'

const perfis = (await dados.listarPerfisDeExemplo()).data
const carlos = perfis.find((p) => p.nome === 'Carlos')
const lista = (await dados.presencaDoDia(carlos, 'o1', '2026-11-03')).data.funcionarios.map((f) => f.nome)
const ordenada = [...lista].sort((a, b) => a.localeCompare(b, 'pt-BR'))

const ok = lista.length > 1 && JSON.stringify(lista) === JSON.stringify(ordenada)
if (!ok) console.log(`  ✗ lista de presença fora da ordem alfabética\n     veio: ${lista.join(', ')}`)
console.log(`${ok ? 1 : 0}/1 — presença em ordem alfabética`)
process.exit(ok ? 0 : 1)
