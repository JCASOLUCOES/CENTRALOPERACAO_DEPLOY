> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 14. Database Explorer

### 15.1 `DatabaseShellComponent`

**Componente:** `src/app/features/database/database-shell.component.ts`

### O que faz
Shell com 7 abas (Visão Geral, Explorador, Relacionamentos, Diagrama, Consultas, Diferenças, Configuração) + banner de status (verde conectado / vermelho desconectado) + busca global (`app-db-global-search`). Componente pai que gerencia abas. IA Chat e Query Builder foram removidos da navegação (arquivo `components/db-ia-chat.component.ts` deletado).

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
- Busca global (`db-global-search.component.ts`): sem bloco inicial de dicas/exemplos; barra compacta quando vazia (categorias e resultados só aparecem após digitar)
- SELECT-only com regex server-side (bloqueia INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/EXEC)
- Transação ReadUncommitted + ROLLBACK explícito
- Timeout 1-120s, Limite 1-5000
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
| POST | `/api/v1/database/test-connection` | `DatabaseService.testarConexao()` | Testar conexão (card Conexão) |

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
Relacionamentos confirmados (linha azul contínua) × Possíveis (linha violeta tracejada) com score e motivos + busca por coluna.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `relacionamentos()`, `usoColuna()` | Relacionamentos |
| `DatabaseRelationshipInferenceService` | — | Inferência score 0-99% |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/relationships` | `DatabaseService.relacionamentos()` | Relacionamentos confirmados + possíveis |
| GET | `/api/v1/database/column-usage` | `DatabaseService.usoColuna()` | Uso de coluna |

### Banco de Dados
- **Conecta:** ✅ Sim — `sys.foreign_keys` + inferência score 0-99%

### Dependências Externas
- `DatabaseService`, `DatabaseRelationshipInferenceService`
- `DatabaseMetadataService`

### Observações Técnicas
- Lazy loading em `database.routes.ts:11`
- Confirmados via `sys.foreign_keys`, possíveis via inferência
- BFS até 5 níveis para grafo

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
Abas internas [SQL][Criador de Consultas][Favoritos] (mesmo componente `app-db-query-builder` embutido, sem duplicação). Aba SQL: editor SELECT/WITH, paginação 25/50/100/500, timeout 5/15/30/60s + histórico rico em `localStorage` (até 30 entradas com data, duração, status e nº de linhas; ações Abrir/Repetir/Favoritar; migração automática do formato antigo) + botão "Salvar favorito". Aba Favoritos (desde 2026-09-18, Corretor #6): queries nomeadas com tags (`DatabaseFavoritosService`, chave `cc.database.favoritos.v1`), filtro por nome/tag, ações Carregar/Executar/Duplicar/Excluir. Query params `aba=builder` ou `builder=true` ativam a aba Builder. Criador de Consultas: wizard em 7 etapas (Tabela → Campos → Relacionamentos → Filtros → Ordenação → Resumo → SQL e resultado), aliases amigáveis (ex.: TBCHAMADO→C, TBCLIENTE→CL), operadores em linguagem simples, SQL gerado via `POST /query-builder-advanced` (fallback local), GROUP BY/HAVING em "Opções avançadas", modal de tabela relacionada com Confirmada/Sugerida + confiança + evidências. Pré-preenchimento via `?tabela=`, `?tabelas=`, `?caminho=`, `?origem=`/`?destino=` ou legado `sessionStorage` (`db-query-builder-tables`). SELECT-only com regex server-side bloqueando DML/DDL. Sem IA Chat.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `executarQuery()` | Executa query SELECT |
| `DatabaseQueryBuilderService` | — | Constroi queries (via `app-db-query-builder` embutido) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/database/query` | `DatabaseService.executarQuery()` | Executa query SQL |
| POST | `/api/v1/database/query-builder-advanced` | `DatabaseService.executarQueryBuilderAvançado()` | Gera o SQL do Criador de Consultas (aliases amigáveis, TOP após SELECT, colunas "Tabela.Coluna") |
| GET | `/api/v1/database/graph` | `DatabaseService.grafo()` | Relacionadas da tabela principal (etapa Relacionamentos) |
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Lista tabelas para auto-complete |
| GET | `/api/v1/database/procedures` | `DatabaseService.listarProcedures()` | Lista procedures |

### Banco de Dados
- **Conecta:** ✅ Sim — execução de queries
- **Restrição:** SELECT-only (regex bloqueia INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/EXEC)

### Dependências Externas
- `DatabaseService`, `DatabaseQueryBuilderService`
- `DbQueryBuilderComponent` (`app-db-query-builder`, embutido na aba Builder — rota própria `query-builder` removida, agora é redirect para `consultas`)
- Editor SQL custom (CodeMirror ou similar)
- Paginação 25/50/100/500, timeout 5/15/30/60s

