# 📋 PLANO MESTRE — Módulo IMPLANTAÇÃO/PROJETOS + Equipe (v1.3.0)

> **Documento único e auto-contido para retomar o trabalho do zero em qualquer sessão.**
> Contém: contexto, decisões, schema, mapeamento campo-a-campo, fases com sub-passos numerados, e um **prompt de continuação** no final.
>
> ⚠️ **IMPORTANTE**: A **Agenda foi removida no rollback de 10/09/2026** (commit `8956c57`). Este documento descreve o plano original da v1.3.0 que incluía Agenda. Para o estado atual (sem Agenda), ver `docs/DOCUMENTACAO-COMPLETA.md` § 6.5.9 e `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação futura.

---

## 0. Resumo executivo (1 parágrafo)

Continuar a **v1.3.0** do monorepo JCA Central de Operação na branch `projeto-implantacao`. A v1.1.0 (Dashboard redesenhado + Kanban drag-drop + seed) já foi deployada em homolog. A v1.2.0 (legados TB* via FK lógica) estava em andamento. A v1.3.0 **adiciona Diretório de Equipe** além de terminar a v1.2.0 (dropdowns de legado no form de Projeto). **Agenda compartilhada foi removida no rollback `8956c57`** — ver `docs/AGENDA-REIMPLEMENTACAO.md`. **Não há deploy automático** — o trabalho vai sendo commitado em `projeto-implantacao` e só vai para o IIS 192.168.2.130 quando você disser "pode fazer deploy".

---

## 1. Contexto fixo (não muda entre sessões)

### 1.1 Banco de homolog (referência fixa)
- **Servidor**: `192.168.2.154`
- **Usuário**: `bussiness`
- **Senha**: via variável de ambiente `DB_EXPLORER_SENHA` / user-secrets (NUNCA hardcoded)
- **Banco**: `dbBUSINESS_HML`
- **Apenas homologação** — produção fica para depois

### 1.2 Estrutura de repositório
```
Central-Conhecimento-developer/  <- repo CENTRALOPERACAO_DEPLOY (master + projeto-implantacao + main + developer)
├─ .gitmodules
├─ deploy.ps1 / deploy.bat / deploy.local.bat
├─ branch-todos.ps1
├─ README.md
├─ frontend/                       <- submódulo JCASOLUCOES/Central-Conhecimento
│  └─ src/app/wiki/pages/implantacao/   <- módulo IMPLANTACAO (v1.3.0)
└─ backend/                        <- submódulo JCASOLUCOES/CCBAckend
   └─ Central_BackEnd/
      ├─ Models/Implantacao/
      ├─ Dtos/Implantacao/
      ├─ Services/Implantacao/
      └─ Controllers/Implantacao/
