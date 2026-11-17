# Plano do Projeto — Minha Obra

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 17/11/2026 (layout dos módulos, Relatórios, planilha da licitação, Orçado x Realizado e Fluxo de caixa) · **Plano fechado (etapas 1, 2 e 3)**

## Em uma frase

Um sistema de **gestão de obras públicas** que acaba com o **fechamento quinzenal de fornecedor, a caça de nota fiscal e a lista de presença feitos na mão** para **um engenheiro que toca 7 obras ao mesmo tempo**, juntando **compra, nota fiscal e pagamento de cada fornecedor no mesmo lugar, separados por obra**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — Fechamento de fornecedores
- **Como acontece hoje:** junta na mão o que foi comprado de cada fornecedor em cada obra e monta o fechamento.
- **Frequência:** quinzenal, por fornecedor, dentro de cada obra (7 obras)
- **Custo:** fechamento + cobrança de NF somam cerca de **2 horas por semana**
- **Último caso:** [PENDENTE]

### Problema 2 — Cobrar e organizar nota fiscal
- **Como acontece hoje:** pede NF ao fornecedor no WhatsApp, a nota chega solta no WhatsApp, depois organiza cada nota junto do pagamento certo.
- **Frequência:** a cada pagamento
- **Custo:** incluído nas ~2 h/semana acima

### Problema 3 — Lista de presença
- **Como acontece hoje:** preenchida na mão, obra por obra.
- **Frequência:** diária
- **Responsável:** o **mestre de obras** tem que lançar; o engenheiro também pode lançar.

Também feito na mão hoje: planilha de medição, diário no caderno, foto solta no WhatsApp.

## A solução

Cada obra tem sua "pasta" no sistema. Dentro dela ficam fornecedores e compras, notas fiscais, pagamentos, presença, diário com fotos e medição. Por fornecedor, o sistema sabe o que foi comprado, o que já tem nota, o que falta nota e o que já foi pago. A cada quinzena monta o fechamento sozinho e prepara a mensagem de cobrança de NF para mandar no WhatsApp. Toda compra tem categoria (material, mão de obra, aluguel de equipamento…), então o sistema responde quanto cada obra gastou com cada coisa.

**Princípio que veio do Obra na Mão:** o engenheiro libera cada pessoa **uma vez**, por obra e por módulo. Depois disso a equipe lança sozinha, **sem fila de aprovação**. Tudo guarda quem lançou e quando.

**O que ele NÃO faz (v1):**
- Não emite nota fiscal nem conversa com a contabilidade
- Não envia WhatsApp sozinho (abre o WhatsApp com a mensagem pronta, você aperta enviar)
- Não é app de loja (Play Store); é site que funciona no celular
- Não funciona sem internet
- Não faz controle de estoque de material
- Não faz folha de pagamento CLT (encargos, férias, 13º); só calcula e registra o pagamento das diárias

## Funcionalidades

### Painel de Obras (a tela de todo dia)
- **Abre em:** cartões, um por obra
- **Mostra:** nome da obra, tipo (Escola / UBS / Refeitório / Outro), órgão contratante, status, nº de compras aguardando NF, valor a pagar em aberto, presença de hoje (lançada / não lançada)
- **Ordem e filtro:** obras com pendência primeiro; filtro por status (Em andamento, Paralisada, Concluída)
- **Ações:** criar obra, editar, mudar status (só engenheiro)
- **Ao clicar:** abre a obra numa grade de módulos, cada um com a sua pendência: Resumo · Lista de compras · Fornecedores · Notas · Pagamentos · Presença · Diário · Medição · Equipe
- **Vazio:** "Nenhuma obra cadastrada. Toque em Nova obra para começar."
- **Nasce e morre:** engenheiro cria; ao terminar vira "Concluída" e desce para o fim, nada é apagado
- Depois das 10h, obra sem presença do dia fica com aviso vermelho "Presença não lançada"
- Botão **Gastos** troca os cartões por uma tabela: obra × categoria de gasto

