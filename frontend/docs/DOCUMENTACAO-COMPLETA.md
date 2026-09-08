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

### Política de branches e tags (3 repositórios)

Os 3 repositórios (`JCASOLUCOES/CENTRALOPERACAO_DEPLOY`,
`JCASOLUCOES/Central-Conhecimento`, `JCASOLUCOES/CCBAckend`) compartilham
a mesma convenção:

| Branch / Tag | Propósito | Onde |
|---|---|---|
| `main` | **Produção** — espelho do que está rodando no IIS 192.168.2.130. Recebe merges via PR de `developer` (com aprovação). Branch padrão no GitHub. | front, back, deploy |
| `developer` | **Desenvolvimento** — onde o JCASOLUCOES mexe no dia-a-dia. Sem proteção. | front, back, deploy |
| `sara` | Branch pessoal da Sara (baseada em `developer`). Sem proteção. | front, back, deploy |
| `samuel` | Branch pessoal do Samuel (baseada em `developer`). Sem proteção. | front, back, deploy |
| `projeto-implantacao` | Branch **ativa** com o módulo IMPLANTAÇÃO/PROJETOS (v1.1.0). | front, back, deploy |
| `v0.7.0`, `v1.1.0`, ... | **Tags** que marcam versões estáveis já em produção (substituem a ideia de "branch backup"). | front, back, deploy |

**Proteção recomendada de `main`** (configurar via `Settings → Branches → Add rule`):

- ☑ Require a pull request before merging (1 aprovação)
- ☑ Require conversation resolution before merging
- ☑ Require linear history
- ☐ Allow force pushes (deixe **desmarcado**)

**Como criar uma branch nova que "englobe o projeto todo":**

Hoje, é preciso criar a branch nos 3 repos separadamente (a estrutura
atual é monorepo mas com sub-repos como pastas independentes). Quando
a Etapa 4 (reorganização como monorepo com submódulos git) já foi
executada, e o script `branch-todos.ps1` na raiz do monorepo cria
a branch em todos com 1 comando.

```bash
# No frontend (submódulo)
cd frontend
git checkout developer && git pull
git checkout -b sara && git push -u origin sara
cd ..

# No backend (submódulo)
cd backend
git checkout developer && git pull
git checkout -b sara && git push -u origin sara
cd ..

# No deploy (raiz)
cd ..
git checkout master && git pull
git checkout -b sara && git push -u origin sara
```

**Como versionar uma release:**

```bash
# Nos 3 repos (depois de merge em main):
git checkout main && git pull
git tag -a v0.X.Y -m "v0.X.Y - descricao"
git push origin v0.X.Y
```

### Estrutura de pastas (monorepo `CENTRALOPERACAO_DEPLOY`)

A raiz do monorepo é `Central-Conhecimento-developer/`, que abriga os dois
subprojetos como repos embutidos (listados no `.gitignore` da raiz).
**Branch padrão em todos: `main`** (= produção = espelho do IIS 130);
**branch de dev: `developer`**.

```
Central-Conhecimento-developer/        <- raiz do monorepo (repo CENTRALOPERACAO_DEPLOY, branch main/master)
├─ frontend/                            <- submódulo git (JCASOLUCOES/Central-Conhecimento, branch main/developer)
│                                       <- código Angular 18 direto na raiz
└─ backend/                             <- submódulo git (JCASOLUCOES/CCBAckend, branch main/developer)
   └─ Central_BackEnd/                  <- projeto .NET (namespace Central_BackEnd)
```

> `frontend/` e `backend/` são **submódulos git** registrados em `.gitmodules`
> na raiz. Cada um aponta para seu repositório remoto. A raiz agrega
> `deploy.ps1` + `deploy.bat`/`deploy.local.bat` para publicar direto no
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

> ⚠️ O `appsettings.json` do repositório está **sanitizado** (placeholders), seguindo a regra de
> "nunca versionar segredos". A config real (banco/JWT/Google) fica guardada **apenas no servidor**
> (`C:\inetpub\wwwroot\Suporte_Back\appsettings*.json`), preservada pelo `deploy.ps1`.
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

