> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 14. Database Explorer

### 15.1 `DatabaseShellComponent`

**Componente:** `src/app/features/database/database-shell.component.ts`

### O que faz
Shell com 7 abas (Visão Geral, Explorador, Relacionamentos, Diagrama, Consultas, Diferenças, Configuração) + banner de status (verde conectado / vermelho desconectado) + busca global (`app-db-global-search`). Componente pai que gerencia abas. IA Chat e Query Builder como aba própria foram removidos da navegação (`db-ia-chat.component.ts` deletado; `query-builder` redireciona para `consultas`). Desde o enxugamento de 23/09/2026 (`640bbf6`): Consultas = só Criador de Consultas (sem SQL livre/favoritos); Diferenças = só Sincronização; Relacionamentos = dropdown de tabela.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `status()`, `info()` | Verifica conectividade + info servidor |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/status` | `DatabaseService.status()` | Status de conexão |
| GET | `/api/v1/database/info` | `DatabaseService.info()` | Info do servidor |

### Banco de Dados
- **Conecta:** ✅ Sim — conecta ao SQL Server Actyon (`dbActyon_JCA`, 192.168.2.154)

### Dependências Externas
- `DatabaseService`
- `NgbModal` (para procedure modal)
- `DB_EXPLORER_SENHA` (env var no IIS App Pool)

### Observações Técnicas
- Lazy loading em `database.routes.ts:9`
- Rotas em `database.routes.ts`: `ia-chat` removida; `query-builder` é redirect para `consultas`
- Busca global (`db-global-search.component.ts`): sem bloco inicial de dicas/exemplos; barra compacta quando vazia (categorias e resultados só aparecem após digitar); desde 24/09/2026 usa só `GET /search` (`buscarGlobal`/`search/global` removidos)
- Sem execução de SQL no servidor (endpoint `POST /query` removido em 23/09/2026); Consultas = só gerar/copiar SQL
- Header via `app-page-header` — Lote B (confirmado no código, `database-shell.component.html:2-6`): `titulo="Banco de Dados"`, `descricao="Explorador em tempo real do SQL Server Actyon — tabelas, colunas, relacionamentos e consultas SELECT. Somente leitura."`, `icone="bi-hdd-network-fill"`; banner de status (`.db-shell__status`) continua abaixo do header, sem slot `actions`.

---

### 15.2 `DbVisaoGeralComponent`

**Componente:** `src/app/features/database/pages/db-visao-geral.component.ts`

### O que faz
Faixa de status compacta (conectado/desconectado + servidor/banco/versão, com link Configuração) + 9 cards (Tabelas, Colunas, PKs, FKs, Índices, Views, Procedures, Functions, Triggers) + resumo de relacionamentos (FKs confirmadas + possíveis) + Acesso rápido (5 atalhos: Explorar, Relacionamentos, Diagrama, Consultas, Diferenças) + card Conexão compacto com Testar conexão (sem credenciais).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `info()`, `relacionamentos()`, `testarConexao()` | Metadados (`info`) + resumo de relacionamentos + teste de conexão |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/info` | `DatabaseService.info()` | Info servidor + contadores (tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers) |
| GET | `/api/v1/database/relationships` | `DatabaseService.relacionamentos()` | Resumo de relacionamentos (confirmadas × possíveis) |
| GET | `/api/v1/database/status` | `DatabaseService.testarConexao()` | Testar conexão (card Conexão; `POST /test-connection` removido 24/09/2026) |

### Banco de Dados
- **Conecta:** ✅ Sim — metadados via `sys.*` views

### Dependências Externas
- `DatabaseService`

### Observações Técnicas
- Lazy loading em `database.routes.ts:9`
- Cards com valores de `DatabaseInfo` (`quantidadeTabelas`, `quantidadeColunas`, `quantidadePks`, `quantidadeFks`, `quantidadeIndices`, `quantidadeViews`, `quantidadeProcedures`, `quantidadeFunctions`, `quantidadeTriggers`); PKs e FKs em cards separados
- Seção Relacionamentos oculta se `relacionamentos()` falhar ou retornar vazio
- Card Conexão exibe servidor/banco/usuário/versão/última atualização/tempo de resposta — sem senha ou credenciais