```

### 1.3 Tag atual e estratégia de tag
- Última tag deployada: `v1.1.0` (3 repos)
- **Próxima tag (estado atual, sem Agenda):** `v1.3.0-rc1` será apenas Diretório de Equipe + dropdowns legado
- Branch ativa: `projeto-implantacao` (em todos os 3 repos)
- Sincronizar com `main` + `developer` + `master` (monorepo) após cada bloco

### 1.4 Workflow desta sessão
1. Você diz "**Efetuar passo N**" → eu sigo sozinho até o fim
2. Cada sub-passo = 1 commit local (você pode dizer "**status**" para ver onde parei)
3. **Sem deploy** até você autorizar
4. **Sem perguntar** a cada passo (você estará ausente)

---

## 2. Estado atual (validado nesta sessão)

### 2.1 Tabelas legadas já mapeadas (dbBUSINESS_HML)
| Tabela | Chave | Colunas relevantes | FK lógica para IMPL_* |
|---|---|---|---|
| `tbcliente` | `CLIENTE_ID` (int) | `CNPJ`, `RAZAO_SOCIAL`, `FANTASIA`, `ENDERECO`, `NUMERO`, `CIDADE`, `UF`, `BAIRRO`, `CEP`, `INSCRICAO`, `GRUPO_ID`, `INDICACAO_ID`, `SLA`, `SCORE`, `ATIVO` | `IMPL_Projeto.PRJ_ClienteLegadoId` |
| `tbchamado` | `CHAMADO_ID` (int) | `CLIENTE_ID`, `CONTRATO_ID`, `CONTATO_ID`, `TITULO`, `TIPO`, `STATUS`, `FUNCIONARIO_ID`, `DATA_INCLUSAO`, `DATA_FECHAMENTO`, `DATA_PREVISAO` | `IMPL_Tarefa.TRF_ChamadoLegadoId` |
| `tbcontrato` | `CONTRATO_ID` (int) | `CLIENTE_ID`, `PRODUTO_ID`, `DATA`, `VALOR_UNITARIO`, `SITUACAO` | (uso futuro) |
| `tbprospeccao` | `PROSPECCAO_ID` (int) | `EMPRESA`, `INDICACAO_ID`, `ESTAGIO`, `CONTATO` | (uso futuro) |
| `tbindicacao` | `INDICACAO_ID` (int) | `NOME`, `RESPONSAVEL` | (uso futuro) |
| `tbfuncionario` | `FUNCIONARIO_ID` (smallint) | `NOME`, `OPERADOR_ID` (FK para TBOPERADOR), `FUNCAO_ID` | `IMPL_Equipe.MembroEquipe.OperadorId` |
| `tboperador` | `OPERADOR_ID` (varchar 15) | `NOME`, `EMAIL`, `SE_ATIVO`, `SE_ADMIN`, `PERFIL_ID` | (já usado pelo auth) |

**Total**: 66 tabelas `TB*` existem, mas só essas 6 importam para a v1.3.0.

### 2.2 Migration `AddLegadoLinks` (v1.2.0) — **JÁ APLICADA em homolog**
Adicionou:
- `IMPL_Projeto.PRJ_ClienteLegadoId` (int?, FK lógica para `tbcliente.CLIENTE_ID`)
- `IMPL_Tarefa.TRF_ChamadoLegadoId` (int?, FK lógica para `tbchamado.CHAMADO_ID`)
- Índices `IX_IMPL_Projeto_ClienteLegadoId` e `IX_IMPL_Tarefa_ChamadoLegadoId`
- **Sem FK constraints formais** (validação em runtime, sem quebrar inserts legados)

### 2.3 Backend (v1.2.0 parcial) — **NÃO COMMITADO AINDA**
- `LegacyDataService` (Dtos/Models + Microsoft.Data.SqlClient) ✅ criado
- `LegacyController` (`/api/v1/implantacao/legacy/{clientes,chamados,indicacoes,funcionarios}`) ✅ criado
- `ILegacyDataService` registrado no `Program.cs` ✅
- `ProjetoService` e `TarefaService` ajustados para `ClienteLegadoId` e `ChamadoLegadoId` ✅
- DTOs `ProjetoResumo`, `ProjetoDetalhe`, `ProjetoCriarRequest`, `ProjetoAtualizarRequest`, `TarefaResumo`, `TarefaCriarRequest`, `TarefaAtualizarRequest` ✅
- `Microsoft.Data.SqlClient 5.2.*` adicionado em `Central_BackEnd.csproj` ✅
- Build backend: **0 erros** ✅
- Script SQL `AllMigrations.sql` (16 KB) gerado ✅

### 2.4 Frontend (v1.1.0) — **DEPLOYADO**
- Dashboard redesenhado (KPIs, bar chart, donut, próximos, alertas)
- Kanban com drag-drop (`@angular/cdk`)
- 5 páginas v1: Dashboard, Kanban, Projetos, Tarefas, Clientes, Cadastros
- `chart.js 4.4` instalado
- Design system `.adm-*` (reusado de Visão ADM)
- 4 SCSS locais (1 por página) + `implantacao.styles.scss` removido
- Tag `v1.1.0` nos 3 repos ✅

---

## 3. Decisões de design (firmadas)

### 3.1 Skill obrigatória
- **`frontend-design`** deve ser carregada como referência **sempre que for estilizar UI nova**
- Brainstorm → explore → plan → critique → build → critique again
- Tokens alinhados ao sistema `.adm-*` global
- NUNCA cair no "AI default" (cream+terracotta / dark+acid green / broadsheet)
- **Signature element** deve ser único e memorável

### 3.2 Identidade visual das equipes
- **IMPLANTAÇÃO** = azul institucional `#0f4c81` (`var(--primary-color)`)
- **CIAA** = violeta `#7c3aed`

