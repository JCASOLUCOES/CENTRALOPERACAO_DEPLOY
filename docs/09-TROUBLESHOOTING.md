---
title: "Troubleshooting — Central de Operação"
description: "Diagnóstico e soluções para dependências, Angular, .NET, dados, autenticação, integrações, IIS e smoke."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# Troubleshooting — Central de Operação

Guia de diagnóstico para dependências, Angular, .NET, banco de dados, autenticação, integrações, IIS e smoke test. O comportamento foi conferido no código e nos scripts deste commit; valores sensíveis não são reproduzidos aqui.

Para o procedimento completo de publicação, consulte [`10-DEPLOY.md`](./10-DEPLOY.md). Documentos anteriores, como [`DEPLOY.md`](./backup/2026-09-24/DEPLOY.md) e [`DOCUMENTACAO-COMPLETA.md`](./backup/2026-09-24/DOCUMENTACAO-COMPLETA.md), foram preservados como contexto não canônico em `docs/backup/2026-09-24/`; este guia prevalece quando houver divergência.

## Índice

1. Regras de segurança e ordem de diagnóstico
2. Dependências e ambiente
3. Angular: serve e build
4. Backend .NET
5. SQL Server e InMemory
6. Migrations EF Core
7. Autenticação, cookie e refresh
8. CORS
9. Database Explorer
10. Google Sheets e Acessos
11. JOTA e proxy RAG
12. IIS e publicação
13. Smoke test
14. Locking de arquivos
15. Checklist de encerramento

## 1. Regras de segurança e ordem de diagnóstico

- Não cole senha, chave JWT, string de conexão completa, cookie ou token em issue, terminal compartilhado, log ou documentação.
- Use `user-secrets` no desenvolvimento e armazenamento seguro/variáveis de ambiente no IIS.
- Ao diagnosticar SQL, Google Sheets, Database Explorer e IIS, mantenha as credenciais fora da linha de comando e das capturas de tela.
- Não mate indiscriminadamente todos os processos `dotnet` ou `node`; outras aplicações podem estar usando as mesmas portas.
- Antes de alterar banco ou servidor, faça backup e confirme o ambiente.

> **Risco crítico — credencial fixa no código:** o comportamento atual de `scripts/deploy/deploy.ps1` contém um fallback de credencial embutido e reutiliza esse fallback quando `-SenhaRemota` chega vazio. O valor não deve ser reproduzido, copiado para logs nem usado em novo deploy. **Antes de qualquer nova publicação**, revise a conta administrativa, rotacione a credencial no servidor, invalide a anterior e execute o script com `Get-Credential` ou com `SecureString` recuperado de secret manager aprovado. O runbook seguro sempre sobrescreve o fallback; remover a credencial fixa do código é uma correção de segurança pendente.

Ordem mínima:

1. Reproduza na mesma URL e no mesmo navegador.
2. Execute o gate sem pular nenhum projeto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
```

3. Separe o problema em build, processo, rede, autenticação, banco ou conteúdo publicado.
4. Consulte o terminal que iniciou cada processo e os logs do IIS.
5. Só altere código ou infraestrutura depois de identificar a causa.

## 2. Dependências e ambiente

### Matriz de portas

| Uso | URL/porta | Origem da configuração |
|---|---|---|
| Frontend em desenvolvimento | `http://localhost:4200` | `ng serve` |
| Backend em desenvolvimento | `http://localhost:1009` | `Properties/launchSettings.json` |
| Frontend publicado | `http://192.168.2.130:1010` | binding IIS |
| Swagger | `http://localhost:1009/swagger` ou `http://192.168.2.130:1009/swagger` | `SwaggerEnabled` efetivo |
| API v1 em desenvolvimento | `http://localhost:1009/api/v1` | `src/environments/environment.ts` |
| API v1 publicada | `http://192.168.2.130:1009/api/v1` | `src/environments/environment.prod.ts` |

### Sintomas, causas e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| `npm`, `ng` ou pacote local não encontrado | `frontend/node_modules` ausente ou incompleto | Entre em `frontend` e rode `npm ci`; use o mesmo Node do projeto e o `package-lock.json` |
| `dotnet` não reconhecido | SDK 8 ausente ou `PATH` desatualizado | Instale o SDK 8, reabra o terminal e rode `dotnet --info` |
| `dotnet ef` não reconhecido | CLI global do EF Core ausente | Instale uma versão compatível com EF Core 8; o pacote `Microsoft.EntityFrameworkCore.Tools` não instala a CLI global |
| Restore do NuGet falha | rede, proxy, TLS, feed ou cache | Confirme acesso à internet/rede interna, valide proxy/certificados e tente `dotnet restore` no projeto |
| `npm ci` falha com arquivo em uso | `ng serve`, build ou antivírus segurando `node_modules` | Feche apenas os processos deste frontend e repita |
| Backend não acessa Google Sheets | máquina sem saída HTTPS ou DNS | Teste DNS/HTTPS e revise proxy/firewall sem registrar a URL autenticada |
| Deploy não alcança o servidor | rota, VPN, firewall ou DNS | Confirme conectividade até `192.168.2.130` e acesso administrativo ao compartilhamento `c$` |
| Script nem inicia | PowerShell incompatível ou Execution Policy | Execute com `-ExecutionPolicy Bypass`; `validate.ps1` e `smoke.ps1` exigem PowerShell 5.1 ou superior |

