# PRD Frontend — Minha Obra

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.

## O que o sistema é

Gestão de obras públicas (escolas, UBS, refeitórios) para um engenheiro com 7 obras ao mesmo tempo: compras, notas fiscais, pagamentos e fechamento quinzenal por fornecedor, presença, diário com fotos e medição, cada obra com seus dados separados. Usado **tanto no celular, no canteiro, quanto no computador, no escritório**. O mestre usa só no celular.

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Cor principal `#E8622A` (laranja), tema claro. Texto escuro sobre fundo claro, bom contraste no sol.
- Celular primeiro: botões grandes (mínimo 44px de altura), pouca digitação, listas em cartões.
- Celular: barra inferior fixa. Computador (a partir de 900px): menu lateral à esquerda.
- Dentro de uma obra: **grade de módulos** (quadrados grandes com ícone de linha e nome; 2 por linha no celular, 4 ou 5 no computador). Cada quadrado mostra a pendência do módulo ("4 aguardando NF", "Presença não lançada", "1 fechamento para revisar"). Só aparecem os módulos liberados para a pessoa. *(Decidido em 17/11/2026, no lugar das abas no topo.)*
- **Caminho clicável** no topo, só no computador: "Início › Obras › <obra> › <módulo>". No celular, botão de voltar.
- **Faixa do módulo:** no topo de cada módulo, sub-abas à esquerda (ex.: Quinzena · Fechamentos; Presença · Diárias da quinzena) e o botão principal à direita (ex.: "+ Lançar compra", "Anexar NF", "Registrar pagamento").
- **Filtros de status com a cor do status:** Em andamento verde, Paralisada âmbar, Concluída cinza, Todas neutro. O escolhido fica preenchido; os outros, só com contorno. Filtro aplica na hora, sem botão "Buscar".
- Menu lateral do computador: nome e perfil da pessoa no alto, acima dos itens.
- Ícones de linha num estilo só; nenhum texto cinza claro (contraste mínimo de 4,5:1, por causa do sol).
- Dinheiro sempre no formato `R$ 1.234,56`. Datas no formato `16/11/2026`.
- PDF: gerado pela impressão do navegador (botão "Imprimir / Salvar PDF"), com uma folha de estilo de impressão limpa (sem menu, com nome da obra, órgão e período no cabeçalho).
- Fotos comprimidas no navegador antes de enviar (máx. 1200px, qualidade 0.8).
- Nenhum valor em R$ é montado na tela do mestre: o mestre não recebe esses dados.

## Perfis

- **Engenheiro:** entra em Obras. Vê tudo, em todas as obras.
- **Mestre:** entra em Presença de hoje. Vê só as obras dele, só presença, diário e fotos. Nunca vê valor.
- **Auxiliar:** entra em Obras (só as obras liberadas). Em cada obra vê apenas os módulos liberados: Financeiro, Presença e Diário, Medição.
- **Pendente:** conta criada e ainda não liberada. Vê só o aviso de espera.

## Mapa de navegação

```
Login · Criar conta · Aguardando liberação
└── Engenheiro / Auxiliar
    Barra: Obras · Compras · Notas · Fornecedores · Mais (Relatórios, Usuários*, Meu perfil, Sair)
    Menu lateral (computador): os mesmos itens, com Relatórios como item próprio
    Obras ↔ Gastos
    Relatórios
    Obra → grade de módulos: Resumo · Orçado x Realizado · Fluxo de caixa · Lista de compras · Fornecedores · Notas · Pagamentos · Presença · Diário · Medição · Equipe
           Dados da obra (botão Editar) → Planilha da licitação
           (auxiliar vê só os módulos liberados; Equipe, Dados da obra e Usuários só engenheiro)
└── Mestre
    Barra: Presença · Diário · Perfil
    Seletor de obra no topo quando tiver mais de uma
```
\* Usuários só aparece para o engenheiro.

**Ordem de construção (fases):** 1) login, liberações, Obras, Gastos, Planilha da licitação, Orçado x Realizado, Fluxo de caixa (saídas), Lista de compras, Fornecedores, Notas, Pagamentos, Fechamento, Equipe, Presença, Diárias · 2) Diário · 3) Medição e entradas do Fluxo de caixa. Módulos de fases ainda não construídas não aparecem.

**Regra dos módulos do auxiliar:** Financeiro libera Resumo, Orçado x Realizado, Fluxo de caixa, Lista de compras, Fornecedores, Notas, Pagamentos e Diárias da quinzena. Presença e Diário libera Presença e Diário. Medição libera Medição.

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Nome "Minha Obra" em laranja, campo de email, campo de senha, botão Entrar, link Criar conta.

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil (Engenheiro/Auxiliar → Obras; Mestre → Presença de hoje; Pendente → Aguardando liberação).
- **Criar conta:** abre a tela Criar conta.

**Estado vazio**
Não se aplica.

---

## Tela: Criar conta

**Quem acessa:** qualquer pessoa sem conta.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | |
| Email | email | sim | |
| WhatsApp | telefone | não | |
| Senha | senha | sim | mínimo 8 caracteres |

**Ações**
- **Criar conta:** cria a conta e mostra a tela Aguardando liberação.

---

## Tela: Aguardando liberação

**Quem acessa:** perfil Pendente.

**O que aparece**
"Conta aguardando liberação do administrador. Avise o engenheiro responsável que você se cadastrou." Botão Sair.

---

## Tela: Obras (início do engenheiro e do auxiliar)

**Quem acessa:** Engenheiro (todas as obras), Auxiliar (só as liberadas).
**Chega aqui por:** item Obras da barra; é a tela inicial.

**O que aparece**
1. Topo: título "Obras", botão **Nova obra** (só engenheiro), alternador **Cartões | Gastos**.
2. Faixa de avisos (só se houver): "3 fechamentos para revisar" · "12 compras aguardando NF". Tocar leva ao lugar certo.
3. Filtro por status: Em andamento (padrão) · Paralisada · Concluída · Todas.
4. Um cartão por obra.

**Campos e informações (cartão)**

| Campo | Tipo | Observação |
|---|---|---|
| Nome da obra | texto | em destaque |
| Tipo | etiqueta | Escola / UBS / Refeitório / Outro |
| Órgão contratante | texto | ex.: Prefeitura de Caruaru |
| Status | etiqueta colorida | Em andamento (verde), Paralisada (amarelo), Concluída (cinza) |
| Compras aguardando NF | número | só com Financeiro; em vermelho se alguma passou de 7 dias |
| A pagar em aberto | R$ | só com Financeiro |
| Presença de hoje | etiqueta | "Lançada" (verde) / "Não lançada" (vermelho depois das 10h, cinza antes) |

