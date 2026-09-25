---
title: "Histórias de Telas — QA"
description: "Cenários funcionais consolidados por tela, com rotas, endpoints, tabelas e nível de automação confirmados na árvore de trabalho."
date: "2026-09-25"
language: "pt-BR"
status: "cenário documentado"
---

# Histórias de Telas — QA

> Documento novo, produzido por inspeção estática da árvore de trabalho em **2026-09-25**. Ele consolida o roteiro anterior de [`HISTORIAS-TELAS.md`](./backup/2026-09-24/HISTORIAS-TELAS.md) e os cenários descritos nos módulos de [`TELAS.md`](./backup/2026-09-24/TELAS.md), sem tratar a documentação arquivada como fonte superior ao código.
>
> **Regra de status:** `cenário documentado` significa que objetivo, passos e resultado foram derivados do código; não significa que o cenário foi executado. `validado em teste` significa que existe um artefato de teste automatizado que cobre o comportamento indicado; também não afirma que a suíte foi executada durante a criação deste documento.
>
> Não houve, para este documento, execução de navegador, build, suíte de testes, QA manual, deploy ou smoke. A classificação de automação vem do inventário de testes presente no repositório.
>
> **Estado atual/bloqueio:** cada história separa o comportamento desejado do estado observado no código. “Sem limitação específica” significa que nenhum bloqueio foi identificado nesta inspeção; “bloqueada/limitação conhecida” significa que o cenário não deve ser tratado como garantido até a correção indicada.

## Critérios transversais confirmados

- Telas autenticadas usam `authGuard`; `/admin` usa também `adminGuard` e exige perfil `Administrador`.
- O access token e o usuário ficam somente em memória. O refresh token fica no cookie HttpOnly `cc_refresh`, com `SameSite=Strict` e `Secure=false` na configuração atual; o interceptor envia todas as requisições com credenciais (`withCredentials`), inclusive as chamadas de autenticação.
- A escala global `html.scaled` é 80% (`1rem = 12,8px`) em todas as telas, exceto `/login`, que permanece em 100%.
- A listagem de Projetos usa o layout compacto de três colunas: filtros, conteúdo e resumo; a lista de projetos é vertical e cada card mostra as nove etapas fixas.
- Conteúdo estático, buscas locais, `localStorage` e `sessionStorage` não são tratados como endpoint ou persistência de backend.
- Tarefa com projeto exige etapa do projeto **do mesmo projeto**; o backend recusa etapa sem projeto na criação e zera a etapa da tarefa sem projeto na atualização. O formulário de Tarefa mantém a etapa sempre visível, desabilitada sem projeto, durante o carregamento e em caso de falha de carga, e o `PUT` de tarefa não altera o projeto.

## Índice de telas para `Ctrl+F`

| Grupo | Tela ou fluxo | Rota ativa | História | Status |
|---|---|---|---|---|
| Login/Base | Login | `/login` | LB-01 | cenário documentado |
| Login/Base | Renovação, expiração e logout | rotas protegidas | LB-02 | cenário documentado |
| Login/Base | Home | `/` | LB-03 | cenário documentado |
| Login/Base | Busca global do Header e da Home | `/` e Header | LB-04 | validado em teste |
| Login/Base | Layout, menu, breadcrumb e escala | todas as rotas autenticadas | LB-05 | cenário documentado |
| Conhecimento/Ferramentas | Conhecimento e Resolver | `/conhecimento`, `/trilhas/resolver` | CF-01 | cenário documentado |
| Conhecimento/Ferramentas | Guias SQL, Rede e Infra | `/trilhas/sql`, `/trilhas/rede`, `/trilhas/infra` | CF-02 | cenário documentado |
| Conhecimento/Ferramentas | Ferramentas e detalhe | `/ferramentas`, `/ferramentas/detalhe/:id` | CF-03 | cenário documentado |
| Conhecimento/Ferramentas | Acessos das Empresas | `/ferramentas/acessos` | CF-04 | cenário documentado |
| Conhecimento/Ferramentas | FAQ/Glossário | `/ferramentas/faq` | CF-05 | cenário documentado |
| Conhecimento/Ferramentas | Cursos e detalhe | `/cursos`, `/cursos/detalhe/:id` | CF-06 | cenário documentado |
| Conhecimento/Ferramentas | Fraseologias | `/fraseologia` | CF-07 | cenário documentado |
| Conhecimento/Ferramentas | Modelo de chamados | `/modelo-chamados` | CF-08 | cenário documentado |
| Conhecimento/Ferramentas | Stack e Políticas | `/stack`, `/politica` | CF-09 | cenário documentado |
| Conhecimento/Ferramentas | Visão ADM | `/visao-adm` | CF-10 | cenário documentado |
| Conhecimento/Ferramentas | Detalhe de procedimento | `/visao-adm/detalhe/:id` | CF-11 | cenário documentado |
| Implantação | Dashboard | `/implantacao/dashboard` | IM-01 | cenário documentado |
| Implantação | Projetos | `/implantacao/projetos` | IM-02 | cenário documentado |
| Implantação | Novo/editar Projeto | `/implantacao/projetos/novo`, `/implantacao/projetos/:id/editar` | IM-03 | cenário documentado |
| Implantação | Detalhe do Projeto e etapas | `/implantacao/projetos/:id` | IM-04 | cenário documentado |
| Implantação | Lista de Tarefas | `/implantacao/tarefas` | IM-05 | cenário documentado |
| Implantação | Nova/editar Tarefa | `/implantacao/tarefas/novo`, `/implantacao/tarefas/:id/editar` | IM-06 | validado em teste |
| Implantação | Kanban: filtros, criação e movimento | `/implantacao/kanban` | IM-07 | cenário documentado |
| Implantação | Kanban: drawer, menu e lote | `/implantacao/kanban` | IM-08 | cenário documentado |
| Database | Shell e Visão Geral | `/database`, `/database/visao-geral` | DB-01 | cenário documentado |
| Database | Explorador | `/database/explorador` | DB-02 | cenário documentado |
| Database | Detalhe de tabela | `/database/tabela/:schema/:tabela` | DB-03 | cenário documentado |
| Database | Relacionamentos | `/database/relacionamentos` | DB-04 | cenário documentado |
| Database | Criador de Consultas | `/database/consultas`, `/database/query-builder` | DB-05 | cenário documentado |
| Database | Diferenças/Sincronização | `/database/diferencas` | DB-06 | cenário documentado |
| Database | Configuração | `/database/configuracao` | DB-07 | cenário documentado |
| Empresa/Agenda | Empresa e Onboarding inicial | `/empresa`, `/empresa/onboarding` | EA-01 | cenário documentado |
| Empresa/Agenda | Capítulo de Onboarding | `/empresa/onboarding/capitulo/:id` | EA-02 | cenário documentado |
| Empresa/Agenda | Navegação e filtros da Agenda | `/agenda` | EA-03 | cenário documentado |
| Empresa/Agenda | Formulário e recorrência de evento | `/agenda` + modal | EA-04 | cenário documentado |
| Empresa/Agenda | Permissões, conflitos e persistência | `/agenda` + API | EA-05 | cenário documentado |
| Admin/Kanban F | Tipos de Projeto | `/admin/cadastros/tipos-projeto`, `/novo`, `/editar/:id` | AK-01 | cenário documentado |
| Admin/Kanban F | Kanban F | `/implantacao/kanban?perfil=F` | AK-02 | cenário documentado |
| Admin/Kanban F | Entradas administrativas compartilhadas | `/admin/kanban`, `/admin/tarefas`, `/admin/projetos` | AK-03 | cenário documentado |
| Chat/JOTA | Widget global | FAB no `MainLayout`, sem rota própria | CJ-01 | cenário documentado |
| Chat/JOTA | Contexto de tarefa | drawer do Kanban + FAB | CJ-02 | cenário documentado |

### Redirecionamentos ativos

Não são telas independentes; aparecem no índice para evitar que um link direto antigo seja tratado como funcionalidade nova.

| Origem | Destino | Observação |
|---|---|---|
| `/implantacao` | `/implantacao/dashboard` | redirecionamento do módulo |
| `/implantacao/relatorio` | `/implantacao/dashboard` | relatório foi absorvido pelo dashboard |
| `/implantacao/agenda` | `/agenda` | redirecionamento de compatibilidade |
| `/database` | `/database/visao-geral` | redirecionamento do shell |
| `/database/query-builder` | `/database/consultas` | nome legado redireciona ao Criador |
| `/empresa` | `/empresa/onboarding` | não existe tela própria de Empresa |
| `/ferramentas/contra-senha` | `/ferramentas` | apelido legado |
| `/ferramentas/modelos` | `/modelo-chamados` | apelido legado |
| `/whatsapp-flow` | `/fraseologia` | apelido legado |
| `/admin` | `/admin/cadastros` | depois redireciona para Tipos de Projeto |
| `/admin/cadastros` | `/admin/cadastros/tipos-projeto` | destino padrão |

## 1. Login/Base

### LB-01 — Entrar na Central

- **Objetivo:** Permitir que um operador autenticado entre e volte à rota solicitada.
- **Pré-condições:** operador ativo no backend; formulário disponível em `/login`; opcionalmente um `returnUrl` válido.
- **Passos:** 1. Informar `Usuário` e `Senha`. 2. Marcar ou desmarcar `Lembrar meu acesso`. 3. Clicar em `Entrar`.
- **Resultado esperado:** credenciais válidas redirecionam para o `returnUrl` quando diferente de `/`; sem link direto, redirecionam para `/`, para qualquer perfil. Credenciais inválidas exibem mensagem genérica e não criam sessão. O access token e o usuário permanecem em memória; o backend envia o cookie HttpOnly `cc_refresh`. Com `Lembrar meu acesso` marcado, o cookie recebe `MaxAge` de quatro horas; sem a opção, permanece cookie de sessão.
- **Estado atual/bloqueio:** limitação conhecida de configuração: `cc_refresh` está com `Secure=false`; o cenário de produção sob HTTPS exige revisão desse atributo.
- **Rotas/endpoints/tabelas:** `/login`; `POST /api/v1/auth/login`, público, com corpo `{ usuario, senha, lembrarAcesso }`; tabelas `TBOPERADOR` e `RefreshTokens`.
- **Status/automação:** **cenário documentado**; não há teste automatizado de login/refresh na árvore de trabalho.

