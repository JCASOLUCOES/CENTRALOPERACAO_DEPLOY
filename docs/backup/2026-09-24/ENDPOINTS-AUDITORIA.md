# Auditoria de Endpoints Backend vs Frontend

**Data:** 2026-09-24 (revisado após a remoção frontend de Etapas Globais; Database 21→19 em 24/09/2026)
**Total Backend Endpoints:** 81
**Rotas backend distintas com wrapper frontend válido:** 77
**Chamadas frontend órfãs de Etapas Globais:** 0

> A contagem de backend vem dos atributos `HttpGet/Post/Put/Delete/Patch` nos controllers atuais. A coluna “Frontend” abaixo considera wrappers no source; não afirma que toda tela expose cada operação.

---

## Resumo

| Categoria | Backend | Frontend válido | Não usados | % Cobertura |
|-----------|---------|----------------|------------|-------------|
| Database | 19 | 19 | 0 | 100% |
| Implantação - Projetos | 16 | 16 | 0 | 100% |
| Implantação - Tarefas | 16 | 16 | 0 | 100% |
| Implantação - TiposProjeto | 5 | 5 | 0 | 100% |
| Implantação - ColunasKanban | 5 | 1 | 4 | 20% |
| Implantação - Etapas Globais | 0 | 0 | 0 | — |
| Implantação - AdminDashboard | 1 | 1 | 0 | 100% |
| Implantação - Dashboard | 1 | 1 | 0 | 100% |
| Agenda | 10 | 10 | 0 | 100% |
| Acessos | 3 | 3 | 0 | 100% |
| Auth | 4 | 4 | 0 | 100% |
| RagProxy | 1 | 1 | 0 | 100% |
| **TOTAL** | **81** | **77** | **4** | **95%** |

*Etapas Globais permanece com zero endpoint em backend e zero chamada no frontend. A API global não deve ser recriada.*

---

## Endpoints backend não utilizados pelo frontend

### 1. `ColunasKanbanController` — 4 operações sem wrapper
| Método | Endpoint | Situação |
|--------|----------|----------|
| POST | `/implantacao/colunas-kanban` | Backend existe; frontend expõe somente leitura |
| PUT | `/implantacao/colunas-kanban/{id}` | Backend existe; frontend expõe somente leitura |
| DELETE | `/implantacao/colunas-kanban/{id}` | Backend existe; frontend expõe somente leitura |
| POST | `/implantacao/colunas-kanban/reordenar` | Backend existe; frontend expõe somente leitura |

### 2. `ProjetosController` — 16/16 mapeados no `ProjetosService`

Não há endpoint de Projetos atual sem wrapper. As três rotas antigas abaixo **não contam** para o backend:

| Método | Rota legada removida do source | Estado atual |
|--------|-----------------------------|--------------|
| GET | `/api/v1/implantacao/projetos/{id}/jornada` | Removida; cálculo privado permanece em `IProjetoJornadaService` |
| POST | `/api/v1/implantacao/projetos/{id}/etapas/inicializar` | Removida; cards são criados automaticamente no POST do projeto e também inicializados pela leitura |
| PATCH | `/api/v1/implantacao/projetos/{id}/status` | Removida; `ProjetoAtualizarRequest.Status` continua no `PUT /projetos/{id}` |

No IIS, as três podem continuar retornando **401** enquanto o backend atual não for publicado; isso é versionamento implantado x source, não evidência de rota vigente.

### 3. Outros controllers
`TiposProjetoController` (5), `TarefasController` (16), `AdminDashboardController` (1), `DashboardController` (1), `AgendaController` (10), `AcessosController` (3), `AuthController` (4), `RagProxyController` (1) e `DatabaseController` (19) possuem wrappers no source. `GestorController` foi removido em 24/09/2026.

---

## Diagnóstico encerrado: Etapas Globais

Antes da limpeza, `GET` e `POST /api/v1/implantacao/etapas` retornavam 404 no ambiente publicado porque o controller global não existia. A tela frontend capturava a falha e exibia estado vazio.