**Ordem:** primeiro as obras com pendência (presença não lançada, NF atrasada, fechamento para revisar); depois por nome.

**Ações**
- **Tocar no cartão:** abre a obra na aba Resumo (ou na primeira aba liberada para o auxiliar).
- **Nova obra:** abre o formulário de obra (ver Tela: Formulário de obra).
- **Gastos:** troca para a visão Gastos.

**Regras por perfil**
- **Auxiliar sem Financeiro naquela obra:** o cartão não mostra NF nem valores.

**Estado vazio**
"Nenhuma obra cadastrada. Toque em Nova obra para começar." (Auxiliar: "Você ainda não foi liberado em nenhuma obra.")

---

## Tela: Gastos

**Quem acessa:** Engenheiro; Auxiliar só vê as obras em que tem Financeiro.
**Chega aqui por:** alternador Cartões | Gastos na tela Obras.

**O que aparece**
1. Período: Este mês · Últimos 3 meses · Este ano · Desde o início (padrão) · personalizado (de/até).
2. Tabela: uma linha por obra; colunas **Material · Mão de obra (Empreiteiros + Diárias, com as duas partes em letra menor embaixo do total) · Aluguel de equipamento · Serviço · Outros · Total**. Linha final com o total geral.
   - Empreiteiros = compras da categoria Mão de obra.
   - Diárias = dias "Presente" × diária vigente de cada diarista, no período (pago ou não).
3. No celular, a tabela vira cartões por obra com as cinco categorias empilhadas.

**Ações**
- **Tocar numa célula:** abre a lista das compras daquela obra e categoria no período.
- **Exportar CSV:** baixa a tabela.

**Estado vazio**
"Nenhuma compra lançada no período."

---

## Tela: Formulário de obra

**Quem acessa:** Engenheiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome da obra | texto | sim | ex.: Escola Municipal Vila Nova |
| Tipo | lista | sim | Escola / UBS / Refeitório / Outro |
| Órgão contratante | texto | sim | |
| Nº do contrato | texto | não | |
| Endereço / cidade | texto | não | |
| Data de início | data | sim | |
| Previsão de término | data | não | |
| Status | lista | sim | Em andamento / Paralisada / Concluída |
| % de BDI | número (%) | não | ex.: 27,70. Pré-preenchido com o BDI do cabeçalho da planilha importada. É informação: o custo sem BDI vem da coluna "Valor Unit" da planilha; só sem essa coluna o custo vira preço ÷ (1 + BDI) |

**Ações**
- **Salvar:** a obra aparece na lista sem recarregar.
- **Planilha da licitação:** abre a tela abaixo (só numa obra já salva).

---

## Tela: Obra — Planilha da licitação

*(Acrescentada em 17/11/2026.)*

**Quem acessa:** Engenheiro.
**Chega aqui por:** botão Editar da obra (Dados da obra) → seção **Planilha da licitação**.

**O que aparece**
1. Se a obra ainda não tem planilha: botão **Anexar planilha (.xlsx)**.
2. Se já tem: nome do arquivo, data da importação, quem importou, objeto e referência de preços (ex.: "SINAPI 03/2024, ORSE 02/2024"), nº de etapas e de itens (e quantos com quantidade 0), valor total (com BDI) e custo total (sem BDI). Botão **Trocar planilha** (ver regra de reimportação) e botão **Baixar o arquivo original**.
3. Abaixo, a planilha como ficou, **igual ao arquivo**: etapas e subetapas (até 3 níveis), sempre com o número na frente ("3 – FUNDAÇÕES"), e os itens (item, código, banco, descrição, unidade, quantidade, valor unitário sem BDI, valor unitário com BDI, total), com o subtotal de cada etapa.

**Importar (passo a passo)**
1. Anexa o arquivo .xlsx (no celular, abre a escolha de arquivos).
2. O sistema lê a aba (se houver várias, pergunta qual) e **acha a linha de cabeçalho** procurando "Item" e "Descrição", sem assumir a posição. Do cabeçalho solto acima da tabela, pega o objeto, o BDI (pré-preenche o % de BDI) e a referência de preços.
3. **Prévia:** mostra as colunas identificadas pelo nome, aceitando variações ("Quant."/"Quantidade", "Und"/"Unid.", "Valor Unit com BDI"/"Preço Unitário"): item, código, banco, descrição, unidade, quantidade, valor unitário sem BDI, valor unitário com BDI, total. Deixa trocar qual coluna é qual, se ele errar.
4. Leitura das linhas, **fiel à planilha**: linha **sem código** = **etapa/subetapa** (o nível vem do número: "3", "3.1", "3.1.1"); linha **com código** = **item**, ligado à etapa de cima; linha vazia é pulada; a leitura **para** na primeira linha "Total sem BDI" ou "Total Geral". Espaços em volta do número e do código são tirados; unidades e descrições ficam como vieram (inclusive quebra de linha). **Nada é renomeado.**
5. **Itens com quantidade 0 entram** (planilha de retomada) e a prévia diz quantos são.
6. **Linhas com erro em vermelho**, com o motivo: quantidade ou preço que não é número, item antes de qualquer etapa, número de etapa repetido. Aviso (não bloqueia): quantidade × valor com BDI diferente do total da linha.
7. **Conferências:** "Soma dos itens bate com o Total Geral da planilha ✓" (ou a diferença) e soma sem BDI × "Total sem BDI" da planilha (mostra a diferença, ex.: R$ 0,48 de arredondamento, sem bloquear). Resumo: X etapas, Y itens (Z com quantidade 0), total com e sem BDI.
8. **Confirmar importação:** só então salva. **Cancelar** não grava nada.

**Regra de reimportação:** enquanto a obra não tiver nenhuma medição, **Trocar planilha** substitui a antiga; as compras continuam ligadas à etapa de mesmo número (ex.: "3"), e as que não acharem etapa vão para "Sem etapa / Administração", com aviso de quantas foram. Depois da 1ª medição, o botão fica desligado com o texto "A obra já tem medição: a planilha não pode mais ser trocada."

**Estado vazio**
"Esta obra ainda não tem a planilha da licitação. Anexe o arquivo .xlsx para usar o Orçado x Realizado e a Medição."

---

## Tela: Obra — Orçado x Realizado

*(Acrescentada em 17/11/2026.)*

