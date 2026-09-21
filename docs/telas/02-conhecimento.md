> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 4. Ferramentas

### 4.1 `FerramentasComponent`

**Componente:** `src/app/features/ferramentas/ferramentas.component.ts`

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
- Dados em `src/app/features/ferramentas/ferramentas.data.ts`
- Lazy loading em `wiki.routes.ts:13`
- Header via `app-page-header` — Lote A (confirmado no código, `ferramentas.component.html:2-6`): `titulo="Central de Utilidades do Analista de Suporte"`, `icone="bi-grid-fill"`; títulos/ícones/textos mantidos, CSS de header local removido.

---

### 4.2 `FerramentaDetalheComponent`

**Componente:** `src/app/features/ferramentas/ferramenta-detalhe.component.ts`

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

**Componente:** `src/app/features/faq/faq.component.ts`

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
- IDENTIDADE CLEAN (21/09/2026, confirmado no código): header sem emoji — título com `<i class="bi bi-book">` + subtítulo textual (`faq.component.html:5-6`)
- Header via `app-page-header` — Lote A (confirmado no código, `faq.component.html:4-8`): `titulo="Glossário Interno Actyon"`, `descricao="Termos e conceitos padronizados da operação, organizados por capítulos temáticos para consulta rápida do time."`, `icone="bi-book"`; títulos/ícones/textos mantidos, CSS de header local removido.

---

## 5. Acessos

### 5.1 `AcessosComponent`

**Componente:** `src/app/features/acessos/acessos.component.ts`

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
- Header via `app-page-header` — Lote A (confirmado no código, `acessos.component.html:2-6`): `titulo="Acessos das Empresas"`, `icone="bi-building"`; títulos/ícones/textos mantidos, CSS de header local removido. Fora do escopo: modais de senha/detalhe mantidos.
- Auditoria registrada em `AuditoriaAcessos` a cada visualização
- Credenciais TS/Banco/VPN/Actyon/AnyDesk/Observações em blocos (`GrupoDetalhe[]`)
- Copiar para clipboard com fallback `execCommand('copy')`
- Lazy loading em `wiki.routes.ts:21`

---

## 6. Cursos

### 6.1 `CursosComponent`

**Componente:** `src/app/features/cursos/cursos.component.ts`

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

**Componente:** `src/app/features/cursos/curso-detalhe.component.ts`

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

**Componente:** `src/app/features/trilhas/trilhas.component.ts` (+ `.html`/`.scss`)

### O que faz
Página "Como resolver esse problema?" — guia de atendimento do CRM Actyon em 8 seções (acordeão). Tem filtro de seções por palavra-chave, 3 exemplos rápidos clicáveis e CTA para o JOTA (`/chat`) quando nada corresponde.

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
- Redesign `.tdh` (8 seções: classificação, diagnóstico, documentos, plano-ação, comunicação, fechamento, fluxo-resumido, exemplos-práticos; `secoesMeta` com `chaves` de busca)
- Filtro: `filtro` + `secoesVisiveis()` (título + chaves, case-insensitive); vazio → "Nenhuma seção corresponde. Tente outro termo ou pergunte ao JOTA" (link `/chat`)
- Exemplos rápidos (`exemplosRapidos`, 3 fixos: Lentidão no CRM, Erro 500 geral, Usuário sem acesso → abrem `exemplos-praticos`) + card CTA "Não achou? Pergunte ao JOTA com o contexto" (`/chat`)

---

### 7.2 `TrilhaSqlComponent` (`/trilhas/sql`)

**Componente:** `src/app/features/trilha-sql/trilha-sql.component.ts`

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

**Componente:** `src/app/features/trilha-rede/trilha-rede.component.ts`

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

**Componente:** `src/app/features/trilha-infra/trilha-infra.component.ts`

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
- IDENTIDADE CLEAN (21/09/2026, confirmado no código): bullets de diagnóstico sem emoji 👉 — setas textuais `→` embutidas no texto dos `<li>` (`trilha-infra.component.html`)

---

## 8. Stack

### 8.1 `StackComponent`

**Componente:** `src/app/features/stack/stack.component.ts`

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

## 9. Fraseologia

### 10.1 `FraseologiaComponent`

**Componente:** `src/app/features/fraseologia/fraseologia.component.ts`

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
- Fluxo de atendimento e fraseologias na seção Resolver da sidebar; também embutida na aba Fraseologias de `/conhecimento`
- Header via `app-page-header` — Lote A (confirmado no código, `fraseologia.component.html:4-8`): `titulo="Fluxo de Atendimento e Fraseologias"`, `icone="bi-diagram-3-fill"`; títulos/ícones/textos mantidos, CSS de header local removido (blocos internos `.fb-bloco__header` mantidos — seções de conteúdo).

---

## 9b. Conhecimento do Setor (Corretor #4)

### 9b.1 `ConhecimentoSetorComponent`

**Componente:** `src/app/features/conhecimento/conhecimento-setor.component.ts` — rota `/conhecimento` (link "Conhecimento do Setor" na seção Resolver)

### O que faz
"Aprender e resolver na mesma tela": 4 abas internas (mesma URL) — Base de Conhecimento (`app-trilhas`), Fraseologias (`app-fraseologia`), Procedimentos (`app-visao-adm`) e FAQ (`app-faq`) — reutilizando os componentes existentes (renderização preguiçosa por aba ativa).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| — | — | ❌ Nenhum direto (cada aba usa seus services) |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| — | — | — | ❌ Nenhum direto |

---

## 10. Modelo de Chamados

### 11.1 `ModeloChamadosComponent`

**Componente:** `src/app/features/modelo-chamados/modelo-chamados.component.ts`

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
- Header via `app-page-header` — Lote A (confirmado no código, `modelo-chamados.component.html:4-8`): `titulo="Documentar chamados e atendimentos"`, `descricao="Escolha o tipo de registro abaixo e copie o conteúdo formatado para colar no sistema interno."`, `icone="bi-file-earmark-text-fill"`; títulos/ícones/textos mantidos, CSS de header local removido, tag redundante do header antigo removida.

---

## 11. Política

### 12.1 `PoliticaComponent`

**Componente:** `src/app/features/politica/politica.component.ts`

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

## 12. Visão ADM

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
- Header via `app-page-header` — Lote A (confirmado no código, `visao-adm.component.html:2-6`): `titulo="Visão ADM"`, `icone="bi-clipboard-data-fill"`; títulos/ícones/textos mantidos, CSS de header local removido. Fora do escopo: hero interno `util__hero` da Central de Utilidades (`visao-adm.component.html:105`, `visao-adm.component.scss:17`) mantido.

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
