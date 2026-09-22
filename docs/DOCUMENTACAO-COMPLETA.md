# Central de Operação — Documentação Completa

> Documentação abrangente do sistema interno **Central de Operação** (anteriormente
> "Central de Conhecimento") da JCA Soluções.
> Front-end e back-end, autenticação, integração com Google Sheets, banco de dados, deploy e melhorias sugeridas.

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Pré-requisitos de Infraestrutura](#2-pré-requisitos-de-infraestrutura)
3. [Arquitetura](#3-arquitetura)
   - 3.1. Backend (ASP.NET Core 8)
   - 3.2. Frontend (Angular 18 SSR)
4. [Autenticação JWT](#4-autenticação-jwt)
   - 4.1. Endpoints
   - 4.2. Fluxo de renovação no frontend
   - 4.3. Segurança dos tokens
5. Google Sheets + Banco de Dados + Database Explorer → [`integracoes-bd.md`](./integracoes-bd.md)
6. Módulo Implantação / Projetos (§6.5) → [`implantacao.md`](./implantacao.md)
7. Aplicação Frontend (módulos) → [`frontend-modulos.md`](./frontend-modulos.md)
8. [Deploy em IIS](#8-deploy-em-iiis)
9. [Segurança — Check-list](#9-segurança--check-list)
10. [Problemas já corrigidos](#10-problemas-já-corrigidos)
11. [Melhorias sugeridas (roadmap)](#11-melhorias-sugeridas-roadmap)
12. [Assistentes opencode (agents & skills)](#12-assistentes-opencode-agents--skills)

---
## 1. Visão Geral do Projeto

A **Central de Operação** é um portal interno que reúne ferramentas, documentação e
**acessos de empresas/planilha** para a equipe de suporte. Autenticado via senha, o usuário
pode consultar credenciais (TS, Banco, VPN, AnyDesk) cadastradas em uma planilha do Google Sheets.

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 18 (standalone, SSR) + Bootstrap 5 + Bootstrap Icons + ng-bootstrap 17 |
| Backend | ASP.NET Core 8 (Web API) |
| Banco de dados | SQL Server |
| Autenticação | JWT Bearer + Refresh Token rotativo |
| Integração | Google Sheets API (com fallback CSV) |
| Versão atual | **v0.7.0** (fase beta) |

### Política de versionamento

O sistema está em **fase beta**, com versão controlada em **fonte única**:

`frontend/src/app/shared/meta/app-version.ts`

- Exibida no rodapé do frontend e no dropdown do usuário (header) como `v0.7.0`.
- Espelhada em `package.json` / `package-lock.json` (mesmo número, sem o prefixo `v`).
- **Regra:** enquanto estiver em beta, a versão permanece **menor que 1.0** (`0.x.y`).
  Ao atingir estabilidade, elevar para `1.0.0` e seguir **SemVer** a partir daí.
- Para mudar a versão, alterar `app-version.ts` **e** `package.json` / `package-lock.json`.

### Política de branches e tags (monorepo único)

O repositório único (`JCASOLUCOES/CENTRALOPERACAO_DEPLOY`, sem submódulos —
não há `.gitmodules`) segue a convenção:

| Branch / Tag | Propósito | Estado atual |
|---|---|---|
| `main` | **Produção** — espelho do que está rodando no IIS 192.168.2.130. Recebe merges via PR de `developer` (com aprovação). Branch padrão no GitHub. | `8956c57` |
| `developer` | **Desenvolvimento** — onde o JCASOLUCOES mexe no dia-a-dia. Sem proteção. | `8956c57` |
| `sara` | Branch pessoal da Sara (baseada em `developer`). Sem proteção. | — |
| `samuel` | Branch pessoal do Samuel (baseada em `developer`). Sem proteção. | — |
| `projeto-implantacao` | Branch **futura** para o módulo IMPLANTAÇÃO/PROJETOS. | — |
| `v0.7.0`, `v0.8.0`, ... | **Tags** que marcam versões estáveis já em produção (substituem a ideia de "branch backup"). | — |

**Proteção recomendada de `main`** (configurar via `Settings → Branches → Add rule`):

- ☑ Require a pull request before merging (1 aprovação)
- ☑ Require conversation resolution before merging
- ☑ Require linear history
- ☐ Allow force pushes (deixe **desmarcado**)

**Como criar uma branch nova:**

O monorepo é único (sem submódulos), então o script `scripts/git/branch-todos.ps1`
na raiz cria a branch com 1 comando.

```bash
git checkout developer && git pull
git checkout -b sara && git push -u origin sara
```

**Como versionar uma release:**

```bash
# Depois de merge em main:
git checkout main && git pull
git tag -a v0.X.Y -m "v0.X.Y - descricao"
git push origin v0.X.Y
```

### Estrutura de pastas (monorepo `CENTRALOPERACAO_DEPLOY`)

A raiz do monorepo é `Central-Conhecimento-developer/`, que abriga os dois
subprojetos como pastas do próprio repo (sem submódulos).
**Branch padrão: `main`** (= produção = espelho do IIS 130);
**branch de dev: `developer`**.

```
Central-Conhecimento-developer/        <- raiz do monorepo (repo CENTRALOPERACAO_DEPLOY)
├─ frontend/                            <- código Angular 18 (pasta do monorepo)
│                                       <- direto na pasta
├─ backend/                             <- API .NET (pasta do monorepo)
│  └─ Central_BackEnd/                  <- projeto .NET (namespace Central_BackEnd)
├─ scripts/deploy/deploy.ps1            <- build + publicação no IIS
└─ docs/                                <- documentação unificada
```

> `frontend/` e `backend/` são **pastas do monorepo** (não há `.gitmodules`).
> O deploy é feito por `scripts/deploy/deploy.ps1`, que publica direto no
> IIS do servidor.

---

## 2. Pré-requisitos de Infraestrutura

**Backend (IIS em 192.168.2.130):**
- .NET 8 Hosting Bundle instalado.
- Site/App pool com identidade com permissão de escrita (se aplicável).
- URL publicada: `http://192.168.2.130:1009`

**Frontend (Angular):**
- Node.js 18+ e npm.
- Build com Angular SSR (`npm run build`).

**Banco de dados (SQL Server):**
- Instância/credenciais não versionadas (config real só no `appsettings.json` do servidor).
- Banco de produção usado pela API: tabelas `RefreshTokens`, `AuditoriaAcessos` + legados
  `TBOPERADOR`, `TBFUNCIONARIO`, `TBFUNCAO` (criadas/manuais).

**Chave da Google Sheets API:**
- Criada no Google Cloud Console.
- API "Google Sheets API" habilitada.
- Planilha compartilhada como "Qualquer pessoa com o link pode ver".

---

## 3. Arquitetura

### 3.1. Backend (ASP.NET Core 8)

Projeto Web API na pasta `backend/Central_BackEnd/`
(namespace `Central_BackEnd`), no monorepo `CENTRALOPERACAO_DEPLOY`.

**Principais serviços:**
- `AuthService` — gera/renova JWT, rotaciona refresh tokens (SHA-256), compara senhas em tempo constante.
- `GoogleSheetsService` — lê a planilha via API key, com fallback CSV (cache de 10 min).
- `PasswordValidationService` — validação de senha mestre com cache em memória (janela de 5 min) e lockout.
- `BruteForceGuard` — bloqueio temporário após N tentativas inválidas (anti força bruta).
- `SegurancaHelper` — comparação de senha em tempo constante (mitigação enquanto o banco legado usa texto puro).

**Controllers:**
- `AuthController` — login/refresh/logout/me (refresh token em cookie HttpOnly).
- `AcessosController` — listagem e credenciais das empresas (com rate limiting).

**Configuração (`Program.cs`):**
- **Versionamento de API** (`Asp.Versioning.Mvc`): endpoints usam prefixo `/api/v1/`. Suporta
  versionamento por segmento de URL (`/api/v1/...`) e por header `X-Api-Version`.
- Autenticação JWT (Issuer `CentralConhecimento` / Audience `CentralConhecimentoFront`); chave da
  `JWT_KEY` (variável de ambiente) com fallback em `Jwt:Key` (config real do servidor).
- Validação JWT endurecida: `RequireExpirationTime` + `ValidAlgorithms = HS256`.
- **Rate limiting**: política `login` (5/min por IP) e `validacao` (5/min por usuário), rejeição `429`.
- CORS: origens `http://192.168.2.130:1010`, `http://localhost:4200` e `http://localhost:1010`
  + `AllowCredentials()` (necessário para o cookie de refresh cross-origin).
- EF Core SQL Server, injeção de `IHttpClientFactory`, **Swagger** (habilitado/desabilitado via `SwaggerEnabled` em `appsettings.json`, padrão `false` em produção, `true` em `Development`; sobrescritável via variável de ambiente `SwaggerEnabled=true`) em `/swagger`.
- ⚠️ **Constraint permanente de LINQ-to-SQL (fato operacional confirmado em 2026-09-14, causa raiz capturada no stdout log do IIS):**
  o banco `dbBUSINESS_HML` roda em **compatibility level abaixo de 130**, logo o EF traduz
  `colecao.Contains(x)` via `OPENJSON(... '$')` e quebra com **SqlException 102** (sintaxe
  que exige level >= 130 — quebrava até com zero linhas). **Regra: NUNCA usar `Contains`
  sobre coleção local em LINQ-to-SQL neste banco.** Usar **subquery correlata** (padrão
  `ProjetoService` / `AgendaService.ListarEventosAsync`) ou **`Intersect` em memória**.
  Pontos corrigidos sem migration: (1) listar eventos (`ListarEventosAsync` virou query única
  com subquery correlata de `OperadorNome`); (2) validar `ParticipantesIds` no criar/atualizar
  via `Intersect` em memória; (3) `ColunaKanbanService.ReordenarAsync` filtrando em memória.
  Alternativa de DBA (fora do código): `ALTER DATABASE ... SET COMPATIBILITY_LEVEL`.
  Detalhe em `PLANO-IMPLEMENTACAO-FASES.md` § "FIX 500 `GET /agenda/eventos`".

> ⚠️ O `appsettings.json` do repositório está **sanitizado** (placeholders), seguindo a regra de
> "nunca versionar segredos". A config real (banco/JWT/Google) fica guardada **apenas no servidor**
> (`C:\inetpub\wwwroot\Suporte_Back\appsettings*.json`), preservada pelo `scripts/deploy/deploy.ps1`.
> O formato atual do arquivo:
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
  }
}
```

### 3.2. Frontend (Angular 18 SSR)

Localizado em `frontend/`. Componentes standalone, SCSS BEM e tema escuro via `[data-theme="dark"]`.

**Lazy loading e performance:**
- Todas as rotas do wiki usam `loadComponent` com **dynamic imports** (lazy loading).
- Bundle inicial reduzido de **1,51 MB** para **~669 kB**.
- **Bootstrap SCSS parcial**: importação sob demanda dos módulos SCSS do Bootstrap (em vez do CSS
  completo). CSS de estilos reduzido de **246 kB** para **151 kB**. Inclui obrigatoriamente
  `bootstrap/scss/modal` + `bootstrap/scss/transitions`: o NgbModal injeta
  `<ngb-modal-backdrop>` + `<ngb-modal-window>` no fim do `<body>` usando classes Bootstrap — sem esse
  CSS o modal perde `position:fixed`/overlay e vira um bloco estático no rodapé da página (BUG 6,
  seção 10). Obs.: no Bootstrap 5.3.x não existe `_backdrop.scss` — o `.modal-backdrop` já é definido
  dentro de `_modal.scss`.

**Variáveis de ambiente** (`src/environments/`):
```ts
// environment.ts (desenvolvimento)
export const environment = {
  production: false,
  useMockAuth: false,
  apiBaseUrl: 'http://localhost:1009/api'
};

// environment.prod.ts (produção)
export const environment = {
  production: true,
  useMockAuth: false,
  apiBaseUrl: 'http://192.168.2.130:1009/api'
};
```

**Escala global 80% (desde 19/09/2026):**
- `html.scaled { font-size: 80%; }` em `src/styles.scss` — 1rem = 12.8px; tudo em `rem` escala proporcionalmente.
- `AppComponent` alterna `.scaled` no `<html>` via `NavigationEnd`; a rota `/login` fica em 100%.
- Convenção: dimensões estruturais em `rem`; bordas/shadows/hairlines/scrollbars/breakpoints `@media` permanecem em `px`; `login.component.scss` isento.
- Path alias `@env/*` → `src/environments/*` (além de `@core`, `@features`, `@shared`, `@layout`).

---

## 4. Autenticação JWT

Login por **`OPERADOR_ID` ou `EMAIL`** na tabela `TBOPERADOR`. Usuário com `SE_ATIVO = 'N'` é bloqueado.
`SE_ADMIN` (bool) controla perfil de administrador.

> ⚠️ Nota de segurança: a tabela `TBOPERADOR` usa senha em texto puro (sem alteração de banco por ora).
> Mitigação aplicada no código: comparação **em tempo constante** (`SegurancaHelper`) + **lockout**
> (`BruteForceGuard`) + **rate limiting**. A migração para BCrypt/Argon2 fica no roadmap (seção 11).

### 4.1. Endpoints

> **Versionamento**: todos os endpoints usam prefixo `/api/v1/` (segmento de URL ou header
> `X-Api-Version`).

| Método | Rota | Descrição | Autenticado |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Autentica e retorna os tokens (access token no body, refresh em cookie) | Não |
| POST | `/api/v1/auth/refresh` | Renova tokens via cookie `cc_refresh` (rotativo) e devolve os dados do usuário (`user`) | Não |
| POST | `/api/v1/auth/logout` | Revoga o refresh token do cookie e encerra a sessão | Sim |
| GET | `/api/v1/auth/me` | Dados do usuário da sessão | Sim |

**Exemplo de login (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiraEmSegundos": 14400,
  "user": {
    "id": "FULANO",
    "nome": "Fulano da Silva",
    "email": "fulano.silva@jcasolucoes.com.br",
    "perfil": "Administrador"
  }
}
```
> O `refreshToken` **não** vem no corpo — vai no `Set-Cookie` (`cc_refresh`, HttpOnly).

### 4.2. Fluxo de renovação no frontend

O interceptor `auth.interceptor.ts`:
1. Anexa `Authorization: Bearer <accessToken>` (exceto em `*/auth/*`).
2. Todas as requisições usam `withCredentials: true` (cookie cross-origin front :1010 → back :1009).
3. Ao receber **401**, aciona `refreshTokenSingleFlight()` — chamadas simultâneas aguardam a mesma renovação.
4. Sucesso → `restaurarSessao(response)` grava o novo access token e **repopula o usuário** (o
   `POST /auth/refresh` já devolve o objeto `user`) antes de repetir a requisição original com o token novo.
5. Falha → `logout()` limpa memória; o redirecionamento para `/login` é conduzido pelo guard/navegação.

**Sessão e reload:**
- O access token e o usuário ficam **somente em memória**; o refresh token vive no **cookie
  `cc_refresh` (HttpOnly)** no backend.
- No reload (**F5**) o access token se perde → o `auth.guard.ts` tenta **refresh silencioso** via cookie.
  Se o cookie for válido, a sessão é restaurada **com o usuário incluído** — o perfil do header volta a
  renderizar; senão redireciona para `/login`.
- Com **"Lembrar meu acesso"** marcado (padrão), o cookie tem `MaxAge` de 4h (persiste entre
  reaberturas do navegador, dentro das 4h); desmarcado, é cookie de sessão (perde ao fechar o navegador).
- **Destino pós-login — Central Executiva (`resolverDestino`, `login.component.ts:86-92`):**
  após o `login()` (e no `constructor` quando já autenticado), o `LoginComponent` resolve o destino —
  `returnUrl` diferente de `'/'`/vazio (deep-link, ex. `/implantacao/kanban`) é **sempre respeitado**;
  senão, `perfil === 'Administrador'` → **`/executivo`**, usuário comum → **`/`** (Home).

**Restauração automática do usuário após F5/expiração (BUG 5 fix):**
- O backend já devolve o objeto `user` no corpo do `POST /api/v1/auth/refresh`
  (`AuthService.RefreshAsync` retorna o DTO `TokenResponse` com `User` preenchido). Antes, o front
  **descartava esse campo**: após o F5, o guard renovava o token com sucesso, mas apenas gravava o
  accessToken — o `BehaviorSubject` `currentUser$` permanecia `null` e o perfil nunca era renderizado.
- Agora o método privado `restaurarSessao(response)` (`auth.service.ts`), chamado no tap do
  `refreshTokenSingleFlight()`, grava o accessToken e restaura o usuário oficial via
  `tokenStorage.setUsuario()` + `authUserSubject.next(usuario)`.
- **Salvaguarda**: se `response.user` vier vazio, o usuário é reconstruído a partir das claims do próprio
  JWT emitido (`decodificarToken()`: `sub`/`name`/`email`/`perfil`).
- Cobertura: **F5 (guard)**, **retry pós-401 no interceptor** e **verificação periódica a cada 5 min** —
  todos passam pelo mesmo single-flight e repopulam o usuário.
- A interface `RefreshTokenResponse` (`auth.model.ts`) ganhou o campo opcional `user?: Usuario`.
- O endpoint `GET /api/v1/auth/me` existe no backend (`AuthController.cs`), mas **não precisou ser usado**
  nesta correção. Nenhuma mudança visual no dropdown e nenhuma mudança no backend.

**Verificação periódica da sessão (BUG 2 fix):**
- O `AuthService` executa `iniciarVerificacaoPeriodica()` ao persistir a sessão (login/refresh).
- A cada **5 minutos**, `verificarSessao()` checa se o access token ainda é válido via `isAuthenticated()`.
  - Se inválido → `logout(true)` com redirect para `/login`.
  - Se válido → dispara `refreshTokenSingleFlight()` para antecipar a renovação.
- O logout por expiração grava a flag `sessaoExpirada` no `sessionStorage`. O `LoginComponent` lê
  essa flag e exibe a mensagem **"Sua sessão expirou. Por favor, faça login novamente."**.
- `pararVerificacaoPeriodica()` é chamada no `logout()` e ao destruir o serviço.

### 4.3. Segurança dos tokens

- **Access token**: 4h (240 min), JWT assinado (HS256), **somente em memória** no front.
- **Refresh token**: 4h, **rotativo** e armazenado com **hash SHA-256** no banco; no navegador fica em
  **cookie HttpOnly (`cc_refresh`, SameSite=Strict)** — nunca no `localStorage`.
- **Verificação periódica** (a cada 5 min): valida proativamente a sessão e antecipa o refresh;
  se o access token expirar, faz logout automático com mensagem "Sua sessão expirou".
- Reuso de refresh token apenas revoga o token reutilizado (detecção de cadeia inteira: roadmap).
- **Após 4h o usuário desloga**: o access token expira, a renovação falha (o refresh token também
  expirou em 4h) e o sistema encerra a sessão, exigindo novo login.
- **Proteção contra força bruta**:
  - Rate limiting: `login` → 5 tentativas/min por IP; `validar-senha`/`visualizar` → 5/min por usuário.
  - Lockout (`BruteForceGuard`): 5 falhas em 5 min → bloqueio de 15 min.
- **JWT endurecido**: `RequireExpirationTime` + `ValidAlgorithms = HS256`; chave via env `JWT_KEY`
  (fallback `Jwt:Key` do servidor).
- **Senhas nunca são persistidas**. O logout (`POST /api/v1/auth/logout`, `[Authorize]`) revoga o refresh
   token e remove os cookies `cc_refresh`/`cc_lembrar`.

---


---

## 8. Deploy em IIS

O deploy é automatizado pelo script **`scripts/deploy/deploy.ps1`** na raiz do
monorepo (gera `deploy/backend` e `deploy/frontend`), e o passo a passo completo
está em **`docs/DEPLOY.md`**. Resumo:

1. `powershell -ExecutionPolicy Bypass -File .\scripts\deploy\deploy.ps1` — roda `npm run build`
   (frontend) + `dotnet publish -c Release` (backend) e empacota em `deploy/`.
   O script calcula a raiz subindo 3 níveis e guarda `$ErrorActionPreference`
   em torno dos dois builds (falha explícita via `$LASTEXITCODE`).
2. **Credenciais interativas**: o script exibe o servidor e o usuário padrão
   (`JCASRV-SUP (padrao)`), pede confirmação/alteração do usuário e em seguida
   a senha (`Read-Host -AsSecureString`). Sem senha hard-coded.
3. **Backup automático** do IIS atual em `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`
   (ex.: `20260912-163535` no deploy de 12/09/2026 — remoção do módulo Equipes,
   front `http://192.168.2.130:1010` e swagger `http://192.168.2.130:1009/swagger` = 200).
4. **Backend**: cria `app_offline.htm`, copia binários com exclusão explícita
   de `appsettings*.json` (mensagem `Excluindo do deploy: appsettings*.json
   (preservados no servidor)`), remove `app_offline.htm`. Após a cópia, exibe
   `appsettings.json do servidor mantido intacto` ou `AVISO: appsettings.json
   nao encontrado` (caso não exista no destino).
5. **Frontend**: envia `deploy\frontend\browser` para `Suporte_Front` (inclui
   `web.config` com SPA fallback do URL Rewrite — copiado de
   `frontend/public/web.config` no build; evita 404 no Ctrl+F5 de rotas com
   path param, ver `DEPLOY.md`).
6. Aponte o site do IIS do frontend (porta **1010**) para `deploy\frontend\browser`.
7. Aponte o site do IIS do backend (porta **1009**) para `deploy\backend`.
8. Recicle o Application Pool do backend após copiar os binários.
9. Teste: frontend `http://192.168.2.130:1010`, Swagger `http://192.168.2.130:1009/swagger`.

No opencode, digitar **"deploy limpo"** aciona a skill `deploy-limpo`, que
executa o script e confere a saída automaticamente.

---

## 9. Segurança — Check-list

- [ ] **Hash de senhas**: atualizar `TBOPERADOR` para usar BCrypt/Argon2 (hoje é texto puro; mitigação
      no código: comparação em tempo constante + lockout).
- [x] **Refresh token em cookie HttpOnly** (`cc_refresh`, SameSite=Strict) — não fica no `localStorage`;
      access token + usuário somente em memória.
- [x] **Refresh token** já é hasheado (SHA-256) e rotativo.
- [x] **Rate limiting**: `login` (5/min por IP) e `validar-senha`/`visualizar` (5/min por usuário).
- [x] **Lockout** após 5 tentativas inválidas em 5 min (bloqueio de 15 min) — `BruteForceGuard`.
- [x] **Comparação de senha em tempo constante** (`SegurancaHelper`) em login e validação da senha mestre.
- [x] **JWT endurecido**: `RequireExpirationTime` + `ValidAlgorithms = HS256`; chave via env `JWT_KEY`.
- [x] CORS restrita às origens da aplicação + `AllowCredentials()` (cookie cross-origin).
- [x] **Nunca versionar segredos**: `scripts/deploy/deploy.ps1` sem senha hard-coded; `appsettings*.json` ignorados no
      `.gitignore` raiz; configuração real só no servidor.
- [ ] **HTTPS obrigatório** em produção (`UseHttpsRedirection`) e `Secure` no cookie.
- [ ] Logs de auditoria de login, logout e refresh (hoje só a visualização de acessos é auditada).

---

## 10. Problemas já corrigidos

1. **GSM flag `SE_ADMIN`** como `bool` (antes tratado como string).
2. `.IsUnicode(false)` e **max lengths** nos modelos (evita estouro em `nvarchar`).
3. Cadeia de conexão e handler JSON de erros.
4. Modelo de dados do ferramenta-detalhe simplificado (removidas propriedades inexistentes).
5. **Guard** tenta refresh silencioso antes de redirecionar: o access token (memória) se perde no reload,
   então o guard tenta renovar via cookie `cc_refresh`; sem cookie válido, redireciona para `/login`.
6. **Logout** via `Router.navigate`.
7. **Links externos** usam `window.open()`.
8. **Modal de acessos**: `abrirDetalhe()` → modal de senha → fecha → abre modal de detalhe via `@ViewChild`.
9. Modelo `EmpresaAcesso` alinhado às 16 colunas reais da planilha.
10. `GoogleSheetsService` reescrito com `IHttpClientFactory` (removido pacote `Google.Apis.Sheets.v4`), com fallback CSV.
11. **Persistência de sessão**: `TokenStorageService` reescrito para **memória + cookie HttpOnly** —
    o refresh token fica no cookie `cc_refresh` do backend (4h com "Lembrar acesso"; sessão sem),
    e access token/usuário ficam só em memória no front. O logout revoga o refresh token no backend
    (`POST /api/v1/auth/logout`, `[Authorize]`).
12. **Redesign `.tdh`** das 4 páginas de trilhas wiki: `trilhas`, `trilha-sql`, `trilha-rede` e `trilha-infra` (índice de seções, tabelas de status HTTP, acordeão, cards de diagnóstico e comandos).
13. **Base de cursos**: corrigidos `handle` de 7 canais YouTube com 404 falso (`@bosontreinamentos`, `@desenvolvedorio`, `@fullcycle`, `@MicrosoftReactor`, `@FilipeDeschamps`, `@devmedia.oficial`, `@EmbarcaderoDoBrasil`) e removidos 4 cursos com canal inexistente (`yt-academia-delphi`, `yt-canal-delphi-brasil`, `yt-delphi-pratica`, `yt-sql-com-guima` — também removido da trilha banco-de-dados).
14. **Central de Utilidades** adicionada à Visão ADM (favoritos, últimos utilizados, busca, categorias, grade/lista e contador de acessos).
15. **Validade de 4h**: `Jwt:AccessTokenMinutes` = **240** e `Jwt:RefreshTokenHours` = **4** no backend (`appsettings.json` + `AuthService`). Após 4h o access token expira, a renovação falha (o refresh token também expirou em 4h) e o sistema desloga, exigindo novo login.
16. **Auditoria de segurança (11/08/2026) — hardening**:
    - Refresh token movido para **cookie HttpOnly `cc_refresh`** (rotativo; `MaxAge=4h` com "Lembrar acesso", senão cookie de sessão). Access token + usuário agora ficam **somente em memória** no front (`TokenStorageService` simplificado; `localStorage` eliminado). Reload restaura a sessão via **refresh silencioso** no guard.
    - **Rate limiting** (`.NET 8`): `login` 5/min por IP; `validar-senha`/`visualizar` 5/min por usuário (`429` na rejeição).
    - **Lockout** (`Services/BruteForceGuard.cs`): 5 falhas em 5 min → bloqueio de 15 min por operador.
    - **Comparação de senha em tempo constante** (`Services/SegurancaHelper.cs`) — mitiga o texto puro do `TBOPERADOR` sem alterar o banco.
    - **JWT**: chave da env `JWT_KEY` (fallback `Jwt:Key`); `RequireExpirationTime` + `ValidAlgorithms=HS256`; claim `role` (`ClaimTypes.Role`) emitida.
    - **CORS**: `AllowCredentials()` + interceptor com `withCredentials: true` (cookie cross-origin 1010↔1009).
    - **Erros**: removido vazamento de `ex.Message` no `AcessosController` (mensagens genéricas; detalhe só em log).
    - **`logout`**: agora `[Authorize]`, revoga o token do cookie e remove `cc_refresh`/`cc_lembrar`.
    - **Segredos/deploy**: senha do servidor **removida** do `scripts/deploy/deploy.ps1` (agora default `JCASRV-SUP` + `Read-Host -AsSecureString`); o script exibe servidor e usuário com `(padrao)`, pede confirmação e senha separadamente; feedback explícito de preservação de `appsettings*.json` (`mantido intacto` / `AVISO: nao encontrado`); novo **`.gitignore` na raiz** ignorando `deploy/` e `appsettings*.json`; criado `appsettings.sample.json`.
17. **Versionamento de API (v0.7.1+)**:
    - Pacote `Asp.Versioning.Mvc` adicionado ao backend. Todos os endpoints agora usam prefixo `/api/v1/` (ex.: `/api/v1/auth/login`, `/api/v1/acessos`). Suporta segmento de URL e header `X-Api-Version`.
18. **Swagger toggle**: chave `SwaggerEnabled` no `appsettings.json` controla habilitação do Swagger (padrão `false` em produção, `true` em `Development`). Sobrescrevível via variável de ambiente `SwaggerEnabled=true`.
19. **Lazy loading completo**: todas as rotas do wiki agora usam `loadComponent` com dynamic imports. Bundle inicial reduzido de 1,51 MB para ~669 kB.
20. **Bootstrap SCSS parcial**: substituído import do CSS completo do Bootstrap por módulos SCSS sob demanda (incluindo `bootstrap/scss/dropdown` e `bootstrap/scss/navbar`, adicionados posteriormente para corrigir o menu de perfil). CSS de estilos reduzido de 246 kB para 151 kB.
21. **Código morto removido**: `RefreshRequest.cs`, `Funcionario.cs`, `Funcao.cs`, `HomeController.cs` e `Views/Home/` deletados. `AppDbContext.cs` limpo.
22. **TrackBy**: adicionado `trackBy` em todos os 62 laços `*ngFor` em 17 componentes.
23. **Utilitário de busca compartilhado**: criado `src/app/shared/utils/texto.helper.ts` com `normalizar()`, `buscarSingleTerm()`, `buscarMultiTerm()`, `buscarComSinonimos()`. Refatorados 5 serviços/componentes.
24. **`html lang`**: alterado de `en` para `pt-BR` no `index.html`.
25. **BUG 1 — Copiar fraseologia**: `copiarTexto()` em `fraseologia.component.ts` agora usa `.catch()` com fallback via `document.execCommand('copy')` (cria `textarea` temporário, seleciona e copia). Padrão alinhado com `modelo-chamados.component.ts` e `trilha-sql.component.ts`.
26. **BUG 2 — Menu "Meu Perfil" desaparece / logout falha** (25/08/2026):
    - **Causa**: o access token expirava silenciosamente (a cada 4h) sem que o usuário percebesse; o menu "Meu Perfil" sumia e o botão de logout falhava porque o token era inválido.
    - **Correção em `auth.service.ts`**: adicionada **verificação periódica da sessão** (`iniciarVerificacaoPeriodica()`) — a cada 5 minutos, valida o access token via `isAuthenticated()` e tenta `refreshTokenSingleFlight()`. Se a sessão expirar, faz `logout(true)` com redirect para `/login`.
    - **Correção em `login.component.ts`**: o componente lê a flag `sessaoExpirada` do `sessionStorage` e exibe a mensagem **"Sua sessão expirou. Por favor, faça login novamente."** quando o usuário é redirecionado por timeout.
27. **BUG 3 — Texto da senha ia para barra de pesquisa** (25/08/2026):
    - **Causa**: ao clicar em um card de empresa no Acessos, o foco do `input` de busca no Header capturava o texto digitado no modal de senha (conflito de z-index: painel de busca `z-index: 1080` vs modal ng-bootstrap `~1050`).
    - **Correção**: criado `BuscaService` (`src/app/core/services/busca.service.ts`) — serviço `providedIn: 'root'` que controla o estado aberto/fechado da busca via `BehaviorSubject<boolean>` e expõe `buscaAberta$` + `fecharBusca()`.
    - O **Header** agora consome `buscaService.buscaAberta$` em vez de manter propriedade local `buscaAberta`.
    - O **AcessosComponent** chama `buscaService.fecharBusca()` antes de `modalService.open(this.senhaRef, ...)`, garantindo que o painel de busca seja fechado e o foco do input removido antes do modal de senha aparecer.
    - **Resultado**: o z-index de conflito é eliminado porque o painel de busca já está fechado quando o modal abre.
28. **BUG 4 — Menu de perfil do usuário (dropdown) com visual corrompido** (25/08/2026):
    - **Causa raiz**: o módulo `bootstrap/scss/dropdown` não estava importado no `styles.scss`. Sem ele, o `.dropdown-menu` do Bootstrap perdia propriedades essenciais (`list-style: none`, `position: absolute`, `background`, `border`, `box-shadow`). Resultado: bullets visíveis, menu espalhado e conteúdo sobreposto.
    - **Correção em `styles.scss`**: adicionados os imports `@import 'bootstrap/scss/dropdown'` e `@import 'bootstrap/scss/navbar'`, que estavam ausentes na importação sob demanda dos módulos SCSS.
    - **Correção em `header.component.html`**: reestruturado o dropdown com convenção BEM (`user-nav__*`). O `<ul>` foi substituído por `<div>`, e os itens são `<button>` diretos (sem `<li>` interno), eliminando a semântica de lista que gerava os bullets.
    - **Correção em `header.component.scss`**: reescrito o CSS do dropdown com BEM específico (`.user-nav__trigger`, `.user-nav__menu`, `.user-nav__item`, etc.), aplicando manualmente os estilos que o módulo Bootstrap SCSS deveria fornecer.
29. **BUG 5 — Perfil do usuário (header) desaparecia após F5 em rota interna** (25/08/2026):
    - **Causa raiz**: o `TokenStorageService` é **somente memória** (token e usuário zerados ao recarregar). Após o F5, o `authGuard` fazia o refresh silencioso com sucesso, MAS o front **descartava o objeto `user` que o backend já retorna em `POST /auth/refresh`** (`AuthService.RefreshAsync` devolve `TokenResponse` com `User`) — armazenava apenas o accessToken. O `BehaviorSubject` `currentUser$` permanecia `null` e o perfil nunca era renderizado.
    - **Correção em `auth.model.ts`**: interface `RefreshTokenResponse` ganhou o campo opcional `user?: Usuario`.
    - **Correção em `auth.service.ts`**: novo método privado **`restaurarSessao(response)`**, que grava o accessToken e restaura o usuário oficial via `tokenStorage.setUsuario()` + `authUserSubject.next(usuario)`. **Salvaguarda**: se `response.user` vier vazio, reconstrói o usuário a partir das claims do próprio JWT (`decodificarToken()`: `sub`/`name`/`email`/`perfil`). O `refreshTokenSingleFlight()` agora chama `restaurarSessao(response)` no tap — cobrindo o **F5 (guard)**, o **retry pós-401 no interceptor** e a **verificação periódica de 5 min**.
    - **Preservado da correção anterior**: header segue com `ChangeDetectionStrategy.OnPush` + assinatura explícita de `currentUser$` com `markForCheck()`. Nenhuma mudança visual no dropdown; **nenhuma mudança no backend** nesta tarefa (o endpoint `GET /auth/me` não precisou ser usado).
30. **BUG 6 — Modal "Validação de Acesso" aparecia no rodapé da página** (25/08/2026):
    - **Sintoma**: na tela "Acessos das Empresas", ao clicar em "Visualizar Acessos", o formulário
      "Validação de Acesso" aparecia como um bloco grande no rodapé da página (empurrando o footer/
      gerando scroll), em vez de modal centralizado.
    - **Causa raiz**: com o **Bootstrap SCSS parcial** (`styles.scss`, apenas módulos utilizados),
      faltavam os imports `bootstrap/scss/modal` e `bootstrap/scss/transitions`. O NgbModal injeta
      `<ngb-modal-backdrop>` + `<ngb-modal-window>` no fim do `<body>` usando classes Bootstrap — sem
      esse CSS os elementos ficavam sem `position:fixed`/overlay e fluíam como blocos estáticos no fim
      da página. O componente estava correto (`ng-template` + `NgbModal.open`, mesmo padrão de Cursos).
      Obs.: no Bootstrap 5.3.x (`bootstrap ^5.3.8`) não existe `_backdrop.scss` — o `.modal-backdrop`
      já é definido dentro de `_modal.scss`.
    - **Correção 1 em `styles.scss`**: adicionados `@import 'bootstrap/scss/transitions'` e
      `@import 'bootstrap/scss/modal'` na seção "Componentes utilizados" (com comentário explicando) +
      regra global `.modal-content { background: var(--surface-main); color: var(--text-color);
      border: 1px solid var(--border-color); }` para alinhar o contêiner do modal ao tema claro/escuro.
    - **Correção 2 em `acessos.component.ts` (robustez)**: novo método privado `abrirSenhaModal()` que
      garante **instância única** do modal de senha (`fecharSenhaModalPendente()` faz dismiss com razão
      `'troca-empresa'` antes de abrir) e registra cleanup via `ref.result.then(limpar, limpar)`;
      `abrirDetalhe()` e o caminho de erro de `abrirModalDetalhe()` agora usam `abrirSenhaModal()`; o
      `ngOnDestroy()` também faz dismiss do modal pendente (antes um modal aberto sobrevivia à troca
      de rota/logout). Sem mudança no template HTML nem na lógica de validação.
    - **Efeito colateral positivo**: o modal da tela Cursos (mesmo mecanismo NgbModal) também voltou a
      funcionar corretamente com este fix de CSS.
31. **BUG 7 — Fluxo da "Jornada de Cobrança" desatualizado no FAQ/Glossário** (25/08/2026):
    - **Sintoma**: em Ferramentas > FAQ/Glossário > Capítulo 1 Conceitos Gerais ("O que é uma Jornada
      de Cobrança?"), o fluxograma publicado mostrava uma sequência antiga de 10 etapas — com
      "Distribuição da carteira", "Cadastro do devedor/títulos" e "Emissão de boleto" figurando como
      etapas da jornada (o boleto como etapa obrigatória), o que não reflete o ciclo real no Actyon.
    - **Causa**: material informativo desatualizado em relação à operação (conteúdo publicado errado).
    - **Correção em `faq.component.html`** (apenas conteúdo; sem mudanças de CSS ou lógica): fluxo
      reescrito como **sequência única cronológica de 14 etapas** — Carteira → Importação/Integração →
      Processamento e Validação → Dados do Devedor → Dados dos Títulos → Regras e Estratégias → Filas →
      Acionamento/Contato → Negociação → Acordo → Formalização do Pagamento → Pagamento → Baixa
      Financeira → Encerramento. Cada caixa recebeu nota descritiva (classe `gl-fluxo__nota`);
      a definição foi ajustada para deixar claro o fluxo único cronológico desde a entrada da carteira
      no Actyon; "Emissão de boleto" virou "Formalização do Pagamento", com o boleto citado apenas como
      exemplo de meio/documento, não obrigatório.
    - **Escopo**: nenhuma outra página afetada (sem mudanças de CSS nem de lógica).

### Builds atuais
- Backend: `dotnet build` → 0 erros (apenas warnings de nullable pré-existentes).
- Frontend: `npx tsc --noEmit` → 0 erros; `npm run build` OK (só budget warnings).

---

## 11. Melhorias sugeridas (roadmap)

- [ ] Exibir credenciais de **AnyDesk** no modal de detalhe (col O).
- [ ] Exibir **Observações** (col P) no modal.
- [ ] Tratamento especial de linhas "ACESSO SOMENTE VIA ANYDESK".
- [ ] Indicar **badge TS** nos cards quando a col B (TS flag) estiver presente.
- [ ] Mapear corretamente a col B para uma flag booleana em vez de texto.
- [ ] Migrar `TBOPERADOR` para hash de senha (BCrypt/Argon2).
- [ ] Habilitar HTTPS no IIS (`UseHttpsRedirection` + flag `Secure` no cookie `cc_refresh`).
- [ ] Detecção de reuso do refresh token (revogar a cadeia inteira do usuário).
- [ ] `POST /api/v1/auth/forgot-password` (redefinição de senha via e-mail).
- [ ] Auditoria de login/logout/refresh (hoje só a visualização de acessos é auditada).
- [ ] Migrar os dados de acessos do Google Sheets para banco de dados (remover dependência da planilha/API key).

---

## 12. Assistentes opencode (agents & skills)

O projeto usa o [opencode](https://opencode.ai) como assistente de desenvolvimento.
Agentes são assistentes especializados (prompt + permissões próprios); skills são
pacotes de instruções reutilizáveis carregados automaticamente quando relevantes.

### 12.1. Skills existentes

| Skill | Local | Quando dispara |
|---|---|---|
| `deploy-limpo` | `.opencode/skills/deploy-limpo/SKILL.md` | Ao pedir "deploy limpo"/"gerar deploy"/"publicar o sistema" — roda `scripts/deploy/deploy.ps1` e publica no IIS |
| `subir-interno` | `.opencode/skills/subir-interno/SKILL.md` | Ao pedir "subir interno"/"subir local"/"rodar local" — sobe backend (`dotnet run`, porta 1009) e frontend (`npm start`, porta 4200) para testes locais |
| `frontend-design` | `.agents/skills/frontend-design/SKILL.md` | Diretrizes de design visual para UI (fonte: `anthropics/skills`, ver `skills-lock.json`) |

### 12.2. Agents criados (`.opencode/agents/`)

| Agent | Modo | Papel | Acesso |
|---|---|---|---|
| `security-auditor` | subagent | Auditoria de segurança (JWT/tokens, EF/SQL, authz, segredos, erros, dependências) | só leitura + `webfetch` |
| `dotnet-engineer` | subagent | Implementação no backend ASP.NET Core 8 (`backend/Central_BackEnd/`) | edita + `dotnet build` |
| `angular-engineer` | subagent | Frontend Angular 18 (standalone + SSR), aplicando a skill `frontend-design` | edita + `npm/ng` + skill |
| `docs-writer` | subagent | Mantém `README.md` e `docs/*.md` sincronizados com o código | edita só `.md` |
| `content-editor` | subagent | Mantém o acervo do wiki (`*.data.ts`: cursos, ferramentas, fraseologias...) com validação de links | edita só `*.data.ts` + `webfetch` |

> **`sheet-migrator`** (migração Google Sheets → banco): **em stand-by** — será criado
> quando a migração for iniciada.

### 12.3. Como usar

- **Skills**: pedir em linguagem natural (ex.: "deploy limpo") — a skill é carregada automaticamente.
- **Agentes embutidos**: `Tab` alterna Build ↔ Plan; subagentes embutidos `general`/`explore`/`scout`.
- **Agentes do projeto**: invocar com `@` (ex.: `@security-auditor`, `@dotnet-engineer`,
  `@angular-engineer`, `@docs-writer`, `@content-editor`), ou deixar que o opencode os
  relate automaticamente quando a descrição encaixa na tarefa.
- **Criar novos**: arquivos Markdown em `.opencode/agents/<nome>.md` (frontmatter
  `description` + `mode` + `permission`) ou `opencode agent create`.
