> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 19. Chat / JOTA

### 19.1 `JotaWidgetComponent` (flutuante, em todo o `MainLayout`)

**Componente:** `src/app/features/chat/jota-widget/jota-widget.component.ts` (+ `.html`/`.scss`)

### O que faz

JOTA transversal: FAB + painel flutuante disponível em todas as telas do `MainLayout`. Usa o proxy real (`POST /api/rag-proxy/chat` via `JotaChatService.chat()`); sem respostas mockadas — falha exibe erro honesto ("JOTA indisponível no momento. Tente de novo em instantes."). Desde 2026-09-18 há contexto por tarefa (Corretor #1): o drawer do Kanban tem "Perguntar ao JOTA sobre esta tarefa", que situa o widget (`ChatContextoService`) com id/título/responsável/prioridade/status/projeto/descrição, exibe o indicador "Falando sobre: T{id}" (dispensável via ✕) e prefixa o prompt (resposta curta, máx. 3 linhas); o histórico por tarefa (últimas 30 mensagens) persiste em `sessionStorage` e é restaurado ao reabrir o contexto.

**Página `/chat` removida** em 2026-09-24 (`e87d763`): `chat.routes.ts`, `jota.component.*` e `rag-chat-widget.component.*` excluídos; rota `chat` (redirect `/`) também removida de `features.routes.ts`. O acesso ao JOTA é só via widget flutuante.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `JotaChatService` | `chat({ message, workspaceId: 'suporte', mode: 'query', sessionId })` | Chama o proxy real `POST /api/rag-proxy/chat` (`apiUrl = '/api/rag-proxy'`) |
| `ChatContextoService` | contexto por tarefa do Kanban | Prefixa prompt + indicador "Falando sobre: T{id}" |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | /api/rag-proxy/chat | RagProxyService.ChatAsync() | Recebe mensagem + workspace, retorna resposta + documentos + tempo |

### Payload de Requisição
| Campo | Tipo | Descrição |
|-------|------|-----------|
| message | string | Pergunta do operador |
| workspaceId | string | ID do workspace AnythingLLM (suporte, financeiro, implantacao, glossario) |
| mode | string | query | chat ou query |
| sessionId | string? | ID de sessão para histórico |

### Resposta da API
| Campo | Tipo | Descrição |
|-------|------|-----------|
| resposta | string | Resposta formatada com contexto de banco + glossário |
| documentos | string[] | Lista de documentos consultados |
| tempoProcessamento | number | Tempo em segundos |
| sessionId | string | ID de sessão persistido em sessionStorage |

### Banco de Dados
- **Conecta:** Sim — consultas EF Core para contadores (Operadores.Count()) e termos de glossário
- AnythingLLM (motor RAG — opcional; modo fallback disponível)
- sessionStorage (persistência de sessão de chat)

### Observações Técnicas
- Componente **standalone** Angular, não requer módulo NgModule
- Sem item do JOTA na sidebar; acesso via FAB flutuante e CTA da trilha Resolver
- Sem mock no widget: `catchError(() => of(null))` → `erro.set('JOTA indisponível no momento. Tente de novo em instantes.')`; mensagem inicial fixa de boas-vindas; `sessionId` mantido em memória do componente
- Historial persistido em sessionStorage, sobrevivendo a reload
- Rate limiting no backend (políticas leitura, validação, login)
- CORS configurado no AnythingLLM para domínio do IIS (http://192.168.2.130:1010)
- Chaves de API nunca expostas no frontend — tudo via backend proxy

---

## 20. Central Executiva — REMOVIDA (2026-09-24)

**Código-fonte removido** do repo em `e87d763`: pasta `frontend/src/app/features/executivo/` excluída (componente, service, models, registry, rotas). Rota `/executivo` já estava comentada; agora não há código a recuperar.

**Deep-link `?projetoId=` do Kanban permanece** (`kanban.component.ts`) — usado por qualquer link interno, não só pela antiga Central Executiva.

---

## 21. Módulo Gestor — REMOVIDO (2026-09-24)

**Removido** em `e87d763` (frontend + backend):

| O que | Detalhe |
|-------|---------|
| Frontend | `features/gestor/` inteira (entrada full-screen, CEO/CTO/COO, nav/layout, services, models) |
| Backend | `Controllers/Gestor/`, `Services/Gestor/`, `Dtos/Gestor/` — **4 endpoints** removidos (`GET /gestor/metricas`, `/ceo/metricas`, `/cto/metricas`, `/coo/metricas`) |
| Program.cs | DI `IGestorMetricasService` + política `GestorAccess` removidas (`AddAuthorization()` sem policy) |
| Rotas | `/gestor/entrada`, alias `/modulos`, redirect `chat` → removidos de `app.routes.ts` / `features.routes.ts` |
| Login | `resolverDestino()` sem deep-link → **Home `/`** (qualquer perfil) |
| UI | Item "Trocar Painel" removido do dropdown do usuário; labels `/gestor/*`, `/chat`, `/suporte`, `/admin/dashboard` removidos do breadcrumb; link `/suporte` removido do footer |

**Pós-login (atual):** deep-link (`returnUrl`) sempre respeitado; senão → `/` (Home). AdminDashboard (`/admin/dashboard`) permanece no código **sem rota ativa** (import/rota já estavam comentados; decisão 2026-09-24 de não tocar no service/backend).
