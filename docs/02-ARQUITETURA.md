---
title: "Arquitetura vigente da Central de Operação"
description: "Arquitetura Angular SSR e ASP.NET Core, integrações, API, autenticação, CORS, IIS e limites de segurança."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# 02 — Arquitetura vigente

> Este documento descreve a arquitetura vigente, com validade em 2026-09-25, baseada no snapshot curado do working tree de 2026-09-24. A visão funcional está em [`01-VISAO-GERAL.md`](./01-VISAO-GERAL.md).
>
> A descrição é arquitetural e não representa execução de build, testes, QA, deploy ou smoke.

## Busca rápida (Ctrl+F)

Use termos como `Angular`, `SSR`, `ASP.NET`, `SQL Server`, `Google Sheets`, `AnythingLLM`, `/api/v1`, `cc_refresh`, `CORS`, `IIS` e `segurança` para localizar este documento.

## 1. Escopo e topologia

A implantação atual possui:

- **uma aplicação frontend Angular 18**, standalone, com SSR e prerender;
- **um backend ASP.NET Core 8**, expondo uma API REST versionada e um proxy RAG sem versão;
- SQL Server como persistência principal e fonte do Database Explorer;
- Google Sheets como fonte do módulo de Acessos;
- AnythingLLM como destino do proxy RAG.

Fluxo de alto nível:

```text
Navegador
   |
   | HTTP :1010
   v
IIS — saída browser do Angular, prerender e fallback SPA
   |
   | HTTP :1009, Bearer + cookie de refresh
   v
ASP.NET Core — um único backend
   |----> SQL Server operacional (EF Core)
   |----> SQL Server do Database Explorer (configuração própria)
   |----> Google Sheets (Acessos)
   `----> AnythingLLM (proxy RAG)
```

A divisão em quatro webapps não está implementada. Ela é somente o plano registrado em [`ARQUITETURA-MULTI-WEBAPP.md`](./ARQUITETURA-MULTI-WEBAPP.md).

## 2. Componentes e pastas reais

```text
frontend/
├── angular.json
├── package.json
├── server.ts
├── prerender-routes.txt
├── public/
│   └── web.config
└── src/
    ├── main.ts
    ├── main.server.ts
    ├── environments/
    │   ├── environment.ts
    │   └── environment.prod.ts
    └── app/
        ├── app.config.ts
        ├── app.config.server.ts
        ├── app.routes.ts
        ├── features.routes.ts
        ├── core/
        ├── features/
        ├── layout/
        └── shared/

