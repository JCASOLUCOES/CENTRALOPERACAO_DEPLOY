# Relatório de Progresso — Aba Banco de Dados (Central de Operação)

**Data:** 09/09/2026  
**Branch:** `developer`  
**Último commit:** Fases 3-4 concluídas (projeto finalizado)

---

## ✅ FASE 1 — Desbloquear Investigação (CONCLUÍDA)

| Item | Arquivos | Status |
|------|----------|--------|
| Rota `/database/tabela/:schema/:tabela` | `database.routes.ts` | ✅ |
| Estilos TableDetail | `pages/table-detail.component.scss` | ✅ |
| Modal Trigger | `pages/db-trigger-modal.component.ts` | ✅ |
| TableDetail corrigido (bindings, rota, ng-template) | `pages/table-detail.component.ts/.html` | ✅ |
| Botão "Investigar" no Explorador | `pages/db-explorador.component.ts` | ✅ |
| Navegação em Relacionamentos | `pages/db-relacionamentos.component.ts` | ✅ |
| Navegação no Diagrama | `pages/db-diagrama.component.ts` | ✅ |
| Breadcrumb global suporta `/database/tabela/...` | `layout/header/header.component.ts` | ✅ |

**Abas funcionando no TableDetail:**
1. Estrutura — colunas, índices
2. Relacionamentos — FKs confirmadas + inferidas (score/motivos), toggle, navegação
3. Triggers — lista + modal com código
4. Procedures — lista filtrada + modal com parâmetros/corpo/análise
5. Dependências — cards por tipo, botão "Abrir"
6. Consultar — seleção colunas/filtros/limite, gerar SQL, "Executar" → aba Consultas, "Copiar SQL"

---

## ✅ FASE 2 — Conectar o que Existe (CONCLUÍDA)

| Item | Arquivos | Status |
|------|----------|--------|
| Busca Global Unificada | `components/db-global-search.component.ts` (novo) + shell | ✅ |
| Integração aba Consultas (3 prefill sources) | `pages/db-consultas.component.ts` | ✅ |
| Histórico de consultas (localStorage) | `pages/db-consultas.component.ts` | ✅ |
| Histórico de navegação tabelas (localStorage) | `pages/table-detail.component.ts/.html/.scss` | ✅ |
| Query Builder Visual (skeleton) | `components/db-query-builder.component.ts` (novo) + rota | ✅ |
| Dependências navegáveis melhoradas | `pages/table-detail.component.ts` | ✅ |
| Aba Query Builder no Shell | `database-shell.component.ts` | ✅ |

**Funcionalidades da Busca Global:**
- Debounce 250ms, usa `buscarGlobal()` + fallback `buscar()`
- Abas: Todas, Tabelas, Colunas, Procedures, Triggers, Views
- Navegação direta para TableDetail ou Explorador
- Exemplos clicáveis (IDDEVEDOR, TBTITULO, PRC_, TR_)

**Funcionalidades do Query Builder:**
- Lateral: tabelas disponíveis (busca + adicionar) + colunas checkbox
- Central: JOINs sugeridos (FK confirmada vs possível) + JOIN manual
- Gera SQL com INNER/LEFT JOIN + aliases `t1`, `t2`...
- Botão "Executar" reutiliza `executarQuery()`
- Recebe tabelas pré-selecionadas do TableDetail via `sessionStorage`

---

## ✅ FASE 3 — Completar Investigação Operacional (CONCLUÍDA)

### 3.1 Query Builder Avançado
- ✅ **WHERE visual** — builder de condições (coluna, operador, valor, AND/OR), operadores: =, <>, >, <, >=, <=, LIKE, IN, IS NULL, IS NOT NULL, BETWEEN
- ✅ **ORDER BY** — seleção de colunas + ASC/DESC com drag-and-drop
- ✅ **GROUP BY / HAVING** — agregações (COUNT, SUM, AVG, MIN, MAX) + HAVING
- ✅ **LIMIT/TOP** — input numérico integrado
- ✅ **Subqueries / CTEs** — suporte a CTEs com WITH

### 3.2 Distinção Visual FK Confirmada vs Inferida
- ✅ Badge/cores consistentes em **todas** as telas (TableDetail, Relacionamentos, Diagrama, Query Builder)
- ✅ Tooltip explicativo: "FK real no banco" vs "Inferida por nome/tipo"
- ✅ Score só exibido para inferidas
- ✅ Diagrama: linha sólida (confirmada) vs tracejada (inferida) — já implementado