Gerenciador de **projetos, tarefas e clientes** compartilhado entre as equipes
**IMPLANTAÇÃO** e **CIAA** (Centro de Inovação, Automação e IA). Não é
módulo separado — é um **único gerenciador** com comportamento específico
conforme o tipo do projeto.

> **Regra de ouro**: UM sistema, UM Kanban, UM sistema de tarefas, UM
> Dashboard, **várias equipes**, **vários tipos de projeto**.

### 6.5.1. Entidades principais

| Entidade | Descrição |
|---|---|
| `IMPL_Cliente` | Cadastro de clientes (vinculado a implantações). |
| `IMPL_Equipe` | Equipes (`IMPLANTACAO`, `CIAA`). Cada equipe tem um **prefixo de código** (`IMP`, `CIAA`). |
| `IMPL_MembroEquipe` | Vínculo N:N entre `Operador` e `Equipe`. |
| `IMPL_TipoProjeto` | `CLIENTE`, `CARTEIRA`, `INTEGRACAO` (vinculados a `IMPLANTACAO`); `PROJETO_CIAA` (vinculado a `CIAA`). Cada tipo tem `clienteObrigatorio`. |
| `IMPL_Etapa` | Etapas configuráveis (vinculadas opcionalmente a um `TipoProjeto`). Ex.: KICKOFF, PARAMETRIZAÇÃO, GO LIVE (para IMPL); LEVANTAMENTO, DESENVOLVIMENTO, PUBLICAÇÃO (para CIAA). |
| `IMPL_ColunaKanban` | Colunas do Kanban. Padrão: BACKLOG, A FAZER, EM ANDAMENTO, HOMOLOGAÇÃO, CONCLUÍDO. Limite: 8 colunas. |
| `IMPL_Projeto` | Projeto principal. Tem `codigo` (gerado automaticamente, ex.: `IMP-0001`, `CIAA-0001`). |
| `IMPL_Tarefa` | Unidade de execução dentro de um projeto. Tem status, prioridade, ordem, coluna Kanban. |
| `IMPL_ComentarioTarefa` | Comentários / histórico da tarefa. |

### 6.5.2. Tabelas IMPL_* necessárias no SQL Server de homolog

> ⚠️ **AÇÃO MANUAL NECESSÁRIA** — o `deploy.ps1` **não** aplica migrations.
> Em ambiente de homologação (192.168.2.154 / dbBUSINESS_HML), criar
> manualmente as 9 tabelas abaixo antes de subir o backend para a v1.1.0.
> Os scripts DDL estão em `backend/Central_BackEnd/Migrations/20260904194350_ImplantacaoInit.cs`
> (método `Up`) ou podem ser gerados via
> `dotnet ef migrations script --idempotent -o ImplantacaoInit.sql`.

| # | Tabela | Prefixo | Propósito |
|---|---|---|---|
| 1 | `IMPL_Cliente` | `CLI_` | Cadastro de clientes (CNPJ, contato, observacao, ativo, auditoria) |
| 2 | `IMPL_Equipe` | `EQP_` | Equipes (nome, prefixo_codigo, ativa) — seed: `IMPLANTACAO`/`CIAA` |
| 3 | `IMPL_MembroEquipe` | `MBE_` | Vínculo N:N operador↔equipe |
| 4 | `IMPL_TipoProjeto` | `TPP_` | Tipos: `CLIENTE`/`CARTEIRA`/`INTEGRACAO`/`PROJETO_CIAA` |
| 5 | `IMPL_Etapa` | `ETP_` | Etapas configuráveis (vinculadas a um tipo de projeto) |
| 6 | `IMPL_ColunaKanban` | `CLK_` | Colunas do Kanban (limite 8; 5 padrão já seeded) |
| 7 | `IMPL_Projeto` | `PRJ_` | Projeto principal (codigo, equipe, tipo, cliente opcional, status, prioridade) |
| 8 | `IMPL_Tarefa` | `TRF_` | Tarefas (titulo, projeto, etapa, coluna Kanban, responsavel, status) |
| 9 | `IMPL_ComentarioTarefa` | `CMT_` | Comentários / histórico da tarefa |