Pré-requisitos confirmados pelo projeto: Node.js 20 usado no workflow, npm, SDK .NET 8, Git, PowerShell, acesso aos feeds e, quando aplicável, `sqlcmd`/SSMS para migrations.

## 3. Angular: serve e build

### Desenvolvimento

```powershell
Set-Location .\frontend
npm ci
npm start
```

A URL esperada é `http://localhost:4200`. O frontend chama a API diretamente; não existe `proxy.conf.json` no projeto.

### Build de produção

```powershell
Set-Location .\frontend
npm run build
```

Artefatos exigidos pelo deploy:

- `frontend/dist/central-conhecimento-actyon/browser/index.html`
- `frontend/dist/central-conhecimento-actyon/server/server.mjs`

O script publica no IIS somente a pasta `browser`; os arquivos `server` permanecem no pacote local.

### Diagnóstico

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Port 4200 is already in use` | outro `ng serve` ou aplicação ocupa a porta | Identifique o processo pelo `CommandLine` e encerre apenas o processo do projeto. Se usar outra porta, inclua a nova origem no CORS do backend |
| tela carrega, mas toda API falha em CORS | origem não está na lista do backend | Use exatamente uma origem autorizada e confira protocolo, host e porta |
| tela branca e console mostra exceção | erro JavaScript/runtime | Abra DevTools, leia o primeiro erro, confirme `apiBaseUrl` e valide novamente |
| build falha por TypeScript | API do Angular/TypeScript alterada ou dependência incompatível | Rode `npm ci`, use a versão de Node do projeto e corrija o primeiro erro do compilador |
| prerender registra `401 Unauthorized` ao consultar a API, mas o build termina com código 0 | rotas prerenderizadas chamam endpoints protegidos sem token durante a geração | Se `validate.ps1` retornar `VALIDATE: OK`, trate como ruído atual e não como falha de compilação; se o código for diferente de 0, corrija o primeiro erro do build |
| build falha por budget | bundle inicial acima de 2 MB ou estilo de componente acima de 25 kB | Não ignore o budget; remova peso/duplicação ou ajuste o limite somente com revisão técnica |
| `browser/index.html` ou `server/server.mjs` ausente | build incompleto/interrompido ou foi usado apenas outro comando | Feche builds concorrentes e rode `npm run build` por completo |
| rota com parâmetro retorna 404 após Ctrl+F5 no IIS | fallback SPA ausente | Confirme `frontend/public/web.config` no build e o módulo URL Rewrite no IIS |
| CSS parece reduzido em quase todas as telas | escala global intencional de 80% | É esperado `html.scaled`; `/login` permanece em 100%. Não confunda com zoom do navegador |

Avisos de budget não são iguais a erro: o pipeline prossegue apenas quando o processo termina com código 0 e o `validate.ps1` retorna `VALIDATE: OK`.

## 4. Backend .NET

### Desenvolvimento

```powershell
Set-Location .\backend\Central_BackEnd
dotnet restore
dotnet run
```

O perfil `http` inicia em `http://0.0.0.0:1009` com `ASPNETCORE_ENVIRONMENT=Development`. Acesse localamente por `http://localhost:1009`.

O `validate.ps1` executa `dotnet build --nologo` sem `-c Release`, portanto valida o build Debug. O deploy executa `dotnet publish -c Release`; assim, o validate é um gate de compilação, mas não prova os binários Release exatos. Se o package falhar, pare: ele é o gate real de geração do artefato publicado.

### Diagnóstico

| Sintoma | Causa provável | Solução |
|---|---|---|
| `SDK not found` ou projeto `net8.0` incompatível | SDK 8 ausente | Instale o SDK 8 e confirme `dotnet --list-sdks` |
| backend encerra ao iniciar com erro de JWT | `JWT_KEY` e `Jwt:Key` indisponíveis ao processo | Forneça a configuração por fonte segura; não registre o valor |
| backend encerra com tabela/columna ausente em Development + SQL | seeds de desenvolvimento consultam o schema antes de as tabelas existirem | Aplique as migrations no banco selecionado e reinicie |
| `address already in use` na 1009 | outro backend deste projeto está ativo | Identifique o processo pela linha de comando e encerre somente a instância antiga |
| `/swagger` retorna 404 | `SwaggerEnabled` efetivo está falso | Verifique `appsettings*.json` e `ASPNETCORE_SWAGGER_ENABLED`; reinicie/recicle o processo |
| rotas versionadas retornam 404 | versão/caminho incorreta | Use `/api/v1/...` ou envie `X-Api-Version: 1.0` |
| 500 ao fazer login | banco ausente, seed/consulta de login falhando ou configuração de token inconsistente | Corrija o banco/configuração e leia o stack no log; não repita login em massa |
| processo local funciona, IIS não | ambiente, string de conexão, permissões ou `web.config` diferentes | Compare apenas nomes de configuração e estrutura; não copie valores sensíveis entre ambientes |

