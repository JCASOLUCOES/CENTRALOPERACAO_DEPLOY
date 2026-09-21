# Deploy — Central de Operação

Guia prático de como gerar e publicar o sistema **Central de Operação**
(frontend Angular 18 SSR + backend ASP.NET Core 8) no IIS.

> **Atalho:** digite **"deploy limpo"** no opencode para acionar a skill
> `deploy-limpo`. O script tem perguntas interativas; para execução sem
> interação, informe os parâmetros descritos na seção 3.1.
> **Pendência:** a skill ainda descreve o fluxo anterior (script na raiz,
> backup automático e limpeza do pacote). Até sua atualização, siga este guia.
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
Central-Conhecimento-developer/   <- raiz do monorepo único (repo CENTRALOPERACAO_DEPLOY, sem submódulos)
├─ scripts/
│  ├─ deploy/deploy.ps1          <- script de build + publicação no IIS
│  ├─ deploy/run-dev.bat         <- atalho para ambiente dev local
│  ├─ git/branch-todos.ps1       <- cria branch no repo
│  └─ tools/extract-screens.ts   <- extração de metadados p/ docs-sync
├─ frontend/                      <- código Angular 18 (standalone + SSR)
│                                  <- direto no monorepo (não é submódulo)
├─ backend/                       <- API ASP.NET Core 8
│  └─ Central_BackEnd/            <- projeto .NET
├─ docs/                          <- documentação unificada
└─ deploy/                        <- saída incremental (sem limpeza prévia)
   ├─ backend/                    <- cópia de backend/Central_BackEnd/publish_output/
   └─ frontend/                   <- frontend publicado (browser/ + server/)
```

> `frontend/` e `backend/` são **pastas do próprio monorepo** — não há
> `.gitmodules` nem submódulos. Branch padrão: `main`; branch de dev: `developer`.
> O script de deploy fica em **`scripts/deploy/deploy.ps1`** (não mais na raiz):
> ele calcula a raiz do repo subindo **2 níveis** a partir de `$PSScriptRoot`
> (`scripts/deploy/`).

## 1. Pré-requisitos

- Node.js 18+ e npm (frontend).
- SDK/runtime .NET 8 (backend).
- `npm install` já executado em `frontend/`.

## 2. Gerar o deploy

Execute na raiz do monorepo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\deploy.ps1
```

O que o script faz (em ordem):

1. Pergunta **interativamente**:
   - `"Buildar o frontend (Angular) agora? (S/n)"` — padrão **S** (Enter aceita).
   - `"Buildar o backend (dotnet publish) agora? (S/n)"` — padrão **S** (Enter aceita).
2. `npm run build` em `frontend/` (SSR/prerender) — se o build do frontend for
   aceito; com **N**, reutiliza `frontend/dist/central-conhecimento-actyon/`.
3. `dotnet publish -c Release` em `backend/Central_BackEnd/` — se o build do
   backend for aceito. Se escolhido **N**, o publish existente
   (`publish_output/`) é reutilizado.
4. Empacotamento **incremental** em `deploy/backend` e `deploy/frontend` via
   robocopy `/E` — **sem limpar** `deploy/` (arquivos não modificados não são
   recopiados).
5. Valida os artefatos do pacote (`Central_BackEnd.dll` + runtimeconfig;
   `browser/index.html` + `server/server.mjs`) **antes de tocar o servidor**.

Qualquer falha interrompe o script (`$ErrorActionPreference = "Stop"` no escopo
global). Como o `npm`/`dotnet` retornam exit code em vez de erro PowerShell, o
script **guarda `$ErrorActionPreference` em torno de `npm run build` e
`dotnet publish`** (restaura para `'Continue'` durante a execução e verifica
`$LASTEXITCODE`, falhando explicitamente se ≠ 0).
No final aparecem **"Pacote local gerado"** (caminhos em `deploy/`) e, com
`-Publicar` no padrão, **"DEPLOY CONCLUIDO COM SUCESSO!"**.