Após criar, validar:

```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'IMPL_%' ORDER BY TABLE_NAME;
-- esperado: 9 linhas
```

### 6.5.3. Geração automática de código de projeto

O `ProjetoService.ProximoCodigoAsync(equipeId)` consulta o `PrefixoCodigo` da
equipe (`IMP` para IMPLANTACAO, `CIAA` para CIAA) e gera o próximo número
sequencial:

- `IMPLANTACAO` → `IMP-0001`, `IMP-0002`, ...
- `CIAA` → `CIAA-0001`, `CIAA-0002`, ...

Endpoint: `GET /api/v1/implantacao/projetos/proximo-codigo?equipeId=N`.

### 6.5.4. Regras de validação

- `CLIENTE`, `CARTEIRA`, `INTEGRACAO` → **cliente obrigatório** (`clienteObrigatorio = true` no seed)
- `PROJETO_CIAA` → **cliente opcional** (`clienteObrigatorio = false`)
- Kanban: **máximo 8 colunas** ativas
- Colunas com `padrao = true` **não podem ser excluídas**

### 6.5.5. Endpoints backend (`/api/v1/implantacao/`)

| Verbo | Rota | Descrição |
|---|---|---|
| GET/POST/PUT/DELETE | `/clientes` | CRUD de clientes |
| GET/POST/PUT/DELETE | `/equipes` | CRUD de equipes |
| POST/DELETE | `/equipes/{id}/membros` | Vínculo N:N com Operadores |
| GET/POST/PUT/DELETE | `/tipos-projeto` | CRUD de tipos |
| GET/POST/PUT/DELETE | `/etapas` | CRUD de etapas |
| GET/POST/PUT/DELETE | `/colunas-kanban` | CRUD de colunas |
| POST | `/colunas-kanban/reordenar` | Reordenar colunas (drag-drop) |
| GET/POST/PUT/DELETE | `/projetos` | CRUD de projetos |
| GET | `/projetos/proximo-codigo?equipeId=N` | Gera o próximo código |
| PATCH | `/projetos/{id}/status` | Mudar status (Backlog/Concluido/etc) |
| GET/POST/PUT/DELETE | `/tarefas` | CRUD de tarefas |
| PATCH | `/tarefas/{id}/coluna` | Mover tarefa entre colunas (drag-drop backend) |
| POST | `/tarefas/{id}/comentarios` | Adicionar comentário |
| GET | `/dashboard?equipe=IMPLANTACAO\|CIAA` | KPIs agregados |

Todos com `[Authorize]`. Rate limiting `validacao` (5/min por usuário)
para escrita. Padrão: `api/v{version:apiVersion}/...` com versionamento.

### 6.5.6. Páginas frontend (`/implantacao/*`)

| Rota | Componente | Função |
|---|---|---|
| `/implantacao/dashboard` | `DashboardComponent` | KPIs (6 cards grandes), chips de filtro por equipe (Todas/IMPLANTACAO/CIAA), distribuição por equipe em tabela, próximos prazos, seções específicas por equipe |
| `/implantacao/projetos` | `ProjetosComponent` | Lista em grid de cards (borda lateral colorida pela equipe), busca, filtros (equipe/status), código em mono, progresso com gradiente IMPL↔CIAA, meta com responsável e prazo |
| `/implantacao/projetos/:id` | `ProjetoDetalheComponent` | Hero com gradiente (azul para IMPLANTACAO, violeta→magenta para CIAA), breadcrumb back, abas (Visão/Tarefas/Histórico), grid 2 colunas com detalhes e KPIs de tarefas |
| `/implantacao/tarefas` | `TarefasComponent` | Tabela com ID mono (T123), atalhos (Todas/Atrasadas/Em andamento/Concluídas), filtros (equipe/projeto), prioridade colorida por nível |
| `/implantacao/agenda` | `AgendaComponent` | **v1.3.0** — 3 visões (Dia/Semana/Mês), linha vermelha "agora", filtros chips (Todas/Só minhas + por operador), modal de criar/editar com 12 campos |
| `/implantacao/equipe` | `EquipeComponent` | **v1.3.0** — Grid de cards + drawer lateral de detalhes, edição do perfil apenas do próprio usuário |
| `/implantacao/clientes` | `ClientesComponent` | Formulário inline com máscara de CNPJ, tabela com badge de status Ativo/Inativo |
| `/implantacao/cadastros` | `CadastrosComponent` | 4 abas (Equipes/Tipos/Etapas/Colunas) com formulários inline e tabelas com team badges coloridos |