---

### 15.3 `DbExploradorComponent`

**Componente:** `src/app/features/database/pages/db-explorador.component.ts`

### O que faz
Árvore de tabelas + procedures + triggers + painel de detalhe (colunas + índices) + busca global. Seleciona tabela/procedure para ver detalhes completos; seleciona trigger para abrir o modal `db-trigger-modal` com o corpo completo.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `listarTabelas()`, `listarProcedures()`, `listarTriggers()`, `obterTrigger()`, `listarColunas()`, `listarIndices()`, `obterProcedure()`, `buscar()` | Metadados |
| `NgbModal` | — | Modal procedure / trigger |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Lista tabelas |
| GET | `/api/v1/database/tables/{schema}/{name}/columns` | `DatabaseService.listarColunas()` | Colunas |
| GET | `/api/v1/database/tables/{schema}/{name}/indexes` | `DatabaseService.listarIndices()` | Índices |
| GET | `/api/v1/database/procedures` | `DatabaseService.listarProcedures()` | Lista procedures |
| GET | `/api/v1/database/procedures/{schema}/{name}` | `DatabaseService.obterProcedure()` | Detalhe procedure |
| GET | `/api/v1/database/triggers` | `DatabaseService.listarTriggers()` | Lista triggers (grupo Triggers) |
| GET | `/api/v1/database/triggers/{schema}/{name}` | `DatabaseService.obterTrigger()` | Detalhe trigger (modal `db-trigger-modal`) |
| GET | `/api/v1/database/search` | `DatabaseService.buscar()` | Busca global |
| POST | `/api/v1/database/procedures/{schema}/{name}` | `DatabaseService.obterProcedure()` | Detalhe procedure |

### Banco de Dados
- **Conecta:** ✅ Sim — `sys.tables`, `sys.columns`, `sys.indexes`, `sys.procedures`

### Dependências Externas
- `DatabaseService`
- `NgbModal` (procedure / trigger detail)
- `DbProcedureModalComponent` (modal inline)
- `DbTriggerModalComponent` (`db-trigger-modal.component`, modal inline do grupo Triggers)

### Observações Técnicas
- Lazy loading em `database.routes.ts:10`
- Schema filter
- Click para selecionar → carrega colunas + índices

---

### 15.4 `DbRelacionamentosComponent`

**Componente:** `src/app/features/database/pages/db-relacionamentos.component.ts`

### O que faz
Fluxo por tabela (23/09/2026): **dropdown de tabela** → só os vínculos daquela tabela (confirmados × possíveis, score 0–99% e motivos) + filtros pills (Todas / Confirmadas / Possíveis) e busca por coluna (`column-usage`), ambos **após** a seleção. Empty state antes de escolher a tabela.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `listarTabelas()`, `relacionamentos(..., tabela)`, `usoColuna()` | Dropdown + vínculos da tabela + uso de coluna |
| `DatabaseRelationshipInferenceService` | — | Inferência score 0-99% |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Opções do dropdown |
| GET | `/api/v1/database/relationships?tabela=` | `DatabaseService.relacionamentos()` | Só vínculos da tabela (filtro case-insensitive em origem/destino) |
| GET | `/api/v1/database/column-usage` | `DatabaseService.usoColuna()` | Uso de coluna (busca) |

### Banco de Dados
- **Conecta:** ✅ Sim — `sys.foreign_keys` + inferência score 0-99%

### Dependências Externas
- `DatabaseService`, `DatabaseRelationshipInferenceService`
- `DatabaseMetadataService`

### Observações Técnicas
- Lazy loading em `database.routes.ts:11`
- Backend: `GET /relationships?tabela=` → `[FromQuery] string? tabela` em `DatabaseController`
- Confirmados via `sys.foreign_keys`, possíveis via inferência (`incluirPossiveis` conforme pill)
- BFS até 5 níveis para grafo (endpoint `graph`, usado no Detalhe de tabela/Builder)

---

### 15.5 `DbDiagramaComponent` — ~~REMOVIDA~~ (arquivo `db-diagrama.component.ts` excluído; sem rota)