### Fornecedores e Fechamento quinzenal
- **Abre em:** lista de fornecedores da obra, na quinzena atual (1–15 ou 16–fim do mês)
- **Mostra:** fornecedor, total comprado na quinzena, com NF, sem NF, pago, saldo
- **Ações:** lançar compra, revisar e fechar a quinzena, imprimir/salvar o fechamento em PDF
- **Ao clicar:** abre o extrato do fornecedor naquela obra
- **Vazio:** "Nenhuma compra lançada nesta obra nesta quinzena."
- Fornecedor é cadastrado uma vez e usado em todas as obras
- **Empreiteiro que entra com material e mão de obra:** no mesmo lançamento, o botão "Dividir em categorias" separa o valor (ex.: R$ 4.000 Material + R$ 6.000 Mão de obra). Vira duas compras ligadas pelo mesmo nº de pedido, e as duas entram no mesmo fechamento e na mesma NF

### Lista de compras
- **Quem monta:** o engenheiro (ou auxiliar com Financeiro). O mestre não usa.
- **Por obra:** item, quantidade, unidade, para quando, fornecedor sugerido (opcional), observação
- **Status:** A comprar · Comprado · Cancelado
- **Visão de todas as obras**, agrupada por fornecedor sugerido, para comprar do mesmo fornecedor para várias obras de uma vez
- **"Pedir no WhatsApp":** abre o WhatsApp do fornecedor com a lista dos itens (separados por obra) já escrita
- **"Gerar compra":** marca os itens e transforma em compra (fornecedor, valor, categoria). Os itens viram "Comprado" e a compra entra no fluxo normal: Aguardando NF → fechamento → pagamento

### Notas Fiscais
- **Abre em:** compras por status: **Aguardando NF · NF recebida · Paga**
- **Ações:** anexar NF (foto ou PDF) a uma ou mais compras, **"Cobrar NF no WhatsApp"** com mensagem pronta, ligar NF ao pagamento
- **Vazio:** "Nenhuma nota pendente."
- Visão "Notas pendentes de todas as obras" no menu principal

### Pagamentos
- Fornecedor, quinzena, valor, data, forma (Pix / Boleto / Transferência / Dinheiro), comprovante, NFs ligadas
- Pagamento sem NF fica marcado em vermelho "Sem nota"

### Lista de Presença
- O dia de hoje com os funcionários da obra; Presente / Falta / Atestado / Folga; "Repetir presença de ontem"; exportar o mês
- Lança: mestre da obra ou engenheiro (e auxiliar liberado)

### Diárias da quinzena (mão de obra paga por diária)
- Cada funcionário diarista tem o **valor da diária** (só engenheiro e auxiliar com Financeiro veem; o mestre nunca)
- Por quinzena: dias "Presente" × diária = **valor a pagar por funcionário**, com total da obra
- Marcar a quinzena de diárias como **Paga** (data e forma) e exportar a lista
- Esse valor entra no gasto de **Mão de obra** da obra

### Diário de Obra
- Data, clima manhã/tarde (Bom / Nublado / Chuva / Impraticável), efetivo do dia (vem da presença), serviços executados, ocorrências, fotos; exportar período em PDF