### 3.3 Stack mantido (sem mudanças)
- Backend: ASP.NET Core 8 + EF Core 8 + Microsoft.Data.SqlClient 5.2
- Frontend: Angular 18 standalone + `@angular/cdk` + `chart.js` 4.4
- Design system: `src/styles.scss` global (variáveis CSS) + classes `.adm-*`

### 3.4 Regras de validação de tipos
- **CLIENTE/CARTEIRA/INTEGRACAO** (IMPL) → `clienteObrigatorio = true`
- **PROJETO_CIAA** → `clienteObrigatorio = false`
- Limite Kanban: **8 colunas** ativas
- Colunas com `padrao = true` **não podem ser excluídas**
- Kanban: mover tarefa **infere status** pela coluna (CONCLUIDO → Status=Concluida, EM ANDAMENTO/HOMOLOGACAO → EmAndamento, A FAZER/BACKLOG → AFazer)

### 3.5 Integração com Google Calendar (Roadmap, NÃO nesta versão)
- **v1.3.0**: ~~agenda 100% própria (sem Google)~~ — **Agenda removida no rollback `8956c57`**
- **v2.x**: export ICS + (futuramente) OAuth com Google Calendar
- **Integração Service Account** (domínio): também roadmap

### 3.6 ~~Visibilidade da Agenda~~ (removida)
> Seção removida — Agenda foi removida no rollback `8956c57`. Ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano futuro.

### 3.7 Perfil de Equipe (lista simples)
- Sem foto, sem contador de projetos, sem agenda
- Apenas: nome, função, equipes (chips)
- Edição: só o próprio usuário edita seu perfil

---

## 4. Schema de banco (novo + existente)

### 4.1 Tabelas novas (v1.3.0 — **Agenda removida no rollback `8956c57`**)

> ⚠️ **A tabela `IMPL_Agenda` e `IMPL_MembroPerfil` foram criadas pela migration `AddAgendaAndPerfis` (já aplicada em produção), mas a feature Agenda foi removida.** As tabelas permanecem órfãs no banco. Ver `docs/AGENDA-REIMPLEMENTACAO.md`.

```sql
-- 4.1.1 ~~Agenda~~ (REMOVIDA - tabelas órfãs mantidas no banco)
-- CREATE TABLE IMPL_Agenda (...);

-- 4.1.2 Perfil estendido (mantido para Diretório de Equipe)
CREATE TABLE IMPL_MembroPerfil (
  MPF_FuncionarioId     int PRIMARY KEY,                 -- FK conceitual para tbfuncionario.FUNCIONARIO_ID
  MPF_Descricao         nvarchar(2000) NULL,
  MPF_Telefone          varchar(20) NULL,
  MPF_Ramal             varchar(10) NULL,
  MPF_UsuarioInclusao   varchar(15) NULL,
  MPF_DataInclusao      datetime2 NOT NULL DEFAULT GETDATE(),
  MPF_UsuarioAlteracao  varchar(15) NULL,
  MPF_DataAlteracao     datetime2 NULL
);
```

### 4.2 Tabelas IMPL_* atuais (referência)
- `IMPL_Equipe` (Nome, PrefixoCodigo)
- `IMPL_TipoProjeto` (CLIENTE, CARTEIRA, INTEGRACAO, PROJETO_CIAA)
- `IMPL_Etapa` (13 etapas seedadas)
- `IMPL_ColunaKanban` (5 colunas padrão)
- `IMPL_Cliente` (3 fictícios seedados)
- `IMPL_Projeto` (IMP-0001, CIAA-0001) — agora com `PRJ_ClienteLegadoId`
- `IMPL_Tarefa` (20 seedadas) — agora com `TRF_ChamadoLegadoId`
- `IMPL_ComentarioTarefa` (3 seedados)
- `IMPL_MembroEquipe` (N:N operador↔equipe)