**Componente:** `src/app/features/database/pages/db-diagrama.component.ts`

### O que faz
Diagrama SVG próprio com layout BFS, profundidade 1-5, setas: azul contínua (confirmado) / violeta tracejada (possível).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `grafo()` | Dados para diagrama |
| `DbDiagramaComponent` | `renderizarSVG()` | Renderiza SVG custom |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/graph?tabela=X&profundidade=N` | `DatabaseService.grafo()` | Dados do grafo |

### Banco de Dados
- **Conecta:** ✅ Sim — dados do grafo

### Dependências Externas
- `DatabaseService`
- SVG custom (sem biblioteca externa)
- BFS layout até profundidade 5

### Observações Técnicas
- Lazy loading em `database.routes.ts:12`
- Setas azul contínua (confirmado) / violeta tracejada (possível)

---

### 15.6 `DbConsultasComponent`

**Componente:** `src/app/features/database/pages/db-consultas.component.ts`

### O que faz
Host do **Criador de Consultas** (enxugamento 23/09/2026, `640bbf6`) — sem abas SQL livre / Favoritos, sem Executar e sem JOTA SQL Assistant. Aviso no topo: montar no Criador e **copiar o SQL para o SSMS**. Wizard em 7 etapas (Tabela → Campos → Relacionamentos → Filtros → Ordenação → Resumo → **SQL** com Copiar), aliases amigáveis, operadores em linguagem simples, SQL via `POST /query-builder-advanced` (fallback local), GROUP BY/HAVING em "Opções avançadas", modal de tabela relacionada com confiança. Pré-preenchimento via `?tabela=`, `?tabelas=`, `?caminho=`, `?origem=`/`?destino=` ou `sessionStorage` (`db-query-builder-tables`). Query param `aba=builder` (ou legado `builder=true`) ainda cai na rota `consultas`.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `executarQueryBuilderAvançado()`, `listarTabelas()`, `grafo()` | Gera SQL + tabelas + relacionadas |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/database/query-builder-advanced` | `DatabaseService.executarQueryBuilderAvançado()` | Gera o SQL (aliases amigáveis, TOP após SELECT) |
| GET | `/api/v1/database/graph` | `DatabaseService.grafo()` | Relacionadas da tabela principal |
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Tabelas do passo 1 |

### Banco de Dados
- **Conecta:** ✅ Somente metadados/geração de SQL — a execução é no SSMS do usuário

### Dependências Externas
- `DatabaseService`
- `DbQueryBuilderComponent` (`app-db-query-builder` embutido; rota própria `query-builder` = redirect para `consultas`)

### Observações Técnicas
- Lazy loading em `database.routes.ts:13`
- Removidos: `POST /database/query`, `DatabaseFavoritosService`, histórico em `localStorage`, Executar/resultados, painel JOTA
- `TableDetailComponent.abrirQueryBuilder()` / `gerarEConsultar()` → "Abrir no Criador"; `abrirQueryBuilderComRelacionamento()` usa `?caminho=origem,destino`; Explorador/Procedure modal → `db-query-builder-tables` / `?aba=builder`

---

### 15.7 `DbDiferencasComponent`

**Componente:** `src/app/features/database/pages/db-diferencas.component.ts`  
**Sub-componente:** `src/app/features/database/components/db-sincronizacao.component.ts` (aba "Sincronização")

### O que faz
**Só a sub-aba Sincronização** (aba "Banco × Documentação" e snapshots removidos em 23/09/2026, `640bbf6`). `DbDiferencasComponent` carrega `listarTabelas()` e repassa via `@Input tabelas` ao `DbSincronizacaoComponent`: compara schema de tabela JCA × arquivo CSV/JSON enviado (parse no backend). Exibe resumo (críticos/avisos/compatíveis/match %) + lista de diferenças com filtro "apenas diferenças" + **numerador sequencial nas críticas** (badge 1, 2, 3… estável no lote todo; coluna `numero` no export CSV) + export CSV client-side.