**Quem acessa:** Engenheiro; Auxiliar com Financeiro. **Mestre nunca.**
**Chega aqui por:** módulo **Orçado x Realizado** na grade da obra. Pendência no quadrado: "2 etapas estouradas" (vermelho) ou "Dentro do orçado" (verde); sem planilha, "Sem planilha".

**O que aparece (obra com planilha)**
1. Totais: orçado (custo sem BDI), realizado, diferença em R$ e em %.
2. Tabela por etapa, na ordem da planilha:

| Coluna | Observação |
|---|---|
| Etapa | sempre com o número: "3 – FUNDAÇÕES", "23 – FUNDAÇÕES". Mostra as etapas de nível 1; tocar abre as subetapas e as compras |
| Orçado | soma do custo sem BDI dos itens da etapa (quantidade × "Valor Unit" da planilha) |
| Realizado | soma das compras lançadas nessa etapa |
| Diferença | orçado − realizado, em R$ |
| % usado | realizado ÷ orçado; barra de progresso |

   Etapa com realizado acima do orçado fica em **vermelho** ("Estourou X%"); acima de 90%, em âmbar.
3. Duas linhas fora das etapas, depois delas: **Sem etapa / Administração** (compras sem etapa) e **Mão de obra própria** (diárias dos diaristas: presença × diária). As duas têm orçado "—" e somam no realizado total.
4. Linha de total da obra.
5. Tocar numa etapa abre a lista das compras dela.

**Obra sem planilha**
Aviso: "Importe a planilha da licitação para comparar com o orçado" (engenheiro vê o botão que leva à tela da planilha). Enquanto isso, mostra o realizado por categoria (Material, Mão de obra, Aluguel de equipamento, Serviço, Outros), igual à tela Gastos para esta obra.

**Ações**
- **Exportar** (pela tela Relatórios): formato `[PENDENTE: modelo do engenheiro]`.

---

## Tela: Obra — Fluxo de caixa

*(Acrescentada em 17/11/2026.)*

**Quem acessa:** Engenheiro; Auxiliar com Financeiro. **Mestre nunca.**
**Chega aqui por:** módulo **Fluxo de caixa** na grade da obra.

**O que aparece**
1. Tabela **mês a mês** (do início da obra até 3 meses à frente). Meses passados = **realizado**; mês atual e futuros = **previsto** (letra em itálico ou etiqueta "previsto").

| Linha | De onde vem |
|---|---|
| Entradas — medições recebidas | valor recebido de cada medição, no mês em que caiu na conta *(fase 3)* |
| Entradas — medições a receber | medição aprovada e ainda não recebida, no mês da data prevista *(fase 3)* |
| Saídas — fornecedores pagos | pagamentos, no mês da data do pagamento |
| Saídas — diárias pagas | pagamentos de diárias, no mês da data do pagamento |
| Saídas — a pagar | compras ainda não pagas (no mês atual) e diárias em aberto (no mês do fim da quinzena) |
| Saldo do mês | entradas − saídas |
| Saldo acumulado | soma dos saldos até aquele mês |

2. Saldo acumulado negativo fica em vermelho.
3. **Na fase 1** as linhas de entrada não aparecem e o topo avisa: "As entradas (medições) chegam com o módulo Medição."
4. No celular, cada mês vira um cartão.

**Ações**
- **Exportar** (pela tela Relatórios): formato `[PENDENTE: modelo do engenheiro]`.

---

## Tela: Obra — Resumo

**Quem acessa:** Engenheiro; Auxiliar com Financeiro.
**Chega aqui por:** tocar no cartão da obra.

**O que aparece**
1. Cabeçalho da obra (fixo em todas as abas): nome, tipo, órgão, status, botão Editar (engenheiro).
2. Números: comprado na quinzena · aguardando NF (quantidade e R$) · a pagar · pago no mês.
3. **Gráfico de barras: gasto por categoria** desde o início da obra (Material, Mão de obra, Aluguel de equipamento, Serviço, Outros). Responde "com o que essa obra gastou?".
4. Medição: valor do contrato, medido acumulado, saldo (se houver itens de contrato e o perfil tiver Medição).
5. Presença: homem-dia no mês (soma de "Presente").
6. Últimas 5 atividades: "Carlos lançou presença · hoje 07:42", "Ana anexou NF 1234 · ontem".

**Estado vazio**
"Ainda não há lançamentos nesta obra."

---

## Tela: Obra — Lista de compras

**Quem acessa:** Engenheiro; Auxiliar com Financeiro. Mestre não.
**Chega aqui por:** aba Lista de compras da obra.

**O que aparece**
1. Filtro: **A comprar** (padrão) · Comprado · Cancelado · Todos.
2. Campo de adicionar rápido no topo: digitar o item e tocar Enter já cria a linha (quantidade e resto podem ser completados depois).
3. Lista de itens, os mais urgentes primeiro (data "para quando" mais próxima; sem data no fim).

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Item | texto | sim | ex.: Cimento CP-II 50 kg |
| Quantidade | número | não | |
| Unidade | texto | não | ex.: saco, m³, un, barra |
| Para quando | data | não | vermelho se já passou e ainda está A comprar |
| Fornecedor sugerido | lista | não | |
| Observação | texto | não | |
| Status | etiqueta | — | A comprar / Comprado / Cancelado |
| Compra ligada | link | — | aparece quando Comprado; abre a compra |

**Ações**
- **Marcar itens + Gerar compra:** abre o formulário de compra já com o fornecedor (se todos tiverem o mesmo sugerido) e a descrição montada com os itens marcados ("Cimento CP-II 50 kg – 50 saco; Areia média – 6 m³"). Ao salvar, os itens viram **Comprado** e ficam ligados à compra.
- **Pedir no WhatsApp:** com itens marcados e um fornecedor escolhido, abre o WhatsApp com a lista:
  ```
  Olá, <fornecedor>! Preciso destes itens para a obra <nome da obra>:
  • Cimento CP-II 50 kg – 50 saco
  • Areia média – 6 m³
  Pode me passar o valor e o prazo de entrega?
  ```
- **Cancelar item:** status Cancelado (fica no histórico).
- **Editar / Excluir:** excluir só engenheiro.

**Estado vazio**
"Nada para comprar nesta obra."

---

## Tela: Lista de compras (todas as obras)

**Quem acessa:** Engenheiro; Auxiliar (só obras com Financeiro).
**Chega aqui por:** item **Compras** da barra (ver navegação).

