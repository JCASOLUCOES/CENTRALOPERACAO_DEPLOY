---
title: "Estrutura da documentação e do monorepo"
description: "Convenções de leitura, organização documental, branches, pipeline e assistência do opencode."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# 00 — Estrutura, leitura e fluxo de trabalho

> Este documento explica como navegar e manter a documentação. Os fatos de produto estão em [`01-VISAO-GERAL.md`](./01-VISAO-GERAL.md); a composição técnica vigente está em [`02-ARQUITETURA.md`](./02-ARQUITETURA.md).
>
> A reorganização canônica está executada. Este documento usa o snapshot curado do working tree de 2026-09-24 e tem validade em 2026-09-25; o texto não representa execução de build, testes, QA, deploy ou smoke.

## 1. Como ler

### Entrada por perfil

| Perfil da tarefa | Leitura mínima |
|---|---|
| Primeira visita ao repositório | [`README.md`](./README.md) → este arquivo → [`01-VISAO-GERAL.md`](./01-VISAO-GERAL.md) |
| Alteração de tela ou API | este arquivo → [`06-COMPONENTES-FRONTEND.md`](./06-COMPONENTES-FRONTEND.md) / [`05-ENDPOINTS.md`](./05-ENDPOINTS.md) / [`07-SERVICES-BACKEND.md`](./07-SERVICES-BACKEND.md) → rotas/controllers reais |
| Alteração de JWT, cookie ou acesso | este arquivo → [`02-ARQUITETURA.md`](./02-ARQUITETURA.md) → [`03-REGRAS-NEGOCIO.md`](./03-REGRAS-NEGOCIO.md) |
| Deploy ou incidente | este arquivo → [`10-DEPLOY.md`](./10-DEPLOY.md) → [`09-TROUBLESHOOTING.md`](./09-TROUBLESHOOTING.md) |
| Integração de dados | este arquivo → [`02-ARQUITETURA.md`](./02-ARQUITETURA.md) → [`04-ESTRUTURA-DADOS.md`](./04-ESTRUTURA-DADOS.md) |
| Mudança de código com agentes | este arquivo → seção de agents/skills |

### Ordem de confiança

1. Código e configuração do working tree.
2. Documentos canônicos especializados para o assunto.
3. Documentos canônicos geralistas.
4. Materiais históricos, auditorias e planos.

Uma afirmação em um documento antigo não torna o comportamento atual. Em caso de divergência, confirme símbolo, rota, atributo de autorização e configuração antes de atualizar qualquer texto.

### Busca com `Ctrl+F`

Use termos estáveis, sem depender de numeração de seções:

- `autenticacao`, `JWT`, `cc_refresh`, `access token`, `refresh token`;
- `/api/v1`, `/api/rag-proxy`, `CORS`, `IIS`;
- `rotas`, `módulos`, `SQL Server`, `Google Sheets`, `AnythingLLM`;
- `branch`, `pipeline`, `BUILD_INFO`, `agents`, `skills`;
- `screens-data`, `documentação canônica`, `backup`.

Os links internes apontam para arquivos completos. Não crie nem mantenha links para âncoras profundas.

## 2. O monorepo real

O repositório reúne aplicação, documentação e operação no mesmo projeto Git:

```text
/
├── frontend/                    # uma aplicação Angular
│   ├── angular.json
│   ├── package.json
│   ├── server.ts               # runtime Express do SSR
│   ├── prerender-routes.txt
│   ├── public/
│   │   ├── favicon.ico
│   │   └── web.config           # fallback SPA do IIS
│   └── src/
│       ├── main.ts
│       ├── main.server.ts
│       ├── environments/
│       └── app/
│           ├── core/           # auth, guards, interceptor e serviços globais
│           ├── features/       # módulos de produto
│           ├── layout/         # shell principal
│           └── shared/         # componentes, configuração e utilitários
├── backend/
│   └── Central_BackEnd/        # uma API ASP.NET Core
│       ├── Program.cs
│       ├── Controllers/
│       ├── Services/
│       ├── Models/
│       ├── Data/
│       ├── Dtos/
│       ├── Migrations/
│       ├── wwwroot/
│       ├── Properties/
│       └── appsettings*.json
├── docs/                       # documentação canônica, complementar e backup
├── scripts/                    # validação, smoke, deploy e extração
├── .github/workflows/          # automações do repositório
├── .opencode/
│   ├── agents/                  # agents do opencode
│   └── skills/                  # skills operacionais do opencode
├── .agents/
│   └── skills/
│       └── frontend-design/     # skill de design frontend
└── AGENTS.md                   # regras automáticas do projeto
```

