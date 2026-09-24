# Auditoria de Endpoints Backend vs Frontend

**Data:** 2026-09-21 (Database revisado em 2026-09-23 — `640bbf6`; Gestor removido em 2026-09-24 — `e87d763`)  
**Total Backend Endpoints:** 85 (Database: 21 desde 23/09/2026; −4 Gestor em 24/09/2026)  
**Total Frontend Chamadas Mapeadas:** ~120 (algumas duplicadas/overloads)

---

## Resumo

| Categoria | Backend | Frontend Usa | Não Usados | % Cobertura |
|-----------|---------|--------------|------------|-------------|
| Database | 21 | 21 | 0 | 100% |
| Implantação - Projetos | 22 | 20 | 2 | 91% |
| Implantação - Tarefas | 19 | 19 | 0 | 100% |
| Implantação - TiposProjeto | 5 | 1 | 4 | 20% |
| Implantação - ColunasKanban | 5 | 1 | 4 | 20% |
| Implantação - Etapas | 4 | 1 | 3 | 25% |
| Implantação - AdminDashboard | 1 | 1 | 0 | 100% |
| Implantação - Dashboard | 1 | 1 | 0 | 100% |
| Agenda | 14 | 14 | 0 | 100% |
| Acessos | 3 | 3 | 0 | 100% |
| Auth | 4 | 4 | 0 | 100% |
| RagProxy | 1 | 5* | 0* | - |
| **TOTAL** | **85** | **~120** | **7** | **92%** |

*RagProxy: Frontend chama endpoints que NÃO EXISTEM no backend (ver seção "Endpoints Frontend Sem Backend")

---

## Endpoints Backend NÃO Utilizados pelo Frontend

### 1. Implantação - TiposProjetoController (4 não usados)
| Método | Endpoint | Motivo |
|--------|----------|--------|
| GET | `/implantacao/tipos-projeto/{id}` | Frontend só lista (GET collection) |
| POST | `/implantacao/tipos-projeto` | Sem tela de criação |
| PUT | `/implantacao/tipos-projeto/{id}` | Sem tela de edição |
| DELETE | `/implantacao/tipos-projeto/{id}` | Sem tela de exclusão |

### 2. Implantação - ColunasKanbanController (4 não usados)
| Método | Endpoint | Motivo |
|--------|----------|--------|
| POST | `/implantacao/colunas-kanban` | Colunas são fixas (seed/migration) |
| PUT | `/implantacao/colunas-kanban/{id}` | Colunas são fixas |
| DELETE | `/implantacao/colunas-kanban/{id}` | Colunas são fixas |
| POST | `/implantacao/colunas-kanban/reordenar` | Colunas são fixas |

> **Nota:** O service `ColunasKanbanService` tem comentário: "Colunas do Kanban são FIXAS (7 colunas via seed): BACKLOG, A FAZER, EM DESENVOLVIMENTO, EM ANDAMENTO, HOMOLOGACAO, BLOQUEADO, CONCLUIDO. Este service expõe apenas leitura. Gestão via seed/migration."

### 3. Implantação - EtapasController (3 não usados)
| Método | Endpoint | Motivo |
|--------|----------|--------|
| POST | `/implantacao/etapas` | Sem tela de criação de etapas globais |
| PUT | `/implantacao/etapas/{id}` | Sem tela de edição |
| DELETE | `/implantacao/etapas/{id}` | Sem tela de exclusão |

> **Nota:** Apenas `GET /implantacao/etapas` é usado via `TarefasService.listarEtapas()` para popular dropdowns no formulário de tarefa.

### 4. Implantação - ProjetosController (2 não usados)
| Método | Endpoint | Motivo |
|--------|----------|--------|
| GET | `/implantacao/projetos/{id}/etapas` | Endpoint existe mas não chamado diretamente (usa `obterEtapasProjeto` que chama `/projetos/{projetoId}/etapas`) |
| PUT | `/implantacao/projetos/{id}/etapas/{ordem}` | **CONFLITO**: Frontend chama `PUT /implantacao/projetos/{projetoId}/etapas/{ordem}` mas backend tem `PUT /implantacao/projetos/{id}/etapas/{ordem:int}` - **verificar se rota bate** |

### 5. DatabaseController
> **23/09/2026 (`640bbf6`):** módulo enxugado — removidos do backend 7 endpoints (`POST /query`, `GET /procedures/search`, `PUT /config`, `POST /diff`, `POST /snapshot`, `GET /snapshots`, `POST /snapshot/comparar`). Database agora: **21 endpoints, 21 usados pelo FE (100%)**. `query-builder-advanced` é usado pelo Criador de Consultas (`db-query-builder.component.ts`).

