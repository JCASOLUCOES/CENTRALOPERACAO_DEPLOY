192.168.2.154
banco: dbActyon_JCA
usuario: bussiness
senha: bsn@2018

banco de HML que estamos usando.

# IMPLEMENTAÇÃO — MÓDULO BANCO DE DADOS

## Central de Operação — JCA Soluções

Você está trabalhando em um projeto EXISTENTE chamado **Central de Operação**, localizado no repositório atual.

Sua missão é implementar um novo módulo chamado **Banco de Dados**, integrado à arquitetura e identidade visual já existentes.

---

# 1. REGRA PRINCIPAL

**NÃO crie um novo projeto.**

Antes de alterar qualquer arquivo:

1. Analise toda a estrutura atual do projeto.
2. Identifique:

   * frontend;
   * backend;
   * autenticação;
   * rotas;
   * serviços;
   * componentes reutilizáveis;
   * padrões de API;
   * padrões de tratamento de erros;
   * configuração de ambiente;
   * padrão visual;
   * sistema de navegação;
   * componentes de tabelas;
   * componentes de modais;
   * componentes de gráficos;
   * sistema de notificações;
   * logging;
   * testes existentes.
3. Identifique como a Central de Operação atualmente organiza seus módulos.
4. Reutilize o máximo possível da estrutura existente.
5. Não duplique componentes ou serviços que já existam.
6. Preserve todas as funcionalidades atuais.
7. Não faça refatorações não relacionadas a esta tarefa.

O resultado deve parecer que o módulo Banco de Dados sempre fez parte da Central de Operação.

---

# 2. CONTEXTO DA FUNCIONALIDADE

A Central de Operação possui documentação técnica do banco SQL Server do Actyon.

Existe documentação Markdown contendo informações como:

* tabelas;
* colunas;
* PKs;
* FKs;
* índices;
* procedures;
* functions;
* triggers;
* relacionamentos;
* modelo relacional;
* dicionário de dados.

Entretanto, essa documentação representa um retrato da estrutura em determinado momento.

O novo módulo deverá permitir consultar o **SQL Server REAL**, em tempo real.

Portanto:

## SQL Server = fonte de verdade da estrutura física atual.

## Markdown = fonte de verdade da documentação/conhecimento institucional.

O sistema deve ser capaz de trabalhar com as duas fontes sem misturá-las indevidamente.

---

# 3. NOVA ÁREA NO MENU

Adicionar ao menu principal:

> 🗄️ Banco de Dados

A área deverá possuir, preferencialmente, as seguintes subseções:

* Visão Geral
* Explorador
* Relacionamentos
* Diagrama
* Consultas
* Diferenças
* Configuração

Utilize o padrão de navegação já existente no projeto.

Não crie uma interface visual isolada do restante da aplicação.

---

# 4. VISÃO GERAL

Criar uma tela inicial apresentando informações obtidas diretamente do SQL Server.

Exibir cards como:

* Banco conectado
* Servidor
* Versão do SQL Server
* Quantidade de tabelas
* Quantidade de colunas
* Quantidade de PKs
* Quantidade de FKs
* Quantidade de índices
* Quantidade de Views
* Quantidade de Procedures
* Quantidade de Functions
* Quantidade de Triggers

Também apresentar:

### Status da conexão

Exemplo:

🟢 CONECTADO

ou

🔴 DESCONECTADO

Mostrar:

* servidor;
* banco;
* usuário conectado, quando aplicável;
* horário da última consulta;
* duração da consulta.

Nunca mostrar senha.

---

# 5. CONFIGURAÇÃO DA CONEXÃO

Criar uma tela para configuração da conexão SQL Server.

Campos:

* Servidor/IP
* Porta
* Banco de dados
* Usuário
* Senha
* Encrypt
* Trust Server Certificate

Botões:

> TESTAR CONEXÃO

> SALVAR CONEXÃO

## REGRAS DE SEGURANÇA

A senha:

* nunca deve ser enviada para o frontend além do necessário para autenticação da operação;
* nunca deve aparecer em logs;
* nunca deve aparecer em mensagens de erro;
* nunca deve ser retornada pela API;
* nunca deve ser armazenada em local público;
* nunca deve ser commitada no Git;
* nunca deve ficar hardcoded no código.