---

## 5. Endpoints backend (v1.3.0 completo)

### 5.1 Já existentes (v1.1.0)
```
GET    /api/v1/implantacao/clientes
GET    /api/v1/implantacao/clientes/{id}
POST   /api/v1/implantacao/clientes
PUT    /api/v1/implantacao/clientes/{id}
DELETE /api/v1/implantacao/clientes/{id}

GET    /api/v1/implantacao/equipes
GET    /api/v1/implantacao/equipes/{id}
POST   /api/v1/implantacao/equipes
PUT    /api/v1/implantacao/equipes/{id}
POST   /api/v1/implantacao/equipes/{id}/membros
DELETE /api/v1/implantacao/equipes/{id}/membros/{membroId}

GET    /api/v1/implantacao/tipos-projeto
GET    /api/v1/implantacao/tipos-projeto/{id}
POST   /api/v1/implantacao/tipos-projeto
PUT    /api/v1/implantacao/tipos-projeto/{id}
DELETE /api/v1/implantacao/tipos-projeto/{id}

GET    /api/v1/implantacao/etapas
POST   /api/v1/implantacao/etapas
PUT    /api/v1/implantacao/etapas/{id}
DELETE /api/v1/implantacao/etapas/{id}

GET    /api/v1/implantacao/colunas-kanban
POST   /api/v1/implantacao/colunas-kanban
PUT    /api/v1/implantacao/colunas-kanban/{id}
DELETE /api/v1/implantacao/colunas-kanban/{id}
POST   /api/v1/implantacao/colunas-kanban/reordenar

GET    /api/v1/implantacao/projetos
POST   /api/v1/implantacao/projetos
GET    /api/v1/implantacao/projetos/proximo-codigo?equipeId=N
GET    /api/v1/implantacao/projetos/{id}
PUT    /api/v1/implantacao/projetos/{id}
PATCH  /api/v1/implantacao/projetos/{id}/status
DELETE /api/v1/implantacao/projetos/{id}

GET    /api/v1/implantacao/tarefas
POST   /api/v1/implantacao/tarefas
GET    /api/v1/implantacao/tarefas/{id}
PUT    /api/v1/implantacao/tarefas/{id}
PATCH  /api/v1/implantacao/tarefas/{id}/coluna
DELETE /api/v1/implantacao/tarefas/{id}
POST   /api/v1/implantacao/tarefas/{id}/comentarios

GET    /api/v1/implantacao/dashboard?equipe=IMPLANTACAO|CIAA

POST   /api/v1/implantacao/admin/seed-exemplo
```

### 5.2 Já existentes (v1.2.0 — backend feito, mas não commitado)
```
GET    /api/v1/implantacao/legacy/clientes?buscar=X&take=N
GET    /api/v1/implantacao/legacy/clientes/{id}
GET    /api/v1/implantacao/legacy/chamados?clienteId=N&buscar=X&take=N
GET    /api/v1/implantacao/legacy/indicacoes
GET    /api/v1/implantacao/legacy/funcionarios?buscar=X&take=N
```

### 5.3 ~~Novos (v1.3.0 — Agenda)~~ — **REMOVIDO no rollback `8956c57`**

> A `AgendaController` e seus endpoints foram removidos. Ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação futura.

### 5.4 Novos (v1.3.0 — Equipe/Diretório)
```csharp
[Route("api/v{version:apiVersion}/implantacao/equipe")]
[Authorize]
public class EquipeController : ControllerBase
{
    [HttpGet("diretorio")]
    public Task<List<EquipePessoaDto>> Diretorio(
        [FromQuery] string? equipe,            // IMPLANTACAO | CIAA | null=todas
        [FromQuery] int? take = 200);
        // retorna: tbfuncionario + MembroPerfil + IMPL_Equipe[]

    [HttpGet("perfil/{funcionarioId:int}")]
    public Task<EquipePessoaDto?> ObterPerfil(int funcionarioId);

    [HttpPut("perfil/{funcionarioId:int}")]
    public Task<ActionResult<EquipePessoaDto?>> AtualizarPerfil(
        int funcionarioId, AtualizarPerfilRequest req);
        // só o próprio usuário ou admin pode editar
}
```