### 6.5.6.1. Design system do módulo (frontend)

CSS próprio em `frontend/src/app/wiki/pages/implantacao/implantacao.styles.scss`
(importado via `styleUrl` em cada componente).

**Identidade por equipe**:
- **IMPLANTAÇÃO** = azul institucional (`--imp-eq-impl: #0f4c81`)
- **CIAA** = violeta (`--imp-eq-ciaa: #7c3aed`)

Cards de projeto ganham **borda lateral colorida** de 4px conforme a equipe.

**Tipografia**:
- Display: **Space Grotesk** 800 (títulos de seção e KPIs)
- Body: **Inter** 500-600 (textos corridos)
- Data: **IBM Plex Mono** (códigos de projeto, IDs de tarefa, prazos)

**Signature element**: **barra de progresso** com gradiente `IMPLANTACAO → CIAA`,
8px de altura, com a % sobreposta em mono. É o dado mais importante de um projeto
e aparece em cards e no hero do detalhe.

**Status colors** (chips com bolinha à esquerda):
- Backlog: cinza / A Fazer: azul / Em Andamento: âmbar / Homologação: violeta /
  Concluído: verde / Bloqueado: vermelho / Cancelado: slate

**Filtros** são sempre **chips** clicáveis (não dropdowns), com a cor da equipe
ativada quando selecionada. KPIs no topo viram **números grandes** (2.5rem, Space Grotesk 800)
com label pequena em uppercase. Empty states são orientados ("Crie o primeiro projeto…") em vez de mudos.

### 6.5.6.2. Seed de dados de exemplo (em `Development`)

O backend tem seed automático em `Program.cs` quando `IsDevelopment()`:

- **1 operador**: `admin` (com perfil `A`)
- **2 equipes**: IMPLANTACAO (prefixo `IMP`) e CIAA (prefixo `CIAA`)
- **5 colunas Kanban padrão**: BACKLOG, A FAZER, EM ANDAMENTO, HOMOLOGACAO, CONCLUIDO
- **4 tipos de projeto**: CLIENTE/CARTEIRA/INTEGRACAO (IMPL, cliente obrigatório) + PROJETO_CIAA (CIAA, cliente opcional)
- **13 etapas**: 6 para IMPLANTACAO (KICKOFF, PARAMETRIZACAO, TREINAMENTO, HOMOLOGACAO, GO LIVE, ACEITE) + 7 para CIAA (LEVANTAMENTO, DESENHO, DESENVOLVIMENTO, TESTES, HOMOLOGACAO, PUBLICACAO, MONITORAMENTO)
- **3 clientes**: Tech Solutions S/A, Indústria Aurora Ltda, Grupo Vértice
- **2 projetos fakes**:
  - **IMP-0001** — *Implantação Tech Solutions S/A* (60% concluído, Em Andamento, prioridade Alta, 7 tarefas distribuídas pelas colunas, 1 tarefa BLOQUEADA aguardando retorno do banco sobre layout CNAB, 2 comentários de contexto)
  - **CIAA-0001** — *Agente IA — Classificação de Chamados* (35% concluído, Em Andamento, 6 tarefas, 1 comentário sobre acurácia do prompt)

Esses dados ficam em memória (InMemory) e somem ao reiniciar o backend.
Em produção (SQL Server), as tabelas precisam ser criadas via
`Migrations/Sql/ImplantacaoInit.sql` — ver § 6.5.2.