O caminho real do backend é `backend/Central_BackEnd/`. Não use `backend/src/Central_BackEnd/`: esse caminho aparece em textos antigos e não corresponde ao working tree atual.

## 3. Documentação canônica

O conjunto canônico possui **12 arquivos**, enumerados na matriz de [`README.md`](./README.md): este `README.md` e os onze arquivos de `00-ESTRUTURA.md` a `10-DEPLOY.md`. Ele se divide em:

- **Entrada e fundação:** `README.md`, `00-ESTRUTURA.md`, `01-VISAO-GERAL.md` e `02-ARQUITETURA.md`.
- **Domínio e dados:** `03-REGRAS-NEGOCIO.md` e `04-ESTRUTURA-DADOS.md`.
- **Implementação e QA:** `05-ENDPOINTS.md`, `06-COMPONENTES-FRONTEND.md`, `07-SERVICES-BACKEND.md` e `08-HISTORIAS-TELAS.md`.
- **Operação:** `09-TROUBLESHOOTING.md` e `10-DEPLOY.md`.

A superfície HTTP está em `05-ENDPOINTS.md`; o frontend, em `06-COMPONENTES-FRONTEND.md`; o backend, em `07-SERVICES-BACKEND.md`; e os cenários de QA, em `08-HISTORIAS-TELAS.md`.

### Regras canônicas

- Um assunto por arquivo; não transformar um documento histórico em uma lista de novos capítulos.
- Atualizar é substituir o trecho obsoleto, não anexar conteúdo sem remover o anterior.
- Manter cerca de 600 linhas como limite por volume; subdividir antes de crescer sem função.
- Links devem apontar para arquivos, nunca para âncoras profundas.
- Nomes de rotas, cookies, flags, classes, pastas e URLs devem ser conferidos no código antes da publicação.
- Não registrar senhas, chaves, tokens, credenciais ou connection strings com credenciais.
- Ao mudar apenas documentação, não alterar código, automações ou arquivos de configuração.

## 4. Materiais complementares e backup não canônico

A reorganização canônica está executada. `docs/backup/2026-09-24/` é um snapshot curado do working tree em 24/09, destinado a contexto e auditoria. Ele não é imutável e não é necessariamente igual ao `HEAD`; código e configuração atuais permanecem a fonte factual.

O snapshot inclui os documentos anteriores de índice, visão geral, negócio, telas, histórias, auditoria de endpoints, autenticação, integrações, Implantação, frontend e deploy, incluindo seus volumes em `telas/`. Quando uma fonte arquivada for útil como contexto, o link deve apontar para `./backup/2026-09-24/...`.

Fora do backup, [`ARQUITETURA-MULTI-WEBAPP.md`](./ARQUITETURA-MULTI-WEBAPP.md) e [`PLANO-KANBAN-GERAL.md`](./PLANO-KANBAN-GERAL.md) são os únicos materiais complementares restantes. Eles não ampliam o conjunto canônico. As pastas `docs/Projeto-*` (Agenda, BD e Implantação) foram removidas do repositório por serem material de projeto superado; o que ainda é válido delas já está nos documentos canônicos.

## 5. Branches, working tree e pipeline

### Branches

- `master` é a branch de release estável.
- `developer` é a branch de desenvolvimento integrada.
- Tags `vX.Y.Z` são releases imutáveis e substituem branches manuais de backup.
- Branches de backup encontradas localmente não participam do fluxo diário.

O working tree pode conter mudanças não commitadas e é a baseline considerada. `scripts/validate.ps1` mostra a situação Git e alerta sobre alterações, mas o alerta de working tree sujo não equivale a falha de build.

### Fluxo obrigatório documentado

```text
subir interno
  → validar
  → git add/commit/push em developer
  → validar novamente
  → empacotar
  → publicar com backup
  → smoke
```

Comandos de referência:

