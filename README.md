# Central de Operação (Monorepo) — JCA Soluções

Portal interno unificado que reúne ferramentas, trilhas de conhecimento, cursos, gestão de acessos e o módulo de controle de projetos/implantação para a equipe de suporte.

---

## 📂 Estrutura do Monorepo

Este repositório (`JCASOLUCOES/CENTRALOPERACAO_DEPLOY`) é a fonte única do sistema, integrando frontend e backend.

```text
Central-Conhecimento-developer/
├── docs/                 # Documentação unificada (Telas, Deploy, Arquitetura)
├── scripts/              # Scripts de utilidade (Deploy, Extração de metadados)
├── frontend/             # Angular 18 (standalone + SSR)
│   └── src/app/features/ # 16 módulos de funcionalidades
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

**Login Padrão (Dev):** `admin` / `admin123`

---

## ✨ Novas Funcionalidades (v0.8.0)

### 🐛 Correção: Erro Visual da Agenda (Overlay/Backdrop)
**Problema**: Ao navegar para `/agenda`, a tela apresentava tom esbranquiçado/opaco com travamento de cliques (sidebar, header e área de conteúdo).
**Causa**: Retenção de overlay/backdrop no DOM + falha no ciclo de vida da rota (`ngOnDestroy` não limpava a camada de backdrop do `<body>`).
**Solução**: 
- Adicionado `position: relative` ao container `.agenda-shell`
- Limpeza automática de `.modal-backdrop` e classe `modal-open` do body no `ngOnDestroy`

### 🎯 Kanban Drag & Drop + Integração com Agenda
- **Drag & Drop**: Alteração de status/coluna/fase das tarefas exclusivamente via arrastar-e-soltar (`@angular/cdk/drag-drop`)
- **Integração Automática**: Tarefas movidas para colunas "Reunião", "Treinamento" ou "Marco de Entrega" criam/atualizam eventos na Agenda (`IMPL_Agenda`) automaticamente
- **Backend**: `TarefaService.SincronizarAgendaAsync()` dispara `INSERT/UPDATE` na tabela `IMPL_Agenda` vinculando `ProjetoId` e `TarefaId`

### 👥 Cadastro de Operadores — Atribuição Automática por Função/Perfil
- **Sem seleção manual de equipe**: A equipe e papel são definidos automaticamente pela Função selecionada
- **Mapeamento**:
  - `FUNCAO_ID = 1` (Analista de Sistemas) → **Implantador** (claim `eh_implantador=true` no JWT)
  - `FUNCAO_ID = 2` (Suporte) → Atendimento operacional
  - `FUNCAO_ID = 3` (Programador) → Desenvolvimento
- **Nova migration**: `AddFuncao` (tabela `CC_Funcao` + `FUNCAO_ID` em `TBOPERADOR` + FK; script em `Migrations/Sql/AddFuncao.sql` — aplicado em produção em 2026-09-10)

---

## 🚢 Deploy (Produção)

O deploy é automatizado via script PowerShell que realiza o build, backup e publicação direta no IIS do servidor `192.168.2.130`.

```powershell
# Na raiz do repositório:
.\scripts\deploy.ps1
```

**Detalhes do Servidor:**
- **Servidor Web:** 192.168.2.130 (IIS)
- **Banco de Dados:** 192.168.2.154 (SQL Server)
- **Portas:** Frontend (1010), Backend (1009)

---

## 📝 Documentação Centralizada

Toda a documentação técnica reside na pasta `/docs`:

1. [**TELAS.md**](./docs/TELAS.md) — Mapa completo de telas, rotas, componentes e APIs (auto-gerado).
2. [**DOCUMENTACAO-COMPLETA.md**](./docs/DOCUMENTACAO-COMPLETA.md) — Guia detalhado de arquitetura e regras de negócio.
3. [**DEPLOY.md**](./docs/DEPLOY.md) — Manual de publicação e manutenção do servidor.
4. [**backend-auth-integracao.md**](./docs/backend-auth-integracao.md) — Detalhes técnicos do fluxo JWT.

---

## 🤖 Assistência Opencode (Agents & Skills)

O projeto é otimizado para uso com assistentes de IA (opencode):
- **Skills:** `deploy-limpo`, `subir-interno`, `frontend-design`.
- **Regras:** Definidas no arquivo `AGENTS.md`.
- **Sync Automático:** O workflow `.github/workflows/docs-sync.yml` mantém o arquivo `TELAS.md` sempre sincronizado com o código-fonte em cada Pull Request.

---

© 2026 JCA Soluções
