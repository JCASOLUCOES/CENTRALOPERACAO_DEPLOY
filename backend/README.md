# Backend — Central de Operação (ASP.NET Core 8)

API RESTful para o portal interno **Central de Operação** da JCA Soluções.

---

## 🚀 Quick Start

```bash
cd backend/Central_BackEnd
dotnet restore
dotnet run
```

- **Porta padrão:** `http://localhost:1009`
- **Swagger (Dev):** `http://localhost:1009/swagger` (habilitado via `SwaggerEnabled=true` em `appsettings.Development.json`)
- **Banco Dev:** interruptor `Database:UseSqlServer` em `appsettings.Development.json`:
  - `true` → SQL Server homolog `192.168.2.154` / `dbBUSINESS_HML` (connection string no mesmo arquivo)
  - `false` → InMemory (seed automático: operador `admin`/`admin123`, funções, 7 colunas, 4 tipos e 7 tipos de evento; sem Etapas Globais — cada Projeto recebe nove cards)
  - Seeds de exemplo (projetos IMP-0001/CIAA-0001, tarefas e eventos) **desabilitados** via `#if false` em `Program.cs`
- **Fluxo pós-código:** skill `validar` (`scripts/validate.ps1`) → commit → skill `deploy-limpo`

---

## 🏗️ Arquitetura

```
Central_BackEnd/
├── Controllers/              # API Controllers (versionados v1)
│   ├── AuthController.cs     # /api/v1/auth/*
│   ├── AcessosController.cs  # /api/v1/acessos/*
│   ├── AgendaController.cs   # /api/v1/agenda/*  ← NOVO (MVP)
│   ├── Database/             # /api/v1/database/*
│   └── Implantacao/          # /api/v1/implantacao/*
├── Services/                 # Regras de negócio
│   ├── AuthService.cs
│   ├── GoogleSheetsService.cs
│   ├── PasswordValidationService.cs
│   ├── BruteForceGuard.cs
│   ├── SegurancaHelper.cs
│   └── Implantacao/
│       ├── AgendaService.cs  # ← NOVO
│       ├── ProjetoService.cs
│       ├── ProjetoEtapaService.cs  # 9 cards por projeto
│       ├── ProjetoJornadaService.cs # cálculo privado de progresso
│       ├── TarefaService.cs
│       └── ...
├── Models/                   # Entidades EF Core
│   ├── RefreshToken.cs
│   ├── AuditoriaAcesso.cs
│   ├── Operador.cs
│   └── Implantacao/
│       ├── AgendaItem.cs         # ← NOVO
│       ├── TipoEvento.cs         # ← NOVO
│       ├── AgendaParticipante.cs # ← NOVO
│       ├── Projeto.cs
│       ├── Tarefa.cs             # ← INCLui: Tipo, DataEntrega, Responsaveis, Chamados, Apontamentos
│       ├── TarefaResponsavel.cs  # ← NOVO (N:N)
│       ├── TarefaChamado.cs      # ← NOVO (N:N chamados)
│       ├── TarefaApontamento.cs  # ← NOVO (horas)
│       └── ...
├── Dtos/                     # Request/Response records
│   └── Implantacao/
│       ├── AgendaDtos.cs     # ← NOVO
│       ├── TarefaDtos.cs     # ← INCLui: ApontamentoResumo, ApontamentoCriarRequest, ApontamentoAtualizarRequest, TarefaChamadoRequest, ResponsavelResumo, ChamadoResumo, ChamadoLegadoResumo
│       └── ...
├── Data/
│   └── AppDbContext.cs       # EF Core DbContext
├── Migrations/               # EF Core Migrations
│   ├── 20260904194350_ImplantacaoInit.cs
│   ├── 20260905203422_AddAgendaAndPerfis.cs      # Agenda V1 (rollback; órfãs = AgendaEvento/AgendaEventoParticipante, removidas)
│   ├── 20260911215943_AgendaV2_Ajuste.cs         # ← Agenda V2 (MVP)
│   ├── 20260912173928_RemoveEquipes.cs           # ← Remove IMPL_Equipe/IMPL_MembroEquipe (2026-09-12)
│   ├── 20260914144751_AgendaConflitoHorarios.cs  # ← Agenda Fase 1: índice de conflito de horário
│   ├── 20260917170249_TarefaEvolucaoResponsaveisChamadosHoras.cs  # ← **NOVO**: TRF_DataEntrega, TRF_TipoTarefa, apontamentos, responsáveis e chamados
│   ├── 20260926022803_PadraoTabelasTb.cs         # ← **Padrão tb***: renomeia tabelas, funde CC_Funcao na legada tbfuncao, remove órfãs
│   └── 20260926022906_RenomeiaIndicesPkTb.cs     # ← **Nomes de índice/PK/unique**: 33 índices, 5 PKs automáticas e a AK de tbtipoevento
├── Program.cs                # Configuração DI, Auth, CORS, Rate Limiting, Swagger
└── appsettings.json          # Placeholders (config real só no servidor)
```

