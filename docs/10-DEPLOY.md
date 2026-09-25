---
title: "Deploy e publicação no IIS — Central de Operação"
description: "Runbook de validação, empacotamento, publicação, migrations, rollback e smoke do monorepo."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# Deploy e Publicação no IIS — Central de Operação

Runbook consolidado do monorepo único. Este documento substitui, para fins operacionais, as instruções conflitantes do antigo [`DEPLOY.md`](./backup/2026-09-24/DEPLOY.md) e da [`DOCUMENTACAO-COMPLETA.md`](./backup/2026-09-24/DOCUMENTACAO-COMPLETA.md), e foi conferido contra o código, [`scripts/validate.ps1`](../scripts/validate.ps1), [`scripts/deploy/deploy.ps1`](../scripts/deploy/deploy.ps1) e [`scripts/smoke.ps1`](../scripts/smoke.ps1).

**Nenhum segredo é reproduzido aqui.** Forneça a credencial do servidor interativamente por `Get-Credential` ou por um mecanismo seguro aprovado; nunca envie a senha pela linha de comando, terminal compartilhada ou mensagem.

> **Risco crítico — comportamento atual do script:** `scripts/deploy/deploy.ps1` contém uma credencial fixa como fallback e a reutiliza quando `-SenhaRemota` é vazio. O valor não aparece neste runbook. Antes de qualquer novo deploy, rotacione a credencial da conta administrativa, invalide a anterior, confirme as permissões e execute a publicação com `Get-Credential` ou `SecureString` de secret manager. O runbook seguro sobrescreve o fallback; o comportamento inseguro do código permanece até uma correção futura.

## Índice

1. Escopo e regra de ouro
2. Fonte de verdade e estrutura
3. Pré-requisitos
4. Ambientes, portas e JOTA/reverse proxy
5. Estrutura do IIS
6. Pipeline obrigatório
7. Migrations antes da publicação
8. Regras de package e publicação
9. `BUILD_INFO` e hash
10. Preservação de configuração
11. Backup e rollback
12. Branches, tags e versionamento
13. Troubleshooting de deploy
14. Limites conhecidos e fatos corrigidos
15. Checklist de conclusão

## 1. Escopo e regra de ouro

O fluxo obrigatório é:

```text
subir interno
  → validate
  → commit/push pelo fluxo normal
  → validate
  → package
  → publish
  → smoke
```

Regra de ouro: **não publique sem `validate.ps1` verde no commit atual**.

O `validate.ps1` apenas avisa quando o working tree está sujo; ele não bloqueia. Portanto, a limpeza do working tree é uma obrigação do operador, não uma garantia do script.

Skills opcionais:

- `subir interno` para desenvolvimento;
- `validar` para o gate de build;
- `deploy limpo` para automatizar validate → package → publish → smoke.

Os scripts são a fonte final do comportamento. Consulte [`subir-interno`](../.opencode/skills/subir-interno/SKILL.md), [`validar`](../.opencode/skills/validar/SKILL.md) e [`deploy-limpo`](../.opencode/skills/deploy-limpo/SKILL.md).

## 2. Fonte de verdade e estrutura

### Monorepo

- Frontend Angular 18: `frontend/`; backend ASP.NET Core 8: `backend/Central_BackEnd/`.
- Gate: `scripts/validate.ps1`; package/publicação: `scripts/deploy/deploy.ps1`; smoke: `scripts/smoke.ps1`.
- Migrations: `backend/Central_BackEnd/Migrations/`; saída local ignorada pelo Git: `deploy/`.

Não existem submódulos. `frontend/` e `backend/` pertencem ao mesmo repositório.

### Saídas reais

Frontend: `frontend/dist/central-conhecimento-actyon/{browser,server}` (IIS recebe somente `browser`); backend: `backend/Central_BackEnd/publish_output/{Central_BackEnd.dll,Central_BackEnd.runtimeconfig.json}`; pacote: `deploy/{BUILD_INFO.txt,backend,frontend}`.

## 3. Pré-requisitos

### Estação de trabalho

- Windows com PowerShell 5.1 ou superior.
- Git configurado e acesso ao remoto.
- Node.js 20, conforme o workflow do projeto, e npm.
- SDK .NET 8.
- Dependências frontend instaladas:

```powershell
Set-Location .\frontend
npm ci
Set-Location ..
```

- Dependências backend restauradas:

```powershell
Set-Location .\backend\Central_BackEnd
dotnet restore
Set-Location ..\..
```

- Acesso aos feeds de npm/NuGet e à rede interna.
- Para migrations: `sqlcmd`, SSMS ou ferramenta DBA aprovada e credencial obtida com segurança.

### Servidor IIS

- ASP.NET Core Hosting Bundle compatível com .NET 8.
- IIS, ASP.NET Core Module e URL Rewrite para o fallback SPA.
- Bindings nas portas 1009 e 1010.
- Permissão de leitura/escrita para a conta operacional no compartilhamento administrativo `c$`.
- Pool `Suporte_Back` e configuração efetiva de ambiente/JWT/banco/Google Sheets.
- Para Database Explorer, variáveis `DB_EXPLORER_*` protegidas no Application Pool.
- Para o JOTA, reverse proxy/ARR ou regra equivalente que encaminhe `/api/rag-proxy/*` para o backend `1009`; essa configuração não está versionada no repositório.
- Swagger acessível em `/swagger`, porque o smoke atual depende desse endpoint.

### Gate de segurança

- Não versionar `appsettings*.json` reais, senhas, chaves JWT, cookies ou strings de conexão.
- Obter a credencial do servidor por `Get-Credential`; não informar `-SenhaRemota` como texto.
- O comportamento atual do script pode reutilizar o fallback fixo; o runbook seguro exige sempre uma credencial explícita e rotacionada antes de publicar.
- Fazer backup do banco antes de migration; o backup IIS não inclui banco de dados.

## 4. Ambientes, portas e JOTA/reverse proxy

| Cenário | Frontend | Backend | Banco principal |
|---|---|---|---|
| Development/InMemory | `http://localhost:4200` | `http://localhost:1009` | `CentralDev`, efêmero |
| Development/SQL Homolog | `http://localhost:4200` | `http://localhost:1009` | SQL Homolog |
| IIS | `http://192.168.2.130:1010` | `http://192.168.2.130:1009` | SQL do servidor |

### InMemory

Em `ASPNETCORE_ENVIRONMENT=Development`, `Program.cs` consulta `Database:UseSqlServer`:

- `false`: usa EF Core InMemory `CentralDev`; dados desaparecem ao encerrar;
- `true`: usa `ConnectionStrings:DefaultConnection`.

A baseline atual de `appsettings.Development.json` usa `true`, ou seja, SQL Homolog. Para um teste rápido em memória, altere a flag para `false` antes de iniciar o backend. O provider InMemory não valida o schema SQL real.

### SQL Homolog

Para SQL Homolog, a baseline referencia `192.168.2.154` e `dbBUSINESS_HML`. Garanta rota, autenticação e migrations desse banco. Não copie a string de conexão para console ou documentação; prefira `user-secrets` ou configuração local protegida.

### API

- Desenvolvimento: `http://localhost:1009/api/v1`
- Produção/IIS: `http://192.168.2.130:1009/api/v1`

A origem do frontend deve estar na política CORS do backend. A lista atual está em [`Program.cs`](../backend/Central_BackEnd/Program.cs).

### JOTA e reverse proxy

O frontend usa a URL relativa `/api/rag-proxy`; o backend expõe somente `POST /api/rag-proxy/chat` com autenticação. O `web.config` versionado do frontend contém apenas o fallback SPA, não a regra de proxy. Em produção, valide no IIS/ARR que essa rota chega a `Suporte_Back:1009` e não é transformada em `index.html`.

O `RagProxyService` pode habilitar `AnythingLLM:EnableMockFallback` por padrão e devolver uma resposta simulada quando o destino externo falha. Para validar a integração real, verifique a configuração efetiva no Application Pool; em ambiente controlado, `AnythingLLM__EnableMockFallback=false` evita mascarar a indisponibilidade. A configuração do reverse proxy deve ser inventariada fora do repositório, pois não está versionada.

## 5. Estrutura do IIS

| Camada | Binding | Pasta física | Conteúdo publicado |
|---|---|---|---|
| Backend | porta 1009 | `C:\inetpub\wwwroot\Suporte_Back` | `deploy/backend` |
| Frontend | porta 1010 | `C:\inetpub\wwwroot\Suporte_Front` | `deploy/frontend/browser` |