**O que aparece**
Itens **A comprar** de todas as obras, agrupados por **fornecedor sugerido** (grupo "Sem fornecedor" no fim) e, dentro dele, por obra. Filtro por obra.

**Ações**
- **Pedir no WhatsApp** por fornecedor: a mensagem separa os itens por obra.
- **Gerar compra:** dentro de um grupo, gera **uma compra por obra** (porque cada obra tem seu fechamento), todas com o mesmo fornecedor.

**Estado vazio**
"Nenhum item para comprar em nenhuma obra."

---

## Tela: Obra — Fornecedores (quinzena)

**Quem acessa:** Engenheiro; Auxiliar com Financeiro.

**O que aparece**
1. Seletor de quinzena: "‹ 1ª quinzena nov/2026 ›" (1–15) ou "2ª quinzena" (16–fim). Abre na quinzena atual.
2. Status do fechamento da quinzena, se existir: Rascunho / Fechado.
3. Botão **Lançar compra** (grande, fixo no rodapé no celular).
4. Uma linha/cartão por fornecedor com compras na quinzena.

| Campo | Tipo | Observação |
|---|---|---|
| Fornecedor | texto | |
| Comprado | R$ | |
| Com NF | R$ | |
| Sem NF | R$ | vermelho se > 0 |
| Pago | R$ | |
| Saldo a pagar | R$ | |
| Fechamento | etiqueta | Sem fechamento / Rascunho / Fechado |

**Ações**
- **Tocar no fornecedor:** abre o Extrato do fornecedor nesta obra.
- **Lançar compra:** abre o formulário de compra.
- **Gerar fechamento da quinzena:** cria os rascunhos que ainda não existem (não duplica).

**Estado vazio**
"Nenhuma compra lançada nesta obra nesta quinzena."

### Formulário de compra

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Fornecedor | busca na lista | sim | com opção "+ Novo fornecedor" ali mesmo |
| Data | data | sim | padrão hoje |
| Descrição | texto | sim | ex.: 50 sacos de cimento CP-II |
| Categoria | lista | sim | Material / Mão de obra / Aluguel de equipamento / Serviço / Outros; vem preenchida com a categoria padrão do fornecedor |
| Valor | R$ | sim | |
| Etapa | lista com busca | **sim, se a obra tem planilha** | etapas e subetapas da planilha, sempre com o número ("3 – FUNDAÇÕES", "23.2 – FORMAS") + **"Sem etapa / Administração"**. Na obra sem planilha o campo não aparece. *(17/11/2026)* |
| Nº do pedido / orçamento | texto | não | |
| Observação | texto | não | |

A quinzena é calculada pela data; não é digitada. Status inicial: **Aguardando NF**. A compra dividida em categorias usa **a mesma etapa** nas duas partes.

**Dividir em categorias:** link abaixo do campo Valor. Abre linhas "Categoria + Valor" (ex.: Material R$ 4.000,00 · Mão de obra R$ 6.000,00), com a soma mostrada embaixo. Ao salvar, vira uma compra por categoria, com a mesma data, descrição, fornecedor e nº de pedido, ligadas entre si. Nas listas aparecem juntas como um lançamento só, com a divisão visível ao abrir. Usado para empreiteiro que entra com material e mão de obra.

---

## Tela: Extrato do fornecedor (na obra)

**Quem acessa:** Engenheiro; Auxiliar com Financeiro.
**Chega aqui por:** tocar num fornecedor na aba Fornecedores.

**O que aparece**
1. Nome, CNPJ, WhatsApp, chave Pix (com botão Copiar).
2. Seletor de quinzena.
3. Lista das compras da quinzena: data, descrição, categoria, valor, status (Aguardando NF / NF recebida / Paga).
4. NFs da quinzena e pagamentos da quinzena.
5. Totais: comprado, com NF, sem NF, pago, saldo.

**Ações**
- **Cobrar NF no WhatsApp:** abre o WhatsApp do fornecedor com a mensagem pronta (modelo abaixo) listando as compras Aguardando NF desta obra.
- **Anexar NF:** escolhe uma ou mais compras e anexa a nota.
- **Registrar pagamento.**
- **Ver fechamento:** abre a tela Fechamento da quinzena.

**Mensagem de cobrança (modelo):**
```
Olá, <fornecedor>! Aqui é da obra <nome da obra> (<órgão>).
Estamos sem a nota fiscal destas compras:
• 03/11 – 50 sacos de cimento CP-II – R$ 1.850,00
• 07/11 – Areia média 6 m³ – R$ 900,00
Total: R$ 2.750,00
Pode enviar a NF por aqui? Obrigado!
```

---

## Tela: Fechamento da quinzena

**Quem acessa:** Engenheiro; Auxiliar com Financeiro.

**O que aparece**
Obra, fornecedor, período (ex.: 01/11/2026 a 15/11/2026), status (Rascunho / Fechado), lista de compras com data, descrição, categoria, valor e status da NF, total, total com NF, total sem NF, pagamentos ligados, saldo.

**Ações**
- **Fechar quinzena:** muda para Fechado, grava quem fechou e quando. Depois de fechado, as compras desse período só podem ser editadas pelo engenheiro.
- **Reabrir:** só engenheiro.
- **Imprimir / Salvar PDF:** folha para mandar ao fornecedor.
- **Enviar pelo WhatsApp:** abre o WhatsApp com o resumo em texto (total, itens, NFs faltando).

---

## Tela: Obra — Notas fiscais

**Quem acessa:** Engenheiro; Auxiliar com Financeiro.

**O que aparece**
1. Três filtros em botões: **Aguardando NF** (padrão) · **NF recebida** · **Paga**.
2. Aguardando NF: compras agrupadas por fornecedor, com data, descrição, valor e "há X dias". Mais de 7 dias fica vermelho. Cada grupo tem o botão **Cobrar no WhatsApp**.
3. NF recebida / Paga: lista de notas com número, fornecedor, data de emissão, valor, arquivo (abrir), compras ligadas, pagamento ligado.

**Ações**
- **Anexar NF:** formulário abaixo. As compras escolhidas passam para **NF recebida**.
- **Abrir arquivo:** mostra a foto ou o PDF.

### Formulário de NF

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Fornecedor | lista | sim | |
| Compras desta NF | marcar várias | sim | só compras Aguardando NF desse fornecedor nesta obra |
| Nº da NF | texto | sim | |
| Data de emissão | data | sim | |
| Valor da NF | R$ | sim | aviso (não bloqueia) se diferente da soma das compras |
| Arquivo | foto (câmera) ou PDF | sim | no celular abre a câmera direto |