---

## 6. Mapeamento campo-a-campo por tela (frontend)

### 6.1 Tela: Formulário de **Novo Projeto** (`/implantacao/projetos/novo`)

| # | Campo no form | Tipo | Obrigatório | Coluna SQL (backend) | Tabela | Regra |
|---|---|---|---|---|---|---|
| 1 | Nome | text | sim | `PRJ_Nome` | IMPL_Projeto | 1-200 chars |
| 2 | Descrição | textarea | não | `PRJ_Descricao` | IMPL_Projeto | até 4000 chars |
| 3 | Equipe | select | sim | `PRJ_EquipeId` → `EQP_Id` | IMPL_Equipe | opções: IMPLANTACAO/CIAA |
| 4 | Tipo de projeto | select | sim | `PRJ_TipoProjetoId` → `TPP_Id` | IMPL_TipoProjeto | se ClienteObrigatorio=true, exige cliente |
| 5 | Cliente (interno) | select | condicional | `PRJ_ClienteId` → `CLI_Id` | IMPL_Cliente | só p/ tipos CLIENTE/CARTEIRA/INTEGRACAO |
| 6 | **Cliente (legado)** | select (search) | não | `PRJ_ClienteLegadoId` → `CLIENTE_ID` | **tbcliente** | v1.3.0, busca via /legacy/clientes |
| 7 | Responsável | select (search) | não | `PRJ_ResponsavelId` → `OPERADOR_ID` | tboperador (via /legacy/funcionarios) | dropdown com nome |
| 8 | Coluna Kanban inicial | select | não | `PRJ_ColunaKanbanId` → `CLK_Id` | IMPL_ColunaKanban | se vazio, vai para BACKLOG |
| 9 | Prioridade | radio | sim | `PRJ_Prioridade` | IMPL_Projeto | enum 0=Baixa, 1=Média, 2=Alta, 3=Urgente |
| 10 | Data início | date | não | `PRJ_DataInicio` | IMPL_Projeto | datetime2 |
| 11 | Data previsão | date | não | `PRJ_DataPrevisao` | IMPL_Projeto | datetime2 |
| 12 | Go Live previsto | date | não | `PRJ_DataGoLivePrevista` | IMPL_Projeto | datetime2 |
| 13 | Horas planejadas | number | não | `PRJ_HorasPlanejadas` | IMPL_Projeto | int |
| 14 | Observação | textarea | não | `PRJ_Observacao` | IMPL_Projeto | até 2000 chars |

### 6.2 Tela: Formulário de **Nova Tarefa** (dentro do detalhe do projeto)

| # | Campo no form | Tipo | Obrigatório | Coluna SQL | Tabela | Regra |
|---|---|---|---|---|---|---|
| 1 | Título | text | sim | `TRF_Titulo` | IMPL_Tarefa | 1-300 chars |
| 2 | Descrição | textarea | não | `TRF_Descricao` | IMPL_Tarefa | até 4000 chars |
| 3 | Etapa | select | sim | `TRF_EtapaId` → `ETP_Id` | IMPL_Etapa | opções filtradas pelo tipo do projeto |
| 4 | Coluna Kanban | select | sim | `TRF_ColunaKanbanId` → `CLK_Id` | IMPL_ColunaKanban | padrão: BACKLOG |
| 5 | **Chamado (legado)** | select (search) | não | `TRF_ChamadoLegadoId` → `CHAMADO_ID` | **tbchamado** | v1.3.0, busca via /legacy/chamados?clienteId=N |
| 6 | Responsável | select | não | `TRF_ResponsavelId` → `OPERADOR_ID` | tboperador | opcional |
| 7 | Prioridade | radio | sim | `TRF_Prioridade` | IMPL_Tarefa | enum 0=Baixa, 1=Média, 2=Alta, 3=Urgente |
| 8 | Ordem | number | sim | `TRF_Ordem` | IMPL_Tarefa | int (1-100) |
| 9 | Data previsão | date | não | `TRF_DataPrevisao` | IMPL_Tarefa | datetime2 |
| 10 | Horas estimadas | number | não | `TRF_HorasEstimadas` | IMPL_Tarefa | int |

