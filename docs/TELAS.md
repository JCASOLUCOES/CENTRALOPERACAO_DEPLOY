# Central de Operação — Documentação de Telas & APIs (v0.7.0+)

> Gerado automaticamente. **Não edite manualmente** — o agente `docs-writer` mantém sincronizado com o código-fonte.
> Sempre que um `.component.ts`, `.service.ts`, `.routes.ts`, Controller, Model ou Migration for alterado, este arquivo é atualizado pelo agente.

---

## Sumário

1. [Layout & Navegação](#1-layout--navegação)
2. [Autenticação](#2-autenticação)
3. [Home](#3-home)
4. [Ferramentas](#4-ferramentas)
5. [Acessos](#5-acessos)
6. [Cursos](#6-cursos)
7. [Trilhas](#7-trilhas)
8. [Stack](#8-stack)
9. [Agenda](#9-agenda)
10. [Fraseologia](#10-fraseologia)
11. [Modelo de Chamados](#11-modelo-de-chamados)
12. [Política](#12-política)
13. [Visão ADM](#13-visão-adm)
14. [Implantação / Projetos](#14-implantação--projetos)
15. [Database Explorer](#15-database-explorer)
16. [Empresa / Onboarding](#16-empresa--onboarding)
17. [Backend — Endpoints por Controller](#17-backend--endpoints-por-controller)
18. [Backend — Entidades & Banco de Dados](#18-backend--entidades--banco-de-dados)

---

## 1. Layout & Navegação

### 1.1 `MainLayoutComponent`

**Componente:** `src/app/layout/main-layout/main-layout.component.ts`

### O que faz
Layout principal da aplicação após login. Contém header com navegação superior, breadcrumb, barra de busca global e sidebar com seções. Renderiza a rota filha abaixo.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `BuscaService` | `buscaAberta$`, `fecharBusca()` | Controla estado da busca global no header |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum endpoint direto |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `RouterLink` (Angular Router)
- `BuscaService` (service customizado `providedIn: 'root'`)

### Observações Técnicas
- Rotas filhas renderizadas via `<router-outlet>`
- Sidebar com seções: Início, Atendimento, Ferramentas, Administrativo, Integração
- Header com dropdown usuário (BEM `user-nav__*`), notificações, busca

---

### 1.2 `HeaderComponent`

**Componente:** `src/app/layout/header/header.component.ts`

### O que faz
Header superior com logo, navegação (Início / Fluxo de Atendimento / Ferramentas / Acessos / Cursos), breadcrumb, busca global e dropdown do usuário com perfil e logout.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `BuscaService` | `buscaAberta$`, `fecharBusca()` | Controla abertura/fechamento da busca |
| `AuthService` | `logout()` | Encerra sessão |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/auth/logout` | `AuthService.logout()` | Revoga refresh token |
| GET | `/api/v1/auth/me` | (via refresh) | Dados do usuário (restauração pós-F5) |

### Banco de Dados
- **Conecta:** ❌ Não (chama backend que consulta `TBOPERADOR` + `RefreshTokens`)

### Dependências Externas
- `ng-bootstrap` dropdown
- `BuscaService` (search state management)
- `AuthService` (logout)

### Observações Técnicas
- Dropdown usa BEM (`user-nav__*`)
- Busca usa `BehaviorSubject<boolean>` para coordenação com AcessosComponent
- `withCredentials: true` no interceptor (cookie cross-origin)

---

### 1.3 `SidebarComponent`

**Componente:** `src/app/layout/sidebar/sidebar.component.ts`

### O que faz
Sidebar esquerda com navegação por seções (Início, Atendimento, Ferramentas, Administrativo, Integração). Destaca seção ativa e exibe ícones.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum service direto |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum endpoint direto |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `RouterLink` (Angular Router com `routerLinkActive`)

### Observações Técnicas
- Collapsible sections
- Destaca seção baseada em rota ativa

---

### 1.4 `FooterComponent`

**Componente:** `src/app/layout/footer/footer.component.ts`

### O que faz
Rodapé da aplicação com informação de versão (`app-version.ts`), links e copyright.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `appVersion` (sinal de `src/app/shared/meta/app-version.ts`)

### Observações Técnicas
- Versão exibida no rodapé e dropdown do usuário
- Fonte única: `frontend/src/app/shared/meta/app-version.ts`

---

## 2. Autenticação

### 2.1 `LoginComponent`

**Componente:** `src/app/auth/pages/login/login.component.ts`

### O que faz
Tela de login com formulário de usuário/senha. Autentica via `POST /api/v1/auth/login`. Exibe mensagem "Sua sessão expirou" se redirecionado por timeout.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AuthService` | `login()`, `iniciarVerificacaoPeriodica()`, `pararVerificacaoPeriodica()` | Login + verificação periódica de sessão |
| `TokenStorageService` | `setUsuario()`, `setAccessToken()` | Armazena token + usuário em memória |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/auth/login` | `AuthService.login()` | Autentica e retorna accessToken + user |
| POST | `/api/v1/auth/refresh` | `AuthService.refreshTokenSingleFlight()` | Renova token via cookie |

### Banco de Dados
- **Conecta:** ❌ Não (backend consulta `TBOPERADOR` + `RefreshTokens`)

### Dependências Externas
- `auth.interceptor.ts` (com `withCredentials: true`)
- `auth.guard.ts` (protege rotas, refresh silencioso)
- Cookie `cc_refresh` (HttpOnly)

### Observações Técnicas
- Cookies: `cc_refresh` (4h com "Lembrar acesso" ou sessão), `cc_lembrar`
- Acess token: **somente em memória** (não usa `localStorage`)
- Verificação periódica: a cada 5 min, `verificarSessao()` → refresh ou logout
- Sessão após 4h: refresh falha → logout automático com mensagem
- `sessionStorage` flag `sessaoExpirada` para mensagem no login

---

## 3. Home

### 3.1 `HomeComponent`

**Componente:** `src/app/wiki/pages/home/home.component.ts`

### O que faz
Página inicial com panorama das funcionalidades do sistema e atalhos principais para seções frequentes (Ferramentas, Acessos, Cursos).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `RouterLink` para atalhos

### Observações Técnicas
- Lazy loading: `loadComponent` em `wiki.routes.ts:6`
- Redireciona para seções internas

---

## 4. Ferramentas

### 4.1 `FerramentasComponent`

**Componente:** `src/app/wiki/pages/ferramentas/ferramentas.component.ts`

### O que faz
Lista de ferramentas disponíveis na categoria "Ferramentas" da seção Atendimento. Busca, filtra por categoria e exibe cards com ícones.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `FerramentasService` | `listarFerramentas()`, `buscar()` | CRUD ferramentas |
| `BuscaService` | `fecharBusca()` | Fecha busca antes de abrir modal |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/ferramentas` | `FerramentasService.listarFerramentas()` | Lista ferramentas |

### Banco de Dados
- **Conecta:** ❌ Não (dados locais em `ferramentas.data.ts`)

### Dependências Externas
- `ferramentas.data.ts` (dados estáticos)
- `buscarSingleTerm`, `buscarMultiTerm`, `buscarComSinonimos` (texto.helper)
- `BuscaService` (busca global)

### Observações Técnicas
- Dados em `src/app/wiki/pages/ferramentas/ferramentas.data.ts`
- Lazy loading em `wiki.routes.ts:13`

---

### 4.2 `FerramentaDetalheComponent`

**Componente:** `src/app/wiki/pages/ferramentas/ferramenta-detalhe.component.ts`

### O que faz
Exibe detalhes de uma ferramenta específica com informações completas.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `FerramentasService` | `obterFerramenta()` | Obtém detalhes |
| `BuscaService` | `fecharBusca()` | Fecha busca |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/ferramentas/:id` | `FerramentasService.obterFerramenta()` | Detalhe da ferramenta |

### Banco de Dados
- **Conecta:** ❌ Não (dados locais)

### Dependências Externas
- `BuscaService`
- `FerramentasService`

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:17`

---

### 4.3 `FAQ/Glossário Component` (`FaqComponent`)

**Componente:** `src/app/wiki/pages/faq/faq.component.ts`

### O que faz
Página FAQ/Glossário com fluxo da "Jornada de Cobrança" atualizado (14 etapas cronológicas), glossário de termos e seção de perguntas frequentes.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- Conteúdo HTML estruturado em `faq.component.html`
- BEM CSS classes para fluxograma (`gl-fluxo__*`)

### Observações Técnicas
- BUG 7 corrigido (fluxo Jornada de Cobrança atualizado)
- Fluxo: Carteira → Importação/Integração → Processamento → Dados Devedor → Dados Títulos → Regras → Filas → Acionamento → Negociação → Acordo → Formalização → Pagamento → Baixa → Encerramento

---

## 5. Acessos

### 5.1 `AcessosComponent`

**Componente:** `src/app/wiki/pages/acessos/acessos.component.ts`

### O que faz
Lista de empresas cadastradas na planilha Google Sheets. Busca/filtra empresas, abre modal de senha para validação, e exibe credenciais completas (TS, Banco, VPN, Actyon, AnyDesk, Observações).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AcessosService` | `listarEmpresas()`, `validarSenha()`, `obterDetalhe()` | CRUD empresas + validação senha |
| `BuscaService` | `fecharBusca()` | Fecha painel de busca global |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/acessos` | `AcessosService.listarEmpresas()` | Lista empresas (resumo, sem senhas) |
| POST | `/api/v1/acessos/validar-senha` | `AcessosService.validarSenha()` | Valida senha mestre |
| POST | `/api/v1/acessos/visualizar?empresaId=N` | `AcessosService.obterDetalhe()` | Retorna credenciais detalhadas + auditoria |

### Banco de Dados
- **Conecta:** ❌ Não (backend consulta Google Sheets)

### Dependências Externas
- `GoogleSheetsService` (backend) → planilha 16 colunas A–P
- `NgbModal` (ng-bootstrap) — modais de senha e detalhe
- `SegurancaHelper` (backend) — comparação SHA-256 em tempo constante
- `PasswordValidationService` (backend) — cache 5 min + lockout
- `BuscaService` (frontend)

### Observações Técnicas
- Taxa de expiração do modal de detalhe: 5 min (`TEMPO_EXPIRACAO_DETALHE_MS`)
- Instância única de modal de senha (`abrirSenhaModal()` + `fecharSenhaModalPendente()`)
- Auditoria registrada em `AuditoriaAcessos` a cada visualização
- Credenciais TS/Banco/VPN/Actyon/AnyDesk/Observações em blocos (`GrupoDetalhe[]`)
- Copiar para clipboard com fallback `execCommand('copy')`
- Lazy loading em `wiki.routes.ts:21`

---

## 6. Cursos

### 6.1 `CursosComponent`

**Componente:** `src/app/wiki/pages/cursos/cursos.component.ts`

### O que faz
Catálogo de cursos por plataforma (YouTube, Curso em Vídeo, Microsoft Learn, Cisco, Fundação Bradesco, Postman Academy, Documentação) e área de conhecimento (9 trilhas). Cada curso pode ter player embutido para YouTube.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `CursosService` | `listarCursos()`, `buscar()` | CRUD cursos |
| `BuscaService` | `fecharBusca()` | Fecha busca |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | `CursosService` | Dados locais (sem chamada HTTP direta) |

### Banco de Dados
- **Conecta:** ❌ Não (dados locais em `cursos-novos.data.ts`)

### Dependências Externas
- `cursos-novos.data.ts` (arrays por plataforma + categorias + trilhas)
- `youtube-player` (player embutido para YouTube)
- `buscarSingleTerm`, `buscarMultiTerm`, `buscarComSinonimos` (texto.helper)
- `BuscaService` (busca global)

### Observações Técnicas
- Canais com 404 falso foram removidos (regra mantida)
- Cursos de canais inexistentes já removidos do sistema
- Lazy loading em `wiki.routes.ts:41`

---

### 6.2 `CursoDetalheComponent`

**Componente:** `src/app/wiki/pages/cursos/curso-detalhe.component.ts`

### O que faz
Exibe detalhes completos de um curso específico (descrição, plataforma, link, vídeo embutido, categorias/trilhas associadas).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `CursosService` | `obterCurso()` | Obtém detalhes |
| `BuscaService` | `fecharBusca()` | Fecha busca |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | `CursosService` | Dados locais |

### Banco de Dados
- **Conecta:** ❌ Não

### Dependências Externas
- `cursos-novos.data.ts`
- `youtube-player` (player vídeo)
- `buscarSingleTerm`, `buscarMultiTerm`, `buscarComSinonimos` (texto.helper)

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:45`

---

## 7. Trilhas

### 7.1 `TrilhasComponent` (`/trilhas/resolver`)

**Componente:** `src/app/wiki/pages/trilhas/trilhas.component.ts`

### O que faz
Página "Como resolver esse problema?" com dicas de SQL, Rede e Infra. Redesign `.tdh` com índice de seções, tabelas de status HTTP, acordeão, cards de diagnóstico e comandos.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- `trilhas.component.html` com BEM CSS (`.tdh`)
- Conteúdo estático em formato de guias/dicas

### Observações Técnicas
- BUG corrigido: redesign `.tdh` das 4 páginas de trilhas
- Índice de seções, tabelas de status HTTP, acordeão, cards de diagnóstico
- Lazy loading em `wiki.routes.ts:49`

---

### 7.2 `TrilhaSqlComponent` (`/trilhas/sql`)

**Componente:** `src/app/wiki/pages/trilha-sql/trilha-sql.component.ts`

### O que faz
Trilha de dicas de SQL com biblioteca de conteúdo (`biblioteca-sql.data.ts`), comandos de diagnóstico e consultas úteis para DBAs.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- `biblioteca-sql.data.ts` (dados estáticos)
- `copiarTexto()` com fallback `execCommand('copy')`

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:53`

---

### 7.3 `TrilhaRedeComponent` (`/trilhas/rede`)

**Componente:** `src/app/wiki/pages/trilha-rede/trilha-rede.component.ts`

### O que faz
Trilha de dicas de Rede com comandos de diagnóstico, guias de configuração e troubleshooting.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- Conteúdo estático em `trilha-rede.component.ts`

### Observações Téc
- Lazy loading em `wiki.routes.ts:57`

---

### 7.4 `TrilhaInfraComponent` (`/trilhas/infra`)

**Componente:** `src/app/wiki/pages/trilha-infra/trilha-infra.component.ts`

### O que faz
Trilha de dicas de Infraestrutura com comandos de diagnóstico e configuração para servidores.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- Conteúdo estático em `trilha-infra.component.ts`

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:61`

---

## 8. Stack

### 8.1 `StackComponent`

**Componente:** `src/app/wiki/pages/stack/stack.component.ts`

### O que faz
Página que exibe a stack tecnológica do sistema (Angular 18, Bootstrap 5, .NET 8, EF Core, Google Sheets, JWT, etc.).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- Conteúdo estático em `stack.component.ts`

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:33`

---

## 9. Agenda

### 9.1 `AgendaComponent`

**Componente:** `src/app/wiki/pages/agenda/agenda.component.ts`

### O que faz
Agenda compartilhada (v1.3.0) com 3 visões (Dia/Semana/Mês), linha vermelha "agora", filtros chips (Todas/Só minhas + por operador), modal de criar/editar com 12 campos.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AgendaService` | `listar()`, `criar()`, `atualizar()`, `excluir()` | CRUD eventos |
| `AgendaEventoModalComponent` | — | Modal de criação/edição |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/agenda?inicio=&fim=&operadorId=&visibilidade=&projetoId=&take=` | `AgendaService.listar()` | Lista eventos |
| GET | `/api/v1/implantacao/agenda/{id}` | `AgendaService.obter()` | Detalhe evento |
| POST | `/api/v1/implantacao/agenda` | `AgendaService.criar()` | Cria evento |
| PUT | `/api/v1/implantacao/agenda/{id}` | `AgendaService.atualizar()` | Atualiza evento |
| DELETE | `/api/v1/implantacao/agenda/{id}` | `AgendaService.excluir()` | Exclui evento |
| GET | `/api/v1/implantacao/agenda/ics/{operadorId}?inicio=&fim=` | `AgendaService.exportarICS()` | Exporta ICS (RFC 5545) |

### Banco de Dados
- **Conecta:** ✅ Sim — tabela `IMPL_Agenda` no SQL Server
- **Tabelas:** `IMPL_Agenda` (eventos), `IMPL_MembroEquipe` (para permissões)

### Dependências Externas
- `NgbModal` (ng-bootstrap) — modal de criação/edição
- `AgendaEventoModalComponent` (modal embutido)
- Tipos de evento com cores institucionais por equipe

### Observações Técnicas
- Visibilidade: `Publico` (todos veem), `Equipe` (mesma equipe), `Privado` (só dono/admin)
- Export ICS disponível
- Lazy loading (implantacao.routes.ts)
- Migration `AddAgendaAndPerfis` ainda não aplicada em homolog

### Fluxo de Persistência e Comunicação com o Banco de Dados

1. **Consulta e Renderização Inicial (SELECT)**
   - Ao acessar a tela, o frontend faz uma chamada GET à API `/api/v1/implantacao/agenda`.
   - O backend executa consultas SQL (`SELECT`) com os JOINs necessários na tabela `IMPL_Agenda` e `IMPL_MembroEquipe` para buscar a lista de eventos e renderizar o estado inicial da página, aplicando regras de visibilidade (Público, Equipe, Privado).

2. **Criação e Registro de Novos Dados (INSERT)**
   - O operador preenche os campos requeridos na interface e aciona a ação de confirmação.
   - A aplicação envia os dados via POST para `/api/v1/implantacao/agenda`.
   - O banco grava os dados na tabela `IMPL_Agenda` (`INSERT INTO ...`) e associa as chaves estrangeiras (`ProjetoId`, `OperadorId`) necessárias para vincular os relacionamentos.

3. **Atualização e Alterações (UPDATE)**
   - Alterações de campos, movimentação de itens ou mudanças de status disparam uma requisição PUT/PATCH ao servidor.
   - É executado um comando `UPDATE` na tabela `IMPL_Agenda`, atualizando os campos modificados e atualizando os campos de controle (`DataAlteracao`, `UsuarioAlteracao`).

4. **Remoção ou Inativação (DELETE / Soft Delete)**
   - Ao remover um item, a aplicação executa um `DELETE` na tabela `IMPL_Agenda` (remoção física), preservando o histórico via tabela de auditoria `IMPL_AuditoriaImplantacao`.

---

## 10. Fraseologia

### 10.1 `FraseologiaComponent`

**Componente:** `src/app/wiki/pages/fraseologia/fraseologia.component.ts`

### O que faz
Página de fluxo de atendimento e fraseologias. Permite copiar mensagens para área de transferência.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- Clipboard API + fallback `execCommand('copy')`
- `modelo-chamados.component.ts` e `trilha-sql.component.ts` usam mesmo padrão

### Observações Técnicas
- BUG 1 corrigido: `copiarTexto()` usa `.catch()` com fallback `document.execCommand('copy')`
- Fluxo de atendimento e fraseologias na seção Atendimento da sidebar

---

## 11. Modelo de Chamados

### 11.1 `ModeloChamadosComponent`

**Componente:** `src/app/wiki/pages/modelo-chamados/modelo-chamados.component.ts`

### O que faz
Página de modelo de chamados com formulário e lista de templates de atendimento.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- Conteúdo estático em `modelo-chamados.component.ts`

### Observações Técadas
- `copiarTexto()` com fallback `execCommand('copy')`

---

## 12. Política

### 12.1 `PoliticaComponent`

**Componente:** `src/app/wiki/pages/politica/politica.component.ts`

### O que faz
Página de política interna da empresa com conteúdo estático.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- `politica.data.ts` (dados estáticos)

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:81`

---

## 13. Visão ADM

### 13.1 `VisaoAdmComponent`

**Componente:** `src/app/visao-adm/visao-adm.component.ts`

### O que faz
Painel administrativo com procedimentos por setor (Financeiro, RH, Comercial) com busca, detalhe e impressão + Central de Utilidades (favoritos, últimos utilizados, busca, categorias, grade/lista, contador de acessos).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ProcedimentosService` | `listar()`, `buscar()`, `obter()` | CRUD procedimentos |
| `UtilidadesService` | `listarFavoritos()`, `listarRecentes()`, `buscar()`, `buscarPorCategoria()` | Central de Utilidades |
| `BuscaService` | `fecharBusca()` | Fecha busca |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/visao-adm/procedimentos` | `ProcedimentosService.listar()` | Lista procedimentos por setor |
| GET | `/api/v1/visao-adm/utilidades` | `UtilidadesService.listar()` | Lista utilidades |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `Procedimentos`, `Utilidades` no SQL Server (ou via backend)

### Dependências Externas
- `Central de Utilidades` (favoritos, últimos utilizados, busca, categorias, grade/lista, contador)
- `BuscaService` (busca global)

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:65`
- Print functionality para procedimentos

---

### 13.2 `VisaoAdmDetalheComponent`

**Componente:** `src/app/visao-adm/visao-adm-detalhe.component.ts`

### O que faz
Exibe detalhes de um procedimento administrativo específico.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ProcedimentosService` | `obter()` | Detalhe do procedimento |
| `UtilidadesService` | `registrarAcesso()` | Contador de acessos |
| `BuscaService` | `fecharBusca()` | Fecha busca |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/visao-adm/procedimentos/:id` | `ProcedimentosService.obter()` | Detalhe procedimento |
| POST | `/api/v1/visao-adm/utilidades/acessar` | `UtilidadesService.registrarAcesso()` | Registra acesso |

### Banco de Dados
- **Conecta:** ✅ Sim

### Dependências Externas
- `ProcedimentosService`, `UtilidadesService`
- `BuscaService`

### Observações Técnicas
- Lazy loading em `wiki.routes.ts:69`

---

## 14. Implantação / Projetos

### 14.1 `DashboardComponent` (Implantação)

**Componente:** `src/app/wiki/pages/implantacao/pages/dashboard/dashboard.component.ts`

### O que faz
Dashboard KPIs da operação de implantação em tempo real. 6 cards grandes, chips de filtro por equipe (Todas/IMPLANTACAO/CIAA), distribuição por equipe em tabela, próximos prazos, seções específicas por equipe, gráficos Chart.js (barras + donut).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DashboardService` | `obter()` | KPIs e dados do dashboard |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/dashboard?equipe=IMPLANTACAO|CIAA` | `DashboardService.obter()` | KPIs agregados |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_Projeto`, `IMPL_Tarefa`, `IMPL_Equipe`

### Dependências Externas
- `Chart.js` (gráficos de barras e donut)
- `@angular/cdk` (drag-drop Kanban)
- Design system: Space Grotesk, Inter, IBM Plex Mono
- Barra de progresso com gradiente IMPLANTACAO → CIAA

### Observações Técnicas
- Design system: `--imp-eq-impl: #0f4c81`, `--imp-eq-ciaa: #7c3aed`
- Cards com borda lateral 4px colorida por equipe
- Status colors: Backlog cinza / A Fazer azul / Em Andamento âmbar / Homologação violeta / Concluído verde / Bloqueado vermelho / Cancelado slate
- Filtros sempre chips (não dropdowns)
- KPIs em números grandes (2.5rem, Space Grotesk 800)

---

### 14.2 `KanbanComponent`

**Componente:** `src/app/wiki/pages/implantacao/pages/kanban/kanban.component.ts`

### O que faz
View Kanban (v1.1.0) com drag-and-drop (`@angular/cdk`), colunas configuráveis (máx 8, 5 padrão), reordenamento de tarefas entre colunas.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `TarefaService` | `listarPorColuna()`, `mover()`, `reordenar()` | CRUD + reordenação tarefas |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/tarefas?coluna={id}` | `TarefaService.listarPorColuna()` | Tarefas por coluna |
| PATCH | `/api/v1/implantacao/tarefas/{id}/coluna` | `TarefaService.mover()` | Move tarefa entre colunas |
| POST | `/api/v1/implantacao/colunas-kanban/reordenar` | `TarefaService.reordenar()` | Reordena colunas |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_ColunaKanban`, `IMPL_Tarefa`, `IMPL_Projeto`

### Dependências Externas
- `@angular/cdk/drag-drop` (drag-and-drop)
- `ColunaKanban` (limite 8, 5 padrão seeded)

### Observações Técnicas
- Lazy loading em `implantacao.routes.ts:10`
- Colunas com `padrao = true` não podem ser excluídas

### Fluxo de Persistência e Comunicação com o Banco de Dados

1. **Consulta e Renderização Inicial (SELECT)**
   - Ao acessar a tela, o frontend faz uma chamada GET à API `/api/v1/implantacao/tarefas`.
   - O backend executa consultas SQL (`SELECT`) com JOINs nas tabelas `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ColunaKanban`, `IMPL_Etapa` para buscar as tarefas organizadas por coluna e renderizar o estado inicial do Kanban.

2. **Criação e Registro de Novos Dados (INSERT)**
   - O operador cria uma nova tarefa preenchendo os campos e aciona a confirmação.
   - A aplicação envia os dados via POST para `/api/v1/implantacao/tarefas`.
   - O banco grava os dados na tabela `IMPL_Tarefa` (`INSERT INTO ...`) com chaves estrangeiras para `ProjetoId`, `EtapaId`, `ColunaKanbanId`, `ResponsavelId`.

3. **Atualização e Alterações (UPDATE) — Drag & Drop**
   - A alteração do status, coluna ou fase das tarefas é realizada **exclusivamente arrastando e soltando os cards** na interface.
   - Ao soltar um card em uma nova coluna, o frontend dispara uma requisição PATCH para `/api/v1/implantacao/tarefas/{id}/coluna`.
   - O banco executa um `UPDATE` na tabela `IMPL_Tarefa`, atualizando as colunas `ColunaKanbanId`, `Ordem`, `Status` e `DataAlteracao`.

4. **Remoção ou Inativação (DELETE / Soft Delete)**
   - Ao remover uma tarefa, a aplicação executa um `DELETE` na tabela `IMPL_Tarefa` (remoção física), preservando o histórico via tabela de auditoria `IMPL_AuditoriaImplantacao`.

### Integração com a Agenda

- **Necessidade**: Reuniões, treinamentos e entregas (marcos) do projeto não ocorrem em uma tela isolada no Kanban; elas precisam estar centralizadas na Agenda da equipe.
- **Relação entre Entidades**:
  - Toda tarefa do Kanban classificada como *"Reunião"*, *"Treinamento"* ou *"Marco de Entrega"* (baseado no nome da coluna Kanban) gera/atualiza um registro correspondente na tabela da **Agenda** (`IMPL_Agenda`).
  - O registro do evento contém a chave estrangeira `ProjetoId` e referência à tarefa.
- **Funcionamento do Fluxo**:
  1. Ao criar ou mover uma tarefa/reunião dentro do Kanban de um Projeto para uma coluna do tipo "Reunião", "Treinamento" ou "Marco", o serviço grava/atualiza a tarefa (`IMPL_Tarefa`) e insere (`INSERT`) ou atualiza (`UPDATE`) o evento na Agenda (`IMPL_Agenda`).
  2. Ao acessar a tela de **Agenda**, o sistema realiza a leitura dos eventos que possuem vínculo com o projeto, apresentando o compromisso de forma unificada.

---

### 14.3 `ProjetosComponent`

**Componente:** `src/app/wiki/pages/implantacao/pages/projetos/projetos.component.ts`

### O que faz
Lista de projetos em grid de cards com borda lateral colorida por equipe, busca, filtros (equipe/status), código em mono, progresso com gradiente IMPL↔CIAA, meta com responsável e prazo. Botão "Próximo código" (`GET /projetos/proximo-codigo`).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ProjetoService` | `listar()`, `buscar()`, `proximoCodigo()`, `criar()`, `atualizarStatus()` | CRUD projetos |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/projetos` | `ProjetoService.listar()` | Lista projetos |
| GET | `/api/v1/implantacao/projetos/proximo-codigo?equipeId=N` | `ProjetoService.proximoCodigo()` | Gera próximo código (`IMP-0001`, `CIAA-0001`) |
| POST | `/api/v1/implantacao/projetos` | `ProjetoService.criar()` | Cria projeto |
| PATCH | `/api/v1/implantacao/projetos/{id}/status` | `ProjetoService.atualizarStatus()` | Muda status |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_Projeto`, `IMPL_Equipe`, `IMPL_Cliente`, `IMPL_TipoProjeto`

### Dependências Externas
- `ProjetoService`
- Design system (borda lateral 4px, gradiente, barramento)
- Código automático por prefixo de equipe

### Observações Técnicas
- Lazy loading em `implantacao.routes.ts:14`
- Detalhe via `/implantacao/projetos/:id`
- Validação `clienteObrigatorio` por tipo de projeto

---

### 14.4 `ProjetoDetalheComponent`

**Componente:** `src/app/wiki/pages/implantacao/pages/projetos/projeto-detalhe.component.ts`

### O que faz
Hero com gradiente (azul IMPLANTACAO / violeta→magenta CIAA), breadcrumb back, abas (Visão/Tarefas/Histórico), grid 2 colunas com detalhes e KPIs de tarefas.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `ProjetoService` | `obter()`, `atualizar()` | Detalhe e atualização projeto |
| `TarefaService` | `listarPorProjeto()` | Tarefas do projeto |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/projetos/{id}` | `ProjetoService.obter()` | Detalhe do projeto |
| GET | `/api/v1/implantacao/projetos/{id}/tarefas` | `TarefaService.listarPorProjeto()` | Tarefas do projeto |
| PATCH | `/api/v1/implantacao/projetos/{id}/status` | `ProjetoService.atualizarStatus()` | Muda status |

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Projeto`, `IMPL_Tarefa`, `IMPL_Etapa`, `IMPL_ColunaKanban`

### Dependências Externas
- `ProjetoService`, `TarefaService`
- Design system (hero gradiente, abas, grid 2 colunas)
- Barra de progresso com gradiente

### Observações Técnicas
- Lazy loading em `implantacao.routes.ts:18`
- Tarefas por coluna Kanban

---

### 14.5 `TarefasComponent`

**Componente:** `src/app/wiki/pages/implantacao/pages/tarefas/tarefas.component.ts`

### O que faz
Tabela com ID mono (T123), atalhos (Todas/Atrasadas/Em andamento/Concluídas), filtros (equipe/projeto), prioridade colorida por nível.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `TarefaService` | `listar()`, `buscar()`, `criar()`, `moverColuna()`, `adicionarComentario()` | CRUD + movimento tarefas |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/implantacao/tarefas` | `TarefaService.listar()` | Lista tarefas |
| POST | `/api/v1/implantacao/tarefas` | `TarefaService.criar()` | Cria tarefa |
| PATCH | `/api/v1/implantacao/tarefas/{id}/coluna` | `TarefaService.moverColuna()` | Move entre colunas |
| POST | `/api/v1/implantacao/tarefas/{id}/comentarios` | `TarefaService.adicionarComentario()` | Adiciona comentário |

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ColunaKanban`, `IMPL_ComentarioTarefa`

### Dependências Externas
- `TarefaService`
- ID mono (T123)
- Atalhos de status
- Prioridade colorida por nível

### Observações Técricas
- Lazy loading em `implantacao.routes.ts:22`
- Rate limiting `validacao` (5/min por usuário) para escrita

---

### 14.6 `CadastrosComponent`

**Componente:** `src/app/wiki/pages/implantacao/pages/cadastros/cadastros.component.ts`

### O que faz
4 abas (Equipes/Tipos/Etapas/Colunas) com formulários inline e tabelas com team badges coloridos. CRUD completo para cadastros do módulo IMPLANTAÇÃO.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `EquipeService` | `listar()`, `criar()`, `atualizar()`, `excluir()` | CRUD equipes |
| `TipoProjetoService` | `listar()`, `criar()`, `atualizar()`, `excluir()` | CRUD tipos |
| `EtapaService` | `listar()`, `criar()`, `atualizar()`, `excluir()` | CRUD etapas |
| `ColunasKanbanService` | `listar()`, `criar()`, `atualizar()`, `excluir()`, `reordenar()` | CRUD colunas |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET/POST/PUT/DELETE | `/api/v1/implantacao/equipes` | `EquipeService` | CRUD equipes |
| POST/DELETE | `/api/v1/implantacao/equipes/{id}/membros` | `EquipeService` | Vínculo N:N |
| GET/POST/PUT/DELETE | `/api/v1/implantacao/tipos-projeto` | `TipoProjetoService` | CRUD tipos |
| GET/POST/PUT/DELETE | `/api/v1/implantacao/etapas` | `EtapaService` | CRUD etapas |
| GET/POST/PUT/DELETE | `/api/v1/implantacao/colunas-kanban` | `ColunasKanbanService` | CRUD colunas |
| POST | `/api/v1/implantacao/colunas-kanban/reordenar` | `ColunasKanbanService` | Reordenar colunas |

### Banco de Dados
- **Conecta:** ✅ Sim — `IMPL_Equipe`, `IMPL_TipoProjeto`, `IMPL_Etapa`, `IMPL_ColunaKanban`

### Dependências Externas
- 4 services de cadastro
- Team badges coloridos (azul IMPLANTACAO / violeta CIAA)
- Formulários inline
- 13 etapas seeded (6 IMPL + 7 CIAA)
- 4 tipos de projeto seeded

### Observações Técricas
- Lazy loading em `implantacao.routes.ts:31`
- Seed em Development: 2 equipes, 5 colunas, 4 tipos, 13 etapas, 3 clientes, 2 projetos fakes
- Todas com `[Authorize]` + rate limiting `validacao`

---

## 15. Database Explorer

### 15.1 `DatabaseShellComponent`

**Componente:** `src/app/wiki/pages/database/database-shell.component.ts`

### O que faz
Shell com 7 abas + banner de status (verde conectado / vermelho desconectado). Componente pai que gerencia abas.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `status()`, `info()` | Verifica conectividade + info servidor |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/status` | `DatabaseService.status()` | Status de conexão |
| GET | `/api/v1/database/info` | `DatabaseService.info()` | Info do servidor |

### Banco de Dados
- **Conecta:** ✅ Sim — conecta ao SQL Server Actyon (`dbActyon_JCA`, 192.168.2.154)

### Dependências Externas
- `DatabaseService`
- `NgbModal` (para procedure modal)
- `DB_EXPLORER_SENHA` (env var no IIS App Pool)

### Observações Técnicas
- Lazy loading em `database.routes.ts:9`
- SELECT-only com regex server-side (bloqueia INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/EXEC)
- Transação ReadUncommitted + ROLLBACK explícito
- Timeout 1-120s, Limite 1-5000

---

### 15.2 `DbVisaoGeralComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-visao-geral.component.ts`

### O que faz
9 cards (servidor, tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers) + detalhes de cada métrica.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `info()`, `listarTabelas()`, `listarProcedures()` | Metadados |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/info` | `DatabaseService.info()` | Info servidor |
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Todas tabelas |
| GET | `/api/v1/database/procedures` | `DatabaseService.listarProcedures()` | Todas procedures |

### Banco de Dados
- **Conecta:** ✅ Sim — metadados via `sys.*` views

### Dependências Externas
- `DatabaseService`

### Observações Técnicas
- Lazy loading em `database.routes.ts:9`

---

### 15.3 `DbExploradorComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-explorador.component.ts`

### O que faz
Árvore de tabelas + painel de detalhe (colunas + índices) + busca global. Seleciona tabela/procedure para ver detalhes completos.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `listarTabelas()`, `listarProcedures()`, `listarColunas()`, `listarIndices()`, `obterProcedure()`, `buscar()` | Metadados |
| `NgbModal` | — | Modal procedure |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Lista tabelas |
| GET | `/api/v1/database/tables/{schema}/{name}/columns` | `DatabaseService.listarColunas()` | Colunas |
| GET | `/api/v1/database/tables/{schema}/{name}/indexes` | `DatabaseService.listarIndices()` | Índices |
| GET | `/api/v1/database/procedures` | `DatabaseService.listarProcedures()` | Lista procedures |
| GET | `/api/v1/database/procedures/{schema}/{name}` | `DatabaseService.obterProcedure()` | Detalhe procedure |
| GET | `/api/v1/database/search` | `DatabaseService.buscar()` | Busca global |
| POST | `/api/v1/database/procedures/{schema}/{name}` | `DatabaseService.obterProcedure()` | Detalhe procedure |

### Banco de Dados
- **Conecta:** ✅ Sim — `sys.tables`, `sys.columns`, `sys.indexes`, `sys.procedures`

### Dependências Externas
- `DatabaseService`
- `NgbModal` (procedure detail)
- `DbProcedureModalComponent` (modal inline)

### Observações Técnicas
- Lazy loading em `database.routes.ts:10`
- Schema filter
- Click para selecionar → carrega colunas + índices

---

### 15.4 `DbRelacionamentosComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-relacionamentos.component.ts`

### O que faz
Relacionamentos confirmados (linha azul contínua) × Possíveis (linha violeta tracejada) com score e motivos + busca por coluna.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `relacionamentos()`, `usoColuna()` | Relacionamentos |
| `DatabaseRelationshipInferenceService` | — | Inferência score 0-99% |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/relationships` | `DatabaseService.relacionamentos()` | Relacionamentos confirmados + possíveis |
| GET | `/api/v1/database/column-usage` | `DatabaseService.usoColuna()` | Uso de coluna |

### Banco de Dados
- **Conecta:** ✅ Sim — `sys.foreign_keys` + inferência score 0-99%

### Dependências Externas
- `DatabaseService`, `DatabaseRelationshipInferenceService`
- `DatabaseMetadataService`

### Observações Técnicas
- Lazy loading em `database.routes.ts:11`
- Confirmados via `sys.foreign_keys`, possíveis via inferência
- BFS até 5 níveis para grafo

---

### 15.5 `DbDiagramaComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-diagrama.component.ts`

### O que faz
Diagrama SVG próprio com layout BFS, profundidade 1-5, setas: azul contínua (confirmado) / violeta tracejada (possível).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `grafo()` | Dados para diagrama |
| `DbDiagramaComponent` | `renderizarSVG()` | Renderiza SVG custom |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/graph?tabela=X&profundidade=N` | `DatabaseService.grafo()` | Dados do grafo |

### Banco de Dados
- **Conecta:** ✅ Sim — dados do grafo

### Dependências Externas
- `DatabaseService`
- SVG custom (sem biblioteca externa)
- BFS layout até profundidade 5

### Observações Técnicas
- Lazy loading em `database.routes.ts:12`
- Setas azul contínua (confirmado) / violeta tracejada (possível)

---

### 15.6 `DbConsultasComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-consultas.component.ts`

### O que faz
Editor SQL (SELECT/WITH), paginação 25/50/100/500, timeout 5/15/30/60s. SELECT-only com regex server-side bloqueando DML/DDL.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `executarQuery()` | Executa query SELECT |
| `DatabaseQueryBuilderService` | — | Constroi queries |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/database/query` | `DatabaseService.executarQuery()` | Executa query SQL |
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Lista tabelas para auto-complete |
| GET | `/api/v1/database/procedures` | `DatabaseService.listarProcedures()` | Lista procedures |

### Banco de Dados
- **Conecta:** ✅ Sim — execução de queries
- **Restrição:** SELECT-only (regex bloqueia INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/CREATE/EXEC)

### Dependências Externas
- `DatabaseService`, `DatabaseQueryBuilderService`
- Editor SQL custom (CodeMirror ou similar)
- Paginação 25/50/100/500, timeout 5/15/30/60s

### Observações Téc
- Lazy loading em `database.routes.ts:13`
- Transação ReadUncommitted + ROLLBACK explícito
- Limite 1-5000

---

### 15.7 `DbDiferencasComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-diferencas.component.ts`

### O que faz
Resumo + lista de divergências SQL × Markdown (placeholder para v2.x). Compara schema do banco com documentação Markdown.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `listarTabelas()` | Metadados para comparação |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/database/tables` | `DatabaseService.listarTabelas()` | Tabelas para comparação |

### Banco de Dados
- **Conecta:** ✅ Sim

### Dependências Externas
- `DatabaseService`
- Placeholder (v2.x)

### Observações Téc
- Lazy loading em `database.routes.ts:14`
- Placeholder para versão futura

---

### 15.8 `DbConfiguracaoComponent`

**Componente:** `src/app/wiki/pages/database/pages/db-configuracao.component.ts`

### O que faz
Form de conexão (servidor/porta/banco/usuário/senha mascarada) + Testar conexão + Salvar config. Armazena config em `DB_EXPLORER_*` env vars.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `DatabaseService` | `testarConexao()`, `obterConfig()`, `atualizarConfig()` | Configuração |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| POST | `/api/v1/database/test-connection` | `DatabaseService.testarConexao()` | Testa conexão |
| GET | `/api/v1/database/config` | `DatabaseService.obterConfig()` | Obtém config |
| PUT | `/api/v1/database/config` | `DatabaseService.atualizarConfig()` | Salva config |

### Banco de Dados
- **Conecta:** ✅ Sim — configuração de conexão

### Dependências Externas
- `DatabaseService`
- `DB_EXPLORER_SENHA` (env var no IIS App Pool `Suporte_Back`)
- `configure-db-explorer-password.ps1` (script de configuração)

### Observações Técnicas
- Lazy loading em `database.routes.ts:15`
- Senha nunca logada, retornada pela API ou commitada
- Leitura via env var em produção, user-secrets em Development

---

## 16. Empresa / Onboarding

### 16.1 `OnboardingHomeComponent`

**Componente:** `src/app/empresa/onboarding/components/onboarding-home/onboarding-home.component.ts`

### O que faz
Página de onboarding da empresa com seção de boas-vindas e navegação para capítulos.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- `onboarding-data.ts` (dados estáticos)

### Observações Téc
- Lazy loading em `wiki.routes.ts:98`
- Redireciona para `/empresa/onboarding/capitulo/:id`

---

### 16.2 `OnboardingCapituloComponent`

**Componente:** `src/app/empresa/onboarding/components/onboarding-capitulo/onboarding-capitulo.component.ts`

### O que faz
Capítulo específico do onboarding com conteúdo e navegação entre capítulos.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum |

### Banco de Dados
- **Conecta:** ❌ Não (conteúdo estático)

### Dependências Externas
- `onboarding-data.ts`

### Observações Téc
- Lazy loading em `wiki.routes.ts:102`

---

## 17. Backend — Endpoints por Controller

### 17.1 `AuthController`

**Controller:** `Controllers/AuthController.cs`

### O que faz
Autenticação JWT — login, refresh, logout, me. Gerencia tokens de acesso (4h) e refresh (4h, rotativo, HttpOnly cookie).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| POST | `/api/v1/auth/login` | Autentica, retorna accessToken + user | `AuthService.LoginAsync()` |
| POST | `/api/v1/auth/refresh` | Renova tokens via cookie, devolve user | `AuthService.RefreshAsync()` |
| POST | `/api/v1/auth/logout` | Revoga refresh token, remove cookies | `AuthService.RevogarRefreshTokenAsync()` |
| GET | `/api/v1/auth/me` | Dados do usuário da sessão | `AuthService.ObterUsuario()` |

### Banco de Dados
- `RefreshTokens` (hash SHA-256, rotativo)
- `AuditoriaAcessos` (auditoria)
- `TBOPERADOR` (login legado, senha texto puro)

### Segurança
- Rate limiting `login` (5/min por IP)
- Lockout `BruteForceGuard` (5 falhas/5 min → 15 min)
- `SegurancaHelper` (comparação SHA-256 em tempo constante)
- JWT `RequireExpirationTime` + `ValidAlgorithms = HS256`
- `JWT_KEY` via env var (fallback `Jwt:Key`)
- Cookie `cc_refresh` HttpOnly + SameSite=Strict

### Observações Técnicas
- `POST /auth/refresh` devolve objeto `user` (BUG 5 fix)
- Verificação periódica 5 min
- Logout `[Authorize]`

---

### 17.2 `AcessosController`

**Controller:** `Controllers/AcessosController.cs`

### O que faz
Gestão de acessos de empresas via Google Sheets (listagem, validação de senha mestre, visualização de credenciais com auditoria).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/acessos` | Lista empresas (resumo, sem senhas) | `GoogleSheetsService.ListarEmpresas()` |
| POST | `/api/v1/acessos/validar-senha` | Valida senha mestre | `PasswordValidationService.Validar()` |
| POST | `/api/v1/acessos/visualizar?empresaId=N` | Retorna credenciais + auditoria | `AcessosController.MapearParaDetalhe()` |

### Banco de Dados
- `AuditoriaAcessos` (auditoria de visualização)
- Google Sheets (planilha 16 colunas A–P, fallback CSV)

### Segurança
- Rate limiting `validacao` (5/min por usuário)
- Lockout `BruteForceGuard`
- `SegurancaHelper` (comparação SHA-256)
- Erros genéricos (sem vazamento de `ex.Message`)

### Observações Técnicas
- Cache memória 10 min para planilha
- `EmpresaDetalheResponse` com blocos TS/Banco/VPN/Actyon/AnyDesk/Observacoes
- `MapearParaDetalhe` transforma linhas em blocos de credenciais

---

### 17.3 `Implantacao Controllers` (`/api/v1/implantacao/`)

**Controllers:** `Controllers/Implantacao/*.cs`

### Entidades Gerenciadas (9 tabelas `IMPL_*`)

| Controller | Rota base | Entidade | Tabela SQL |
|-----------|-----------|----------|------------|
| `ClientesController` | `/implantacao/clientes` | `Cliente` | `IMPL_Cliente` |
| `EquipesController` | `/implantacao/equipes` | `Equipe`, `MembroEquipe` | `IMPL_Equipe`, `IMPL_MembroEquipe` |
| `TiposProjetoController` | `/implantacao/tipos-projeto` | `TipoProjeto` | `IMPL_TipoProjeto` |
| `EtapasController` | `/implantacao/etapas` | `Etapa` | `IMPL_Etapa` |
| `ColunasKanbanController` | `/implantacao/colunas-kanban` | `ColunaKanban` | `IMPL_ColunaKanban` |
| `ProjetosController` | `/implantacao/projetos` | `Projeto` | `IMPL_Projeto` |
| `TarefasController` | `/implantacao/tarefas` | `Tarefa`, `ComentarioTarefa` | `IMPL_Tarefa`, `IMPL_ComentarioTarefa` |
| `DashboardController` | `/implantacao/dashboard` | KPIs agregados | `IMPL_Projeto`, `IMPL_Tarefa` |
| `AgendaController` | `/implantacao/agenda` | `AgendaItem` | `IMPL_Agenda` |
| `EquipesController` (legado) | `/implantacao/equipe` | MembroPerfil | `IMPL_MembroEquipe`, `tbfuncionario` |
| `LegacyController` | `/implantacao/legacy` | Legado | `tbcliente`, `tbchamado`, `tbfuncionario`, `tbfuncao` |

### Endpoints por Controller (resumido)

| Controller | GET | POST | PUT | DELETE | Patch/Especiais |
|-----------|-----|------|-----|--------|-----------------|
| Clientes | ✅ | ✅ | ✅ | ✅ | — |
| Equipes | ✅ | ✅ | ✅ | ✅ | POST `/membros`, DELETE `/membros/{id}` |
| TiposProjeto | ✅ | ✅ | ✅ | ✅ | — |
| Etapas | ✅ | ✅ | ✅ | ✅ | — |
| ColunasKanban | ✅ | ✅ | ✅ | ✅ | POST `/reordenar` |
| Projetos | ✅ | ✅ | ✅ | ✅ | GET `/proximo-codigo`, PATCH `/{id}/status` |
| Tarefas | ✅ | ✅ | ✅ | ✅ | PATCH `/{id}/coluna`, POST `/{id}/comentarios` |
| Dashboard | ✅ | — | — | — | — |
| Agenda | ✅ | ✅ | ✅ | ✅ | GET `/ics/{operadorId}` |
| Equipe | ✅ | — | ✅ | — | GET `/diretorio`, GET `/perfil/{id}`, PUT `/perfil/{id}` |
| Legacy | ✅ | — | — | — | GET `/clientes`, `/chamados`, `/indicacoes`, `/funcionarios` |

### Segurança
- Todos com `[Authorize]`
- Rate limiting `validacao` (5/min por usuário) para escrita
- Validação `clienteObrigatorio` por tipo de projeto
- Geração automática de código (`ProjetoService.ProximoCodigoAsync`)

### Observações Técnicas
- Versionamento: `Asp.Versioning.Mvc` com `api/v{version:apiVersion}`
- `[ApiVersion("1.0")]` em todos controllers
- Seed em Development: 2 equipes, 4 tipos, 13 etapas, 3 clientes, 2 projetos fakes
- Migration `20260904194350_ImplantacaoInit.cs` para criar tabelas
- `deploy.ps1` **não** aplica migrations

---

### 17.4 `DatabaseController`

**Controller:** `Controllers/Database/DatabaseController.cs`

### O que faz
API do Database Explorer — metadados, relacionamentos, execução de queries, configuração de conexão, procedimentos armazenados, triggers, dependências, análise de procedures, diff de schema e snapshots.

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/database/status` | Status de conexão | `DatabaseConnectionService` |
| GET | `/api/v1/database/info` | Info do servidor | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables` | Lista tabelas | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}` | Detalhe tabela | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}/columns` | Colunas | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}/indexes` | Índices | `DatabaseMetadataService` |
| GET | `/api/v1/database/tables/{schema}/{name}/dependencies` | Dependências da tabela | `DatabaseMetadataService` |
| GET | `/api/v1/database/relationships` | Relacionamentos | `DatabaseRelationshipInferenceService` |
| GET | `/api/v1/database/graph` | Grafo BFS | `DatabaseRelationshipInferenceService` |
| GET | `/api/v1/database/column-usage` | Uso de coluna | `DatabaseRelationshipInferenceService` |
| GET | `/api/v1/database/search` | Busca global | `DatabaseSearchService` |
| GET | `/api/v1/database/search/global` | Busca global unificada | `DatabaseMetadataService` |
| GET | `/api/v1/database/procedures` | Lista procedures | `DatabaseMetadataService` |
| GET | `/api/v1/database/procedures/{schema}/{name}` | Detalhe procedure | `DatabaseMetadataService` |
| GET | `/api/v1/database/procedures/search` | Busca procedures | `DatabaseSearchService` |
| GET | `/api/v1/database/procedures/{schema}/{name}/analysis` | Análise procedure | `DatabaseMetadataService` |
| GET | `/api/v1/database/triggers` | Lista triggers | `DatabaseMetadataService` |
| GET | `/api/v1/database/triggers/{schema}/{name}` | Detalhe trigger | `DatabaseMetadataService` |
| POST | `/api/v1/database/query` | Executa query SELECT | `DatabaseQueryService` |
| POST | `/api/v1/database/test-connection` | Testa conexão | `DatabaseConnectionService` |
| GET | `/api/v1/database/config` | Configuração | `DatabaseConnectionService` |
| PUT | `/api/v1/database/config` | Salva configuração (requer role Admin) | `DatabaseConnectionService` |
| POST | `/api/v1/database/query-builder` | Query Builder básico | `DatabaseQueryBuilderService` |
| POST | `/api/v1/database/query-builder-advanced` | Query Builder avançado (WHERE, ORDER BY, GROUP BY, CTEs) | `DatabaseQueryBuilderService` |
| POST | `/api/v1/database/diff` | Diff schema vs Markdown | `DatabaseSchemaDiffService` |
| POST | `/api/v1/database/snapshot` | Salvar snapshot | `DatabaseSnapshotService` |
| GET | `/api/v1/database/snapshots` | Listar snapshots | `DatabaseSnapshotService` |

### Banco de Dados
- `dbActyon_JCA` (SQL Server 192.168.2.154)
- Metadados via `sys.*` views
- `sys.foreign_keys` para relacionamentos
- Procedures para execução

### Segurança
- SELECT-only (regex bloqueia DML/DDL + OPENROWSET/OPENDATASOURCE/xp_cmdshell/sp_/xp_/WAITFOR DELAY/SHUTDOWN/RECONFIGURE)
- Senha via env var `DB_EXPLORER_SENHA`
- Transação ReadUncommitted + ROLLBACK explícito
- Timeout 1-120s, Limite 1-5000
- User-secrets em Development
- `PUT /config` protegido com role Admin
- `TrustServerCertificate=false` como default em produção

### Observações Técnicas
- `AppDbContextDesignTimeFactory` para EF Core migrations com SQL Server
- Configuração via `DatabaseConnectionConfig`
- Novos services: `DatabaseSchemaDiffService`, `DatabaseSnapshotService`, `DatabaseQueryBuilderService` (avançado)

---

### 17.5 `LegacyController`

**Controller:** `Controllers/Implantacao/LegacyController.cs`

### O que faz
Endpoints read-only para consulta de dados legados do `dbBUSINESS_HML`. Popula dropdowns no frontend (clientes, chamados, indicações, funcionários).

### Endpoints
| Método | Rota | Descrição | Service |
|--------|------|-----------|---------|
| GET | `/api/v1/implantacao/legacy/clientes` | Lista clientes legados | `LegacyDataService.ListarClientesAsync()` |
| GET | `/api/v1/implantacao/legacy/clientes/{id}` | Cliente específico | `LegacyDataService.ObterClienteAsync()` |
| GET | `/api/v1/implantacao/legacy/chamados` | Lista chamados | `LegacyDataService.ListarChamadosAsync()` |
| GET | `/api/v1/implantacao/legacy/indicacoes` | Lista indicações | `LegacyDataService.ListarIndicacoesAsync()` |
| GET | `/api/v1/implantacao/legacy/funcionarios` | Lista funcionários | `LegacyDataService.ListarFuncionariosAsync()` |

### Banco de Dados
- `dbBUSINESS_HML` (legado)
- Tabelas: `tbcliente`, `tbchamado`, `tbfuncionario`, `tbfuncao`

### Segurança
- `[Authorize]` + rate limiting
- Nenhuma escrita

### Observações Técnicas
- Dados legados para dropdowns frontend
- FKs lógicas para `tbcliente` e `tbchamado` (v1.2.0)

---

## 18. Backend — Entidades & Banco de Dados

### 18.1 Tabelas do Sistema (Produção — SQL Server)

| Tabela | Descrição | Model |
|--------|-----------|-------|
| `RefreshTokens` | Refresh tokens hasheados (SHA-256), rotativos | `RefreshToken.cs` |
| `AuditoriaAcessos` | Auditoria de login/logout/visualização | `AuditoriaAcesso.cs` |
| `TBOPERADOR` | Operadores do sistema (login, perfil, função) | `Operador.cs` |

### 18.1.1 Cadastro de Operadores — Atribuição Automática por Perfil e Função

**Regra de Negócio**: No cadastro de operadores, **não há campo de seleção manual de equipe**. A equipe e o papel do operador são atribuídos automaticamente a partir do vínculo da **Função** e do **Perfil**.

#### Mapeamento das Tabelas e Regras

##### Tabela: `TBOPERADOR`
- A coluna `PERFIL_ID` estabelece o nível de acesso do operador.
- A coluna `FUNCAO_ID` (FK para `tbfuncao`) define a função e papel automático.

##### Tabela: `tbfuncao`
| FUNCAO_ID | DESCRICAO | Classificação / Regra de Negócio |
| :--- | :--- | :--- |
| **1** | Analista de Sistemas | **Implantador** (Definido automaticamente como responsável por projetos de implantação) |
| **2** | Suporte | Atendimento operacional e resolução de chamados |
| **3** | Programador | Desenvolvimento e engenharia de software |

#### Regra de Processamento
- Ao selecionar a função do operador no cadastro:
  - Caso `FUNCAO_ID = 1` (Analista de Sistemas), a aplicação seta internamente o papel do usuário como **Implantador**, vinculando-o diretamente aos fluxos e projetos do módulo de Implantação.
  - O banco de dados grava o registro na `TBOPERADOR` com a relação de `PERFIL_ID` e `FUNCAO_ID` sem necessidade de escolha manual de equipe.
  - O claim `eh_implantador` é adicionado ao JWT quando `FUNCAO_ID = 1`.

### Fluxo de Persistência e Comunicação com o Banco de Dados (Cadastro de Operador)

1. **Consulta e Renderização Inicial (SELECT)**
   - Ao acessar o cadastro, o backend consulta `tbfuncao` para popular o dropdown de funções disponíveis.

2. **Criação e Registro de Novos Dados (INSERT)**
   - O administrador preenche os dados do operador e seleciona a Função.
   - A aplicação envia os dados via POST.
   - O banco grava os dados na tabela `TBOPERADOR` (`INSERT INTO ...`) com `PERFIL_ID` e `FUNCAO_ID`.
   - Se `FUNCAO_ID = 1`, o claim `eh_implantador=true` é incluído no JWT gerado no login.

3. **Atualização e Alterações (UPDATE)**
   - Alterações de função ou perfil disparam uma requisição PUT.
   - É executado um comando `UPDATE` na tabela `TBOPERADOR`, atualizando `FUNCAO_ID`, `PERFIL_ID` e `DataAlteracao`.
   - O claim `eh_implantador` no JWT é recalculado no próximo login/refresh.

4. **Remoção ou Inativação (DELETE / Soft Delete)**
   - Ao inativar um operador, a aplicação executa um `UPDATE` alterando `SE_ATIVO = 'N'` para preservar o histórico.

---

### 18.2 Tabelas do Módulo IMPLANTAÇÃO (v1.1.0)

| Tabela | Prefixo | Descrição | Model |
|--------|---------|-----------|-------|
| `IMPL_Cliente` | `CLI_` | Cadastro de clientes (CNPJ, contato, observacao, ativo, auditoria) | `Cliente.cs` |
| `IMPL_Equipe` | `EQP_` | Equipes (`IMPLANTACAO`, `CIAA`) com prefixo de código | `Equipe.cs` |
| `IMPL_MembroEquipe` | `MBE_` | Vínculo N:N operador↔equipe | `MembroEquipe.cs` |
| `IMPL_TipoProjeto` | `TPP_` | Tipos: `CLIENTE`/`CARTEIRA`/`INTEGRACAO`/`PROJETO_CIAA` | `TipoProjeto.cs` |
| `IMPL_Etapa` | `ETP_` | Etapas configuráveis (vinculadas a um tipo de projeto) | `Etapa.cs` |
| `IMPL_ColunaKanban` | `CLK_` | Colunas do Kanban (limite 8, 5 padrão seeded) | `ColunaKanban.cs` |
| `IMPL_Projeto` | `PRJ_` | Projeto principal (codigo, equipe, tipo, cliente opcional) | `Projeto.cs` |
| `IMPL_Tarefa` | `TRF_` | Tarefas (titulo, projeto, etapa, coluna Kanban, responsavel, status) | `Tarefa.cs` |
| `IMPL_ComentarioTarefa` | `CMT_` | Comentários / histórico da tarefa | `ComentarioTarefa.cs` |
| `IMPL_Agenda` | `AGD_` | Eventos compartilhados (v1.3.0) | `AgendaItem.cs` |
| `IMPL_MembroPerfil` | `MBP_` | Diretório de equipe (v1.3.0) | — |

### 18.3 Migrations EF Core

| Migration | Data | Descrição |
|-----------|------|-----------|
| `20260904194350_ImplantacaoInit` | 2026-09-04 | Criação das 9 tabelas `IMPL_*` (v1.0.0) |
| `20260905195554_AddLegadoLinks` | 2026-09-05 | FKs lógicas para `tbcliente` e `tbchamado` (v1.2.0) |
| `20260905203422_AddAgendaAndPerfis` | 2026-09-05 | `IMPL_Agenda`, `IMPL_MembroPerfil` (v1.3.0) |
| `20260906033406_AddAuditoriaImplantacao` | 2026-09-06 | Auditoria do módulo IMPLANTAÇÃO |
| `20260910131252_AddFuncaoIdToOperador` | 2026-09-10 | Adiciona `FUNCAO_ID` em `TBOPERADOR` |
| `20260910133335_AddFuncaoTableAndRelation` | 2026-09-10 | Cria tabela `tbfuncao` + FK em `TBOPERADOR` |

### 18.4 Serviços Principais do Backend

| Service | Finalidade | Observações |
|---------|------------|-------------|
| `AuthService` | JWT login/refresh/logout/me | Refresh token rotativo, SHA-256 |
| `GoogleSheetsService` | Leitura planilha Google Sheets | API key + fallback CSV, cache 10 min |
| `PasswordValidationService` | Validação senha mestre | Cache 5 min + lockout |
| `BruteForceGuard` | Anti-força bruta | 5 falhas/5 min → 15 min |
| `SegurancaHelper` | Comparação senha em tempo constante | SHA-256 |
| `ProjetoServico` | CRUD projetos + geração código | `ProximoCodigoAsync()` |
| `DashboardService` | KPIs agregados | Por equipe |
| `DatabaseService` | Database Explorer endpoints | 14 endpoints |
| `LegacyDataService` | Dados legados | Read-only |

### 18.5 Configuração do Backend (`Program.cs`)

```csharp
// Autenticação JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            RequireExpirationTime = true,
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            // ...
        };
    });

// Rate Limiting
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// CORS com AllowCredentials()
builder.Services.AddCors(options => {
    options.AddPolicy("Angular", policy => policy
        .WithOrigins("http://192.168.2.130:1010", "http://localhost:4200", "http://localhost:1010")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});
```

### 18.6 Ambiente de Desenvolvimento vs Produção

| Aspecto | Development | Produção |
|---------|-------------|----------|
| Banco | `UseInMemoryDatabase` (seed automático) | SQL Server (`appsettings.json` do servidor) |
| Swagger | `SwaggerEnabled: true` | `SwaggerEnabled: false` |
| Senha JWT | Chave fraca de propósito | `JWT_KEY` via env var |
| Seed | 1 operador (admin/admin123), 2 equipes, 4 tipos, 13 etapas, 3 clientes, 2 projetos fakes | Nenhum (dados reais) |
| AppSettings | `appsettings.Development.json` | `appsettings.json` do servidor (preservado) |

---

> ⚠️ **Nota:** Este arquivo é gerado automaticamente. Qualquer alteração em componentes, services, controllers ou models deve ser refletida aqui pelo agente `docs-writer`.
> Para atualizar: invocar `@docs-writer` ou o workflow GitHub Action `docs-sync.yml` executará em PRs para `developer`.
