---
title: "Visão geral da Central de Operação"
description: "Propósito, público, módulos, rotas ativas, stack, ambientes, segurança e roadmap."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# 01 — Visão geral

> Esta é a visão funcional vigente, com validade em 2026-09-25, baseada no snapshot curado do working tree de 2026-09-24. Para a composição interna, consulte [`02-ARQUITETURA.md`](./02-ARQUITETURA.md). Para organizar ou consultar a documentação, comece por [`README.md`](./README.md).
>
> A análise é documental e não representa execução de build, testes, QA, deploy ou smoke.

## Busca rápida (Ctrl+F)

Use termos como `propósito`, `rotas`, `agenda`, `implantação`, `database`, `stack`, `Development`, `IIS`, `segurança` e `roadmap` para localizar este documento.

## 1. Propósito

A Central de Operação é um portal interno que reúne, em uma única aplicação:

- conhecimento e conteúdo de atendimento;
- ferramentas, utilitários e consulta controlada de acessos;
- agenda operacional;
- gestão de projetos, implantações, tarefas e Kanban;
- consulta de estrutura de banco de dados;
- conteúdos institucionais da JCA;
- acesso contextual ao assistente JOTA por widget.

O produto combina conteúdo estático, dados cadastrados e operações em tempo de execução. A documentação deve distinguir essas três origens para não apresentar conteúdo local como API real.

## 2. Público e acesso

O público principal é a equipe interna da JCA Soluções que precisa apoiar atendimento, consultar conhecimento, acompanhar implantação e usar ferramentas operacionais.

- `/login` é a única entrada de frontend sem `authGuard`.
- O shell principal exige usuário autenticado.
- `/admin` exige `authGuard` e `adminGuard`; o guard aceita somente o perfil `Administrador`.
- As leituras dos cadastros de tipos e colunas são autenticadas; suas escritas exigem role `Administrador`, e o dashboard administrativo também exige essa role.
- Acesso a dados sensíveis de empresas exige validação de senha, com revalidação quando o cache de cinco minutos expira, e registra auditoria.
- O frontend não é a fronteira final de segurança: controllers e serviços do backend também validam token, role e estado do usuário.

O tipo `PerfilUsuario` do frontend declara `Usuario`, `Editor`, `Administrador`, `Suporte` e `F`. O mapper atual do backend reconhece `Administrador`, `Suporte` e, por fallback, `Usuario`; a rota de administração e as regras de role devem ser confirmadas no backend antes de ampliar perfis.

## 3. Módulos e rotas ativas

As rotas abaixo foram conferidas em `app.routes.ts`, `features.routes.ts`, `implantacao.routes.ts`, `database.routes.ts` e `admin.routes.ts`.

| Área | Rotas ativas | Acesso |
|---|---|---|
| Login | `/login` | Público no frontend |
| Início | `/` | Autenticado |
| Agenda | `/agenda` | Autenticado |
| Conhecimento | `/fraseologia`, `/conhecimento`, `/modelo-chamados`, `/politica`, `/stack`, `/trilhas/resolver`, `/trilhas/sql`, `/trilhas/rede`, `/trilhas/infra`, `/visao-adm`, `/visao-adm/detalhe/:id` | Autenticado |
| Cursos | `/cursos`, `/cursos/detalhe/:id` | Autenticado |
| Ferramentas e Acessos | `/ferramentas`, `/ferramentas/detalhe/:id`, `/ferramentas/acessos`, `/ferramentas/faq` | Autenticado |
| Empresa | `/empresa` redireciona para `/empresa/onboarding`; `/empresa/onboarding/capitulo/:id` | Autenticado |
| Implantação | `/implantacao` redireciona para `/implantacao/dashboard`; também existem `/implantacao/kanban`, `/implantacao/projetos`, `/implantacao/projetos/novo`, `/implantacao/projetos/:id`, `/implantacao/projetos/:id/editar`, `/implantacao/tarefas`, `/implantacao/tarefas/novo` e `/implantacao/tarefas/:id/editar` | Autenticado |
| Banco de Dados | `/database` redireciona para `/database/visao-geral`; também existem `/database/explorador`, `/database/relacionamentos`, `/database/consultas`, `/database/diferencas`, `/database/configuracao` e `/database/tabela/:schema/:tabela` | Autenticado |
| Administração | `/admin` redireciona para `/admin/cadastros/tipos-projeto`; também existem `/admin/cadastros/tipos-projeto/novo`, `/admin/cadastros/tipos-projeto/editar/:id`, `/admin/kanban`, `/admin/tarefas` e `/admin/projetos` | Autenticado e `Administrador` no frontend |
| JOTA | Widget global no `MainLayout` | Autenticado; não existe página `/chat` |