**Verificações de artefatos (inclusive quando o build é reutilizado):**
- Build frontend: `frontend\dist\central-conhecimento-actyon\browser\index.html`
  e `...\server\server.mjs` (validados após o build e após o empacotamento).
- Build backend: `backend\Central_BackEnd\publish_output\Central_BackEnd.dll`
  e `Central_BackEnd.runtimeconfig.json` (validados após o publish e após o
  empacotamento).

> **Automação:** `-BuildBackend` e `-BuildFrontend` aceitam `Nullable[bool]`
> (`$true`/`$false`) para CI/CD. Se **omitidos**, o script pergunta
> interativamente. Ex.: `-BuildBackend:$false -BuildFrontend:$false` reaproveita
> o build existente e vai direto ao empacotamento/publicação.
>
> **Usuário remoto:** o parâmetro `$UsuarioRemoto` (padrão `JCASRV-SUP`) define
> a conta de acesso. Pode ser sobrescrito via variável de ambiente
> `DEPLOY_USUARIO_REMOTO` (ex.: `DEPLOY_USUARIO_REMOTO=meu_usuario`).
> Se `-SenhaRemota` estiver ausente, o script solicita a senha via
> `Read-Host -AsSecureString`. A autenticação usa `New-PSDrive` com
> `PSCredential`, sem `net use` nem conversão da senha para texto puro.

## 3. Publicar no IIS

A conta padrão de acesso ao servidor **192.168.2.130** é **JCASRV-SUP**.
A publicação exige conectividade e permissão no compartilhamento administrativo
`\\192.168.2.130\c$`; o script não configura essas permissões.
O `scripts/deploy/deploy.ps1` **publica direto nas pastas reais do IIS**:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\deploy.ps1
```

> **Credenciais do servidor:** o parâmetro `-SenhaRemota` tem valor padrão
> `jca@1532` (senha do `JCASRV-SUP` embutida no script desde 18/09/2026) e há
> fallback para o mesmo valor se vier vazio — na prática o deploy publica sem
> pedir senha. Com `-Publicar:$true` (padrão), após empacotar, validar os
> artefatos e testar a conectividade, a autenticação usa `New-PSDrive` com
> `PSCredential`, sem `net use` nem conversão da senha para texto puro.
> Para trocar a conta, passe `-UsuarioRemoto` (não há confirmação interativa
> do usuário). **Correção da documentação anterior:** o script atual não lê
> `DEPLOY_USUARIO_REMOTO`; definir apenas essa variável não muda a conta.
>
> **Invocação não-interativa:** `-BuildFrontend`, `-BuildBackend` e `-Backup`
> são `Nullable[bool]` — via `powershell -File`/`-Command` o `$true` chega
> como string e o bind falha. Use `-Command` com `$` escapado:
> `powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend `$true -BuildBackend `$true -Backup `$true"`.

| Camada | Porta | Pasta do IIS apontada pelo site |
|---|---|---|
| Frontend | 1010 | `C:\inetpub\wwwroot\Suporte_Front` |
| Backend | 1009 | `C:\inetpub\wwwroot\Suporte_Back` |

O que o script faz além do build (`npm run build` + `dotnet publish`):

1. Empacota incrementalmente em `deploy/backend` e `deploy/frontend`
   (robocopy `/E` — sem apagar `dist/`, `publish_output/` nem `deploy/`).
2. Valida artefatos do pacote, testa a conectividade e pede a senha de
   `JCASRV-SUP` via `Read-Host -AsSecureString` (ou aceita `-SenhaRemota`
   SecureString).
3. Autentica via `New-PSDrive` com `PSCredential` em `\\192.168.2.130\c$`.
   Os caminhos `DestinoBackendRel`, `DestinoFrontRel` e `BackupBaseRel` já
   foram validados no início, antes das perguntas: rejeita valores vazios,
   letra de unidade, raiz absoluta e segmentos `..`. Essa verificação não
   obriga os destinos a estarem sob `inetpub\wwwroot`.
