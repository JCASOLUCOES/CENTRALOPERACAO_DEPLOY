# Módulo IMPLANTAÇÃO / PROJETOS — Mapa (v1.3.0)

> Documento vivo do módulo. Cobre **Projetos + Equipe** (Agenda removida no rollback `8956c57`).
> Para o passo-a-passo de retomada, ver `PLANO_MESTRE.md` na raiz do monorepo.
> Para a documentação completa, ver `frontend/docs/DOCUMENTACAO-COMPLETA.md` § 6.5.
> Para plano de reimplementação da Agenda, ver `docs/AGENDA-REIMPLEMENTACAO.md`.

---

## 1. Visão geral

| Conceito | Onde mora | Quem usa |
|---|---|---|
| Equipes (`IMPL_Equipe`, `IMPL_MembroEquipe`) | Backend | Projetos, Equipe |
| Tipos de projeto (`IMPL_TipoProjeto`) | Backend | Projetos (filtros) |
| Etapas (`IMPL_Etapa`) | Backend | Tarefas (Kanban) |
| Colunas Kanban (`IMPL_ColunaKanban`) | Backend | Projetos, Tarefas |
| Clientes internos (`IMPL_Cliente`) | Backend | Projetos |
| Projetos (`IMPL_Projeto`) | Backend + Frontend | Tudo |
| Tarefas (`IMPL_Tarefa`) + Comentários | Backend + Frontend | Projetos |
| **Diretório de equipe** (`IMPL_MembroPerfil` + `tbfuncionario`) | Backend + Frontend | Tela `/implantacao/equipe` |
| Clientes legados (`tbcliente`) | dbBUSINESS_HML (somente leitura) | Dropdown em Projeto |
| Chamados legados (`tbchamado`) | dbBUSINESS_HML (somente leitura) | Dropdown em Tarefa |
| Funcionários legados (`tbfuncionario`) | dbBUSINESS_HML (somente leitura) | Diretório de Equipe |

> **Nota:** `IMPL_Agenda` (Agenda compartilhada) foi removida no rollback `8956c57`. Tabelas órfãs mantidas no banco. Ver `docs/AGENDA-REIMPLEMENTACAO.md`.

---

## 2. Equipes

| Equipe | Prefixo | Cor institucional | Equivalência frontend |
|---|---|---|---|
| IMPLANTAÇÃO | `IMP` | `#0f4c81` (azul) | chips azuis |
| CIAA | `CIAA` | `#7c3aed` (violeta) | chips violetas |

Regras:
- Códigos de projeto são gerados a partir do prefixo (`IMP-0001`, `CIAA-0001`).
- Membros são `N:N` via `IMPL_MembroEquipe` (`tboperador.OPERADOR_ID` ↔ `IMPL_Equipe.Id`).
- Um operador pode estar em várias equipes.

---

## 3. Projetos (v1.0+ → v1.3.0)

| Campo IMPL_Projeto | Origem | Observação |
|---|---|---|
| `PRJ_Codigo` | Auto (`IMP-0001` ou `CIAA-0001`) | gerado por `ProximoCodigoAsync(equipeId)` |
| `PRJ_ClienteId` | `IMPL_Cliente.Id` | obrigatório para tipos CLIENTE/CARTEIRA/INTEGRACAO |
| `PRJ_ClienteLegadoId` | `tbcliente.CLIENTE_ID` | **v1.3.0**, FK lógica (sem constraint) |
| `PRJ_TipoProjetoId` | `IMPL_TipoProjeto` | tipo (CLIENTE, CARTEIRA, INTEGRACAO, PROJETO_CIAA) |
| `PRJ_Status` | enum (Backlog, AFazer, EmAndamento, Homologacao, Concluido, Cancelado, Bloqueado) | inferido pela coluna Kanban |
| `PRJ_Prioridade` | enum (0..3) | 0=Baixa, 1=Média, 2=Alta, 3=Urgente |
| `PRJ_Progresso` | 0..100 | auto=100 quando Status=Concluido |
| `PRJ_HorasPlanejadas` / `PRJ_HorasRealizadas` | int | para Dashboard de horas |

### Tarefas (v1.0+ → v1.3.0)

| Campo IMPL_Tarefa | Origem | Observação |
|---|---|---|
| `TRF_ChamadoLegadoId` | `tbchamado.CHAMADO_ID` | **v1.3.0**, FK lógica |
| `TRF_ColunaKanbanId` | `IMPL_ColunaKanban.Id` | mover tarefa infere status |
| `TRF_Bloqueada` + `TRF_MotivoBloqueio` | manual | explicado no Kanban |
| `TRF_Ordem` | int (1..100) | ordenação dentro da coluna |

---

## 4. ~~Agenda compartilhada (v1.3.0 — REMOVIDA)~~

> ⚠️ **Feature removida no rollback de 10/09/2026** (commit `8956c57`).
> 
> A Agenda V1 (`IMPL_Agenda`, `IMPL_MembroPerfil`, migration `AddAgendaAndPerfis`) foi removida por conflitos sistêmicos (CSS/JS, z-index, dark mode, performance). As tabelas permanecem no banco como órfãs.
> 
> **Endpoints removidos:** `/api/v1/implantacao/agenda` (GET/POST/PUT/DELETE/ICS)
> **Rota frontend removida:** `/implantacao/agenda`
> **Branch de backup:** `backup-master-pre-agenda-rollback` (commit `c3fec9c`)
> 
> Ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação segura.