### Divergência de configuração JWT

`Program.cs` aceita `JWT_KEY` com fallback para `Jwt:Key`, mas `AuthService.GerarJwt` lê `Jwt:Key` diretamente. Se apenas `JWT_KEY` existir, o processo pode iniciar e a emissão/validação do token pode falhar. A correção definitiva é alinhar o código a uma única fonte resolvida. Até a correção, disponibilize `Jwt:Key` ao processo por configuração protegida e nunca a versione.

## 5. SQL Server e InMemory

`Program.cs` escolhe o provider apenas no ambiente `Development`:

| `Database:UseSqlServer` | Provider | Persistência |
|---:|---|---|
| `false` | EF Core InMemory `CentralDev` | perde tudo ao encerrar o processo |
| `true` | SQL Server por `ConnectionStrings:DefaultConnection` | persiste no banco configurado |

Fora de `Development`, o backend usa SQL Server. Na baseline atual, `appsettings.Development.json` está configurado para `true`, portanto o dev usa SQL Homolog até a flag ser alterada.

### InMemory

Para forçar memória efêmera:

1. Altere `Database:UseSqlServer` para `false` em `appsettings.Development.json`.
2. Reinicie o backend.
3. Confirme no log/terminal que a aplicação iniciou com o provider em memória.

O seed de desenvolvimento cria dados estruturais e operadores de teste. Credenciais de teste não são reproduzidas neste guia; obtenha-as por canal interno aprovado.

Limitação: o provider InMemory não valida SQL Server, FKs, índices, colunas geradas, `OPENJSON` ou SQL específico. Uma tela funcionar em memória não prova que o banco real está correto.

### SQL Homolog

Para usar SQL Homolog:

1. Mantenha `Database:UseSqlServer` como `true`.
2. Garanta rota até `192.168.2.154` e acesso ao banco `dbBUSINESS_HML`.
3. Forneça a string de conexão por `user-secrets`/configuração local protegida; não a imprima.
4. Garanta que as migrations do commit atual já foram aplicadas.
5. Reinicie o backend após mudar provider ou schema.

### Sintomas

| Sintoma | Causa provável | Solução |
|---|---|---|
| dados desaparecem ao reiniciar | InMemory selecionado | troque para SQL somente quando quiser testar persistência real |
| timeout/login no SQL Server | rede, porta, autenticação, TLS/certificado ou banco indisponível | Teste rota e autenticação com ferramenta segura; confira mensagem do SqlClient |
| “Invalid object name” | migration não aplicada no banco selecionado | consulte `__EFMigrationsHistory`, aplique o script revisado e valide o schema |
| tela Development funciona, produção falha | schemas e migrations divergentes | compare histórico e estrutura do banco alvo; não copie dados entre bancos para “corrigir” |
| Google Sheets/Database Explorer falham mesmo em InMemory | integrações usam SQL/rede próprios, não o `AppDbContext` em memória | diagnostique cada conexão separadamente |
| Homolog foi alterado sem querer | provider SQL selecionado | pare o backend, confirme a flag e revise dados/timestamps; use o script de limpeza apenas com backup e aprovação |

## 6. Migrations EF Core

### Fatos confirmados

- O backend **não executa migrations no startup**; não há chamada a `Database.Migrate()`.
- O InMemory não suporta o fluxo de migration.
- Existe `AppDbContextDesignTimeFactory`, configurada para LocalDB e banco de design.
- Existem migrations em `backend/Central_BackEnd/Migrations` e scripts idempotentes em `backend/Central_BackEnd/Migrations/Sql`.
- `Migrations/Sql/AllMigrations.sql` está desatualizado na baseline: termina no modelo antigo e não inclui as migrations mais recentes. Não o trate como pacote completo.

