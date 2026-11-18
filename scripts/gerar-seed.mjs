// Gera supabase-seed.sql a partir de src/lib/mockData.js (os mesmos dados de exemplo).
// Rodar: node scripts/gerar-seed.mjs   → reescreve supabase-seed.sql na raiz.
//
// Os ids do mock ('o1', 'u-wlisses'…) viram uuids FIXOS, calculados no próprio banco
// (função u), para o seed poder ser rodado de novo sem duplicar: toda linha usa
// "on conflict do nothing". As presenças do mock são geradas em relação a HOJE: o
// arquivo fica com as datas do dia em que foi gerado.
import { writeFileSync } from 'node:fs'
import * as mock from '../src/lib/mockData.js'
import { calcularDiarias, hoje, soma } from '../src/lib/regras.js'

const COLUNAS_ID = /(^id$|_id$|^criado_por$|^atualizado_por$|^fechado_por$|^importada_por$)/
const MOMENTO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const txt = (v) => `'${String(v).replace(/'/g, "''")}'`

function valor(col, v) {
  if (v === null || v === undefined) return 'null'
  if (COLUNAS_ID.test(col)) return `pg_temp.u(${txt(v)})`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (MOMENTO.test(v)) return txt(`${v}-03:00`) // horário de Brasília
  return txt(v)
}

const WLISSES = 'u-wlisses'
const comAutor = (lista) => lista.map((x) => ({ ...x, criado_por: x.criado_por || WLISSES }))

// Total das diárias pagas, congelado no momento do pagamento (como dados.js faz no mock).
const pagamentosDiarias = mock.pagamentos_diarias.map((pd) => {
  const linhas = calcularDiarias({
    funcionarios: mock.funcionarios.filter((f) => f.obra_id === pd.obra_id),
    presencas: mock.presencas, diarias: mock.diarias_funcionarios,
    periodo: { inicio: pd.quinzena_inicio, fim: pd.quinzena_fim },
  })
  return { ...pd, valor_total: pd.valor_total ?? soma(linhas, 'a_pagar') }
})

// Ordem: quem é apontado entra antes de quem aponta.
const TABELAS = [
  ['profiles', mock.profiles],
  ['obras', comAutor(mock.obras)],
  ['membros_obra', mock.membros_obra],
  ['fornecedores', comAutor(mock.fornecedores)],
  ['planilhas_obra', mock.planilhas_obra],
  ['etapas_obra', mock.etapas_obra],
  ['itens_contrato', mock.itens_contrato],
  ['fechamentos', mock.fechamentos],
  ['pagamentos', mock.pagamentos],
  ['notas_fiscais', mock.notas_fiscais],
  ['compras', mock.compras],
  ['itens_lista_compra', mock.itens_lista_compra],
  ['funcionarios', mock.funcionarios],
  ['diarias_funcionarios', comAutor(mock.diarias_funcionarios)],
  ['pagamentos_diarias', pagamentosDiarias],
]

let sql = `-- Carga inicial do Minha Obra: os dados de exemplo de src/lib/mockData.js.
-- Gerado por scripts/gerar-seed.mjs em ${hoje().split('-').reverse().join('/')}. Não edite à mão: rode o script.
-- Pode rodar de novo sem duplicar (on conflict do nothing). Não apaga nada.
begin;

-- id fixo a partir do id do mock ('o1' → sempre o mesmo uuid)
create function pg_temp.u(t text) returns uuid language sql immutable as $$
  select (substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-4' || substr(h, 14, 3) || '-a' || substr(h, 18, 3) || '-' || substr(h, 21, 12))::uuid
  from md5('minha-obra:' || t) h
$$;
`
for (const [tabela, linhas] of TABELAS) {
  if (!linhas.length) continue
  const cols = [...new Set(linhas.flatMap(Object.keys))]
  sql += `\n-- ${tabela} (${linhas.length})\ninsert into public.${tabela} (${cols.join(', ')}) values\n`
  sql += linhas.map((l) => `  (${cols.map((c) => valor(c, l[c])).join(', ')})`).join(',\n')
  sql += '\non conflict do nothing;\n'
}

// Presenças em forma curta: uma linha por dia e obra, com uma letra por funcionário
// (P Presente, F Falta, A Atestado, G Folga, - sem lançamento), na ordem da lista
// de funcionários da obra. O id é 'pr-<funcionário>-<dia>', como no mock.
const LETRA = { Presente: 'P', Falta: 'F', Atestado: 'A', Folga: 'G' }
const obrasComEquipe = [...new Set(mock.funcionarios.map((f) => f.obra_id))]
const equipe = Object.fromEntries(obrasComEquipe.map((o) => [o, mock.funcionarios.filter((f) => f.obra_id === o).map((f) => f.id)]))
const dias = new Map() // 'dia|obra' → { autor, hora, letras }
for (const p of mock.presencas) {
  const chave = `${p.data}|${p.obra_id}`
  if (!dias.has(chave)) dias.set(chave, { autor: p.criado_por, hora: p.created_at.slice(11, 16), letras: equipe[p.obra_id].map(() => '-') })
  dias.get(chave).letras[equipe[p.obra_id].indexOf(p.funcionario_id)] = LETRA[p.situacao]
}
sql += `\n-- presencas (${mock.presencas.length})
insert into public.presencas (id, obra_id, funcionario_id, data, situacao, criado_por, created_at)
select pg_temp.u('pr-' || eq.fs[i] || '-' || v.d), pg_temp.u(v.o), pg_temp.u(eq.fs[i]), v.d::date,
       case substr(v.s, i, 1) when 'P' then 'Presente' when 'F' then 'Falta' when 'A' then 'Atestado' else 'Folga' end,
       pg_temp.u(v.c), (v.d || 'T' || v.h || ':00-03:00')::timestamptz
from (values
${[...dias].map(([k, x]) => { const [d, o] = k.split('|'); return `  ('${d}','${o}','${x.autor}','${x.hora}','${x.letras.join('')}')` }).join(',\n')}
) v(d, o, c, h, s)
join (values
${obrasComEquipe.map((o) => `  ('${o}', array[${equipe[o].map((f) => `'${f}'`).join(',')}])`).join(',\n')}
) eq(o, fs) on eq.o = v.o
cross join lateral generate_series(1, length(v.s)) i
where substr(v.s, i, 1) <> '-'
on conflict do nothing;
`
sql += '\ncommit;\n'

writeFileSync(new URL('../supabase-seed.sql', import.meta.url), sql)
const total = TABELAS.reduce((t, [, l]) => t + l.length, 0) + mock.presencas.length
console.log(`supabase-seed.sql: ${total} linhas em ${TABELAS.length + 1} tabelas`)