**Estado vazio**
"Nenhuma nota pendente."

---

## Tela: Notas pendentes (todas as obras)

**Quem acessa:** Engenheiro; Auxiliar (só obras com Financeiro).
**Chega aqui por:** item Notas da barra.

**O que aparece**
Compras Aguardando NF de todas as obras, agrupadas por **fornecedor** (porque o mesmo fornecedor atende várias obras), e dentro dele por obra. Total por fornecedor. Filtro por obra. Botão **Cobrar no WhatsApp** por fornecedor, com mensagem que separa por obra.

**Estado vazio**
"Nenhuma nota pendente em nenhuma obra."

---

## Tela: Obra — Pagamentos

**Quem acessa:** Engenheiro; Auxiliar com Financeiro.

**O que aparece**
Lista de pagamentos da obra, mais recentes primeiro: data, fornecedor, quinzena, valor, forma, NFs ligadas, comprovante. Sem NF ligada aparece a etiqueta vermelha **Sem nota**. Filtro por fornecedor e por quinzena.

### Formulário de pagamento

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Fornecedor | lista | sim | |
| Data | data | sim | padrão hoje |
| Valor | R$ | sim | |
| Forma | lista | sim | Pix / Boleto / Transferência / Dinheiro |
| NFs pagas | marcar várias | não | NFs recebidas e ainda não pagas desse fornecedor nesta obra |
| Comprovante | foto ou PDF | não | |
| Observação | texto | não | |

Ao salvar, as NFs marcadas e suas compras passam para **Paga**.

**Estado vazio**
"Nenhum pagamento registrado nesta obra."

---

## Tela: Obra — Presença (e Presença de hoje do mestre)

**Quem acessa:** Engenheiro; Mestre (obras dele); Auxiliar com Presença e Diário.
**Chega aqui por:** aba Presença; para o mestre é a tela inicial.

**O que aparece**
1. Seletor de obra no topo (só para quem tem mais de uma).
2. Data, padrão hoje, com setas ‹ › para os dias anteriores.
3. Botão **Repetir presença de ontem**.
4. Lista dos funcionários ativos da obra; em cada linha, quatro botões grandes: **Presente · Falta · Atestado · Folga**.
5. Contador: "14 presentes de 16".
6. Botão **Salvar presença**.

**Ações**
- **Repetir presença de ontem:** preenche cada funcionário com o que ele teve no dia anterior; nada é salvo até tocar em Salvar.
- **Salvar presença:** grava e volta a mostrar "Presença de hoje lançada por Carlos às 07:42".
- **+ Funcionário:** cadastro rápido (nome, função) ali mesmo.
- **Exportar mês (CSV):** só engenheiro e auxiliar; uma linha por funcionário, uma coluna por dia (P / F / A / FG).

**Regras por perfil**
- **Mestre:** pode lançar e corrigir hoje e os 3 dias anteriores; dias mais antigos ficam só leitura. Não exporta.
- **Engenheiro:** corrige qualquer dia.

**Estado vazio**
"Cadastre os funcionários desta obra para lançar a presença." com botão + Funcionário.

Para quem tem Financeiro na obra, aparece no topo o botão **Diárias da quinzena**.

---

## Tela: Diárias da quinzena

**Quem acessa:** Engenheiro; Auxiliar com Financeiro. **Mestre nunca.**
**Chega aqui por:** botão Diárias da quinzena na aba Presença.

**O que aparece**
1. Seletor de quinzena (igual ao de Fornecedores).
2. Status da quinzena de diárias: **Em aberto** / **Paga** (com data e forma).
3. Uma linha por funcionário **Diarista** da obra com presença na quinzena:

| Campo | Tipo | Observação |
|---|---|---|
| Funcionário | texto | nome e função |
| Dias presentes | número | contagem de "Presente" na quinzena |
| Faltas / Atestados | número | só informação |
| Diária | R$ | valor vigente; se mudou no meio da quinzena, mostra "valor variou" e a conta usa o valor de cada dia |
| A pagar | R$ | dias × diária |
| Chave Pix | texto | com botão Copiar |

4. Total da quinzena na obra.
5. Aviso amarelo se algum diarista está sem diária cadastrada ("3 diaristas sem valor de diária — cadastre em Equipe").

**Ações**
- **Marcar como paga:** pede data e forma (Pix / Transferência / Dinheiro) e trava a quinzena. Presença dessa quinzena passa a ser corrigida só pelo engenheiro. Engenheiro pode reabrir.
- **Imprimir / Salvar PDF** e **Exportar CSV:** a lista para conferir e pagar.

**Estado vazio**
"Nenhum diarista com presença nesta quinzena."

---

## Tela: Obra — Diário

**Quem acessa:** Engenheiro; Mestre; Auxiliar com Presença e Diário.

**O que aparece**
Lista de dias, mais recente primeiro: data, clima (ícone), efetivo, primeira linha dos serviços, nº de fotos. Botão **Lançar diário de hoje**. Botão **Imprimir / Salvar PDF do período** (de/até).

### Tela: Dia do diário

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Data | data | sim | padrão hoje; um diário por dia por obra |
| Clima manhã | botões | sim | Bom / Nublado / Chuva / Impraticável |
| Clima tarde | botões | sim | idem |
| Efetivo | número | — | calculado da presença do dia (só leitura); "presença não lançada" se faltar |
| Serviços executados | texto longo | sim | |
| Ocorrências | texto longo | não | |
| Fotos | várias fotos | não | câmera direto no celular; legenda opcional em cada uma |

Rodapé: "Lançado por Carlos · 16/11/2026 17:10".

**Regras por perfil**
- **Mestre:** edita o próprio diário até 3 dias depois.

**Estado vazio**
"Nenhum dia lançado no diário desta obra."

---

## Tela: Obra — Medição

**Quem acessa:** Engenheiro; Auxiliar com Medição.

**O que aparece**
1. Resumo do contrato: valor do contrato (soma dos itens), medido acumulado, saldo, % medido.
2. Botão **Itens do contrato**.
3. Lista de medições: nº, período, valor medido, status (Rascunho / Enviada / Aprovada).
4. Botão **Nova medição**.

### Tela: Itens do contrato

