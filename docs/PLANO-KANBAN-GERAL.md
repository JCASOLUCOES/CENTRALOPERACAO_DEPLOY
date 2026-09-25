# Plano — Kanban Geral da Empresa (Setores + Permissões)

> **Status:** Aguardando validação da equipe.
> **Data:** 22/09/2026
> **Branch prevista:** `feat/design-tokens`
> **Commit previsto:** `feat: kanban geral com setores e permissoes`

---

## 1. Contexto e objetivo

Hoje o Kanban é restrito ao contexto de Implantação (`/implantacao/kanban`, reaproveitado em `/admin/kanban`). O objetivo é evoluir para um **Kanban geral da empresa**, com:

- Rota própria acessível a todos os autenticados;
- **Filtro por setor** (pills no topo);
- **Permissões por setor**: qualquer um visualiza, só o próprio setor edita (Admin/Suporte/Perfil F editam tudo);
- Implantação continua com seu kanban de sempre.

### Decisão de layout

| Opção | Descrição | Veredito |
|---|---|---|
| **A — Rota própria na sidebar** | Item "Kanban" no grupo Início | ✅ **V1** |
| B — Abas em `/agenda` | Calendário \| Kanban | ❌ descartada (agenda densa) |
| C — Split vertical agenda 55% + kanban 45% | Visão síntese | 🗺️ **Roadmap (v2)** — não agora |

---

## 2. Decisões de produto (defaults — validar com a equipe)

| # | Pergunta | **Default assumido** |
|---|---|---|
| 1 | Leitura × edição | **Leitura aberta a todos autenticados** (o filtro organiza, não esconde). **Edição travada** por setor. |
| 2 | Escopo do kanban geral | **Todas as tarefas** (com e sem projeto), com badge de projeto/etapa. |
| 3 | Setor da tarefa | **Automático do criador** (`operador.SetorId`); **Admin pode corrigir** no drawer; sem setor → "Sem setor" (só Admin edita). |
| 4 | Backfill das tarefas existentes | **`SetorId = 2` (Implantação)** na migration (hoje todas são de implantação). |
| 5 | Seed de setores | `1=Suporte`, `2=Implantação`, `3=Financeiro`, `4=RH`, `5=Comercial`. |

---

## 3. Premissas técnicas verificadas no código

- `IMPL_ColunaKanban` é tabela **única, sem escopo** (7 colunas globais via seed).
- `IMPL_Tarefa.ProjetoId` **já é opcional** (migration `TarefaProjetoOpcional`) — tarefa "solta" já funciona.
- `KanbanComponent` **já é reusado** por `/implantacao/kanban` e `/admin/kanban` (detecta contexto via URL e query params) — **padrão a seguir: `route.data.modo`, nunca herança de componente**.
- Permissões hoje são **binárias** (`adminGuard` = Administrador ou nada); não existe matriz por setor.
- **Não existe entidade Setor** no domínio; `IMPL_Equipe` existiu e foi **removida** em 12/09/2026 (`RemoveEquipes.cs`) — Setor é conceito novo (propriedade do operador + da tarefa), não reabertura da Equipe.
- JWT já emite claims `perfil`, `funcao_*` (`AuthService.cs` ~181-187) — padrão para a nova claim `setor_id`.
- **Documentação:** o agente `docs-writer` está disponível e deve atualizar os 12 documentos canônicos automaticamente após a implementação.

---

## 4. Fase 1 — Fundação: entidade Setor (backend + auth)

### Novos arquivos

| Arquivo | Conteúdo |
|---|---|
| `backend/Central_BackEnd/Models/Setor.cs` | Tabela `CC_Setor`: `Id (PK)`, `Nome (100, unique)`, `Ativo (bit)`, `Cor (7, opcional)`, `Ordem (int)`, `DataInclusao/UsuarioInclusao` (padrão do projeto) |
| `backend/Central_BackEnd/Dtos/SetorDtos.cs` | `SetorCriarRequest`, `SetorAtualizarRequest`, `SetorResumo` |
| `backend/Central_BackEnd/Services/ISetorService.cs` | Contrato CRUD |
| `backend/Central_BackEnd/Services/SetorService.cs` | CRUD simples |
| `backend/Central_BackEnd/Controllers/SetoresController.cs` | `api/v{version}/setores` — `GET` (autenticado); `POST/PUT/DELETE` = `[Authorize(Roles = "Administrador")]` |

### Arquivos alterados

- `Models/Operador.cs` → nova coluna `SetorId (int?, FK CC_Setor)` + navegação
- `Data/AppDbContext.cs` → `DbSet<Setor>` + fluent config (`Nome` unique; FK `Operador.SetorId` → `DeleteBehavior.SetNull`)
- `Services/AuthService.cs` (`GerarJwt`, ~linha 170) → claims `setor_id` e `setor_nome` quando houver
- `Dtos` de login/`UsuarioResponse` → expor `SetorId`/`SetorNome` (UX do frontend; **permissão no backend lê do DB**, não da claim, para evitar claim defasada)

### Migration