### Backend

- Executa `Central_BackEnd.dll` pelo ASP.NET Core Module.
- `web.config` vem do `dotnet publish` e **é sobrescrito** no mirror.
- `appsettings*.json` do servidor são excluídos do mirror e preservados.
- O script cria `app_offline.htm` antes de copiar e o remove somente após backend íntegro.
- O `web.config` versionado atualmente habilita Swagger e stdout log. Se a política for diferente, altere a fonte versionada/compatível e publique novamente; uma edição manual no servidor pode ser perdida.

### Frontend

- O build inclui `frontend/public/web.config` com fallback para `index.html`.
- O URL Rewrite deve estar instalado.
- O mirror remove arquivos do site que não existem no pacote novo, preservando a árvore sincronizada.

## 6. Pipeline obrigatório

### Etapa 0 — congelar o ponto de partida

Na raiz do monorepo:

```powershell
git branch --show-current
git status --short
git rev-parse HEAD
```

Condições:

- branch esperada, normalmente `developer`;
- `git status --short` sem saída;
- dependências instaladas;
- migrations que serão publicadas já identificadas;
- nenhum processo de build local capaz de alterar `dist`, `publish_output` ou `deploy`.

### Etapa 1 — subir interno

Use a skill `subir interno` ou dois terminais.

Backend:

```powershell
Set-Location .\backend\Central_BackEnd
dotnet run
```

Frontend:

```powershell
Set-Location .\frontend
npm start
```

Teste em `http://localhost:4200`:

1. login;
2. navegação autenticada;
3. recarregamento/refresh da sessão;
4. ao menos um módulo afetado;
5. integração externa quando o fluxo exigir.

Não use build de produção nessa etapa.

### Etapa 2 — primeiro validate

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

O gate executa:

1. `git status`, branch e commit;
2. `dotnet build --nologo` em `backend/Central_BackEnd` — **Debug**, pois não informa `-c Release`;
3. `npx ng build` em `frontend`.

O validate prova a compilação Debug, não os mesmos binários que serão publicados. O `dotnet publish -c Release` da etapa de package é o gate real do backend publicado. Se o validate retornar código 1, pare; se o package Release falhar, também pare e não publique.

### Etapa 3 — commit e push pelo fluxo normal

```powershell
git status --short
git add <arquivos-da-mudanca>
git diff --cached --stat
git commit -m "tipo: descricao"
git push origin developer
git status --short
git rev-parse HEAD
```

Use a convenção do repositório: `feat:`, `fix:`, `docs:`, `chore:` ou `refactor:`. Não inclua segredos, saída de build, `deploy/` ou `publish_output/`.

### Etapa 4 — segundo validate

Execute novamente:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

Esse segundo gate deve rodar com o commit já gravado. Se a árvore estiver suja ou o hash mudou, pare e corrija antes de empacotar.

### Etapa 5 — package sem tocar no IIS

Como `BuildFrontend` e `BuildBackend` são `Nullable[bool]`, use `powershell -Command` e escape o `$` no PowerShell externo:

```powershell
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend `$true -BuildBackend `$true -Publicar `$false -Backup `$false"
```

O package:

- roda `npm run build` em `frontend`;
- roda `dotnet publish -c Release -o ./publish_output` no backend;
- valida os artefatos;
- copia com `robocopy /E` para `deploy/backend` e `deploy/frontend` — `/E` **não espelha nem limpa** arquivos antigos;
- grava `deploy/BUILD_INFO.txt`;
- não acessa nem altera o IIS.

Se houver risco de saída antiga, pare o frontend/backend local e limpe somente diretórios gerados antes de repetir o package:

```powershell
Remove-Item -Recurse -Force .\deploy -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\backend\Central_BackEnd\publish_output -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\frontend\dist\central-conhecimento-actyon -ErrorAction SilentlyContinue
```

Depois execute o package completo novamente; não apague código-fonte.

Confira:

```powershell
git status --short
git rev-parse HEAD
Get-Content .\deploy\BUILD_INFO.txt
Test-Path .\deploy\backend\Central_BackEnd.dll
Test-Path .\deploy\backend\Central_BackEnd.runtimeconfig.json
Test-Path .\deploy\frontend\browser\index.html
Test-Path .\deploy\frontend\server\server.mjs
```