### 6.5.7. Agenda compartilhada (v1.3.0)

Tabela nova `IMPL_Agenda` com eventos compartilhados pelas equipes. Tipos: `Reuniao`,
`Treinamento`, `Atendimento`, `Pessoal`, `Outro` (cada um com cor institucional).
Visibilidade: `Publico` (todos veem), `Equipe` (mesma equipe do autor), `Privado`
(só o dono, admin vê metadata).

Endpoints (`/api/v1/implantacao/agenda`):
- `GET /agenda?inicio=&fim=&operadorId=&visibilidade=&projetoId=&take=`
- `GET /agenda/{id}`
- `POST /agenda`
- `PUT /agenda/{id}` (somente dono ou admin)
- `DELETE /agenda/{id}` (somente dono ou admin)
- `GET /agenda/ics/{operadorId}?inicio=&fim=` — export ICS (RFC 5545)

UI: `/implantacao/agenda` com 3 visões (Dia / Semana / Mês), linha vermelha
marcando "agora" no modo Dia, filtros chips, modal com 12 campos. Mapa detalhado
em `MODULO-IMPLANTACAO-MAP.md` § 4.

### 6.5.8. Diretório de Equipe (v1.3.0)

Tabela nova `IMPL_MembroPerfil` (descrição, telefone, ramal) cruzada com
`tbfuncionario` (dbBUSINESS_HML, somente leitura) e `IMPL_MembroEquipe` para
mostrar em quais equipes (IMPL / CIAA) cada pessoa atua.

Endpoints (`/api/v1/implantacao/equipe`):
- `GET /equipe/diretorio?equipe=&take=`
- `GET /equipe/perfil/{funcionarioId}`
- `PUT /equipe/perfil/{funcionarioId}` (somente o próprio usuário ou admin)

UI: `/implantacao/equipe` com grid de cards (avatar colorido pela equipe,
chips de equipe, descrição truncada) + drawer lateral. Botão "Editar perfil"
só aparece se o card é do próprio usuário (match por `tbfuncionario.OPERADOR_ID`).

### 6.5.9. Roadmap do módulo

- **v1.0.0 (entregue)**: Dashboard, Projetos, Tarefas, Clientes, Cadastros.
- **v1.1.0 (entregue, tag)** — Kanban UI com `@angular/cdk` drag-drop, seed de 2 projetos fakes.
- **v1.2.0 (entregue, backend)** — Legacy data service + FKs lógicas para `tbcliente` e `tbchamado`.
- **v1.3.0 (em desenvolvimento)** — **Agenda compartilhada** + **Diretório de Equipe** + dropdowns de legado. Migration `AddAgendaAndPerfis` ainda não aplicada em homolog.
- **v2.x (futuro)**: integração com Google Calendar (OAuth + ICS), recorrência funcional com expansão de eventos, MCP server para Agente IA.

### 6.5.10. Branch `projeto-implantacao`

Esta branch foi criada com `branch-todos.ps1` (criada a partir de
`developer`) e está em **fase de desenvolvimento** até virar v1.1.0 em
produção. Para subir manualmente, ver seção 8.

