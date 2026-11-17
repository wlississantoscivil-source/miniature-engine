# PRD Backend — Minha Obra

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `diarios_obra`.
- Colunas em minúsculo com underline: `data_inicio`, `fornecedor_id`.
- Toda tabela tem `id` (uuid gerado pelo banco) e `created_at` (timestamptz automático).
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface (com acento e maiúscula, como escrito aqui).
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`. Quantidades de medição como `numeric(14,4)`.
- Foto e PDF vão para o Storage; o banco guarda só o caminho do arquivo.
- **Rastro:** toda tabela de lançamento tem `criado_por` (uuid → profiles) preenchido automaticamente com o usuário logado, e `updated_at` / `atualizado_por` atualizados a cada edição. É o "histórico" que substitui a fila de aprovação.

---

## Unidade principal

**Obra.** Vai existir mais de uma: **sim** (7 hoje). Tabela `obras`, coluna `obra_id` em toda tabela que pertence a uma obra, e tabela `membros_obra` dizendo quem trabalha em qual obra e com que liberações. Uma pessoa pode estar em várias obras.

Exceção: `fornecedores` é **global** (o mesmo fornecedor atende várias obras); o vínculo com a obra está nas compras.

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login (a mesma pessoa) |
| nome | text | sim | |
| email | text | sim | único |
| whatsapp | text | não | |
| role | text | sim | CHECK: `Pendente`, `Engenheiro`, `Mestre`, `Auxiliar`. Padrão `Pendente` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

Criado automaticamente por um gatilho quando alguém se cadastra, já como `Pendente`, com nome e whatsapp vindos do formulário de cadastro.

---

## Tabela `obras`

Para que serve: cada obra tocada pelo engenheiro.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| tipo | text | sim | CHECK: `Escola`, `UBS`, `Refeitório`, `Outro` |
| orgao_contratante | text | sim | |
| numero_contrato | text | não | |
| endereco | text | não | |
| data_inicio | date | sim | |
| data_prevista_fim | date | não | |
| status | text | sim | CHECK: `Em andamento`, `Paralisada`, `Concluída`. Padrão `Em andamento` |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Relações:** tem vários membros_obra, compras, fechamentos, notas_fiscais, pagamentos, funcionarios, presencas, diarios_obra, fotos, itens_contrato, medicoes.
**Regra de negócio:** **nenhum valor em R$ mora nesta tabela**, porque o mestre lê obras. O valor do contrato é a soma de `itens_contrato`. Pelo mesmo motivo, o % de BDI e o arquivo da planilha da licitação moram em `planilhas_obra`, e não aqui (o BDI revela a margem da obra).

---

## Tabela `planilhas_obra` *(17/11/2026)*

Para que serve: a planilha da licitação de cada obra (uma por obra) e o % de BDI usado para tirar o custo do preço.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; **único** (uma planilha por obra) |
| bdi_percentual | numeric(5,2) | sim | padrão 0; entre 0 e 100. Ex.: 27,70. Pré-preenchido com o BDI do cabeçalho da planilha; é **informação** (o custo vem de `itens_contrato.custo_unitario`) |
| objeto | text | não | do cabeçalho da planilha, ex.: "CONCLUSÃO DE CONSTRUÇÃO DE ESCOLA…" |
| referencia_precos | text | não | ex.: "SINAPI 03/2024, ORSE 02/2024, SEINFRA 028" |
| total_geral_planilha | numeric(14,2) | não | o "Total Geral" lido do arquivo, para conferência |
| total_sem_bdi_planilha | numeric(14,2) | não | o "Total sem BDI" lido do arquivo, para conferência |
| arquivo_path | text | não | Storage, bucket `planilhas`; vazio enquanto só o BDI foi preenchido |
| arquivo_nome | text | não | nome original do .xlsx |
| importada_em | timestamptz | não | |
| importada_por | uuid | não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Regras de negócio:**
- **Custo orçado de um item = quantidade × custo_unitario**, onde `custo_unitario` é a coluna "Valor Unit" (sem BDI) da planilha. Só quando a planilha não tem essa coluna, a importação grava `custo_unitario = preco_unitario ÷ (1 + bdi_percentual/100)`. *(Motivo: na planilha real de Aporá o BDI de cada item varia entre 26,2% e 27,7% por arredondamento; dividir pelo BDI da obra daria diferença.)*
- **Fiel à planilha:** números, nomes e ordem das etapas e dos itens ficam como no arquivo; nada é renomeado. Itens com quantidade 0 são gravados (planilha de retomada).
- **Reimportar:** enquanto a obra não tiver nenhuma linha em `medicoes`, a importação nova apaga as etapas e os itens antigos e grava os novos, numa transação só. As compras são religadas à etapa nova de mesmo `numero`; as que não acharem ficam com `etapa_id` vazio (= Administração), e a função devolve quantas foram. **Com medição, o banco recusa a reimportação.**
- A leitura do .xlsx acontece no navegador; o banco recebe as etapas e os itens já validados, por uma função (`importar_planilha(obra_id, bdi, etapas, itens)`) que faz tudo ou nada.

---

## Tabela `etapas_obra` *(17/11/2026)*

Para que serve: as etapas da planilha da licitação (linhas de agrupamento, ex.: "3. ALVENARIA"). São a estrutura da obra para o Orçado x Realizado, a Medição e o cronograma (v2).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| numero | text | sim | como está na planilha, sem os espaços em volta: "3", "3.1", "3.1.1" |
| nome | text | sim | exatamente como na planilha (pode ter quebra de linha), ex.: "FUNDAÇÕES" |
| nivel | integer | sim | 1, 2 ou 3 (quantas partes tem o número) |
| etapa_pai_id | uuid | não | → etapas_obra; vazio no nível 1 |
| ordem | integer | sim | ordem da planilha |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (obra_id, numero); (obra_id, ordem).
**Regras de negócio:**
- Nenhum valor em R$ aqui; o orçado da etapa é a soma do custo dos seus itens e das suas subetapas.
- **A etapa é identificada pelo `numero`, nunca pelo `nome`:** a mesma planilha repete nomes (em Aporá, "3 FUNDAÇÕES" e "23 FUNDAÇÕES"). Toda tela mostra "numero – nome".

---

## Tabela `membros_obra`

Para que serve: quem trabalha em qual obra e o que pode fazer nela. O engenheiro não precisa de linha aqui: ele vê todas.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| profile_id | uuid | sim | → profiles |
| pode_financeiro | boolean | sim | padrão falso; compras, NF, pagamentos, fechamentos, fornecedores |
| pode_presenca_diario | boolean | sim | padrão falso; funcionários, presença, diário, fotos |
| pode_medicao | boolean | sim | padrão falso; itens de contrato e medições |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (obra_id, profile_id); profile_id.
**Regra de negócio:** se o perfil da pessoa é `Mestre`, `pode_presenca_diario` é sempre verdadeiro e `pode_financeiro` e `pode_medicao` são sempre falsos (o banco força, não só a tela).

---

## Tabela `fornecedores`

Para que serve: cadastro único de fornecedores, usado em todas as obras.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| documento | text | não | CNPJ ou CPF |
| contato | text | não | |
| whatsapp | text | não | só números, com DDD |
| chave_pix | text | não | |
| categoria_padrao | text | sim | CHECK: `Material`, `Mão de obra`, `Aluguel de equipamento`, `Serviço`, `Outros` |
| ativo | boolean | sim | padrão verdadeiro |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** nome.

---

## Tabela `compras`

Para que serve: cada compra ou serviço contratado de um fornecedor numa obra. É a base do fechamento, da cobrança de NF e da pergunta "quanto gastei com o quê".

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| fornecedor_id | uuid | sim | → fornecedores |
| data | date | sim | |
| descricao | text | sim | |
| categoria | text | sim | CHECK: `Material`, `Mão de obra`, `Aluguel de equipamento`, `Serviço`, `Outros` |
| valor | numeric(14,2) | sim | maior que zero |
| numero_pedido | text | não | |
| grupo_id | uuid | não | preenchido quando a compra foi dividida em categorias; as partes têm o mesmo `grupo_id` |
| etapa_id | uuid | não | → etapas_obra *(17/11/2026)*. Vazio = "Sem etapa / Administração". A etapa tem que ser da mesma obra |
| observacao | text | não | |
| quinzena_inicio | date | sim | calculada pelo banco a partir de `data`: dia 1 ou dia 16 do mês |
| status | text | sim | CHECK: `Aguardando NF`, `NF recebida`, `Paga`. Padrão `Aguardando NF` |
| nota_fiscal_id | uuid | não | → notas_fiscais |
| fechamento_id | uuid | não | → fechamentos |
| criado_por, atualizado_por | uuid | sim / não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, quinzena_inicio); (fornecedor_id, status); (obra_id, categoria, data).
**Regras de negócio:**
- O status é mantido pelo banco: ganhou `nota_fiscal_id` → `NF recebida`; a NF ganhou pagamento → `Paga`; perdeu a NF → volta para `Aguardando NF`.
- Compra ligada a um fechamento `Fechado` só pode ser editada ou apagada pelo Engenheiro.
- Compras do mesmo `grupo_id` são sempre da mesma obra, fornecedor, data, quinzena **e etapa**, e recebem juntas a mesma NF (anexar NF a uma parte anexa a todas).
- Etapa: a tela obriga a escolher (uma etapa ou "Sem etapa / Administração") quando a obra tem planilha; no banco, `etapa_id` vazio quer dizer Administração.

---

## Tabela `itens_lista_compra`

Para que serve: o que precisa ser comprado para cada obra, antes de virar compra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| descricao | text | sim | |
| quantidade | numeric(14,4) | não | |
| unidade | text | não | |
| para_quando | date | não | |
| fornecedor_sugerido_id | uuid | não | → fornecedores |
| observacao | text | não | |
| status | text | sim | CHECK: `A comprar`, `Comprado`, `Cancelado`. Padrão `A comprar` |
| compra_id | uuid | não | → compras; preenchido ao gerar a compra |
| criado_por, atualizado_por | uuid | sim / não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, status); (fornecedor_sugerido_id, status).
**Regras de negócio:**
- Ao ligar `compra_id`, o status vira `Comprado`; a compra precisa ser da mesma obra do item.
- Se a compra ligada for apagada, os itens voltam para `A comprar`.

---

## Tabela `fechamentos`

Para que serve: o fechamento quinzenal de um fornecedor dentro de uma obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| fornecedor_id | uuid | sim | → fornecedores |
| quinzena_inicio | date | sim | dia 1 ou 16 |
| quinzena_fim | date | sim | dia 15 ou último dia do mês |
| status | text | sim | CHECK: `Rascunho`, `Fechado`. Padrão `Rascunho` |
| fechado_por | uuid | não | → profiles |
| fechado_em | timestamptz | não | |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (obra_id, fornecedor_id, quinzena_inicio).
**Regra de negócio:** totais (comprado, com NF, sem NF, pago, saldo) são calculados a partir das compras e pagamentos ligados, não guardados. Reabrir (`Fechado` → `Rascunho`) só o Engenheiro.

---

## Tabela `notas_fiscais`

Para que serve: as NFs recebidas dos fornecedores, cada uma cobrindo uma ou mais compras.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| fornecedor_id | uuid | sim | → fornecedores |
| numero | text | sim | |
| data_emissao | date | sim | |
| valor | numeric(14,2) | sim | |
| arquivo_path | text | sim | caminho no Storage (bucket `notas`) |
| arquivo_tipo | text | sim | CHECK: `imagem`, `pdf` |
| pagamento_id | uuid | não | → pagamentos |
| criado_por, atualizado_por | uuid | sim / não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Relações:** tem várias compras (compras.nota_fiscal_id); pertence a um pagamento.
**Regra de negócio:** compras e NF precisam ser da mesma obra e do mesmo fornecedor. Valor diferente da soma das compras é permitido (a tela só avisa).

---

## Tabela `pagamentos`

Para que serve: cada pagamento feito a um fornecedor numa obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| fornecedor_id | uuid | sim | → fornecedores |
| fechamento_id | uuid | não | → fechamentos |
| data | date | sim | |
| valor | numeric(14,2) | sim | maior que zero |
| forma | text | sim | CHECK: `Pix`, `Boleto`, `Transferência`, `Dinheiro` |
| comprovante_path | text | não | Storage, bucket `comprovantes` |
| observacao | text | não | |
| criado_por, atualizado_por | uuid | sim / não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Relações:** tem várias notas_fiscais (notas_fiscais.pagamento_id). "Sem nota" = pagamento sem nenhuma NF ligada.

---

## Tabela `funcionarios`

Para que serve: as pessoas do canteiro que entram na lista de presença (não são usuários do sistema).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; obra atual |
| nome | text | sim | |
| funcao | text | não | ex.: Pedreiro, Servente |
| vinculo | text | sim | CHECK: `Diarista`, `Do empreiteiro`. Padrão `Diarista` |
| chave_pix | text | não | |
| ativo | boolean | sim | padrão verdadeiro |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** funcionário nunca é apagado se tiver presença; é desativado. Mover de obra muda `obra_id`; a presença antiga continua na obra antiga (cada presença guarda sua obra).

---

## Tabela `presencas`

Para que serve: a presença diária de cada funcionário.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| funcionario_id | uuid | sim | → funcionarios |
| data | date | sim | |
| situacao | text | sim | CHECK: `Presente`, `Falta`, `Atestado`, `Folga` |
| criado_por, atualizado_por | uuid | sim / não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Índices úteis:** único (funcionario_id, data); (obra_id, data).
**Regra de negócio:** Mestre só cria/edita presença com `data` entre hoje e 3 dias atrás. "Presença de hoje lançada" = existe ao menos uma presença da obra com data de hoje. Presença de quinzena com diárias `Paga` (ver `pagamentos_diarias`) só o Engenheiro corrige.

---

## Tabela `diarias_funcionarios`

Para que serve: o valor da diária de cada diarista, com histórico. **Separada de `funcionarios` de propósito**, para o mestre ler funcionários sem enxergar valor.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras (a do funcionário quando foi cadastrada; usada na permissão) |
| funcionario_id | uuid | sim | → funcionarios |
| valor | numeric(14,2) | sim | maior que zero |
| vigente_desde | date | sim | |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (funcionario_id, vigente_desde).
**Regra de negócio:** a diária de um dia é a linha com o maior `vigente_desde` menor ou igual àquele dia. Só vale para funcionário com vínculo `Diarista`.

---

## Tabela `pagamentos_diarias`

Para que serve: registra que as diárias de uma obra numa quinzena foram pagas.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| quinzena_inicio | date | sim | dia 1 ou 16 |
| quinzena_fim | date | sim | |
| valor_total | numeric(14,2) | sim | total calculado no momento do pagamento (fica congelado) |
| data_pagamento | date | sim | |
| forma | text | sim | CHECK: `Pix`, `Transferência`, `Dinheiro` |
| observacao | text | não | |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (obra_id, quinzena_inicio).
**Regra de negócio:** o valor a pagar por funcionário não é guardado; é calculado (dias `Presente` × diária vigente de cada dia). Apagar a linha = reabrir a quinzena (só Engenheiro).

---

## Tabela `diarios_obra`

Para que serve: o diário de obra, um por dia por obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| data | date | sim | |
| clima_manha | text | sim | CHECK: `Bom`, `Nublado`, `Chuva`, `Impraticável` |
| clima_tarde | text | sim | CHECK: `Bom`, `Nublado`, `Chuva`, `Impraticável` |
| servicos | text | sim | |
| ocorrencias | text | não | |
| criado_por, atualizado_por | uuid | sim / não | → profiles |
| created_at, updated_at | timestamptz | sim | automático |

**Índices úteis:** único (obra_id, data).
**Regra de negócio:** o efetivo não é guardado; é a contagem de `Presente` em presencas da mesma obra e data. Mestre edita só diários com data até 3 dias atrás.

---

## Tabela `fotos`

Para que serve: fotos do diário.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| diario_id | uuid | sim | → diarios_obra |
| arquivo_path | text | sim | Storage, bucket `fotos` |
| legenda | text | não | |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

---

## Tabela `itens_contrato`

Para que serve: os itens da planilha da licitação (base do Orçado x Realizado e da medição). **Passou para a fase 1 em 17/11/2026**: nasce da importação do .xlsx.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| etapa_id | uuid | sim | → etapas_obra *(17/11/2026)*; a etapa logo acima do item na planilha (pode ser de nível 1, 2 ou 3) |
| item | text | não | *(17/11/2026)* o número do item na planilha, ex.: "3.1.2" |
| banco | text | não | *(17/11/2026)* SINAPI, ORSE, SEINFRA, Próprio… como vier |
| custo_unitario | numeric(14,2) | sim | *(17/11/2026)* "Valor Unit" sem BDI da planilha |
| codigo | text | sim | código do banco, como texto e sem espaços em volta: "74209/001", "C0371" |
| descricao | text | sim | |
| unidade | text | sim | ex.: m², m³, un, kg |
| quantidade | numeric(14,4) | sim | contratada; pode ser 0 (item já executado antes de uma retomada) |
| preco_unitario | numeric(14,2) | sim | "Valor Unit com BDI" da planilha (o preço do contrato, usado na medição) |
| ordem | integer | sim | ordem da planilha |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, ordem).
**Regra de negócio:** item com alguma quantidade medida não pode ser apagado.

---

## Tabela `medicoes`

Para que serve: cada medição (boletim) da obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| numero | integer | sim | 1, 2, 3… |
| periodo_inicio | date | sim | |
| periodo_fim | date | sim | |
| status | text | sim | CHECK: `Rascunho`, `Enviada`, `Aprovada`. Padrão `Rascunho` |
| aprovado_por | uuid | não | → profiles |
| aprovado_em | timestamptz | não | |
| data_prevista_recebimento | date | não | *(17/11/2026)* pedida ao aprovar; padrão 30 dias depois |
| valor_recebido | numeric(14,2) | não | *(17/11/2026)* o que caiu na conta (pode ser menor que o medido: retenção, glosa) |
| data_recebimento | date | não | *(17/11/2026)* |
| recebido_por | uuid | não | → profiles *(17/11/2026)* |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (obra_id, numero).
**Regra de negócio:** medição `Aprovada` não aceita mudança nos itens; só o Engenheiro volta para `Rascunho`. O recebimento (`valor_recebido`, `data_recebimento`) só pode ser preenchido em medição `Aprovada`, por quem tem Financeiro na obra; medição recebida não volta para `Rascunho`.
**Por que o recebimento mora aqui e não numa tabela própria:** cada medição é paga uma vez pelo órgão. Se aparecer pagamento parcelado de uma medição, vira tabela `recebimentos` (decidir no uso).

---

## Tabela `medicao_itens`

Para que serve: a quantidade medida de cada item em cada medição.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras (repetida para facilitar a permissão) |
| medicao_id | uuid | sim | → medicoes |
| item_contrato_id | uuid | sim | → itens_contrato |
| quantidade | numeric(14,4) | sim | maior ou igual a zero |
| created_at | timestamptz | sim | automático |

**Índices úteis:** único (medicao_id, item_contrato_id).
**Regra de negócio:** acumulado anterior, saldo e valores são calculados, não guardados.

---

## Consultas de apoio (não são tabelas)

- **Gastos por obra e categoria:** soma de `compras.valor` agrupada por obra e categoria, num período, **mais** uma parte "Diárias" dentro de Mão de obra (consulta abaixo). Responde a pergunta de um ano (mão de obra, material, aluguel de equipamento).
- **Diárias por obra e período:** para cada presença `Presente` de funcionário `Diarista`, a diária vigente naquele dia; soma por funcionário, obra e quinzena. Mostra também diaristas sem diária cadastrada.
- **Homem-dia por obra:** contagem de `Presente` em presencas por obra e mês.
- **Orçado x Realizado por etapa** *(17/11/2026)*: para cada etapa da obra, orçado = soma de (quantidade × custo_unitario) dos itens dela e das subetapas; realizado = soma de `compras.valor` com aquele `etapa_id` ou de uma subetapa dela. Mais duas linhas: **Administração** (compras com `etapa_id` vazio) e **Mão de obra própria** (diárias: consulta abaixo). Obra sem planilha devolve só o realizado por categoria.
- **Fluxo de caixa por obra e mês** *(17/11/2026)*: saídas realizadas = `pagamentos` (pela data) + `pagamentos_diarias` (pela data_pagamento); saídas previstas = compras sem `Paga` menos o já pago em pagamentos sem NF do mesmo fornecedor e obra (no mês atual) + diárias de quinzenas sem pagamento (no mês do fim da quinzena); entradas *(fase 3)* = `medicoes.valor_recebido` pela `data_recebimento`, e medições aprovadas não recebidas pela `data_prevista_recebimento`. Saldo do mês e acumulado.
- **Atividades recentes da obra:** últimos lançamentos de compras, notas, pagamentos, presenças e diários da obra, com `criado_por` e `created_at`. Para o mestre, só presenças e diários.

Estas consultas respeitam as mesmas permissões das tabelas de origem.

---

## Permissões

Escrito em português. Vira RLS na hora de construir.

Definições usadas abaixo:
- **Engenheiro** = profile com role `Engenheiro` e ativo.
- **Membro da obra** = tem linha em membros_obra para aquela obra e está ativo.
- **Financeiro na obra** = Engenheiro, ou membro com `pode_financeiro`.
- **Presença na obra** = Engenheiro, ou membro com `pode_presenca_diario` (todo Mestre membro tem).
- **Medição na obra** = Engenheiro, ou membro com `pode_medicao`.
- `Pendente` e inativos não veem nada em nenhuma tabela.

### `profiles`
- **Ver:** a própria linha; o Engenheiro vê todas; membros veem nome dos colegas das mesmas obras (para mostrar "lançado por").
- **Criar:** só o gatilho de cadastro.
- **Editar:** a pessoa edita nome e whatsapp da própria; só o Engenheiro muda `role` e `ativo`.
- **Apagar:** ninguém (desativa).
- **Sem login:** nada.

### `obras`
- **Ver:** Engenheiro todas; membros só as suas.
- **Criar / Editar:** Engenheiro.
- **Apagar:** Engenheiro, só se a obra não tiver nenhum lançamento.
- **Sem login:** nada.

### `membros_obra`
- **Ver:** Engenheiro todas; cada pessoa vê as próprias linhas.
- **Criar / Editar / Apagar:** Engenheiro.

### `fornecedores`
- **Ver:** Engenheiro; quem tem Financeiro em pelo menos uma obra. Mestre nunca.
- **Criar / Editar:** Engenheiro; quem tem Financeiro em alguma obra.
- **Apagar:** Engenheiro, só sem compras (senão desativa).

### `compras`, `itens_lista_compra`, `notas_fiscais`, `pagamentos`, `fechamentos`
- **Ver:** Financeiro na obra.
- **Criar:** Financeiro na obra.
- **Editar:** Engenheiro qualquer; o autor (`criado_por`) com Financeiro, só o que ele lançou e só fora de fechamento `Fechado`. Fechar quinzena: Financeiro na obra. Reabrir: Engenheiro.
- **Apagar:** Engenheiro.
- **Mestre:** nada, em nenhuma obra.
- **Sem login:** nada.

### `funcionarios`, `presencas`, `diarios_obra`, `fotos`
- **Ver:** Presença na obra.
- **Criar:** Presença na obra (Mestre: presença e diário só de hoje até 3 dias atrás).
- **Editar:** Engenheiro qualquer; o autor, o que ele lançou (Mestre: dentro dos 3 dias). Presença de um funcionário lançada por outra pessoa pode ser corrigida por qualquer um com Presença na obra no mesmo dia (o mestre corrige a lista que o engenheiro lançou e vice-versa).
- **Apagar:** Engenheiro.
- **Sem login:** nada.

### `diarias_funcionarios`, `pagamentos_diarias`
- **Ver / Criar / Editar:** Financeiro na obra.
- **Apagar:** Engenheiro.
- **Mestre:** nada, em nenhuma obra.
- **Sem login:** nada.

### `planilhas_obra` *(17/11/2026)*
- **Ver:** Financeiro na obra ou Medição na obra.
- **Criar / Editar / importar:** Engenheiro.
- **Apagar:** Engenheiro, só sem medição.
- **Mestre:** nada.

### `etapas_obra` *(17/11/2026)*
- **Ver:** Financeiro na obra ou Medição na obra (a compra escolhe a etapa; a medição agrupa por etapa).
- **Criar / Editar / Apagar:** só pela importação da planilha (Engenheiro).
- **Mestre:** nada.

### `itens_contrato`, `medicoes`, `medicao_itens`
- **Ver `itens_contrato`:** Financeiro na obra ou Medição na obra *(17/11/2026: o Orçado x Realizado precisa do preço dos itens)*. Criar pela importação; editar e adicionar à mão: Engenheiro.
- **Registrar recebimento em `medicoes`:** Financeiro na obra.
- **Ver / Criar / Editar (medições):** Medição na obra.
- **Aprovar medição:** Medição na obra. Reabrir aprovada: Engenheiro.
- **Apagar:** Engenheiro.
- **Mestre:** nada.

### Storage
- Buckets privados: `notas`, `comprovantes` (regra de Financeiro na obra), `fotos` (regra de Presença na obra) e `planilhas` *(17/11/2026; ler: Financeiro ou Medição na obra; gravar: Engenheiro)*.
- Caminho do arquivo começa pelo `obra_id` (`<obra_id>/<arquivo>`), e é por ele que a permissão é conferida.
- Arquivos abertos por link temporário assinado.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra com nome, email, whatsapp (opcional) e senha.
2. O gatilho cria a linha em `profiles` com role `Pendente`. Ela não vê dado nenhum.
3. Ela vê "Conta aguardando liberação do administrador".
4. O Engenheiro, em Usuários, escolhe o perfil (`Mestre` ou `Auxiliar`, ou `Engenheiro`), cria as linhas em `membros_obra` para as obras dela e, para auxiliar, marca as liberações.
5. A partir daí ela lança sozinha, sem aprovação, dentro do que foi liberado.

O primeiro Engenheiro é definido à mão na instalação (o email do dono vira `Engenheiro`).

## Processos automáticos

### Fechamento quinzenal automático
- **Gatilho:** agendamento no banco, dia 1º e dia 16 de cada mês às 6h (horário de Brasília).
- **Passos:**
  1. Calcula a quinzena que acabou (dia 16 → 1 a 15 do mês; dia 1º → 16 ao último dia do mês anterior).
  2. Para cada par obra + fornecedor com compras nessa quinzena, cria um fechamento `Rascunho`, se ainda não existir.
  3. Liga essas compras (`fechamento_id`) ao fechamento.
- **Resultado:** o Painel mostra "X fechamentos para revisar" a quem tem Financeiro.
- **Se falhar:** nada se perde; o botão "Gerar fechamento da quinzena" roda a mesma rotina na mão. A rotina não duplica (índice único obra + fornecedor + quinzena). Compra lançada depois com data de quinzena já gerada é ligada ao fechamento ao ser salva, se ele ainda estiver `Rascunho`; se já estiver `Fechado`, só o Engenheiro consegue lançar.

## Arquivos

- Buckets `notas`, `comprovantes`, `fotos` e `planilhas`, privados, caminho `<obra_id>/<ano-mês>/<uuid>.<ext>`. O .xlsx original da licitação fica guardado para conferência (limite 10 MB).
- Imagem comprimida no navegador antes de subir (máx. 1200px, qualidade 0.8). PDF sobe como está (limite 10 MB).
- O banco guarda o caminho (`arquivo_path` / `comprovante_path`) e o tipo.

## Critérios de aceite

- [ ] Usuário recém-cadastrado (`Pendente`) não enxerga nenhuma linha de nenhuma tabela.
- [ ] Mestre não consegue ler nenhuma linha de compras, itens_lista_compra, notas_fiscais, pagamentos, fechamentos, fornecedores, itens_contrato, medicoes e medicao_itens, nem pela API direta.
- [ ] Mestre só vê obras, funcionários, presenças, diários e fotos das obras em que é membro.
- [ ] Auxiliar sem `pode_financeiro` numa obra não lê as compras dessa obra, mas lê as de outra obra em que tem.
- [ ] Mestre não consegue ler `diarias_funcionarios` nem `pagamentos_diarias`, nem pela API direta, mas lê `funcionarios` da obra dele.
- [ ] A diária usada em cada dia é a vigente naquele dia (troca de valor no meio da quinzena calcula certo).
- [ ] Anexar NF a uma parte de compra dividida liga a NF a todas as partes do mesmo grupo.
- [ ] Mestre e Auxiliar não conseguem apagar nada, nem o que é deles.
- [ ] Mestre não consegue lançar presença de 5 dias atrás.
- [ ] Ninguém além do Engenheiro edita compra de fechamento `Fechado`.
- [ ] Anexar NF a uma compra muda o status para `NF recebida`; ligar a NF a um pagamento muda para `Paga`.
- [ ] Rodar a geração de fechamento duas vezes na mesma quinzena não cria duplicata.
- [ ] O Engenheiro consegue trocar o perfil e as liberações de qualquer usuário.
- [ ] Os valores de status, tipo, categoria, clima, situação e forma do banco são idênticos aos da interface.
- [ ] Todo campo obrigatório recusa cadastro vazio.
- [ ] Arquivo de uma obra não abre para quem não tem a permissão dessa obra.
- [ ] Mestre não consegue ler `planilhas_obra`, `etapas_obra` nem `itens_contrato`, nem pela API direta.
- [ ] Importar a planilha numa obra com medição é recusado pelo banco.
- [ ] Reimportar sem medição troca etapas e itens e religa as compras à etapa de mesmo número; nenhuma compra é apagada.
- [ ] Compra com `etapa_id` de outra obra é recusada.
- [ ] As partes de uma compra dividida ficam sempre com a mesma etapa.
- [ ] Recebimento só é aceito em medição `Aprovada`.

## A conta que vai chegar depois

- `[PENDENTE: prazo e horas por semana]` — define quanto cabe em cada fase. Ordem das fases *(revista em 17/11/2026)*: 1) profiles, obras, membros_obra, fornecedores, **planilhas_obra, etapas_obra, itens_contrato**, itens_lista_compra, compras (com etapa), fechamentos, notas_fiscais, pagamentos, funcionarios, presencas, diarias_funcionarios, pagamentos_diarias · 2) diarios_obra, fotos · 3) medicoes (com o recebimento), medicao_itens.
- Cronograma físico-financeiro: fora da v1. Na v2 usa `itens_contrato` e `medicoes` (o realizado vem das medições aprovadas), então nenhuma tabela da v1 precisa mudar.

## Decidir depois de usar

- `[DESCOBRIR NO USO: janela de correção do mestre]` — por enquanto: 3 dias
- `[DESCOBRIR NO USO: meia diária]` — por enquanto: cada `Presente` vale 1 diária inteira
- `[DESCOBRIR NO USO: espaço do Storage]` — por enquanto: plano grátis; revisar quando passar de 700 MB