### Sintomas, causas e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| `dotnet ef database update` mexe em LocalDB | factory de design usa `(localdb)\MSSQLLocalDB` | passe explicitamente a conexão do alvo ou aplique SQL revisado; nunca use a factory sem confirmar o banco |
| coluna/FK/índice ausente em homolog | migration não aplicada | gerar script do commit atual, revisar, executar e verificar schema/histórico |
| migration marcada no histórico, mas DDL ausente | execução parcial ou histórico inconsistente | conferir o schema real; não confiar apenas na mensagem do EF |
| migration “fantasma” no histórico | ID sem migration correspondente | snapshot e arquivos atuais são a referência; corrigir o histórico com DBA e plano aprovado |
| `dotnet ef` falha ao criar migration | CLI ausente/incompatível ou model snapshot inconsistente | usar CLI EF 8, restaurar projeto e corrigir o primeiro erro do modelo |
| migration falhou em cascata | mais de um caminho `CASCADE` para a mesma relação | revisar `DeleteBehavior` e SQL; SQL Server exige regra explícita compatível |
| produção está com schema do código anterior | deploy não aplica migration | interromper o fluxo funcional, aplicar migration antes do próximo publish e repetir smoke |

### Fluxo seguro

```powershell
Set-Location .\backend\Central_BackEnd
dotnet ef migrations script --idempotent --output "$env:TEMP\central-operacao-migrations.sql"
Pop-Location
```

Antes de executar o arquivo:

1. Faça backup do banco.
2. Leia o SQL gerado; confirme início e fim, histórico, tabelas e rollback operacional.
3. Execute com a ferramenta e a autenticação aprovadas para o banco alvo.
4. Confirme o resultado:

```sql
SELECT MigrationId
FROM __EFMigrationsHistory
ORDER BY MigrationId;
```

5. Teste as telas e APIs afetadas.
6. Guarde o script, o hash do commit e a evidência de execução conforme a política do DBA.

## 7. Autenticação, cookie e refresh

Fluxo confirmado no frontend e backend:

1. O access token e o usuário ficam **somente em memória**; recarregar a página perde ambos.
2. O refresh token fica no cookie HttpOnly `cc_refresh`; não deve aparecer em `localStorage` nem no corpo da resposta.
3. O interceptor aplica `withCredentials: true` a todas as requisições.
4. O interceptor exclui URLs que contenham `/auth/` do acréscimo do header Bearer.
5. Para uma API não-auth, um 401 dispara refresh single-flight e repete a requisição original uma vez.
6. O guard tenta refresh silencioso no carregamento da rota.
7. `POST /api/v1/auth/logout` exige Bearer, mas é excluído do header pelo interceptor. Com o comportamento atual, o logout pode receber 401; `AuthService.logout` engole o erro, limpa apenas o estado local e pode manter o cookie/refresh token ativo no servidor.

### Endpoints de autenticação

| Método | Rota | Autorização | Corpo/uso |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Não | `{ "usuario": "...", "senha": "...", "lembrarAcesso": true }` |
| POST | `/api/v1/auth/refresh` | Não; exige cookie `cc_refresh` | Front envia `{}`; resposta contém novo access token e usuário |
| POST | `/api/v1/auth/logout` | Bearer | corpo `{}`; somente uma chamada autenticada revoga e limpa cookies; o interceptor atual pode enviar sem Bearer |
| GET | `/api/v1/auth/me` | Bearer | sem corpo |

Propriedades atuais no código: `HttpOnly=true`, `SameSite=Strict`, `Secure=false`, `Path=/`; com “lembrar acesso”, há `MaxAge` de 4 horas. A configuração preservada no servidor pode alterar a duração efetiva.

### Sintomas, causas e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| login 400 | `usuario` ou `senha` vazio | revise o payload da tela; não registre o valor |
| login 401 | credencial inválida, usuário inativo ou bloqueio temporário | confirme provider/banco corretos; aguarde o lockout quando aplicável |
| login 429 | rate limit | aguarde a janela; não automatize tentativas repetidas |
| login 200, mas nenhum `Set-Cookie: cc_refresh` | resposta não chegou ao navegador, CORS bloqueou ou cookie foi descartado | inspecione Network, status CORS e atributos do cookie |
| logout redireciona, mas `/auth/logout` retorna 401 e o cookie permanece | o interceptor exclui `/auth/` do Bearer, embora o controller exija `[Authorize]` | registre o status sem copiar token; limpe os dados/cookies do site como mitigação local, trate o refresh token como potencialmente ativo e solicite correção do interceptor para revogação server-side |
| refresh sempre 401 | cookie ausente, expirado, revogado ou de origem incompatível | verifique `cc_refresh` em Storage/Network e teste `POST /api/v1/auth/refresh` no mesmo contexto |
| F5 volta ao login | access token foi perdido e o cookie não foi enviado | corrija CORS/origem/cookie antes de investigar o guard |
| cookie não aparece em `document.cookie` | ele é HttpOnly | isso é esperado; inspecione DevTools |
| muitas renovações simultâneas | várias requisições chegam com 401 juntas | o frontend usa single-flight; confirme que só a versão publicada contém o interceptor atual |
| access token inválido após a reciclagem do IIS | a chave JWT do processo mudou | mantenha a mesma chave protegida entre reciclagem/deploy ou force nova autenticação de forma controlada |
| `Set-Cookie` aparece sem o atributo `Secure` | o código usa `Secure=false` | trate como risco em transporte HTTP; migre para HTTPS somente após alinhar CORS, bindings e `Secure` |
| chave JWT funciona no startup, mas login falha | `Program.cs` aceita `JWT_KEY`, enquanto `AuthService` lê `Jwt:Key` | forneça a mesma configuração protegida ao processo; alinhe o código para uma única fonte antes de confiar no fluxo |
| cookie deixa de funcionar após HTTPS | `Secure=false` e/origem CORS atual não contemplate HTTPS | alinhe CORS, `Secure`, URL do frontend e binding IIS antes de migrar para HTTPS |

