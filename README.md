# Central de Operação (Monorepo) — JCA Soluções

Portal interno unificado que reúne ferramentas, trilhas de conhecimento, cursos, gestão de acessos e o módulo de controle de projetos/implantação para a equipe de suporte.

---

## 📂 Estrutura do Monorepo

Este repositório (`JCASOLUCOES/CENTRALOPERACAO_DEPLOY`) é a fonte única do sistema, integrando frontend e backend.

```text
Central-Conhecimento-developer/
├── docs/                 # Documentação unificada (entrada: docs/README.md)
├── scripts/              # Scripts de utilidade (Deploy, Extração de metadados)
├── frontend/             # Angular 18 (standalone + SSR)
│   └── src/app/features/ # Módulos lazy (Gestor/executivo removidos em 24/09/2026)
└── backend/              # ASP.NET Core 8 (Web API)
    └── Central_BackEnd/  # Controllers, Services e EF Core
```

---

## 🛠️ Stack Tecnológica

### Frontend
- **Angular 18** (Componentes standalone, SSR/Prerender)
- **Bootstrap 5 + ng-bootstrap 17**
- **Lazy Loading** em todas as rotas de features
- **JWT Auth** (Tokens de 4h em memória, Refresh em cookie HttpOnly)
- **Angular CDK Drag & Drop** para Kanban interativo

### Backend
- **ASP.NET Core 8** (Web API RESTful)
- **EF Core 8** (InMemory para desenvolvimento, SQL Server para produção)
- **Google Sheets API** para acervo de empresas
- **Rate Limiting** e **Brute Force Guard** integrados
- **Automatic team/role assignment** via Função/Perfil (Operadores)

---

## 🚀 Desenvolvimento Local

### 1. Requisitos
- Node.js 20+
- .NET SDK 8.0+
- Acesso à rede interna (para Google Sheets API)

### 2. Rodando o sistema
Para subir ambos simultaneamente via CLI:
No diretório raiz, utilize o comando opencode **"subir interno"** ou execute manualmente:

**Backend:**
```powershell
cd backend/Central_BackEnd
dotnet run
```
Porta padrão: `http://localhost:1009` (Swagger disponível)

**Frontend:**
```bash
cd frontend
npm install
ng serve
```
Porta padrão: `http://localhost:4200`

**Ambiente Development:** o backend pode criar operadores de teste previsíveis; não publique nem reutilize essas credenciais fora do local.

**Homolog SQL:** usuários reais de `192.168.2.154` / `dbBUSINESS_HML`.

**Interruptor:** `appsettings.Development.json` → `Database:UseSqlServer` (`true` = homolog, `false` = InMemory).

### 3. Fluxo ao concluir uma tarefa

```
subir interno  →  validar  →  git commit/push  →  validar  →  deploy limpo
   (testa)        (builda)     (grava)            (confere)    (IIS + smoke)
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
# se OK, revisar e stage somente os arquivos intencionais:
git status --short
git add -- <arquivos-intencionais>
git commit -m "fix: ..."
git push origin developer
powershell -ExecutionPolicy Bypass -File .\scripts\validate.ps1
# skill "deploy limpo" (ou etapas manuais em docs/10-DEPLOY.md)
```

---

## ✨ Funcionalidades Atuais

### 🧭 Navegação reorganizada (sidebar, header, Home, JOTA)
- **Sidebar** (`header-nav.config.ts`): seções Início (Visão Geral `/` + Agenda), SUPORTE (resolver, fraseologia, modelos, trilhas), Implantação, Ferramentas, Conhecimento, JCA (inclui Kanban ADM `hasRole('F')` → `/implantacao/kanban?perfil=F`) e Administração. A rota `/admin` redireciona para `/admin/cadastros`; não há rota ativa `/admin/dashboard`. **Módulo Gestor, Central Executiva `/executivo` e `/administrativo` removidos/desativados** (Gestor e `features/executivo/` excluídos em 24/09/2026 — `e87d763`)
- **Header e Home:** busca unificada via `GlobalSearchComponent` e `BuscaIndexService`; o Header mantém “Pesquisar qualquer conteúdo...” e `Ctrl/Cmd+K`, enquanto a Home possui “Buscar na Central...” com resultados locais e sem redirecionar o foco
- **Home refeita**: saudação com nome, 6 acessos rápidos, "Continue de onde parou"/"Mais utilizados" (`RecentesService`, `localStorage cc.recentes.v1`, partem vazios) + agenda real de 7 dias
- **JOTA transversal:** FAB + painel em todo o `MainLayout`. O frontend usa `POST /api/rag-proxy/chat` relativo ao site e depende de reverse proxy/ARR não versionado; o backend pode retornar fallback simulado. Página `/chat` **removida** em 24/09/2026
- **Pós-login:** deep-link respeitado; sem deep-link → **`/`** (Home, qualquer perfil; Módulo Gestor removido)
- Detalhes por tela em [`docs/06-COMPONENTES-FRONTEND.md`](./docs/06-COMPONENTES-FRONTEND.md), APIs em [`docs/05-ENDPOINTS.md`](./docs/05-ENDPOINTS.md) e arquitetura em [`docs/02-ARQUITETURA.md`](./docs/02-ARQUITETURA.md)