### LB-02 — Renovar, expirar e encerrar a sessão

- **Objetivo:** Manter a sessão após recarregar a página e encerrá-la com segurança quando a renovação falhar.
- **Pré-condições:** cookie `cc_refresh` válido ou expirado; acesso a uma rota protegida; sessão iniciada por um operador.
- **Passos:** 1. Recarregar uma rota protegida. 2. Observar a tentativa de renovação e a restauração do usuário. 3. Simular/observar uma resposta 401 ou usar `Sair`. 4. Tentar abrir novamente uma rota protegida.
- **Resultado esperado:** após F5, o token em memória pode ser repovoado pelo refresh e o Header volta a mostrar o usuário. O interceptor envia cookies e Bearer. Se o backend rejeitar o refresh, ele limpa `cc_refresh` e `cc_lembrar`, enquanto o frontend limpa o estado em memória; a requisição original falha e a próxima navegação protegida redireciona para `/login`. Com Bearer válido, o logout autenticado deve revogar o refresh antes de limpar os cookies. A tela de login exibe a mensagem de sessão expirada quando a sinalização foi criada pelo frontend.
- **Estado atual/bloqueio:** limitação conhecida: o `AuthService` chama `/auth/logout`, mas o interceptor exclui `/auth/` do envio de Bearer; quando o token já não está disponível, o endpoint `[Authorize]` pode responder 401 e a revogação do refresh não fica garantida. Falha de rede também pode impedir a revogação.
- **Rotas/endpoints/tabelas:** `POST /api/v1/auth/refresh` com cookie `cc_refresh`; `POST /api/v1/auth/logout` com `[Authorize]`; `RefreshTokens` e `TBOPERADOR`. O `GET /api/v1/auth/me` existe no backend, mas não é consumido pelo fluxo atual do frontend.
- **Status/automação:** **cenário documentado**; não há teste automatizado específico de sessão.

### LB-03 — Usar a Home operacional

- **Objetivo:** Oferecer uma entrada rápida para busca, ações operacionais e próximos compromissos.
- **Pré-condições:** operador autenticado; backend da Agenda disponível ou em estado de falha controlado.
- **Passos:** 1. Abrir `/`. 2. Ler a saudação e usar `Buscar na Central...`. 3. Testar os seis acessos rápidos. 4. Ler a agenda dos próximos sete dias e abrir `Ver agenda`.
- **Resultado esperado:** a Home mostra saudação com o primeiro nome, seis atalhos e até cinco eventos da janela de sete dias. Falha da Agenda resulta em lista vazia, sem dados fictícios. Os blocos de “Continue de onde parou” e “Mais utilizados” não são renderizados no código atual.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a listagem da Agenda depende de o endpoint responder ou tratar a falha conforme o estado vazio.
- **Rotas/endpoints/tabelas:** `/`; `GET /api/v1/agenda/eventos?inicio=X&fim=Y`, autenticado; leitura de `IMPL_Agenda` e das tabelas de apoio de operador/tipo. A busca da Home é local e não tem endpoint.
- **Status/automação:** **cenário documentado**; não há teste automatizado da Home.

### LB-04 — Buscar no Header e na Home

- **Objetivo:** Encontrar páginas e conteúdo estático com uma busca compartilhada e acessível por teclado.
- **Pré-condições:** operador autenticado; Header ou campo da Home visível.
- **Passos:** 1. Digitar um termo. 2. Abrir um resultado com clique ou setas + `Enter`. 3. Usar `Escape`, `Tab` e `Ctrl+K`/`Cmd+K`. 4. Digitar um termo sem resultado.
- **Resultado esperado:** a consulta é compartilhada entre as duas origens, com no máximo oito resultados; `ArrowUp`/`ArrowDown` percorrem as opções, `Enter` navega, `Escape` fecha sem retirar o foco e o atalho abre, foca e seleciona o campo do Header. A semântica `combobox`/`listbox`/`option` e o status acessível permanecem expostos.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a validação existente é unitária e não substitui um teste de navegador.
- **Rotas/endpoints/tabelas:** Header e Home; nenhum endpoint HTTP e nenhuma tabela, pois `BuscaIndexService` monta o índice no navegador a partir dos acervos estáticos.
- **Status/automação:** **validado em teste** por `global-search.component.spec.ts` e `busca.service.spec.ts`; a cobertura é unitária e não representa execução desta revisão nem teste end-to-end.

### LB-05 — Navegar no layout autenticado

- **Objetivo:** Usar Header, Sidebar, breadcrumb, tema, rodapé e layouts sem perder o contexto da rota.
- **Pré-condições:** sessão válida; uma tela autenticada carregada.
- **Passos:** 1. Recolher/expandir a Sidebar. 2. Navegar por um link do menu e observar breadcrumb e outlet. 3. Alternar o tema. 4. Abrir o menu do usuário e sair.
- **Resultado esperado:** `MainLayout` monta Header, Sidebar, breadcrumb, Footer, outlet e o FAB do JOTA; `AdminLayout` é o shell separado das rotas administrativas. A escala é 80% fora de `/login`. O logout chama o endpoint de autenticação e redireciona para `/login`.
- **Estado atual/bloqueio:** limitação conhecida: a chamada de logout usa o mesmo interceptor que não adiciona Bearer a `/auth/`; a navegação local ocorre, mas a revogação no servidor depende de o backend receber uma requisição autorizada.
- **Rotas/endpoints/tabelas:** todas as rotas sob `authGuard`; `POST /api/v1/auth/logout` com `[Authorize]`; `RefreshTokens` para revogação. Não há endpoint direto de layout.
- **Status/automação:** **cenário documentado**; `app.component.spec.ts` cobre apenas criação da aplicação e presença do `router-outlet`, não o fluxo completo de navegação.

## 2. Conhecimento/Ferramentas

### CF-01 — Consultar Conhecimento/Resolver

- **Objetivo:** Encontrar o procedimento de triagem e a seção adequada para um incidente.
- **Pré-condições:** operador autenticado; conteúdo estático do guia disponível.
- **Passos:** 1. Abrir `/conhecimento` ou `/trilhas/resolver`. 2. Informar um termo no filtro. 3. Abrir uma seção do índice ou um exemplo rápido. 4. Limpar o filtro e abrir outra seção.
- **Resultado esperado:** as duas rotas renderizam o mesmo guia, com oito seções; o filtro reduz o índice, o estado vazio orienta outro termo e os exemplos abrem/rolam para “Exemplos Práticos”. Não há link para uma página `/chat` removida.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; o guia é estático e não depende de persistência de backend.
- **Rotas/endpoints/tabelas:** `/conhecimento` e `/trilhas/resolver`; nenhum endpoint e nenhuma tabela; conteúdo em `frontend/src/app/features/trilhas/trilhas.component.ts` e seu template.
- **Status/automação:** **cenário documentado**; não há teste do guia.

### CF-02 — Consultar as trilhas SQL, Rede e Infra

- **Objetivo:** Oferecer referências operacionais estáticas e comandos copiáveis para investigação.
- **Pré-condições:** operador autenticado.
- **Passos:** 1. Abrir `/trilhas/sql` e pesquisar na biblioteca/categoria. 2. Copiar uma consulta. 3. Abrir `/trilhas/rede` e expandir seções. 4. Abrir `/trilhas/infra` e expandir seções.
- **Resultado esperado:** SQL mantém o acordeão de Orientação, filtra a biblioteca e informa cópia; Rede e Infra exibem seus guias estáticos. O sistema não executa SQL nem altera o banco.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; os comandos são copiados para uso externo, não executados pelo sistema.
- **Rotas/endpoints/tabelas:** `/trilhas/sql`, `/trilhas/rede`, `/trilhas/infra`; nenhum endpoint/tabela; dados em `biblioteca-sql.data.ts` e nos componentes estáticos.
- **Status/automação:** **cenário documentado**; não há testes dessas telas.

### CF-03 — Filtrar e abrir Ferramentas

- **Objetivo:** Localizar uma ferramenta de suporte e abrir seu detalhe ou link externo.
- **Pré-condições:** operador autenticado; `ferramentas.data.ts` carregado.
- **Passos:** 1. Abrir `/ferramentas`. 2. Pesquisar por nome/descrição e selecionar `Todas` ou uma categoria. 3. Limpar filtros. 4. Abrir uma ferramenta e testar um ID inexistente.
- **Resultado esperado:** contador e lista refletem os filtros; o card abre a ferramenta ou o detalhe; uma referência local inexistente mostra estado “Ferramenta não encontrada” com retorno à Central.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a fonte das ferramentas é local e não há persistência de backend.
- **Rotas/endpoints/tabelas:** `/ferramentas`, `/ferramentas/detalhe/:id`; nenhum endpoint/tabela; `FerramentasService` e `ferramentas.data.ts` são locais.
- **Status/automação:** **cenário documentado**; não há teste da lista ou do detalhe.

### CF-04 — Consultar e validar Acessos das Empresas