### 6.5.11. Smoke test executado (backend em `localhost:1009` com InMemory)

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
| `/database` | `DatabaseShellComponent` | Shell com 7 abas + banner de status (verde conectado / vermelho desconectado) |
| `/database/visao-geral` | `DbVisaoGeralComponent` | 9 cards (servidor, tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers) + detalhes |
| `/database/explorador` | `DbExploradorComponent` | Árvore de tabelas + painel de detalhe (colunas + índices) + busca global |
| `/database/relacionamentos` | `DbRelacionamentosComponent` | Confirmados (linha azul contínua) × Possíveis (linha violeta tracejada) com score e motivos + busca por coluna |
| `/database/diagrama` | `DbDiagramaComponent` | SVG próprio, layout BFS, profundidade 1-5, setas: azul contínua / violeta tracejada |
| `/database/consultas` | `DbConsultasComponent` | Editor SQL (SELECT/WITH), paginação 25/50/100/500, timeout 5/15/30/60s |
| `/database/diferencas` | `DbDiferencasComponent` | Resumo + lista de divergências SQL × Markdown (placeholder, v2.x) |
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
| Layout | Header (nav Início / Fluxo de Atendimento / Ferramentas / Acessos / Cursos, breadcrumb, busca via `BuscaService` e dropdown do usuário com BEM `user-nav__*`) + sidebar (Inicio, Atendimento, Ferramentas, Administrativo, Integração) |
| Home | Página inicial com panorama e atalhos principais |
| Cursos | Catálogo de cursos por plataforma (Alura, YouTube, Curso em Vídeo, Microsoft Learn, Cisco, Fundação Bradesco, Postman Academy, Documentação/sites) e por área de conhecimento (9 trilhas), com detalhe e player embutido para YouTube. Canais/handles validados; cursos com canal inexistente foram removidos |
| Ferramentas | Central de utilidades, busca e filtro por categoria |
| Acessos | Cards de empresas, busca (controlada por `BuscaService`), modal de senha (aberto via `abrirSenhaModal()`, que fecha a busca com `buscaService.fecharBusca()` antes de abrir e garante **instância única** do modal — dismiss em `ngOnDestroy()`) → modal de detalhe; credenciais TS/Banco/VPN |
| Trilhas | "Como resolver esse problema?", dicas de SQL / Rede / Infra (redesign `.tdh`) — agrupados na seção Atendimento da sidebar |
| Visão ADM | Procedimentos administrativos por setor (Financeiro, RH, Comercial) com busca, detalhe e impressão + **Central de Utilidades** (favoritos, últimos utilizados, busca, categorias, grade/lista e contador de acessos) |
| Fraseologia | Fluxo de atendimento e fraseologias; copiar mensagem para área de transferência (clipboard API + fallback `execCommand`) |
| **Implantação / Projetos** (v1.1.0) | Gerenciador único de **Projetos / Tarefas / Clientes / Cadastros** compartilhado pelas equipes **IMPLANTAÇÃO** e **CIAA**. Filtro por equipe (Todas / Implantação / CIAA). Tipos: `CLIENTE` (cliente obrigatório), `CARTEIRA`, `INTEGRAÇÃO`, `PROJETO_CIAA` (cliente opcional). Código de projeto gerado por prefixo da equipe (`IMP-0001`, `CIAA-0001`). Ver [seção 6.5](#65-módulo-implantação--projetos-v110) |

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

## 8. Deploy em IIS

O deploy é automatizado pelo script **`deploy.ps1`** na raiz do repositório
(gera `deploy/backend` e `deploy/frontend`), e o passo a passo completo está em
**`docs/DEPLOY.md`**. Resumo:

1. `powershell -ExecutionPolicy Bypass -File .\deploy.ps1` — roda `npm run build`
   (frontend) + `dotnet publish -c Release` (backend) e empacota em `deploy/`.
2. **Credenciais interativas**: o script exibe o servidor e o usuário padrão
   (`JCASRV-SUP (padrao)`), pede confirmação/alteração do usuário e em seguida
   a senha (`Read-Host -AsSecureString`). Sem senha hard-coded.
3. **Backup automático** do IIS atual em `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`.
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
- [x] **Nunca versionar segredos**: `deploy.ps1` sem senha hard-coded; `appsettings*.json` ignorados no
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
    - **Segredos/deploy**: senha do servidor **removida** do `deploy.ps1` (agora default `JCASRV-SUP` + `Read-Host -AsSecureString`); o script exibe servidor e usuário com `(padrao)`, pede confirmação e senha separadamente; feedback explícito de preservação de `appsettings*.json` (`mantido intacto` / `AVISO: nao encontrado`); novo **`.gitignore` na raiz** ignorando `deploy/` e `appsettings*.json`; criado `appsettings.sample.json`.
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
| `deploy-limpo` | `.opencode/skills/deploy-limpo/SKILL.md` | Ao pedir "deploy limpo"/"gerar deploy"/"publicar o sistema" — roda `deploy.ps1` e publica no IIS |
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