4. **Backup do IIS (opcional — desligado por padrão)**: com `-Backup:$true`,
   copia `\\192.168.2.130\c$\<DestinoRel>` para
   `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>` (backend e frontend).
   Padrão é `-Backup:$false` (ligue com `-Backup:$true`).
5. **Backend**: cria `app_offline.htm` em `Suporte_Back` **se ainda não
   existir** (libera o lock do worker do IIS), faz **purge mirror** copiando
   binários **excluindo `appsettings*.json`** (mensagem explícita antes da
   cópia) e **mantém o `app_offline.htm`** em caso de falha de publicação
   (backend não sobe parcialmente). Com sucesso, remove o `app_offline.htm`
   (a menos que já fosse preexistente) e o IIS recarrega sozinho.
6. **Frontend**: purge mirror de `deploy\frontend\browser` para
   `Suporte_Front`.
7. Exibe os caminhos publicados e do backup (quando habilitado).

> **Desempenho:** todas as cópias usam um único robocopy por destino com
> `/MT:8 /R:2 /W:1 /XJ` (multithread, 2 tentativas, 1 s de espera, sem seguir
> junction points) e o empacotamento é **incremental** — não limpa `deploy/`
> nem apaga `dist/`/`publish_output/`, então builds e pacotes anteriores são
> reaproveitados (robocopy só copia o que mudou).
>
> **Lock da DLL (19/09/2026):** a espera padrão de 3 s após criar o
> `app_offline.htm` (`-EsperaOffline`) pode ser insuficiente — o mirror do
> backend falhou uma vez com robocopy código 11 (DLL ainda bloqueada pelo
> worker). Se ocorrer, aguarde 1–2 min (o `app_offline.htm` é mantido e o IIS
> fica offline com "Deploy em andamento...") e repita só o mirror:
> `robocopy deploy\backend \\192.168.2.130\c$\inetpub\wwwroot\Suporte_Back /MIR /XF appsettings*.json app_offline.htm /MT:8 /R:4 /W:5`
> (código 3 = OK sem falhas). Depois remova o `app_offline.htm` e publique o
> frontend.

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

O `scripts/deploy/deploy.ps1` **preserva os `appsettings*.json` do servidor**, então a forma
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

Como o `scripts/deploy/deploy.ps1` **não sobrescreve** esse arquivo, a mudança persiste
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

O `scripts/deploy/deploy.ps1` **não faz backup automático por padrão**
(`-Backup:$false`). Para gerar backup do IIS antes de publicar, rode com
`-Backup:$true` — nesse caso ele copia o estado atual do servidor
(`\\192.168.2.130\c$\<DestinoRel>`, backend e frontend) para
`C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>` (formato
`yyyyMMdd-HHmmss`, ex.: backup `20260912-163535` do deploy de 12/09/2026).
Para reverter, cole o conteúdo do backup nas pastas
`Suporte_Back` / `Suporte_Front` (sem mexer nos `appsettings*.json`) e recicle o
Application Pool se necessário.

### 6.1. Troubleshooting pós-deploy — stdout log temporário (caso real 2026-09-14)

Foi assim que a causa raiz do `500` em `GET /api/v1/agenda/eventos` foi capturada
(stack do EF/`OPENJSON` no log; detalhe em `PLANO-IMPLEMENTACAO-FASES.md` § "FIX 500").
Procedimento temporário (reverter ao final):

1. Faça backup do `web.config` atual em `inetpub\wwwroot\Suporte_Back\web.config`.
2. Ligue temporariamente o stdout log: `stdoutLogEnabled="true"` no
   `<aspNetCore>` do `web.config` (ex.: `stdoutLogFile=".\logs\stdout"`).
