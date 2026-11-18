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
  Data com hora no mock usa `momentoLocal()` (sem fuso). **Na virada para o banco**,
  coluna `timestamptz` (ex.: `planilhas_obra.importada_em`) recebe o momento com fuso
  (ou `now()` no banco), e a tela converte para o horário local ao mostrar; texto sem
  fuso lá seria lido como UTC e erraria 3 horas.
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

## Checklist de testes vivo

O engenheiro (dono do Minha Obra) não programa: decide o produto e testa na tela. O agente
constrói. Para ele saber **o que testar** e o agente saber **o que deu errado**, existe uma
página de testes viva, que o agente mantém e o engenheiro marca.

### 1. A página

Na primeira melhoria que precisar de teste, crie uma página publicada (Artifact) chamada
**"Testes do Minha Obra"**, com banco de dados próprio (as marcas ficam no servidor, não no
navegador). Se não houver ferramenta de página publicada na conversa, crie `testes.html` na
pasta do projeto, guardando as marcas no navegador, e avise que nesse caso o engenheiro
precisa colar o resultado de volta. Página criada em 18/11/2026:
https://claude.ai/artifact/Rysg1gjDMhBWgJZMCvgWHG (fonte em `docs/testes.html`; a rodada fica no
documento `rodada/atual` e cada item na coleção `itens` do banco da página).

A página tem:

- **No topo, a rodada:** nome ("Rodada 2 · Cadastros no banco · 21/10"), nota curta do que
  mudou e o que fazer antes de começar (ex.: "aperte Ctrl+F5").
- **Um cartão por item**, agrupado por módulo, com:
  - **título**: o que se testa, em uma linha;
  - **passos**: numerados, uma ação por passo, com os nomes exatos da tela
    ("Clique em **+ Empresa**", e não "crie uma empresa");
  - **esperado**: o que deve aparecer se deu certo, para responder sim ou não sem interpretar;
  - **três botões**: `A testar` · `Funcionou` · `Problema`;
  - **um campo de observação**.
- Sem enfeite: é ferramenta. Funciona no celular.

### 2. O ciclo

1. O agente constrói a melhoria.
2. **Antes de passar**, confere o que dá sozinho: `npm run check`, a tela no navegador
   (celular e computador) e, quando mexer no banco, o teste de permissões.
   **Só passa o que passou.** O que não conseguiu conferir (ex.: exige a senha dele), diz qual.
3. Escreve os itens na página e manda o link com um resumo de uma linha por item.
4. O engenheiro testa e marca, escrevendo o que viu nos que deram problema.
5. Ele avisa ("atualizei os testes"). O agente lê as marcas direto da página; ele não copia
   nada para o chat.
6. **Para cada problema**, descobrir a causa antes de mexer (código, registros do servidor,
   banco). Explicar em uma linha o que acontecia e o que mudou.
7. **Limpar a página:** o que passou **sai**; o que deu problema volta como `A testar`, com
   passos ajustados; o que é novo entra. Atualizar a nota da rodada.
8. Repetir até não sobrar nada. A rodada fecha e a página diz "nada a testar agora".

**Nada morto fica guardado.** A página mostra só o que falta testar. Histórico, se houver:
uma linha por item aprovado em `docs/DIARIO.md` (data, o que mudou, o que passou), nunca na página.

### 3. Como escrever um bom item

- **Um comportamento por item.** "Cadastrar e editar" são dois, se podem falhar separados.
- **Passos que qualquer pessoa repete**, sem saber programar, na ordem da tela.
- **Esperado observável:** "a empresa aparece na lista com o telefone novo", não "salva corretamente".
- **Testar o caminho errado também:** campo vazio, e-mail inválido, botão clicado duas vezes,
  o que não deveria ser permitido.
- **Dizer qual conta usar** quando importar (Engenheiro, Auxiliar, Mestre, Pendente).
- **Dizer se o teste grava dado de verdade**, e como desfazer depois.

### 4. Quando o banco entra: itens que nunca faltam

Para cada tela que passa a gravar, incluir itens que provem:

| Prova | O item pergunta | Por que |
|---|---|---|
| **Ficou gravado** | Depois de salvar, **aperte F5**: continua lá? | O mock guardava na memória; o banco pode não ter gravado e a tela fingir que sim |
| **Gravou certo** | O que voltou do F5 é exatamente o digitado (acento, data, número, ordem)? | Tradução tela↔banco perde campo sem avisar |
| **Cada um vê o seu** | Com outro perfil (e de outra obra), vejo só o que devo? | A RLS é a única tranca de verdade; esconder botão não protege |
| **Quem não pode, não consegue, e é avisado** | O perfil sem permissão tenta gravar: o banco recusa **e a tela diz por quê**? | Recusa calada parece bug |
| **Nada duplica** | Salvar duas vezes, importar de novo, tirar e pôr de volta: repete? | Clique duplo e reimportação são as duplicatas mais comuns |
| **Apagar não some com histórico** | Desativar algo que outra tela usa: a outra continua funcionando? | Registro lido em outro lugar se desativa, não se apaga |
| **Lista vazia e lista grande** | Sem dados, a tela diz o que fazer? Com muitos, aparece tudo? | O Supabase corta em 1.000 linhas sem avisar |
| **Erro de rede** | Se a internet cair no meio, a tela diz que não salvou? | Gravação perdida sem aviso é o pior defeito |

Do lado do agente, antes de passar qualquer item de banco:

- **Toda mudança no banco é migration versionada** no projeto, nunca clique no painel.
- **Teste de permissões automático:** cada perfil tenta ler e gravar no que é seu e no do
  vizinho (outra obra), dentro de transação desfeita no fim. Roda após qualquer mudança de permissão.
- **Revisão de código** (`/code-review`) em toda mudança na camada de dados, RLS ou login, antes de subir.
- **Avisos de segurança do painel do Supabase** conferidos após cada mudança, cada um explicado
  (intencional ou a corrigir).

### 5. O que o agente nunca faz

- Digitar senha, chave ou token, nem criar conta em nome do engenheiro. O passo diz
  "entre com a sua conta" e ele faz.
- Pôr segredo (chave, senha, `.env.local`) no código, no Git ou na página de testes.
- Usar dado real de cliente/obra como exemplo. Exemplo é sempre fictício.
- Dizer que algo está pronto sem `npm run check` e sem olhar a tela; se não olhou, dizer.
- Apagar dado de verdade para "limpar o teste". Desativar sim; apagar só com o ok dele.

### 6. Como responder depois de cada rodada

Resposta curta, em português simples, sem jargão:

- o que passou e saiu da página;
- tabela de cada problema: **o que estava acontecendo** · **o que mudou**;
- o que voltou para teste e o que é novo;
- o que não deu para conferir e por quê;
- o que espera decisão dele — uma pergunta por vez, com recomendação.