Preferir:

* variável de ambiente;
* Secret Manager;
* configuração protegida;
* ou mecanismo de secrets já existente no projeto.

Se o projeto já possuir padrão de configuração segura, reutilizá-lo.

---

# 6. BACKEND

O backend deverá ser responsável por toda comunicação com o SQL Server.

O frontend NÃO deve conectar diretamente no SQL Server.

Arquitetura:

```text
Angular
   ↓
API .NET
   ↓
Database Service
   ↓
SQL Server
```

Utilizar o padrão arquitetural existente.

Se o projeto utiliza:

* Controllers → seguir Controllers;
* Minimal API → seguir Minimal API;
* CQRS → seguir CQRS;
* Dapper → utilizar Dapper;
* Repository → seguir Repository;
* Services → seguir Services.

Não introduzir uma arquitetura completamente diferente.

---

# 7. METADADOS DO SQL SERVER

Criar serviços para consultar dinamicamente os metadados do SQL Server.

Utilizar principalmente os catálogos:

```sql
sys.tables
sys.columns
sys.types
sys.schemas
sys.indexes
sys.index_columns
sys.key_constraints
sys.foreign_keys
sys.foreign_key_columns
sys.views
sys.procedures
sys.objects
sys.sql_modules
```

Quando necessário, utilizar também:

```sql
INFORMATION_SCHEMA.TABLES
INFORMATION_SCHEMA.COLUMNS
INFORMATION_SCHEMA.KEY_COLUMN_USAGE
INFORMATION_SCHEMA.TABLE_CONSTRAINTS
```

Não depender somente de `INFORMATION_SCHEMA`.

---

# 8. EXPLORADOR DE BANCO

Criar uma tela de exploração semelhante a um explorador de banco de dados.

Estrutura:

```text
BANCO
│
├── TABELAS
│   ├── TBDEVEDOR
│   ├── TBTITULO
│   ├── TBIMPORTACAO
│   └── ...
│
├── VIEWS
│
├── PROCEDURES
│
├── FUNCTIONS
│
└── TRIGGERS
```

Adicionar pesquisa global.

Permitir pesquisar:

* tabela;
* coluna;
* procedure;
* view;
* function;
* trigger.

---

# 9. DETALHAMENTO DA TABELA

Ao selecionar uma tabela, mostrar:

## Informações

* schema;
* nome;
* quantidade de registros, quando viável;
* data de criação;
* data de alteração;
* quantidade de colunas;
* quantidade de índices;
* quantidade de relacionamentos.

## Colunas

Exibir:

| Coluna | Tipo | Nulo | PK | FK | Identity | Default |
| ------ | ---- | ---- | -- | -- | -------- | ------- |

Também mostrar:

* tamanho;
* precisão;
* escala;
* collation, quando aplicável;
* descrição/documentação, caso exista.

---

# 10. RELACIONAMENTOS FÍSICOS

Criar uma área:

> Relacionamentos

O sistema deverá consultar diretamente:

```sql
sys.foreign_keys
sys.foreign_key_columns
```

para descobrir os relacionamentos reais.

Modelo:

```text
TABELA_ORIGEM
    |
    └── COLUNA_ORIGEM
             |
             ↓
          FK
             |
             ↓
TABELA_DESTINO
    |
    └── COLUNA_DESTINO
```

Exemplo:

```text
TBDEVEDOR.ID
      ↓
TBTITULO.DEVEDOR_ID
```

O relacionamento deve ser marcado como:

> CONFIRMADO

quando existir fisicamente no SQL Server.

---

# 11. IMPORTANTE — NÃO INVENTAR RELACIONAMENTOS

O banco atualmente possui tabelas que podem possuir relacionamentos lógicos sem uma FK física declarada.

Portanto, o sistema NÃO pode assumir que:

```text
TBDEVEDOR.ID
```

e

```text
TBTITULO.DEVEDOR_ID
```

são necessariamente uma FK apenas porque os nomes parecem relacionados.

Existem dois tipos de relacionamento:

### CONFIRMADO

Existe FK física no SQL Server.

### POSSÍVEL

Não existe FK física, mas existem indícios.

Nunca apresentar um relacionamento inferido como confirmado.

---

