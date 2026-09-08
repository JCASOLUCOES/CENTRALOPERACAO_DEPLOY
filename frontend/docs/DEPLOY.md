# Deploy — Central de Operação

Guia prático de como gerar e publicar o sistema **Central de Operação**
(frontend Angular 18 SSR + backend ASP.NET Core 8) no IIS.

> **Atalho:** digite **"deploy limpo"** no opencode — a skill `deploy-limpo`
> executa tudo isso automaticamente e confere o resultado.
>
> **Swagger:** a habilitação do Swagger é controlada pela chave `SwaggerEnabled` no
> `appsettings.json` do backend (padrão `false` em produção). Para habilitar, defina
> `SwaggerEnabled=true` no arquivo ou via variável de ambiente. O Swagger fica em `/swagger`
> (porta 1009).
>
> **Versionamento de API:** todos os endpoints usam prefixo `/api/v1/` (ex.:
> `/api/v1/auth/login`, `/api/v1/acessos`). Suporta segmento de URL e header `X-Api-Version`.

## Estrutura

```
Central-Conhecimento-developer/   <- raiz do monorepo (repo CENTRALOPERACAO_DEPLOY)
├─ deploy.ps1                     <- script de build + publicação no IIS
├─ deploy.bat                     <- atalho Windows (sem senha)
├─ deploy.local.bat               <- atalho LOCAL com senha (IGNORADO pelo git)
├─ branch-todos.ps1               <- cria branch em todos os repos
├─ frontend/                      <- submódulo git (JCASOLUCOES/Central-Conhecimento)
│                                  <- código Angular 18 direto na raiz do repo front
└─ backend/                       <- submódulo git (JCASOLUCOES/CCBAckend)
   └─ Central_BackEnd/            <- projeto .NET
   └─ deploy/                     <- saída (regenerada sempre — ignorada no git)
      ├─ backend/                 <- backend publicado (bin/Release/net8.0/publish)
      └─ frontend/                <- frontend publicado (browser/ + server/)
```

> `frontend/` e `backend/` são **submódulos git** registrados em
> `.gitmodules` na raiz. Cada um aponta para seu repositório remoto
> (`JCASOLUCOES/Central-Conhecimento` e `JCASOLUCOES/CCBAckend`,
> branch padrão `main`).

## 1. Pré-requisitos

- Node.js 18+ e npm (frontend).
- SDK/runtime .NET 8 (backend).
- `npm install` já executado em `frontend/`.

## 2. Gerar o deploy

Execute na raiz do monorepo:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

> **Atalho local com senha embutida** (apenas na máquina do desenvolvedor;
> arquivo `deploy.local.bat` está no `.gitignore`):
> ```cmd
> deploy.local.bat
> ```

O que o script faz (em ordem):

1. `npm run build` em `frontend/` (SSR/prerender).
2. `dotnet publish -c Release` em `backend/Central_BackEnd/`.
3. Remove e recria `deploy/backend` e `deploy/frontend`.
4. Copia `bin\Release\net8.0\publish\*` → `deploy/backend`.
5. Copia `dist\central-conhecimento-actyon\*` → `deploy/frontend`.

Qualquer falha interrompe o script (`$ErrorActionPreference = "Stop"`).
No final aparecem **"Pacote local gerado"** (caminhos em `deploy/`) e, com
`-Publicar` no padrão, **"DEPLOY CONCLUIDO COM SUCESSO!"**.

**Verificações:**
- `deploy\backend\Central_BackEnd.dll` existe.
- `deploy\frontend\browser\index.html` e `deploy\frontend\server\server.mjs` existem.

## 3. Publicar no IIS

A conta que acessa o servidor **192.168.2.130** é **Administrador** local e o
compartilhamento administrativo `\\192.168.2.130\c$` está liberado
(`LocalAccountTokenFilterPolicy`), então o `deploy.ps1` **publica direto nas
pastas reais do IIS** em um único comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

> :lock: **Credenciais do servidor**: o script **não contém mais senha hard-coded**.
> Ele exibe o servidor e o usuário padrão `JCASRV-SUP (padrao)`, pede
> confirmação ou alteração do usuário e em seguida solicita a senha
> separadamente (`Read-Host -AsSecureString`). Opcionalmente, defina
> `DEPLOY_USUARIO_REMOTO` no ambiente da sua sessão PowerShell para
> sobrescrever o padrão:
> `$env:DEPLOY_USUARIO_REMOTO = "JCASRV-SUP"`.