**Modos:** toggle **Uma tabela** | **Lote (várias tabelas)**.
- *Uma tabela:* `POST /compare-schemas` (multipart `schema`, `tabela`, `arquivo`).
- *Lote:* JSON array `[{ tabela, colunas, indices, fks }, …]` → `POST /compare-schemas-lote`; cada `tabela` no formato `schema.nome` é comparada com o JCA (ausente → 1 crítico com a mensagem); resumo global + blocos por tabela.

**Script de exportação:** inputs de schema (+ tabela ou lista opcional `Tab1, Tab2` no modo lote), `<pre>` gerado ao vivo (`scriptSqlUnica()` / `scriptSqlLote()`), botão "Copiar script" (fallback `execCommand`). Ambos os scripts montam o JSON com **`FOR XML PATH` + `RAISERROR`** (sem `FOR JSON`/`JSON_QUERY`/`THROW`) — compatíveis com SQL Server 2005+ e qualquer compatibility level. Saída: 1 coluna `nvarchar(max)` (objeto único ou array de tabelas).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `listarTabelas()`, `compararSchemas()` | Dropdown + upload de schema |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Tabelas do dropdown |
| POST | `/api/v1/database/compare-schemas` | `DatabaseService.compararSchemas()` | Upload multipart (`schema`, `tabela`, `arquivo` CSV/JSON) × schema JCA → `SchemaComparisonResultDto` |
| POST | `/api/v1/database/compare-schemas-lote` | `DatabaseService.compararSchemasLote()` | Upload multipart (`arquivo` só `.json` array de tabelas) → `SchemaComparisonBatchResultDto` (resumo global + 1 resultado por tabela) |

### Banco de Dados
- **Conecta:** ✅ Sim — schema real do SQL Server × arquivo externo (Sincronização)

### Dependências Externas
- `DatabaseService`
- `SchemaComparisonResult`/`SchemaDifference` em `database/models/database.model.ts`
- `DbSincronizacaoComponent` (standalone, `@Input tabelas`)

### Observações Técnicas
- Lazy loading em `database.routes.ts:14`
- Removidos: `POST /diff`, `POST|GET /snapshot(s)`, `POST /snapshot/comparar`, métodos `diferencarSchema`/`salvarSnapshot`/`listarSnapshots`/`compararSnapshot` e modelos `DiffResult`/`DiffItem`
- IDENTIDADE CLEAN: dots CSS `.db-sync__dot--Critico/--Aviso/--Ok`; badge `.db-sync__badge` numerando críticos; CSV/JSON ≤ 5 MB; export `schema-comparacao-{tabela|lote}.csv` client-side com colunas `tabela,numero,severidade,…`
- Bloco "Script de exportação": aspas SQL escapadas via `litarSql`; JSON montado via `FOR XML PATH` (2005+); duplicatas no arquivo → `Aviso`, sem abortar
- Modelos: `SchemaDifference.numeroCritico?`, `SchemaComparisonBatchResult` em `database.model.ts`

---

### 15.8 `DbConfiguracaoComponent`

**Componente:** `src/app/features/database/pages/db-configuracao.component.ts`

### O que faz
Apenas leitura + Testar conexão (form de edição e `PUT /config` removidos do fluxo em 23/09/2026). Exibe servidor/porta/banco/usuário/senha mascarada/Encrypt + botão Testar conexão. Config gerenciada por env vars / user-secrets.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `testarConexao()`, `obterConfig()` | Configuração (leitura) + teste |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/status` | `DatabaseService.testarConexao()` | Testa conexão (mesmo `GET /status` do shell; `POST /test-connection` removido 24/09/2026) |
| GET | `/api/v1/database/config` | `DatabaseService.obterConfig()` | Obtém config (senha mascarada `***`) |

### Banco de Dados
- **Conecta:** ✅ Sim — configuração de conexão

### Dependências Externas
- `DatabaseService`
- `DB_EXPLORER_SENHA` (env var no IIS App Pool `Suporte_Back`)
- `configure-db-explorer-password.ps1` (script de configuração)

### Observações Técnicas
- Lazy loading em `database.routes.ts:15`
- Interface somente leitura ("Não editável"); senha nunca logada, retornada em claro ou commitada
- Leitura via env var em produção, user-secrets em Development; `PUT /config` e `UpdateConfig` removidos do backend