# 12. MOTOR DE INFERÊNCIA DE RELACIONAMENTOS

Criar um mecanismo capaz de encontrar possíveis relacionamentos.

Os critérios podem incluir:

### Critério 1 — Nome

Exemplo:

```text
DEVEDOR_ID
```

e

```text
ID
```

### Critério 2 — Nome semântico

Exemplo:

```text
COD_DEV
COD_DEVEDOR
ID_DEVEDOR
DEVEDOR_ID
```

### Critério 3 — Tipo compatível

Exemplo:

```text
INT → INT
BIGINT → BIGINT
UNIQUEIDENTIFIER → UNIQUEIDENTIFIER
```

### Critério 4 — PK

Se a coluna destino for PK, aumentar a confiança.

### Critério 5 — Índice

Se existir índice relacionado, aumentar a confiança.

### Critério 6 — Procedures

Verificar procedures que utilizam ambas as tabelas.

### Critério 7 — Views

Verificar joins entre tabelas.

### Critério 8 — documentação Markdown

Consultar a documentação existente quando disponível.

---

# 13. SCORE DE CONFIANÇA

Relacionamentos inferidos devem possuir score.

Exemplo:

```text
95% — Muito provável
80% — Provável
65% — Possível
<50% — Baixa confiança
```

Mostrar também os motivos.

Exemplo:

```text
RELACIONAMENTO POSSÍVEL

TBDEVEDOR.ID
     ↓
TBTITULO.DEVEDOR_ID

Confiança: 92%

Motivos:
✓ nomes compatíveis
✓ tipos compatíveis
✓ coluna destino indexada
✓ padrão utilizado em outras tabelas
✓ relacionamento encontrado em procedure
```

Isso é uma sugestão, NÃO uma FK física.

---

# 14. BUSCA POR COLUNA

Criar uma funcionalidade:

> Onde esta coluna é utilizada?

Exemplo:

Usuário pesquisa:

```text
DEVEDOR_ID
```

O sistema deverá retornar:

```text
Encontrado em:

TBTITULO.DEVEDOR_ID
TBACORDO.DEVEDOR_ID
TBHISTORICO.DEVEDOR_ID
TBCOBRANCA.DEVEDOR_ID
...
```

Para cada ocorrência mostrar:

* tabela;
* coluna;
* tipo;
* PK;
* FK;
* índice;
* relacionamento confirmado;
* relacionamento possível.

---

# 15. DIAGRAMA DE RELACIONAMENTOS

Criar visualização gráfica.

Exemplo:

```text
                 ┌──────────────┐
                 │  TBDEVEDOR   │
                 │              │
                 │ ID           │
                 │ NOME         │
                 └──────┬───────┘
                        │
                        │ FK
                        ↓
                 ┌──────────────┐
                 │   TBTITULO   │
                 │              │
                 │ ID           │
                 │ DEVEDOR_ID   │
                 │ VALOR        │
                 └──────┬───────┘
                        │
                        ↓
                 ┌──────────────┐
                 │  TBACORDO    │
                 └──────────────┘
```

Utilizar biblioteca de visualização adequada ao frontend existente.

Se já houver biblioteca de gráficos/diagramas instalada, reutilizá-la.

Caso não exista, selecionar uma biblioteca adequada e adicionar somente a dependência necessária.

---

# 16. PROFUNDIDADE DO DIAGRAMA

O usuário deverá conseguir escolher:

```text
Tabela inicial:
TBDEVEDOR

Profundidade:
[1]
[2]
[3]
[4]
[Todos]
```

Exemplo:

Profundidade 1:

```text
TBDEVEDOR
   ↓
TBTITULO
```

Profundidade 2:

```text
TBDEVEDOR
   ↓
TBTITULO
   ↓
TBACORDO
```

---

# 17. FILTROS DO DIAGRAMA

Permitir:

* somente FKs confirmadas;
* FKs + relacionamentos possíveis;
* somente relacionamentos possíveis;
* ocultar tabelas sem relacionamento;
* mostrar colunas;
* ocultar colunas;
* expandir tabela;
* centralizar tabela;
* zoom;
* pesquisar tabela.

---

# 18. DIFERENCIAÇÃO VISUAL

Relacionamentos confirmados e inferidos devem ser claramente diferentes.

