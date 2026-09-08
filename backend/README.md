# Central de Operação — Backend (ASP.NET Core 8)

API REST do sistema **Central de Operação** (anteriormente "Central de
Conhecimento") da **JCA Soluções**. Atende o frontend Angular 18 com
autenticação JWT, gestão de acessos de empresas (Google Sheets) e rate
limiting.

Versão atual: **v0.7.0** (beta).

## Repositório e branches

- **Repositório**: [`JCASOLUCOES/CCBAckend`](https://github.com/JCASOLUCOES/CCBAckend)
- **Branch padrão (produção)**: `main` — espelho do que está no IIS 192.168.2.130.
- **Branch de desenvolvimento**: `developer` — onde o JCASOLUCOES mexe no dia-a-dia.
- **Branches pessoais**: `sara`, `samuel` (criadas a partir de `developer`).
- **Branch futura**: `projeto-implantacao` (quando o JCASOLUCOES for acoplar o novo projeto).
- **Tags de versão**: `v0.7.0`, `v0.7.1`, ... — marcam releases estáveis já em produção (em vez de branch `backup`).

### Regras de proteção de `main`
- `main` é a branch padrão no GitHub.
- **Branch protection recomendada** (configurar via `Settings → Branches → Add rule` para `main`):
  - ☑ Require a pull request before merging (1 aprovação)
  - ☑ Require conversation resolution before merging
  - ☑ Require linear history
  - ☐ Allow force pushes (deixe **desmarcado**)
- `developer`, `sara`, `samuel` **não têm proteção** — push direto é permitido.

### Como criar uma nova branch pessoal

```bash
git fetch origin
git checkout developer
git pull
git checkout -b sara          # ou samuel, projeto-implantacao, etc.
git push -u origin sara
```

> 💡 A mesma branch precisa existir nos 3 repos (`Central-Conhecimento`,
> `CCBAckend`, `CENTRALOPERACAO_DEPLOY`) — ver
> [README do monorepo](https://github.com/JCASOLUCOES/CENTRALOPERACAO_DEPLOY)
> para a convenção completa.

## Stack

- **.NET 8** (ASP.NET Core Web API)
- **Entity Framework Core 8** (InMemory em `Development`, SqlServer em produção)
- **JWT Bearer** (Microsoft.AspNetCore.Authentication.JwtBearer)
  - Tokens de **4h** (access em memória, refresh em cookie HttpOnly)
  - Configurável por env var `JWT_KEY`
- **Swagger / Swashbuckle** — toggle via `SwaggerEnabled` ou env var
  `ASPNETCORE_SWAGGER_ENABLED`
- **Versionamento de API** via `Asp.Versioning.Mvc` — prefixo `/api/v1/`
  (suporta segmento de URL e header `X-Api-Version`)
- **Google Sheets API** para o acervo de empresas (sem persistência local)
- **Rate limiting** (login: 5/min, validação: 5/min)
- **Brute force guard** por IP/operador

## Estrutura

```
Central_BackEnd/
├─ Controllers/        endpoints REST (Auth, Acessos)
├─ Services/           regras de negócio (Auth, GoogleSheets, BruteForceGuard)
├─ Data/               AppDbContext (EF Core)
├─ Models/             entidades e DTOs
├─ Dtos/               request/response
├─ Properties/
│  └─ launchSettings.json   <- configura Development + porta 1009
├─ wwwroot/            arquivos estáticos + web.config (env var do Swagger)
├─ appsettings.json    <- template (placeholders); deploy preserva o do servidor
├─ appsettings.sample.json
└─ Program.cs          <- pipeline (DI, auth, rate limit, Swagger, controllers)
```

## Desenvolvimento local

```powershell
# banco em memória (provider UseInMemoryDatabase)
dotnet run

# aguarda "Now listening on: http://0.0.0.0:1009"
# Swagger: http://localhost:1009/swagger
```

Login padrão (seed automático em `Development`):
- Usuário: `admin`
- Senha: `admin123`
- Perfil: `A` (Administrador)

> ⚠️ Esse seed só roda quando `app.Environment.IsDevelopment()` — em
> produção o backend usa o `appsettings.json` real (com a connection string
> do SQL Server de `192.168.2.154`).

No opencode, digite **"subir interno"** (skill `subir-interno`) para
subir backend + frontend de uma vez.

## Build de produção

```powershell
dotnet publish -c Release
```

Saída em `bin\Release\net8.0\publish\`. O `deploy.ps1` na raiz do
monorepo se encarrega de copiar para o IIS.

## Deploy

```powershell
# na raiz do monorepo (CENTRALOPERACAO_DEPLOY)
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

O script:
1. Faz `dotnet publish -c Release` aqui
2. Conecta em `\\192.168.2.130\c$` (usuário `JCASRV-SUP`)
3. Faz **backup** do IIS atual em
   `\\192.168.2.130\c$\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`
4. Cria `app_offline.htm` no `Suporte_Back`, copia binários
   **excluindo `appsettings*.json`** (config real do servidor é preservada),
   remove o `app_offline.htm` (IIS recarrega sozinho)

| Camada | Porta | Pasta IIS |
|---|---|---|
| Backend | 1009 | `C:\inetpub\wwwroot\Suporte_Back` |

## Swagger em produção

- **Default**: desabilitado (`appsettings.json` → `SwaggerEnabled: false`).
- Para **habilitar**, basta:
  - Editar `appsettings.json` do servidor: `"SwaggerEnabled": true`, **ou**
  - Setar env var no IIS: `ASPNETCORE_SWAGGER_ENABLED=true` (em
    `wwwroot/web.config`, versionado neste projeto).
- Precedência do ASP.NET Core Configuration: env var > `appsettings.{Env}.json`
  > `appsettings.json`. **Se ambos discordam, env var vence.**
- URL: `http://192.168.2.130:1009/swagger`
- OpenAPI JSON: `http://192.168.2.130:1009/swagger/v1/swagger.json`

## Versionamento de API

Todos os endpoints usam prefixo `/api/v1/` (ex.: `/api/v1/auth/login`,
`/api/v1/acessos`, `/api/v1/implantacao/projetos`). Suporta duas formas de
especificar a versão:

1. **Segmento de URL**: `/api/v1/acessos`
2. **Header HTTP**: `X-Api-Version: 1.0`

A configuração está em `Program.cs` (`AddApiVersioning` + `ApiVersionReader.Combine`).

## Módulo IMPLANTAÇÃO / PROJETOS (v1.1.0)

Branch: **`projeto-implantacao`** (em desenvolvimento).

### Entidades (`Models/Implantacao/`)

| Entidade | Tabela SQL Server | Descrição |
|---|---|---|
| `Cliente` | `IMPL_Cliente` | Cadastro de clientes (CNPJ, contato, observacao, ativo, auditoria) |
| `Equipe` | `IMPL_Equipe` | Equipes (`IMPLANTACAO`, `CIAA`) com prefixo de código (`IMP`, `CIAA`) |
| `MembroEquipe` | `IMPL_MembroEquipe` | Vínculo N:N operador↔equipe |
| `TipoProjeto` | `IMPL_TipoProjeto` | `CLIENTE`, `CARTEIRA`, `INTEGRACAO`, `PROJETO_CIAA` (clienteObrigatorio) |
| `Etapa` | `IMPL_Etapa` | Etapas configuráveis (vinculadas opcionalmente a um TipoProjeto) |
| `ColunaKanban` | `IMPL_ColunaKanban` | Colunas do Kanban (limite 8; 5 padrão seeded) |
| `Projeto` | `IMPL_Projeto` | Projeto principal (codigo, equipe, tipo, cliente opcional) |
| `Tarefa` | `IMPL_Tarefa` | Tarefas (status, prioridade, ordem, coluna Kanban, responsavel) |
| `ComentarioTarefa` | `IMPL_ComentarioTarefa` | Comentários / histórico |

### Controllers (`Controllers/Implantacao/`, todos com `[ApiVersion("1.0")]`)

| Controller | Rota base | Endpoints |
|---|---|---|
| `ClientesController` | `/implantacao/clientes` | GET, POST, PUT, DELETE |
| `EquipesController` | `/implantacao/equipes` | GET, POST, PUT, DELETE + POST `/membros`, DELETE `/membros/{id}` |
| `TiposProjetoController` | `/implantacao/tipos-projeto` | GET, POST, PUT, DELETE |
| `EtapasController` | `/implantacao/etapas` | GET, POST, PUT, DELETE |
| `ColunasKanbanController` | `/implantacao/colunas-kanban` | GET, POST, PUT, DELETE + POST `/reordenar` |
| `ProjetosController` | `/implantacao/projetos` | GET, POST, PUT, DELETE + GET `/proximo-codigo?equipeId=N` + PATCH `/{id}/status` |
| `TarefasController` | `/implantacao/tarefas` | GET, POST, PUT, DELETE + PATCH `/{id}/coluna` + POST `/{id}/comentarios` |
| `DashboardController` | `/implantacao/dashboard` | GET `?equipe=IMPLANTACAO\|CIAA` (KPIs agregados) |

Todos com `[Authorize]`. Rate limiting `validacao` (5/min por usuário) para
escrita. Validação: `clienteObrigatorio` por tipo de projeto (CLIENTE/
CARTEIRA/INTEGRAÇÃO exigem cliente; PROJETO_CIAA não).

### Geração automática de código de projeto

`ProjetoService.ProximoCodigoAsync(equipeId)` consulta o `PrefixoCodigo`
da equipe e gera sequencial:

- Equipe `IMPLANTACAO` (`IMP`) → `IMP-0001`, `IMP-0002`, ...
- Equipe `CIAA` (`CIAA`) → `CIAA-0001`, `CIAA-0002`, ...

### Seed automático (em `Development`)

Em `Program.cs`, quando o ambiente é `Development`, o `AppDbContext` é populado com:

- 1 operador (`admin` / `admin123` / perfil `A`)
- 2 equipes: `IMPLANTACAO` (prefixo `IMP`) e `CIAA` (prefixo `CIAA`)
- 5 colunas Kanban padrão (BACKLOG, A FAZER, EM ANDAMENTO, HOMOLOGACAO, CONCLUIDO)
- 4 tipos de projeto (CLIENTE/CARTEIRA/INTEGRACAO/PROJETO_CIAA)
- 13 etapas (6 IMPL + 7 CIAA)
- 3 clientes (Tech Solutions S/A, Indústria Aurora, Grupo Vértice)
- **2 projetos fakes**:
  - **IMP-0001** — Implantação Tech Solutions S/A (60%, 7 tarefas, 1 BLOQUEADA aguardando banco)
  - **CIAA-0001** — Agente IA — Classificação de Chamados (35%, 6 tarefas)

Tudo em InMemory — some ao reiniciar o processo.

### Migrations EF Core

Migration criada: `Migrations/20260904194350_ImplantacaoInit.cs`.

- **Em dev**: `dotnet ef database update` aplica no `UseInMemoryDatabase` (no-op, em memória).
- **Em prod**: `deploy.ps1` **não aplica migrations**. Aplicar manualmente:
  ```powershell
  # gerar script SQL idempotente
  dotnet ef migrations script --idempotent -o ImplantacaoInit.sql
  # aplicar no SQL Server 192.168.2.154
  sqlcmd -S 192.168.2.154 -d dbBUSINESS_HML -i ImplantacaoInit.sql
  ```
  Ou criar as 9 tabelas `IMPL_*` manualmente no SSMS (ver `DOCUMENTACAO-COMPLETA.md` § 6.5.2).

### `AppDbContextDesignTimeFactory`

Adicionada em `Data/AppDbContextDesignTimeFactory.cs` — `IDesignTimeDbContextFactory`
que permite ao `dotnet ef` gerar migrations com SQL Server (o InMemory é
incompatível com `IMigrator`).

## Segurança

- O `appsettings.json` do repositório tem **placeholders**. O **real** está
  só no servidor.
- O `deploy.ps1` **preserva** os `appsettings*.json` do servidor
  (`Excluir "appsettings*.json"` no robocopy).
- O `JWT_KEY` real fica em **variável de ambiente** no IIS, não no JSON.
- `appsettings.Development.json` **não é deployado** (excluído pelo
  `.gitignore` local deste repo).
- A chave JWT do seed de dev é fraca de propósito — **nunca usar em prod**.

## Documentação

- [`docs/` do frontend](../frontend/docs/) — `DEPLOY.md`,
  `DOCUMENTACAO-COMPLETA.md`, `backend-auth-integracao.md`
- [`README.md` do monorepo](https://github.com/JCASOLUCOES/CENTRALOPERACAO_DEPLOY)
  — visão geral dos 3 repos e fluxo de branches