---

## 🔐 Autenticação & Segurança

| Item | Detalhe |
|------|---------|
| **JWT** | Access token 4h (memória), Refresh token 4h (cookie HttpOnly `cc_refresh`, rotativo, SHA-256) |
| **Rate Limiting** | `login`: 5/min/IP · `validacao`: 5/min/usuário |
| **Lockout** | 5 falhas/5min → 15min (`BruteForceGuard`) |
| **Senhas** | Comparação tempo constante (`SegurancaHelper`) — `tboperador` ainda texto puro (roadmap: BCrypt) |
| **CORS** | `http://192.168.2.130:1010`, `http://localhost:4200`, `http://localhost:1010` + `AllowCredentials()` |
| **Versionamento** | `Asp.Versioning.Mvc` → prefixo `/api/v1/` (URL segment ou header `X-Api-Version`) |

---

## 📡 Endpoints Principais

### Auth (`/api/v1/auth`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/login` | Autentica → accessToken (body) + refreshToken (cookie `cc_refresh`) |
| POST | `/refresh` | Renova tokens via cookie → devolve `user` |
| POST | `/logout` | Revoga refresh token, limpa cookies |
| GET | `/me` | Dados do usuário da sessão |

### Acessos (`/api/v1/acessos`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista empresas (resumo, sem senhas) |
| POST | `/validar-senha` | Valida senha mestre |
| POST | `/visualizar?empresaId=N` | Credenciais detalhadas + auditoria |