3. Recicle o Application Pool do `Suporte_Back` e **reproduza** o erro.
4. Leia o stack em `logs\stdout*.log` (pasta `logs\` sob `Suporte_Back`).
5. Restaure o backup do `web.config` (`stdoutLogEnabled="false"`), recicle o pool
   e **remova a pasta `logs\`** para não acumular disco.

### 6.2. Aplicação manual de migrations (deploy NÃO aplica migrations)

O `scripts/deploy/deploy.ps1` **não** aplica migrations EF Core. Scripts
idempotentes ficam em `backend/Central_BackEnd/Migrations/Sql/` e devem ser
rodados manualmente no banco alvo (ex.: `RemoveEquipes_Idempotente.sql`,
`AgendaConflitoHorarios_Idempotente.sql`).
**Exceção documentada:** a migration `20260920185734_TarefaProjetoEtapaId`
tem script manual equivalente em **`scripts/db/migracao-tarefa-projeto-etapa-id.sql`**
(idempotente: coluna + índice + FK `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa) + backfill por nome conhecido) —
ver `backend/README.md` § Migrations.

> **Incidente real 2026-09-14 (`RemoveEquipes`, homolog .154):** o script com
> `ON DELETE CASCADE` na FK `FK_IMPL_Projeto_IMPL_TipoProjeto` falhou com erro
> **1785/1750 + 3902** (SQL Server rejeita múltiplos caminhos CASCADE —
> `Etapa→TipoProjeto` já é `Cascade`). A correção foi `Restrict`
> (`AppDbContext.cs` + `Up` da migration + SQL regenerado com
> `ON DELETE NO ACTION`). Detalhe em `docs/telas/06-backend.md` §18.3.1.

Procedimento:

1. **Antes de rodar:** valide o SQL gerado (`dotnet ef migrations script`),
   procurando `ON DELETE CASCADE` duplicado sobre o mesmo principal. Regra:
   **toda FK obrigatória exige `OnDelete` explícito** em `AppDbContext.cs`.
2. Rode o script `*_Idempotente.sql` no banco alvo.
3. **Checagem pós-falha (obrigatória):** se o script falhar, **NUNCA**
   considere a migration "aplicada" só pela mensagem de erro — confira o
   history contra o schema real:
   ```sql
   SELECT MigrationId FROM __EFMigrationsHistory ORDER BY MigrationId;
   -- comparar com o schema real, ex.:
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
   WHERE TABLE_NAME LIKE 'IMPL_%' ORDER BY TABLE_NAME;
   ```
   Se houver linha no history **sem o DDL correspondente** (history
   "envenenado", como ocorreu na Fase 0 do incidente — linhas limpas
   manualmente pelo operador), remova/corrija a linha e reaplique o script
   corrigido.
 4. Linhas desconhecidas no history (ex.: migration fantasma
    `20260910183240_AgendaGeral`, sem arquivo em `Migrations/`) são
    **ignoradas pelo EF**; o snapshot atual é autoritativo.

> **Migration `20260920185734_TarefaProjetoEtapaId` (20/09/2026, contador dinâmico
> de tarefas por etapa):** aplicar **antes** do deploy via
> `dotnet ef database update` **ou** via script manual idempotente
> `scripts/db/migracao-tarefa-projeto-etapa-id.sql`:
> ```bash
> sqlcmd -S <servidor> -d Central_Conhecimento -E -C -i scripts/db/migracao-tarefa-projeto-etapa-id.sql
> ```
> O script cria `IMPL_Tarefa.TRF_ProjetoEtapaId` (NULL) + índice + FK `NO ACTION` (SQL Server barra múltiplos caminhos em cascata: IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa)
> p/ `tbprojetoEtapa.PEP_Id` e faz backfill por nome conhecido
> (`HOMOLOGACAO→HOMOLOGAÇÃO`; demais ficam `NULL` = só totais).
> Sem auto-migrate no startup — sem essa etapa, criar/atualizar tarefa com
> `projetoEtapaId` falha no banco.

### 6.3. Limpeza total para testes (base limpa — `scripts/db/wipe-test-data.sql`)

Script para zerar os dados operacionais do banco `Central_Conhecimento`
(SQL Server) mantendo cadastros auxiliares. Transação única com `TRY/CATCH`
(contagens ANTES/DEPOIS impressas; erro → `ROLLBACK`).