### Planilha da licitação (no cadastro da obra) — *acrescentado em 17/11/2026*
- Seção "Planilha da licitação" nos dados da obra, só para o engenheiro
- **Anexa o arquivo .xlsx** da planilha vencida na licitação. O sistema lê, mostra uma prévia com as colunas identificadas (item, código, descrição, unidade, quantidade, preço unitário, total), aponta as linhas com erro e só salva depois que o engenheiro confirma
- **Fiel à planilha:** linha sem código (só item, descrição e total) é **etapa** ou subetapa, em até 3 níveis ("3" → "3.1" → "3.1.1"); linha com código e banco é **item do contrato**, ligado à etapa de cima. Números, nomes e ordem ficam exatamente como na planilha: **nada é renomeado**. A etapa é identificada **pelo número**, nunca pelo nome, e aparece sempre com ele ("3 – FUNDAÇÕES", "23 – FUNDAÇÕES"), porque a planilha pode repetir nomes (na escola de Aporá, as etapas 21 a 33 são a quadra e repetem os nomes das 1 a 20)
- **Itens com quantidade 0 entram** e ficam zerados (planilha de retomada traz os serviços já executados com quantidade 0). Aparecem na planilha e na Medição
- Guarda também **código, banco** (SINAPI, ORSE, SEINFRA, Próprio) e a **referência** de preços (ex.: "SINAPI 03/2024"), que o boletim de medição costuma pedir
- A obra ganha o campo **% de BDI** (guardado junto da planilha, fora do alcance do mestre), **pré-preenchido com o BDI do cabeçalho da planilha** (Aporá: 27,70%). Um segundo BDI no cabeçalho é ignorado
- **Custo orçado (sem BDI):** vem da coluna **"Valor Unit"** sem BDI da planilha, quando ela existe (o BDI de cada item varia um pouco por arredondamento, e dividir pelo BDI daria diferença). Só na planilha sem essa coluna o custo é o preço ÷ (1 + BDI). É esse custo, e não o preço de venda, que entra no Orçado x Realizado
- **Conferências na prévia:** soma dos itens × "Total Geral" da planilha ("bate ✓" ou a diferença) e soma sem BDI × "Total sem BDI" (mostra a diferença de centavos, sem bloquear)
- **Reimportar:** enquanto a obra não tiver nenhuma medição, uma planilha nova substitui a antiga (as compras continuam ligadas às etapas de mesmo número). Depois da 1ª medição, a importação fica bloqueada, porque a medição usa as quantidades da planilha
- A mesma planilha alimenta o Orçado x Realizado (fase 1), a Medição (fase 3) e o cronograma (v2): nada é digitado duas vezes

### Orçado x Realizado — *acrescentado em 17/11/2026*
- **Por etapa da planilha.** Ao lançar uma compra numa obra com planilha, a **etapa é obrigatória**, com a opção **"Sem etapa / Administração"** para o que não é de etapa nenhuma (combustível, EPI, escritório). A compra dividida em categorias usa a mesma etapa nas duas partes
- Mostra, por etapa: orçado (custo sem BDI), realizado (compras daquela etapa) e diferença em R$ e em %, com destaque para as etapas que estouraram. Mais duas linhas fora das etapas: **Administração** (compras sem etapa) e **Mão de obra própria** (diárias dos diaristas, que não têm etapa). Total da obra no fim
- **Obra sem planilha:** o módulo aparece com o aviso "Importe a planilha da licitação para comparar com o orçado" e mostra o realizado por categoria. Nessas obras a compra não pede etapa
- Quem vê: engenheiro e quem tem Financeiro na obra. O mestre nunca vê

### Fluxo de Caixa — *acrescentado em 17/11/2026*
- Saldo por obra, **mês a mês**: realizado nos meses passados, previsto nos próximos
- **Saídas:** pagamentos a fornecedores, diárias pagas, e o que está a pagar (compras ainda não pagas, diárias em aberto)
- **Entradas: pelas medições.** Cada medição aprovada vira um valor a receber do órgão; o engenheiro marca a data e o valor que caiu na conta
- **Fases:** as saídas entram já na **fase 1**; as entradas chegam com a Medição, na **fase 3**. Até lá, o fluxo mostra só o que sai
- Quem vê: engenheiro e quem tem Financeiro na obra. O mestre nunca vê

### Medição (v1)
- Itens do contrato **vindos da planilha da licitação** (importada no cadastro da obra); medições numeradas com quantidade executada por item; medido, acumulado e saldo; status Rascunho / Enviada / Aprovada; registrar o recebimento (data e valor que caiu na conta); imprimir boletim em PDF e exportar CSV

### Equipe e Permissões
- Funcionários da obra (para a presença) e usuários com acesso à obra, com as liberações de cada um

## Unidade principal

**Obra** — vai existir mais de uma? **sim (7 hoje)**. Alguém trabalha em mais de uma ao mesmo tempo? **sim** (engenheiro e auxiliar; a maioria dos mestres tem uma obra só, mas alguns ficam em mais de uma)

## Perfis de usuário