Redirecionamentos de compatibilidade ainda presentes:

- `/ferramentas/contra-senha` → `/ferramentas`;
- `/ferramentas/modelos` → `/modelo-chamados`;
- `/whatsapp-flow` → `/fraseologia`;
- `/implantacao/relatorio` → `/implantacao/dashboard`;
- `/implantacao/agenda` → `/agenda`;
- `/database/query-builder` → `/database/consultas`;
- rota não encontrada → `/`.

Observações de navegação:

- `/conhecimento` é uma rota válida, embora não apareça na navegação lateral atual.
- O serviço de JOTA contém métodos de sessão sem controllers correspondentes; a única API de proxy implementada é `POST /api/rag-proxy/chat`.
- Não há rota frontend `/admin/dashboard` em `admin.routes.ts`, embora exista endpoint administrativo no backend.
- `scripts/screens-data.json` ainda pode listar rotas antigas; ele não altera essa lista.

## 4. Stack real

### Frontend

- Angular 18.2 em uma única aplicação, com componentes standalone.
- TypeScript 5.5, RxJS 7.8 e Angular Router.
- SSR, hydration e prerender configurados; build de produção gera artefatos de browser e server.
- Bootstrap 5.3 importado parcialmente, Bootstrap Icons 1.13 e ng-bootstrap 17.
- Angular CDK 18 para interações de Kanban.
- Chart.js 4.4 para visualizações.
- Express 4.18 como runtime do servidor Angular SSR.

### Backend

- ASP.NET Core 8 em `backend/Central_BackEnd/Central_BackEnd.csproj`.
- C# com nullable e implicit usings habilitados.
- Controllers MVC, injeção de dependência e serviços separados por domínio.
- Entity Framework Core 8 com provider SQL Server ou InMemory conforme ambiente e flag.
- API Versioning com versão pública `v1`.
- JWT Bearer e Swagger/Swashbuckle.
- Limitação de taxa e proteção de tentativas de login.

### Dados e integrações

- SQL Server para dados operacionais, implantação, agenda, autenticação e auditoria.
- SQL Server separado, configurado por seção ou variáveis de ambiente, para o Database Explorer.
- Google Sheets como fonte do acervo de Acessos.
- AnythingLLM acessado pelo backend através do proxy RAG.

### Convenções visuais confirmadas

- Escala global de 80% por `html.scaled` em todas as telas, exceto `/login`.
- Unidades estruturais em `rem`, com bordas e linhas finas em `px`.
- A lista de projetos usa layout e cards compactos; o detalhe está em [`06-COMPONENTES-FRONTEND.md`](./06-COMPONENTES-FRONTEND.md).

## 5. Ambientes reais

> URLs, IPs, portas e alvos de dados abaixo são defaults operacionais extraídos de código e scripts, não uma prova do estado atual de um servidor. Confirme cada valor no ambiente antes de usá-lo.