- **Objetivo:** Permitir que um operador autenticado valide sua credencial antes de consultar os acessos de uma empresa.
- **Pré-condições:** operador ativo; fonte de empresas configurada; credencial de validação disponível para o teste, sem inseri-la neste documento.
- **Passos:** 1. Abrir `/ferramentas/acessos` e pesquisar uma empresa. 2. Clicar em `Visualizar Acessos`. 3. Validar usuário e senha no modal. 4. Abrir, ocultar e copiar os campos; fechar o detalhe.
- **Resultado esperado:** credencial inválida mantém o modal com erro; credencial válida abre os grupos TS, Banco, VPN, Actyon, Suporte Remoto e Observações. A interface deve manter as senhas mascaradas por padrão e o detalhe expira após cinco minutos. A visualização registra auditoria.
- **Estado atual/bloqueio:** limitação conhecida: a API recebe `usuario`/`senha` no corpo JSON em claro e a validação e a visualização usam o valor em texto; a máscara é apenas visual. A proteção depende do transporte e da política de acesso, que precisam ser verificados no ambiente.
- **Rotas/endpoints/tabelas:** `/ferramentas/acessos`; `GET /api/v1/acessos`; `POST /api/v1/acessos/validar-senha` com `{ usuario, senha }`; `POST /api/v1/acessos/visualizar?empresaId=N` com `{ senha }`; todos autenticados, e os dois últimos sob a política `validacao`. `TBOPERADOR` para validar o operador e `AuditoriaAcessos` para a visualização; a fonte de empresas é externa ao banco da Central.
- **Status/automação:** **cenário documentado**; não há teste automatizado do fluxo de credenciais.

### CF-05 — Navegar no FAQ/Glossário

- **Objetivo:** Consultar os capítulos do glossário interno sem sair da área logada.
- **Pré-condições:** operador autenticado.
- **Passos:** 1. Abrir `/ferramentas/faq`. 2. Selecionar um dos sete capítulos. 3. Rolar o conteúdo e alternar entre capítulos.
- **Resultado esperado:** o capítulo selecionado é destacado e o conteúdo correspondente é renderizado; não há chamada de API nem estado de carregamento no backend.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; o teste existente é apenas de criação do componente.
- **Rotas/endpoints/tabelas:** `/ferramentas/faq`; nenhum endpoint/tabela; `faq.component.ts` e `faq.component.html`.
- **Status/automação:** **cenário documentado**; `faq.component.spec.ts` contém somente um teste de fumaça de criação, insuficiente para marcar a navegação como validada.

### CF-06 — Filtrar cursos e abrir detalhe

- **Objetivo:** Encontrar cursos, organizá-los por categoria/nível e abrir o detalhe ou o player de vídeo quando disponível.
- **Pré-condições:** operador autenticado; dados locais de cursos carregados.
- **Passos:** 1. Abrir `/cursos`. 2. Pesquisar, escolher categoria e nível. 3. Alternar a aba Cursos/Trilhas. 4. Abrir um card ou `/cursos/detalhe/:id` e usar o próximo curso quando disponível.
- **Resultado esperado:** filtros e contagem refletem a seleção; o detalhe mostra categoria, descrição, trilhas e player/link quando o dado existe; ID inexistente mostra estado não encontrado.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; os cursos e seus detalhes são carregados de dados locais.
- **Rotas/endpoints/tabelas:** `/cursos`, `/cursos/detalhe/:id`; nenhum endpoint/tabela; `CursosService` e `cursos-novos.data.ts` são locais.
- **Status/automação:** **cenário documentado**; não há teste de cursos.

### CF-07 — Filtrar e copiar Fraseologias

- **Objetivo:** Localizar uma resposta de atendimento, ajustar variáveis e copiar o texto final.
- **Pré-condições:** operador autenticado; conteúdo estático disponível.
- **Passos:** 1. Abrir `/fraseologia`. 2. Pesquisar ou escolher categoria. 3. Copiar uma mensagem ou abrir edição de variáveis. 4. Informar valores e copiar.
- **Resultado esperado:** apenas mensagens compatíveis com busca/categoria permanecem visíveis; a cópia usa a área de transferência com alternativa local e exibe uma notificação de sucesso/erro. Nenhuma mensagem é gravada no backend.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a alternativa de cópia depende do suporte do navegador e do contexto seguro para a área de transferência.
- **Rotas/endpoints/tabelas:** `/fraseologia`; nenhum endpoint/tabela.
- **Status/automação:** **cenário documentado**; não há teste automatizado da Fraseologia.

### CF-08 — Gerar Modelo de Chamado

- **Objetivo:** Produzir um registro estruturado de passagem ou atendimento para copiar.
- **Pré-condições:** operador autenticado.
- **Passos:** 1. Abrir `/modelo-chamados`. 2. Na aba Modelo, preencher os campos obrigatórios. 3. Copiar o texto gerado. 4. Na aba Chamado, preencher o registro, opcionalmente incluir a conversa e limpar os campos.
- **Resultado esperado:** campos obrigatórios vazios impedem a cópia e são destacados; o texto gerado contém os blocos preenchidos; a conversa de WhatsApp só entra quando o checkbox está marcado; a limpeza remove somente os campos da aba de atendimento.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; o gerador é local e não envia a conversa para um serviço externo.
- **Rotas/endpoints/tabelas:** `/modelo-chamados`; nenhum endpoint/tabela; todo o processamento é local.
- **Status/automação:** **cenário documentado**; não há teste automatizado do gerador.

### CF-09 — Consultar Stack e Políticas

- **Objetivo:** Oferecer referências institucionais e técnicas em páginas somente leitura.
- **Pré-condições:** operador autenticado.
- **Passos:** 1. Abrir `/stack` e expandir/recolher cada aplicação. 2. Abrir `/politica` e navegar pelas seções.
- **Resultado esperado:** Stack apresenta as três seções do ecossistema; Política apresenta as regras internas. Alterações de conteúdo não são enviadas ao backend.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; as páginas são somente leitura e usam conteúdo estático.
- **Rotas/endpoints/tabelas:** `/stack`, `/politica`; nenhum endpoint/tabela; `stack.component.ts`, `politica.component.ts` e `politica.data.ts`.
- **Status/automação:** **cenário documentado**; não há testes dessas páginas.

### CF-10 — Consultar Procedimentos e Utilidades da Visão ADM

- **Objetivo:** Reunir, em uma tela, a busca de procedimentos administrativos e a central de utilidades da JCA.
- **Pré-condições:** operador autenticado; dados estáticos carregados.
- **Passos:** 1. Abrir `/visao-adm`. 2. Pesquisar procedimento e filtrar por setor. 3. Abrir um procedimento. 4. Na área de utilidades, pesquisar, filtrar categoria, ordenar, alternar grade/lista, favoritar e acessar um sistema.
- **Resultado esperado:** procedimentos respeitam busca/setor e abrem detalhe; favoritos, acessos e últimos utilizados são mantidos localmente. A ordenação e os contadores não chamam o backend.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; os dados de favoritos/últimos utilizados dependem do `localStorage` do navegador.
- **Rotas/endpoints/tabelas:** `/visao-adm`; nenhum endpoint/tabela; `procedimentos.data.ts`, `utilidades.data.ts` e `localStorage` (`cc.adm.utilidades.favoritos`/`cc.adm.utilidades.runtime`).
- **Status/automação:** **cenário documentado**; não há teste automatizado da Visão ADM.

### CF-11 — Abrir e imprimir um Procedimento

- **Objetivo:** Ler um procedimento administrativo completo e imprimir a página.
- **Pré-condições:** operador autenticado; ID presente em `procedimentos.data.ts`.
- **Passos:** 1. Abrir `/visao-adm/detalhe/:id`. 2. Expandir Objetivo, Pré-requisitos, Passos, Erros, FAQ, Vídeo, Anexos e Histórico. 3. Clicar em `Imprimir`.
- **Resultado esperado:** o procedimento selecionado é renderizado, as seções alternam e `window.print()` é acionado; ID inválido mostra “Procedimento não encontrado” com retorno à Visão ADM.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a impressão depende de o navegador permitir a chamada a `window.print()`.
- **Rotas/endpoints/tabelas:** `/visao-adm/detalhe/:id`; nenhum endpoint/tabela; `ProcedimentosService` local.
- **Status/automação:** **cenário documentado**; não há teste automatizado do detalhe.

## 3. Implantação

### IM-01 — Consultar o Dashboard de Implantação

- **Objetivo:** Visualizar indicadores, prazos, alertas e produtividade da operação de implantação.
- **Pré-condições:** operador autenticado; projetos e tarefas disponíveis para o filtro selecionado.
- **Passos:** 1. Abrir `/implantacao/dashboard`. 2. Selecionar `Todos os projetos` ou um projeto. 3. Ler KPIs e gráficos. 4. Alterar o período de Produtividade e abrir um prazo/tarefa.
- **Resultado esperado:** o filtro recarrega o dashboard; KPIs, gráficos, próximos prazos e alertas refletem os dados do backend; a seção de Produtividade calcula taxa de conclusão, tempo médio, SLA e atrasadas no cliente a partir das tarefas. Os cards do Dashboard devem levar às listas correspondentes já filtradas. A tela não escreve dados.
- **Estado atual/bloqueio:** limitação conhecida: os cards usam `queryParams` como `status` e `tipo`, mas `ProjetosComponent` e `TarefasComponent` não leem esses parâmetros; os atalhos podem abrir a lista sem o filtro anunciado.
- **Rotas/endpoints/tabelas:** `/implantacao/dashboard`; `GET /api/v1/implantacao/dashboard?projetoId=N`, `GET /api/v1/implantacao/projetos` e `GET /api/v1/implantacao/tarefas?projetoId=N`, todos `[Authorize]`; `IMPL_Projeto`, `IMPL_Tarefa`, `IMPL_TarefaApontamento` e `IMPL_TarefaResponsavel`.
- **Status/automação:** **cenário documentado**; não há teste do dashboard.

### IM-02 — Listar, filtrar e agrupar Projetos