### 6.3 ~~Tela: Formulário de **Novo Evento** da Agenda (`/implantacao/agenda` modal)~~ — **REMOVIDO**

> Tela de Agenda removida no rollback `8956c57`.

### 6.4 Tela: Diretório de **Equipe** (`/implantacao/equipe`)

Cards read-only por padrão. Botão "Editar perfil" só aparece se o card é do próprio usuário (match por `OPERADOR_ID`).

| # | Campo no form de edição | Tipo | Obrigatório | Coluna SQL | Tabela | Regra |
|---|---|---|---|---|---|---|
| 1 | Descrição | textarea | não | `MPF_Descricao` | IMPL_MembroPerfil | até 2000 chars (free-form) |
| 2 | Telefone | text | não | `MPF_Telefone` | IMPL_MembroPerfil | até 20 chars |
| 3 | Ramal | text | não | `MPF_Ramal` | IMPL_MembroPerfil | até 10 chars |

> Lista simples (sem foto, sem contador de projetos, sem agenda). Os dados de nome/função vêm do **legado** `tbfuncionario` via `/api/v1/implantacao/legacy/funcionarios`.

---

## 7. Modelos TypeScript (frontend)

### 7.1 ~~`agenda.model.ts`~~ — **REMOVIDO no rollback `8956c57`**

> Modelos TypeScript da Agenda foram removidos. Ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação futura.

### 7.2 `equipe.model.ts` (novo)
```typescript
export interface EquipePessoa {
  funcionarioId: number;
  operadorId?: string;          // join com tboperador
  nome: string;
  funcao?: string;             // join com tbfuncionario (FUNCAO_ID) — futuro
  descricao?: string;          // IMPL_MembroPerfil.MPF_Descricao
  telefone?: string;
  ramal?: string;
  equipes: string[];            // ['IMPLANTACAO', 'CIAA']
  usuarioInclusao?: string;
  dataInclusao?: string;
}

export interface AtualizarPerfilRequest {
  descricao?: string;
  telefone?: string;
  ramal?: string;
}
```

### 7.3 Mudanças em `projeto.model.ts`
```typescript
// ADICIONAR em ProjetoResumo e ProjetoDetalhe:
clienteLegadoId?: number;
clienteLegadoNome?: string;       // join via LegacyDataService
clienteLegadoCnpj?: string;

// ADICIONAR em ProjetoCriarRequest e ProjetoAtualizarRequest:
clienteLegadoId?: number;
```

### 7.4 Mudanças em `tarefa.model.ts`
```typescript
// ADICIONAR em TarefaResumo:
chamadoLegadoId?: number;

// ADICIONAR em TarefaCriarRequest e TarefaAtualizarRequest:
chamadoLegadoId?: number;
```

---

## 8. Roteiro expandido (24 sub-passos)

> **Cada sub-passo = 1 commit local (push só no H1).**
> **Antes de começar cada Bloco, você diz "Efetuar Bloco X" e eu sigo sozinho.**

### Bloco A — Backend Equipe (4 sub-passos, ~15 min) — **Agenda removida**

- **A1.** ~~Criar `Models/Implantacao/AgendaItem.cs`~~ + `Models/Implantacao/MembroPerfil.cs`
- **A2.** Atualizar `Data/AppDbContext.cs` — adicionar 1 DbSet (`MembroPerfil`) + índices no `OnModelCreating`
- **A3.** ~~Criar `Dtos/Implantacao/AgendaDtos.cs`~~
- **A4.** ~~Criar `Services/Implantacao/AgendaService.cs`~~
- **A5.** Criar `Services/Implantacao/EquipePerfilService.cs` (CRUD do perfil)
- **A6.** ~~Criar `Controllers/Implantacao/AgendaController.cs`~~ + `Controllers/Implantacao/EquipeController.cs`
- **A7.** Atualizar `Program.cs` (registrar IEquipePerfilService) — **Migration `AddAgendaAndPerfis` já aplicada em produção**
- **A8.** `dotnet ef migrations script --idempotent -o Migrations/Sql/AddAgendaAndPerfis.sql` + buildar (já existe)