- **Engenheiro (admin):** vê e faz tudo, em todas as obras · primeira tela: Painel de Obras
- **Mestre de obras:** lança presença, diário e fotos nas obras dele; **não vê nenhum valor em R$** · primeira tela: Presença de hoje (se tiver mais de uma obra, escolhe a obra no topo)
- **Auxiliar (estagiário/funcionário):** faz o que o engenheiro liberar, obra por obra, módulo por módulo. Liberado em Financeiro, vê os pagamentos de todos os fornecedores daquela obra (confirmado) · primeira tela: Painel de Obras (só as obras dele)

### Matriz de permissões

| Ação | Engenheiro | Mestre | Auxiliar |
|---|---|---|---|
| Ver obras | todas | só as dele | só as liberadas |
| Lançar presença / diário / fotos | sim | sim | se liberado em Presença e Diário |
| Ver valores (compras, NF, pagamentos, medição) | sim | **não** | se liberado (confirmado) |
| Lançar compra / anexar NF / registrar pagamento | sim | não | se liberado em Financeiro |
| Fechar quinzena | sim | não | se liberado em Financeiro |
| Lançar e aprovar medição | sim | não | se liberado em Medição |
| Importar a planilha da licitação e definir o % de BDI | sim | não | não |
| Ver Orçado x Realizado e Fluxo de Caixa | sim | **não** | se liberado em Financeiro |
| Registrar o recebimento de uma medição | sim | não | se liberado em Financeiro |
| Editar o próprio lançamento | sim | sim | sim |
| Editar o dos outros | sim | não | não |
| Apagar | sim | não | não |
| Criar / editar obra | sim | não | não |
| Gerenciar usuários e liberações | sim | não | não |
| Quem não fez login | não vê nada | | |

## Fluxo de cadastro

1. A pessoa se cadastra com email e senha
2. Entra sem perfil e não vê nada
3. Vê "Conta aguardando liberação do administrador"
4. O engenheiro libera, escolhe o perfil, as obras e (para o auxiliar) as liberações

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | assinatura atual |
| React + Vite | a interface | grátis |
| Supabase | banco, login, fotos e notas | grátis até crescer |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |
| SheetJS | ler a planilha .xlsx da licitação (carregado só na tela de importação) | grátis |

**Total por mês:** R$ 0 no início. Com fotos e notas de 7 obras, o espaço grátis do Supabase (1 GB de arquivos) pode acabar em alguns meses; o plano pago começa em US$ 25/mês.
**O que custaria a alternativa pronta:** [PENDENTE]

## Prazo

- **Quer usar de verdade em:** [PENDENTE]
- **Horas por semana disponíveis:** [PENDENTE]

---

# 2. Insights do Mercado

## Benchmark (pesquisado em 16/11/2026; nenhum mostra preço aberto no site)

### Obra na Mão (já usado pelo engenheiro)
- Site/preço: não encontrado na busca
- **Por que não deu certo:** precisava da autorização do engenheiro para tudo; a equipe ficava parada esperando.
- **Regra que nasce disso:** liberação uma vez, por obra e por módulo; depois, sem fila de aprovação.

### Sienge Plataforma + Prevision
- Site: sienge.com.br · Preço: sob orçamento (não publicado)
- Faz bem: ERP completo de construtora; diário de obra e mão de obra ligados ao financeiro
- Falta: grande e caro para quem toca obra pública sozinho; não foca em cobrar NF por quinzena

### OrçaFascio — Diário de Obras
- Site: orcafascio.com/diario-de-obras · Preço: não encontrado
- Faz bem: diário de obra no celular, funciona sem internet; forte em orçamento de obra pública
- Falta: não junta compra, NF e pagamento por fornecedor

### Brickup RDO
- App de celular · Preço: não encontrado
- Faz bem: diário de obra com parte financeira
- Falta: [PENDENTE: não testado]

## Por que ainda vale construir o meu

Porque o sistema anterior travava a equipe com aprovação para tudo; o meu libera uma vez e deixa cada um trabalhar. E nenhum dos que achei junta, do jeito que eu trabalho, **fechamento quinzenal por fornecedor + cobrança de NF + presença pelo mestre** em obra pública. Os completos são ERPs caros cheios de coisa que eu não uso; os simples fazem só o diário.

## Referências de interface