- **Objetivo:** Localizar projetos e entender seu progresso, responsável, prazo e etapa atual.
- **Pré-condições:** operador autenticado; a listagem com etapas pode ser carregada.
- **Passos:** 1. Abrir `/implantacao/projetos`. 2. Aplicar busca, status, responsável e período. 3. Escolher ordenação e abas Todos/Ativos/Concluídos/Atrasados. 4. Recolher filtros/resumo e abrir um card.
- **Resultado esperado:** o layout é compacto em três colunas; a lista é vertical, agrupada e cada card apresenta as nove etapas. Busca/status/responsável são enviados ao endpoint; período e ordenação são aplicados no cliente. Estados vazios por grupo são honestos.
- **Estado atual/bloqueio:** limitação conhecida: o backend aceita `clienteId`, mas a tela de Projetos não oferece nem consome esse filtro; a regra `ClienteObrigatorio` do tipo de Projeto também não é aplicada uniformemente ao formulário e ao serviço de criação.
- **Rotas/endpoints/tabelas:** `/implantacao/projetos`; `GET /api/v1/implantacao/projetos/com-etapas` e `GET /api/v1/agenda/operadores`, autenticados; `IMPL_Projeto`, `tbprojetoEtapa`, `IMPL_TipoProjeto` e `TBOPERADOR`.
- **Status/automação:** **cenário documentado**; não há teste automatizado da listagem.

### IM-03 — Criar ou editar Projeto

- **Objetivo:** Cadastrar ou alterar um Projeto com listas de apoio reais e identificar a etapa inicial.
- **Pré-condições:** operador autenticado; tipos, clientes, operadores, etapas e próximo código disponíveis.
- **Passos:** 1. Abrir `/implantacao/projetos/novo` ou `/implantacao/projetos/:id/editar`. 2. Informar Nome, Tipo e Responsável; preencher os campos opcionais. 3. Escolher a etapa inicial na criação quando aplicável. 4. Salvar ou cancelar.
- **Resultado esperado:** o formulário impede salvar sem os três campos obrigatórios; o código é sugerido na criação e preservado na edição; a criação inicializa as nove etapas e a edição retorna ao detalhe. O formulário não expõe um controle de status.
- **Estado atual/bloqueio:** limitação conhecida: `TipoProjeto.ClienteObrigatorio` é persistido, mas o formulário considera obrigatórios apenas Nome, Tipo e Responsável, e `ProjetoService.CriarAsync` aceita `ClienteId` nulo; a obrigatoriedade de cliente precisa ser corrigida e validada no servidor.
- **Rotas/endpoints/tabelas:** `/implantacao/projetos/novo`, `/implantacao/projetos/:id/editar`; consultas de apoio: `GET /api/v1/implantacao/tipos-projeto?apenasAtivos=true`, `GET /api/v1/implantacao/projetos/clientes`, `GET /api/v1/agenda/operadores`, `GET /api/v1/implantacao/projetos/etapas-padrao` e `GET /api/v1/implantacao/projetos/proximo-codigo`; `POST /api/v1/implantacao/projetos` e `PUT /api/v1/implantacao/projetos/{id}`; `IMPL_Projeto`, `tbprojetoEtapa`, `IMPL_TipoProjeto`, `tbcliente` e `TBOPERADOR`.
- **Status/automação:** **cenário documentado**; não há teste automatizado dos formulários.

### IM-04 — Acompanhar o detalhe e as etapas do Projeto

- **Objetivo:** Consultar os dados do Projeto, as nove etapas e as tarefas vinculadas.
- **Pré-condições:** operador autenticado; Projeto existente.
- **Passos:** 1. Abrir `/implantacao/projetos/:id`. 2. Ler a visão geral e as nove etapas. 3. Abrir uma etapa e navegar no checklist/histórico/comentários. 4. Alternar para Tarefas e usar Nova tarefa/Editar. 5. Usar Editar ou Excluir no hero.
- **Resultado esperado:** hero, progresso e KPIs são carregados; as etapas têm estado, percentual, tarefas/checklist e atraso; a aba Histórico do Projeto continua sendo um placeholder “Em breve”. O modal deve permitir checklist, comentários e documentos; retorno de etapa deve ser confirmado; a exclusão pede confirmação e retorna à listagem.
- **Estado atual/bloqueio:** limitação conhecida: o modal trata upload como `URL.createObjectURL` e persiste esse URL temporário, sem storage real; a exclusão de documento está em TODO. O retorno de etapa e parte das operações do modal capturam/ignoram erro, portanto podem falhar sem uma indicação confiável.
- **Rotas/endpoints/tabelas:** `/implantacao/projetos/:id`; `GET /api/v1/implantacao/projetos/{id}`, `GET /api/v1/implantacao/projetos/{id}/etapas`, `GET /api/v1/implantacao/tarefas?projetoId={id}` e `DELETE /api/v1/implantacao/projetos/{id}`; no modal, `GET /api/v1/implantacao/projetos/{id}/etapas/{ordem}`, `PUT /api/v1/implantacao/projetos/{id}/etapas/{ordem}`, `POST /api/v1/implantacao/projetos/{id}/etapas/{ordem}/checklist`, `POST /api/v1/implantacao/projetos/{id}/etapas/{ordem}/documentos` e `POST /api/v1/implantacao/projetos/{id}/etapas/{ordem}/comentarios`; `IMPL_Projeto`, `tbprojetoEtapa`, `tbprojetoEtapaChecklist`, `tbprojetoEtapaComentario` e `IMPL_Tarefa`. Todos os endpoints do controller exigem `[Authorize]`.
- **Status/automação:** **cenário documentado**; não há teste automatizado do detalhe ou do modal de etapa.

### IM-05 — Filtrar e administrar Tarefas

- **Objetivo:** Localizar tarefas por atalhos, projeto e texto, e executar ações de cartão.
- **Pré-condições:** operador autenticado; lista de projetos e tarefas disponível.
- **Passos:** 1. Abrir `/implantacao/tarefas`. 2. Selecionar Todas, Atrasadas, Em andamento, Concluídas, Bugs ou Features. 3. Pesquisar, filtrar por projeto e marcar `Mostrar arquivadas`. 4. Editar, arquivar/desarquivar ou excluir uma tarefa.
- **Resultado esperado:** a lista usa `GET` com os filtros correspondentes; apenas tarefas concluídas podem ser arquivadas; exclusão pede confirmação e remove o item da lista. A opção “Sem projeto” deve retornar somente tarefas com `projetoId` nulo.
- **Estado atual/bloqueio:** limitação conhecida: ao escolher “Sem projeto”, o frontend converte o valor para `undefined` e não envia `projetoId`; o backend só filtra quando o parâmetro tem valor, portanto a opção não restringe a lista. Os atalhos internos são aplicados localmente, mas não são todos inicializados por query string.
- **Rotas/endpoints/tabelas:** `/implantacao/tarefas`; `GET /api/v1/implantacao/tarefas`, `GET /api/v1/implantacao/projetos`, `PATCH /api/v1/implantacao/tarefas/{id}/arquivar`, `PATCH /api/v1/implantacao/tarefas/{id}/desarquivar` e `DELETE /api/v1/implantacao/tarefas/{id}`; `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ColunaKanban` e `IMPL_Auditoria` para auditoria.
- **Status/automação:** **cenário documentado**; não há teste automatizado da lista.

### IM-06 — Criar ou editar Tarefa

- **Objetivo:** Preencher os dados de execução, responsáveis, coluna e chamado de uma Tarefa, com a etapa do projeto obrigatória sempre que houver projeto.
- **Pré-condições:** operador autenticado; projetos, etapas, colunas, operadores e chamados disponíveis.
- **Passos:** 1. Abrir `/implantacao/tarefas/novo` ou `/implantacao/tarefas/:id/editar`. 2. Informar Título, Tipo, Data de entrega e responsável. 3. Selecionar Projeto e, quando houver, a etapa do projeto. 4. Informar prioridade, coluna, prazos, bloqueio e chamados. 5. Salvar.
- **Resultado esperado:** o formulário valida título, responsável, data, prioridade e etapa quando há projeto; o motivo é obrigatório quando a tarefa é bloqueada. O Status não é enviado pelo formulário: o backend sincroniza Status e Coluna. Na criação, a navegação vai para a lista; na edição, a tela permanece com aviso de sucesso. O campo Etapa do projeto aparece nos dois modos e é obrigatório apenas quando há projeto: desabilitado sem projeto, com placeholder de carregamento, de erro, de projeto sem etapas cadastradas ou de ausência de projeto; com projeto selecionado, a lista é carregada, o seletor assume um default válido (etapa `EmAndamento`, senão a primeira não concluída, senão a primeira disponível) e o botão de salvar fica bloqueado enquanto a carga está em andamento ou falhou. Trocar ou remover o projeto limpa etapas e etapa, e respostas de cargas anteriores são descartadas, inclusive quando chegam como erro. Falha de comunicação e projeto sem etapas são estados distintos, e o primeiro oferece **Tentar novamente**, que repete a carga do mesmo projeto também na edição, onde o seletor de Projeto está desabilitado. Na edição, o Projeto fica desabilitado e a Etapa permanece habilitada; o `PUT` envia `projetoEtapaId` e não envia `projetoId`, portanto o projeto da tarefa não muda.
- **Estado atual/bloqueio:** limitação conhecida: o projeto da tarefa é imutável pela tela — o `PUT` de Tarefa não transporta `projetoId`, o serviço mantém o projeto persistido e o seletor de Projeto fica desabilitado na edição, portanto mudar o projeto exige sair do formulário. O caminho de recuperação previsto no componente é o botão **Tentar novamente**, que só resolve falha de carga; quando o projeto não tem etapas cadastradas, não há card para selecionar, a etapa obrigatória falta e o envio permanece bloqueado. Permanece a dependência do serviço para autorização de atribuição, que não é uniforme entre criação e atualização.
- **Rotas/endpoints/tabelas:** `/implantacao/tarefas/novo`, `/implantacao/tarefas/:id/editar`; `GET /api/v1/implantacao/projetos`, `GET /api/v1/implantacao/projetos/{id}/etapas`, `GET /api/v1/implantacao/colunas-kanban?apenasAtivas=false`, `GET /api/v1/agenda/operadores`, `GET /api/v1/implantacao/tarefas/chamados/busca`; `POST /api/v1/implantacao/tarefas` e `PUT /api/v1/implantacao/tarefas/{id}`; `IMPL_Tarefa`, `IMPL_Projeto`, `tbprojetoEtapa`, `IMPL_ColunaKanban`, `IMPL_TarefaResponsavel` e `tbchamado`.
- **Status/automação:** **validado em teste** por doze casos de regressão em [`tarefa-form.component.spec.ts`](../frontend/src/app/features/implantacao/pages/tarefas/tarefa-form.component.spec.ts): etapa visível e desabilitada no create sem projeto; carregamento com loading, default válido e envio de `projetoId` + `projetoEtapaId`; erro de etapas bloqueando o create; limpeza ao trocar/remover projeto com descarte de resposta antiga; preservação de projeto/etapa no edit com `projetoEtapaId` e ausência de `projetoId` no update; consumo de `?tarefaId=` no create de duplicação; troca de etapa pelo evento `change` voltando ao placeholder e bloqueando o save; fallback para a primeira etapa quando todas estão concluídas; lista vazia tratada como "nenhuma etapa cadastrada", com `required` e `aria-describedby` e sem botão de retry; create sem projeto sem `projetoEtapaId` no payload; descarte de resposta obsoleta recebida por `error`; e recuperação no edit pelo **Tentar novamente** com o projeto desabilitado, que repete o `GET` e limpa erro e `aria-describedby`. A suíte não foi executada nesta revisão.

