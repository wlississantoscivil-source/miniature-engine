# Minha Obra

Gestão de obras públicas para um engenheiro com várias obras ao mesmo tempo: compras, notas fiscais, pagamentos e fechamento quinzenal por fornecedor, presença e diárias, cada obra com seus dados separados.
React + Vite, sem biblioteca de componentes; Supabase entra depois (hoje os dados são de exemplo). Perfis: Engenheiro e Auxiliar → `src/pages/AppEscritorio.jsx`; Mestre → `src/pages/AppMestre.jsx`; Pendente → `src/pages/Aguardando.jsx`.
Fonte das decisões: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md` e `PRD-BACKEND.md`. Visual: layout e fontes do `preview.html`, café no menu e no texto, fundo cinza de concreto (`--fundo`), e a cor principal do plano, o laranja `#E8622A` (escolha do engenheiro, 17/11/2026). Laranja puro só em barras, bordas e marcas: texto branco vai sobre `--principal-esc` (#C2501E) e texto laranja sobre fundo claro usa `--principal-tx` (#B54A1B). O `#E8622A` não dá o contraste mínimo de 4,5:1 para texto.
**Regra visual (17/11/2026):** cor só onde há algo a fazer (vermelho atraso, âmbar atenção; o que está em dia fica neutro) e laranja só para ação e "onde você está". Rótulos em letra normal, nunca em maiúsculas; IBM Plex Mono só nos números (classe `.num` ou as já listadas no `index.css`), com algarismos alinhados.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação.
  Sem React, sem banco, sem `window`. Roda no Node sem bundler (import com
  `.js` explícito). É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca.
  A tela **pede a decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta dos dados.** Nenhuma tela lê o mock ou o
  Supabase direto. Hoje lê de `mockData.js` (`USAR_MOCK = true`); na virada para
  o banco só o miolo deste arquivo muda.
- `src/lib/regras.js` — vocabulário (status, categorias, formas), quinzenas,
  permissões, diárias, gastos, mensagens de WhatsApp.
- `src/lib/planilha.js` — leitor da planilha da licitação (recebe as linhas já
  tiradas do .xlsx; não importa o SheetJS). `src/lib/orcamento.js` — Orçado x
  Realizado por etapa e Fluxo de caixa mês a mês.
- `src/lib/supabase.js` — a conexão (ainda não usada).

Três consequências práticas:

1. **`if` de negócio dentro de tela vai para `lib`**, mesmo com três linhas —
   se a linha decide *o que é verdade*, e não *o que aparece*.
2. **Constante compartilhada tem um dono só** (`regras.js`). Os textos de status,
   categoria, clima, situação e forma são **idênticos** aos CHECK do banco, com
   acento e maiúscula. Divergiu, o salvamento falha calado.
3. **Arquivo grande não é problema; arquivo confuso é.** Quebre quando o arquivo
   passar a ter *dois motivos para mudar*.

**Mais de uma obra:** toda tabela que pertence a uma obra tem `obra_id`, e
`membros_obra` diz quem acessa qual obra e com quais liberações (Financeiro,
Presença e Diário, Medição). Exceção: `fornecedores` é global.

**O mestre nunca recebe R$.** A permissão é conferida em `dados.js` (e, com o
banco, na RLS), não só escondida na tela. `tests/mestre-sem-valores.mjs` cobra
isso; não afrouxe o teste para uma tela passar.

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base herdada aqui.
Aviso novo é seu e é de agora; conserte no mesmo lote.
No Windows, se o `npm` reclamar de `npm.ps1`, use `npm.cmd`. Nunca mexa na
política de execução do Windows.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina:
abra no navegador, no celular (barra inferior) e no computador (menu lateral).

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.
Build e lint não pegam regra errada.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/regras.js`, `src/lib/planilha.js`, `src/lib/orcamento.js`
(permissões e contas), políticas RLS, migrations ou fluxo de dinheiro (compras,
NF, pagamentos, fechamento, diárias, orçado, fluxo de caixa) → rodar a revisão de código (`/code-review`
no Claude Code, `/review` no Codex) antes de subir. É por caminho, não por
julgamento: nesses arquivos o erro não aparece na tela.

## Deploy

Ainda não ligado. O padrão será: a pessoa diz "sobe pro GitHub", o agente sobe
com git, e a Vercel publica sozinha. A pessoa não digita comando.

## Armadilhas desta base

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito
  na migration, só para `authenticated` (e `service_role`). Erro "permission denied
  for table (42501)" é GRANT faltando, não RLS. Nunca `grant all`, nunca `to anon`.
- **Datas são texto `AAAA-MM-DD` no fuso local** (`regras.js`). Nunca
  `toISOString().split('T')[0]`: vira UTC e pula um dia à noite no Brasil.
- **Valor de diária mora em `diarias_funcionarios`, separado de `funcionarios`**,
  de propósito: o mestre lê funcionários sem enxergar valor. Não junte as tabelas.
- **As presenças do mock são geradas em relação a hoje** (`mockData.js`); as
  compras têm data fixa (out–nov/2026). A quinzena atual pode aparecer vazia.

- **Planilha da licitação: fiel ao arquivo.** A etapa vale pelo **número**, nunca
  pelo nome (a planilha real de Aporá repete "FUNDAÇÕES" em 3 e 23); mostre sempre
  `rotuloEtapa()` ("3 – FUNDAÇÕES"). Não renomeie etapas, não pule itens com
  quantidade 0, não normalize unidades. O custo sem BDI vem da coluna "Valor Unit"
  da planilha; dividir pelo BDI é só reserva, porque o BDI varia item a item por
  arredondamento. A conferência do total soma a coluna Total (já arredondada por
  linha), não quantidade × preço.
- **A planilha real de Aporá fica fora do projeto** (Área de Trabalho do
  engenheiro): é proposta real, com endereço. Não copie para o repositório, para
  o mock nem para os testes; `tests/planilha.mjs` usa uma planilha inventada no
  mesmo formato.

## Biblioteca de Excel (decisão de 17/11/2026)

A única dependência além de React e Supabase é o **SheetJS (`xlsx`)**, aprovada
pelo engenheiro para ler a planilha da licitação. Ela vem do **endereço oficial
`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`**, e não do npm: o pacote
`xlsx` do npm está parado na 0.18.5, com falhas de segurança conhecidas. Para
atualizar, troque a versão nesse endereço (veja cdn.sheetjs.com); **nunca**
`npm install xlsx` sem o endereço. Ela é carregada só na tela da planilha
(`import('xlsx')` em `src/screens/obra-planilha.jsx`), num pedaço separado do
build, para o resto do app não ficar mais pesado. Não importe `xlsx` em outro
arquivo de forma estática.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em
  `lib/dados.js` → os chamadores nas telas → a query. Função exposta que nenhuma
  tela chama é lixo.
- **Zero avisos novos de lint.**
- **Código comentado não é backup, o git é.** Comentário explica *por quê*.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto inteiro.
- **Estado que nunca muda ou nunca é lido é lixo.**
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna
  órfã continua existindo até decisão de quem é dono. Na dúvida, pergunte.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, o porquê de uma decisão,
convenção que difere do padrão, proibição, comando não óbvio. Nada de árvore de
pastas, lista de dependências ou histórico do que foi feito.