### 6. GestorController — REMOVIDO (2026-09-24, `e87d763`)
> Removidos **4 endpoints**: `GET /gestor/metricas`, `GET /gestor/ceo/metricas`, `GET /gestor/cto/metricas`, `GET /gestor/coo/metricas`. Pasta `Controllers/Gestor/`, `Services/Gestor/`, `Dtos/Gestor/` e DI/policy `GestorAccess` excluídas do `Program.cs`.

---

## Endpoints Frontend SEM Backend Correspondente (PROBLEMA CRÍTICO)

### JotaChatService (RagProxyController)
O frontend chama 4 endpoints que **NÃO EXISTEM** no `RagProxyController`:

| Frontend Chama | Backend Tem? | Status |
|----------------|--------------|--------|
| `GET /api/rag-proxy/sessions` | ❌ NÃO | **404** |
| `GET /api/rag-proxy/sessions/{id}/messages` | ❌ NÃO | **404** |
| `DELETE /api/rag-proxy/sessions/{id}` | ❌ NÃO | **404** |
| `POST /api/rag-proxy/chat` | ✅ SIM | OK |

> **Impacto:** As funcionalidades de histórico de sessões do JOTA estão quebradas.

---

## Endpoints Backend Com Duplicação/Conflito de Rota

### ProjetosController - Atualizar Etapa
- **Backend:** `PUT /implantacao/projetos/{id:int}/etapas/{ordem:int}` (linha 114)
- **Frontend:** `PUT /implantacao/projetos/{projetoId}/etapas/{ordem}` via `atualizarEtapa()`

**Verificar:** O parâmetro `id` vs `projetoId` e `ordem:int` vs `ordem` - pode causar 404 se não bater.

---

## Recomendações

### Prioridade Alta (Quebrado)
1. **Implementar endpoints faltantes no RagProxyController** ou remover chamadas do JotaChatService
2. **Verificar rota PUT /projetos/{id}/etapas/{ordem}** - testar se funciona

### Prioridade Média (Limpeza)
3. **Remover endpoints não usados do TiposProjetoController** (POST, PUT, DELETE, GET by ID) - ou criar telas de CRUD
4. **Remover endpoints não usados do ColunasKanbanController** (POST, PUT, DELETE, reordenar) - já documentado como fixo
5. **Remover endpoints não usados do EtapasController** (POST, PUT, DELETE) - ou criar gestão de etapas globais

### Prioridade Baixa
6. ~~**DatabaseController** — Verificar uso de `query-builder-advanced` na UI~~ (em uso pelo Criador de Consultas; 7 endpoints mortos removidos em 23/09/2026)
7. **Documentar** no Swagger/OpenAPI quais endpoints são "internos/fixos" vs "públicos para UI"

---

## Mapeamento Completo Frontend → Backend

### Services que fazem HTTP calls reais:

| Service | Arquivo | Endpoints Backend Chamados |
|---------|---------|---------------------------|
| ProjetosService | `implantacao/services/projetos.service.ts` | 20 endpoints |
| TarefasService | `implantacao/services/tarefas.service.ts` | 18 endpoints |
| AgendaService | `agenda/services/agenda.service.ts` | 10 endpoints |
| DatabaseService | `database/services/database.service.ts` | 21 endpoints |
| AuthService | `core/services/auth.service.ts` | 4 endpoints |
| AcessosService | `services/acessos.service.ts` | 3 endpoints |
| AdminDashboardService | `admin/services/admin-dashboard.service.ts` | 1 endpoint |
| OperadoresService | `core/services/operadores.service.ts` | 1 endpoint |
| JotaChatService | `chat/jota-chat.service.ts` | 5 endpoints (4 quebrados) |
| ColunasKanbanService | `implantacao/services/cadastros.service.ts` | 1 endpoint |
| DashboardService | `implantacao/services/dashboard.service.ts` | 1 endpoint |

### Services que usam dados locais (sem HTTP):
- CursosService (`cursos-novos.data.ts`)
- FerramentasService (`ferramentas.data.ts`)
- ProcedimentosService (`procedimentos.data.ts`)
- UtilidadesService (`utilidades.data.ts`)
- BuscaIndexService (índice local)
- RecentesService (localStorage)
- PapelUsuarioService (derivado do Auth)

---

## Próximos Passos Sugeridos

1. **Corrigir JotaChatService** - Implementar endpoints de sessão no backend ou remover do frontend
2. **Testar rota PUT projetos/etapas** - Confirmar se `{id:int}` vs `{projetoId}` funciona
3. **Decidir sobre TiposProjeto CRUD** - Criar UI ou remover endpoints
4. **Documentar endpoints "seed-only"** (ColunasKanban, Etapas globais) no Swagger
5. **Executar testes de integração** para validar todos os endpoints mapeados