### IM-07 — Filtrar, criar e mover no Kanban

- **Objetivo:** Visualizar tarefas por colunas e atualizar sua posição ou criar uma tarefa diretamente no quadro.
- **Pré-condições:** operador autenticado; colunas e tarefas carregadas; responsável válido disponível.
- **Passos:** 1. Abrir `/implantacao/kanban`. 2. Filtrar por projeto, texto, responsável, prioridade, agrupamento e `Minhas tarefas`. 3. Arrastar um card para outra coluna ou reordenar. 4. Usar `Adicionar tarefa` e preencher o formulário na própria interface.
- **Resultado esperado:** o quadro usa colunas ativas, mostra métricas e preserva o filtro de projeto; ao mover o card, a interface envia a nova coluna/ordem e trata limite de trabalho em progresso (WIP), status, bloqueio e motivo. A criação na própria interface exige título, responsável e data de entrega; com projeto, exige etapa do projeto. O filtro `Minhas tarefas` deve usar o usuário autenticado.
- **Estado atual/bloqueio:** limitações conhecidas: o valor de `Minhas tarefas` é fixo no código; o WIP é verificado no fluxo de mover, mas não de forma uniforme na criação e em outras atualizações; o filtro e as permissões de escrita dependem do controller e do serviço, sem garantia única para todos os operadores.
- **Rotas/endpoints/tabelas:** `/implantacao/kanban`; `GET /api/v1/implantacao/colunas-kanban?apenasAtivas=false`, `GET /api/v1/implantacao/tarefas`, `GET /api/v1/implantacao/projetos`, `GET /api/v1/agenda/operadores`, `GET /api/v1/implantacao/projetos/{id}/etapas`, `POST /api/v1/implantacao/tarefas` e `PATCH /api/v1/implantacao/tarefas/{id}/coluna`; `IMPL_ColunaKanban`, `IMPL_Tarefa`, `IMPL_Projeto`, `tbprojetoEtapa` e `IMPL_Auditoria`.
- **Status/automação:** **cenário documentado**; não há teste automatizado do Kanban.

### IM-08 — Usar drawer, menu, edição e lote no Kanban

- **Objetivo:** Consultar o detalhe de uma tarefa, comentar, reatribuir, editar campos e executar ações em lote.
- **Pré-condições:** operador autenticado; card selecionado no Kanban; permissões do backend disponíveis.
- **Passos:** 1. Clicar no card e abrir o drawer. 2. Ler o detalhe, adicionar comentário e salvar responsáveis. 3. Usar F2 no título ou duplo clique na prioridade. 4. Abrir o menu do card e escolher Editar, Duplicar, Arquivar/Desarquivar ou Excluir. 5. Selecionar vários cards e escolher uma ação em lote.
- **Resultado esperado:** o drawer usa `GET` de detalhe; comentário usa `POST`; alterações usam `PUT`; movimento usa `PATCH`; arquivamento/desarquivamento e exclusão possuem comandos próprios. O menu atual não possui as ações “Comentar” e “Mover de coluna” que aparecem em textos antigos. A duplicação navega para `/implantacao/tarefas/novo?tarefaId={id}`: a tela carrega o detalhe da tarefa, preenche projeto e etapa e permanece em modo de criação, gravando uma nova tarefa. As ações em lote devem preservar os campos não editados.
- **Estado atual/bloqueio:** limitação conhecida: edições inline e ações em lote enviam payloads parciais com valores padrão (`titulo: ''`, `tipo: 0`, `prioridade: 0`, `ordem: 0` etc.); como o backend trata o PUT como atualização completa, campos podem ser apagados ou sobrescritos. O `usuarioAlteracao` também é fixado como `admin` em alguns payloads, portanto a auditoria e a autorização não são confiáveis. A duplicação em si é coberta por teste do formulário, mas a ação do menu no Kanban não é exercitada por teste automatizado.
- **Rotas/endpoints/tabelas:** `/implantacao/kanban`; `GET /api/v1/implantacao/tarefas/{id}`, `POST /api/v1/implantacao/tarefas`, `PUT /api/v1/implantacao/tarefas/{id}`, `PATCH /api/v1/implantacao/tarefas/{id}/coluna`, `PATCH /api/v1/implantacao/tarefas/{id}/arquivar`, `PATCH /api/v1/implantacao/tarefas/{id}/desarquivar`, `DELETE /api/v1/implantacao/tarefas/{id}` e `POST /api/v1/implantacao/tarefas/{id}/comentarios`; `IMPL_Tarefa`, `IMPL_ComentarioTarefa`, `IMPL_TarefaResponsavel` e `IMPL_Auditoria`.
- **Status/automação:** **cenário documentado**; não há teste automatizado das ações do drawer ou lote. O consumo de `?tarefaId=` pela duplicação aparece no caso de regressão de IM-06 em [`tarefa-form.component.spec.ts`](../frontend/src/app/features/implantacao/pages/tarefas/tarefa-form.component.spec.ts).

## 4. Database

### DB-01 — Abrir o Database Explorer e a Visão Geral

- **Objetivo:** Verificar o estado da conexão e entrar nas áreas de metadados do SQL Server.
- **Pré-condições:** operador autenticado; conexão configurada no ambiente.
- **Passos:** 1. Abrir `/database` ou `/database/visao-geral`. 2. Ler o banner de conexão e os contadores. 3. Usar a busca global do shell. 4. Abrir uma tabela, procedure, relationship ou diferença.
- **Resultado esperado:** o shell redireciona para Visão Geral, mostra conectado/desconectado e as seis abas ativas: Visão Geral, Explorador, Relacionamentos, Consultas, Diferenças e Configuração. A busca global consulta `GET /api/v1/database/search`; a Visão Geral mostra nove cards de metadados e o botão de testar conexão.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a disponibilidade dos metadados e o teste de conexão dependem do SQL Server configurado no ambiente.
- **Rotas/endpoints/tabelas:** `/database`, `/database/visao-geral`; `GET /api/v1/database/status`, `GET /api/v1/database/info`, `GET /api/v1/database/search`, todos `[Authorize]`; leitura de `sys.*` e demais metadados do SQL Server, sem escrita de negócio.
- **Status/automação:** **cenário documentado**; não há teste automatizado do shell ou da Visão Geral.

### DB-02 — Explorar tabelas, procedures e triggers

- **Objetivo:** Localizar objetos do banco e consultar sua estrutura ou definição.
- **Pré-condições:** operador autenticado; API de metadados disponível.
- **Passos:** 1. Abrir `/database/explorador`. 2. Pesquisar/expandir Tabelas, Procedures e Triggers. 3. Selecionar uma tabela e ler colunas/índices. 4. Selecionar procedure ou trigger e abrir o modal. 5. Usar `Investigar` ou `Consultar`.
- **Resultado esperado:** a seleção carrega a estrutura real; a procedure abre parâmetros e corpo; a trigger mostra evento, momento, ações e corpo quando disponível; `Consultar` pré-prepara o Criador. A tela é somente leitura.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a leitura depende de permissões de metadados no SQL Server.
- **Rotas/endpoints/tabelas:** `/database/explorador`; `GET /api/v1/database/tables`, `/tables/{schema}/{nome}/columns`, `/tables/{schema}/{nome}/indexes`, `/procedures`, `/procedures/{schema}/{nome}`, `/triggers`, `/triggers/{schema}/{nome}`; `sys.tables`, `sys.columns`, `sys.indexes`, `sys.procedures` e `sys.triggers`, somente leitura.
- **Status/automação:** **cenário documentado**; não há teste automatizado do Explorador.

### DB-03 — Consultar o detalhe de uma tabela