```powershell
# Gate de build; não sobe servidores nem publica no IIS
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1

# Empacotamento; ainda não publica no IIS
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend 1 -BuildBackend 1 -Publicar 0"

# Publicação do pacote já empacotado, com backup
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend 0 -BuildBackend 0 -Publicar 1 -Backup 1"

# Smoke
powershell -ExecutionPolicy Bypass -File .\scripts\smoke.ps1
```

Regras operacionais relevantes:

- Não iniciar publicação sem gate `validar` verde no commit atual.
- `scripts/deploy/deploy.ps1` grava `deploy/BUILD_INFO.txt` com hash e branch quando constrói o pacote.
- A publicação sem rebuild aborta se o hash de `BUILD_INFO.txt` divergir do `HEAD`.
- A publicação deve usar `-Backup 1` no fluxo canônico.
- O mirror do backend exclui `appsettings*.json`; a configuração existente no servidor é preservada.
- No script, `[Nullable[bool]]$BuildFrontend = $null` e `[Nullable[bool]]$BuildBackend = $null` fazem o build opcional perguntar quando não forem informados; `[bool]$Backup = $false` é o parâmetro de backup. Em chamadas PowerShell que usam valores `$true`/`$false`, use `-Command` e escape o `$` para o shell externo; os exemplos acima usam `1`/`0` para evitar a ambiguidade. A forma com backup explícito é:

```powershell
powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend `$false -BuildBackend `$false -Publicar `$true -Backup:`$true"
```

No comando acima, o escape impede que o shell externo interpole os valores; a opção do script é `-Backup:$true` (o valor não é um segredo).

- O script contém uma credencial padrão para autenticação no IIS; o valor não é reproduzido neste documento.
- Estes comandos estão documentados; sua execução não é afirmada neste conjunto.

## 6. Agents e skills do opencode

Os agents estão em `.opencode/agents/`. As skills operacionais do opencode estão em `.opencode/skills/`; a skill `frontend-design` é uma definição separada em `.agents/skills/frontend-design/`. `AGENTS.md` define quando a delegação automática deve ocorrer.

### Agents

| Agent | Responsabilidade |
|---|---|
| `docs-writer` | Sincronizar Markdown com o código, sem alterar aplicação |
| `content-editor` | Editar conteúdo do wiki em `*.data.ts` |
| `angular-engineer` | Alterações Angular e aplicação da skill de design |
| `dotnet-engineer` | Alterações ASP.NET Core, EF Core, JWT e controllers |
| `security-auditor` | Revisão somente leitura de segurança |

### Skills

| Skill | Localização | Uso |
|---|---|---|
| `subir-interno` | `.opencode/skills/subir-interno/` | Iniciar frontend e backend em desenvolvimento |
| `validar` | `.opencode/skills/validar/` | Executar o gate de build por `scripts/validate.ps1` |
| `deploy-limpo` | `.opencode/skills/deploy-limpo/` | Orquestar validação, empacotamento, publicação e smoke |
| `frontend-design` | `.agents/skills/frontend-design/` | Diretrizes para criação e reformulação visual |

Agentes não ampliam o escopo automático: uma tarefa de código continua sujeita às permissões e aos limites explícitos do pedido.

## 7. `scripts/screens-data.json`

O arquivo `scripts/screens-data.json` é um **inventário auxiliar gerado**, usado para localizar candidatos e comparar uma extração anterior.

Ele não é fonte factual porque:

- a extração é textual e pode omitir rotas eager, métodos não `async` ou formatos de controller não cobertos pela expressão regular;
- pode conter redirecionamentos, componentes antigos ou referências incompletas;
- não substitui `app.routes.ts`, `features.routes.ts`, `*.routes.ts` e os controllers;
- não descreve autorização, corpos de requisição ou comportamento de runtime.

A geração atual remove timestamp variável e normaliza caminhos para relativos ao repositório.

Use-o como pista. Confirme toda informação no código antes de documentar, indexar ou planejar uma alteração.

## 8. Estado da reorganização

A reorganização canônica está executada. O conjunto vigente é formado pelos 12 arquivos da matriz; `docs/backup/2026-09-24/` é o snapshot curado descrito na seção 4 e permanece não canônico. O código e a configuração do working tree continuam sendo a fonte factual quando houver divergência.