### Agenda (`/api/v1/agenda`) — **NOVO MVP**
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` | Lista eventos no intervalo (filtros opcionais: responsável e/ou função via `Operador.FuncaoId`) |
| GET | `/eventos/{id}` | Detalhe evento (participantes, tipo, projeto) |
| POST | `/eventos` | Cria evento (regras rígidas por tipo → 400 `{ mensagem }`; 409 `{ mensagem, conflitos, code }` se houver sobreposição do responsável) — **permissivo: pode criar para terceiros** |
| POST | `/eventos/lote` | Cria N ocorrências até `dataRepeticaoFim` por padrão (`padraoRecorrencia`: 1=Diária, 2=Semanal, 3=Mensal, default 1; grava `Recorrente`/`PadraoRecorrencia`); regras por tipo + conflito por dia (400/409); **Férias NÃO usa lote** (400 "não usa repetição") |
| PUT | `/eventos/{id}` | Atualiza evento (regras por tipo → 400; 409 se houver sobreposição; **403** `ForbiddenException` se não for dono `OperadorId === sub` nem admin `perfil=Administrador`; impede transferir responsabilidade para terceiro) |
| DELETE | `/eventos/{id}` | Exclui evento (**403** `ForbiddenException` se não for dono nem admin) |
| PATCH | `/eventos/{id}/mover` | Move evento — drag-drop (409 se o novo intervalo conflitar; **403** `ForbiddenException` se não for dono nem admin) |
| GET | `/tipos` | Tipos de evento ativos |
| GET | `/operadores` | Operadores ativos |
| GET | `/funcoes` | Funções ativas com operadores ativos (`tbfuncao` + `tboperador.SeAtivo = 'S'`) |

> **Autorização (Owner + Admin):** `PUT`, `DELETE`, `PATCH /mover` exigem `isAdmin || evento.OperadorId === usuarioId` (claim `sub`/`NameIdentifier`). Helper `IsAdmin()` verifica claim `perfil` = "Administrador". Nova exception `ForbiddenException` para 403 padronizado. `POST /eventos` (criar) **não** valida ownership.

> **Conflito de horários (Fase 1):** `AgendaService.ValidarSemConflitoAsync()` roda em criar/atualizar/mover e por ocorrência no lote (sobreposição por `OperadorId`; `FimEfetivo()`: `DataFim` informada, senão dia inteiro até o fim do dia, senão pontual); erro via `ConflictException` (`code` padrão `CONFLICT_HORARIOS`) → 409. Índice composto de conflito por operador/início/fim (renomeado de `IX_IMPL_Agenda_Operador_DataInicio_DataFim` para `IX_tbagenda_AGD_OperadorId_AGD_DataInicio_AGD_DataFim` pela migration `20260926022906_RenomeiaIndicesPkTb`; o `HasDatabaseName` que fixava o nome antigo foi removido do `AppDbContext`, de modo que o EF deriva o nome por convenção — modelo, snapshot e banco alinhados). Origem: migration `20260914144751_AgendaConflitoHorarios`, script `Migrations/Sql/AgendaConflitoHorarios_Idempotente.sql` — aplicação manual.
> **Regras rígidas por tipo + recorrência:** `RegraTipoEvento` + `NormalizarNomeTipo` (case/acentos-insensível) + `ObterRegraTipo` + `ResolverRegraTipoAsync` (nome via `tbtipoevento`) + `AplicarRegraEventoUnico` (`AgendaService.cs:185-203`); FÉRIAS = período simples dia-inteiro (horas ignoradas, exige `DataFim.Date > DataInicio.Date` → 400 "defina a data de retorno"; lote com span>0 ou padrão não-diário → 400 "não usa repetição"); TREINAMENTO/DAILY exigem horário + permitem span e semanal/mensal; REUNIÃO/ATENDIMENTO exigem horário + dia único; Pessoal/Outro/sem tipo livres; violação → `ArgumentException` → 400 `{ mensagem }` PT-BR (criar, atualizar e lote). Lote (`AgendaCriarLoteRequest`: `dataRepeticaoFim*` + `padraoRecorrencia = 1`) gera ocorrências por padrão até a data fim e grava `Recorrente`/`PadraoRecorrencia` (`AGD_Recorrente`, `AGD_PadraoRecorrencia`); Férias é linha única com span (render via `cobreDia()`, retrocompatível com linhas de lote antigas); multi-dia em lote (N linhas) só p/ Treinamento/Daily.
### Implantação (`/api/v1/implantacao`)

| Controller | Base | Entidades |
|------------|------|-----------|
| `TiposProjetoController` | `/tipos-projeto` | `tbtipoprojeto` |
| `ColunasKanbanController` | `/colunas-kanban` | `tbcoluskananban` |
| `ProjetosController` — **16 endpoints** | `/projetos` | `tbprojeto`, `tbprojetoetapa*` |
| `ProjetosController` | `/projetos/etapas-padrao`, `/projetos/{id}/etapas*` | Nove cards fixos por projeto |
| — | `/etapas` | **Etapas Globais removidas**: sem controller/service/model/tabela no source atual |
| `TarefasController` | `/tarefas` | `tbtarefa`, `tbcomentariotarefa`, `tbtarefareponsavel`, `tbtarefachamado`, `tbtarefaapontamento` |
| `DashboardController` | `/dashboard` | KPIs agregados |

> **Rotas removidas de Projetos:** `GET /projetos/{id}/jornada`, `POST /projetos/{id}/etapas/inicializar` e `PATCH /projetos/{id}/status`. `ProjetoAtualizarRequest.Status` continua no PUT. Os 401 observados no IIS indicam a versão antiga ainda publicada, não rotas no source.
>
> **Etapas Globais — diagnóstico encerrado:** `GET/POST /implantacao/etapas` retornavam 404 no ambiente publicado porque o controller global já havia sido removido. A tela frontend foi removida junto com rotas, componentes, serviço, tipos e wrapper morto. Esta API não deve ser recriada; a arquitetura vigente são nove cards por Projeto em `tbprojetoetapa`.

> **Endpoints Tarefas expandidos (v0.8.x)**: `GET /tarefas/chamados/busca`, `POST /tarefas/{id}/chamados`, `DELETE /tarefas/{id}/chamados/{chamadoId}`, `POST /tarefas/{id}/apontamentos`, `PUT /tarefas/apontamentos/{apontamentoId}`, `DELETE /tarefas/apontamentos/{apontamentoId}`, `GET /tarefas/{id}/historico`.
> **Campos Tarefas novos**: `TRF_TipoTarefa` (Feature/Bug), `TRF_DataEntrega`, `tbtarefareponsavel` (N:N), `tbtarefachamado` (N:N), `tbtarefaapontamento` (horas com `HorasRealizadas` derivado).

### Database Explorer (`/api/v1/database`)
20 operações para metadados, relacionamentos, consultas SELECT-only, configuração e comparação de schemas. Consulte [`docs/05-ENDPOINTS.md`](../docs/05-ENDPOINTS.md) e [`docs/07-SERVICES-BACKEND.md`](../docs/07-SERVICES-BACKEND.md).

---

## 🗄️ Banco de Dados

Padrão canônico de nomenclatura: **nome de tabela = `tb` + nome da entidade em minúsculas, colado, sem underscore** (exceção para sub-entidades: `tb<entidade>_<sub>`). Aplicado pelas migrations `20260926022803_PadraoTabelasTb` (tabelas) e `20260926022906_RenomeiaIndicesPkTb` (índices, PKs e unique constraint). **As colunas não mudaram** (prefixo curto da entidade + `_`, UPPER nas legadas). As FKs mantêm nomes antigos — cosmético, não é bug. Detalhes em [`docs/04-ESTRUTURA-DADOS.md`](../docs/04-ESTRUTURA-DADOS.md).

### Tabelas do Sistema
| Tabela | Descrição |
|--------|-----------|
| `tbrefreshtoken` | Refresh tokens hasheados (SHA-256), rotativos |
| `tbauditoriaacesso` | Auditoria de login/logout/visualização |
| `tboperador` | Operadores (login, perfil, função) |
| `tbfuncao` | Funções — legada unificada: `FUNCAO_ID`, `DESCRICAO`, `CLASSIFICACAO`, `ATIVO` (1=Analista→Implantador, 2=Suporte→Atendimento, 3=Programador→Desenvolvimento) |

### Tabelas Implantação (v1.1.0+)
| Tabela | Prefixo | Descrição |
|--------|---------|-----------|
| `tbtipoprojeto` | `TPP_` | Tipos (CLIENTE, CARTEIRA, INTEGRACAO, PROJETO_CIAA) |
| `tbcoluskananban` | `CLK_` | Colunas Kanban (máx 8) |
| `tbprojeto` | `PRJ_` | Projetos (código auto `PRJ-0001`, sem equipe desde 2026-09-12) |
| `tbprojetoetapa` | `PEP_` | Nove cards fixos por projeto |
| `tbprojetoetapachecklist` | `PEC_` | Checklist do card |
| `tbprojetoetapadocumento` | `PED_` | Documentos do card |
| `tbprojetoetahistorico` | `PEH_` | Histórico do card |
| `tbprojetoetapacomentario` | `PEC_` | Comentários do card |
| `tbtarefa` | `TRF_` | Tarefas (status, prioridade, coluna Kanban, **tipo Feature/Bug**, **data entrega**, **etapa fixa do projeto `TRF_ProjetoEtapaId` → `tbprojetoetapa.PEP_Id`; obrigatório quando há projeto**) |
| `tbcomentariotarefa` | `CMT_` | Comentários/histórico |
| `tbtarefareponsavel` | — | **N:N**: responsáveis múltiplos por tarefa (TRF_Id, OPERADOR_ID) |
| `tbtarefachamado` | — | **N:N**: vínculo tarefa↔chamado legado (TRF_Id, CHAMADO_ID) |
| `tbtarefaapontamento` | — | **Apontamentos**: APT_Id, TRF_Id, OPERADOR_ID, APT_Data, APT_Horas, APT_Observacao |
| `tbauditoriaimplantacao` | — | Auditoria de alterações de Implantação (JSON antes/depois) |

> `IMPL_Etapa`, `tbtarefa.TRF_EtapaId` e a FK legada foram removidos pela migration `20260922154202_RemoveEtapaAntiga`; o vínculo atual é `TRF_ProjetoEtapaId → tbprojetoetapa.PEP_Id`.
>
> A entidade `Cliente` e a tabela `IMPL_Cliente` foram removidas pela migration `20260926022803_PadraoTabelasTb` (cadastro morto). A fonte única de clientes é a legada `tbcliente` (`ExcludeFromMigrations()`, somente leitura), assim como `tbchamado` e `tbfuncionario`.
>
> A tabela de colunas do Kanban **segue a regra** `tb` + `ColunaKanban`.ToLower() (14 caracteres, o que `ColunaKanban.cs` e os snapshots declaram). ⚠️ O literal da `PadraoTabelasTb` para essa tabela tem 16 caracteres e não coincide com o modelo: conferir o nome real no banco antes de dar por encerrado.

### Tabelas Agenda V2 (MVP)
| Tabela | Prefixo | Descrição |
|--------|---------|-----------|
| `tbagenda` | `AGD_` | Eventos (título, datas, tipo, responsável, projeto, cor, visibilidade) |
| `tbtipoevento` | — | Tipos configuráveis (nome, cor, ativo) |
| `tbagendaparticipante` | — | N:N evento ↔ operador (participantes) |

> ⚠️ **Migração necessária em homolog/produção:** `scripts/deploy/deploy.ps1` **não** aplica migrations. Caminhos:
> 1. `scripts/db/renomear-tabelas-tb-idempotente.sql` — tabelas em `tb*`, equivalente à `PadraoTabelasTb`; **é o caminho de produção** para as tabelas (carimba também as migrations aplicadas manualmente).
> 2. `scripts/db/renomear-indices-pk-tb-idempotente.sql` — índices, PKs e unique constraint, equivalente à `RenomeiaIndicesPkTb`. Use este para essa parte: o script das tabelas ainda traz a chamada de índice na forma defeituosa (sem itemtype `INDEX` e sem qualificar a tabela), que **pula o rename silenciosamente**.
> 3. `scripts/db/conferencia-padrao-tb.sql` — conferência de contagens/estrutura; aceita nomes antigos e novos, rode **antes e depois** e compare as seções 1 e 2.
> 4. `dotnet ef database update` — atenção: `20260914144751_AgendaConflitoHorarios`, `20260917202045_TarefaProjetoOpcional` e `20260920185734_TarefaProjetoEtapaId` já foram carimbadas à mão, e há um registro órfão `20260910183240_AgendaGeral` sem arquivo no repositório.
>
> `scripts/db/migracao-tarefa-projeto-etapa-id.sql` está marcado como **obsoleto — não executar** (substituído pelo script idempotente acima).

---

## ⚙️ Configuração (Produção)

O `appsettings.json` do repo contém **placeholders**. A configuração real fica **apenas no servidor** (`C:\inetpub\wwwroot\Suporte_Back\appsettings*.json`), preservada pelo `scripts/deploy/deploy.ps1`.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=SEU_SERVIDOR;Database=SEU_BANCO;User Id=SEU_USUARIO;Password=SUA_SENHA;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "SUA_CHAVE_SECRETA_JWT_LONGA",
    "Issuer": "CentralConhecimento",
    "Audience": "CentralConhecimentoFront",
    "AccessTokenMinutes": 240,
    "RefreshTokenHours": 4
  },
  "GoogleSheets": {
    "ApiKey": "SUA_CHAVE_API_GOOGLE",
    "SpreadsheetId": "SEU_SPREADSHEET_ID",
    "Range": "A1:Z1000"
  },
  "SwaggerEnabled": false
}
```