- **`AddSetores`** (gerada via AFTool, data real 22/09) + seed:
  ```
  1 = Suporte
  2 = Implantação
  3 = Financeiro
  4 = RH
  5 = Comercial
  ```

### Pendência da fase

- **Onde editar o setor do operador**: não existe `OperadoresController` hoje. Localizar a tela de gestão de usuários (provável `GestorController`/`AuthController`) e adicionar o campo. Se não houver UI, criar endpoint mínimo e deixar `SetorId` null + correção posterior.

---

## 5. Fase 2 — `IMPL_Tarefa` ganha `SetorId`

### Alterações

- `Models/Implantacao/Tarefa.cs` → `[Column("TRF_SetorId")] int? SetorId` + nav `Setor`
- `Data/AppDbContext.cs` (entity `Tarefa`, ~linha 189) → FK `SetorId` → `SetNull`
- `Dtos/Implantacao/TarefaDtos.cs` → `SetorId`/`SetorNome` em `TarefaResumo` e `TarefaDetalhe`; `int? SetorId` em `TarefaCriarRequest`/`TarefaAtualizarRequest`; novo campo `int? SetorId` em `TarefaFiltro`
- `Services/Implantacao/TarefaService.cs`:
  - `ListarAsync` → aplica filtro `f.SetorId` e devolve `SetorId` no resumo
  - `CriarAsync` → se `req.SetorId == null`, resolve do operador logado (`_db.Operadores`)

### Migration

- **`TarefaSetorId`** + backfill:
  ```sql
  UPDATE IMPL_Tarefa SET TRF_SetorId = 2; -- Implantação
  ```

---

## 6. Fase 3 — Rota + UI do Kanban Geral

### Backend