`BUILD_INFO.GitCommit` deve ser igual a `git rev-parse HEAD`.

### Etapa 6 — publish sem rebuild

Não passe pela linha de comando do processo filho para credencial. No mesmo PowerShell, obtenha a credencial segura e invoque o script:

```powershell
$usuarioIis = Read-Host "Usuário administrativo do IIS"
$credencialIis = Get-Credential -UserName $usuarioIis -Message "Credencial de publicação IIS"

try {
    & '.\scripts\deploy\deploy.ps1' `
        -BuildFrontend $false `
        -BuildBackend $false `
        -Publicar $true `
        -Backup $true `
        -UsuarioRemoto $credencialIis.UserName `
        -SenhaRemota $credencialIis.Password
}
finally {
    $credencialIis = $null
    $usuarioIis = $null
}
```

A publicação:

1. compara `BUILD_INFO.GitCommit` com o HEAD antes de tocar o servidor;
2. testa conectividade;
3. autentica no compartilhamento administrativo;
4. cria backup dos sites;
5. publica backend com `app_offline.htm`;
6. remove o arquivo de offline após backend íntegro;
7. publica o frontend;
8. encerra a unidade de rede remota.

Se ocorrer exceção, erro do PowerShell ou código diferente de zero, não rode smoke como se o deploy tivesse passado. Consulte o terminal e o estado `app_offline.htm`.

### Etapa 7 — smoke real

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -Servidor 192.168.2.130
```

O script atual testa somente:

- frontend na porta 1010;
- Swagger na porta 1009.

Ele não faz login e não chama API de negócio. Após o smoke, faça um gate manual mínimo:

- abrir a aplicação;
- autenticar;
- recarregar e renovar sessão;
- abrir uma tela autenticada e verificar o logout, registrando apenas o status;
- consultar ao menos um endpoint de negócio representativo;
- verificar a funcionalidade afetada.

Consulte [`09-TROUBLESHOOTING.md`](./09-TROUBLESHOOTING.md) para diagnóstico.

## 7. Migrations antes da publicação

O pipeline obrigatório não pode ignorar migration quando o commit altera o modelo.

### Regras

- `deploy.ps1` não aplica migrations.
- O backend não executa `Database.Migrate()` no startup.
- InMemory não valida migrations SQL.
- A design-time factory aponta para LocalDB; um `dotnet ef database update` sem conexão explícita pode atingir o banco errado.
- `Migrations/Sql/AllMigrations.sql` está desatualizado na baseline e não inclui as migrations mais recentes.

### Gate

1. Identifique migrations adicionadas/modificadas no commit.
2. Faça backup do banco alvo.
3. Gere um script a partir do commit atual:

```powershell
Set-Location .\backend\Central_BackEnd
dotnet ef migrations script --idempotent --output "$env:TEMP\central-operacao-migrations.sql"
Pop-Location
```

4. Revise o SQL com o responsável pelo banco.
5. Execute no banco correto usando autenticação segura.
6. Confirme `__EFMigrationsHistory` e o schema real.
7. Registre hash do commit, script e resultado da execução.
8. Só então prossiga para package/publish.

Quando existir um script idempotente específico e revisado em `backend/Central_BackEnd/Migrations/Sql`, ele pode ser usado conforme aprovação. Não presuma que o arquivo agregado está atualizado.

## 8. Regras de package e publicação

- `robocopy /E` no package não espelha nem limpa; `/MIR` só é usado no IIS.
- Códigos 8 ou superior falham; ainda confirme artefatos, `BUILD_INFO` e a ausência de `app_offline.htm` residual.

## 9. `BUILD_INFO` e hash

`deploy/BUILD_INFO.txt` contém:

- `GitCommit`
- `GitBranch`
- `DataUtc`
- `Usuario`
- `BuildFrontend`
- `BuildBackend`
- `Maquina`

O arquivo é regravado quando package executa ao menos um build. A publicação sem build preserva o arquivo existente e compara `GitCommit` com o HEAD atual.

### Garantias

- Divergência de hash aborta a publicação.
- Commit após o package exige novo validate e novo package.
- Mudança de conteúdo não versionado não é detectada pelo hash.

### Limitações

- `BUILD_INFO` não calcula hash de DLLs, bundles ou `deploy/`.
- O script não recusa working tree sujo.
- O script não compara o `GitBranch` durante o publish.
- O smoke não lê `BUILD_INFO` no servidor.

Por isso, `git status --short` vazio antes do package é obrigatório.

## 10. Preservação de configuração

### Preservado

O mirror do backend exclui `appsettings*.json`, incluindo o arquivo verificado após a publicação. Isso mantém a string de conexão, JWT, Google Sheets e demais ajustes do servidor. **Limitação:** o script verifica apenas a existência de `appsettings.json`; se ele faltar, emite aviso e continua, em vez de abortar. O runbook seguro trata qualquer aviso como hard stop.

### Não preservado como configuração manual

- `web.config` faz parte dos artefatos e é sobrescrito.
- Variáveis de ambiente do Application Pool não fazem parte do pacote.
- Segredos devem ficar em armazenamento seguro/variáveis, não em `web.config` versionado.

### Configuração efetiva

`appsettings*.json` do servidor tem precedência somente quando não há override de ambiente. Para Swagger, `ASPNETCORE_SWAGGER_ENABLED` sobrepõe `SwaggerEnabled`.

Atenção ao JWT: o startup aceita `JWT_KEY`, enquanto a emissão em `AuthService` ainda lê `Jwt:Key`. A correção de código deve unificar essas fontes. Até lá, disponibilize a configuração necessária ao processo IIS por canal seguro e valide login/refresh após a reciclagem. O cookie de refresh também está configurado no código com `Secure=false`; não trate HTTP como transporte seguro. Antes de HTTPS, alinhe CORS, bindings, URL do frontend e atributo `Secure`, depois repita login/refresh/logout.

## 11. Backup e rollback

### Backup IIS

O parâmetro opcional `-Backup` tem padrão `$false`, mas o pipeline obrigatório usa `$true`. Antes da substituição, o script cria:

```text
C:\Users\JCASRV-SUP\Documents\Backup_IIS\<yyyyMMdd-HHmmss>\
├─ backend\
└─ frontend\
```

No backup do backend, `appsettings*.json` é excluído. O frontend é copiado integralmente. O backup não inclui banco de dados.

### Rollback dos sites

1. Identifique o timestamp e confirme que backend/frontend existem no backup.
2. Coloque o backend em manutenção pelo procedimento aprovado, preservando `app_offline.htm` se já existir.
3. Restaure os sites a partir do backup:

```powershell
$backup = '\\192.168.2.130\c$\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>'