- **Objetivo:** Analisar colunas, índices, FKs, triggers, procedures, dependências e gerar um SELECT de consulta.
- **Pré-condições:** operador autenticado; tabela existente no banco conectado.
- **Passos:** 1. Abrir `/database/tabela/:schema/:tabela`. 2. Navegar pelas abas. 3. Ativar inferidas, abrir procedure/trigger ou dependência. 4. Selecionar campos/filtros e usar `Abrir no Criador` ou `Copiar SQL`.
- **Resultado esperado:** a tela mostra metadados, relacionamentos confirmados/inferidos, procedures, triggers e dependências; a navegação para tabela relacionada funciona quando o nome é identificável. O SQL de consulta rápida é apenas SELECT local e não é executado pelo sistema.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a inferência de relacionamentos é indicativa e não prova uma FK física.
- **Rotas/endpoints/tabelas:** `/database/tabela/:schema/:tabela`; `GET /api/v1/database/tables/{schema}/{nome}`, `/columns`, `/indexes`, `/relationships`, `/triggers`, `/procedures`, `/procedures/{schema}/{nome}/analysis`, `/tables/{schema}/{nome}/dependencies`; metadados `sys.*`, sem escrita.
- **Status/automação:** **cenário documentado**; não há teste automatizado do detalhe.

### DB-04 — Explorar relacionamentos

- **Objetivo:** Mapear vínculos confirmados ou inferidos de uma tabela e localizar uso de uma coluna.
- **Pré-condições:** operador autenticado; lista de tabelas carregada.
- **Passos:** 1. Abrir `/database/relacionamentos`. 2. Selecionar uma tabela. 3. Alternar Todas/Apenas confirmadas/Apenas possíveis. 4. Informar uma coluna e clicar em Buscar. 5. Clicar em origem ou destino.
- **Resultado esperado:** a tabela escolhida limita a lista; cada linha mostra tipo, origem, destino, score e motivos; a busca por coluna substitui a listagem pelo resultado de uso. A navegação para uma tabela só ocorre quando o nome contém schema e tabela. O filtro “Apenas possíveis” deve mostrar somente relações do tipo `Possivel`.
- **Estado atual/bloqueio:** limitação conhecida: no filtro “Apenas possíveis”, o frontend compara `tipo.toLowerCase()` (`possivel`) com `filtro.slice(0, -1)` (`possivei`); a comparação falha e o filtro pode retornar lista vazia mesmo com relações possíveis.
- **Rotas/endpoints/tabelas:** `/database/relacionamentos`; `GET /api/v1/database/tables`, `GET /api/v1/database/relationships?tabela=...&incluirPossiveis=...`, `GET /api/v1/database/column-usage?coluna=...`; `sys.foreign_keys` e inferências do serviço, somente leitura.
- **Status/automação:** **cenário documentado**; não há teste automatizado de relacionamentos.

### DB-05 — Montar e copiar uma consulta

- **Objetivo:** Construir um SELECT por etapas, deixar o SQL pronto para uso externo e não executar a consulta no sistema.
- **Pré-condições:** operador autenticado; tabelas e relacionamentos disponíveis.
- **Passos:** 1. Abrir `/database/consultas` ou `/database/query-builder`. 2. Escolher tabela principal, campos e tabelas relacionadas. 3. Adicionar filtros, ordenação, agrupamento/HAVING e limite. 4. Ver o SQL e copiar.
- **Resultado esperado:** o assistente percorre Tabela, Campos, Relacionamentos, Filtros, Ordenação, Resumo e SQL; a API monta o SQL e há montagem local alternativa se o serviço falhar; a tela não possui Executar nem chama `POST /query`. Parâmetros de URL e `sessionStorage` podem pré-preencher tabelas.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a montagem local é alternativa de apresentação e não representa validação SQL pelo servidor.
- **Rotas/endpoints/tabelas:** `/database/consultas` e redirecionamento `/database/query-builder`; `GET /api/v1/database/tables`, `/relationships`, `/graph`; `POST /api/v1/database/query-builder-advanced` com `{ Tabelas, Colunas, Relacionamentos, WhereConditions?, OrderBy?, GroupBy?, Limite?, Having?, Ctes? }`; nenhuma tabela de negócio é escrita.
- **Status/automação:** **cenário documentado**; não há teste automatizado do Criador de Consultas.

### DB-06 — Comparar schemas e sincronizar

- **Objetivo:** Comparar a estrutura do banco conectado com um arquivo JSON (tabela, banco inteiro ou corpos de procedures).
- **Pré-condições:** operador autenticado; arquivo `.json` válido; para modo tabela, selecionar a tabela JCA; para o modo procedures, exportar as procedures com o script fornecido pela própria tela (1 linha por procedure).
- **Passos:** 1. Abrir `/database/diferencas`. 2. Escolher `Tabela única`, `Banco inteiro` ou `Procedures`. 3. Selecionar o JSON (ou o export das procedures), copiar/usar o script de exportação se necessário e clicar em `Comparar`. 4. Filtrar por severidade, expandir tabelas e exportar CSV. 5. Gerar os scripts de correção, revisar por aba (o filtro das abas usa a severidade de origem de cada script), validar (estático), copiar ou exportar `.sql`. 6. No modo procedures, conferir os corpos lado a lado, filtrar por status/busca e copiar. 7. Limpar.
- **Resultado esperado:** a tabela única lista críticas e avisos conforme o card ativo e mostra o percentual de match; itens compatíveis (`Ok`) ficam só nos cards de contagem e no %, fora das listagens e do CSV. No banco inteiro, os cards escolhem quais tabelas aparecem, a expansão de cada tabela mostra sempre avisos + críticos (nunca `Ok`), a numeração das críticas reinicia por tabela (1, 2, 3…) e os scripts são ordenados por tabela (badge de tabela no card). A geração segue o **banco JCA como fonte da verdade**: divergências e itens só no JCA não geram script; só criações vindas do arquivo (`CREATE_TABLE`, `ADD_COLUMN`, `CREATE_INDEX`, `ALTER_FK`) são geradas, cada uma com `tabela` e `severidadeOrigem`. No modo procedures, a resposta traz chips de status (`Compativel`, `Divergente`, `SomenteBanco`, `SomenteArquivo`), busca e comparação de corpos lado a lado, **sem** gerar SQL. A UI aceita somente JSON, com limite de 5 MB no modo tabela e 20 MB no modo banco e nas procedures. Nenhum SQL é executado e nada é persistido; a exportação CSV é local, exclui itens `Ok` e traz a coluna `numero` nos dois modos de schema; a comparação não altera o banco.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a comparação depende de o arquivo JSON estar no formato aceito e de a conexão permitir metadados. No modo procedures, cópia pelo SSMS pode truncar corpos muito grandes (~43 mil caracteres) e o parser ignora linhas JSON inválidas, o que pode ampliar falsos `SomenteBanco`.
- **Rotas/endpoints/tabelas:** `/database/diferencas`; `GET /api/v1/database/tables`; `POST /api/v1/database/compare-schemas` multipart com `schema`, `tabela` e `arquivo`; `POST /api/v1/database/compare-schemas-bulk` e `POST /api/v1/database/compare-procedures` multipart com `arquivo`; `POST /api/v1/database/generate-correction-scripts`, `POST /api/v1/database/generate-correction-scripts-bulk` e `POST /api/v1/database/validate-script` com JSON; leitura dos metadados `sys.*` (incluindo `sys.sql_modules` para as procedures), sem escrita.
- **Status/automação:** **cenário documentado**; não há teste automatizado da Sincronização.

### DB-07 — Verificar a configuração da conexão

- **Objetivo:** Conferir a configuração efetiva e testar a conectividade sem expor credenciais.
- **Pré-condições:** operador autenticado; backend com configuração de conexão disponível.
- **Passos:** 1. Abrir `/database/configuracao`. 2. Ler servidor, porta, banco, usuário e indicadores de segurança. 3. Clicar em `Testar conexão`. 4. Ler o resultado e a duração.
- **Resultado esperado:** a tela é somente leitura; a senha aparece mascarada e a configuração é gerenciada fora da interface. O teste chama `GET /status`; não há `PUT /config` nem `POST /test-connection` no código atual.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a máscara é apresentação e a proteção efetiva depende de não expor logs, respostas ou configuração do ambiente.
- **Rotas/endpoints/tabelas:** `/database/configuracao`; `GET /api/v1/database/config` e `GET /api/v1/database/status`, ambos `[Authorize]`; nenhuma tabela da Central e nenhum segredo deve ser copiado para o resultado.
- **Status/automação:** **cenário documentado**; não há teste automatizado da Configuração.

## 5. Empresa/Agenda

### EA-01 — Abrir Empresa e o Onboarding

- **Objetivo:** Levar o colaborador da área Empresa ao início do Onboarding Corporativo.
- **Pré-condições:** operador autenticado.
- **Passos:** 1. Abrir `/empresa`. 2. Confirmar o redirecionamento para `/empresa/onboarding`. 3. Ler a apresentação e os quinze capítulos. 4. Clicar em `Iniciar Onboarding` ou em um capítulo.
- **Resultado esperado:** `/empresa` não tem tela própria; a Home de Onboarding mostra os quinze cards e leva ao primeiro capítulo. O conteúdo é local e não há persistência de progresso.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; o redirecionamento e a navegação são locais.
- **Rotas/endpoints/tabelas:** `/empresa` → `/empresa/onboarding`; nenhum endpoint/tabela; `onboarding-data.ts`.
- **Status/automação:** **cenário documentado**; não há teste automatizado do Onboarding.

### EA-02 — Navegar por um capítulo de Onboarding

- **Objetivo:** Ler os blocos de um capítulo e avançar ou voltar na jornada.
- **Pré-condições:** operador autenticado; ID numérico presente no conteúdo estático.
- **Passos:** 1. Abrir `/empresa/onboarding/capitulo/:id`. 2. Expandir os blocos e acionar os acordeões. 3. Clicar em `Voltar` ou `Próximo`. 4. Abrir um ID inválido.
- **Resultado esperado:** o capítulo, número e progresso são exibidos; a navegação sequencial funciona e o último capítulo retorna à Home. ID inválido redireciona para `/empresa/onboarding`.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; o progresso é calculado localmente e não representa registro de leitura no backend.
- **Rotas/endpoints/tabelas:** `/empresa/onboarding/capitulo/:id`; nenhum endpoint/tabela; `CAPITULOS` em `onboarding-data.ts`.
- **Status/automação:** **cenário documentado**; não há teste automatizado do capítulo.