- **Usa mais em:** **os dois** — celular no canteiro e computador no escritório. Mestre: celular.
- **Cor principal:** laranja de canteiro `#E8622A`
- **Tema:** claro (melhor no sol do canteiro)
- **Logo:** sem logo (nome "Minha Obra" no topo)

---

# 3. Arquitetura

## Mapa de telas

```
Login · Criar conta · Aguardando liberação
└── Engenheiro e Auxiliar
    ├── Obras (início)  ↔  Gastos (tabela obra × categoria)
    │   └── Obra
    │       ├── Dados da obra → Planilha da licitação (importar .xlsx, prévia, % de BDI; só engenheiro)
    │       ├── Resumo
    │       ├── Orçado x Realizado (por etapa)
    │       ├── Fluxo de caixa (mês a mês)
    │       ├── Lista de compras
    │       ├── Fornecedores → Extrato do fornecedor → Fechamento da quinzena
    │       ├── Notas fiscais
    │       ├── Pagamentos
    │       ├── Presença → Diárias da quinzena (só com Financeiro)
    │       ├── Diário → Dia
    │       ├── Medição → Itens do contrato · Medição nº X
    │       └── Equipe (funcionários e acessos)
    ├── Notas pendentes (todas as obras)
    ├── Lista de compras (todas as obras)
    ├── Fornecedores (cadastro geral)
    ├── Relatórios (exportar por obra e período; auxiliar só os liberados)
    ├── Usuários (só engenheiro)
    └── Meu perfil
└── Mestre
    ├── Presença de hoje (início)
    ├── Diário → Dia
    └── Meu perfil
```

**Navegação:** celular com barra inferior — engenheiro/auxiliar: Obras · Compras · Notas · Fornecedores · Mais (Relatórios fica dentro de Mais); mestre: Presença · Diário · Perfil. Computador: menu lateral com os mesmos itens, Relatórios como item próprio, e nome e perfil da pessoa no alto. Dentro da obra, grade de módulos com a pendência de cada um; dentro do módulo, faixa com sub-abas e o botão principal. No computador, caminho clicável "Início › Obras › obra › módulo". *(Layout revisto em 17/11/2026.)*

## Processos automáticos (1 na v1)

### Fechamento quinzenal automático
- **Gatilho:** dia 1º e dia 16 de cada mês, às 6h
- **Passos:** 1. pega as compras da quinzena que terminou, por obra e por fornecedor 2. cria um fechamento "Rascunho" para cada par obra + fornecedor que teve compra 3. liga as compras ao fechamento
- **Resultado:** no Painel aparece "X fechamentos para revisar"; quem tem permissão revisa e fecha
- **Se der errado:** o botão "Gerar fechamento da quinzena" faz o mesmo na mão, e não duplica se já existir

O aviso "Presença não lançada" não é processo automático: a tela calcula na hora (depois das 10h, sem presença do dia = vermelho).

## Modelagem de dados (detalhe no PRD-BACKEND)

profiles · obras · membros_obra · fornecedores · compras · fechamentos · notas_fiscais · pagamentos · funcionarios · presencas · diarios_obra · fotos · planilhas_obra · etapas_obra · itens_contrato · medicoes · medicao_itens · diarias_funcionarios · pagamentos_diarias · itens_lista_compra (20 tabelas)

*17/11/2026:* novas tabelas `planilhas_obra` (o arquivo e o % de BDI; fora de `obras` porque o mestre lê `obras` e o BDI revela a margem) e `etapas_obra` (as etapas da planilha); `itens_contrato` ganha a etapa; `compras` ganha `etapa_id`; `medicoes` ganha o recebimento (valor e data).

## A pergunta de um ano

- **Quanto gastei de mão de obra em cada obra?**
- **Quanto gastei com material?**
- **Quanto gastei com aluguel de ferramentas/equipamentos?**

Para isso, **toda compra tem categoria obrigatória**: Material · Mão de obra · Aluguel de equipamento · Serviço · Outros. O fornecedor tem uma categoria padrão que já vem preenchida. Empreiteiro que fornece material e mão de obra tem o valor dividido entre as duas categorias.