**Variáveis de ambiente recomendadas:** `JWT_KEY`, `DB_EXPLORER_SENHA`, `SwaggerEnabled`.

---

## 🛠️ Desenvolvimento

### Seed Development (InMemory)
- Operador: `admin` / `admin123` (perfil Admin, `FUNCAO_ID=1` → Implantador)
- 3 Funções (`tbfuncao`), 7 Colunas Kanban padrão
- 4 Tipos de projeto (sem `EquipeId`)
- Sem seed de Etapas Globais; cada Projeto inicializa nove cards por `ProjetoEtapaService`
- 7 Tipos de evento (`tbtipoevento`)
- > ⚠️ **Seeds de exemplo DESABILITADOS** (desde a limpeza total para testes):
  > `Seed tbprojeto` (IMP-0001/CIAA-0001 com tarefas e comentários) e
  > `Seed tbagenda` (5 eventos) estão sob `#if false` em `Program.cs`.
  > Não são mais criados — a base de testes parte limpa.
  > Clientes vêm somente leitura da legada `tbcliente` (sem seed próprio).

### Limpeza total para testes (SQL Server `Central_Conhecimento`)
Script: `scripts/db/wipe-test-data.sql` (transação com `TRY/CATCH`, contagens ANTES/DEPOIS).
Usa os nomes atuais (`tb*`). Apaga projetos, etapas (+checklist/docs/histórico/comentários), tarefas
(+responsáveis/chamados/apontamentos/comentários), agenda (+participantes) e
`tbauditoriaimplantacao`, em ordem FK-segura; faz `RESEED 0` das IDENTITIES (guardado por
`sys.identity_columns`). Preserva tipos, etapas-base, colunas, tipos de evento,
operadores, funções, clientes, legadas (`tbchamado`/`tbcliente`/`tbfuncionario`) e auth.
Como `ProjetoService.ProximoCodigoAsync()` é MAX-based, após o wipe o próximo
código volta a `PRJ-0001` sozinho.

