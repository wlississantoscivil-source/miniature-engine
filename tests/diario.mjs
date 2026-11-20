// Diário de obra: cada obra vê só o seu, um diário por dia, e a conferência do formulário.
import * as dados from '../src/lib/dados.js'
import { presencas } from '../src/lib/mockData.js'
import { CLIMAS, climaRuim, diarioPendente, errosDiario, hoje, somarDias } from '../src/lib/regras.js'

const CLIMAS_RUINS = () => CLIMAS.filter(climaRuim)

let passou = 0
let total = 0
function conferir(nome, veio, esperado) {
  total++
  if (JSON.stringify(veio) === JSON.stringify(esperado)) passou++
  else console.log(`  ✗ ${nome}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(veio)}`)
}

const perfis = (await dados.listarPerfisDeExemplo()).data
const wlisses = perfis.find((p) => p.nome === 'Wlisses')
const carlos = perfis.find((p) => p.nome === 'Carlos')
const dia = hoje()

// Trocar de obra troca o diário inteiro.
const escola = (await dados.listarDiarios(wlisses, 'o1')).data.diarios
const ubs = (await dados.listarDiarios(wlisses, 'o2')).data.diarios
conferir('Escola Vila Nova tem 6 dias', escola.length, 6)
conferir('UBS Centro tem 1 dia', ubs.length, 1)
conferir('nenhum diário da escola aparece na UBS', ubs.some((d) => d.obra_id !== 'o2'), false)
conferir('mais recente primeiro', escola.map((d) => d.data), [...escola.map((d) => d.data)].sort().reverse())
conferir('efetivo = presentes na presença do dia', escola[0].efetivo,
  presencas.filter((p) => p.obra_id === 'o1' && p.data === escola[0].data && p.situacao === 'Presente').length)
conferir('mestre não lê diário de obra que não é dele', (await dados.listarDiarios(carlos, 'o2')).erro !== null, true)

// Conferência do formulário.
const bom = { data: dia, clima_manha: 'Bom', clima_tarde: 'Chuva', servicos: 'Reboco', ocorrencias: '' }
conferir('diário completo passa', errosDiario(wlisses, bom, []), {})
conferir('serviços em branco avisa', Object.keys(errosDiario(wlisses, { ...bom, servicos: '  ' }, [])), ['servicos'])
conferir('clima fora da lista avisa', Object.keys(errosDiario(wlisses, { ...bom, clima_manha: 'Sol' }, [])), ['clima_manha'])
conferir('dia que não chegou é recusado', Object.keys(errosDiario(wlisses, { ...bom, data: somarDias(dia, 1) }, [])), ['data'])
conferir('mestre não lança 5 dias atrás', Object.keys(errosDiario(carlos, { ...bom, data: somarDias(dia, -5) }, [])), ['data'])
conferir('engenheiro lança 5 dias atrás', errosDiario(wlisses, { ...bom, data: somarDias(dia, -5) }, []), {})

// Pendência do dia: só em obra em andamento e em dia útil.
conferir('sexta sem diário é pendência', diarioPendente('Em andamento', false, '2026-11-20'), true)
conferir('sábado sem diário não é pendência', diarioPendente('Em andamento', false, '2026-11-21'), false)
conferir('obra paralisada não cobra diário', diarioPendente('Paralisada', false, '2026-11-20'), false)
conferir('com diário de hoje não é pendência', diarioPendente('Em andamento', true, '2026-11-20'), false)
conferir('chuva e impraticável chamam atenção', CLIMAS_RUINS(), ['Chuva', 'Impraticável'])

// Gravar: entra na obra certa e não duplica o dia.
const gravou = await dados.salvarDiario(wlisses, 'o2', { ...bom, servicos: '  Reboco  ', ocorrencias: '   ' })
conferir('gravou sem erro', gravou.erro, null)
const ubsDepois = (await dados.listarDiarios(wlisses, 'o2')).data.diarios
conferir('UBS ganhou o dia de hoje no topo', ubsDepois[0].data, dia)
conferir('serviços sem espaço sobrando e ocorrência vazia vira nada', [ubsDepois[0].servicos, ubsDepois[0].ocorrencias], ['Reboco', null])
conferir('foto ainda não é gravada (sem Storage)', ubsDepois[0].fotos.length, 0)
conferir('escola não mudou', (await dados.listarDiarios(wlisses, 'o1')).data.diarios.length, 6)
conferir('segundo diário no mesmo dia é recusado', (await dados.salvarDiario(wlisses, 'o2', bom)).erro !== null, true)

console.log(`${passou}/${total} — diário de obra`)
process.exit(passou === total ? 0 : 1)