Exemplo:

```text
CONFIRMADO
TBDEVEDOR ───────── TBTITULO

POSSÍVEL
TBDEVEDOR - - - - - TBHISTORICO
```

Não depender exclusivamente de cores.

Usar também:

* linha contínua;
* linha tracejada;
* ícones;
* labels.

Isso melhora acessibilidade.

---

# 19. GERADOR DE SQL

Criar uma funcionalidade:

> Gerar Consulta

A partir de uma tabela selecionada e dos relacionamentos disponíveis.

Exemplo:

Usuário seleciona:

```text
TBDEVEDOR
TBTITULO
TBACORDO
```

O sistema pode gerar:

```sql
SELECT
    d.ID,
    d.NOME,
    t.ID AS TITULO_ID,
    t.VALOR,
    a.ID AS ACORDO_ID
FROM TBDEVEDOR d
INNER JOIN TBTITULO t
    ON t.DEVEDOR_ID = d.ID
LEFT JOIN TBACORDO a
    ON a.TITULO_ID = t.ID;
```

IMPORTANTE:

O SQL gerado deve utilizar somente relacionamentos:

* confirmados;

ou

* explicitamente selecionados pelo usuário como relacionamentos possíveis.

Nunca inventar JOIN silenciosamente.

---

# 20. CONSULTAS SQL

Criar uma área de consulta.

Permitir:

* escrever SQL;
* executar;
* visualizar resultado;
* quantidade de registros;
* tempo de execução.

Por segurança:

Inicialmente permitir somente:

```text
SELECT
```

e consultas somente leitura.

Bloquear:

```text
INSERT
UPDATE
DELETE
DROP
ALTER
TRUNCATE
CREATE
EXEC
```

O backend deve validar isso.

Não confiar apenas na validação do frontend.

---

# 21. PAGINAÇÃO

Consultas que retornem muitos registros devem possuir paginação.

Nunca carregar milhões de registros no frontend.

Exemplo:

```text
Página 1 de 25

100 registros por página
```

Permitir:

* 25;
* 50;
* 100;
* 500.

---

# 22. TIMEOUT

Toda consulta deve possuir timeout configurável.

Evitar que uma consulta pesada trave a API.

Em caso de timeout:

Mostrar mensagem amigável:

```text
A consulta excedeu o tempo máximo permitido.

Tempo limite: 30 segundos.
```

Nunca mostrar stack trace para o usuário final.

---

# 23. DOCUMENTAÇÃO × BANCO

Criar funcionalidade:

> Comparar com documentação

O sistema deverá comparar:

```text
SQL Server REAL
       ↓
      VS
       ↓
Markdown
```

Detectar:

### Tabela nova

Existe no banco, mas não na documentação.

### Tabela removida

Existe na documentação, mas não no banco.

### Coluna nova

Existe no banco, mas não na documentação.

### Coluna removida

Existe na documentação, mas não no banco.

### Tipo alterado

Exemplo:

```text
VARCHAR(50)
↓
VARCHAR(100)
```

### FK nova

Existe no banco, mas não na documentação.

### FK removida

Existe na documentação, mas não no banco.

---

# 24. RESULTADO DO DIFF

Mostrar algo como:

```text
SINCRONIZAÇÃO DE ESTRUTURA

✓ 289 tabelas iguais

⚠ 8 tabelas novas

⚠ 3 tabelas removidas

⚠ 17 colunas novas

⚠ 5 colunas alteradas

⚠ 4 relacionamentos novos
```

Permitir abrir cada diferença.

Exemplo:

```text
TBTITULO

NOVO CAMPO

EMAIL_SECUNDARIO
VARCHAR(200)
NULL
```

---

# 25. ATUALIZAÇÃO DA DOCUMENTAÇÃO

NÃO sobrescrever automaticamente os Markdown.

Criar opção:

> Gerar alterações sugeridas

O sistema deverá produzir uma proposta de atualização.

Exemplo:

```text
DOCUMENTAÇÃO DESATUALIZADA

Arquivo:
02-produtos/actyonweb/titulo/tbtitulo.md

Alteração sugerida:
Adicionar coluna EMAIL_SECUNDARIO
```

O usuário deverá aprovar antes de alterar os arquivos.

---

