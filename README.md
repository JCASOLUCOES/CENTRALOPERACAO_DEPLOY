# Central de Operação — Monorepo de Deploy

Este repositório (`JCASOLUCOES/CENTRALOPERACAO_DEPLOY`) é o **monorepo de
deploy** do sistema **Central de Operação** (anteriormente "Central de
Conhecimento") da **JCA Soluções**. Ele agrega os dois subprojetos (frontend
Angular e backend ASP.NET Core) e contém os scripts que fazem o build +
publicação direta no IIS do servidor `192.168.2.130`.

## Visão geral

| Subprojeto | Stack | Repositório | Branch |
|---|---|---|---|
| `CENTRALOPERACAO_FRONTEND/` | Angular 18 (standalone + SSR/prerender) + Bootstrap 5 + ng-bootstrap 17 | [`JCASOLUCOES/Central-Conhecimento`](https://github.com/JCASOLUCOES/Central-Conhecimento) | `developer` |
| `CENTRALOPERACAO_BACKEND/Central_BackEnd/` | ASP.NET Core 8 (Web API) + EF Core (InMemory/SqlServer) + Google Sheets + JWT (4h) | [`JCASOLUCOES/CCBAckend`](https://github.com/JCASOLUCOES/CCBAckend) | `developer` |

> Os dois subprojetos são **repositórios git independentes** (cada um com seu
> próprio `.git/`). O `.gitignore` da raiz **não versiona** o conteúdo deles
> (`CENTRALOPERACAO_FRONTEND/` e `CENTRALOPERACAO_BACKEND/` estão listados lá).
> Este repositório guarda apenas a **orquestração de deploy**.

## Estrutura

```
CENTRALOPERACAO_DEPLOY/                  <- este repositório
├─ deploy.ps1                           <- script de build + publish + IIS
├─ deploy.bat                           <- atalho Windows (sem credenciais)
├─ deploy.local.bat                     <- atalho local COM senha (gitignored)
├─ AGENTS.md                            <- regras dos assistentes opencode
├─ .opencode/                           <- skills (deploy-limpo, subir-interno)
├─ .agents/                             <- skills globais (frontend-design)
├─ CENTRALOPERACAO_FRONTEND/            <- repo frontend (git embedded)
└─ CENTRALOPERACAO_BACKEND/             <- repo backend (git embedded)
   └─ Central_BackEnd/
      └─ wwwroot/
         └─ web.config                  <- ativa Swagger em prod via env var
```

## Como funciona o deploy

O `deploy.ps1` faz, em ordem:

1. `npm run build` em `CENTRALOPERACAO_FRONTEND/` (Angular SSR/prerender).
2. `dotnet publish -c Release` em `CENTRALOPERACAO_BACKEND/Central_BackEnd/`.
3. Empacota em `deploy/backend/` e `deploy/frontend/`.
4. Conecta em `\\192.168.2.130\c$` com usuário `JCASRV-SUP` (senha via prompt).
5. Faz **backup** do IIS atual em
   `\\192.168.2.130\c$\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`.
6. **Backend**: cria `app_offline.htm` no IIS, copia `deploy/backend/*`
   (excluindo `appsettings*.json` para preservar a config real do servidor),
   remove `app_offline.htm` (IIS recarrega sozinho).
7. **Frontend**: copia `deploy/frontend/browser/*` para o IIS.
8. Encerra a conexão de rede e exibe o status.

### Portas e pastas no IIS

| Camada | Porta | Pasta IIS |
|---|---|---|
| Frontend | 1010 | `C:\inetpub\wwwroot\Suporte_Front` |
| Backend | 1009 | `C:\inetpub\wwwroot\Suporte_Back` |

## Como rodar o deploy

**Local com prompt de senha** (recomendado):

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

**Local com senha já gravada** (use o `deploy.local.bat`, ignorado pelo git):

```powershell
.\deploy.local.bat
```

**Apenas empacotar** (não publica):

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Publicar:$false
```

No opencode, digite **"deploy limpo"** para invocar a skill `deploy-limpo` que
orquestra o mesmo fluxo.

## Como desenvolver local

No opencode, digite **"subir interno"** para subir backend (porta 1009, com
EF InMemory) + frontend (porta 4200) com login `admin/admin123` contra o
Google Sheets real. Detalhes na skill `subir-interno`.

## Swagger em produção

O Swagger fica em **`http://192.168.2.130:1009/swagger`** e é controlado por:

1. `web.config` versionado em
   `CENTRALOPERACAO_BACKEND/Central_BackEnd/wwwroot/web.config` (env var
   `ASPNETCORE_SWAGGER_ENABLED=true`).
2. `SwaggerEnabled` no `appsettings.json` do servidor (true/false).

Precedência do ASP.NET Core Configuration: env var > `appsettings.{Env}.json` >
`appsettings.json`. Se ambos discordam, env var vence.

## Assistência opencode (skills)

- `deploy-limpo` — build + publish + IIS em um comando
- `subir-interno` — sobe backend+frontend local para dev
- `frontend-design` (em `.agents/skills/`) — guia de design visual

## Segurança

- O `deploy.local.bat` (com credencial do servidor) está **ignorado pelo git**.
  Não commite credenciais em texto plano.
- Os `appsettings*.json` reais do servidor **nunca** são sobrescritos pelo
  deploy. O template em `appsettings.sample.json` traz apenas placeholders.
- Mantenha uma cópia dos `appsettings*.json` reais fora do repositório.