Ao investigar, nunca copie o conteúdo de `cc_refresh`, access token ou senha para o console. Registre apenas presença, atributos, origem e status HTTP.

## 8. CORS

A política `Angular` permite exatamente:

- `http://192.168.2.130:1010`
- `http://localhost:4200`
- `http://localhost:1010`

Ela permite headers e métodos e habilita credenciais. Não há wildcard.

| Sintoma | Causa provável | Solução |
|---|---|---|
| bloqueio CORS no console | origem não está na lista | use uma origem exata ou altere `Program.cs`, valide e publique o backend |
| login funciona, refresh falha | política/cookie não atravessa o navegador | confira `Access-Control-Allow-Credentials`, preflight e `withCredentials` |
| funciona em `localhost`, falha no IP | mistura de protocolo, host ou porta | compare a origem completa; portas diferentes geram outra origem |
| funciona com 4200, falha com 4201 | apenas 4200 está autorizada | não troque a porta informalmente; adicione a origem de forma revisada |
| cookies não funcionam com hostname novo | `SameSite=Strict` e política atual | teste a topologia planejada e ajuste código/configuração antes do deploy |

## 9. Database Explorer

### Configuração

O serviço lê, por prioridade de variável de ambiente, os nomes:

- `DB_EXPLORER_SERVIDOR`
- `DB_EXPLORER_PORTA`
- `DB_EXPLORER_BANCO`
- `DB_EXPLORER_USUARIO`
- `DB_EXPLORER_SENHA`
- `DB_EXPLORER_ENCRYPT`
- `DB_EXPLORER_TRUST`

A tela de configuração é somente leitura. O backend considera servidor, banco e usuário para dizer que está configurado, mas uma senha ausente só aparece como falha ao abrir a conexão. O timeout de conexão é 10 segundos.

Todos os endpoints `/api/v1/database/*` exigem Bearer. A senha é mascarada em `GET /api/v1/database/config`; `GET /api/v1/database/status` executa `SELECT 1` e pode retornar HTTP 200 com `conectado: false`.

### Sintomas, causas e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| 401 em qualquer tela do Database Explorer | sessão ausente/expirada | faça login e valide o fluxo do cookie; não é falha de SQL |
| 200 com `conectado: false` | timeout, autenticação, TLS, rota ou banco | use a mensagem retornada e teste do host do backend, não do navegador |
| “Conexão SQL Server não configurada” | servidor, banco ou usuário ausentes | configure os três no processo/IIS; a tela não grava configuração |
| senha mascarada, mas conexão recusada | `DB_EXPLORER_SENHA` ausente/incorreta no pool | forneça a variável por canal seguro e recicle `Suporte_Back` |
| timeout de 10 segundos | SQL Server indisponível, porta bloqueada ou DNS | valide rota/firewall a partir do servidor IIS |
| certificado TLS recusado | `Encrypt`/`TrustServerCertificate` incompatíveis | alinhe essas opções à política do SQL Server sem desabilitar segurança por solução permanente |
| dados antigos após alteração de schema | backend ainda ativo com estado anterior | não há cache de schema; reinicie/recicle e valide a conexão real |
| espera-se executar SQL digitado | não existe endpoint de execução livre | o módulo atual consulta metadados e o Criador apenas gera/copia SQL |

O helper `scripts/db/configure-db-explorer-password.ps1` deve ser auditado antes de uso operacional: a implementação atual pode imprimir o valor configurado e não deve ser tratada como canal seguro. Prefira configuração protegida no Application Pool e remova a saída do segredo do script em uma alteração futura.

## 10. Google Sheets e Acessos

`GoogleSheetsService`:

1. Exige `GoogleSheets:SpreadsheetId`.
2. Usa `GoogleSheets:ApiKey` quando não está vazia.
3. Se a API responde com erro, tenta fallback CSV público.
4. Usa `GoogleSheets:Range` apenas no caminho da API.
5. Mantém cache em memória por 10 minutos.
6. Mapeia as colunas A–P; a primeira linha é cabeçalho.

