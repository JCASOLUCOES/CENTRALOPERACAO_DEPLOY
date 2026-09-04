# Central de Operação — Monorepo de Deploy

Este repositório (`JCASOLUCOES/CENTRALOPERACAO_DEPLOY`) é o **monorepo de
deploy** do sistema **Central de Operação** (anteriormente "Central de
Conhecimento") da **JCA Soluções**. Ele agrega os dois subprojetos (frontend
Angular e backend ASP.NET Core) e contém os scripts que fazem o build +
publicação direta no IIS do servidor `192.168.2.130`.

## Visão geral

| Subprojeto | Stack | Repositório | Branch padrão | Branch de dev |
|---|---|---|---|---|
| Subprojeto | Stack | Repositório | Branch padrão | Branch de dev |
|---|---|---|---|---|
| `frontend/CENTRALOPERACAO_FRONTEND/` | Angular 18 (standalone + SSR/prerender) + Bootstrap 5 + ng-bootstrap 17 | [`JCASOLUCOES/Central-Conhecimento`](https://github.com/JCASOLUCOES/Central-Conhecimento) | `main` | `developer` |
| `backend/CENTRALOPERACAO_BACKEND/Central_BackEnd/` | ASP.NET Core 8 (Web API) + EF Core (InMemory/SqlServer) + Google Sheets + JWT (4h) | [`JCASOLUCOES/CCBAckend`](https://github.com/JCASOLUCOES/CCBAckend) | `main` | `developer` |

> Os dois subprojetos são **submódulos git** deste monorepo (cada um com seu
> próprio `.git/` em `frontend/` e `backend/`). O `.gitmodules` na raiz
> registra os ponteiros para os repos remotos. Este repositório guarda
> apenas a **orquestração de deploy** + as refs dos submódulos.

## Estratégia de branches e versionamento

Os **3 repositórios** (`CENTRALOPERACAO_DEPLOY`, `Central-Conhecimento` e
`CCBAckend`) compartilham a mesma convenção:

| Branch / Tag | Propósito | Onde |
|---|---|---|
| `main` | **Produção** — espelho do que está rodando no IIS 192.168.2.130. Recebe merges via PR de `developer` (com aprovação). | front, back, deploy |
| `developer` | **Desenvolvimento** — onde o JCASOLUCOES mexe no dia-a-dia. | front, back, deploy |
| `sara` | Branch pessoal da Sara (criada a partir de `developer`). | front, back, deploy |
| `samuel` | Branch pessoal do Samuel (criada a partir de `developer`). | front, back, deploy |
| `projeto-implantacao` | Branch futura que segue o projeto original + novo projeto acoplado (criar quando necessário). | front, back, deploy |
| `v0.7.0`, `v0.7.1`, ... | **Tags** que marcam versões estáveis já em produção. Não há branch `backup` — usamos tags de versão. | front, back, deploy |

### Regras de proteção de `main`
- `main` é a **branch padrão** nos 3 repositórios (configurado no GitHub).
- Branch protection recomendada em `main` (configurar via
  `https://github.com/JCASOLUCOES/<repo>/settings/branches`):
  - ☑ Require a pull request before merging (1 aprovação)
  - ☑ Require conversation resolution before merging
  - ☑ Require linear history
  - ☐ Allow force pushes (deixe **desmarcado**)
- `developer` e branches pessoais (`sara`, `samuel`) **não têm proteção** —
  push direto é permitido.

### Como criar uma branch que englobe o projeto todo

Como cada repo tem sua própria `developer`/`sara`/etc., criar uma branch nova
exige o mesmo comando nos 3 repos. Por exemplo, para criar `sara`:

```bash
# frontend (submódulo)
cd frontend
git checkout developer
git checkout -b sara
git push -u origin sara
cd ..

# backend (submódulo)
cd backend
git checkout developer
git checkout -b sara
git push -u origin sara
cd ..

# monorepo (raiz)
git checkout master
git checkout -b sara
git push -u origin sara
```

> 💡 Ou simplesmente: `powershell -ExecutionPolicy Bypass -File .\branch-todos.ps1 -Branch sara`
> (cria a branch em todos os repos de uma vez).

### Como versionar uma release

Quando o sistema vai para produção no IIS 192.168.2.130:

```bash
# Nos 3 repos (depois de merge em main):
git checkout main
git tag -a v0.X.Y -m "v0.X.Y - descricao"
git push origin v0.X.Y
```

A tag marca o ponto exato que está em produção. Para reverter, basta
`git checkout v0.7.0` e fazer deploy dessa tag.

## Estrutura

```
CENTRALOPERACAO_DEPLOY/                  <- este repositório
├─ deploy.ps1                           <- script de build + publish + IIS
├─ deploy.bat                           <- atalho Windows (sem credenciais)
├─ deploy.local.bat                     <- atalho local COM senha (gitignored)
├─ branch-todos.ps1                     <- cria branch em todos os repos
├─ AGENTS.md                            <- regras dos assistentes opencode
├─ .opencode/                           <- skills (deploy-limpo, subir-interno)
├─ .agents/                             <- skills globais (frontend-design)
├─ .gitmodules                          <- registro dos submódulos
├─ frontend/                            <- submódulo git (JCASOLUCOES/Central-Conhecimento)
│  └─ CENTRALOPERACAO_FRONTEND/         <- código Angular 18
└─ backend/                             <- submódulo git (JCASOLUCOES/CCBAckend)
   └─ CENTRALOPERACAO_BACKEND/
      └─ Central_BackEnd/
         └─ wwwroot/
            └─ web.config               <- ativa Swagger em prod via env var
```

## Como funciona o deploy

O `deploy.ps1` faz, em ordem:

1. `npm run build` em `frontend/CENTRALOPERACAO_FRONTEND/` (Angular SSR/prerender).
2. `dotnet publish -c Release` em `backend/CENTRALOPERACAO_BACKEND/Central_BackEnd/`.
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
   `backend/CENTRALOPERACAO_BACKEND/Central_BackEnd/wwwroot/web.config` (env var
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