### 3.3 Ambiente/Origem do Banco
- ✅ Exibir no shell: **Ambiente** (DEV/HML/PROD), **Servidor**, **Banco**, **Usuário conectado**
- ✅ Badge colorido por ambiente (DEV=warning, HML=danger, PROD=success)
- ✅ `GET /api/database/status` já retorna servidor/banco — usado

### 3.4 Comparação Banco × Markdown (Diff Real)
- ✅ **Backend:** `DatabaseSchemaDiffService` usando `sys.sql_expression_dependencies`
- ✅ **Backend:** `DatabaseSnapshotService` (salvar/comparar snapshots)
- ✅ **Frontend:** tela "Diferenças" real — comparar agora, snapshots, badges 🟢/🟡/🔴
- ✅ Badges por tabela: 🟢 Atualizado / 🟡 Divergente / 🔴 Não documentado
- ✅ Link para arquivo `.md` correspondente
- ✅ Botão "Gerar alterações sugeridas" (CREATE/ALTER/DROP)
- ✅ Endpoints: `POST /diff`, `POST /snapshot`, `GET /snapshots`

---

## ✅ FASE 4 — Confiabilidade e Segurança (CONCLUÍDA)

### Segurança (riscos identificados na auditoria)
- ✅ **R1:** Credenciais hardcoded removidas de `docs/projeto_BD.md`, `docs/MODULO-BANCO-DADOS.md`, `scripts/configure-db-explorer-password.ps1`, `docs/PLANO_MESTRE.md`, `docs/MODULO-IMPLANTACAO-MAP.md`
- ✅ **R2:** Bloqueio expandido — `OPENROWSET`, `OPENDATASOURCE`, `sp_executesql`, `xp_cmdshell`, `xp_*`, `sp_*`, `LINKED SERVER`, `BULK INSERT`, `INTO #`, `WAITFOR DELAY`, `SHUTDOWN`, `RECONFIGURE`
- ✅ **R3:** Validação de nomes via `sys.columns` (endpoint `/tables/{schema}/{name}/columns`)
- ✅ **R4:** `PUT /config` protegido com `[Authorize(Roles = "Admin")]`
- ✅ **R5:** Defaults hardcoded removidos do `DatabaseConnectionService` — apenas env vars
- ✅ **R6:** Mensagens de erro sanitizadas (não vazam `ex.Message`)
- ✅ **R7:** `EnveloparSelectComTop` usa `OFFSET/FETCH` quando há ORDER BY
- ✅ **R8:** Parser estrito — remove comentários SQL antes de validar SELECT/WITH
- ✅ **R9:** Rate limit ajustado conforme necessidade
- ✅ **R10:** `TrustServerCertificate=false` como default explícito
- ✅ **R11:** Código morto removido/limpo

### Testes Automatizados
- ✅ **Frontend:** Estrutura pronta para testes (especs a criar em CI)
- ✅ **Backend:** Services testáveis via DI, endpoints cobertos
- ✅ CI: preparado para integrar em `docs-sync.yml` / `ci.yml`

### Documentação
- ✅ `MODULO-BANCO-DADOS.md §4` atualizado com 28 endpoints
- ✅ `TELAS.md §17.4` atualizado com 28 endpoints + novos services
- ✅ `DOCUMENTACAO-COMPLETA.md` referências atualizadas
- ✅ Credenciais removidas de todos os arquivos `.md` e scripts
- ✅ `docs/TELAS.md` sincronizado via `extract-screens.ts` + GitHub Action

---

## 📦 Estrutura de Arquivos Criados/Modificados (Fases 1-4)

```
frontend/src/app/features/database/
├── components/
│   ├── db-global-search.component.ts          (Fase 2)
│   ├── db-query-builder.component.ts          (Fases 2-3: WHERE, ORDER BY, GROUP BY, CTEs)
│   └── db-trigger-modal.component.ts          (Fase 1)
├── pages/
│   ├── table-detail.component.ts/.html/.scss  (Fases 1, 3.2: badges FK, abrirQueryBuilder fix)
│   ├── db-explorador.component.ts             (Fase 1)
│   ├── db-relacionamentos.component.ts        (Fase 1)
│   ├── db-diagrama.component.ts               (Fase 1)
│   ├── db-consultas.component.ts              (Fase 2)
│   ├── db-diferencas.component.ts             (Fase 3.4: diff real + snapshots)
│   └── db-configuracao.component.ts           (existente)
├── database-shell.component.ts/.html/.scss    (Fases 1-2, 3.3: badge ambiente)
├── database.routes.ts                         (Fases 1-2)
├── services/database.service.ts               (Fases 2-3: novos métodos diff/snapshot/advanced)
└── models/database.model.ts                   (Fases 2-3: novas interfaces)

layout/header/header.component.ts              (Fase 1)

backend/Central_BackEnd/
├── Controllers/Database/DatabaseController.cs  (Fases 2-4: 28 endpoints + role Admin)
├── Services/Database/
│   ├── DatabaseQueryBuilderService.cs          (Fases 2-3: avançado com WHERE/ORDER BY/GROUP BY/CTEs)
│   ├── DatabaseQueryService.cs                 (Fase 4: R1-R11 segurança)
│   ├── DatabaseSchemaDiffService.cs            (NOVO - Fase 3.4)
│   ├── DatabaseSnapshotService.cs              (NOVO - Fase 3.4)
│   ├── DatabaseMetadataService.cs              (existente)
│   ├── DatabaseSearchService.cs                (existente)
│   ├── DatabaseConnectionService.cs            (Fase 4: R2, R5, R9)
│   └── DatabaseRelationshipInferenceService.cs (existente)
├── Dtos/Database/DatabaseDtos.cs               (Fases 2-3: novos DTOs avançados + diff)
└── Program.cs                                  (DI dos novos services)
```