backend/Central_BackEnd/
├── Program.cs
├── Central_BackEnd.csproj
├── Controllers/
├── Services/
├── Models/
├── Data/
├── Dtos/
├── Migrations/
├── Exceptions/
├── Properties/
└── appsettings*.json
```

Papéis dos diretórios:

- `frontend/src/app/features`: telas e serviços de domínio.
- `frontend/src/app/core`: autenticação, guards, interceptor, storage de token e serviços globais.
- `frontend/src/app/layout`: shell autenticado principal.
- `frontend/src/app/shared`: componentes e configuração transversal.
- `backend/Central_BackEnd/Controllers`: contrato HTTP e autorização por endpoint.
- `backend/Central_BackEnd/Services`: regras de negócio e integrações.
- `backend/Central_BackEnd/Models` e `Data`: modelo EF Core e tabelas.
- `backend/Central_BackEnd/Dtos`: contratos de entrada e saída.
- `backend/Central_BackEnd/Migrations`: evolução do modelo SQL.

## 3. Frontend Angular

### Bootstrap e renderização

- `src/main.ts` usa `bootstrapApplication` para iniciar o `AppComponent` standalone.
- `src/main.server.ts` reutiliza a configuração de browser com `provideServerRendering`.
- `app.config.ts` registra Router, hydration, animações, `HttpClient` com `fetch` e o interceptor de autenticação.
- `angular.json` define SSR, prerender e uma lista explícita em `prerender-routes.txt`.
- `server.ts` usa Express e `CommonEngine` para execução SSR.

A compilação SSR gera `browser/` e `server/server.mjs`. Entretanto, o deploy para IIS publica somente a pasta `browser`. Portanto, o projeto é **SSR-capable e prerenderizado**, mas o site IIS rastreado não executa um processo Node SSR.

### Rotas e composição

- `app.routes.ts` cria os shells público, principal e administrativo.
- `features.routes.ts` contém as rotas do shell principal.
- `implantacao.routes.ts` e `database.routes.ts` usam `loadChildren`.
- A maioria das rotas dos módulos usa `loadComponent`; `admin.routes.ts` ainda importa diretamente os componentes de Kanban, tarefas e projetos de Implantação.
- `/login` é público; o shell principal usa `authGuard`; `/admin` usa `authGuard` e `adminGuard`.
- A rota curinga redireciona para `/`.
- `authGuard` e `adminGuard` são principalmente proteções de navegação no cliente; no SSR, ambos retornam `true` para permitir a renderização. A proteção real depende do backend.
- O JOTA é incluído no `MainLayout` como widget, sem uma página `/chat`.

### Sessão no cliente

- `TokenStorageService` mantém access token e usuário somente em memória.
- `authInterceptor` envia cookies, anexa `Authorization: Bearer` e executa refresh single-flight após `401`.
- O frontend tenta restaurar a sessão no startup por `/auth/refresh`.
- Enquanto há sessão ativa, o frontend verifica o access token a cada cinco minutos e rotaciona o refresh token.
- Logout local e no servidor limpam o estado em memória; o cookie é apagado pelo backend.

### Regras de apresentação

- `html.scaled` reduz a raiz tipográfica para 80% em todas as telas, exceto `/login`.
- A lista de projetos usa cards e espaçamento compactos.
- Componentes devem continuar standalone, lazy e compatíveis com browser, hydration e SSR.

## 4. Backend ASP.NET Core

`Program.cs` concentra composição, autenticação, autorização, versionamento, CORS, rate limiting e pipeline HTTP.

- Controllers API são registrados com `AddControllers`.
- EF Core é registrado por `AppDbContext`.
- Em Development, `Database:UseSqlServer` escolhe SQL Server ou InMemory.
- Fora de Development, o backend usa SQL Server.
- JWT Bearer valida issuer, audience, assinatura, algoritmo, lifetime e expiração.
- `UseRateLimiter`, `UseCors`, `UseAuthentication` e `UseAuthorization` precedem `MapControllers`.
- Os controllers validam o token e as roles declaradas, mas não há middleware universal que reconsulte `SeAtivo` a cada requisição; a condição do operador é verificada em login, refresh, `me` e em alguns fluxos de serviço, não uniformemente em todos os endpoints.
- Em ambiente não Development existe handler global de exceção, resposta JSON genérica e HSTS.
- Swagger é condicionado pela flag `SwaggerEnabled`; a variável IIS `ASPNETCORE_SWAGGER_ENABLED` tem outro nome e não corresponde automaticamente à chave lida.

## 5. Versionamento e superfície HTTP

### Versionamento

O backend registra API Versioning com as seguintes regras:

- a versão padrão é `1.0`;
- a URL pública usada pelo frontend é `/api/v1`;
- a versão também pode ser informada pelo header `X-Api-Version`;
- `AssumeDefaultVersionWhenUnspecified` permite que uma requisição sem versão seja interpretada como `1.0` quando a rota aplicável atende a esse padrão.

A exceção explícita é `RagProxyController`: ele usa `[Route("api/rag-proxy")]`, não recebe `ApiVersion` e expõe a rota sem `/v1`.

### Rotas por módulo

| Módulo | Prefixo canônico | Autorização geral |
|---|---|---|
| Autenticação | `/api/v1/auth` | Login e refresh sem `[Authorize]`; logout e me autenticados |
| Acessos | `/api/v1/acessos` | Operador autenticado |
| Agenda | `/api/v1/agenda` | Operador autenticado |
| Database Explorer | `/api/v1/database` | Operador autenticado |
| Implantação | `/api/v1/implantacao/projetos`, `/api/v1/implantacao/tarefas`, `/api/v1/implantacao/colunas-kanban`, `/api/v1/implantacao/tipos-projeto` | Leitura autenticada; escrita de tipos e colunas restrita a `Administrador`; projetos e tarefas usam as regras de negócio do módulo |
| Dashboard | `/api/v1/implantacao/dashboard` | Operador autenticado |
| Dashboard administrativo | `/api/v1/admin/dashboard` | Role `Administrador` |
| AnythingLLM | `/api/rag-proxy` | Operador autenticado |

### `/api/v1/auth/*`

| Método e rota | Corpo | Autorização | Comportamento |
|---|---|---|---|
| `POST /api/v1/auth/login` | JSON `{ "usuario": string, "senha": string, "lembrarAcesso": boolean }`; `lembrarAcesso` pode ser omitido e assume `false` quando ausente | Pública | Valida o operador, cria access token e refresh token, grava `cc_refresh` e devolve `accessToken`, `expiraEmSegundos` e `user`; o JSON inclui `refreshToken: ""` |
| `POST /api/v1/auth/refresh` | Sem corpo obrigatório; o frontend envia `{}` | Pública, mas exige o cookie `cc_refresh` | Revoga o token recebido, cria access e refresh tokens, substitui o cookie e devolve o mesmo formato de sessão; o JSON inclui `refreshToken: ""` |
| `POST /api/v1/auth/logout` | Sem corpo obrigatório | Bearer válido | Revoga o refresh token atual, apaga os cookies e retorna `204` |
| `GET /api/v1/auth/me` | Sem corpo | Bearer válido | Devolve o usuário oficial associado ao token |

Em login e refresh, o JSON transporta `refreshToken: ""`; o valor bruto permanece somente no cookie HttpOnly. O cookie de lembrança `cc_lembrar` guarda apenas a preferência de persistência; ele não contém o refresh token.

### `/api/v1/acessos/*`

| Método e rota | Corpo ou query | Autorização | Comportamento |
|---|---|---|---|
| `GET /api/v1/acessos` | Sem corpo | Bearer válido | Lista somente o resumo das empresas obtido do Google Sheets |
| `POST /api/v1/acessos/validar-senha` | JSON `{ "usuario": string, "senha": string }` | Bearer válido | Valida a senha do operador autenticado; `usuario` é obrigatório, mas não escolhe outra conta |
| `POST /api/v1/acessos/visualizar?empresaId={id}` | JSON `{ "senha": string }` quando ainda não há validação recente | Bearer válido | Revalida a senha se necessário, retorna o detalhe da empresa e registra auditoria |

A validação de senha é cacheada por cinco minutos. O campo `usuario` do primeiro endpoint não é usado para trocar a identidade do token; a identidade vem do JWT.

## 6. Autenticação e tokens

### Access token

- É um JWT HMAC SHA-256, validado por issuer, audience, assinatura, algoritmo, lifetime e expiração.
- Os claims carregam subject, role, nome, email, perfil, `jti` e dados da função quando disponíveis.
- O tempo configurado para o access token é `Jwt:AccessTokenMinutes=240`, isto é, quatro horas.
- O frontend o mantém em uma propriedade privada de `TokenStorageService`, portanto não o grava em `localStorage` nem em `sessionStorage`.

### Refresh token rotativo

- O valor é aleatório, tem 64 bytes de entropia e é armazenado no backend apenas como hash SHA-256.
- Cada token recebe `Jwt:RefreshTokenHours=4`, ou seja, quatro horas desde sua emissão.
- O refresh marca o token anterior como revogado e grava `SubstituidoPor` com o hash do novo token.
- A rotação atual não é atômica: não há transação nem atualização condicional explícita que impeça duas requisições concorrentes de usarem o mesmo token antes da revogação.
- O controller grava o novo valor em `cc_refresh`; o JSON retornado ao frontend não contém o segredo.
- `LembrarAcesso=true` define `MaxAge` de quatro horas para `cc_refresh`; `cc_lembrar` é acrescentado sem `MaxAge` e permanece um cookie de sessão. Sem essa opção, o cookie de refresh também é de sessão do navegador; a validade do token no servidor continua sendo de quatro horas.
- O frontend restaura a sessão por refresh no startup, após `401` e na verificação periódica a cada cinco minutos. Como cada refresh emite outro token de quatro horas, a sessão ativa tem renovação deslizante.

### Cookie e transporte

`cc_refresh` é criado com `HttpOnly=true`, `SameSite=Strict`, `Path=/` e `Secure=false`. `cc_lembrar`, quando presente, usa `HttpOnly=false` e armazena somente a preferência `1`.

O interceptor envia `withCredentials=true` para permitir o cookie cross-origin entre os sites configurados. Como `Secure=false` e as URLs de ambiente são HTTP, o cookie não depende de HTTPS para ser aceito; essa é uma limitação de transporte, não uma recomendação de configuração.

## 7. Integrações de dados

### SQL Server operacional

O `AppDbContext` cobre operadores, funções, tokens de refresh, auditoria de acessos, clientes, projetos, etapas, tarefas, agenda e auditoria de implantação. Em Development, `Database:UseSqlServer=true` seleciona a connection string de homologação; `false` seleciona EF Core InMemory. Fora de Development, o provider é SQL Server.

### Database Explorer

O módulo Database possui uma conexão separada, lida por `DatabaseConnectionService`. A precedência é:

1. variáveis `DB_EXPLORER_*`;
2. seção `DatabaseExplorer` da configuração;
3. configuração vazia; nesse caso, o serviço informa que a conexão não está configurada.

Os endpoints atuais cobrem status, informação, tabelas, colunas, índices, relacionamentos, grafo, busca de colunas, stored procedures, gatilhos, dependências, análise de procedure, construção de consulta, comparação de schemas e comparação de corpos de procedures. Eles não recebem uma instrução SQL arbitrária para execução.

### Google Sheets

`GoogleSheetsService` é a fonte do módulo de Acessos:

- tenta a API do Google Sheets quando há chave configurada;
- usa a exportação CSV como fallback quando a API não está disponível ou não há chave;
- interpreta a planilha como lista de empresas e dados de acesso;
- mantém cache em memória por dez minutos.

A chave, o identificador da planilha e o conteúdo sensível da planilha não pertencem a este documento.

### AnythingLLM

O backend recebe `POST /api/rag-proxy/chat` com `message`, `workspaceId`, `mode` e `sessionId` opcional. `RagProxyService` encaminha a requisição ao endpoint `/chat` da base configurada de AnythingLLM, envia a chave apenas no backend e aplica timeout configurado. Embora o arquivo de ambiente do frontend tenha um bloco `anythingllm`, sua chave de API não é usada nesse fluxo; o proxy do backend realiza a chamada externa.

O `RagProxyService` usa `EnableMockFallback` com default de código `true`; o ambiente local também habilita `AnythingLLM:EnableMockFallback=true`. Quando a chamada não pode ser concluída e o fallback está ativo, o serviço devolve uma resposta mock local, em vez de propagar a falha. Esse fallback é comportamento atual do código e deve ser levado em conta ao avaliar a integração.

O `JotaChatService` do frontend usa o caminho relativo `/api/rag-proxy`; os demais serviços usam `environment.apiBaseUrl`. O `web.config` rastreado contém somente o fallback SPA e não mostra uma regra de proxy para `/api`. Uma eventual regra de reencaminhamento configurada diretamente no IIS não está versionada neste repositório, portanto não é presumida aqui. O controller implementa somente `POST /chat`; não existem endpoints backend de sessões.

## 8. CORS, IIS e publicação

### CORS

A policy `Angular` permite explicitamente:

- `http://192.168.2.130:1010`;
- `http://localhost:4200`;
- `http://localhost:1010`.

Ela permite qualquer header e método, mas habilita `AllowCredentials`. Não há wildcard de origem. Alterações de origem exigem atualizar a policy e o contrato de deploy.

### IIS e SSR

- O backend usa `http://0.0.0.0:1009` no perfil de execução e expõe Swagger sob `/swagger` quando `SwaggerEnabled` está habilitado.
- O frontend de desenvolvimento usa `http://localhost:4200`.
- O frontend de produção é publicado em `Suporte_Front` na porta `1010`.
- `frontend/public/web.config` requer URL Rewrite e reescreve URLs Angular para `/index.html` quando não há arquivo ou diretório.
- O deploy copia `browser/` para o site IIS; o `server/server.mjs` é verificado no pacote, mas não é publicado como processo Node no site.
- O backend é publicado em `Suporte_Back` na porta `1009`; `app_offline.htm` é usado durante a substituição dos arquivos.
- O mirror de publicação exclui `appsettings*.json`, preservando a configuração do servidor.

HSTS é habilitado fora de Development, mas as URLs de frontend, API e cookie registradas são HTTP. A coexistência entre HSTS e HTTP deve ser tratada como limitação de implantação, não como garantia de transporte seguro.

## 9. Controles e limites de segurança

### Controles presentes

- Guards Angular protegem o shell principal e a área administrativa; `[Authorize]` no backend é a fronteira de segurança.
- JWT valida assinatura, issuer, audience, algoritmo e expiração.
- O refresh token é rotativo, revogável e armazenado como hash.
- A policy de login limita requisições por IP: cinco por minuto fora de Development e cinquenta em Development.
- A policy de validação limita por usuário autenticado ou IP: cinquenta por minuto fora de Development e cem em Development.
- A policy de leitura limita a cem por minuto por usuário autenticado ou IP.
- `BruteForceGuard` bloqueia a chave por quinze minutos após cinco falhas dentro de uma janela de cinco minutos.
- Acessos exige revalidação, limita a sessão de validação a cinco minutos e audita a visualização.
- Comparação de schemas tem limites de upload de 5 MB e 20 MB.
- Respostas de produção usam handler global e mensagens genéricas para erros não tratados.

### Limites que não devem ser ocultados

- `cc_refresh` está com `Secure=false`; qualquer tráfego HTTP pode expor a sessão à interceptação de rede.
- A validação inicial do JWT aceita `JWT_KEY` ou `Jwt:Key`, mas a emissão em `AuthService` lê `Jwt:Key` diretamente; disponibilizar apenas a variável de ambiente pode deixar a emissão de token inconsistente.
- O comparador de senhas usa SHA-256 direto, sem salt e sem algoritmo adaptativo como Argon2, bcrypt ou PBKDF2.
- O bloqueio de tentativas e o cache de validação são estado em memória do processo; não são armazenamento distribuído.
- Todos os endpoints do Database Explorer exigem autenticação, mas não exigem role `Administrador`; respostas de procedures e triggers podem incluir o corpo completo do objeto.
- A auditoria de Acessos registra falhas no log, mas a falha de auditoria não impede a resposta ao operador.
- O guard estrito de `/admin` é do frontend; os controllers de projetos e tarefas têm `[Authorize]` sem role `Administrador`, enquanto escritas de tipos/colunas e o dashboard administrativo têm a restrição de role.
- O proxy RAG não possui policy específica de rate limiting; seu fallback local pode mascarar indisponibilidade do AnythingLLM.
- `AllowedHosts` está configurado como `*` nos arquivos versionados.
- `SwaggerEnabled` está `true` nos arquivos versionados; a configuração efetiva do servidor pode ser diferente porque os `appsettings*.json` são preservados no deploy.
- O `web.config` rastreado não define proxy de API; o encaminhamento relativo do JOTA depende de configuração IIS não visível no repositório.

A avaliação de risco deve comparar esses limites com a política interna antes de expor o sistema a redes diferentes da rede operacional.