### 🐛 Correção: Erro Visual da Agenda (Overlay/Backdrop)
**Problema**: Ao navegar para `/agenda`, a tela apresentava tom esbranquiçado/opaco com travamento de cliques (sidebar, header e área de conteúdo).
**Causa**: Retenção de overlay/backdrop no DOM + falha no ciclo de vida da rota (`ngOnDestroy` não limpava a camada de backdrop do `<body>`).
**Solução**: 
- Adicionado `position: relative` ao container `.agenda-shell`
- Limpeza automática de `.modal-backdrop` e classe `modal-open` do body no `ngOnDestroy`

### 🎯 Kanban Drag & Drop + Integração com Agenda
- **Drag & Drop**: Alteração de status/coluna/fase das tarefas exclusivamente via arrastar-e-soltar (`@angular/cdk/drag-drop`)
- **Integração Automática**: Tarefas movidas para colunas "Reunião", "Treinamento" ou "Marco de Entrega" criam/atualizam eventos na Agenda (`tbagenda`) automaticamente
- **Backend:** `TarefaService.SincronizarAgendaAsync()` cria ou atualiza registros de `tbagenda`; a correspondência atual usa `ProjetoId` e título da tarefa, pois `AgendaItem` não possui `TarefaId`

### 👥 Cadastro de Operadores — Atribuição Automática por Função/Perfil
- **Sem seleção manual de equipe**: A equipe e papel são definidos automaticamente pela Função selecionada
- **Mapeamento**:
  - `FUNCAO_ID = 1` (Analista de Sistemas) → **Implantador** (claim `eh_implantador=true` no JWT)
  - `FUNCAO_ID = 2` (Suporte) → Atendimento operacional
  - `FUNCAO_ID = 3` (Programador) → Desenvolvimento
- **Migration relacionada:** `AddFuncao` (tabela `CC_Funcao` + `FUNCAO_ID` em `TBOPERADOR` + FK; script em `Migrations/Sql/AddFuncao.sql`). A tabela `CC_Funcao` foi fundida na legada `tbfuncao` pela migration `PadraoTabelasTb` (ganhou `CLASSIFICACAO` e `ATIVO`, e `FUNCAO_ID` foi widenada de `smallint` para `int`); `TBOPERADOR` passou a se chamar `tboperador`. A aplicação em cada ambiente deve ser confirmada pelo histórico de migrations

---

## 🚢 Deploy (Produção)

Pipeline em 5 etapas (detalhe: [`docs/10-DEPLOY.md`](./docs/10-DEPLOY.md)):

1. **Congelar** — working tree limpa, hash e branch registrados
2. **Validar** — `scripts/validate.ps1` (`dotnet build` + `ng build`)
3. **Empacotar** — `deploy.ps1 -BuildFrontend 1 -BuildBackend 1 -Publicar 0`
4. **Publicar** — `deploy.ps1 -BuildFrontend 0 -BuildBackend 0 -Publicar 1 -Backup 1`, somente se `BUILD_INFO` == HEAD
5. **Smoke** — `scripts/smoke.ps1` verifica frontend `:1010` e Swagger `:1009`

**Defaults operacionais (confirmar no ambiente):**
- **Servidor Web:** `192.168.2.130` (IIS)
- **Banco de Dados:** `192.168.2.154` (SQL Server)
- **Portas:** Frontend `1010`, Backend `1009`

---

## 📝 Documentação Centralizada

Toda a documentação técnica reside em `docs/` (entrada: [`docs/README.md`](./docs/README.md)):

1. [`docs/README.md`](./docs/README.md) — entrada e matriz dos 12 documentos canônicos
2. [`docs/00-ESTRUTURA.md`](./docs/00-ESTRUTURA.md) — organização, backup e fluxo de trabalho
3. [`docs/01-VISAO-GERAL.md`](./docs/01-VISAO-GERAL.md) — contexto, stack e situação atual
4. [`docs/02-ARQUITETURA.md`](./docs/02-ARQUITETURA.md) — arquitetura, tokens e segurança
5. [`docs/03-REGRAS-NEGOCIO.md`](./docs/03-REGRAS-NEGOCIO.md) — regras de negócio
6. [`docs/04-ESTRUTURA-DADOS.md`](./docs/04-ESTRUTURA-DADOS.md) — dados, entidades e integrações
7. [`docs/05-ENDPOINTS.md`](./docs/05-ENDPOINTS.md) — APIs, métodos, corpos e autorização
8. [`docs/06-COMPONENTES-FRONTEND.md`](./docs/06-COMPONENTES-FRONTEND.md) — componentes, rotas e serviços frontend
9. [`docs/07-SERVICES-BACKEND.md`](./docs/07-SERVICES-BACKEND.md) — controllers, serviços e persistência backend
10. [`docs/08-HISTORIAS-TELAS.md`](./docs/08-HISTORIAS-TELAS.md) — histórias e cenários de QA
11. [`docs/09-TROUBLESHOOTING.md`](./docs/09-TROUBLESHOOTING.md) — diagnóstico e troubleshooting
12. [`docs/10-DEPLOY.md`](./docs/10-DEPLOY.md) — publicação, rollback e smoke

---

## 🤖 Assistência Opencode (Agents & Skills)

O projeto é otimizado para uso com assistentes de IA (opencode):
- **Skills:** `validar`, `deploy-limpo`, `subir-interno`, `frontend-design`.
- **Regras:** Definidas no arquivo `AGENTS.md`.

---

© 2026 JCA Soluções