### Bloco B — Frontend tipos + services (2 sub-passos, ~3 min) — **Agenda removida**

- **B1.** ~~Criar `agenda.model.ts`~~ + `equipe.model.ts` + atualizar `projeto.model.ts` e `tarefa.model.ts`
- **B2.** ~~Criar `agenda.service.ts`~~ + `equipe.service.ts`
- **B3.** Atualizar `projetos.service.ts` e `tarefas.service.ts` com métodos legados (injetar LegacyService via componente, ou criar novo service wrapper)

### Bloco C — Rotas + sidebar (1 sub-passo, ~1 min) — **Agenda removida**

- **C1.** Atualizar `implantacao.routes.ts` com `/implantacao/equipe` (lazy load) — **`/implantacao/agenda` removida**
- **C2.** Atualizar `sidebar.component.ts` — adicionar 1 link na seção Implantação (Equipe, entre Tarefas e Clientes)

### Bloco D — ~~Frontend Agenda~~ **REMOVIDO no rollback `8956c57`**

> Toda a implementação do frontend da Agenda (Bloco D) foi removida. Ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação futura.

### Bloco E — Frontend Equipe (2 sub-passos, ~8 min)

- **E1.** Criar `pages/equipe/equipe.component.ts` — grid de cards (nome, função, chips de equipe) + filtro por equipe
- **E2.** Adicionar **drawer lateral** de detalhes (click no card) + botão "Editar perfil" (só se o card é do próprio usuário)

### Bloco F — Documentação (2 sub-passos, ~5 min) — **Agenda removida**

- **F1.** Atualizar `MODULO-IMPLANTACAO-MAP.md` na raiz do monorepo (cobre Projetos + Equipe + relações TB* — **Agenda removida**)
- **F2.** Atualizar `frontend/docs/DOCUMENTACAO-COMPLETA.md` § 6.5 — adicionar subseção 6.5.8 (Equipe) — **6.5.7 Agenda removida**

### Bloco G — Teste local (1 sub-passo, ~1 min) — **Agenda removida**

- **G1.** Subir interno (skill `subir interno`) e avisar você com o link `http://localhost:4200/implantacao/equipe` — **`/implantacao/agenda` removida**

### Bloco H — Commit + push (1 sub-passo, ~1 min)

- **H1.** Commit em `projeto-implantacao` em todos os 3 repos + tag `v1.3.0-rc1` + push + sincronizar `main`/`developer`/`master`

---

## 9. Comandos SQL de referência (homolog)

```bash
# Conectar ao banco (senha via variável de ambiente)
"C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE" ^
  -S 192.168.2.154 -d dbBUSINESS_HML -U bussiness -P "%DB_EXPLORER_SENHA%"

# Aplicar script de migration
"C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE" ^
  -S 192.168.2.154 -d dbBUSINESS_HML -U bussiness -P "%DB_EXPLORER_SENHA%" ^
  -i "C:\...\Migrations\Sql\AddAgendaAndPerfis.sql"

# Listar tabelas IMPL_*
"SQLCMD.EXE" -S 192.168.2.154 -d dbBUSINESS_HML -U bussiness -P "%DB_EXPLORER_SENHA%" ^
  -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE 'IMPL_%' ORDER BY TABLE_NAME"

# Contar registros IMPL_Agenda
"SQLCMD.EXE" -S 192.168.2.154 -d dbBUSINESS_HML -U bussiness -P "%DB_EXPLORER_SENHA%" ^
  -Q "SELECT COUNT(*) FROM IMPL_Agenda"
```

---

## 10. Padrão de commit (estado atual — **Agenda removida**)