*Acrescentado em 17/11/2026:* **Quanto gastei em cada etapa da obra, comparado com o orçado na licitação?** Para isso, toda compra numa obra com planilha tem **etapa obrigatória** (ou "Sem etapa / Administração"), e o orçado é o custo da planilha sem o BDI.

A mão de obra é paga de dois jeitos (confirmado): **empreiteiros** (entram como fornecedor, categoria Mão de obra) e **diaristas** (presença × diária). Então **Mão de obra da obra = compras de Mão de obra + diárias da obra**, e a tela Gastos mostra as duas partes separadas.

## Melhorias para a v2

- **Cronograma físico-financeiro** (etapas × meses, previsto × medido, curva) — deixado de fora por decisão do engenheiro em 16/11/2026. Vai usar as etapas e os itens da planilha da licitação e as medições que a v1 já guarda, então nada precisa ser refeito
- Cotação com vários fornecedores na lista de compras — não pedido na v1
- Envio automático de WhatsApp (API paga) — cortado: custo e manutenção
- Funcionar sem internet no canteiro — cortado: complica muito a v1
- ~~Importar arquivo .xlsx direto — na v1 é colar as linhas copiadas do Excel~~ — **mudou em 17/11/2026:** a planilha da licitação é anexada como .xlsx já na fase 1
- Controle de estoque — fora de escopo

**Tamanho da v1:** cerca de 27 telas (com Relatórios, Planilha da licitação, Orçado x Realizado e Fluxo de caixa), 20 tabelas, 1 processo, 3 perfis. É grande, por isso a construção vai em **3 fases**, e o sistema começa a ser usado já na fase 1:

1. **Fase 1 — Financeiro e presença** (a dor principal): login e liberações, obras, **planilha da licitação (etapas e itens do contrato, % de BDI)**, fornecedores, lista de compras, compras (com etapa), notas fiscais, pagamentos, fechamento quinzenal, funcionários, presença, diárias, gastos, **Orçado x Realizado**, **Fluxo de caixa (saídas)**
2. **Fase 2 — Diário de obra** com fotos
3. **Fase 3 — Medição** (boletins sobre os itens já importados) e **entradas do Fluxo de caixa** (recebimento de cada medição)

Se o prazo apertar, a fase 3 é a primeira a ficar para depois.

---

# A conta que vai chegar depois

- `[PENDENTE: prazo e horas por semana]` — custo: sem isso não dá para saber se a v1 cabe; a construção começa pela parte financeira, que é a dor principal
- `[PENDENTE: preço das alternativas prontas]` — custo: fica sem a régua de retorno

# Decidir depois de usar

- `[DESCOBRIR NO USO: quantos dias de espera de NF viram alerta]` — por enquanto ficou: 7 dias
- `[DESCOBRIR NO USO: marcar entrega do material na obra]` — por enquanto ficou: a lista vai só até "Comprado"
- `[DESCOBRIR NO USO: meia diária]` — por enquanto ficou: cada "Presente" vale 1 diária inteira
- `[DESCOBRIR NO USO: diarista que muda de valor]` — por enquanto ficou: a diária tem data de início; vale o valor vigente no dia trabalhado
- `[DESCOBRIR NO USO: hora do aviso de presença não lançada]` — por enquanto ficou: 10h
- `[DESCOBRIR NO USO: texto da mensagem de cobrança de NF]` — por enquanto ficou o modelo do PRD-FRONTEND
- `[DESCOBRIR NO USO: BDI diferenciado por item (ex.: materiais)]` — por enquanto ficou: um % de BDI só, por obra, como informação; o custo vem da coluna sem BDI de cada item
- `[DESCOBRIR NO USO: formato das planilhas de licitação]` — por enquanto ficou: o leitor foi feito em cima da planilha real da escola de Aporá (aba única, cabeçalho solto nas linhas de cima, tabela de "Item" a "Peso"). Ele acha a linha de cabeçalho procurando "Item" e "Descrição", reconhece as colunas pelo nome com variações ("Quant."/"Quantidade", "Und"/"Unid."), para na linha "Total sem BDI"/"Total Geral" e deixa corrigir na prévia qual coluna é qual
- `[DESCOBRIR NO USO: data prevista de recebimento de medição]` — por enquanto ficou: 30 dias depois da aprovação, editável