| Ambiente | Frontend | Backend | Persistência e observações |
|---|---|---|---|
| Local, Development | `http://localhost:4200` (default a confirmar) | `http://localhost:1009` (default a confirmar); Swagger em `/swagger` | A seleção depende de `Database:UseSqlServer`: `false` usa EF Core InMemory `CentralDev`; `true` usa SQL Server. O valor efetivo local deve ser confirmado. |
| Homologação de dados para desenvolvimento | — | Endpoint local do backend | Código e scripts usam como referência operacional o SQL Server `192.168.2.154` e o banco `dbBUSINESS_HML`; confirmar rota e configuração efetiva. Credenciais não são reproduzidas aqui. |
| IIS/produção | `http://192.168.2.130:1010` (default operacional a confirmar) | `http://192.168.2.130:1009/api/v1` (default operacional a confirmar); Swagger em `/swagger` | Código e scripts referenciam SQL Server `192.168.2.130`, banco `Central_Conhecimento` e autenticação integrada; confirmar bindings e configuração efetiva. O deploy preserva `appsettings*.json` do servidor. |
| AnythingLLM | — | Integração externa | `RagProxyService` tem como default de código `http://localhost:3001/api/v1` quando a configuração não fornece outro valor; confirmar o endpoint efetivo do ambiente. O timeout e o fallback devem ser conferidos na configuração ativa. |
| Google Sheets | — | Integração externa | A origem, o intervalo e a disponibilidade dependem da configuração efetiva; não reproduzir identificadores ou conteúdo sensível. |

O código do frontend define `useMockAuth=false`; a configuração efetiva deve ser conferida no ambiente. A tela de login e a renovação chamam o backend real. O Database Explorer possui precedência própria: variáveis `DB_EXPLORER_*`, depois seção `DatabaseExplorer`, depois configuração vazia; sua disponibilidade deve ser confirmada no servidor.

## 6. Segurança resumida

- Access token JWT fica somente na memória do frontend.
- Refresh token fica no cookie HttpOnly `cc_refresh`; o JSON da API não entrega seu valor.
- Cada refresh rotaciona o token: o anterior é revogado e recebe um substituto.
- Refresh tokens expiram em quatro horas; cada uso válido cria uma nova janela de quatro horas, produzindo renovação deslizante durante a atividade.
- Login possui limitação de taxa e bloqueio local de tentativas; validação de dados sensíveis e leitura também possuem limites.
- CORS usa lista explícita de origens e `AllowCredentials`.
- Detalhes de Acessos exigem revalidação, expiram após cinco minutos e geram auditoria.
- O Database Explorer não oferece execução de SQL arbitrário pelos endpoints atuais; trabalha com metadados, busca, relações, comparação de schemas e de corpos de procedures, construção de consultas e geração/validação estática de scripts de correção (somente texto, nunca executado).
- Há limites relevantes: o cookie refresh usa `Secure=false`, os defaults operacionais de URL são HTTP e devem ser confirmados no ambiente, e a comparação de senha usa SHA-256 sem algoritmo adaptativo com salt.

A descrição completa dos controles, exceções e limites está em [`02-ARQUITETURA.md`](./02-ARQUITETURA.md).

## 7. Roadmap: atual, plano e histórico

| Situação | Item | Como interpretar |
|---|---|---|
| Atual | Um frontend Angular e um backend ASP.NET Core | Arquitetura vigente e único bundle/site frontend |
| Atual | Autenticação, Agenda, Acessos, Implantação, Database Explorer e bases de conhecimento | Módulos presentes nas rotas e serviços reais |
| Atual | SQL Server, Google Sheets e proxy AnythingLLM | Integrações implementadas, com configuração por ambiente |
| Atual | Deploy IIS, backup, preservação de `appsettings*.json`, `BUILD_INFO` e smoke | Fluxo operacional documentado em [`10-DEPLOY.md`](./10-DEPLOY.md) |
| Plano | Migração de um para quatro webapps | Apenas desenho; não há quatro projetos Angular nem quatro sites no working tree |
| Atual | Reorganização de documentos legados em backup | Executada; `docs/backup/2026-09-24/` é snapshot curado e não canônico |
| Histórico | Módulo Gestor e Central Executiva removidos | Não tratar `/executivo` ou componentes antigos como funcionalidade atual |
| Histórico | Página `/chat` removida | JOTA continua somente como widget global |
| Histórico | `/administrativo` comentado | A rota não está ativa; o filtro ADM usa a rota de Implantação com parâmetro de perfil |

O plano multi-webapp está em [`ARQUITETURA-MULTI-WEBAPP.md`](./ARQUITETURA-MULTI-WEBAPP.md). Ele não deve ser usado para descrever o estado atual sem indicar explicitamente que é um plano.
