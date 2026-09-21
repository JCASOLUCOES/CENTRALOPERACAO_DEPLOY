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
5. [Integração com Google Sheets](#5-integração-com-google-sheets)
   - 5.1. Estrutura da planilha
   - 5.2. Serviço de leitura e fallback CSV
   - 5.3. Endpoints de Acessos
   - 5.4. Validação de senha e auditoria
6. [Banco de Dados (SQL Server)](#6-banco-de-dados-sql-server)
7. [Aplicação Frontend (módulos)](#7-aplicação-frontend-módulos)
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

## 5. Integração com Google Sheets

### 5.1. Estrutura da planilha

A planilha tem **16 colunas (A–P)**:

| Col | Campo | Exemplo |
|---|---|---|
| A | EMPRESA | MEIRELES |
| B | TS flag | `ACESSO SOMENTE VIA ANYDESK` |
| C | TS IP | `10.0.0.5` |
| D | TS USUARIO/SENHA | `suporte / 1234` |
| E | BANCO IP | `10.0.0.9` |
| F | BANCO USUARIO/SENHA | `sa / 1234` |
| G | VPN | `SIM`/`NÃO` |
| H | VPN NOME | `CLIENTE_VPN` |
| I | VPN GATEWAY:PORTA | `brcpu01:443` |
| J | VPN USUARIO/SENHA | `user / pass` |
| K | BANCO | `dbCLIENTE` |
| L | VERSAO COB | `1.2.3` |
| M | REDE | `192.168.1.0/24` |
| N | ACESSO ACTYON WEB | `https://...` |
| O | ANYDESK | `id / senha` |
| P | OBSE | Observações |

**Convenções:**
- Credenciais no formato `usuario / senha` em uma única célula (algumas multilinha).
- Grupos MEIRELES/ENEL/TIM compartilham o mesmo padrão de VPN.
- Linhas especiais (WS, GESTART) marcadas com "ACESSO SOMENTE VIA ANYDESK" na col B.

### 5.2. Serviço de leitura e fallback CSV

O `GoogleSheetsService`:
1. Tenta a **API key** (configurada em `appsettings.json`).
2. Se falhar, faz **fallback CSV** via endpoint `gviz/tq` da planilha.
3. Parser CSV próprio que trata campos cercados por aspas e quebras de linha.
4. **Cache em memória por 10 minutos**.

### 5.3. Endpoints de Acessos

| Método | Rota | Descrição | Autenticado |
|---|---|---|---|
| GET | `/api/v1/acessos` | Lista as empresas (resumo `EmpresaResumo`, **sem senhas**) | Sim |
| POST | `/api/v1/acessos/validar-senha` | Valida a senha mestre (`PasswordValidationResponse`) | Sim |
| POST | `/api/v1/acessos/visualizar?empresaId=N` | Retorna as credenciais da empresa (`EmpresaDetalheResponse`; exige senha mestre e grava auditoria) | Sim |

O `AcessosController.MapearParaDetalhe` transforma as linhas em blocos de credenciais
`TS`, `Banco`, `VPN`, além de `VersaoCob`, `AnyDesk` e `Observacoes`, usando o modelo
`EmpresaDetalheResponse`. A auditoria é registrada em `AuditoriaAcessos` a cada visualização.

### 5.4. Validação de senha e auditoria

- `PasswordValidationService` usa um `ConcurrentDictionary` com janela de **5 minutos** para evitar
  re-validar a mesma senha repetidamente.
- A senha é comparada em **tempo constante** (`SegurancaHelper`) e o endpoint está protegido por
  **rate limiting** (`5/min por usuário`) + **lockout** (`BruteForceGuard`, 5 falhas/5 min → 15 min).
- Toda ação relevante é registrada na tabela `AuditoriaAcessos`.

---

## 6. Banco de Dados (SQL Server)

Tabelas do sistema (criadas manualmente no banco `dbBUSINESS_HML`, mapeadas pelas entidades
`RefreshToken` e `AuditoriaAcesso` do backend):

### `RefreshTokens`
```sql
CREATE TABLE RefreshTokens (
    Id INT IDENTITY PRIMARY KEY,
    OperadorId NVARCHAR(15) NOT NULL,
    TokenHash NVARCHAR(500) NOT NULL,
    ExpiraEm DATETIME2 NOT NULL,
    CriadoEm DATETIME2 NOT NULL,
    Revogado BIT NOT NULL DEFAULT 0,
    SubstituidoPor NVARCHAR(500) NULL
);
```

### `AuditoriaAcessos`
```sql
CREATE TABLE AuditoriaAcessos (
    Id INT IDENTITY PRIMARY KEY,
    Usuario NVARCHAR(50) NOT NULL,
    Empresa NVARCHAR(200) NULL,
    TipoInformacao NVARCHAR(50) NULL,
    DataAcesso DATETIME2 NOT NULL,
    HoraAcesso TIME NULL,
    EnderecoIP NVARCHAR(50) NULL,
    Navegador NVARCHAR(200) NULL
);
```

### Tabelas do legado consultadas
- `TBOPERADOR` — usuários (`OPERADOR_ID`, `EMAIL`, `SENHA`, `SE_ATIVO`, `SE_ADMIN`).
- `TBFUNCIONARIO`, `TBFUNCAO` — dados de funcionário.

---

## 6.5. Módulo IMPLANTAÇÃO / PROJETOS (v1.1.0)

Gerenciador de **projetos, tarefas e clientes**. Desde 2026-09-12 o módulo
**Equipes foi removido** (migration `20260912173928_RemoveEquipes`, Fases 2–3
de `PLANO-IMPLEMENTACAO-FASES.md`, deploy em produção 192.168.2.130 OK com
backup `Backup_IIS/20260912-163535`): não há mais filtro por equipe, e o
dashboard retorna `porEquipe` com item único stub `Geral`.

### 6.5.1. Entidades principais

| Entidade | Descrição |
|---|---|
| `IMPL_Cliente` | Cadastro de clientes (vinculado a implantações). |
| `IMPL_TipoProjeto` | `CLIENTE`, `CARTEIRA`, `INTEGRACAO` (cliente obrigatório); `PROJETO_CIAA` (cliente opcional). Sem `EquipeId` desde 2026-09-12. |
| `IMPL_Etapa` | Etapas configuráveis (vinculadas opcionalmente a um `TipoProjeto`). Ex.: KICKOFF, PARAMETRIZAÇÃO, GO LIVE; LEVANTAMENTO, DESENVOLVIMENTO, PUBLICAÇÃO. |
| `IMPL_ColunaKanban` | Colunas do Kanban. Padrão: BACKLOG, A FAZER, EM ANDAMENTO, HOMOLOGAÇÃO, CONCLUÍDO. Limite: 8 colunas. |
| `IMPL_Projeto` | Projeto principal. Tem `codigo` sequencial global (`PRJ-0001`, prefixo fixo `PRJ`). Sem `EquipeId` desde 2026-09-12. |
| `IMPL_Tarefa` | Unidade de execução dentro de um projeto. Tem status, prioridade, ordem, coluna Kanban, **tipo (Feature/Bug)**, **data de entrega**, **responsáveis N:N**, **apontamentos**, **etapa fixa do projeto (`TRF_ProjetoEtapaId` → `tbprojetoEtapa.PEP_Id`, NULL, `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa); migration `20260920185734_TarefaProjetoEtapaId` de 20/09/2026 + script `scripts/db/migracao-tarefa-projeto-etapa-id.sql`)**. |
| `IMPL_ComentarioTarefa` | Comentários / histórico da tarefa. |
| `IMPL_TarefaResponsavel` | Vínculo N:N tarefa↔operador (responsáveis múltiplos). PK: TRF_Id + OPERADOR_ID. |
| `IMPL_TarefaChamado` | Vínculo N:N tarefa↔chamado legado (`tbchamado.CHAMADO_ID`). PK: TRF_Id + CHAMADO_ID. |
| `IMPL_TarefaApontamento` | Apontamentos de horas (APT_Horas decimal(5,2)). Índice: IX on (TRF_Id, APT_Data). `TRF_HorasRealizadas` é **derivado** (SUM). |
| `tbchamado` (legado, somente-leitura) | Espelho `ChamadoLegado` (`CHAMADO_ID`, `CLIENTE_ID`, `TITULO`, `STATUS`, `DATA_PREVISAO`, `DATA_FECHAMENTO`); `ExcludeFromMigrations`, escrita proibida. |
| `tbfuncionario` / `tbcliente` (legado, somente-leitura) | Espelhos `FuncionarioLegado` / `ClienteLegado` (`FANTASIA` A–Z no dropdown); `ExcludeFromMigrations`. |

> **DTOs Detalhe (19/09/2026):** `TipoProjetoDetalhe`, `EtapaDetalhe` e
> `ColunaKanbanDetalhe` em `Dtos/Implantacao/TipoProjetoEtapaColunaDtos.cs`
> (Resumo + auditoria `UsuarioInclusao/DataInclusao/UsuarioAlteracao/DataAlteracao`);
> services `TipoProjeto/Etapa/ColunaKanban` retornam Detalhe em obter/criar/atualizar.

> **Removidas em 2026-09-12:** `IMPL_Equipe` (equipes `IMPLANTACAO`/`CIAA` com
> prefixo de código `IMP`/`CIAA`) e `IMPL_MembroEquipe` (vínculo N:N operador↔equipe).

> **Removidas em 2026-09-12:** `IMPL_Equipe` (equipes `IMPLANTACAO`/`CIAA` com
> prefixo de código `IMP`/`CIAA`) e `IMPL_MembroEquipe` (vínculo N:N operador↔equipe).

### 6.5.2. Tabelas IMPL_* necessárias no SQL Server de homolog

> ⚠️ **AÇÃO MANUAL NECESSÁRIA** — o `scripts/deploy/deploy.ps1` **não** aplica migrations.
> Em ambiente de homologação (192.168.2.154 / dbBUSINESS_HML), criar
> manualmente as tabelas abaixo antes de subir o backend para a v1.1.0.
> Os scripts DDL estão em `backend/Central_BackEnd/Migrations/20260904194350_ImplantacaoInit.cs`
> (método `Up`) ou podem ser gerados via
> `dotnet ef migrations script --idempotent -o ImplantacaoInit.sql`.
> **Em 2026-09-12** a migration `20260912173928_RemoveEquipes` removeu
> `IMPL_Equipe`/`IMPL_MembroEquipe` e as colunas `PRJ_EquipeId`/`TPP_EquipeId` —
> bancos provisionados pelo script antigo precisam aplicar essa migration
> (ou remover manualmente esses objetos).
> **Incidente 2026-09-14 (homolog .154):** o script idempotente original recriava
> `FK_IMPL_Projeto_IMPL_TipoProjeto` com `ON DELETE CASCADE` e foi rejeitado pelo
> SQL Server (**erro 1785/1750 + 3902**, múltiplos caminhos CASCADE — `Etapa→TipoProjeto`
> já é `Cascade`). Correção confirmada no código: `AppDbContext.cs` (bloco `Projeto`)
> com `.OnDelete(DeleteBehavior.Restrict)`, `Up` da migration com
> `onDelete: ReferentialAction.Restrict` e `Migrations/Sql/RemoveEquipes_Idempotente.sql`
> regenerado (`ON DELETE NO ACTION`). Detalhe em `docs/telas/06-backend.md` §18.3.1.
> **Aplicação manual — checagem pós-falha obrigatória:** o deploy **não** aplica
> migrations; após qualquer falha, conferir `SELECT MigrationId FROM __EFMigrationsHistory`
> contra o schema real e **NUNCA** considerar "aplicada" só pela mensagem de erro
> (ver `docs/DEPLOY.md` §6.2).

| # | Tabela | Prefixo | Propósito |
|---|---|---|---|
| 1 | `IMPL_Cliente` | `CLI_` | Cadastro de clientes (CNPJ, contato, observacao, ativo, auditoria) |
| 2 | `IMPL_TipoProjeto` | `TPP_` | Tipos: `CLIENTE`/`CARTEIRA`/`INTEGRACAO`/`PROJETO_CIAA` (sem `EquipeId`) |
| 3 | `IMPL_Etapa` | `ETP_` | Etapas configuráveis (vinculadas a um tipo de projeto) |
| 4 | `IMPL_ColunaKanban` | `CLK_` | Colunas do Kanban (limite 8; 5 padrão já seeded) |
| 5 | `IMPL_Projeto` | `PRJ_` | Projeto principal (código `PRJ-0001`, tipo, cliente opcional, status, prioridade) |
| 6 | `IMPL_Tarefa` | `TRF_` | Tarefas (titulo, projeto, etapa, coluna Kanban, responsavel, status) |
| 7 | `IMPL_ComentarioTarefa` | `CMT_` | Comentários / histórico da tarefa |

Após criar, validar:

```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'IMPL_%' ORDER BY TABLE_NAME;
-- esperado: 7 linhas (IMPL_Equipe/IMPL_MembroEquipe removidas em 2026-09-12)
```

### 6.5.3. Geração automática de código de projeto

O `ProjetoService.ProximoCodigoAsync()` (sem parâmetros desde 2026-09-12)
gera o próximo número sequencial global com prefixo fixo `PRJ`:

- `PRJ-0001`, `PRJ-0002`, ...

Endpoint: `GET /api/v1/implantacao/projetos/proximo-codigo` (sem query params;
o antigo `?equipeId=N` e os prefixos por equipe `IMP`/`CIAA` foram removidos).

### 6.5.4. Regras de validação

- `CLIENTE`, `CARTEIRA`, `INTEGRACAO` → **cliente obrigatório** (`clienteObrigatorio = true` no seed)
- `PROJETO_CIAA` → **cliente opcional** (`clienteObrigatorio = false`)
- Kanban: **máximo 8 colunas** ativas
- Colunas com `padrao = true` **não podem ser excluídas**
- **Projetos:** `PrioridadeProjeto` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`) validada via `Enum.IsDefined` no create (`Prioridade`) e no update (`Prioridade?`); `StatusProjeto` (`Backlog`, `AFazer`, `EmAndamento`, `Homologacao`, `Concluido`, `Cancelado`, `Bloqueado`) via `Enum.TryParse` no update/status; tipo/cliente validados (ativo/existente); erros retornam `400 { mensagem }`
- **Tarefas:** título obrigatório; `PrioridadeTarefa` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`) validada via `Enum.IsDefined` no create e no update; `Status` do update é opcional e validado via `Enum.TryParse<StatusTarefa>` (`Backlog`, `AFazer`, `EmAndamento`, `EmHomologacao`, `Concluida`, `Cancelada`) — `400 { mensagem: "Status inválido" }` quando desconhecido; projeto/responsável/coluna validados (existência); `ChamadoLegadoId` opcional (`TRF_ChamadoLegadoId`, FK lógica p/ `tbchamado.CHAMADO_ID`); **`TipoTarefa`** (`Feature = 0`, `Bug = 1`) validada via `Enum.IsDefined` no create e no update (`400 { mensagem: "Tipo de tarefa inválido" }`); **`DataEntrega`** (datetime2, nullable) — base oficial do cálculo de atraso: `DataEntrega < hoje AND Status ∉ {Concluida, Cancelada}`; **`ResponsavelIds`** (lista N:N, opcional) — substitui todos os vínculos de responsável na atualização; **`HorasRealizadas`** é derivado de `IMPL_TarefaApontamento` (SUM) e sincronizado pelo service a cada apontamento; **`ProjetoEtapaId`** (opcional, 20/09/2026) — etapa fixa do mesmo projeto validada por `TarefaService.ValidarEtapaFixaAsync` (`400 "Etapa do projeto inválida para esta tarefa"`; `NULL` = sem card fixo, conta só nos totais).

### 6.5.5. Endpoints backend (`/api/v1/implantacao/`)

| Verbo | Rota | Descrição |
|---|---|---|
| GET/POST/PUT/DELETE | `/clientes` | CRUD de clientes |
| GET/POST/PUT/DELETE | `/tipos-projeto` | CRUD de tipos (lista com `?apenasAtivos=true`; lookup do form de projeto com `clienteObrigatorio`) |
| GET/POST/PUT/DELETE | `/etapas` | CRUD de etapas (lista com `?projetoId=`; lookup do form de tarefa) |
| GET/POST/PUT/DELETE | `/colunas-kanban` | CRUD de colunas (lista com `?apenasAtivas=true`/`?apenasAtivos=` conforme o service; lookup dos forms) |
| POST | `/colunas-kanban/reordenar` | Reordenar colunas (drag-drop) |
| GET/POST/PUT/DELETE | `/projetos` | CRUD de projetos (lista com `tipo`, `status`, `clienteId`, `responsavelId`, `buscar`; detalhe com KPIs de tarefas) |
| GET | `/projetos/proximo-codigo` | Gera o próximo código (`PRJ-XXXX`, retorna `{ codigo }`, sem `equipeId`) |
| GET | `/projetos/clientes` | Lookup de clientes ativos (`ClienteResumo { id, nome, cnpj, ativo }`) |
| PATCH | `/projetos/{id}/status` | Mudar status (Backlog/AFazer/EmAndamento/Homologacao/Concluido/Cancelado/Bloqueado) |
| GET/POST/PUT/DELETE | `/tarefas` | CRUD de tarefas (lista com `projetoId`, `responsavelId`, `status`, `prioridade`, `tipo`, `buscar`, `apenasAtrasadas`, `apenasEmAndamento`, `apenasConcluidas`, `apenasVenceHoje`, `incluirArquivadas`, `funcaoId`; create/update com `projetoEtapaId?` + retorno `projetoEtapaId/projetoEtapaNome`; update com `Status` opcional, `Tipo`, `DataEntrega`, `ResponsavelIds` N:N, `ChamadoLegadoId`) |
| PATCH | `/tarefas/{id}/coluna` | Mover tarefa entre colunas (drag-drop backend, com ajuste de `Status` e `SincronizarAgendaAsync`) |
| POST | `/tarefas/{id}/comentarios` | Adicionar comentário |
| GET | `/dashboard` | KPIs agregados (`porEquipe` = stub `Geral`) |
| **GET** | **`/tarefas/chamados/busca`** | **Busca chamados legados (`tbchamado`) para dropdown (take=20)** |
| **POST** | **`/tarefas/{id}/chamados`** | **Vincular chamado legado à tarefa** |
| **DELETE** | **`/tarefas/{id}/chamados/{chamadoId}`** | **Desvincular chamado legado da tarefa** |
| **POST** | **`/tarefas/{id}/apontamentos`** | **Adicionar apontamento (cria + recalcula `HorasRealizadas`)** |
| **PUT** | **`/tarefas/apontamentos/{apontamentoId}`** | **Atualizar apontamento (só dono ou admin; recalcula `HorasRealizadas`)** |
| **DELETE** | **`/tarefas/apontamentos/{apontamentoId}`** | **Excluir apontamento (só dono ou admin; recalcula `HorasRealizadas`)** |
| GET | `/tarefas/{id}/historico` | Histórico de movimentações (auditoria) |

> **Removidos em 2026-09-12:** `GET/POST/PUT/DELETE /equipes` e
> `POST/DELETE /equipes/{id}/membros` (módulo Equipes).

Todos com `[Authorize]`. Rate limiting `validacao` (5/min por usuário)
para escrita. Padrão: `api/v{version:apiVersion}/...` com versionamento.

### 6.5.6. Páginas frontend (`/implantacao/*`)

| Rota | Componente | Função |
|---|---|---|
| `/implantacao/dashboard` | `DashboardComponent` | KPIs gerais, próximos prazos, gráfico por categoria (stub `Geral`, sem filtro por equipe desde 2026-09-12) + seção "Produtividade" (fusão do Relatório: seletor 7d/30d/tudo + CSV/Imprimir no header; 4 stats taxa/tempo médio/SLA/atrasadas; grids Conclusões por dia via Chart.js, Produtividade por pessoa, Por prioridade, Top 10 atrasadas com link de edição; cálculo client-side via `TarefasService.listar()`, sem endpoint novo) |
| `/implantacao/kanban` | `KanbanComponent` | Quadro visual (drag-drop), menu do cartão (editar/comentar/duplicar/mover/excluir), drawer com comentários/edição/exclusão, edição inline e ações em lote com preservação de campos; header via `app-page-header` (`titulo="Kanban"`, `icone="bi-kanban"`, select de projeto no slot `actions`; CSS `.imp-kanban__header` removido); form inline com dropdown "Etapa do projeto (card)" (default = etapa `EmAndamento`, `NULL` = "Sem card (só totais)"; payload `projetoEtapaId`) |
| `/implantacao/projetos` | `ProjetosComponent` | LAYOUT 3 COLUNAS (20/09/2026) + IDENTIDADE CLEAN (21/09/2026) + `PageHeaderComponent` (21/09/2026): header via `app-page-header` (`PageHeaderComponent` reutilizável, 21/09/2026, espelho do Kanban: `titulo="Projetos"`, nova descrição, ações Filtros/Resumo/Novo; busca só na sidebar, sem eyebrow/subtítulo) + aside filtros (busca/status server, responsável server com "Meus projetos" via `AuthService.getOperadorLogado`, período vencimento client-side sobre `dataPrevisao`, ordenar, Limpar) + conteúdo (abas Todos/Ativos/Concluídos/Atrasados + grupos colapsáveis Ativos azul/Concluídos verde) + aside resumo (Análise rápida, Próximos vencimentos top 5, Etapas atuais, Meus projetos com atalho); toggles `filtrosAbertos`/`resumoAberto`; redimensionado ao padrão Kanban (sem `max-width`, `padding: 1.5rem`, gaps `1rem` em layout/conteúdo/sides/lista/abas/grupos; grid `15rem/1fr/16.5rem`), drawers <1400px/<1024px; sem mudança de API (`listarComEtapas`/`listarOperadores` existentes) |
| `/implantacao/projetos/novo` | `ProjetoFormComponent` (Fase 2 — working tree; validação pendente) | Form create com lookups (tipos/clientes/operadores/colunas/próximo código) e payload `ProjetoCriarRequest`; header via `app-page-header` (Lote B): título dinâmico por binding (`[titulo]="titulo()"` → `Editar Projeto`/`Novo Projeto`), `icone="bi-file-earmark-plus"`, Cancelar no slot `actions` |
| `/implantacao/projetos/:id/editar` | `ProjetoFormComponent` (Fase 2 — working tree; validação pendente) | Form edit pré-preenchido (`GET /projetos/{id}`), payload `ProjetoAtualizarRequest` + `usuarioAlteracao`; header via `app-page-header` (Lote B, título dinâmico) |
| `/implantacao/projetos/:id` | `ProjetoDetalheComponent` | Hero com código/título/progresso + ações Editar/Excluir, breadcrumb back, abas (Visão/Tarefas/Histórico — Histórico em placeholder), aba Tarefas com Nova tarefa (`?projetoId=`) e Editar por linha |
| `/implantacao/tarefas` | `TarefasComponent` | Grid de cards com ID mono (T123), atalhos (Todas/Atrasadas/Em andamento/Concluídas), filtros (projeto/busca, `?projetoId=`), ações Editar/Excluir por card |
| `/implantacao/tarefas/novo` | `TarefaFormComponent` (working tree; validação pendente) | Form create (aceita `?projetoId=`), payload `TarefaCriarRequest` (com `chamadoLegadoId?`, `tipo`, `dataEntrega`, `responsavelIds?`, **`projetoEtapaId?`** via dropdown "Etapa do projeto (card)", default = etapa `EmAndamento`); header via `app-page-header` (Lote B): título dinâmico por binding (`[titulo]="tituloPagina()"` → `Editar Tarefa`/`Nova Tarefa`), `icone="bi-file-earmark-text"`, Cancelar no slot `actions` |
| `/implantacao/tarefas/:id/editar` | `TarefaFormComponent` (working tree; validação pendente) | Form edit pré-preenchido, payload `TarefaAtualizarRequest` (com `Status?`, `chamadoLegadoId?`, `tipo`, `dataEntrega`, `responsavelIds?`, `usuarioAlteracao`, **`projetoEtapaId?`** preservado no editar); header via `app-page-header` (Lote B, título dinâmico) |
| `/implantacao/clientes` | `ClientesComponent` | Formulário inline com máscara de CNPJ, tabela com badge de status Ativo/Inativo |
| `/implantacao/cadastros` | `CadastrosComponent` | 3 abas (Tipos/Etapas/Colunas) com formulários inline (aba Equipes removida em 2026-09-12) |

> **Removida em 2026-09-12:** rota `/implantacao/equipe` (`EquipeComponent`,
> Diretório de Equipe v1.3.0) junto com o módulo Equipes.
>
> **Removida (fundida no Dashboard):** rota `/implantacao/relatorio`
> (`RelatorioComponent`, pasta `pages/relatorio/` deletada, link "Relatório"
> removido do sidebar) — funcionalidade de SLA/produtividade absorvida pela
> seção "Produtividade" do `DashboardComponent` (cálculo client-side via
> `TarefasService.listar()`, sem endpoint novo). A rota segue existindo apenas
> como `redirectTo: 'dashboard'` (`implantacao.routes.ts:42-44`) para
> compatibilidade de bookmarks/deep-links. Sem mudança de backend.

### 6.5.6.1. Design system do módulo (frontend)

CSS próprio em `frontend/src/app/wiki/pages/implantacao/implantacao.styles.scss`
(importado via `styleUrl` em cada componente).

> **Nota (2026-09-12):** com a remoção do módulo Equipes, não há mais
> identidade visual por equipe (cores `#0f4c81`/`#7c3aed`, borda lateral de
> cards, gradiente de progresso e chips de filtro). Os helpers
> `corEquipe()`/`corEquipeBg()` permanecem no `DashboardComponent` apenas
> como stub (sempre `'Geral'`). O restante do design system segue válido:

**Tipografia**:
- Display: **Space Grotesk** 800 (títulos de seção e KPIs)
- Body: **Inter** 500-600 (textos corridos)
- Data: **IBM Plex Mono** (códigos de projeto, IDs de tarefa, prazos)

**Signature element**: **barra de progresso** com 8px de altura e % sobreposta
em mono. É o dado mais importante de um projeto e aparece em cards e no hero
do detalhe.

**Status colors** (chips com bolinha à esquerda):
- Backlog: cinza / A Fazer: azul / Em Andamento: âmbar / Homologação: violeta /
  Concluído: verde / Bloqueado: vermelho / Cancelado: slate

KPIs no topo viram **números grandes** (2.5rem, Space Grotesk 800)
com label pequena em uppercase. Empty states são orientados ("Crie o primeiro projeto…") em vez de mudos.

### 6.5.6.2. Seed de dados (em `Development`)

O backend tem seed automático em `Program.cs` quando `IsDevelopment()`:

- **1 operador**: `admin` (com perfil `A`)
- **3 funções** (`CC_Funcao`), **7 colunas Kanban padrão**: BACKLOG, A FAZER, EM DESENVOLVIMENTO, EM ANDAMENTO, HOMOLOGACAO, BLOQUEADO, CONCLUIDO
- **4 tipos de projeto**: CLIENTE/CARTEIRA/INTEGRACAO (cliente obrigatório) + PROJETO_CIAA (cliente opcional) — sem `EquipeId` desde 2026-09-12
- **13 etapas**: 6 (KICKOFF, PARAMETRIZACAO, TREINAMENTO, HOMOLOGACAO, GO LIVE, ACEITE) + 7 (LEVANTAMENTO, DESENHO, DESENVOLVIMENTO, TESTES, HOMOLOGACAO, PUBLICACAO, MONITORAMENTO)
- **7 tipos de evento** (`CC_TipoEvento`)
- Clientes: somente leitura da legada `tbcliente` (sem seed próprio)

> ⚠️ **Seeds de exemplo DESABILITADOS** (limpeza total para testes):
> `Seed IMPL_Projeto` (projetos **IMP-0001** — *Implantação Tech Solutions S/A* —
> e **CIAA-0001** — *Agente IA — Classificação de Chamados* — com tarefas e
> comentários) e `Seed IMPL_Agenda` (5 eventos de exemplo, que referenciavam
> esses códigos) estão sob `#if false` em `Program.cs` e **não são mais criados**.
> A descrição histórica desses dados permanece abaixo apenas como referência.
> A base de testes (SQL Server `Central_Conhecimento`) parte limpa via
> `scripts/db/wipe-test-data.sql` (DELETEs FK-seguros + `RESEED 0`; preserva
> tipos, etapas-base, colunas, tipos de evento, operadores, funções, clientes,
> legadas e auth; `ProximoCodigoAsync()` é MAX-based, então o próximo código
> volta a `PRJ-0001` sozinho). Procedimento: backup antes, rodar via
> SSMS/`sqlcmd`, reiniciar o backend, conferir telas vazias.

<details>
<summary>Referência histórica — dados de exemplo desabilitados (não são mais criados)</summary>

- **IMP-0001** — *Implantação Tech Solutions S/A* (60% concluído, Em Andamento, prioridade Alta, 7 tarefas distribuídas pelas colunas, 1 tarefa BLOQUEADA aguardando retorno do banco sobre layout CNAB, 2 comentários de contexto)
- **CIAA-0001** — *Agente IA — Classificação de Chamados* (35% concluído, Em Andamento, 6 tarefas, 1 comentário sobre acurácia do prompt)

</details>

Esses dados ficam em memória (InMemory) e somem ao reiniciar o backend.
Em produção (SQL Server), as tabelas precisam ser criadas via
`Migrations/Sql/ImplantacaoInit.sql` — ver § 6.5.2.

### 6.5.6.3. Contador dinâmico de tarefas por etapa + transição automática (20/09/2026)

**Backend (confirmado no código):** `Tarefa.ProjetoEtapaId` (`TRF_ProjetoEtapaId`,
FK NULL p/ `tbprojetoEtapa.PEP_Id`, `NO ACTION` — SQL Server barra múltiplos caminhos em cascata (IMPL_Projeto→IMPL_Tarefa direto + via tbprojetoEtapa)) + navegação `ProjetoEtapa`
(`Models/Implantacao/Tarefa.cs`); relationship em `AppDbContext.cs` (bloco `Tarefa`);
migration `20260920185734_TarefaProjetoEtapaId` (AddColumn + índice + FK + backfill SQL
por nome conhecido, `HOMOLOGACAO→HOMOLOGAÇÃO`, demais `NULL`) + script manual
equivalente `scripts/db/migracao-tarefa-projeto-etapa-id.sql` (idempotente);
DTOs `TarefaResumo/Detalhe/Criar/Atualizar` com `ProjetoEtapaId(+Nome)`;
`ProjetoEtapaResumo` com `TarefasTotal/TarefasConcluidas/Id` (GROUP BY em
`ObterEtapasAsync`, excluindo arquivadas).
`TarefaService.ValidarEtapaFixaAsync` (etapa fixa deve ser do mesmo projeto);
sets no Criar/Atualizar; includes + projeções em Listar/Obter; injeção de
`IProjetoEtapaService`; `RecalcularJornadaAsync` chama
`SincronizarEtapasPorTarefasAsync` após o recalc da jornada (cobre
criar/atualizar/mover-coluna/concluir/arquivar/excluir) — `Projeto.Progresso`
termina no fórmula-fixa.
`ProjetoEtapaService.SincronizarEtapasPorTarefasAsync`: por linha fixa conta tarefas
(`!Arquivada`, `ProjetoEtapaId`); sem tarefas não toca (manual/checklist intacto);
com tarefas atualiza Percentual task-based; tudo-concluído + não-concluída →
`Concluida` + `DataFimReal` + histórico "Conclusão automática por tarefas" +
`DesbloquearProximaEtapaAsync` (reuso); `Concluida` congela Percentual em 100 e
nunca reabre sozinha (retorno é manual).

**Frontend (confirmado no código):** `projeto.model.ts`/`tarefa.model.ts`
estendidos (`ProjetoEtapaResumo.tarefasTotal/tarefasConcluidas/id`,
`Tarefa*.projetoEtapaId/projetoEtapaNome`); `projeto-etapa-card` mostra
"X/Y tarefas" (`.etapa-tarefas`, com tooltips) quando há tarefas, senão checklist;
`tarefa-form` e Kanban inline com dropdown "Etapa do projeto (card)"
(default = `EmAndamento`, `NULL` = "Sem card (só totais)"); payloads enviam
`projetoEtapaId`.

**Deploy:** sem auto-migrate no startup — aplicar a migration (`dotnet ef database update`)
ou o script SQL no servidor antes do deploy. Builds: dotnet 0 erros; `ng build` sem erros.

### 6.5.7. ~~Agenda compartilhada (v1.3.0 — REMOVIDA)~~

> ⚠️ **Feature removida no rollback de 10/09/2026** (commit `8956c57`).
> 
> A Agenda V1 (`IMPL_Agenda`, `IMPL_MembroPerfil`, migrations `AddAgendaAndPerfis`/`AddAuditoria`) foi removida por conflitos sistêmicos (CSS/JS, z-index, dark mode, performance). As tabelas `CC_Agenda`, `CC_AgendaParticipante`, `CC_Perfil`, `CC_Auditoria` permanecem no banco como órfãs (ver `docs/AGENDA-REIMPLEMENTACAO.md` para plano de reimplementação segura).
> 
> **Endpoints removidos:** `/api/v1/implantacao/agenda` (GET/POST/PUT/DELETE/ICS)
> **Rota frontend removida:** `/implantacao/agenda`
> **Branch de backup:** `backup-master-pre-agenda-rollback` (commit `c3fec9c`)

### 6.5.8. ~~Diretório de Equipe (v1.3.0 — REMOVIDO em 2026-09-12)~~

> ⚠️ **Removido junto com o módulo Equipes em 2026-09-12**
> (migration `20260912173928_RemoveEquipes`).
>
> Registro histórico: existiu a tabela `IMPL_MembroPerfil` (descrição, telefone,
> ramal) cruzada com `tbfuncionario` e `IMPL_MembroEquipe`, com endpoints
> `GET /equipe/diretorio`, `GET /equipe/perfil/{funcionarioId}` e
> `PUT /equipe/perfil/{funcionarioId}`, e UI em `/implantacao/equipe`
> (grid de cards + drawer lateral). Nada disso existe mais no código.

### 6.5.9. Roadmap do módulo

- **v1.0.0 (entregue)**: Dashboard, Projetos, Tarefas, Clientes, Cadastros.
- **v1.1.0 (entregue, tag)** — Kanban UI com `@angular/cdk` drag-drop, seed de 2 projetos fakes.
- **v1.2.0 (entregue, backend)** — Legacy data service + FKs lógicas para `tbcliente` e `tbchamado`.
- **v1.3.0 (planejada)** — Dropdowns de legado. Migration `AddAgendaAndPerfis` já aplicada em produção (tabelas órfãs mantidas). **Agenda movida para reimplementação futura** — ver `docs/AGENDA-REIMPLEMENTACAO.md`. **Diretório de Equipe cancelado** (módulo Equipes removido em 2026-09-12).
- **2026-09-12 (entregue, produção)** — **Remoção do módulo Equipes** (Fases 2–3 de `PLANO-IMPLEMENTACAO-FASES.md`): migration `20260912173928_RemoveEquipes`, `AgendaVisibilidade` = `Publico|Privado`, código de projeto `PRJ-0001` global, `DashboardPorEquipe` stub `Geral`, deploy 192.168.2.130 OK (backup `20260912-163535`, front + swagger 200).
- **Fases 2 e 3 do módulo Implantação (working tree 15/09/2026)** — **implementação em andamento no working tree; validação pendente (sem validação runtime):** Fase 2 = forms create/edit de Projeto (`/implantacao/projetos/novo`, `/implantacao/projetos/:id/editar`), ações editar/excluir no detalhe, lookups (`GET /projetos/clientes`, `GET /tipos-projeto?apenasAtivos=true`, `GET /agenda/operadores`, `GET /projetos/proximo-codigo`, `GET /colunas-kanban?apenasAtivas=true`), payloads `ProjetoCriarRequest`/`ProjetoAtualizarRequest`, prioridades do enum `PrioridadeProjeto`; Fase 3 = CRUD de Tarefas com forms create/edit (`/implantacao/tarefas/novo`, `/implantacao/tarefas/:id/editar`, `?projetoId=`), ações na listagem e no detalhe do projeto, integração Kanban↔Tarefas (menu editar/comentar/duplicar/mover/excluir, drawer com comentários/edição/exclusão, edição inline e lote com preservação de campos), `TarefaDetalhe.ChamadoLegadoId`, `TarefaAtualizarRequest.Status` opcional, validação server-side de prioridade/status.
- **v2.x (futuro)**: integração com Google Calendar (OAuth + ICS), recorrência funcional com expansão de eventos, MCP server para Agente IA.

### 6.5.10. Branch `projeto-implantacao`

Branch **futura** (criada a partir de `developer` via `scripts/git/branch-todos.ps1`
quando o módulo voltar a desenvolvimento ativo). Para subir manualmente, ver seção 8.

### 6.5.11. Smoke test executado (histórico, pré-remoção de Equipes)

> Registro anterior a 2026-09-12 — endpoints `/implantacao/equipes` e
> `/projetos/proximo-codigo?equipeId=` não existem mais.

| # | Endpoint | Resultado |
|---|---|---|
| 1 | POST `/auth/login` (admin/admin123) | ✅ 200 |
| 2 | GET `/implantacao/equipes` | ✅ 2 equipes (IMPLANTACAO, CIAA) |
| 3 | GET `/implantacao/tipos-projeto` | ✅ 4 tipos (CLIENTE, CARTEIRA, INTEGRACAO, PROJETO_CIAA) |
| 4 | GET `/implantacao/colunas-kanban` | ✅ 5 colunas padrão |
| 5 | GET `/implantacao/dashboard` | ✅ 200 (KPIs zerados) |
| 6 | POST `/implantacao/clientes` | ❌ 500 (bug `Include(x => x.Nome)` no ClienteService.ObterAsync — **corrigido** nesta release) |
| 7 | GET `/implantacao/projetos/proximo-codigo?equipeId=1` | ✅ `IMP-0001` |
| 8 | POST `/implantacao/projetos` | ⚠️ 429 rate limit (cliente/projeto foram criados; smoke test parou no limite de 5/min) |

> **Bugs corrigidos no smoke test**:
> 1. `ClienteService.ObterAsync` tinha `.Include(x => x.Nome)` (scalar property,
>    sem sentido para Include). Removido. Cliente ID 1 foi criado antes do
>    erro — o seed fica para próxima execução.

### 6.6. Módulo Banco de Dados — Database Explorer (v0.8.0)

Explorador em tempo real do SQL Server Actyon para as equipes SUPORTE, IMPLANTAÇÃO e CIAA.
Inspirado em `projeto_BD.md` da raiz do monorepo. Cobre (subset): metadados (`sys.*`),
relacionamentos (confirmados via `sys.foreign_keys` + inferidos com score 0-99%),
grafo BFS até 5 níveis, busca global, consultas SELECT-only com timeout, configuração
segura de conexão.

**Páginas frontend (`/database/*`)**:

| Rota | Componente | Função |
|---|---|---|
| `/database` | `DatabaseShellComponent` | Shell com 7 abas + banner de status (verde conectado / vermelho desconectado); header via `app-page-header` (Lote B): `titulo="Banco de Dados"`, `icone="bi-hdd-network-fill"`, status continua abaixo |
| `/database/visao-geral` | `DbVisaoGeralComponent` | 9 cards (servidor, tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers) + detalhes |
| `/database/explorador` | `DbExploradorComponent` | Árvore de tabelas + painel de detalhe (colunas + índices) + busca global |
| `/database/relacionamentos` | `DbRelacionamentosComponent` | Confirmados (linha azul contínua) × Possíveis (linha violeta tracejada) com score e motivos + busca por coluna |
| `/database/diagrama` | `DbDiagramaComponent` | SVG próprio, layout BFS, profundidade 1-5, setas: azul contínua / violeta tracejada |
| `/database/consultas` | `DbConsultasComponent` | Editor SQL (SELECT/WITH), paginação 25/50/100/500, timeout 5/15/30/60s |
| `/database/diferencas` | `DbDiferencasComponent` | Sincronização banco × Markdown (comparação real via `POST /database/diff` + snapshots; IDENTIDADE CLEAN 21/09/2026: labels em texto puro + dots CSS via `getBadgeClass()`; `badge 🟢🟡🔴` do model é contrato de dados da API, não exibição) |
| `/database/configuracao` | `DbConfiguracaoComponent` | Form de conexão (servidor/porta/banco/usuário/senha mascarada) + Testar conexão + Salvar |

**Endpoints backend (`/api/v1/database`)** — 14 endpoints, ver `MODULO-BANCO-DADOS.md` § 4.

**Segurança**: senha nunca é logada, retornada pela API ou commitada. Leitura via
env var (`DB_EXPLORER_*`) em produção, user-secrets em Development. SELECT-only com
regex server-side bloqueando INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/EXEC.
Transação ReadUncommitted + ROLLBACK explícito. Timeout 1-120s. Limite 1-5000.

**Mapa completo**: `MODULO-BANCO-DADOS.md` na raiz do monorepo.

---

## 7. Aplicação Frontend (módulos)

| Módulo | Descrição |
|---|---|
| Autenticação | Login, guard de rotas, interceptor com `withCredentials: true` e **refresh token em cookie HttpOnly** (`cc_refresh`). Access token + usuário ficam **somente em memória**; após F5 ou 401, o refresh single-flight também **repopula o usuário** (`restaurarSessao`), mantendo o perfil do header visível. "Lembrar meu acesso" torna o cookie persistente por 4h. **Verificação periódica** (5 min) detecta expiração proativamente; logout por timeout exibe "Sua sessão expirou" no login |
| Layout | Header (nav Início / Fraseologias / Ferramentas / Acessos / Cursos, breadcrumb com `/agenda`, `/chat`, `/implantacao/*`, `/admin/*`, `/executivo/dashboard`, busca local via `BuscaIndexService` + estado `BuscaService` com `abrirBusca()` e atalho `Ctrl+K`, dropdown do usuário com BEM `user-nav__*`) + sidebar com 7 seções de links diretos (Início — com **Central Executiva** (`/executivo`, `bi-speedometer2`) como primeiro item, só `ehAdministrador()` estrito (`perfil === 'Administrador'`) —, Atendimento, Implantação, Ferramentas, Conhecimento, JCA, Administração; sem links JOTA, sem grupos em uso) + JOTA flutuante (`<app-jota-widget>` no `MainLayout`: FAB + painel, proxy real, erro honesto) |
| Home | Saudação com primeiro nome, busca `Ctrl+K`, 6 acessos rápidos, "Continue de onde parou"/"Mais utilizados" (`RecentesService`: `localStorage cc.recentes.v1`, `NavigationEnd`, partem vazios sem mock) + agenda real de 7 dias (`AgendaService.listarEventos`, top 5) |
| Busca / Recentes (core, sem backend) | `BuscaIndexService.buscar(termo, limite = 8)` — índice local (ferramentas, cursos, trilhas, SQL, procedimentos, utilidades, política, onboarding, páginas), multi-termo sem acento; `RecentesService` — `recentes()`/`maisUtilizados()`/`mudancas$`; `BuscaService` — `abrirBusca()`/`fecharBusca()`/`buscaAberta$` |
| JOTA transversal | `JotaWidgetComponent` (`features/chat/jota-widget/`: FAB + painel em todo o `MainLayout`, `JotaChatService.chat()` → `POST /api/rag-proxy/chat` com `workspaceId: 'suporte'`; falha → "JOTA indisponível..."); página `/chat` (`chat.routes.ts` → `RagChatWidgetComponent`) mantida |
| Cursos | Catálogo de cursos por plataforma (Alura, YouTube, Curso em Vídeo, Microsoft Learn, Cisco, Fundação Bradesco, Postman Academy, Documentação/sites) e por área de conhecimento (9 trilhas), com detalhe e player embutido para YouTube. Canais/handles validados; cursos com canal inexistente foram removidos |
| Ferramentas | Central de utilidades, busca e filtro por categoria |
| Acessos | Cards de empresas, busca (controlada por `BuscaService`), modal de senha (aberto via `abrirSenhaModal()`, que fecha a busca com `buscaService.fecharBusca()` antes de abrir e garante **instância única** do modal — dismiss em `ngOnDestroy()`) → modal de detalhe; credenciais TS/Banco/VPN |
| Trilhas | "Como resolver esse problema?" (8 seções em acordeão, redesign `.tdh`), dicas de SQL / Rede / Infra — seção Atendimento da sidebar; Resolver tem filtro de seções (`secoesVisiveis()`), 3 exemplos rápidos + CTA "Pergunte ao JOTA" (`/chat`) |
| Visão ADM | Procedimentos administrativos por setor (Financeiro, RH, Comercial) com busca, detalhe e impressão + **Central de Utilidades** (favoritos, últimos utilizados, busca, categorias, grade/lista e contador de acessos) |
| Fraseologia | Fluxo de atendimento e fraseologias; copiar mensagem para área de transferência (clipboard API + fallback `execCommand`) |
| **Implantação / Projetos** (v1.1.0) | Gerenciador único de **Projetos / Tarefas / Clientes / Cadastros** (módulo Equipes removido em 2026-09-12). Tipos: `CLIENTE` (cliente obrigatório), `CARTEIRA`, `INTEGRAÇÃO`, `PROJETO_CIAA` (cliente opcional). Código de projeto sequencial global (`PRJ-0001`). Dashboard com `porEquipe` stub `Geral`. Ver [seção 6.5](#65-módulo-implantação--projetos-v110) |
| **Agenda** (MVP) | Calendário compartilhado com visões Dia/Semana/Mês, CRUD de eventos, tipos configuráveis, participantes, filtro por responsável, drag-drop para mover eventos. Rota `/agenda` (lazy loading), API `/api/v1/agenda`. Ver [seção 7.1](#71-módulo-agenda-mvp) |
| **Central Executiva** (Dashboard Executivo, só `Administrador`) | Painel do Diretor em `/executivo/dashboard` (lazy, `adminGuard`): header via `app-page-header` (Lote B: `titulo="Painel do Diretor"`, `icone="bi-speedometer2"`, eyebrow removido, select/Limpar/Atualizar no slot `actions`); 6 KPIs clicáveis, Projetos em andamento (top 6 com deep-link `kanban?projetoId=`), Kanban Total embutido, visão por módulo (só Implantação real + Financeiro → Visão ADM), por equipe via `Funcao`, alertas, tarefas críticas, próximas entregas + agenda de 7 dias, gráficos Chart.js, auto-refresh 30s, filtro por função. Facade `forkJoin` 5 fontes sobre `GET /admin/dashboard` + `/implantacao/dashboard` + `/implantacao/projetos` + `/implantacao/tarefas` + `/agenda/eventos` — **zero endpoint novo no backend**. Admin sem deep-link cai aqui após o login. Ver [seção 7.2](#72-módulo-central-executiva-dashboard-executivo) |

**Padrões e convenções:**
- Componentes **standalone**; rotas filhas em `wiki.routes.ts` (ex.: `/ferramentas/acessos` → `AcessosComponent`,
  além de `stack`, `cursos`, `trilhas/*`, `visao-adm`, `fraseologia`, `modelo-chamados` e `empresa/onboarding`).
- Dados de cursos ficam em `src/app/wiki/pages/cursos/cursos-novos.data.ts`
  (arrays por plataforma + `todosCursos`, categorias e trilhas). Para adicionar
  um curso, ver o `README.md`.
- **Persistência de sessão**: o refresh token fica **somente em cookie HttpOnly** no backend
  (`cc_refresh`; 4h com "Lembrar meu acesso" ou cookie de sessão). Access token e usuário ficam
  **em memória** no front, restaurados via **refresh silencioso** no guard após reload — o refresh
  também devolve o objeto `user`, repopulado por `restaurarSessao()` (perfil do header volta a
  renderizar). **Verificação periódica** (5 min) detecta expiração proativamente e redireciona para o
  login com mensagem de sessão expirada. Nada de credenciais em `localStorage` — o restante do
  `localStorage` (tema, favoritos/contador da Central de Utilidades) são preferências — **nunca**
  credenciais.
- Links externos usam `window.open()` (evita interferência do roteamento Angular).
- Logout usa `Router.navigate` (não `window.location.href`).
- Tema escuro via atributo `[data-theme="dark"]` no `body`.

---

### 7.1 Módulo Agenda (MVP)

**Visão geral:** Calendário compartilhado para as equipes de suporte, implantação e CIAA. Implementado como feature standalone em `/agenda` com API dedicada em `/api/v1/agenda`.

#### 7.1.1 Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| **3 Visões** | Dia (24h), Semana (7 dias), Mês (grade calendário) |
| **CRUD Eventos** | Criar, editar, excluir, mover (drag-drop via PATCH `/mover`) |
| **Tipos de Evento** | Configuráveis via `CC_TipoEvento` (nome, cor hex, ativo) — seed sugerido em Development |
| **Participantes** | N:N evento ↔ operador (`CC_AgendaParticipante`) — responsável + participantes adicionais |
| **Filtro por Responsável** | Dropdown com operadores ativos (`TBOPERADOR.SeAtivo = 'S'`) |
| **Filtro por Função** | Dropdown com funções ativas que têm operadores ativos (`CC_Funcao` + `TBOPERADOR.SeAtivo = 'S'`, via `GET /funcoes`; `GET /eventos?...&funcaoId=N` filtra por `Operador.FuncaoId` via subquery) |
| **Escopo Meus/Geral** | Segmentado Meus (só eventos do operador logado — `responsavelEfetivo()` usa `AuthService.getOperadorLogado()` quando `escopo==='meus'` e nenhum Responsável selecionado) / Geral (`alternarEscopo('todos')` **limpa Responsável e Função** para não manter filtro fantasma no request); barra "Filtrando:" (`.ag-filtros-ativos`) com chips clicáveis de Responsável/Função para limpar |
| **Projeto Opcional** | Vinculação a `IMPL_Projeto` (código exibido no card) |
| **Evento Dia Inteiro** | Flag `DiaInteiro` renderiza no topo do dia (FÉRIAS força `true` como período simples com span via `cobreDia()`; TREINAMENTO/DAILY/REUNIÃO/ATENDIMENTO proíbem) |
| **Regras rígidas por tipo** | `RegraTipoEvento` no backend (`AgendaService.cs:185-203`) + espelho no modal (`regraFerias/regraComHorario/regraDiaUnico/regraPermitePadrao`, `aoAlterarTipo()` limpa repetição ao escolher Férias); FÉRIAS = período simples dia-inteiro com `DataFim.Date > DataInicio.Date` obrigatória ("defina a data de retorno"), sem repetição; modal mínimo (Título + Data início + Data fim retorno full-width + Responsável; linha "Dia inteiro" oculta, `diaInteiro` implícito forçado `true`); TREINAMENTO/DAILY = com horário + span + semanal/mensal; REUNIÃO/ATENDIMENTO = com horário + dia único; Pessoal/Outro/sem tipo = livres; violação → 400 `{ mensagem }` PT-BR (criar, atualizar e lote) |
| **Recorrência (lote)** | `POST /eventos/lote` (`AgendaCriarLoteRequest`: `dataRepeticaoFim*` + `padraoRecorrencia` 1=Diária/2=Semanal/3=Mensal, default 1); gera N ocorrências por padrão até a data fim e grava `Recorrente`/`PadraoRecorrencia` (`AGD_Recorrente`, `AGD_PadraoRecorrencia`); **Férias NÃO usa lote** (400 "não usa repetição") — é linha única com span; multi-dia em lote (N linhas) vale só p/ Treinamento/Daily; conflito validado por dia (409) |

#### 7.1.2 Frontend (`/agenda`)

**Componentes:**
- `AgendaComponent` (`features/agenda/agenda.component.ts`) — shell principal, grid temporal, navegação, modais
- `AgendaEventoModalComponent` (`features/agenda/agenda-evento-modal.component.ts`) — create/edit modal (lazy loaded)

**Services:**
- `AgendaService` (`features/agenda/services/agenda.service.ts`) — HTTP client tipado para `/api/v1/agenda`

**Models:** todos os DTOs (Request/Response) em `features/agenda/services/agenda.service.ts` (`models/agenda.model.ts` removido em 2026-09-14, era duplicata)

**Roteamento:** Lazy loading em `features.routes.ts:36-37`
```typescript
{ path: 'agenda', loadComponent: () => import('@features/agenda/agenda.component').then(m => m.AgendaComponent) }
```

**Sidebar:** Link "Agenda" com ícone `bi-calendar-week-fill` em `layout/sidebar/sidebar.component.ts:47`

**Correção visual (v0.8.0):** Adicionado `position: relative` ao `.agenda-shell` + limpeza de `.modal-backdrop` e `modal-open` no `ngOnDestroy` (evita overlay residual ao navegar).

**Estado vazio (sem overlay):** quando `!carregando() && eventos().length === 0`, exibe barra inline `.agenda-empty-inline` (`role="status"`) entre a legenda e a grade ("Nenhum evento no período..."); `.agenda-calendario` é sempre renderizado mesmo com `[]` (`agenda.component.html:61-66`); apenas `.agenda-loading` permanece como overlay absoluto transitório — o aviso não bloqueia cliques nas células (`agenda.component.scss:484-505`). Sem mudança em `agenda.component.ts` — `carregar()` e helpers `eventosDoDia`/`eventosPorHora` já tratam `[]`.

#### 7.1.3 Backend (`/api/v1/agenda`)

**Controller:** `Controllers/AgendaController.cs`
- `[ApiVersion("1.0")]`, `[Route("api/v{version:apiVersion}/agenda")]`
- `[Authorize]`, `[EnableRateLimiting("validacao")]` (5/min por usuário)

**Endpoints:**
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` | Lista eventos no intervalo (filtros opcionais: responsável e/ou função) |
| GET | `/eventos/{id}` | Detalhe completo |
| POST | `/eventos` | Cria evento (regras por tipo + conflito; 400/409) |
| POST | `/eventos/lote` | Cria N ocorrências até `dataRepeticaoFim` por padrão (1/2/3; grava `Recorrente`/`PadraoRecorrencia`; conflito por dia; Férias rejeitada — não usa repetição) |
| PUT | `/eventos/{id}` | Atualiza evento (regras por tipo + conflito; 400/409) |
| DELETE | `/eventos/{id}` | Exclui evento |
| PATCH | `/eventos/{id}/mover` | Move evento (drag-drop) |
| GET | `/tipos` | Tipos ativos (`CC_TipoEvento`) |
| GET | `/operadores` | Operadores ativos para responsável/participantes |
| GET | `/funcoes` | Funções ativas com operadores ativos (`CC_Funcao` + `TBOPERADOR`) |

**Service:** `Services/Implantacao/AgendaService.cs` (`IAgendaService`)
- Validações: título obrigatório, data fim > início, tipo ativo, responsável ativo, participantes ativos (+ regras rígidas por tipo → 400)
- **Regras rígidas por tipo (`RegraTipoEvento`, `:185-203`):** `NormalizarNomeTipo()` (case/acentos-insensível) + `ObterRegraTipo()` + `ResolverRegraTipoAsync(tipoId)` (nome via `CC_TipoEvento`) + `AplicarRegraEventoUnico()`; FÉRIAS = período simples dia-inteiro (horas ignoradas, **exige `DataFim.Date > DataInicio.Date`**, 400 "defina a data de retorno"); TREINAMENTO/DAILY proíbem dia inteiro, exigem `DataFim`, permitem span + semanal/mensal; REUNIÃO/ATENDIMENTO proíbem dia inteiro, exigem `DataFim`, dia único (sem span); Pessoal/Outro/sem tipo livres; aplicadas em criar, atualizar e lote (`ArgumentException` → 400 `{ mensagem }` PT-BR); lote REJEITA Férias com span>0 ou padrão não-diário (400 "não usa repetição")
- **Lote (`CriarEventosLoteAsync`):** `PadraoRecorrencia` (`2 → Semanal`, `3 → Mensal`, demais → Diário), gera ocorrências por padrão até `dataRepeticaoFim` (`AddDays(1)/AddDays(7)/AddMonths(1)`), grava `Recorrente = dias.Count > 1` e `PadraoRecorrencia = recorrente ? padrao : Nenhuma`; conflito validado por dia; Férias fora do lote (linha única com span, render via `cobreDia()`); multi-dia em lote = N linhas só p/ Treinamento/Daily
- **Filtro por função:** `ListarEventosAsync(..., funcaoId?)` filtra por `Operador.FuncaoId` via subquery correlata (sem `Contains` local/OPENJSON); `ListarFuncoesAsync()` retorna funções ativas com operadores ativos, ordem por descrição
- **Conflito de horários (Fase 1):** `ValidarSemConflitoAsync()` chamada em `CriarEventoAsync`, `AtualizarEventoAsync`, `MoverEventoAsync` e por ocorrência em `CriarEventosLoteAsync`; sobreposição por `OperadorId` (`DataInicio < fimEfetivo && fimEfetivoExistente > inicio`, excluindo o próprio `id` em edição/mover); `FimEfetivo()`: `DataFim` informada, senão dia inteiro até `inicio.Date.AddDays(1)`, senão evento pontual (`fim = início`); `ObterConflitosAsync()` expõe a lista (uso interno, sem endpoint GET próprio); erro via `ConflictException` (`Code` + `List<AgendaResumo>`, padrão `CONFLICT_HORARIOS`) → controller retorna **409** `{ mensagem, conflitos, code }` em POST, POST `/lote`, PUT e PATCH `/mover`
- `ObterOperadorId()` via claims JWT (`NameIdentifier` / `sub`)

**Models:** `Models/Implantacao/`
- `AgendaItem.cs` — entidade principal (`IMPL_Agenda`), enums `AgendaTipo`, `AgendaVisibilidade`, `AgendaRecorrencia`
- `TipoEvento.cs` — `CC_TipoEvento`
- `AgendaParticipante.cs` — `CC_AgendaParticipante` (N:N)

**DTOs:** `Dtos/Implantacao/AgendaDtos.cs` — records `AgendaResumo`, `AgendaDetalhe`, `AgendaCriarRequest`, `AgendaAtualizarRequest`, `AgendaMoverRequest`, `AgendaCriarLoteRequest` (`+ dataRepeticaoFim*`, `padraoRecorrencia = 1`: 0/1=Diária, 2=Semanal, 3=Mensal), `AgendaLoteResponse` (`totalCriados`, `eventos`), `TipoEventoResponse`, `OperadorResumo`, `FuncaoResumo`, `AgendaParticipanteResponse`

**Banco de Dados:**
- `IMPL_Agenda` (AGD_) — eventos
- `CC_TipoEvento` — tipos configuráveis
- `CC_AgendaParticipante` — participantes (unique AgendaId+ParticipanteId)
- `TBOPERADOR` — responsável + participantes (coluna `FuncaoId` usada no filtro por função)
- `CC_Funcao` — funções do filtro Função (leitura; Agenda nunca escreve)
- `IMPL_Projeto` — projeto opcional

**Migration:** `20260911215943_AgendaV2_Ajuste` — adiciona `AGD_TipoId` FK, cria `CC_AgendaParticipante`, cria `CC_TipoEvento`
- **Fase 1 (2026-09-14):** `20260914144751_AgendaConflitoHorarios` — índice composto `IX_IMPL_Agenda_Operador_DataInicio_DataFim` em `IMPL_Agenda` (`AGD_OperadorId`, `AGD_DataInicio`, `AGD_DataFim`); script idempotente `Migrations/Sql/AgendaConflitoHorarios_Idempotente.sql` (**aplicação manual — deploy não aplica migrations**)
- **Frontend:** `agenda.service.ts` exporta `ErroConflito` (`{ mensagem, conflitos, code }`) + `AgendaCriarLoteRequest.padraoRecorrencia?`; `AgendaEventoModalComponent` trata 409 via `conflitos` signal + `extrairConflitos()`/`tratarErroSalvar()` (exibe `alert-warning` com a lista) e 400 exibindo `body.mensagem` no modal; regras por tipo espelhadas (`regraFerias/regraComHorario/regraDiaUnico/regraPermitePadrao`, `aoAlterarTipo()` força `diaInteiro = true` e limpa repetição ao escolher Férias), **Férias = formulário mínimo (Título* + Data início* + Data fim* retorno full-width `col-md-12` + Responsável*; sem horas, sem repetição; linha "Dia inteiro" oculta via `*ngIf="!regraFerias()"` — dia inteiro implícito, forçado `true` no payload),** Repetir oculto p/ Férias e p/ dia único, Data fim obrigatória com hint "Data de retorno (obrigatório). Dia inteiro, sem horário e sem repetição." p/ Férias, select de Padrão (Diária/Semanal/Mensal) quando há repetição em tipo permitido, validação Férias ("defina a data de retorno") isenta da regra "Para vários dias, use Repetir até" (só Treinamento/Daily); grade com `cobreDia()` p/ span dia-inteiro (Férias linha única)

#### 7.1.4 Segurança
- Access token em memória (4h), refresh token em cookie HttpOnly `cc_refresh` (4h, rotativo)
- Rate limiting `validacao` (5/min por usuário) em todos endpoints
- `[Authorize]` obrigatório
- Validação server-side em todas operações de escrita (inclui sem sobreposição de horários do responsável — 409)

#### 7.1.5 Política de Autorização (Owner + Admin)
**Regra:** **Dono (`OperadorId` == JWT `sub`) OU Administrador (`perfil` = "Administrador")** podem editar, excluir ou mover eventos. Criar permanece permissivo (pode criar para terceiros). Participantes são somente leitura.

| Endpoint | Regra de Autorização | Resposta se negado |
|----------|---------------------|-------------------|
| `PUT /eventos/{id}` (Atualizar) | `isAdmin || evento.OperadorId === usuarioId` | **403** `ForbiddenException` ("Sem permissão para alterar este evento") |
| `DELETE /eventos/{id}` (Excluir) | `isAdmin || evento.OperadorId === usuarioId` | **403** `ForbiddenException` |
| `PATCH /eventos/{id}/mover` (Mover) | `isAdmin || evento.OperadorId === usuarioId` | **403** `ForbiddenException` |
| `POST /eventos` (Criar) | **Permissivo** — pode criar para terceiros | — |

**Detalhes adicionais:**
- `AtualizarEventoAsync` também impede transferir responsabilidade para terceiro: se `request.ResponsavelId !== evento.OperadorId && !== usuarioId` → 403.
- `IsAdmin()` helper verifica claim `perfil` = "Administrador" (ou role `Administrador`).
- Nova exception `ForbiddenException` (`Exceptions/ForbiddenException.cs`) para respostas 403 padronizadas.

**Frontend (reflete a mesma política):**
- `AgendaComponent`: sinal `isAdmin` (computed → `auth.getCurrentUser()?.perfil === 'Administrador'`); método `podeEditar(e)` retorna `true` se `e.operadorId === usuarioLogado || isAdmin()`; cards recebem classe `.agenda-evento--somente-leitura` quando `!podeEditar(e)` (cursor not-allowed, opacity 0.75, grayscale 0.4); clique abre edição só se `podeEditar(e)`.
- `AgendaEventoModalComponent`: `@Input() isAdmin`, `@Input() somenteLeitura`; `salvar()`/`excluir()` fazem early return se `somenteLeitura`; exibe banner "Somente leitura: apenas o responsável X ou um administrador pode editar este evento"; inputs desabilitados; botões "Salvar"/"Excluir" ocultos; `tratarErroSalvar()` trata 403 → "Sem permissão para alterar este evento".

#### 7.1.6 Roadmap Agenda
- **v1.x (atual):** CRUD completo, 3 visões, tipos/participantes, drag-drop mover, **regras rígidas por tipo + recorrência Diária/Semanal/Mensal via lote** (com `Recorrente`/`PadraoRecorrencia` gravados; Férias fora do lote — período simples linha única com span via `cobreDia()`)
- **v2.x (futuro):** integração Google Calendar (OAuth + ICS), notificações, MCP server para Agente IA

---

### 7.2 Módulo Central Executiva (Dashboard Executivo)

**Visão geral:** Painel do Diretor para gestores (`Administrador`), que consolida Implantação, equipes e pontos críticos sem abrir cada módulo. **Nenhum endpoint novo no backend** — o `ExecutivoDashboardService` (facade `forkJoin` com `catchError` por fonte) reutiliza 5 GETs existentes.

#### 7.2.1 Roteamento e autorização

- `features.routes.ts:10-13` — `path: 'executivo'`, `canActivate: [adminGuard]`, `loadChildren` de `executivo.routes` (sob `MainLayout`).
- `executivo.routes.ts` — `''` → `redirectTo: 'dashboard'`; `'dashboard'` → `ExecutivoDashboardComponent` (`title: 'Central Executiva'`).
- `admin.guard.ts` — sem sessão tenta refresh silencioso; `perfil !== 'Administrador'` → `'/'`; sem sessão válida → `/login?returnUrl=`.
- **Login (`login.component.ts:86-92`):** `resolverDestino()` — deep-link (`returnUrl` ≠ `'/'`/vazio) sempre respeitado; admin genérico → `/executivo`; comum → `/`.
- **Sidebar (`sidebar.component.ts:35-39,60`):** `LINK_CENTRAL_EXECUTIVA` (`/executivo`, `bi-speedometer2`) como primeiro item de Início, só com `hasRole('Administrador')`.

#### 7.2.2 Frontend (`/executivo/dashboard`)

**Arquivos:** `features/executivo/models/executivo.model.ts` · `features/executivo/data/modulos.registry.ts` · `features/executivo/services/executivo-dashboard.service.ts` · `features/executivo/pages/executivo-dashboard/` (`.ts`|`.html`|`.scss`)

| Bloco | Conteúdo (confirmado no código) |
|---|---|
| **Header (`app-page-header`, Lote B)** | `titulo="Painel do Diretor"`, `icone="bi-speedometer2"` (mantido), eyebrow removido; slot `actions` (`.executivo__controls`) com select de função + Limpar + Atualizar |
| **KPIs (6, clicáveis)** | total, em andamento (`?apenasEmAndamento=true`), concluídas (`?apenasConcluidas=true`), atrasadas (`?apenasAtrasadas=true`) → `/implantacao/tarefas`; bloqueadas → `/implantacao/kanban`; urgentes → `/implantacao/tarefas` |
| **Projetos em andamento (`projetosTop[]`, top 6)** | Cards com código, status (`corStatus()`/`rotuloStatus()`), badge "Atrasado" (`estaAtrasado()`), progresso, responsável, previsão; links Detalhe (`/implantacao/projetos/:id`) + Kanban (`/implantacao/kanban?projetoId=:id`) |
| **Kanban Total embutido** | `<app-implantacao-kanban>` (mesmo `KanbanComponent` da Implantação) + "Abrir em tela cheia" (`/implantacao/kanban`); SCSS anti-sobreposição (`overflow-x: auto`, `min-width: 0`, `ellipsis`/`overflow-wrap`) |
| **Gráficos (Chart.js)** | Barra "Tarefas por equipe" (top 6 funções: em andamento/atrasadas/concluídas) + doughnut "Panorama das tarefas" + linha "`N` projetos ativos · `N` atrasados · `N`h apontadas" |
| **Visão por módulo** | Implantação = real (`/implantacao/dashboard`, "`N` projetos ativos"); Financeiro = placeholder `emBreve` → `/visao-adm` ("Conteúdo interno · sem pendências operacionais"). Suporte/Compras/CRM removidos do `MODULOS_REGISTRY` (só módulos reais; novos voltam com entidade/endpoints próprios) |
| **Atenção imediata** | Bloqueadas (`/implantacao/kanban`), atrasadas (`/implantacao/tarefas?apenasAtrasadas=true`), urgentes (`/implantacao/tarefas`); vazio → "Tudo em dia" (`/implantacao/dashboard`) |
| **Tarefas críticas (até 6)** | Bloqueadas + urgentes não-bloqueadas por `dataPrevisao` (badge Bloqueada/Urgente, link Kanban) |
| **Próximas entregas (até 4) + agenda da semana (até 6, janela +7 dias)** | `geral.proximosPrazo[]` + `GET /agenda/eventos?inicio=agora&fim=+7d&funcaoId=N` |
| **Visão por equipe via `Funcao`** | Cards por função (`admin.funcoes[]` + `percentualConclusao` = concluídas/total; total, andamento, atrasadas, concluídas, progresso, até 3 responsáveis) |
| **Atalhos (6)** | Kanban Total, Kanban ADM (`/administrativo`), Agenda, Projetos, Cadastros, Admin (`/admin/dashboard`) |
| **Auto-refresh 30s** | `setInterval(() => carregar(true), 30000)` silencioso + botão Atualizar; timer e charts destruídos no `ngOnDestroy` |
| **Filtro por função** | `select` (Todas + `funcaoId`) no slot `actions` do header → `obter(funcaoId)`; `limparFiltro()` volta a `null` |

#### 7.2.3 Fontes de dados (reutilizadas, sem backend novo)

| Método | Rota | Uso na Central |
|---|---|---|
| `AdminDashboardService.obter(funcaoId?)` | `GET /api/v1/admin/dashboard?funcaoId=N` | Totais, `funcoes[]` (equipes), `atualizadoEm` |
| `DashboardService.obter()` (implantação) | `GET /api/v1/implantacao/dashboard` | Projetos ativos/atrasados, horas apontadas, `proximosPrazo[]` |
| `ProjetosService.listar({})` | `GET /api/v1/implantacao/projetos` | `projetosTop[]` (top 6 ativos, atrasados primeiro) |
| `TarefasService.listar({})` | `GET /api/v1/implantacao/tarefas` | Bloqueadas (`bloqueada`), urgentes (`prioridade === 3`), críticas |
| `AgendaService.listarEventos(agora, +7d, undefined, funcaoId)` | `GET /api/v1/agenda/eventos` | Agenda da semana |

Status final local (`STATUS_FINAL`): `Concluida/Concluido/Cancelada/Cancelado`. `ResumoExecutivo` inclui `projetosTop: ProjetoResumo[]` (não-finais, atrasados primeiro, top 6). Registro enxuto: só Implantação (real) + Financeiro (placeholder → `/visao-adm`); novos módulos só entram em `MODULOS_REGISTRY` com entidade/endpoints próprios. O `KanbanComponent` lê `?projetoId` no `ngOnInit` (`ActivatedRoute`) para pré-selecionar o projeto (deep-link da Central Executiva).

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
5. **Frontend**: envia `deploy\frontend\browser` para `Suporte_Front`.
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