### EA-03 — Navegar e filtrar a Agenda

- **Objetivo:** Visualizar a agenda em Dia, Semana, Mês ou Janela Operacional de 48 horas e restringir eventos por operador/função.
- **Pré-condições:** operador autenticado; listas de tipos, operadores e funções carregadas.
- **Passos:** 1. Abrir `/agenda`. 2. Alternar as quatro visões. 3. Usar anterior, `Hoje`, próximo e o seletor de data. 4. Alternar `Meus`/`Geral`, escolher Responsável/Função e limpar os filtros.
- **Resultado esperado:** a grade renderiza mesmo vazia; o período sem eventos mostra a faixa na grade; `Geral` limpa filtros de operador/função antes de recarregar; a visão inicial é Semana/Meus. O filtro de função usa a tabela legada de funcionários, não o campo de função de `TBOPERADOR`.
- **Estado atual/bloqueio:** sem limitação específica identificada nesta inspeção; a listagem depende da fonte de funcionários legada e dos dados de Agenda retornados pelo backend.
- **Rotas/endpoints/tabelas:** `/agenda`; `GET /api/v1/agenda/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N`, `GET /api/v1/agenda/tipos`, `GET /api/v1/agenda/operadores`, `GET /api/v1/agenda/funcoes`, todos `[Authorize]`; `IMPL_Agenda`, `CC_TipoEvento`, `CC_AgendaParticipante`, `TBOPERADOR`, `CC_Funcao`, `tbfuncionario` e `IMPL_Projeto`.
- **Status/automação:** **cenário documentado**; não há teste automatizado da Agenda.

### EA-04 — Criar, editar e repetir um evento

- **Objetivo:** Registrar um evento com tipo, responsável, prioridade e, quando permitido, recorrência.
- **Pré-condições:** operador autenticado; tipo e responsável ativo disponíveis.
- **Passos:** 1. Clicar em `Novo evento` ou em uma célula. 2. Preencher título, descrição/local, datas/horas, tipo, responsável e prioridade. 3. Selecionar `Repetir até` e padrão quando o tipo permitir. 4. Salvar ou cancelar. 5. Editar e excluir um evento próprio.
- **Resultado esperado:** título, data inicial, tipo e responsável são obrigatórios; fim deve ser posterior ao início; Férias exige data de retorno e dia inteiro; Treinamento/Daily aceitam lote; Reunião/Atendimento são de um dia. O contrato de edição deve preservar participantes e SLA enviados, e a exclusão usa confirmação.
- **Estado atual/bloqueio:** limitação conhecida: o modal não expõe participantes nem SLA e envia `participantesIds: undefined`; o `PUT` limpa a coleção de participantes e pode gravar SLA nulo. Projeto também não é controlado pelo modal atual, apesar de existir no contrato.
- **Rotas/endpoints/tabelas:** `/agenda` + modal; `GET /api/v1/agenda/eventos/{id}`, `POST /api/v1/agenda/eventos`, `POST /api/v1/agenda/eventos/lote`, `PUT /api/v1/agenda/eventos/{id}`, `DELETE /api/v1/agenda/eventos/{id}`; `IMPL_Agenda`, `CC_AgendaParticipante`, `CC_TipoEvento`, `IMPL_Projeto` e `TBOPERADOR`.
- **Status/automação:** **cenário documentado**; não há teste automatizado do modal.

### EA-05 — Respeitar dono, administrador e conflitos

- **Objetivo:** Impedir alteração de evento de terceiro e informar sobreposição de horários.
- **Pré-condições:** eventos de teste com responsáveis distintos; usuário proprietário, usuário sem propriedade e Administrador; agenda com conflito.
- **Passos:** 1. Visualizar um evento de terceiro em cada visão. 2. Tentar abrir/editar pelo card. 3. Chamar `PUT`, `DELETE` ou `PATCH` direto para evento de terceiro. 4. Criar/atualizar/mover um evento que sobreponha outro. 5. Conferir a tabela afetada.
- **Resultado esperado:** cards de terceiros ficam somente leitura; a API de alteração/movimentação retorna 403 para quem não é proprietário; a criação não exige que o usuário atual seja o responsável e pode informar outro responsável ativo; a sobreposição retorna 409 com `code: CONFLICT_HORARIOS` e a lista de conflitos. A verificação deve considerar o responsável e os participantes enviados. A listagem lê `IMPL_Agenda`; a criação/escrita grava `IMPL_Agenda` e participantes quando enviados; `CC_TipoEvento`, `TBOPERADOR` e `CC_Funcao` não são escritas pela Agenda. Não há arrastar-e-soltar de evento na interface atual; `PATCH /mover` é um contrato de API.
- **Estado atual/bloqueio:** limitações conhecidas: a query de conflito filtra apenas `Agenda.OperadorId`, não participantes; a edição atual pode apagar participantes e SLA, portanto a cobertura de conflitos não é uniforme. Também não há arrastar-e-soltar de evento na interface atual.
- **Rotas/endpoints/tabelas:** `/agenda`; `PUT/DELETE /api/v1/agenda/eventos/{id}` e `PATCH /api/v1/agenda/eventos/{id}/mover`, autenticados; `IMPL_Agenda`, `CC_AgendaParticipante`, `IMPL_Projeto`, `CC_TipoEvento`, `TBOPERADOR` e `CC_Funcao`.
- **Status/automação:** **cenário documentado**; não há teste de autorização/conflito.

## 6. Admin/Kanban F

### AK-01 — Gerenciar Tipos de Projeto

- **Objetivo:** Manter os tipos de projeto disponíveis para o formulário de Projetos.
- **Pré-condições:** usuário com perfil `Administrador`; `adminGuard` aprovado.
- **Passos:** 1. Abrir `/admin/cadastros/tipos-projeto`. 2. Criar em `/admin/cadastros/tipos-projeto/novo`. 3. Editar em `/admin/cadastros/tipos-projeto/editar/:id`. 4. Excluir com confirmação.
- **Resultado esperado:** a listagem mostra código, nome, indicador de cliente obrigatório, ordem e ativo; o código não é editável; criação exige código/nome/ordem; edição permite nome, ordem, cliente obrigatório e ativo; exclusão pode ser recusada pelo backend quando há vínculo.
- **Estado atual/bloqueio:** limitação conhecida: `ClienteObrigatorio` é salvo no tipo, mas a obrigatoriedade não é aplicada uniformemente ao formulário de Projeto nem no `ProjetoService`; validações de cliente e regras de autorização precisam ser centralizadas e testadas.
- **Rotas/endpoints/tabelas:** `/admin/cadastros/tipos-projeto`, `/novo`, `/editar/:id`; `GET /api/v1/implantacao/tipos-projeto?apenasAtivos=true`, `GET /api/v1/implantacao/tipos-projeto/{id}`, `POST /api/v1/implantacao/tipos-projeto`, `PUT /api/v1/implantacao/tipos-projeto/{id}`, `DELETE /api/v1/implantacao/tipos-projeto/{id}`; todas exigem `[Authorize]` e as escrita exigem `Administrador`; `IMPL_TipoProjeto`.
- **Status/automação:** **cenário documentado**; não há teste automatizado do CRUD administrativo.

### AK-02 — Operar o Kanban do perfil F

- **Objetivo:** Abrir o Kanban com o filtro de perfil F a partir do link da Sidebar.
- **Pré-condições:** usuário autenticado com perfil F conforme `hasRole('F')`; a rota principal de Kanban disponível.
- **Passos:** 1. Clicar em `Kanban ADM` na Sidebar. 2. Confirmar a URL `/implantacao/kanban?perfil=F`. 3. Conferir o filtro `perfilId=F` e o modo `excluir`. 4. Navegar pelo quadro.
- **Resultado esperado:** o Kanban reutiliza o componente principal, mas envia o filtro de perfil; no modo excluir, a listagem remove tarefas criadas por operadores cujo `PerfilId` é F. O F não depende da rota `/admin/kanban`, que é protegida pelo `adminGuard`.
- **Estado atual/bloqueio:** limitação conhecida: `hasRole('F')` é uma verificação de frontend, enquanto os endpoints de escrita do Kanban usam autorização mais ampla; WIP e permissões de atribuição não são garantidos uniformemente para o perfil F e para os demais operadores.
- **Rotas/endpoints/tabelas:** `/implantacao/kanban?perfil=F`; `GET /api/v1/implantacao/tarefas?perfilId=F&perfilModo=excluir`, além dos endpoints de colunas/projetos/operadores do Kanban; `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ColunaKanban` e `TBOPERADOR`.
- **Status/automação:** **cenário documentado**; não há teste do filtro F.

### AK-03 — Usar as entradas administrativas compartilhadas

- **Objetivo:** Verificar quais telas administrativas são realmente roteadas e reutilizam componentes de Implantação.
- **Pré-condições:** usuário com perfil `Administrador`; `adminGuard` aprovado.
- **Passos:** 1. Abrir `/admin`. 2. Abrir `/admin/kanban`, `/admin/tarefas` e `/admin/projetos`. 3. Observar os títulos e a navegação disponível.
- **Resultado esperado:** `/admin` cai em cadastros; os três caminhos renderizam, respectivamente, Kanban, Tarefas e Projetos reutilizados. Não existe uma tela `/admin/dashboard` roteada na árvore de trabalho; não se deve usar o componente órfão como história ativa.
- **Estado atual/bloqueio:** limitação conhecida: o componente/serviço/controller do Admin Dashboard existem, mas não há rota nem menu; se a API for chamada diretamente, os totais globais não usam todos o mesmo filtro de arquivamento e os contadores por função são retornados como zero, tornando as métricas potencialmente inconsistentes.
- **Rotas/endpoints/tabelas:** `/admin/kanban`, `/admin/tarefas`, `/admin/projetos`; `adminGuard` + `authGuard`; endpoints e tabelas são os mesmos de IM-07, IM-05 e IM-02. A rota `/admin/projetos/:id` não está declarada, portanto o detalhe pelo card precisa ser tratado como não confirmado.
- **Status/automação:** **cenário documentado**; não há teste das rotas administrativas.