```
feat(backend): equipe + dropdowns de legado
- Models: IMPL_MembroPerfil (IMPL_Agenda órfã no banco)
- Migration: AddAgendaAndPerfis (já aplicada, feature removida)
- Services: IEquipePerfilService
- Controllers: EquipeController
- Reusa LegacyDataService para join com tbfuncionario

feat(frontend): equipe + dropdowns de legado
- Models: equipe.model.ts (agenda.model.ts removido)
- Services: EquipeService (AgendaService removido)
- Páginas: EquipeComponent (grid) — AgendaComponent removido
- Form de novo projeto: dropdown de cliente legado (tbcliente)
- Form de nova tarefa: dropdown de chamado legado (tbchamado)
- Estilo seguindo skill frontend-design
- Reusa .adm-* do design system
```

---

## 11. Checklist de validação (teste local após Bloco G) — **Agenda removida**

Abra no navegador e verifique:
- [ ] ~~`/implantacao/agenda` carrega sem erro~~ — **REMOVIDA**
- [ ] ~~Modo DIA mostra o horário atual com **linha vermelha**~~
- [ ] ~~Clicar em horário vago abre modal de criar evento~~
- [ ] ~~Criar evento com tipo REUNIAO → card fica **azul**; TREINAMENTO → **verde**; PESSOAL → **cinza**~~
- [ ] ~~Filtro "Só minhas" mostra só eventos do `admin`~~
- [ ] `/implantacao/equipe` lista todos os funcionários
- [ ] Filtro "Implantação" filtra por equipe
- [ ] Click no próprio card → botão "Editar perfil" aparece
- [ ] Editar e salvar descrição → aparece atualizada
- [ ] `/implantacao/projetos/novo` → dropdown "Cliente (legado)" lista clientes do `tbcliente`
- [ ] Selecionar cliente → projeto criado com `ClienteLegadoId` populado
- [ ] Detalhe do projeto → mostra "Cliente Legado" + CNPJ + Nome Fantasia

---

## 12. PROMPT DE CONTINUAÇÃO (copie e cole na nova sessão) — **Estado: Agenda removida, apenas Equipe + dropdowns legado**

```
Você é o assistente continuando a v1.3.0 do projeto Central de Operação (JCA Soluções)
na branch `projeto-implantacao` do monorepo em
C:\Users\JCA-SUP05\Documents\Projetos\Intranet\Central-Conhecimento-developer.

LEIA PRIMEIRO o arquivo PLANO_MESTRE.md na raiz do monorepo — ele contém
TUDO: contexto, decisões, schema, mapeamento de campos por tela, sub-passos
numerados, comandos SQL de referência e checklist de validação.

⚠️ **IMPORTANTE**: A **Agenda foi removida no rollback `8956c57`**. Este plano
original incluía Agenda. O trabalho restante é apenas:
- Backend: EquipeController + EquipePerfilService (MembroPerfil)
- Frontend: EquipeComponent + dropdowns de legado (cliente/chamado)

REGRAS OBRIGATÓRIAS:
1. Banco de homolog: 192.168.2.154 / bussiness / via DB_EXPLORER_SENHA / dbBUSINESS_HML
2. SEM deploy automático — o usuário só autoriza deploy manualmente
3. SEM perguntas entre passos quando ele disser "Efetuar Bloco X" — vá até o fim
4. SEMPRE carregue a skill `frontend-design` antes de estilizar UI nova
5. SEMPRE reusar classes `.adm-*` do `src/styles.scss` global
6. SEMPRE use tag `v1.3.0-rc1` ao final em todos os 3 repos
7. Cores das equipes: IMPL=#0f4c81 (azul), CIAA=#7c3aed (violeta)

EXECUTE o Bloco A (passos A1 a A8 — ajustados para sem Agenda) e me avise ao final.
```

---

## 13. Onde este arquivo está

```
C:\Users\JCA-SUP05\Documents\Projetos\Intranet\Central-Conhecimento-developer\PLANO_MESTRE.md
```

Para abrir em nova sessão, basta dizer:
> "Leia o arquivo `PLANO_MESTRE.md` na raiz e siga a seção 12 (Prompt de Continuação)"

---

**FIM DO DOCUMENTO** — gerado em modo build, mas apenas com a operação de criar o arquivo `.md` solicitado. Nenhuma alteração de código foi feita.