### Observações Téc
- Lazy loading em `database.routes.ts:13`
- `TableDetailComponent.abrirQueryBuilder()` salva tabelas em `sessionStorage` (`db-query-builder-tables`) e navega para `/database/consultas` com `aba=builder` + `tabela=`; `abrirQueryBuilderComRelacionamento()` usa `?caminho=origem,destino` (botão "Criar consulta" por linha de relacionamento)
- Transação ReadUncommitted + ROLLBACK explícito
- Limite 1-5000
- JOTA SQL Assistant (2026-09-18, Corretor #6): painel na aba SQL com botões Explicar/Otimizar/Sugerir índices + pergunta livre, via `JotaChatService.chat()` com a query embutida no prompt; resposta inline, erro honesto

---

### 15.7 `DbDiferencasComponent`

**Componente:** `src/app/features/database/pages/db-diferencas.component.ts`  
**Sub-componente:** `src/app/features/database/components/db-sincronizacao.component.ts` (aba "Sincronização")

### O que faz
Página com 2 sub-abas (`abaInterna: 'diff' | 'sincronizacao'`):

1. **Banco × Documentação** (aba padrão): compara o schema real do SQL Server com a documentação Markdown institucional (wiki da Central). Controles (limite de itens, "Comparar agora", "Salvar Snapshot"), resumo com 6 stats (tabelas iguais/novas/removidas, colunas novas/removidas/alteradas) + lista de divergências com chip de tipo, status em texto puro e dot CSS, além de ações de snapshot (salvar/listar/comparar).
2. **Sincronização** (`DbSincronizacaoComponent`): compara schema de tabela JCA × arquivo CSV/JSON enviado pelo usuário (parse no backend). Seleciona tabela via dropdown (`listarTabelas()` no `ngOnInit`), envia `FormData` (schema, tabela, arquivo) e exibe resumo (críticos/avisos/compatíveis/match %) + lista de diferenças com filtro "apenas diferenças" + export CSV client-side. Inclui bloco **"Script de exportação (JSON)"** entre controles e alerta: inputs editáveis de schema (default `dbo`) e tabela (auto-fill ao escolher Tabela JCA via `onTabelaJcaChange`; banco externo pode diferir), `<pre>` com T-SSQL gerado ao vivo por `scriptSql()` (CTEs de `sys.columns`/`sys.indexes`/`sys.foreign_keys` + `JSON_QUERY(... FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)` → `{tabela, colunas[], indices[], fks[]}`), botão "Copiar script" (`navigator.clipboard`, feedback "Copiado" 2s via `scriptCopiado` signal) e dica: rodar no SSMS → copiar célula do resultado → salvar `.json` → enviar no upload.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `diferencarSchema()`, `salvarSnapshot()`, `listarSnapshots()`, `compararSnapshot()`, `listarTabelas()`, `compararSchemas()` | Comparação + snapshots + upload de schema |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/database/diff` | `DatabaseService.diferencarSchema()` | Compara banco × documentação (`{ limite }`) |
| POST | `/api/v1/database/snapshot` | `DatabaseService.salvarSnapshot()` | Salva snapshot (`{ nome }`) |
| GET | `/api/v1/database/snapshots` | `DatabaseService.listarSnapshots()` | Lista snapshots |
| POST | `/api/v1/database/snapshot/comparar` | `DatabaseService.compararSnapshot()` | Compara contra snapshot (`{ nome }`) |
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Dropdown de tabelas da sub-aba Sincronização |
| POST | `/api/v1/database/compare-schemas` | `DatabaseService.compararSchemas()` | Upload multipart (`schema`, `tabela`, `arquivo` CSV/JSON) × schema JCA → `SchemaComparisonResultDto` |

### Banco de Dados
- **Conecta:** ✅ Sim — schema real do SQL Server × Markdown institucional (aba diff) / × arquivo externo (aba Sincronização)

### Dependências Externas
- `DatabaseService`
- `DiffResult`/`DiffItem`, `SchemaComparisonResult`/`SchemaDifference` em `database/models/database.model.ts` (`badge: '🟢' | '🟡' | '🔴'` = contrato de dados da API, não exibição)
- `DbSincronizacaoComponent` (standalone, template/styles inline, signals)

### Observações Técnicas
- Lazy loading em `database.routes.ts:14`
- IDENTIDADE CLEAN (21/09/2026, confirmado no código): status exibido como label em texto puro (`getStatusLabel()` devolve o próprio status) + dot CSS via `getBadgeClass()` (`.db-diff__dot--verde/--amarela/--vermelha/--neutra`); os cases `🟢🟡🔴` restantes no `switch` são comparação do valor `badge` vindo da API, não emoji na tela
- Sub-aba Sincronização: IDENTIDADE CLEAN (dots CSS `.db-sync__dot--Critico/--Aviso/--Ok`, sem emojis na exibição); CSV/JSON limitados a 5 MB; export CSV gera `schema-comparacao-{tabela}.csv` client-side
- Bloco "Script de exportação": aspas SQL escapadas (`'` → `''` via `litarSql`); placeholders `SEU_SCHEMA`/`SUA_TABELA` antes do preenchimento; script idêntico ao validado em SSMS (parênteses de `ISNULL(STUFF(...))` fechados corretamente antes de `AS colunas`)

---

### 15.8 `DbConfiguracaoComponent`

**Componente:** `src/app/features/database/pages/db-configuracao.component.ts`

### O que faz
Form de conexão (servidor/porta/banco/usuário/senha mascarada) + Testar conexão + Salvar config. Armazena config em `DB_EXPLORER_*` env vars.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `testarConexao()`, `obterConfig()`, `atualizarConfig()` | Configuração |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/database/test-connection` | `DatabaseService.testarConexao()` | Testa conexão |
| GET | `/api/v1/database/config` | `DatabaseService.obterConfig()` | Obtém config |
| PUT | `/api/v1/database/config` | `DatabaseService.atualizarConfig()` | Salva config |

### Banco de Dados
- **Conecta:** ✅ Sim — configuração de conexão

### Dependências Externas
- `DatabaseService`
- `DB_EXPLORER_SENHA` (env var no IIS App Pool `Suporte_Back`)
- `configure-db-explorer-password.ps1` (script de configuração)

### Observações Técnicas
- Lazy loading em `database.routes.ts:15`
- Senha nunca logada, retornada pela API ou commitada
- Leitura via env var em produção, user-secrets em Development