### Endpoints de Acessos

| Método | Rota | Autorização | Corpo/consulta |
|---|---|---|---|
| GET | `/api/v1/acessos` | Bearer | nenhum; retorna resumo sem credenciais |
| POST | `/api/v1/acessos/validar-senha` | Bearer | `{ "usuario": "...", "senha": "..." }` |
| POST | `/api/v1/acessos/visualizar?empresaId=N` | Bearer | query com ID e corpo `{ "senha": "..." }` quando a validação expirou |

### Sintomas, causas e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| HTTP 500 em `/api/v1/acessos` | `SpreadsheetId` ausente/placeholder | configure `GoogleSheets__SpreadsheetId` no processo por fonte protegida |
| HTTP 502 | API e fallback CSV falharam | valide egress HTTPS, DNS, proxy, ID e visibilidade da planilha |
| lista vazia | cabeçalho/linhas ausentes ou cache | confira A–P, aguarde/limpe cache reiniciando o backend e valide em Development |
| alteração da planilha não aparece | cache de 10 minutos | aguarde ou reinicie/recicle o backend; não edite a resposta via browser |
| API key inválida, mas lista funciona | fallback CSV entrou em ação | o fallback funcionou; verifique permissões e evite colocar a chave em logs |
| credenciais aparecem incompletas | células vazias, vírgula/quebra de linha ou posição alterada | compare A–P com o parser; não improvise coluna no banco |
| 401 em Acessos | Bearer ausente/expirado | corrija autenticação antes da planilha |
| 403 ao visualizar | validação de senha expirada ou incorreta | valide novamente e respeite rate limiting/lockout |
| 429 | muitas validações | aguarde a janela e não faça loop automático |

Configuração pela ASP.NET Core pode usar nomes hierárquicos com `__`, por exemplo `GoogleSheets__SpreadsheetId`; o valor real deve existir apenas no ambiente seguro.

## 11. JOTA e proxy RAG

O `JotaChatService` do frontend usa a URL relativa `/api/rag-proxy`, enquanto os demais serviços usam `environment.apiBaseUrl`. A rota ativa do backend é `POST /api/rag-proxy/chat`, com `[Authorize]`; os métodos de sessão do frontend não têm controller correspondente.

O `web.config` versionado do frontend contém somente o fallback SPA e não contém regra de reencaminhamento de `/api`. Portanto, no IIS, o JOTA depende de reverse proxy/ARR ou regra externa não versionada. Não presuma que a regra existe apenas porque o backend escuta na porta 1009.

O backend chama AnythingLLM e, por padrão, `AnythingLLM:EnableMockFallback` é `true` quando não há override. Em timeout, erro de conexão ou resposta não bem-sucedida, ele pode devolver uma resposta local simulada com HTTP 200. O widget não distingue essa resposta da resposta real; o comentário de “sem mockadas” no frontend não elimina o fallback do backend.

### Diagnóstico e mitigação

| Sintoma | Causa provável | Mitigação |
|---|---|---|
| JOTA retorna 404/405 ou HTML da SPA | regra ARR/reverse proxy ausente, incorreta ou não versionada | confirme a regra que encaminha `/api/rag-proxy/*` para `Suporte_Back:1009`; documente-a no inventário do IIS |
| JOTA retorna 401 | Bearer ausente, sessão expirada ou caminho relativo não chega ao controller | valide primeiro login/refresh e confirme a origem e o encaminhamento |
| JOTA retorna 200 com resposta genérica inesperada | fallback local do `RagProxyService` mascarou AnythingLLM indisponível | em ambiente controlado, defina `AnythingLLM__EnableMockFallback=false` no IIS e recicle o pool; nunca confunda fallback com prova de integração |
| timeout no JOTA | AnythingLLM inacessível ou timeout configurado | valide rota a partir do backend e revise `AnythingLLM:TimeoutSeconds` sem registrar chaves |
| métodos de sessão retornam 404 | wrappers do frontend existem, mas o backend só expõe `POST /chat` | não use esses métodos como diagnóstico do widget; a integração ativa é o chat |

Para confirmar o caminho no navegador, observe a URL final e a resposta de `POST /api/rag-proxy/chat`; não copie Bearer, chave ou conteúdo sensível para logs.

## 12. IIS e publicação

### Topologia confirmada

| Camada | Porta | Pasta física no servidor |
|---|---:|---|
| Frontend | 1010 | `C:\inetpub\wwwroot\Suporte_Front` |
| Backend | 1009 | `C:\inetpub\wwwroot\Suporte_Back` |

O deploy empacota em `deploy/backend` e `deploy/frontend`, mas publica o backend completo e somente `deploy/frontend/browser` no frontend.

### Comportamentos críticos