## 7. Chat/JOTA

### CJ-01 — Abrir e usar o widget JOTA

- **Objetivo:** Fazer uma pergunta ao JOTA sem sair da tela atual do `MainLayout`.
- **Pré-condições:** operador autenticado; rota em `MainLayout`; serviço AnythingLLM disponível ou alternativa local configurada.
- **Passos:** 1. Clicar no FAB. 2. Digitar uma pergunta e enviar. 3. Fechar/reabrir o painel. 4. Observar uma resposta ou indisponibilidade.
- **Resultado esperado:** o painel mostra a mensagem do usuário, resposta e fontes quando a origem real responder; `sessionId` fica em memória; erro do proxy deve aparecer como indisponibilidade quando a resposta local alternativa estiver desabilitada. Não existe uma página `/chat` ativa.
- **Estado atual/bloqueio:** limitação conhecida: `JotaChatService` usa a URL relativa `/api/rag-proxy`, diferente do `apiBaseUrl` absoluto dos demais serviços, e depende de uma rota de mesma origem ou de um proxy reverso para o frontend. No backend, `EnableMockFallback` é `true` por padrão; falha de conexão ou resposta não bem-sucedida do AnythingLLM pode devolver `MockResponse`, portanto não é garantido que a resposta seja real.
- **Rotas/endpoints/tabelas:** FAB no `MainLayout`, sem URL própria; `POST /api/rag-proxy/chat` com `[Authorize]` e corpo `{ message, workspaceId: "suporte", mode: "query", sessionId? }`; destino externo AnythingLLM; nenhuma tabela de conversa.
- **Status/automação:** **cenário documentado**; não há teste automatizado do widget.

### CJ-02 — Perguntar ao JOTA sobre uma tarefa

- **Objetivo:** Abrir o JOTA já com o contexto de uma tarefa selecionada no Kanban.
- **Pré-condições:** operador autenticado; drawer de uma tarefa aberto no Kanban.
- **Passos:** 1. Clicar em `Perguntar ao JOTA sobre esta tarefa`. 2. Confirmar o contexto exibido. 3. Enviar uma pergunta. 4. Limpar o contexto.
- **Resultado esperado:** o widget abre com título/ID da tarefa, envia ao proxy uma mensagem enriquecida com projeto, responsável, prioridade, status e descrição e mantém o histórico da tarefa em `sessionStorage`; limpar o contexto retorna à conversa geral.
- **Estado atual/bloqueio:** limitação conhecida: o contexto depende do mesmo proxy relativo `/api/rag-proxy` e pode receber a resposta local alternativa do backend quando o AnythingLLM falhar; não há persistência de conversa no backend e os métodos de sessões do serviço não têm endpoints correspondentes.
- **Rotas/endpoints/tabelas:** drawer `/implantacao/kanban` + FAB global; `POST /api/rag-proxy/chat`, autenticado; histórico local `cc.jota.sessao.tarefa.<id>`; nenhuma tabela nova.
- **Status/automação:** **cenário documentado**; não há teste automatizado do contexto.

## Regressão/histórico — funcionalidades desativadas ou sem rota ativa

Estes itens foram removidos do fluxo ou mantidos apenas como compatibilidade. **Não contam como histórias ativas** e não devem ser testados como se fossem telas disponíveis.

| Item | Evidência na árvore de trabalho | Tratamento |
|---|---|---|
| Página `/chat` | Não há rota `chat` nem componente de página; o código atual contém apenas o widget JOTA. | histórico; usar CJ-01/CJ-02. |
| Central Executiva `/executivo` | Pasta/rota não existem no código atual. | desativada; não criar link ativo. |
| Módulo Gestor `/gestor/entrada` | Backend e frontend do módulo não estão na árvore de trabalho. | desativado; não é destino pós-login. |
| Kanban ADM legado `/administrativo` | Rota está comentada em `features.routes.ts`; o link F usa `/implantacao/kanban?perfil=F`. | desativado como caminho; AK-02 trata o link direto ativo. |
| Gestão da Central `/admin/dashboard` | Componente, serviço e controller existem, mas a rota não está em `admin.routes.ts` nem no menu. | sem rota ativa; não documentar como tela disponível. |
| Etapas Globais | Rotas, componentes, serviço e API global foram removidos; a arquitetura atual usa nove `tbprojetoEtapa` por projeto. | histórico; usar IM-02/IM-04/IM-06. |
| Database Diagrama | Componente e rota não existem; a navegação atual tem seis abas. | removido; não prometer diagrama. |
| Database IA Chat | Componente/rota removidos; o JOTA global é separado. | removido; não tratar como IA do Database. |
| Relatório separado de Implantação | A rota redireciona para o Dashboard e o cálculo está na seção Produtividade. | redirecionamento em IM-01, não tela independente. |
| Home “Continue de onde parou”/“Mais utilizados” | Blocos não estão no template atual. | não são história ativa. |

## Contagem final

| Grupo solicitado | Histórias ativas |
|---|---:|
| Login/Base | 5 |
| Conhecimento/Ferramentas | 11 |
| Implantação | 8 |
| Database | 7 |
| Empresa/Agenda | 5 |
| Admin/Kanban F | 3 |
| Chat/JOTA | 2 |
| **Total** | **41** |

- **39** histórias estão como `cenário documentado`.
- **2** histórias (LB-04 e IM-06) estão como `validado em teste` por cobertura unitária existente: a busca global e o formulário de Tarefa (`tarefa-form.component.spec.ts`, doze casos). Isso não representa execução da suíte nesta revisão.
- A suíte frontend do repositório tem cinco arquivos `*.spec.ts` e 31 casos, sendo 12 no formulário de Tarefa; não há suíte de testes no backend. Itens da seção de regressão/histórico não entram no total.

## Limitações e pontos que não puderam ser confirmados

1. Não foram confirmadas respostas de execução para SQL Server, Google Sheets, AnythingLLM, permissões reais de cada operador ou persistência das escritas; as histórias foram confrontadas com o código, não com uma sessão de produção/homologação.
2. Não foram encontrados testes de backend, testes end-to-end ou suítes que cubram Login, Acessos, Agenda, Implantação ou Database além do formulário de Tarefa. A suíte frontend tem cinco arquivos e 31 casos — 12 deles no formulário de Tarefa — concentrados em busca global, `BuscaService`, shell, FAQ e formulário de Tarefa; ela não foi executada nesta revisão.
3. Os métodos de sessão do `JotaChatService` não têm endpoints correspondentes; o serviço usa proxy relativo e o backend pode devolver `MockResponse` quando `EnableMockFallback` permanece habilitado.
4. O logout pode não revogar o refresh quando o `/auth/logout` chega sem Bearer; `cc_refresh` também está configurado com `Secure=false` no código atual.
5. O filtro Database “Apenas possíveis” compara `possivel` com `possivei`; a opção “Sem projeto” da lista de tarefas e os atalhos do Dashboard não são consumidos de forma confiável. O projeto da tarefa é imutável pelo formulário de edição e a etapa só pode ser escolhida entre as etapas do projeto atual.
6. PUTs parciais do Kanban podem apagar dados; WIP, `Minhas tarefas` e autorizações não são garantidos uniformemente.
7. O modal/retorno de etapas pode falhar; documentos usam URL temporária `blob:` e a exclusão não está implementada no backend.
8. A edição de Agenda pode limpar participantes/SLA, e a verificação de conflitos considera apenas o responsável, não participantes.
9. Credenciais de Acessos viajam no corpo da API em claro; a máscara da tela não protege o transporte.
10. O Admin Dashboard não tem rota/menu; se chamado diretamente, mistura filtros de arquivamento e retorna contadores por função iguais a zero, tornando as métricas inconsistentes.
11. `ClienteObrigatorio` não é aplicado de forma consistente pelo formulário/serviço de Projetos; as verificações de WIP e de papel variam conforme o endpoint.
12. O `GET /api/v1/auth/me` existe, mas não é usado pelo frontend; `/admin/projetos/:id` e outros links de compatibilidade não estão declarados.

## Arquivos de referência

- [`05-ENDPOINTS.md`](./05-ENDPOINTS.md), [`06-COMPONENTES-FRONTEND.md`](./06-COMPONENTES-FRONTEND.md) e [`07-SERVICES-BACKEND.md`](./07-SERVICES-BACKEND.md) — contratos, componentes e serviços atuais.
- [`TELAS.md`](./backup/2026-09-24/TELAS.md) e [`HISTORIAS-TELAS.md`](./backup/2026-09-24/HISTORIAS-TELAS.md) — índice e roteiro arquivados, mantidos apenas como contexto.
- [`01-base.md`](./backup/2026-09-24/telas/01-base.md), [`02-conhecimento.md`](./backup/2026-09-24/telas/02-conhecimento.md), [`03-implantacao.md`](./backup/2026-09-24/telas/03-implantacao.md), [`04-database.md`](./backup/2026-09-24/telas/04-database.md), [`05-empresa-agenda.md`](./backup/2026-09-24/telas/05-empresa-agenda.md), [`06-backend.md`](./backup/2026-09-24/telas/06-backend.md) e [`07-gestao.md`](./backup/2026-09-24/telas/07-gestao.md) — detalhes técnicos arquivados de apoio.
- Rotas conferidas em `frontend/src/app/app.routes.ts`, `frontend/src/app/features.routes.ts`, `frontend/src/app/features/implantacao/implantacao.routes.ts`, `frontend/src/app/features/database/database.routes.ts` e `frontend/src/app/features/admin/admin.routes.ts`; endpoints conferidos nos controllers do backend.