A funcionalidade frontend foi removida: as rotas `/admin/cadastros/etapas*`, `EtapasComponent`, `EtapaFormComponent`, seus SCSS, `EtapasService`, tipos relacionados, o wrapper morto `TarefasService.listarEtapas()` e o breadcrumb específico saíram do source. A API global **não deve ser recriada**. O modelo vigente permanece sendo nove cards por Projeto em `tbprojetoEtapa`, expostos por `/implantacao/projetos/etapas-padrao` e `/implantacao/projetos/{id}/etapas`.

### `JotaChatService` — métodos residuais sem backend

`GET /sessions`, `GET /sessions/{id}/messages` e `DELETE /sessions/{id}` continuam no service, mas não há métodos equivalentes no `RagProxyController`. A página `/chat` foi removida e o widget atual usa somente `POST /api/rag-proxy/chat`; portanto esses três wrappers residuais não representam fluxo ativo. Limpeza recomendada em tarefa separada.

---

## Conflitos de rota

Não foi encontrado conflito entre `PUT /implantacao/projetos/{id:int}/etapas/{ordem:int}` e o wrapper `ProjetosService.atualizarEtapa(projetoId, ordem)`. O nome do parâmetro textual não integra a URL; os valores são interpolados pela posição e os dois componentes enviam números. O diagnóstico anterior de possível 404 por `id` vs `projetoId` não se aplica ao source atual.

---

## Recomendações

### Prioridade alta
1. **Publicar o backend atual** quando autorizado; até lá, os 401 das rotas antigas de Projetos no IIS não representam o source.

### Prioridade média
2. Remover os três métodos residuais de sessão do `JotaChatService` ou implementar APIs correspondentes; o widget atual depende apenas de `POST /chat`.
3. Decidir o contrato de `ColunasKanbanController`: manter apenas leitura no frontend ou expor gestão; atualmente há quatro operações backend sem wrapper.
4. Documentar no Swagger/OpenAPI as operações de cards por projeto e o contrato `Status` de `PUT /projetos/{id}`.

---

## Mapeamento dos serviços frontend

| Service | Arquivo | Chamadas no source |
|---------|---------|---------------------|
| `ProjetosService` | `implantacao/services/projetos.service.ts` | 16 endpoints de `ProjetosController` + lookups |
| `TarefasService` | `implantacao/services/tarefas.service.ts` | 16 endpoints de tarefas |
| `TiposProjetoService` | `implantacao/services/cadastros.service.ts` | 5 endpoints válidos |
| `ColunasKanbanService` | `implantacao/services/cadastros.service.ts` | 1 endpoint válido (GET) |
| `AgendaService` | `agenda/services/agenda.service.ts` | 10 endpoints |
| `DatabaseService` | `database/services/database.service.ts` | 19 endpoints |
| `AuthService` | `core/services/auth.service.ts` | 4 endpoints |
| `AcessosService` | `services/acessos.service.ts` | 3 endpoints |
| `AdminDashboardService` | `admin/services/admin-dashboard.service.ts` | 1 endpoint |
| `OperadoresService` | `core/services/operadores.service.ts` | 1 endpoint |
| `JotaChatService` | `chat/jota-chat.service.ts` | 1 chamada ativa + 3 wrappers residuais sem backend |
| `DashboardService` | `implantacao/services/dashboard.service.ts` | 1 endpoint |

### Services locais (sem HTTP)
- CursosService, FerramentasService, ProcedimentosService, UtilidadesService, BuscaIndexService, RecentesService e PapelUsuarioService.

---

## Próximos passos sugeridos

1. Após deploy autorizado, repetir smoke de `ProjetosController` e confirmar que as três rotas antigas deixam de existir no IIS.
2. Limpar wrappers residuais do Jota e revisar o contrato de escrita de Colunas Kanban.
3. Executar testes de integração das 77 rotas backend atualmente mapeadas.