- **Apaga** (ordem FK-segura, filhos → pais): `CC_AgendaParticipante` →
  `IMPL_Agenda` → `IMPL_TarefaResponsavel`/`IMPL_TarefaChamado`/
  `IMPL_TarefaApontamento`/`IMPL_ComentarioTarefa` → `IMPL_Tarefa` →
  `tbprojetoEtapaChecklist`/`Documento`/`Historico`/`Comentario` →
  `tbprojetoEtapa` → `IMPL_Projeto` → `IMPL_Auditoria`; `RESEED 0` das
  IDENTITIES (guardado por `sys.identity_columns`).
- **Preserva**: tipos de projeto, etapas-base, colunas Kanban, tipos de evento,
  operadores, funções, clientes, legadas (`tbchamado`/`tbcliente`/`tbfuncionario`) e auth.
- Contexto: seeds de exemplo do backend (`Seed IMPL_Projeto` IMP-0001/CIAA-0001
  e `Seed IMPL_Agenda` com 5 eventos) estão **desabilitados** via `#if false`
  em `Program.cs` — só os seeds estruturais continuam. Como
  `ProjetoService.ProximoCodigoAsync()` é MAX-based, após o wipe o próximo
  código volta a `PRJ-0001` sozinho. Backend em Development usa InMemory (efêmero).

Procedimento:

1. **Backup do banco antes** (`BACKUP DATABASE`) — irreversível sem ele.
2. Rodar via SSMS ou:
   `sqlcmd -S <servidor> -d Central_Conhecimento -E -C -i scripts/db/wipe-test-data.sql`.
3. Reiniciar o backend (reciclar o Application Pool no IIS).
4. Conferir telas vazias (projetos, tarefas, agenda) com cadastros auxiliares intactos.

## 7. Versionamento e branches

O monorepo único (`CENTRALOPERACAO_DEPLOY`, sem submódulos) tem convenção própria.
**Antes de fazer deploy, garanta que a versão que está no servidor bate com a
tag apropriada.**

### 7.1. Fluxo recomendado

1. **Desenvolver** em `developer` (push direto permitido).
2. **Promover para produção**: abrir PR de `developer` → `main`, com
   aprovação. Merge em `main` (linear history, sem merge commit).
3. **Taggear a release** em `main`:
   ```bash
   git checkout main && git pull
   git tag -a v0.X.Y -m "v0.X.Y - descricao"
   git push origin v0.X.Y
   ```
4. **Fazer deploy** (o `scripts/deploy/deploy.ps1` pega o commit mais recente do branch
   atual, ou você pode fazer `git checkout v0.7.0` antes de rodar o deploy
   para fixar a versão).

### 7.2. Branches

| Branch | Quem pode dar push | Estado atual |
|---|---|---|
| `main` (produção) | via PR de `developer` (1 aprovação) | `8956c57` |
| `developer` (dev) | JCASOLUCOES direto | `8956c57` |
| `sara` | direto | — |
| `samuel` | direto | — |
| `projeto-implantacao` | direto (quando existir) | — |

### 7.3. Tags

| Tag | Significado |
|---|---|
| `v0.7.0` | Release atual (estado do IIS 130 em 04/09/2026) |
| `v0.8.0` | **Rollback Agenda** — Login 500 fixado, Agenda removida (master/developer alinhados em `8956c57`) |
| `v0.8.1`, `v0.9.0`, ... | Releases futuras |

Tags são **imutáveis** (não se mexe depois de criar) e servem como
"branch backup" — se algo der errado, basta `git checkout v0.7.0` e
redeployar.

### 7.4. Como criar uma branch nova

O monorepo é único (sem submódulos), então basta rodar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\git\branch-todos.ps1 -Branch sara
```

Ou manualmente:

```bash
git checkout developer && git pull
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
git checkout main && git pull --tags
git checkout v0.7.0

# Rodar o deploy
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\deploy.ps1
```