Procedimento:
1. **Backup do banco antes** (`BACKUP DATABASE` — irreversível sem ele).
2. Rodar via SSMS ou `sqlcmd -S <servidor> -d Central_Conhecimento -E -C -i wipe-test-data.sql`.
3. Reiniciar o backend.
4. Conferir telas vazias (projetos, tarefas, agenda) com cadastros auxiliares intactos.

### Migrations
```bash
# Criar migration
dotnet ef migrations add NomeDaMigration -o Migrations

# Gerar script SQL idempotente
dotnet ef migrations script --idempotent -o Migracao.sql

# Aplicar em desenvolvimento (InMemory não precisa)
dotnet ef database update
```

> ⚠️ **Sem auto-migrate no startup** — o backend **não** executa `Database.Migrate()`
> ao iniciar. Toda migration precisa ser aplicada manualmente no servidor
> (`dotnet ef database update` ou script SQL idempotente).

#### Padrão `tb*` — migrations e aplicação manual
- `20260926022803_PadraoTabelasTb`: padroniza 20 nomes de tabela em `tb*` (14 renomeações + 6 normalizações de caixa), funde `CC_Funcao` na legada `tbfuncao` (ganha `CLASSIFICACAO`/`ATIVO`, `FUNCAO_ID` widenada de `smallint` para `int`), remove `IMPL_Cliente`/`CC_Funcao`/`AgendaEvento`/`AgendaEventoParticipante` e renomeia 20 PKs por `sp_rename` (mais a `PK_tbfuncao` recriada em `ALTER TABLE`). Escrita à mão, não gerada pelo scaffold. As **FKs não** foram renomeadas (cosmético).
- `20260926022906_RenomeiaIndicesPkTb`: alinha os **nomes** de índice, PK e unique constraint — 33 índices para `IX_<tabela>_<colunas>`, as 5 PKs que o EF deixou com nome automático (`PK_tbagenda`, `PK_tbagendaparticipante`, `PK_tbauditoriaacesso`, `PK_tbrefreshtoken`, `PK_tbtipoevento`) e a unique constraint para `AK_tbtipoevento_Nome`. Duas armadilhas do `sp_rename`, que já causaram falha silenciosa: índice exige o itemtype `'INDEX'` (sem ele `OBJECT_ID('dbo.<índice>')` devolve `NULL`, o guard passa e o rename é pulado sem erro) e o nome precisa ser qualificado como `"tabela.índice"` (`"dbo.índice"` ou `"índice"` falham com o erro 15248).
- **Produção:** use `scripts/db/renomear-tabelas-tb-idempotente.sql`; `scripts/deploy/deploy.ps1` não aplica migrations. Audite com `scripts/db/conferencia-padrao-tb.sql` (antes/depois, seções 1 e 2).
- **Carimbadas à mão em `__EFMigrationsHistory`:** `20260914144751_AgendaConflitoHorarios`, `20260917202045_TarefaProjetoOpcional`, `20260920185734_TarefaProjetoEtapaId`. Registre órfão no banco: `20260910183240_AgendaGeral` (sem arquivo `.cs`; o EF ignora).