- `Controllers/Implantacao/TarefasController.Listar` → `[FromQuery] int? setorId` repassado ao `TarefaFiltro`
- **Sem restrição de leitura** (decisão #1)

### Frontend

**`frontend/src/app/features.routes.ts`** — nova rota (antes de `implantacao`):

```ts
{
  path: "kanban",
  loadComponent: () =>
    import("@features/implantacao/pages/kanban/kanban.component").then((m) => m.KanbanComponent),
  canActivate: [authGuard],
  data: { modo: "geral" }
}
```

**`implantacao/pages/kanban/kanban.component.ts`** — ler `route.data.modo === 'geral'`:

1. **Pills de setor** no topo (`Todos | Suporte | Implantação | Financeiro | RH | Comercial`), alimentadas por novo `SetoresService` (`GET /setores`).
   - Default: setor do usuário logado; se não tiver setor → `Todos`.
2. **Criar tarefa sem exigir projeto/etapa** (hoje `kanban.component.ts:1062-1067` força etapa quando há projeto — manter só se projeto for escolhido).
3. **Badge de setor** no card (cor do setor).
4. **UX de permissão** (card de outro setor, usuário comum):
   - `opacity: .5`, `cursor: not-allowed`
   - drag-and-drop desabilitado
   - menu ⋮: Editar/Excluir desabilitados
   - clique no card → drawer somente leitura
5. Payload de criação envia `setorId` do usuário.

**`shared/config/header-nav.config.ts`** — grupo Início (linha 40-43):

```ts
{ label: 'Kanban', route: '/kanban', icone: 'bi-kanban-fill', dica: 'Quadro geral da empresa' },
```

**`implantacao.routes.ts`** — `/implantacao/kanban` **inalterado** (comportamento atual preservado; opcional pré-filtro `setorId=2` — fora do v1).

### Padrão de reaproveitamento

- **Mesmo `KanbanComponent`** via `route.data.modo` — como `/admin/kanban` já faz (`kanban.component.ts:736-745`).
- **Proibido** subclasse/herança de componente (template de ~1000+ linhas).

---

## 7. Fase 4 — Permissões por setor (backend = fonte da verdade)

### Regra central

```
PodeEditar(tarefa, operador) =
       operador.PerfilId == "A"                          // Administrador
    || operador em {Administrador, Suporte, F}            // super-usuários
    || (tarefa.SetorId != null
        && tarefa.SetorId == operador.SetorId)            // próprio setor

// SetorId null na tarefa → somente Admin/Suporte/F
```

Violação → `UnauthorizedAccessException` → **403** (padrão já usado em apontamentos, `TarefasController.cs:173`).

**Fonte do setor do usuário: lookup no DB** (`_db.Operadores`), não a claim (claim pode estar defasada).

### Endpoints que passam a checar (todos os de escrita)

| Endpoint | Ação |
|---|---|
| `POST /` (Criar) | checa setor **resultante** (req ou derivado) |
| `PUT /{id}` (Atualizar) | checa setor da tarefa **existente** |
| `PATCH /{id}/coluna` (**mover card**) | checa setor da tarefa |
| `PATCH /{id}/arquivar` | checa setor da tarefa |
| `PATCH /{id}/desarquivar` | checa setor da tarefa |
| `DELETE /{id}` | checa setor da tarefa |
| `POST /{id}/comentarios` | checa setor da tarefa |
| `POST /{id}/apontamentos` | checa setor da tarefa (hoje só `ehAdmin`) |
| `PUT /apontamentos/{id}` | checa setor da tarefa |
| `DELETE /apontamentos/{id}` | checa setor da tarefa |
| `POST /{id}/chamados` | checa setor da tarefa |
| `DELETE /{id}/chamados/{chamadoId}` | checa setor da tarefa |

### Leitura

- `GET Listar`, `GET Obter`, `GET historico`, `GET chamados/busca` → **sem restrição** (decisão #1).

---

## 8. Fase 5 — Roadmap (NÃO nesta entrega)

- Split vertical `/agenda`: calendário 55% + kanban 45% com divisor redimensionável (`.resize-handle`, `flex` + `row-resize`).
- Possível toggle futuro: "restringir leitura ao meu setor".

---

## 9. Lista consolidada de arquivos

### Backend — novos
- `Models/Setor.cs`
- `Dtos/SetorDtos.cs`
- `Services/ISetorService.cs`
- `Services/SetorService.cs`
- `Controllers/SetoresController.cs`
- `Migrations/*_AddSetores.cs` (+ `.Designer` + snapshot)
- `Migrations/*_TarefaSetorId.cs` (+ `.Designer` + snapshot)

### Backend — alterados
- `Models/Operador.cs`
- `Models/Implantacao/Tarefa.cs`
- `Data/AppDbContext.cs`
- `Services/AuthService.cs`
- `Services/Implantacao/TarefaService.cs`
- `Controllers/Implantacao/TarefasController.cs`
- `Dtos/Implantacao/TarefaDtos.cs`
- DTO/`UsuarioResponse` de auth (expor setor)

### Frontend — novos
- Service `setores.service.ts` (novo; local a definir — `shared/services` ou `features/kanban`)

### Frontend — alterados
- `features.routes.ts` (rota `/kanban`)
- `shared/config/header-nav.config.ts` (item no grupo Início)
- `features/implantacao/pages/kanban/kanban.component.ts` (+ `.html`/`.scss` para pills/badges/estado read-only)
- `features/implantacao/services/tarefas.service.ts` (enviar/receber `setorId`)
- `core/models/auth.model.ts` (se expuser setor no usuário logado)

### Docs (atualização automática via `docs-writer`)
- `docs/06-COMPONENTES-FRONTEND.md`
- `docs/05-ENDPOINTS.md` e `docs/07-SERVICES-BACKEND.md` (novos endpoints)
- `frontend/README.md`
- `backend/README.md`
- `docs/02-ARQUITETURA.md`
- `docs/README.md` (índice, se necessário)

---

## 10. Ordem de execução e critérios de aceite

| # | Etapa | Verificação |
|---|---|---|
| 1 | Fase 1 (Setor backend + auth) | `dotnet build` → 0 erros/0 avisos |
| 2 | Fase 2 (`Tarefa.SetorId` + migration/backfill) | `dotnet build` → 0 erros |
| 3 | Fase 4 (permissões service/controller) | `dotnet build` → 0 erros; teste manual 403 |
| 4 | Fase 3 (rota/sidebar/pills/UX) | `ng build` → 42 rotas prerender (manter) |
| 5 | Documentação via `docs-writer` | arquivos da seção 9 revisados |
| 6 | Push | branch `feat/design-tokens`, convção `feat:` |
| 7 | Deploy limpo | Obter a credencial com `Get-Credential` e passá-la explicitamente ao `scripts/deploy/deploy.ps1`; não usar o fallback fixo do script |

### Critérios de aceite (v1)

- [ ] `/kanban` visível na sidebar grupo Início para qualquer usuário autenticado
- [ ] Pills de setor filtram o quadro; default = setor do usuário
- [ ] Usuário comum **vê** tarefas de outros setores mas **não edita** (UI bloqueada)
- [ ] Backend retorna **403** em qualquer escrita em tarefa de outro setor (testar com curl/Postman)
- [ ] Admin/Suporte/Perfil F editam qualquer setor
- [ ] Tarefa criada sem setor explícito nasce com o setor do criador
- [ ] Tarefas legadas aparecem como Implantação
- [ ] `/implantacao/kanban` e `/admin/kanban` com comportamento **inalterado**
- [ ] `dotnet build` e `ng build` verdes
- [ ] Documentação atualizada

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Claim `setor_id` defasada após troca de setor | Permissão no backend sempre lê do **DB** |
| SQL Server compat 100 (sem `OPENJSON`) | Não usar `Contains` em listas capturadas (padrão já existente no `TarefaService`, linhas 64-67) |
| Não existir UI para setor do operador | Localizar tela de usuários na Fase 1; se inexistente, endpoint mínimo + correção em lote |
| Herança de componente quebrar o kanban atual | **Somente** `route.data.modo` no mesmo componente |
| Tarefas órfãs (`SetorId null`) ficarem ineditáveis | Backfill = Implantação; Admin corrige via drawer |
| Pré-render travar com guard novo | Guard de rota usa padrão já validado (`isPlatformBrowser` + `of(true)` em SSR) |