---

## 5. Diretório de Equipe (v1.3.0)

### 5.1 Tabelas

| Tabela | Conteúdo | Origem |
|---|---|---|
| `tbfuncionario` | Funcionários da empresa | dbBUSINESS_HML (somente leitura) |
| `IMPL_MembroPerfil` | Descrição, telefone, ramal editáveis | backend IMPL |

### 5.2 Tabela `IMPL_MembroPerfil`

| Coluna SQL | Tipo | Descrição |
|---|---|---|
| `MPF_FuncionarioId` | int PK | FK conceitual para `tbfuncionario.FUNCIONARIO_ID` (sem constraint) |
| `MPF_Descricao` | nvarchar(2000) | bio / área de atuação |
| `MPF_Telefone` | varchar(20) | |
| `MPF_Ramal` | varchar(10) | |
| `MPF_UsuarioInclusao` / `DataInclusao` | | auditoria |
| `MPF_UsuarioAlteracao` / `DataAlteracao` | | auditoria |

### 5.3 Permissões

- **Listar** (`/equipe/diretorio`): todos os autenticados
- **Ver perfil**: todos
- **Editar perfil**: somente o **próprio usuário** (match por `tbfuncionario.OPERADOR_ID` ↔ `IMPL_MembroEquipe.OPERADOR_ID`) **ou admin**

### 5.4 Endpoints (`/api/v1/implantacao/equipe`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/equipe/diretorio?equipe=&take=` | Lista funcionários + perfil + equipes (IMPL + CIAA) |
| GET | `/equipe/perfil/{funcionarioId}` | Detalhe |
| PUT | `/equipe/perfil/{funcionarioId}` | Atualizar (somente próprio/admin) |

### 5.5 UI (frontend)

Rota: `/implantacao/equipe`. Grid de cards com:
- Avatar (ícone) com cor da equipe primária
- Nome + função
- Chips de equipe (azul IMPL, violeta CIAA)
- Descrição (truncada 2 linhas)

Filtros:
- Busca textual por nome/função
- Chips: `Todas` / `IMPLANTACAO` / `CIAA`

Drawer lateral de detalhes (ao clicar no card):
- Modo leitura: exibe descrição, telefone, ramal
- Modo edição (somente do próprio): form com 3 campos
- Botão `Editar perfil` aparece **apenas** se `p.operadorId === usuarioLogado`

---

## 6. Relações com tabelas legadas `TB*`

| Tabela legada | Onde aparece no IMPL | Tipo de link |
|---|---|---|
| `tbcliente` | `IMPL_Projeto.PRJ_ClienteLegadoId` | FK lógica (sem constraint) |
| `tbchamado` | `IMPL_Tarefa.TRF_ChamadoLegadoId` | FK lógica (sem constraint) |
| `tbindicacao` | (uso futuro) | — |
| `tbfuncionario` | join em `IMPL_MembroEquipe.OPERADOR_ID` | join lógico |
| `tboperador` | ~~`IMPL_Agenda.AGD_OperadorId`~~ (feature removida) | FK conceitual (sem constraint — operador pode sair do sistema) |

**Por que FKs lógicas e não constraints?**
- Permite o módulo IMPL funcionar mesmo se a tabela legada tiver registros
  órfãos, normalização diferente ou sofrer migração.
- Não quebra o `IMPL_*` se `tbcliente` for descontinuada ou movida.
- A integridade é validada **em runtime** no service (`LegacyDataService`).

---

## 7. Migrations

| Versão | Migration | Conteúdo | Já aplicado em homolog? |
|---|---|---|---|
| (v1.1.0) | `ImplantacaoInit` | 9 tabelas IMPL_* iniciais | ✅ sim |
| (v1.2.0) | `AddLegadoLinks` | `PRJ_ClienteLegadoId`, `TRF_ChamadoLegadoId` | ✅ sim |
| **v1.3.0** | `AddAgendaAndPerfis` | `IMPL_Agenda`, `IMPL_MembroPerfil` | ✅ **aplicada em produção** (feature removida, tabelas órfãs mantidas) |

> **Nota:** A migration `AddAgendaAndPerfis` já foi aplicada em produção. A feature Agenda foi removida no rollback `8956c57`, mas as tabelas permanecem no banco. Ver `docs/AGENDA-REIMPLEMENTACAO.md`.

---

## 8. Pendências conhecidas

- [ ] Dropdown de `clienteLegadoId` no form de **Novo Projeto** (UI ainda não plugada; o `LegacyService` e os campos já existem no DTO)
- [ ] Dropdown de `chamadoLegadoId` no form de **Nova Tarefa** (mesma situação)
- [ ] Integração com Google Calendar (Roadmap — v2.x)
- [ ] Recorrência funcional (hoje grava `Recorrente=true` + `PadraoRecorrencia` mas não expande eventos; será resolvido em v1.3.1+)

---

**Gerado em v1.3.0-rc1** · Para contribuir, edite diretamente e abra PR contra `projeto-implantacao`.