- `deploy.ps1` usa `npm run build` e `dotnet publish -c Release`, enquanto `validate.ps1` usa `dotnet build` Debug; o package Release é o gate do artefato final.
- O package local usa `robocopy /E`, que copia e atualiza, mas **não espelha nem limpa** arquivos antigos em `dist`, `publish_output` ou `deploy`.
- O `appsettings*.json` do servidor é excluído do mirror e preservado; se `appsettings.json` não existir, o script atual emite apenas um aviso e continua, sem falhar o publish.
- `web.config` **não** é excluído: o backend usa o arquivo gerado pelo `dotnet publish` e o frontend usa o fallback SPA de `frontend/public/web.config`.
- O backend cria `app_offline.htm` antes do mirror. Em falha, o arquivo pode permanecer para impedir início parcial; um rollback feito por cópia também pode deixá-lo.
- O frontend precisa do módulo IIS URL Rewrite para rotas SPA.
- O `web.config` versionado do backend atualmente habilita Swagger e stdout log; o servidor pode sobrescrever o arquivo no próximo publish.

### Sintomas, causas e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| backend mostra página `app_offline.htm` | mirror falhou ou publicação ficou parcial | não remova o arquivo antes de concluir o mirror; use o procedimento de lock/rollback |
| frontend 404 em rota com ID | URL Rewrite ausente ou `web.config` não publicado | restaure o build pelo fluxo de deploy e valide o módulo IIS |
| backend 500 só no IIS | `web.config`, appsettings preservado, pool, SQL ou ambiente | leia log, recicle e compare a estrutura de configuração sem copiar segredos |
| appsettings sumiu | incidente externo; o script deveria preservá-lo | interrompa o deploy, restaure config protegida e trate como incidente |
| aviso de `appsettings.json` ausente | o script atual apenas avisa e continua | trate o aviso como hard stop, restaure a configuração e só então repita o publish |
| arquivo obsoleto continua no IIS | package incremental `/E` preservou artefato antigo e o mirror o tratou como parte do pacote | feche processos, limpe somente saídas geradas, refaça package e valide os artefatos antes do publish |
| credencial fixa é reutilizada | fallback embutido no script ou `-SenhaRemota` vazio | rotacione a credencial antes do próximo deploy; forneça `Get-Credential`/secret manager e nunca registre o valor |
| rollback deixa backend offline | `app_offline.htm` foi excluído da cópia e permanece no destino | conclua e valide o mirror; remova o arquivo apenas depois de confirmar DLL/runtimeconfig e configuração |
| IIS servindo versão antiga | pool não reciclou, URL/endereço diferente ou cache do navegador | recicle, valide build/hash e faça recarregamento forçado sem alterar `BUILD_INFO` |
| 404 de rota API removida | backend publicado antigo ou frontend/código dessincronizado | compare o commit com `BUILD_INFO` e publique o pacote do HEAD esperado |
| stdout logs acumulam | `stdoutLogEnabled=true` no `web.config` atual | capture o necessário, desabilite no código/configuração e remova logs antigos com política aprovada |

## 13. Smoke test

O [`scripts/smoke.ps1`](../scripts/smoke.ps1) testa somente:

- `http://<servidor>:1010`
- `http://<servidor>:1009/swagger`

Parâmetros padrão: 5 tentativas, 3 segundos entre tentativas e timeout de 10 segundos por requisição. Uma resposta entre 200 e 399 conta como sucesso.

Limites reais:

- não faz login;
- não envia Bearer;
- não acessa `cc_refresh`;
- não chama `/api/v1/acessos/*` nem qualquer API de negócio;
- não valida migrations, SQL, Google Sheets ou Database Explorer;
- não confere o hash do `BUILD_INFO` no servidor;
- não garante que a página carregou o bundle esperado;
- com `-Local`, testa ainda as portas IIS 1010/1009, não `ng serve` na 4200.

| Resultado | Diagnóstico |
|---|---|
| frontend e Swagger 2xx/3xx | a disponibilidade básica passou; ainda faça QA funcional |
| frontend passa, Swagger falha | backend, binding 1009 ou configuração efetiva do Swagger |
| ambos falham | conectividade, bindings, pools, web.config ou IIS |
| smoke passa, tela autenticada falha | CORS, cookie, JWT ou API de negócio não cobertos pelo script |
| smoke falha após a publicação | aguarde 30–60 s, repita e então diagnostique IIS/logs |

Como o script depende de `/swagger`, uma política que desabilite Swagger torna o smoke incompatível. Nesse caso, crie um endpoint de verificação de saúde autorizado e adapte o script; não declare o pipeline verde apenas ignorando a falha.

## 14. Locking de arquivos

### Lock local

