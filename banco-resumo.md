# Resumo do banco — Minha Obra

> A memória do banco para os próximos módulos e para o passo 10 (login e banco).
> Atualizado em 18/11/2026. Detalhe de cada campo: `PRD-BACKEND.md`. O SQL de verdade:
> `supabase/migrations/`. Os dados de exemplo: `supabase-seed.sql`.

## Onde está

- **Projeto Supabase:** `minha-obra` (id `nglhonbcmhnpmqlhixdx`), região São Paulo (`sa-east-1`), plano grátis.
- **O app conversa com ele por** `src/lib/dados.js` (a única porta) usando a chave **publicável**
  (`sb_publishable_…`) que está no `.env.local`. O `.env.local` **não vai para o Git**.
- **Unidade principal: a obra.** Toda tabela que pertence a uma obra tem `obra_id`.
  Exceção: `fornecedores`, que é de todas as obras.

## ⚠ Estado atual: aberto, em modo desenvolvimento

Toda tabela tem a RLS (a tranca por linha) **ligada**, mas com uma regra provisória
chamada `dev_provisorio` que **libera tudo para todo mundo**, inclusive para quem não fez
login. Está na migration `20261118200200_dev_acesso_provisorio.sql`.

Só serve porque o app roda **apenas no computador do engenheiro**, com dados de exemplo.
**Não publicar na Vercel assim.** No passo 10:

1. Ligar `profiles` ao login (`auth.users`) e criar o gatilho de cadastro (perfil nasce `Pendente`).
   Os perfis de exemplo já existem: o gatilho deve **trocar o id do perfil de mesmo email pelo
   id do login** — todas as tabelas acompanham sozinhas (`on update cascade`).
2. Uma migration nova que apaga as regras `dev_provisorio`, tira a liberação de `anon`
   (tabelas e a função `importar_planilha`) e cria as regras de verdade, por obra e por perfil
   (`PRD-BACKEND.md`, "Permissões"). O teste que prova: o mestre não lê nenhuma linha de compras.
3. Preencher `criado_por` / `atualizado_por` pelo login (`auth.uid()`), e não pela tela.

## As tabelas (17)

| Tabela | O que guarda | Exemplo hoje |
|---|---|---|
| `profiles` | As pessoas do app: nome, email, whatsapp, perfil (`Engenheiro`, `Auxiliar`, `Mestre`, `Pendente`) e se está ativa | 5 |
| `obras` | Cada obra: nome, tipo, órgão, contrato, datas, situação. **Sem nenhum R$** (o mestre lê esta tabela) | 5 |
| `membros_obra` | Quem trabalha em qual obra e o que pode: Financeiro, Presença e Diário, Medição. O engenheiro não precisa de linha (vê todas) | 8 |
| `fornecedores` | Cadastro único de fornecedores, usado em todas as obras | 6 |
| `planilhas_obra` | A planilha da licitação de cada obra (uma por obra): % de BDI, totais lidos do arquivo, quando e quem importou | 1 |
| `etapas_obra` | As etapas da planilha ("3 – ALVENARIA"). Valem pelo **número**, nunca pelo nome | 5 |
| `itens_contrato` | Os itens da planilha: código, descrição, unidade, quantidade, preço com BDI, custo sem BDI, total | 8 |
| `medicoes` | Os boletins de medição (fase 3). Já existe porque "reimportar a planilha só sem medição" depende dela | 0 |
| `compras` | Cada compra ou serviço de um fornecedor numa obra: valor, categoria, etapa, situação da NF. A quinzena é calculada pelo banco | 12 |
| `itens_lista_compra` | O que falta comprar em cada obra, antes de virar compra | 6 |
| `fechamentos` | O fechamento quinzenal de um fornecedor numa obra (`Rascunho` ou `Fechado`). Os totais são calculados, não guardados | 3 |
| `notas_fiscais` | As NFs recebidas. O arquivo ainda não sobe (por enquanto só o tipo: imagem ou pdf) | 5 |
| `pagamentos` | Cada pagamento a um fornecedor numa obra (Pix, Boleto, Transferência, Dinheiro) | 4 |
| `funcionarios` | O pessoal do canteiro que entra na lista de presença (não são usuários) | 32 |
| `presencas` | Presença de cada funcionário em cada dia (`Presente`, `Falta`, `Atestado`, `Folga`). Uma por funcionário por dia | 745 |
| `diarias_funcionarios` | O valor da diária de cada diarista, com histórico. **Separada de `funcionarios` de propósito**: o mestre lê funcionários sem ver valor | 19 |
| `pagamentos_diarias` | Registro de que as diárias de uma obra numa quinzena foram pagas (total congelado) | 1 |