Tabela por etapa: item (código), descrição, unidade, quantidade contratada, preço unitário, total.
- **Os itens vêm da planilha da licitação**, importada nos Dados da obra (ver Tela: Obra — Planilha da licitação). *(Mudou em 17/11/2026: antes era colar as linhas do Excel aqui.)*
- **Adicionar item** um a um (aditivo, item que faltou); editar; apagar (só engenheiro e só se o item nunca foi medido).

Vazio: "Importe a planilha da licitação nos dados da obra." (engenheiro vê o botão que leva lá)

### Tela: Medição nº X

Cabeçalho: nº, período (de/até), status.
Tabela por item: código, descrição, unidade, qtd contratada, acumulado anterior, **qtd nesta medição** (campo), acumulado com esta, saldo, valor desta medição. Linha que passar da quantidade contratada fica vermelha (aviso, não bloqueia).
Totais: valor desta medição, acumulado, saldo do contrato.

**Ações**
- **Salvar rascunho.**
- **Marcar como enviada.**
- **Aprovar:** muda para Aprovada e trava a edição (engenheiro pode reabrir). Ao aprovar, pede a **data prevista de recebimento** (padrão: 30 dias depois) — é ela que põe a medição no Fluxo de caixa como "a receber".
- **Registrar recebimento** (medição Aprovada; engenheiro ou quem tem Financeiro): data em que caiu na conta e valor recebido (padrão: o valor da medição; pode ser diferente, por retenção ou glosa). A medição passa a mostrar "Recebida em 14/11/2026".
- **Imprimir / Salvar PDF** (boletim de medição) e **Exportar CSV**.

---

## Tela: Obra — Equipe

**Quem acessa:** Engenheiro.

**O que aparece**
1. **Funcionários da obra** (para a presença): nome, função, vínculo (**Diarista** / **Do empreiteiro**), chave Pix, ativo. Adicionar, editar, desativar (não apaga, para não perder a presença antiga). Mover para outra obra.
   - **Diária:** só para Diarista. Valor e "vale a partir de" (data). Trocar o valor cria um novo valor a partir da data escolhida; o histórico fica guardado. Este campo só aparece para quem tem Financeiro.
   - Funcionário "Do empreiteiro" entra na presença e no efetivo do diário, mas não gera diária (o custo já está na compra do empreiteiro).
   - No cadastro rápido feito pelo mestre na Presença, o vínculo fica Diarista e a diária fica vazia, para o engenheiro completar.
2. **Acessos ao sistema nesta obra:** pessoa, perfil, e para auxiliar três chaves liga/desliga: **Financeiro · Presença e Diário · Medição**. Botão **Dar acesso** (escolhe entre os usuários já liberados). Remover acesso.

---

## Tela: Fornecedores (cadastro geral)

**Quem acessa:** Engenheiro; Auxiliar com Financeiro em alguma obra.
**Chega aqui por:** item Fornecedores da barra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome / razão social | texto | sim | |
| CNPJ ou CPF | texto | não | |
| Contato | texto | não | nome da pessoa |
| WhatsApp | telefone | não | sem ele, o botão de cobrança fica desligado com aviso |
| Chave Pix | texto | não | |
| Categoria padrão | lista | sim | Material / Mão de obra / Aluguel de equipamento / Serviço / Outros |
| Ativo | sim/não | sim | |

Lista com busca por nome; mostra em quantas obras o fornecedor tem compras e o total aguardando NF.
Vazio: "Nenhum fornecedor cadastrado."

---

## Tela: Relatórios

*(Acrescentada em 17/11/2026.)*

**Quem acessa:** Engenheiro; Auxiliar só vê os relatórios dos módulos e obras liberados para ela. **Mestre não.**
**Chega aqui por:** no celular, dentro de **Mais** (a barra já tem os 5 itens do limite); no computador, item **Relatórios** no menu lateral.

**O que aparece**
1. Obra: lista com "Todas as obras" e as obras liberadas.
2. Período: Quinzena atual · Quinzena anterior · Este mês · Mês anterior.
3. Lista de relatórios, cada um com o botão de exportar no formato dele:

| Relatório | Formato | Precisa de | Fase | Com "Todas as obras" |
|---|---|---|---|---|
| Gastos por obra e categoria | CSV | Financeiro | 1 | sim |
| Fechamento da quinzena por fornecedor | PDF | Financeiro | 1 | não (escolher a obra) |
| Diárias da quinzena | PDF e CSV | Financeiro | 1 | não (escolher a obra) |
| Presença do mês | CSV | Presença e Diário | 1 | não (escolher a obra) |
| Orçado x Realizado por etapa | `[PENDENTE: modelo]` | Financeiro | 1 | não (escolher a obra) |
| Fluxo de caixa mês a mês | `[PENDENTE: modelo]` | Financeiro | 1 (saídas) · 3 (entradas) | sim (soma das obras) |
| Diário de obra do período | PDF | Presença e Diário | 2 | não |
| Boletim de medição | PDF e CSV | Medição | 3 | não |

Relatório de fase ainda não construída não aparece.

**Formato dos arquivos:** `[PENDENTE: o engenheiro vai mandar o modelo de cada relatório]`. Até lá, os botões de exportar mostram só o aviso "em breve".

**Estado vazio**
"Nenhum relatório liberado para você. Fale com o engenheiro."

---

## Tela: Usuários

**Quem acessa:** Engenheiro.

**O que aparece**
1. Bloco no topo **Aguardando liberação** (contas Pendente), com botão **Liberar**.
2. Lista de usuários: nome, email, perfil, obras, ativo.

**Ações**
- **Liberar / Editar:** escolhe o perfil (Engenheiro / Mestre / Auxiliar), marca as obras e, para auxiliar, as liberações por obra.
- **Desativar:** a pessoa perde o acesso; o que ela lançou continua com o nome dela.

Vazio: "Só você por enquanto."

---

## Tela: Meu perfil

Nome, email, WhatsApp, trocar senha, Sair.

---

## Textos do sistema

- Botões: Salvar, Cancelar, Novo, Editar, Excluir, Lançar compra, Anexar NF, Registrar pagamento, Fechar quinzena, Cobrar no WhatsApp, Imprimir / Salvar PDF.
- Confirmação de exclusão: "Excluir este registro? Isso não pode ser desfeito."
- Aviso de conta pendente: "Conta aguardando liberação do administrador."
- Salvo: "Salvo." (aviso curto no rodapé)
- Erro genérico: "Não deu para salvar. Verifique a internet e tente de novo. Nada foi perdido do que você digitou."
- Sem permissão: "Você não tem liberação para isso nesta obra. Fale com o engenheiro."

## Dados de exemplo