| Camada | Porta | Pasta do IIS apontada pelo site |
|---|---|---|
| Frontend | 1010 | `C:\inetpub\wwwroot\Suporte_Front` |
| Backend | 1009 | `C:\inetpub\wwwroot\Suporte_Back` |

O que o script faz além do build (`npm run build` + `dotnet publish`):

1. Empacota em `deploy/backend` e `deploy/frontend`.
2. Exibe servidor, usuário com `(padrao)` e pede senha separadamente.
3. Autentica no servidor e conecta em `\\192.168.2.130\c$`.
4. **Backup do IIS atual** em
   `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>` (backend e frontend).
5. **Backend**: cria `app_offline.htm` em `Suporte_Back` (libera o lock do
   worker do IIS), copia binários **excluindo `appsettings*.json`** (mensagem
   explícita antes da cópia), remove o `app_offline.htm`. Após a cópia,
   informa `appsettings.json do servidor mantido intacto` ou `AVISO:
   appsettings.json nao encontrado`. O IIS recarrega sozinho.
6. **Frontend**: envia `deploy\frontend\browser` para `Suporte_Front`.
7. Exibe os caminhos publicados e do backup.

Para **apenas empacotar** (sem publicar): `-Publicar:$false`.

> :warning: O `appsettings.json` do repositório tem **placeholders** de
> segurança. O script **nunca sobrescreve nem apaga** os `appsettings*.json` do
> servidor. A config real (banco/JWT/Google) fica guardada só no servidor.

> :information_source: A config real foi recuperada do histórico do git
> (commit `05978be`, antes da sanitização) e restaurada em `Suporte_Back` em
> 07/08/2026. Mantenha uma cópia fora do repositório.

## 4. Habilitando o Swagger no servidor IIS

O Swagger fica em **`http://192.168.2.130:1009/swagger`** e por padrão está
**desligado em produção** (`appsettings.json` → `SwaggerEnabled: false`). Para
ligar em produção há duas formas:

### 4.1. Via `web.config` (recomendado — sem editar `appsettings.json`)

O `deploy.ps1` **preserva os `appsettings*.json` do servidor**, então a forma
mais limpa é definir uma **variável de ambiente no IIS** via `web.config`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet"
                  arguments=".\Central_BackEnd.dll"
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\Logs\stdout">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_SWAGGER_ENABLED" value="true" />
        </environmentVariables>
      </aspNetCore>
    </system.webServer>
  </location>
</configuration>
```

> Esse arquivo já está versionado em
> `backend/Central_BackEnd/wwwroot/web.config` e é copiado
> automaticamente pelo `dotnet publish` para a pasta publicada — basta o
> `web.config` do IIS em `Suporte_Back` ter a mesma configuração
> (`<environmentVariable name="ASPNETCORE_SWAGGER_ENABLED" value="true" />`).
>
> **Como funciona:** o `Program.cs` chama
> `builder.Configuration.GetValue<bool>("SwaggerEnabled")`. O ASP.NET Core
> resolve isso na seguinte ordem de precedência:
> 1. Variáveis de ambiente (incluindo as do `<environmentVariables>` acima).
> 2. `appsettings.{Environment}.json`.
> 3. `appsettings.json`.
>
> Portanto `ASPNETCORE_SWAGGER_ENABLED=true` **vence** o `false` do JSON.

### 4.2. Editando o `appsettings.json` do servidor

Se preferir não usar `web.config`, edite diretamente
`C:\inetpub\wwwroot\Suporte_Back\appsettings.json` e ajuste:

```json
{
  "SwaggerEnabled": true
}
```

Como o `deploy.ps1` **não sobrescreve** esse arquivo, a mudança persiste
entre deploys. Lembre-se de reiniciar o Application Pool (seção 6.3) para que
a alteração seja lida.

### 4.3. Reciclando o Application Pool

Após salvar o `web.config` ou o `appsettings.json`, recicle o pool para a
configuração entrar em vigor:

```powershell
# localmente, via acesso ao servidor
Invoke-Command -ComputerName 192.168.2.130 -ScriptBlock {
    Import-Module WebAdministration
    Restart-WebAppPool "Suporte_Back"   # ajuste o nome se for diferente
}
```

Ou reinicie o site pelo Gerenciador do IIS (`Reciclar` no pool do
`Suporte_Back`).

### 4.4. Conferindo

1. Acesse **`http://192.168.2.130:1009/swagger/index.html`** — deve aparecer
   a UI do Swagger.