| Situação | Causa | Solução |
|---|---|---|
| build falha ao substituir DLL/JS | `dotnet run`, `ng serve` ou build anterior ainda aberto | encerre apenas processos cujo `CommandLine` aponte para este repositório |
| `node_modules` bloqueado no Windows | processo Node/editor/antivírus | feche o frontend, encerre o processo identificado e repita `npm ci` |
| `publish_output` bloqueado | backend em execução ou scanner | pare o backend local; aguarde o scanner; não apague a fonte |
| deploy incremental mantém arquivo obsoleto | `/E` não apaga saídas anteriores | com processos fechados, remova somente `dist`, `publish_output` e/ou `deploy` gerados e refaça build/package |

Para localizar sem matar indiscriminadamente processos:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -in @('dotnet.exe', 'node.exe') } |
  Select-Object ProcessId, Name, CommandLine
```

### Lock remoto da DLL

O script cria `app_offline.htm` e espera 3 segundos por padrão. O worker do IIS pode continuar segurando a DLL. `robocopy` código 11 é falha; o script trata qualquer código 8 ou maior como erro.

Procedimento:

1. Pare a tentativa de deploy; não remova `app_offline.htm`.
2. Aguarde 1–2 minutos pela reciclagem do worker.
3. Confirme que o pacote local ainda é o do `BUILD_INFO` esperado.
4. Repita a publicação sem rebuild e com backup, usando a mesma credencial segura.
5. Se a cópia concluir, confirme que `app_offline.htm` foi removido e recicle `Suporte_Back` se necessário.
6. Rode o smoke e o QA funcional.

Evite encerrar `w3wp.exe` manualmente. O `app_offline.htm` e a reciclagem do Application Pool são o mecanismo controlado.

## 15. Checklist de encerramento

Antes de considerar o incidente resolvido:

- [ ] `validate.ps1` está verde no commit atual; o package Release foi executado separadamente.
- [ ] Branch e hash Git conferem com `BUILD_INFO.txt`.
- [ ] Frontend e backend sobem nas portas esperadas.
- [ ] Login, access token em memória e refresh funcionam; o 401 conhecido de logout foi tratado, não ignorado.
- [ ] `cc_refresh` é HttpOnly, não aparece no armazenamento e a política `Secure` foi avaliada.
- [ ] CORS usa uma origem autorizada.
- [ ] Schema e `__EFMigrationsHistory` do banco alvo foram validados.
- [ ] Google Sheets, Database Explorer e JOTA foram testados quando fazem parte do fluxo; fallback do JOTA foi considerado.
- [ ] `appsettings*.json` do servidor permanecem intactos; qualquer aviso de ausência foi tratado como falha.
- [ ] `app_offline.htm` foi removido somente após mirror íntegro.
- [ ] Smoke automatizado passou.
- [ ] QA manual cobriu pelo menos uma API autenticada e uma tela de negócio.
- [ ] A credencial fixa foi rotacionada antes do próximo deploy; nova publicação usou `Get-Credential`/secret manager.
- [ ] Nenhum segredo foi adicionado a logs, documentação ou comandos.

## Arquivos relacionados

- [`10-DEPLOY.md`](./10-DEPLOY.md) — pipeline obrigatório, migrations, backup e rollback.
- [`02-ARQUITETURA.md`](./02-ARQUITETURA.md) — arquitetura, autenticação e controles de segurança.
- [`04-ESTRUTURA-DADOS.md`](./04-ESTRUTURA-DADOS.md) — entidades, tabelas, migrations e integrações.
- [`05-ENDPOINTS.md`](./05-ENDPOINTS.md) — contratos HTTP e autorização.
- [`07-SERVICES-BACKEND.md`](./07-SERVICES-BACKEND.md) — controllers, serviços e persistência.
- [`../backend/Central_BackEnd/Program.cs`](../backend/Central_BackEnd/Program.cs) — provedores, CORS, JWT e Swagger.
- [`../frontend/src/app/features/chat/jota-chat.service.ts`](../frontend/src/app/features/chat/jota-chat.service.ts) — URL relativa e operações do JOTA.
- [`../backend/Central_BackEnd/Controllers/RagProxyController.cs`](../backend/Central_BackEnd/Controllers/RagProxyController.cs) — rota autenticada do proxy RAG.
- [`../backend/Central_BackEnd/Services/RagProxyService.cs`](../backend/Central_BackEnd/Services/RagProxyService.cs) — AnythingLLM e fallback mock.
- [`../frontend/src/app/core/interceptors/auth.interceptor.ts`](../frontend/src/app/core/interceptors/auth.interceptor.ts) — Bearer, credenciais e refresh.
- [`../scripts/validate.ps1`](../scripts/validate.ps1) — gate de build.
- [`../scripts/smoke.ps1`](../scripts/smoke.ps1) — verificação de disponibilidade atual.
- [`../scripts/deploy/deploy.ps1`](../scripts/deploy/deploy.ps1) — package e publicação.