#### Cards por projeto — migrations e modelo atual
- `20260918211919_AddProjetoEtapas`: cria `tbprojetoetapa` e tabelas de checklist, documento, histórico e comentário.
- `20260920185734_TarefaProjetoEtapaId`: adiciona `tbtarefa.TRF_ProjetoEtapaId` e o índice/FK para `tbprojetoetapa.PEP_Id`. O `Up` histórico ainda usava nomes de `IMPL_Etapa` no backfill.
- `20260922154202_RemoveEtapaAntiga`: remove a FK/índice/coluna `TRF_EtapaId`, remove `IMPL_Etapa` e recria a FK do card com `Restrict`.
- Modelo atual: `TarefaService.ValidarEtapaFixaAsync` exige card do mesmo projeto quando a tarefa tem projeto; tarefa sem projeto fica sem card. `RecalcularJornadaAsync` usa `IProjetoJornadaService` e depois `SincronizarEtapasPorTarefasAsync`.

A limpeza posterior dos endpoints de Projetos **não criou migration nem alterou banco**. A limpeza frontend de Etapas Globais também não tocou no backend. Validação registrada: 19/19 testes, typechecks e build frontend; gate backend/frontend verde.

---

## 📚 Documentação Relacionada

- [`docs/README.md`](../docs/README.md) — entrada da documentação canônica
- [`docs/02-ARQUITETURA.md`](../docs/02-ARQUITETURA.md) — arquitetura, autenticação e segurança
- [`docs/05-ENDPOINTS.md`](../docs/05-ENDPOINTS.md) — catálogo de endpoints e contratos
- [`docs/06-COMPONENTES-FRONTEND.md`](../docs/06-COMPONENTES-FRONTEND.md) — clientes e fluxos frontend
- [`docs/07-SERVICES-BACKEND.md`](../docs/07-SERVICES-BACKEND.md) — controllers, serviços, modelos e migrations
- [`docs/08-HISTORIAS-TELAS.md`](../docs/08-HISTORIAS-TELAS.md) — histórias e cenários de QA
- [`docs/09-TROUBLESHOOTING.md`](../docs/09-TROUBLESHOOTING.md) — diagnóstico do backend e dependências
- [`docs/10-DEPLOY.md`](../docs/10-DEPLOY.md) — publicação no IIS