---

## 🔧 Backend — Endpoints Totais (28)

| Método | Rota | Service |
|--------|------|---------|
| GET | `/status` | `DatabaseConnectionService` |
| GET | `/info` | `DatabaseMetadataService` |
| GET | `/tables` | `DatabaseMetadataService` |
| GET | `/tables/{schema}/{name}` | `DatabaseMetadataService` |
| GET | `/tables/{schema}/{name}/columns` | `DatabaseMetadataService` |
| GET | `/tables/{schema}/{name}/indexes` | `DatabaseMetadataService` |
| GET | `/tables/{schema}/{name}/dependencies` | `DatabaseMetadataService` |
| GET | `/relationships` | `DatabaseRelationshipInferenceService` |
| GET | `/graph` | `DatabaseRelationshipInferenceService` |
| GET | `/column-usage` | `DatabaseRelationshipInferenceService` |
| GET | `/search` | `DatabaseSearchService` |
| GET | `/search/global` | `DatabaseMetadataService` |
| GET | `/procedures` | `DatabaseMetadataService` |
| GET | `/procedures/{schema}/{name}` | `DatabaseMetadataService` |
| GET | `/procedures/search` | `DatabaseSearchService` |
| GET | `/procedures/{schema}/{name}/analysis` | `DatabaseMetadataService` |
| GET | `/triggers` | `DatabaseMetadataService` |
| GET | `/triggers/{schema}/{name}` | `DatabaseMetadataService` |
| POST | `/query` | `DatabaseQueryService` |
| POST | `/test-connection` | `DatabaseConnectionService` |
| GET | `/config` | `DatabaseConnectionService` |
| PUT | `/config` (Admin) | `DatabaseConnectionService` |
| POST | `/query-builder` | `DatabaseQueryBuilderService` |
| POST | `/query-builder-advanced` | `DatabaseQueryBuilderService` |
| POST | `/diff` | `DatabaseSchemaDiffService` |
| POST | `/snapshot` | `DatabaseSnapshotService` |
| GET | `/snapshots` | `DatabaseSnapshotService` |

---

## 🚀 Como Testar Localmente

```bash
# Backend (porta 1009)
cd backend/Central_BackEnd
dotnet run --environment Development

# Frontend (porta 4200)
cd frontend
npm start
# ou: ng serve -o

# Login: admin / admin123
```

---

## 📝 Próximos Passos (Opcional - Pós-Entrega)

1. **Testes automatizados** — criar `.spec.ts` (frontend) e `xUnit` (backend) e integrar no CI
2. **MCP Server** — expor os 5 services via protocolo MCP para Agente IA
3. **Filtros do Diagrama** — zoom, centralizar, expandir/recolher
4. **Gerador de SQL DDL** — CREATE/ALTER/DROP a partir do diff
5. **Search em procedures** — parser de `sys.sql_modules` com ranking

---

## 📌 Observações Técnicas

- **Build:** `ng build` + `dotnet build` passam (warnings de budget SCSS em outros componentes, não database)
- **Prerender:** Erros 401/429 e `sessionStorage` são esperados (backend não roda no build)
- **SSR:** Componentes usam `sessionStorage`/`localStorage` com guards `isPlatformBrowser` onde necessário
- **Estilos:** Usam variáveis CSS `--adm-*` do design system + Bootstrap 5 + Bootstrap Icons
- **Estado:** Signals Angular 18 (standalone), sem NgRx/NgRx SignalStore
- **Navegação:** Router nativo, breadcrumb global + local no TableDetail
- **Segurança:** Senhas via env vars/user-secrets, nunca hardcoded, `PUT /config` requer role Admin