**Usuários:** Wlisses (Engenheiro) · Carlos (Mestre, Escola Vila Nova) · Joaquim (Mestre, UBS Centro e Refeitório Escola Agrícola) · Ana (Auxiliar: Financeiro em todas; Presença e Diário só na Escola Vila Nova) · Pedro (Pendente).

**Obras:**
1. Escola Municipal Vila Nova — Escola — Prefeitura de Caruaru — Em andamento
2. UBS Centro — UBS — Prefeitura de Bezerros — Em andamento
3. Refeitório Escola Agrícola — Refeitório — Governo do Estado — Em andamento
4. Escola Rural Sítio Pedra — Escola — Prefeitura de Caruaru — Paralisada
5. UBS Vila Rica — UBS — Prefeitura de Gravatá — Concluída

**Fornecedores:** Casa do Construtor Ltda (Material) · Areal São José (Material) · Loca Máquinas (Aluguel de equipamento) · Zé Pedreiro Empreitadas (Mão de obra) · Elétrica Luz (Material) · Topografia Silva (Serviço).

**Compras (datas de 20/10/2026 a 14/11/2026):**
| Obra | Fornecedor | Data | Descrição | Categoria | Valor | Status |
|---|---|---|---|---|---|---|
| Escola Vila Nova | Casa do Construtor | 03/11 | 50 sacos de cimento CP-II | Material | 1.850,00 | Aguardando NF |
| Escola Vila Nova | Areal São José | 07/11 | Areia média 6 m³ | Material | 900,00 | Aguardando NF |
| Escola Vila Nova | Loca Máquinas | 01/11 | Betoneira 400 L – 15 dias | Aluguel de equipamento | 600,00 | NF recebida |
| Escola Vila Nova | Zé Pedreiro | 14/11 | Alvenaria bloco 1ª quinzena | Mão de obra | 7.200,00 | Aguardando NF |
| UBS Centro | Casa do Construtor | 22/10 | Argamassa AC-II 40 sacos | Material | 1.120,00 | Paga |
| UBS Centro | Elétrica Luz | 05/11 | Cabos 2,5 mm e eletrodutos | Material | 2.340,50 | NF recebida |
| UBS Centro | Loca Máquinas | 10/11 | Andaime 20 peças – 30 dias | Aluguel de equipamento | 850,00 | Aguardando NF |
| Refeitório Esc. Agrícola | Topografia Silva | 20/10 | Locação da obra | Serviço | 1.500,00 | Paga |
| Refeitório Esc. Agrícola | Areal São José | 12/11 | Brita 1 – 10 m³ | Material | 1.400,00 | Aguardando NF |
| Refeitório Esc. Agrícola | Zé Pedreiro | 31/10 | Fundação 2ª quinzena out | Mão de obra | 5.800,00 | Paga |

**NF:** NF 4521 Loca Máquinas 02/11 R$ 600,00 (Escola Vila Nova, sem pagamento) · NF 889 Elétrica Luz 06/11 R$ 2.340,50 (UBS Centro) · NF 12033 Casa do Construtor 23/10 R$ 1.120,00 (paga) · NF 77 Topografia Silva 21/10 (paga) · NF 310 Zé Pedreiro 01/11 (paga).
**Pagamentos:** 25/10 Casa do Construtor R$ 1.120,00 Pix · 24/10 Topografia Silva R$ 1.500,00 Transferência · 03/11 Zé Pedreiro R$ 5.800,00 Pix · 09/11 Elétrica Luz R$ 1.000,00 Boleto **Sem nota** (adiantamento).
**Fechamentos:** Refeitório + Zé Pedreiro 16–31/10 Fechado · UBS Centro + Casa do Construtor 16–31/10 Fechado · Escola Vila Nova + Casa do Construtor 01–15/11 Rascunho.
**Lista de compras:** Escola Vila Nova: Cimento CP-II 50 kg – 50 saco (para 18/11, Casa do Construtor, A comprar) · Bloco cerâmico 9×19×19 – 2.000 un (A comprar, sem fornecedor) · Areia média – 6 m³ (Comprado, ligado à compra de 07/11). UBS Centro: Cimento CP-II 50 kg – 30 saco (para 14/11, Casa do Construtor, A comprar — atrasado) · Disjuntor 20A – 12 un (Elétrica Luz, A comprar) · Tinta acrílica 18 L – 4 lata (Cancelado).
**Compra dividida:** Escola Vila Nova · Zé Pedreiro · 10/11 · "Reboco interno bloco B" · Material R$ 4.000,00 + Mão de obra R$ 6.000,00 · Aguardando NF.
**Funcionários:** Escola Vila Nova: 16 (10 Diaristas — pedreiro R$ 180,00, servente R$ 120,00, carpinteiro R$ 200,00, armador R$ 200,00 —, 6 Do empreiteiro); UBS Centro: 9 (todos Diaristas; um servente com diária mudando de R$ 110,00 para R$ 120,00 em 06/11); Refeitório: 7 (Do empreiteiro). Um diarista da UBS Centro sem diária cadastrada.
**Diárias:** Escola Vila Nova 2ª quinzena out Paga em 03/11 por Pix; 1ª quinzena nov Em aberto.
**Presença:** Escola Vila Nova lançada até ontem, hoje não lançada; UBS Centro lançada hoje 07:42.
**Diário:** 6 dias na Escola Vila Nova, com 1 dia de Chuva à tarde e 2 dias com fotos.
**Planilha da licitação (Escola Vila Nova)** *(17/11/2026)*: BDI 25%; a planilha de exemplo traz o valor unitário sem BDI (= preço ÷ 1,25). 5 etapas, 8 itens, total R$ 1.248.300,00 (custo sem BDI R$ 998.640,00). *(O formato do leitor foi tirado da planilha real da escola de Aporá, que fica fora do projeto e não entra nos dados de exemplo.)*
| Etapa | Item | Descrição | Un | Qtd | Preço unit. | Total |
|---|---|---|---|---|---|---|
| 1. Serviços preliminares | 1.1 | Locação e limpeza do terreno | m² | 1.200 | 18,70 | 22.440,00 |
| 2. Fundação | 2.1 | Escavação manual | m³ | 180 | 65,00 | 11.700,00 |
| 2. Fundação | 2.2 | Concreto armado da fundação | m³ | 95 | 1.980,00 | 188.100,00 |
| 3. Alvenaria | 3.1 | Alvenaria de bloco cerâmico | m² | 2.400 | 98,00 | 235.200,00 |
| 3. Alvenaria | 3.2 | Vergas e contravergas | m | 380 | 72,00 | 27.360,00 |
| 4. Revestimento | 4.1 | Chapisco | m² | 4.800 | 9,50 | 45.600,00 |
| 4. Revestimento | 4.2 | Reboco interno e externo | m² | 4.800 | 48,00 | 230.400,00 |
| 5. Cobertura | 5.1 | Estrutura de madeira e telha cerâmica | m² | 1.300 | 375,00 | 487.500,00 |