# 26. SNAPSHOT DO BANCO

Criar arquitetura preparada para snapshots.

Um snapshot deve representar a estrutura do banco em determinado momento.

Exemplo:

```text
Snapshot
05/09/2026 17:30

297 tabelas
4.153 colunas
194 FKs
```

Permitir futuramente comparar:

```text
Snapshot 01
VS
Snapshot 02
```

Não é necessário criar uma interface complexa de histórico nesta primeira versão, mas a arquitetura deve permitir essa evolução.

---

# 27. IA

O módulo deve ser preparado para integração com IA.

A IA poderá responder perguntas como:

> Como TBDEVEDOR se relaciona com TBTITULO?

A resposta deve combinar:

```text
SQL Server
+
Documentação Markdown
+
Procedures
+
Relacionamentos
+
Conhecimento institucional
```

Porém:

## REGRA CRÍTICA

A IA NÃO é fonte de verdade para estrutura física.

Se o SQL Server disser que não existe FK:

A IA não pode responder:

> "Existe uma FK."

Ela deve responder:

> "Não existe FK física declarada, porém foi identificado um possível relacionamento..."

---

# 28. MCP — PREPARAR ARQUITETURA

Não é obrigatório implementar o MCP nesta primeira etapa, porém a arquitetura deve permitir sua criação posteriormente.

Idealmente, separar as operações de banco em serviços reutilizáveis:

```text
DatabaseMetadataService
DatabaseRelationshipService
DatabaseQueryService
DatabaseSchemaDiffService
DatabaseSnapshotService
```

Isso permitirá futuramente expor essas funcionalidades por MCP.

Exemplo futuro:

```text
IA
 ↓
MCP
 ↓
Database Service
 ↓
SQL Server
```

Não duplicar a lógica de acesso ao banco para o MCP.

---

# 29. API

Criar endpoints seguindo o padrão atual do projeto.

Exemplos conceituais:

```text
GET /api/database/status

GET /api/database/tables

GET /api/database/tables/{table}

GET /api/database/tables/{table}/columns

GET /api/database/tables/{table}/relationships

GET /api/database/relationships

GET /api/database/relationships/graph

GET /api/database/search

GET /api/database/column-usage

POST /api/database/query

POST /api/database/test-connection

GET /api/database/schema/diff
```

Os nomes finais devem seguir o padrão de rotas já existente.

Não implementar exatamente esses endpoints se o projeto utilizar outro padrão.

---

# 30. MODELOS

Criar DTOs específicos.

Exemplo:

```text
DatabaseInfoDto
TableDto
ColumnDto
IndexDto
ForeignKeyDto
RelationshipDto
PossibleRelationshipDto
RelationshipGraphDto
QueryResultDto
SchemaDiffDto
SchemaChangeDto
```

Não retornar entidades internas diretamente para o frontend.

---

# 31. LOGGING

Registrar:

* conexão;
* erro de conexão;
* execução de consulta;
* timeout;
* erro de metadados;
* comparação de schema.

NUNCA registrar:

* senha;
* connection string completa;
* tokens;
* credenciais.

---

# 32. TRATAMENTO DE ERROS

Criar mensagens amigáveis.

Exemplos:

```text
Não foi possível conectar ao SQL Server.

Verifique:
- servidor;
- porta;
- banco;
- usuário;
- senha.
```

Erro interno:

```text
Não foi possível obter os relacionamentos da tabela.

Tente novamente ou consulte os logs técnicos.
```

Não expor:

* stack trace;
* connection string;
* senha;
* informações internas da infraestrutura.

---

# 33. PERFORMANCE

As consultas de metadados devem ser eficientes.

Evitar:

```text
N consultas para N tabelas
```

quando for possível obter os dados de forma agregada.

Preferir consultas que tragam os metadados em lote.

O grafo também deve ser montado de forma eficiente.

---

# 34. SEGURANÇA

Implementar:

* validação no backend;
* autenticação existente;
* autorização existente;
* somente leitura para consultas SQL;
* timeout;
* limite de registros;
* proteção contra SQL injection;
* proteção de credenciais;
* logs seguros.

Nunca montar comandos perigosos concatenando entrada do usuário sem validação.

---

# 35. FRONTEND

A interface deve seguir rigorosamente:

* Bootstrap;
* componentes existentes;
* espaçamentos existentes;
* tipografia existente;
* cards existentes;
* tabelas existentes;
* modais existentes;
* sidebar existente;
* navbar existente.

Não criar um novo design system.

---

# 36. EXPERIÊNCIA DO USUÁRIO

O módulo deve ser pensado para três públicos:

### SUPORTE

Encontrar rapidamente:

```text
Qual tabela possui essa informação?
Onde essa coluna é utilizada?
Como chegar de DEVEDOR até TÍTULO?
```

### IMPLANTAÇÃO

Entender:

```text
estrutura;
relacionamentos;
campos;
dependências;
```

### AUTOMAÇÃO E IA — CIAA

Investigar:

```text
dados;
estrutura;
joins;
procedures;
relacionamentos;
integrações;
```

Portanto, a interface deve priorizar investigação rápida.

---

# 37. BUSCA GLOBAL INTELIGENTE

Criar busca que aceite:

```text
TBTITULO
```

```text
DEVEDOR_ID
```

```text
devedor
```

```text
título
```

e encontre:

* tabelas;
* colunas;
* relacionamentos;
* procedures;
* views.

Se houver documentação Markdown relacionada, mostrar também:

```text
📚 Documentação relacionada
```

---

# 38. INTEGRAÇÃO COM DOCUMENTAÇÃO

Quando o usuário abrir uma tabela:

Exemplo:

```text
TBTITULO
```

Mostrar uma área:

> 📚 Documentação

com link para o Markdown correspondente, quando existir.

Também mostrar:

```text
Documentação encontrada
Última atualização
Status
```

Se não houver:

```text
⚠ Esta tabela ainda não possui documentação.
```

---

# 39. ESTADO DA DOCUMENTAÇÃO

Para cada objeto:

```text
🟢 Atualizado
🟡 Possível divergência
🔴 Não documentado
```

Exemplo:

```text
TBTITULO

SQL Server: atualizado
Markdown: divergente

2 diferenças encontradas
```

---

# 40. NÃO ALTERAR DADOS

O módulo deve ser inicialmente orientado à CONSULTA.

Não implementar:

* edição de registros;
* exclusão;
* alteração de estrutura;
* criação de tabela;
* criação de FK;
* alteração de coluna.

A ferramenta deve ser um:

> DATABASE EXPLORER / DATABASE INTELLIGENCE

e não um administrador destrutivo do banco.

---

# 41. TESTES

Criar testes seguindo o padrão existente.

Testar pelo menos:

### Backend

* conexão;
* consulta de tabelas;
* consulta de colunas;
* consulta de PK;
* consulta de FK;
* relacionamento confirmado;
* inferência;
* busca por coluna;
* geração de SQL;
* bloqueio de comandos perigosos;
* timeout;
* schema diff.

### Frontend

* carregamento;
* pesquisa;
* abertura da tabela;
* visualização dos relacionamentos;
* diagrama;
* filtros;
* tratamento de erro.

---

# 42. DOCUMENTAÇÃO TÉCNICA

Atualizar o README/documentação do projeto explicando:

* novo módulo;
* arquitetura;
* configuração SQL Server;
* variáveis de ambiente;
* endpoints;
* segurança;
* inferência de relacionamentos;
* diferença entre FK confirmada e relacionamento possível;
* como executar;
* como testar.

---

# 43. FLUXO PRINCIPAL

O fluxo esperado é:

```text
USUÁRIO
   ↓
Banco de Dados
   ↓
Explorador
   ↓
Seleciona TBDEVEDOR
   ↓
Sistema consulta SQL Server
   ↓
Mostra colunas
   ↓
Mostra PK
   ↓
Mostra FKs
   ↓
Mostra relacionamentos
   ↓
Mostra possíveis relacionamentos
   ↓
Usuário abre Diagrama
   ↓
Sistema monta grafo em tempo real
   ↓
Usuário seleciona TBTITULO
   ↓
Gerar Consulta
   ↓
Sistema monta JOIN
   ↓
Usuário revisa
   ↓
Executa SELECT
   ↓
Visualiza resultado
```

---

# 44. PRINCÍPIO FUNDAMENTAL DA IMPLEMENTAÇÃO

Existem três níveis de confiança:

```text
NÍVEL 1
SQL SERVER
★★★★★
VERDADE ESTRUTURAL

NÍVEL 2
DOCUMENTAÇÃO
★★★★☆
CONHECIMENTO DOCUMENTADO

NÍVEL 3
IA / INFERÊNCIA
★★★☆☆
SUGESTÃO
```

Nunca inverter essa prioridade.

---

# 45. CRITÉRIOS DE ACEITE

A implementação somente será considerada concluída quando:

* [ ] módulo Banco de Dados aparece no menu;
* [ ] conexão SQL Server funciona;
* [ ] conexão é testável pela interface;
* [ ] credenciais não ficam expostas;
* [ ] lista de tabelas é carregada diretamente do SQL Server;
* [ ] detalhes das tabelas funcionam;
* [ ] colunas são exibidas;
* [ ] PKs são identificadas;
* [ ] FKs são identificadas;
* [ ] relacionamentos físicos são exibidos;
* [ ] relacionamentos possíveis são identificados separadamente;
* [ ] busca por coluna funciona;
* [ ] grafo de relacionamentos funciona;
* [ ] profundidade do grafo funciona;
* [ ] filtros funcionam;
* [ ] SQL SELECT pode ser gerado;
* [ ] comandos destrutivos são bloqueados;
* [ ] consultas possuem paginação/limite;
* [ ] timeout existe;
* [ ] comparação SQL Server × Markdown funciona;
* [ ] diferenças são apresentadas;
* [ ] documentação não é sobrescrita automaticamente;
* [ ] arquitetura está preparada para MCP;
* [ ] testes foram criados;
* [ ] documentação técnica foi atualizada;
* [ ] funcionalidades existentes da Central de Operação continuam funcionando.

---

# 46. PROCESSO DE IMPLEMENTAÇÃO OBRIGATÓRIO

Execute a implementação nesta ordem:

## ETAPA 1 — ANÁLISE

Primeiro analise o projeto atual.

Não escreva código imediatamente.

Identifique:

```text
Frontend:
Backend:
Banco:
Autenticação:
Rotas:
Componentes:
Serviços:
Configuração:
Testes:
```

## ETAPA 2 — PLANEJAMENTO

Apresente internamente a estrutura que será criada/modificada.

## ETAPA 3 — BACKEND

Implementar:

```text
Database Connection
Metadata
Tables
Columns
PK
FK
Relationships
Inference
Search
Query
Schema Diff
```

## ETAPA 4 — FRONTEND

Implementar:

```text
Menu
Dashboard
Explorer
Table Detail
Relationships
Graph
Search
Query
Diff
Configuration
```

## ETAPA 5 — INTEGRAÇÃO

Conectar frontend ao backend.

## ETAPA 6 — TESTES

Executar:

```text
build
lint
test
```

e demais comandos existentes no projeto.

## ETAPA 7 — VALIDAÇÃO

Verificar:

* erros de compilação;
* erros de TypeScript;
* erros de C#;
* endpoints;
* navegação;
* segurança;
* responsividade;
* regressões.

## ETAPA 8 — DOCUMENTAÇÃO

Atualizar README e documentação técnica.

---

# 47. REGRA FINAL

Antes de criar qualquer arquivo:

**INSPECIONE O PROJETO EXISTENTE.**

Antes de instalar qualquer dependência:

**VERIFIQUE SE JÁ EXISTE UMA SOLUÇÃO NO PROJETO.**

Antes de criar qualquer componente:

**VERIFIQUE SE EXISTE COMPONENTE REUTILIZÁVEL.**

Antes de criar qualquer endpoint:

**VERIFIQUE O PADRÃO EXISTENTE.**

Antes de considerar uma relação entre tabelas:

**VERIFIQUE PRIMEIRO O SQL SERVER.**

Nunca invente estrutura.

Nunca sobrescreva documentação automaticamente.

Nunca exponha credenciais.

Nunca comprometa funcionalidades existentes.

O objetivo não é apenas criar uma tela de banco.

O objetivo é transformar a Central de Operação em uma ferramenta de **inteligência operacional sobre o banco Actyon**, permitindo que Suporte, Implantação e CIAA investiguem a estrutura real do sistema de forma segura, visual e confiável.