robocopy "$backup\backend" '\\192.168.2.130\c$\inetpub\wwwroot\Suporte_Back' /MIR /XF appsettings*.json app_offline.htm /R:2 /W:1
robocopy "$backup\frontend" '\\192.168.2.130\c$\inetpub\wwwroot\Suporte_Front' /MIR /R:2 /W:1
```

4. Verifique que `appsettings*.json` atuais do servidor permaneceram intactos e que `Central_BackEnd.dll` e `Central_BackEnd.runtimeconfig.json` foram restaurados.
5. **Só depois do mirror íntegro**, remova o `app_offline.htm` remanescente; caso contrário, o rollback continuará offline:

```powershell
$offline = '\\192.168.2.130\c$\inetpub\wwwroot\Suporte_Back\app_offline.htm'
if (Test-Path -LiteralPath $offline) { Remove-Item -LiteralPath $offline -Force }
```

6. Recicle `Suporte_Back` se necessário.
7. Rode smoke e QA manual.

Se o backend novo depender de schema novo, restaurar apenas os sites pode causar incompatibilidade. Nesse caso, restaure também o banco com o plano do DBA ou aplique uma correção somente para frente; não improvise rollback de schema.

### Rollback de versão

Tags são a referência imutável. Use uma worktree/branch limpa baseada na tag, rode o pipeline completo e só promova se passar. Não faça deploy de uma árvore suja nem altere/mova uma tag já publicada.

## 12. Branches, tags e versionamento

| Branch | Uso |
|---|---|
| `developer` | desenvolvimento e push direto pelo fluxo normal |
| `master` | produção e releases, alimentado por merge de `developer` |

Branches manuais `backup-*` existem apenas para recuperação histórica e não fazem parte do fluxo diário. Tags `vX.Y.Z` substituem branches de backup.

### Regras

1. Desenvolva e valide em `developer`.
2. Faça push do commit validado.
3. Revalide o commit.
4. Publique conforme o pipeline obrigatório.
5. Promova `developer` para `master` por merge revisado.
6. Só crie tag depois de confirmar que a versão está mergeada em `master`.
7. Crie tag anotada `vX.Y.Z`, com descrição, e publique no remoto.
8. Não mova, reutilize ou exclua tag de versão.

Para consulta pontual, use `git branch --all` e `git tag --list`; este runbook não fixa uma lista de tags que envelhece.

## 13. Troubleshooting de deploy

| Sintoma | Causa provável | Ação |
|---|---|---|
| validate passa, package Release falha | validate usa `dotnet build` Debug | pare no package; não publique |
| working tree sujo no validate | alteração não commitada | commit ou descarte explícito; não empacote assim |
| artefato antigo continua no pacote | `/E` não limpa saídas anteriores | feche processos, limpe apenas diretórios gerados e refaça build/package |
| `BUILD_INFO.txt` ausente | package não foi executado ou foi apagado | rode package completo |
| `BUILD_INFO` diverge do HEAD | commit após package | valide e empacote novamente |
| credencial fixa é reutilizada | fallback do script ou `-SenhaRemota` vazio | rotacione antes do próximo deploy e passe `Get-Credential`/secret manager; não registre o valor |
| script não conecta ao servidor | rede/firewall/VPN | valide rota até `192.168.2.130` |
| autenticação no `c$` falha | credencial/permissão | obtenha nova credencial segura e revise a permissão; não registre a senha |
| aviso de appsettings ausente | o script apenas avisa e continua | trate como hard stop, restaure antes de aceitar o deploy |
| backend fica offline | mirror falhou ou `app_offline.htm` permaneceu | conclua o mirror; remova o offline somente após validar artefatos |
| robocopy código 11 | DLL ainda bloqueada pelo worker | aguarde 1–2 min e repita; não remova o arquivo de offline antes do mirror |
| logout redireciona, mas retorna 401 | interceptor exclui `/auth/` do Bearer | limpar estado local não prova revogação; trate o token como ativo e solicite correção |
| JOTA 404/HTML ou resposta simulada | reverse proxy/ARR ausente ou fallback mock | valide regra IIS externa e desabilite fallback em ambiente controlado |
| frontend 404 em rota SPA | URL Rewrite/web.config | publique o pacote correto e valide o módulo IIS |
| backend 500 | ambiente, banco, configuração ou `web.config` | leia stdout log/event log, recicle e compare a configuração efetiva |
| smoke falha imediatamente | IIS ainda reciclando | aguarde 30–60 s e rode novamente |
| smoke passa, negócio falha | escopo insuficiente do script | faça login e QA manual |
| script mostra caminho do backend duplicado | o resumo do deploy antepõe `inetpub\wwwroot` a um destino que já o contém | use os caminhos reais desta runbook e valide o sistema de arquivos; é falha de apresentação, não do mirror |

Para locking local e remoto, consulte [`09-TROUBLESHOOTING.md`](./09-TROUBLESHOOTING.md).

## 14. Limites conhecidos e fatos corrigidos

1. `smoke.ps1` testa somente frontend 1010 e Swagger 1009; não faz login nem API de negócio.
2. O smoke depende de `/swagger`; desabilitar Swagger sem adaptar o script torna o gate vermelho.
3. A baseline versionada habilita Swagger no `web.config`; não assuma o padrão antigo “produção false” sem verificar a configuração efetiva do servidor.
4. `validate.ps1` compila o backend em Debug; `deploy.ps1` publica o backend em Release.
5. O package usa `/E` e não limpa artefatos antigos; o mirror `/MIR` ocorre somente no IIS.
6. A ausência de `appsettings.json` gera apenas aviso no script, não hard stop.
7. Um rollback pode deixar `app_offline.htm`; remova-o somente após mirror e artefatos íntegros.
8. O interceptor exclui `/auth/` do Bearer; logout pode receber 401 e não revogar o refresh token.
9. O cookie `cc_refresh` está com `Secure=false`, e `JWT_KEY`/`Jwt:Key` têm divergência de uso.
10. O JOTA usa URL relativa e depende de reverse proxy/ARR não versionado; AnythingLLM pode responder por fallback mock.
11. `BUILD_INFO` compara apenas o hash registrado com o HEAD; não garante árvore limpa nem integridade binária.
12. O package correto é `deploy/frontend/browser`, não `dist/frontend/browser`.
13. O deploy IIS do frontend publica somente `browser`; `server/server.mjs` é validado no pacote, mas não é executado pelo IIS nessa topologia.
14. `appsettings*.json` do servidor são preservados; `web.config` não.
15. O script possui fallback de credencial no código. Este guia não reproduz o valor; rotacione antes de qualquer novo deploy e forneça `SecureString` por `Get-Credential`/secret manager.
16. `AllMigrations.sql` está desatualizado; gere e revise SQL a partir do commit atual.
17. O script de migrations não existe no deploy; migration é etapa manual e auditável.
18. Em Development, a flag atual seleciona SQL Homolog; InMemory só ocorre quando alterada para `false`.
19. O resumo do script pode exibir o caminho do backend com prefixo duplicado; valide sempre as pastas reais do IIS.

## 15. Checklist de conclusão

### Antes do package

- [ ] Ambiente local testado.
- [ ] Primeiro validate verde; a compilação Debug não foi tratada como prova do Release.
- [ ] Commit/push concluído no fluxo normal.
- [ ] Working tree limpa.
- [ ] Credencial fixa do servidor rotacionada antes de qualquer novo publish.
- [ ] Migration revisada/aplicada quando necessária.
- [ ] Backup do banco definido quando houver mudança de schema.
- [ ] Saídas antigas limpas quando o package incremental puder reutilizar arquivos.

### Package/publicação

- [ ] Package Debug/Release distinction verificada: validate Debug e publish Release.
- [ ] `BUILD_INFO.GitCommit` igual ao HEAD.
- [ ] Quatro artefatos obrigatórios presentes e sem resíduo de `/E`.
- [ ] Credencial obtida por `Get-Credential` ou secret manager; fallback fixo não usado.
- [ ] Backup IIS criado com timestamp.
- [ ] `appsettings*.json` preservados; ausência não foi aceita como simples aviso.
- [ ] Backend saiu de `app_offline.htm`.
- [ ] Frontend publicado com fallback SPA.
- [ ] Regra JOTA/ARR documentada e testada, ou indisponibilidade explicitamente aceita.

### Validação

- [ ] `smoke.ps1` retornou 0 — somente frontend 1010 e Swagger 1009.
- [ ] Login e refresh funcionais; logout foi verificado, incluindo o 401 conhecido.
- [ ] API autenticada representativa respondeu.
- [ ] Tela afetada foi validada.
- [ ] Integrações externas/banco foram testadas quando aplicáveis.
- [ ] `Secure=false` e a divergência `JWT_KEY`/`Jwt:Key` foram avaliados.
- [ ] Nenhum segredo foi impresso ou publicado.

## Arquivos relacionados

- [`09-TROUBLESHOOTING.md`](./09-TROUBLESHOOTING.md) — sintomas, causas e soluções.
- [`../scripts/validate.ps1`](../scripts/validate.ps1) — gate obrigatório.
- [`../scripts/deploy/deploy.ps1`](../scripts/deploy/deploy.ps1) — package, fallback de credencial, backup e publicação.
- [`../frontend/src/app/features/chat/jota-chat.service.ts`](../frontend/src/app/features/chat/jota-chat.service.ts) — URL relativa do JOTA.
- [`../backend/Central_BackEnd/Services/RagProxyService.cs`](../backend/Central_BackEnd/Services/RagProxyService.cs) — AnythingLLM e fallback mock.
- [`../scripts/smoke.ps1`](../scripts/smoke.ps1) — smoke real e seus limites.
- [`../backend/Central_BackEnd/Program.cs`](../backend/Central_BackEnd/Program.cs) — ambientes, CORS e Swagger.
- [`../backend/Central_BackEnd/wwwroot/web.config`](../backend/Central_BackEnd/wwwroot/web.config) — host ASP.NET Core no IIS.
- [`../frontend/public/web.config`](../frontend/public/web.config) — fallback SPA.