**Etapa das compras da Escola Vila Nova:** cimento 03/11 e alvenaria do Zé 14/11 → 3. Alvenaria · areia 07/11 e reboco dividido 10/11 → 4. Revestimento · betoneira 01/11 → Sem etapa / Administração. **UBS Centro e Refeitório ficam sem planilha**, para mostrar a tela nos dois casos.

**Medição (Escola Vila Nova):** os 8 itens acima; 1ª medição Aprovada (R$ 142.000,00), recebida em 14/11/2026; 2ª medição Rascunho.

## Critérios de aceite

- [ ] O engenheiro abre o sistema em Obras, filtrado em "Em andamento", com obras pendentes primeiro.
- [ ] O mestre abre direto em Presença de hoje da obra dele; Joaquim vê o seletor com as duas obras.
- [ ] Nenhuma tela do mestre mostra R$, nem o cartão da obra.
- [ ] Ana (auxiliar) não vê a aba Medição nem Equipe; vê Presença só na Escola Vila Nova.
- [ ] Lançar uma compra faz ela aparecer na quinzena certa, como Aguardando NF, sem recarregar.
- [ ] A categoria da compra já vem preenchida com a do fornecedor.
- [ ] "Cobrar no WhatsApp" abre o WhatsApp com a mensagem listando só as compras sem NF daquele fornecedor.
- [ ] Anexar uma NF a duas compras muda as duas para NF recebida.
- [ ] Registrar pagamento com NF muda NF e compras para Paga; sem NF aparece "Sem nota".
- [ ] "Repetir presença de ontem" preenche a lista e só grava ao tocar em Salvar.
- [ ] Depois das 10h, obra sem presença do dia mostra "Não lançada" em vermelho.
- [ ] A tela Gastos soma por obra e categoria e bate com as compras de exemplo; Mão de obra mostra Empreiteiros + Diárias.
- [ ] Dividir uma compra de R$ 10.000,00 em Material 4.000 + Mão de obra 6.000 soma certo nas duas colunas de Gastos e aparece como um lançamento só no extrato.
- [ ] Diárias da quinzena calcula dias × diária, usa o valor certo quando a diária muda no meio da quinzena e avisa diarista sem diária.
- [ ] Funcionário "Do empreiteiro" não aparece em Diárias da quinzena.
- [ ] Na Lista de compras geral, o cimento da Escola Vila Nova e da UBS Centro aparecem juntos no grupo Casa do Construtor; "Gerar compra" cria duas compras, uma em cada obra, e os itens viram Comprado.
- [ ] "Pedir no WhatsApp" monta a mensagem com os itens separados por obra.
- [ ] O mestre não vê a aba nem o menu de Lista de compras.
- [ ] O mestre não vê o valor da diária em nenhuma tela, nem no cadastro de funcionário.
- [ ] Anexar a planilha real da escola de Aporá mostra a prévia com 63 etapas/subetapas e 367 itens (79 com quantidade 0), "Soma dos itens bate com o Total Geral da planilha ✓" (R$ 3.196.799,02), a diferença de R$ 0,48 no total sem BDI, % de BDI pré-preenchido com 27,70, e só grava depois de "Confirmar importação".
- [ ] As etapas 3 e 23 (as duas "FUNDAÇÕES") aparecem separadas e com o número em todo lugar: planilha, Orçado x Realizado, seletor de etapa da compra e Medição.
- [ ] Com a obra já medida, "Trocar planilha" fica desligado; sem medição, a planilha nova substitui a antiga e as compras continuam na etapa de mesmo número.
- [ ] O custo orçado de cada item vem da coluna "Valor Unit" sem BDI da planilha.
- [ ] Lançar compra na Escola Vila Nova pede a etapa (com "Sem etapa / Administração"); na UBS Centro, que não tem planilha, não pede.
- [ ] Orçado x Realizado da Escola Vila Nova mostra 3. Alvenaria com R$ 9.050,00 realizado e 4. Revestimento com R$ 10.900,00; a betoneira cai em Administração; as diárias aparecem em "Mão de obra própria".
- [ ] Etapa com realizado acima do orçado fica vermelha.
- [ ] Orçado x Realizado da UBS Centro mostra o aviso para importar a planilha e o realizado por categoria.
- [ ] Fluxo de caixa mostra, mês a mês, pagamentos e diárias pagas como saídas realizadas e compras não pagas e diárias em aberto como saídas previstas; na fase 1 não mostra entradas.
- [ ] Nenhuma tela do mestre mostra Orçado x Realizado nem Fluxo de caixa.
- [ ] Imprimir fechamento, diário e medição gera folha limpa, sem menu.
- [ ] Todas as telas funcionam no celular sem rolagem horizontal (exceto a tabela de medição, que rola dentro do próprio quadro).
- [ ] Cada lista tem estado vazio com texto próprio.

## A conta que vai chegar depois

- `[PENDENTE: prazo e horas por semana]` — define quanto cabe em cada fase; a ordem das fases já está decidida acima.
- Cronograma físico-financeiro: fora da v1 por decisão do engenheiro (ver PLANO, Melhorias para a v2).
## Decidir depois de usar

- `[DESCOBRIR NO USO: dias de espera de NF para ficar vermelho]` — por enquanto: 7 dias
- `[DESCOBRIR NO USO: quantos dias o mestre pode corrigir presença e diário]` — por enquanto: 3 dias
- `[DESCOBRIR NO USO: texto da mensagem de cobrança]` — por enquanto: o modelo acima
- `[DESCOBRIR NO USO: meia diária]` — por enquanto: cada "Presente" vale 1 diária inteira
- `[DESCOBRIR NO USO: limite para a etapa ficar âmbar]` — por enquanto: 90% do orçado
- `[DESCOBRIR NO USO: formatos de planilha de licitação que o leitor não reconhece]` — por enquanto: prévia com troca manual de colunas e do tipo de cada linha
- `[PENDENTE: modelo de exportação de cada relatório]` — o engenheiro vai mandar