Ainda **não existem** (fase 2 e 3): `diarios_obra`, `fotos`, `medicao_itens`. Nem os
buckets de arquivo (Storage).

## Regras que o banco já garante

- **Listas fechadas (CHECK):** situação da obra, tipo, categoria, situação da compra, do item
  da lista, do fechamento, forma de pagamento, situação da presença, vínculo, perfil. Os textos
  são **idênticos** aos de `src/lib/regras.js`, com acento e maiúscula — testado: "Em Andamento"
  (com A maiúsculo) é recusado.
- Valor de compra, pagamento e diária maior que zero; BDI entre 0 e 100; etapa de nível 1 a 3.
- Sem duplicata: um email por pessoa, uma presença por funcionário por dia, uma planilha por
  obra, uma etapa por número na obra, um fechamento por obra + fornecedor + quinzena, uma
  diária por funcionário por data de início.
- `updated_at` automático em `planilhas_obra`, `compras`, `itens_lista_compra`, `notas_fiscais`,
  `pagamentos`, `presencas`.
- **Importar planilha** é a função `importar_planilha`: tudo ou nada, recusa se houver medição,
  religa as compras à etapa de mesmo número.

## Regras do PRD que ainda NÃO estão no banco

(A tela ainda não grava nesses lugares; entram quando o módulo começar a gravar.)

- Status da compra mantido pelo banco (ganhou NF → `NF recebida`; NF paga → `Paga`).
- Mestre sempre com Presença e nunca com Financeiro em `membros_obra`.
- Compra de fechamento `Fechado` só o engenheiro edita; etapa da compra tem que ser da mesma obra;
  partes de compra dividida com a mesma NF e a mesma etapa.
- Fechamento quinzenal automático (dia 1º e 16, às 6h).
- Janela de 3 dias do mestre na presença.

## Datas

- Colunas `date` (dia da compra, da presença, da NF…) guardam o dia digitado, sem fuso: o dia
  que se digita é o dia que salva.
- Colunas `timestamptz` (`created_at`, `importada_em`, `fechado_em`…) guardam o momento com fuso.
  `dados.js` converte para o horário de Brasília ao ler.

## O que grava hoje (o resto do app só lê)

| Tela | Função em `dados.js` | Tabela |
|---|---|---|
| Criar conta | `criarConta` | `profiles` (nasce `Pendente`) |
| Presença → Salvar presença | `salvarPresenca` | `presencas` |
| Planilha → Importar | `importarPlanilha` | `planilhas_obra`, `etapas_obra`, `itens_contrato`, `compras` (via `importar_planilha`) |

## Como mexer no banco daqui para a frente

- Toda mudança é **arquivo novo** em `supabase/migrations/`, com data no nome, e vai para o Git.
- Tabela nova leva `alter table … enable row level security` e
  `grant select, insert, update, delete … to authenticated` na própria migration.
- Depois de qualquer migration, atualizar `tests/_schema-snapshot.json` e rodar `npm run check`
  (o `check-schema` compara código × banco; o `check-grants` confere RLS e liberação).
- Dados de exemplo mudaram no `mockData.js`? Rodar `node scripts/gerar-seed.mjs` para refazer o
  `supabase-seed.sql`.