2. **`http://192.168.2.130:1009/swagger/v1/swagger.json`** deve listar os
   endpoints (confirmado em produção: `200` com 7 endpoints).
3. Para desligar, basta remover/ajustar a entrada no `web.config` ou
   `appsettings.json` e reciclar o pool. **Não é preciso** rodar deploy.

### 4.5. Em ambiente local (`subir interno`)

Em `Development`, o `appsettings.Development.json` já define
`SwaggerEnabled: true`, então o Swagger aparece automaticamente em
`http://localhost:1009/swagger`.

## 5. Avisos esperados no build

- SCSS de `fraseologia.component.scss` e `acessos.component.scss` podem exceder o budget.
- `Did not expect successive traversals` em `.form-floating>~label`.

São avisos, não erros — o deploy continua normalmente.

> **Nota:** com **lazy loading** em todas as rotas wiki e **Bootstrap SCSS parcial**, o bundle
> inicial caiu de ~1,51 MB para ~669 kB, e o CSS de estilos de 246 kB para 151 kB. Os avisos
> de budget de SCSS podem não mais aparecer.

## 6. Rollback

O `deploy.ps1` faz **backup automático** do IIS atual em
`C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>` antes de publicar
(backend + frontend). Para reverter, cole o conteúdo do backup nas pastas
`Suporte_Back` / `Suporte_Front` (sem mexer nos `appsettings*.json`) e recicle o
Application Pool se necessário.

## 7. Versionamento e branches

Os 3 repositórios do monorepo (`CENTRALOPERACAO_DEPLOY`, `Central-Conhecimento`,
`CCBAckend`) compartilham a mesma convenção. **Antes de fazer deploy, garanta
que a versão que está no servidor bate com a tag apropriada.**

### 7.1. Fluxo recomendado

1. **Desenvolver** em `developer` (push direto permitido).
2. **Promover para produção**: abrir PR de `developer` → `main`, com
   aprovação. Merge em `main` (linear history, sem merge commit).
3. **Taggear a release** em `main` (nos 3 repos):
   ```bash
   git checkout main && git pull
   git tag -a v0.X.Y -m "v0.X.Y - descricao"
   git push origin v0.X.Y
   ```
4. **Fazer deploy** (o `deploy.ps1` pega o commit mais recente do branch
   atual, ou você pode fazer `git checkout v0.7.0` antes de rodar o deploy
   para fixar a versão).

### 7.2. Branches

| Branch | Onde | Quem pode dar push |
|---|---|---|
| `main` (produção) | front, back, deploy | via PR de `developer` (1 aprovação) |
| `developer` (dev) | front, back, deploy | JCASOLUCOES direto |
| `sara` | front, back, deploy | direto |
| `samuel` | front, back, deploy | direto |
| `projeto-implantacao` | front, back, deploy | direto (quando existir) |

### 7.3. Tags

| Tag | Significado |
|---|---|
| `v0.7.0` | Release atual (estado do IIS 130 em 04/09/2026) |
| `v0.7.1`, `v0.8.0`, ... | Releases futuras |

Tags são **imutáveis** (não se mexe depois de criar) e servem como
"branch backup" — se algo der errado, basta `git checkout v0.7.0` e
redeployar.

### 7.4. Como criar uma branch nova

Hoje o monorepo já usa submódulos git, então basta rodar:

```powershell
powershell -ExecutionPolicy Bypass -File .\branch-todos.ps1 -Branch sara
```

Ou manualmente:

```bash
# Frontend (submódulo)
cd frontend
git checkout developer && git pull
git checkout -b sara && git push -u origin sara
cd ..

# Backend (submódulo)
cd backend
git checkout developer && git pull
git checkout -b sara && git push -u origin sara
cd ..

# Deploy (raiz)
git checkout master && git pull
git checkout -b sara && git push -u origin sara
```

### 7.5. Convenção de mensagens de commit

- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `docs:` — apenas documentação
- `chore:` — manutenção (deps, config, etc.)
- `refactor:` — refatoração sem mudança de comportamento
- `style:` — formatação, sem mudança de lógica
- `test:` — testes

Exemplo: `feat: busca compartilhada no header`

### 7.6. Como deployar uma versão antiga (rollback via tag)

```bash
# Nos 3 repos (submódulos + raiz)
git checkout master && git pull --tags
git submodule foreach 'git fetch --tags && git checkout v0.7.0 || true'

# Rodar o deploy
cd ..
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```
