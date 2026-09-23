# Histórias de Tela — QA (verificadas no código)

> Documento de QA/histórias de usuário, uma seção por tela. Cada história foi verificada no código (componente `.ts` + template `.html` + rotas + service quando houver).
> Rotas confirmadas em `frontend/src/app/app.routes.ts` (`/login`), `frontend/src/app/features.routes.ts`, `frontend/src/app/features/implantacao/implantacao.routes.ts` e `frontend/src/app/features/database/database.routes.ts`.
> Nota de escopo: o fluxo Kanban→Agenda está **fora de escopo** e não é coberto aqui.
> Rotas **desativadas**: `/executivo` e `/administrativo` (comentadas em `features.routes.ts` — seções marcadas abaixo).

## LOGIN (`/login`)
**História:** Como operador, quero entrar com usuário e senha para acessar o sistema.
**Passos:** 1. Preenche os campos "Usuário" (`#usuario`) e "Senha" (`#senha`). 2. Marca "Lembrar meu acesso" se quiser sessão de 4h. 3. Clica em "Entrar".
**Backend/tabelas:** `POST /api/v1/auth/login` (retorna accessToken + user); `POST /api/v1/auth/refresh` (cookie HttpOnly `cc_refresh`); tabelas `TBOPERADOR` + `RefreshTokens` (via backend).
**Resultado esperado:** Login válido redireciona: admin sem deep-link → **`/gestor/entrada`**; demais → `/`; sessão expirada exibe "Sua sessão expirou"; access token fica somente em memória; deep-link (`returnUrl`) é respeitado.

## HOME (`/`)
**História:** Como operador, quero uma entrada operacional (o que posso fazer) em vez de um dashboard institucional.
**Passos:** 1. Acessa `/` e vê a saudação com primeiro nome + o input **"Buscar na Central..."**. 2. Foca/clica no input e confirma que as sugestões abrem no próprio Hero, sem mover o foco para o Header; digita para filtrar o índice local (máximo de 8 resultados) e verifica a mensagem quando não há correspondência. 3. Abre um resultado por clique ou por `ArrowDown`/`ArrowUp` + `Enter`; testa `Escape` e `Tab`. 4. No Header, confere **"Pesquisar qualquer conteúdo..."** e `Ctrl+K`/`Cmd+K` abrindo, focando e selecionando a consulta. 5. Clica num acesso rápido (Resolver, Banco, Acessos, Fraseologias, Implantação, Cursos). 6. Volta depois e vê "Continue de onde parou"/"Mais utilizados" preenchidos + agenda de 7 dias.
**Backend/tabelas:** Somente frontend + `GET /api/v1/agenda/eventos` (compromissos); busca e recentes são locais (`RecentesService` em `localStorage cc.recentes.v1`, começa vazio, sem mock); sem escrita no backend.
**Resultado esperado:** Uma origem e um painel por vez, consulta compartilhada, resultados locais navegáveis e semântica `combobox`/`listbox` com status acessível; saudação, ações, listas reais de uso e compromissos mantêm estados vazios honestos na primeira visita.

## FERRAMENTAS (`/ferramentas`)
**História:** Como analista de suporte, quero pesquisar e filtrar ferramentas para abrir a ideal no atendimento.
**Passos:** 1. Digita no campo search "Pesquisar por nome ou descricao...". 2. Clica numa categoria ("Todas" + categorias). 3. Clica no card da ferramenta.
**Backend/tabelas:** Somente leitura local — `ferramentas.data.ts` via `FerramentasService`; sem escrita, sem endpoint HTTP.
**Resultado esperado:** Contador "N ferramenta(s) encontrada(s)"; filtro por categoria + busca funcionam; clique abre o detalhe.

## FERRAMENTA-DETALHE (`/ferramentas/detalhe/:id`)
**História:** Como analista, quero ver o detalhe de uma ferramenta para usá-la no atendimento.
**Passos:** 1. Abre `/ferramentas/detalhe/:id` (via card). 2. Lê informações completas.
**Backend/tabelas:** Somente leitura local — `FerramentasService.obterFerramenta()` sobre `ferramentas.data.ts`; sem escrita.
**Resultado esperado:** Exibe detalhe da ferramenta do `id`; id inexistente mostra estado vazio/erro.

## ACESSOS (`/ferramentas/acessos`)
**História:** Como operador autorizado, quero validar a senha mestre para visualizar as credenciais de uma empresa.
**Passos:** 1. Busca a empresa na lista. 2. Clica no card/botão da empresa (abre modal de senha). 3. Preenche "Usuário" + "Senha" e clica em "Confirmar". 4. No modal de detalhe usa "Copiar" e "Fechar"; "Tentar novamente" se falhar; "Cancelar" fecha o modal de senha.
**Backend/tabelas:** `GET /api/v1/acessos` (lista resumo); `POST /api/v1/acessos/validar-senha`; `POST /api/v1/acessos/visualizar?empresaId=N` (credenciais + auditoria); fonte Google Sheets (16 colunas A–P); escrita só de auditoria em `AuditoriaAcessos`.
**Resultado esperado:** Senha válida exibe blocos TS/Banco/VPN/Actyon/AnyDesk/Observações (expira em 5 min); senha inválida mantém o modal com erro.

## FAQ (`/ferramentas/faq`)
**História:** Como operador, quero consultar a Jornada de Cobrança e o glossário para responder dúvidas.
**Passos:** 1. Acessa `/ferramentas/faq`. 2. Navega pelo fluxograma (14 etapas) e acordeão de perguntas.
**Backend/tabelas:** Somente frontend — conteúdo estático em `faq.component.html`; sem escrita.
**Resultado esperado:** Fluxo Carteira→…→Encerramento + glossário visíveis; nenhuma chamada de API.

## STACK (`/stack`)
**História:** Como operador, quero ver a stack tecnológica do sistema para referência.
**Passos:** 1. Acessa `/stack`. 2. Lê a lista (Angular 18, Bootstrap 5, .NET 8, etc.).
**Backend/tabelas:** Somente frontend — conteúdo estático em `stack.component.ts`; sem escrita.
**Resultado esperado:** Lista da stack exibida; nenhuma chamada de API.

## AGENDA (`/agenda`)
**História:** Como operador, quero visualizar meus eventos em Dia/Semana/Mês e filtrar por responsável, função e escopo (Meus/Geral) para organizar o trabalho.
**Passos:** 1. Clica em "Dia", "Semana" ou "Mês". 2. Navega com "‹" (anterior), "Hoje", "›" (próximo). 3. Filtra pelo select "Responsável:" ("Todos" + operadores) e limpa com "✕"; filtra pelo select "Função:" ("Todas" + funções) e limpa com "✕"; alterna o segmentado "Meus" (só meus eventos) / "Geral" (todos). 4. Clica numa célula vazia (criar) ou num evento (editar).
**Backend/tabelas:** `GET /api/v1/agenda/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` (leitura, filtros opcionais); `GET /api/v1/agenda/tipos`; `GET /api/v1/agenda/operadores`; `GET /api/v1/agenda/funcoes`; tabelas lidas `IMPL_Agenda`, `CC_TipoEvento`, `CC_AgendaParticipante`, `TBOPERADOR` (+ `FuncaoId`), `CC_Funcao`, `IMPL_Projeto`.
**Resultado esperado:** Grade sempre renderizada; período sem eventos exibe barra inline "Nenhum evento no período. Clique em Novo evento ou em uma célula do calendário." (`role="status"`), sem overlay bloqueante; único overlay é `.agenda-loading` durante `carregando()`.

## AGENDA — FILTRAR POR FUNÇÃO (filtros de `/agenda`)
**História:** Como operador, quero filtrar a agenda por função para ver os eventos de um grupo (ex.: Suporte, Implantação).
**Passos:** 1. Acessa `/agenda`. 2. No select "Função:" (opções "Todas" + `funcoes()` carregadas via `GET /api/v1/agenda/funcoes` no `ngOnInit`), escolhe uma função — dispara `filtrarPorFuncao()` → `carregar()` com `funcaoId` em `AgendaFiltro`/`listarEventos()`. 3. Clica no "✕" ao lado do select para limpar (`limparFiltroFuncao()`, volta a `null`).
**Backend/tabelas:** `GET /api/v1/agenda/funcoes` (lista `FuncaoResumo { id, descricao, classificacao }` — só funções ativas com operadores ativos, ordem por descrição); `GET /api/v1/agenda/eventos?...&funcaoId=N` (backend filtra via tabela legada `tbfuncionario` por `OPERADOR_ID` exato — `_db.FuncionariosLegado.Any(f => f.OperadorId == a.OperadorId && f.FuncaoId == funcaoId && f.Ativo == "S")`; `TBOPERADOR.FUNCAO_ID` **não** é usado — coluna criada pela migration `AddFuncao` sem backfill, permanece nula); leitura de `CC_Funcao` (opções do filtro) + `tbfuncionario` (fonte real via `FuncionarioLegado`) + `IMPL_Agenda`.
**Resultado esperado:** Com função selecionada, a grade exibe só eventos cujo responsável tem aquela `FuncaoId` na tabela legada; limpar o filtro (`Todas`) volta a listar todos os eventos do período; combinável com o filtro por responsável e com o escopo Meus/Geral.

## AGENDA — ALTERNAR MEUS/GERAL (escopo de `/agenda`)
**História:** Como operador, quero alternar entre "Meus" (só meus eventos) e "Geral" (todos) para focar na minha agenda ou ver a da equipe.
**Passos:** 1. Acessa `/agenda`. 2. Clica no segmentado "Meus" (`alternarEscopo('meus')` — define `operadorFiltro = usuarioLogado()` via `AuthService.getOperadorLogado()`) ou "Geral" (`alternarEscopo('todos')` — limpa `operadorFiltro` para `''`). 3. Usa "Limpar filtros" implícito via `limparFiltros()` (`operadorFiltro=''`, `funcaoFiltro=null`, `escopo='todos'`) quando quiser resetar tudo.
**Backend/tabelas:** Mesmo `GET /api/v1/agenda/eventos?inicio=X&fim=Y&responsavelId=Z` — o escopo "Meus" apenas preenche `responsavelId` com o operador logado (filtro client-side sobre o mesmo endpoint, sem endpoint novo); leitura de `IMPL_Agenda` + `TBOPERADOR`.
**Resultado esperado:** "Meus" exibe só eventos do operador logado; "Geral" exibe todos do período; o estado do segmentado reflete `escopo()` (`'todos'|'meus'`); combinável com o filtro por função.

## AGENDA — MODAL NOVO/EDITAR EVENTO (modal sobre `/agenda`)
**História:** Como operador, quero criar um evento com data/hora, tipo e responsável para registrá-lo na agenda.
**Passos:** 1. Clica em "Novo evento". 2. Preenche "Título" (*), "Descrição", "Local", "Data início" (*) + "Hora início", "Data fim" + "Hora fim" (só informar "Hora fim" auto-preenche Data fim = Data início; só informar "Data fim" sugere Hora fim = início + 1h), "Dia inteiro", "Tipo" (*) (chips), "Responsável" (*) ("Selecione..."). 3. Clica em "Salvar" ("Salvando…" durante o envio) ou "Cancelar"/"Fechar".
**Backend/tabelas:** `POST /api/v1/agenda/eventos` (criar); `GET /api/v1/agenda/eventos/{id}` (carrega Descrição/Local/participantes na edição); escreve em `IMPL_Agenda` (+ `CC_AgendaParticipante` se participantes informados — campo opcional).
**Resultado esperado:** Validação cliente exige título, data início, tipo e responsável; "Data/hora final deve ser posterior à inicial." se fim ≤ início; sucesso fecha o modal e recarrega a lista.

## AGENDA — AUTORIZAÇÃO OWNER + ADMIN (somente leitura para eventos de terceiros)
**História:** Como usuário, **não devo alterar evento alheio** — apenas o responsável (dono) ou um administrador podem editar, excluir ou mover um evento; participantes e demais usuários veem o evento como somente leitura.
**Passos:** 1. Acessa `/agenda`. 2. Visualiza evento de outro operador (cards em Dia/Semana/Operacional/Mês). 3. Card exibe estilo `.agenda-evento--somente-leitura` (cinza, cursor not-allowed, tooltip "Apenas o responsável ou um administrador pode editar este evento"). 4. Clica no card — **não abre o modal de edição**. 5. Se for o responsável ou admin, o card é normal e clique abre edição. 6. Se tentar editar via URL direta ou API, backend retorna **403** `ForbiddenException` ("Sem permissão para alterar este evento").
**Backend/tabelas:** `PUT /api/v1/agenda/eventos/{id}`, `DELETE /api/v1/agenda/eventos/{id}`, `PATCH /api/v1/agenda/eventos/{id}/mover` — validam `isAdmin || evento.OperadorId === usuarioId` (claim `sub`/`NameIdentifier`); `ForbiddenException` em `Exceptions/ForbiddenException.cs`; `POST /eventos` (criar) **não** valida ownership (pode criar para terceiros).
**Resultado esperado:** Usuário não dono vê cards desabilitados (somente leitura), não consegue abrir modal de edição; se burlar o frontend, API retorna 403 com mensagem clara; criar evento continua funcionando para qualquer responsável.

## AGENDA — EDITAR/EXCLUIR E CONFLITO 409 (modal sobre `/agenda`)
**História:** Como operador, quero editar ou excluir um evento e ser avisado de choque de horários do responsável.
**Passos:** 1. Clica num evento (abre "Editar evento" com dados via `obterEvento()`). 2. Altera campos e clica em "Salvar", ou clica em "Excluir" e confirma no `confirm()` nativo.
**Backend/tabelas:** `PUT /api/v1/agenda/eventos/{id}` (reescreve `IMPL_Agenda`; reconstrói `CC_AgendaParticipante` só quando `participantesIds` informado); `DELETE /api/v1/agenda/eventos/{id}` (remove `IMPL_Agenda` + participantes); `PATCH /api/v1/agenda/eventos/{id}/mover` (drag-drop, atualiza datas em `IMPL_Agenda`); 409 `{ mensagem, conflitos, code: "CONFLICT_HORARIOS" }` quando há sobreposição do responsável (exclui o próprio id).
**Resultado esperado:** 409 exibe `alert-warning` "Eventos em conflito neste período:" com `título — dd/MM HH:mm até dd/MM HH:mm` (ou `—` sem fim); exclusão pede confirmação antes da API.

## AGENDA — MATRIZ OPERAÇÃO × TABELA
**História:** Como QA, quero saber qual ação escreve em qual tabela da Agenda.
**Passos:** 1. Executa cada operação abaixo. 2. Confere a tabela afetada.
**Backend/tabelas:** Listar/filtrar (`GET /eventos` com `responsavelId?`/`funcaoId?`, `GET /tipos`, `GET /operadores`, `GET /funcoes`) — leitura de `IMPL_Agenda` / `CC_TipoEvento` / `TBOPERADOR` (+ `FuncaoId`) / `CC_Funcao` (+ `CC_AgendaParticipante`, `IMPL_Projeto` no detalhe); Criar (`POST /eventos`) — escreve `IMPL_Agenda` (+ `CC_AgendaParticipante` se `participantesIds` informado); Editar (`PUT /eventos/{id}`) — escreve `IMPL_Agenda` (+ reconstrói `CC_AgendaParticipante` se informado); Mover (`PATCH /eventos/{id}/mover`) — escreve `IMPL_Agenda` (datas); Excluir (`DELETE /eventos/{id}`) — apaga `IMPL_Agenda` (+ participantes). `CC_TipoEvento`, `TBOPERADOR` e `CC_Funcao` nunca são escritos pela Agenda.
**Resultado esperado:** Nenhuma operação da Agenda escreve em `CC_TipoEvento`, `TBOPERADOR` ou `CC_Funcao`; participantes opcionais nunca geram 400 quando omitidos; escopo Meus/Geral não cria escrita — só varia `responsavelId` no `GET /eventos`.

## CURSOS (`/cursos`)
**História:** Como operador, quero filtrar cursos por plataforma/área para estudar.
**Passos:** 1. Busca/filtra por plataforma (Alura, YouTube, Curso em Vídeo, Microsoft Learn…) ou categoria. 2. Clica no card do curso.
**Backend/tabelas:** Somente leitura local — `cursos-novos.data.ts` via `CursosService`; sem escrita.
**Resultado esperado:** Catálogo filtrado; clique abre `/cursos/detalhe/:id`.

## CURSO-DETALHE (`/cursos/detalhe/:id`)
**História:** Como operador, quero ver o detalhe de um curso (descrição, link, vídeo) para assisti-lo.
**Passos:** 1. Abre `/cursos/detalhe/:id`. 2. Clica no link/player (YouTube embutido quando houver).
**Backend/tabelas:** Somente leitura local — `buscarCursoPorId()` em `cursos-novos.data.ts`; sem escrita.
**Resultado esperado:** Detalhe + categorias/trilhas do curso; player YouTube quando aplicável.

## TRILHAS (`/trilhas/resolver`)
**História:** Como operador, quero descrever o problema e cair direto na seção certa do guia (ou nos exemplos práticos).
**Passos:** 1. Acessa `/trilhas/resolver`. 2. Digita no filtro ("erro 500", "lentidão") e vê só as seções correspondentes. 3. Clica num exemplo rápido (abre a seção 8 e rola até o conteúdo) ou no CTA do JOTA.
**Backend/tabelas:** Somente frontend — filtro `secoesVisiveis()` sobre conteúdo estático; sem escrita, sem IA simulada.
**Resultado esperado:** Filtro reduz o índice; exemplos abrem a seção correta; CTA navega para `/chat`.

## TRILHA-SQL (`/trilhas/sql`)
**História:** Como operador, quero copiar comandos SQL de diagnóstico para investigar o banco.
**Passos:** 1. Acessa `/trilhas/sql`. 2. Clica em copiar no comando desejado.
**Backend/tabelas:** Somente leitura local — `biblioteca-sql.data.ts`; sem escrita (`copiarTexto()` com fallback).
**Resultado esperado:** Comando copiado para a área de transferência; nenhuma chamada de API.

## TRILHA-REDE (`/trilhas/rede`)
**História:** Como operador, quero consultar comandos e guias de rede para troubleshooting.
**Passos:** 1. Acessa `/trilhas/rede`. 2. Lê/copia os comandos.
**Backend/tabelas:** Somente frontend — conteúdo estático em `trilha-rede.component.ts`; sem escrita.
**Resultado esperado:** Guias de rede exibidos; nenhuma chamada de API.

## TRILHA-INFRA (`/trilhas/infra`)
**História:** Como operador, quero consultar comandos de infraestrutura/servidores para troubleshooting.
**Passos:** 1. Acessa `/trilhas/infra`. 2. Lê/copia os comandos.
**Backend/tabelas:** Somente frontend — conteúdo estático em `trilha-infra.component.ts`; sem escrita.
**Resultado esperado:** Guias de infra exibidos; nenhuma chamada de API.

## VISÃO ADM (`/visao-adm`)
**História:** Como administrativo, quero buscar procedimentos por setor e utilidades para executar rotinas.
**Passos:** 1. Busca procedimentos (Financeiro/RH/Comercial) e abre o detalhe. 2. Na Central de Utilidades: busca por termo/categoria, alterna grade/lista, favorita (★) e abre a utilidade (registra acesso/contador).
**Backend/tabelas:** Somente leitura local + `localStorage` — `procedimentos.data.ts` via `ProcedimentosService`, `utilidades.data.ts` via `UtilidadesService` (favoritos em `cc.adm.utilidades.favoritos`, acessos em `cc.adm.utilidades.runtime`); sem endpoint HTTP, sem escrita em banco.
**Resultado esperado:** Filtros e favoritos funcionam; contador de acessos/"últimos utilizados" atualizam localmente.

## VISÃO ADM — DETALHE (`/visao-adm/detalhe/:id`)
**História:** Como administrativo, quero ler um procedimento completo e imprimi-lo.
**Passos:** 1. Abre `/visao-adm/detalhe/:id`. 2. Clica em imprimir.
**Backend/tabelas:** Somente leitura local — `ProcedimentosService.obter()` sobre `procedimentos.data.ts`; sem escrita.
**Resultado esperado:** Procedimento completo exibido com impressão; nenhuma chamada de API.

## FRASEOLOGIA (`/fraseologia`)
**História:** Como atendente, quero copiar fraseologias do fluxo de atendimento para responder rápido.
**Passos:** 1. Acessa `/fraseologia`. 2. Clica em copiar na mensagem desejada.
**Backend/tabelas:** Somente frontend — conteúdo estático; `copiarTexto()` com fallback; sem escrita.
**Resultado esperado:** Mensagem copiada; nenhuma chamada de API.

## MODELO-CHAMADOS (`/modelo-chamados`)
**História:** Como atendente, quero usar um modelo de chamado pronto para padronizar o registro.
**Passos:** 1. Acessa `/modelo-chamados`. 2. Preenche o formulário/seleciona o template. 3. Copia o texto gerado.
**Backend/tabelas:** Somente frontend — conteúdo estático em `modelo-chamados.component.ts`; sem escrita.
**Resultado esperado:** Texto do chamado gerado/copiado; nenhuma chamada de API.

## POLÍTICA (`/politica`)
**História:** Como operador, quero ler a política interna da empresa para seguir as regras.
**Passos:** 1. Acessa `/politica`. 2. Lê as seções.
**Backend/tabelas:** Somente leitura local — `politica.data.ts`; sem escrita.
**Resultado esperado:** Conteúdo da política exibido; nenhuma chamada de API.

## IMPLANTAÇÃO — DASHBOARD (`/implantacao/dashboard`)
**História:** Como gestor, quero ver KPIs (totais, prazos, gráfico por categoria) para acompanhar a operação.
**Passos:** 1. Acessa `/implantacao/dashboard`. 2. Lê cards de totais/projetos/tarefas, próximos prazos (link para o projeto) e gráfico.
**Backend/tabelas:** `GET /api/v1/implantacao/dashboard` via `DashboardService.obter()`; leitura agregada de `IMPL_Projeto` + `IMPL_Tarefa` (`porEquipe` = stub único `Geral`).
**Resultado esperado:** KPIs e gráfico exibidos; nenhuma escrita.

## IMPLANTAÇÃO — KANBAN (`/implantacao/kanban`)
**História:** Como implantador, quero arrastar cards entre colunas, usar o menu do cartão, o drawer e ações em lote para atualizar as tarefas.
**Passos:** 1. Acessa `/implantacao/kanban`. 2. Arrasta-solta o card na coluna destino (drag-drop `@angular/cdk`). 3. Abre o menu do cartão (⋮) e usa Editar (vai para `/implantacao/tarefas/:id/editar`), Comentar (abre o drawer), Duplicar (recria com `(cópia)` preservando etapa/coluna/`chamadoLegadoId`/prioridade), Mover de coluna ou Excluir (com `confirm()`). 4. Clica no card para abrir o drawer (detalhe + thread de comentários + Adicionar comentário + Editar tarefa/Excluir). 5. Usa edição inline (título via F2, prioridade via duplo clique, responsável) — o frontend lê o detalhe (`GET /tarefas/{id}`) e salva via `PUT` preservando os demais campos. 6. Usa seleção múltipla para Mover/Prioridade/Responsável/Excluir em lote (prioridade/responsável preservam campos via `obter()` + `PUT`; mover usa `PATCH /coluna`).
**Backend/tabelas:** `GET /api/v1/implantacao/tarefas` (filtros `projetoId`, `responsavelId`, `status`, `prioridade`, `buscar`, `apenasAtrasadas`, `apenasEmAndamento`, `apenasConcluidas`); `GET /api/v1/implantacao/tarefas/{id}` (base da edição com preservação de campos, incluindo `ChamadoLegadoId` e `Status`); `POST /api/v1/implantacao/tarefas` (inline por coluna e duplicação); `PUT /api/v1/implantacao/tarefas/{id}` (`TarefaAtualizarRequest` com `Status` opcional e `ChamadoLegadoId`; prioridade 0–3 validada via `Enum.IsDefined`, status via `Enum.TryParse`); `PATCH /api/v1/implantacao/tarefas/{id}/coluna` (move — `UPDATE IMPL_Tarefa`: `ColunaKanbanId`, `Ordem`, `Status`, com `SincronizarAgendaAsync`); `POST /api/v1/implantacao/tarefas/{id}/comentarios`; `DELETE` físico em `IMPL_Tarefa` com auditoria em `IMPL_AuditoriaImplantacao`; tabelas `IMPL_ColunaKanban`, `IMPL_Tarefa`, `IMPL_Projeto`, `IMPL_ComentarioTarefa`.
**Resultado esperado:** Card muda de coluna e persiste; edição inline/lote preserva campos não editados; duplicação mantém vínculo de legado; colunas `padrao` não podem ser excluídas (máx 8).
> **Status:** implementação em andamento no working tree; validação pendente (sem validação runtime).

## IMPLANTAÇÃO — PROJETOS (`/implantacao/projetos`)
**História:** Como implantador, quero listar/filtrar projetos e abrir os formulários de criação/edição para iniciar ou ajustar uma implantação.
**Passos:** 1. Acessa `/implantacao/projetos`. 2. Filtra por tipo/status/cliente/responsável e busca. 3. Clica em "Novo projeto" (`/implantacao/projetos/novo`), confere o código sugerido (`PRJ-XXXX` via `GET /proximo-codigo`) e salva (`POST`). 4. Abre um projeto e usa Editar (`/implantacao/projetos/:id/editar`) ou Excluir (com `confirm()`).
**Backend/tabelas:** `GET /api/v1/implantacao/projetos` (filtros `tipo`, `status`, `clienteId`, `responsavelId`, `buscar`); `GET /api/v1/implantacao/projetos/proximo-codigo` (sem parâmetros, retorna `{ codigo }`); `GET /api/v1/implantacao/projetos/clientes` (clientes ativos); `GET /api/v1/implantacao/tipos-projeto?apenasAtivos=true`; `GET /api/v1/agenda/operadores`; `GET /api/v1/implantacao/colunas-kanban?apenasAtivas=true`; `POST /api/v1/implantacao/projetos` (`ProjetoCriarRequest`); `PUT /api/v1/implantacao/projetos/{id}` (`ProjetoAtualizarRequest` + `usuarioAlteracao`); `PATCH /api/v1/implantacao/projetos/{id}/status`; `DELETE /api/v1/implantacao/projetos/{id}`; tabelas `IMPL_Projeto`, `IMPL_Cliente`, `IMPL_TipoProjeto`.
**Resultado esperado:** Projeto criado com código `PRJ-XXXX`; grid mostra progresso/meta/responsável/prazo; prioridades alinhadas ao enum `PrioridadeProjeto` (`Baixa = 0`, `Media = 1`, `Alta = 2`, `Urgente = 3`).
> **Status:** implementação em andamento no working tree; validação pendente (sem validação runtime).

## IMPLANTAÇÃO — PROJETO-NOVO/EDITAR (`/implantacao/projetos/novo`, `/implantacao/projetos/:id/editar`)
**História:** Como implantador, quero preencher o formulário de projeto (create/edit) com lookups para salvar sem erro de payload.
**Passos:** 1. Abre `/implantacao/projetos/novo` (código sugerido readonly) ou `/implantacao/projetos/:id/editar` (pré-preenchido via `GET /projetos/{id}`). 2. Preenche Nome* + Tipo* + Responsável* (validação `podeSalvar()`; progresso 0–100 no edit). 3. Seleciona Tipo (`GET /tipos-projeto?apenasAtivos=true`), Cliente (`GET /projetos/clientes`), Responsável (`GET /agenda/operadores`), Coluna Kanban (`GET /colunas-kanban?apenasAtivas=true`). 4. Salva (create → detalhe; edit → detalhe) ou Cancela (edit → detalhe; create → listagem).
**Backend/tabelas:** `POST /api/v1/implantacao/projetos` (`ProjetoCriarRequest` com `criadorId` do operador logado); `PUT /api/v1/implantacao/projetos/{id}` (`ProjetoAtualizarRequest` com `usuarioAlteracao`; `status` em `Backlog`, `AFazer`, `EmAndamento`, `Homologacao`, `Concluido`, `Bloqueado`, `Cancelado`); validação server-side de `PrioridadeProjeto`, tipo/cliente (`400 { mensagem }`); escrita em `IMPL_Projeto` com código gerado via `ProximoCodigoAsync()`.
**Resultado esperado:** Create exige Nome/Tipo/Responsável; edit preserva código e valida progresso; sucesso navega ao detalhe.
> **Status:** implementação em andamento no working tree; validação pendente (sem validação runtime).

## IMPLANTAÇÃO — PROJETO-DETALHE (`/implantacao/projetos/:id`)
**História:** Como implantador, quero ver o hero, detalhes, KPIs e tarefas de um projeto e agir (editar/excluir/criar tarefa) para acompanhá-lo.
**Passos:** 1. Abre `/implantacao/projetos/:id` (via card). 2. Alterna as abas "Visão geral", "Tarefas" (com badge de quantidade) e "Histórico" (placeholder "Em breve"). 3. No hero, clica em Editar (→ `/implantacao/projetos/:id/editar`) ou Excluir (`confirm()` + `DELETE` → volta à listagem). 4. Na aba Tarefas, clica em "Nova tarefa" (→ `/implantacao/tarefas/novo?projetoId=:id`) ou Editar na linha (→ `/implantacao/tarefas/:id/editar`).
**Backend/tabelas:** `GET /api/v1/implantacao/projetos/{id}` (com `totalTarefas`, `tarefasConcluidas`, `tarefasAtrasadas`); `GET /api/v1/implantacao/tarefas?projetoId={id}`; `DELETE /api/v1/implantacao/projetos/{id}`; leitura de `IMPL_Projeto`, `IMPL_Tarefa`.
**Resultado esperado:** Hero com código/título/progresso + breadcrumb back; KPIs (total, concluídas, atrasadas) conferem com as tarefas; ações de editar/excluir e nova tarefa navegam corretamente.
> **Status:** implementação em andamento no working tree; validação pendente (sem validação runtime).

## IMPLANTAÇÃO — TAREFAS (`/implantacao/tarefas`)
**História:** Como implantador, quero filtrar tarefas por atalho e campos e agir (editar/excluir/criar) para achar o que está atrasado.
**Passos:** 1. Acessa `/implantacao/tarefas`. 2. Clica nos atalhos "Todas", "Atrasadas" (`apenasAtrasadas`), "Em andamento" (`apenasEmAndamento`), "Concluídas" (`apenasConcluidas`). 3. Filtra por projeto (select; aceita `?projetoId=` vindo do detalhe) e busca textual. 4. Clica em "Nova tarefa" (`/implantacao/tarefas/novo`); por card usa Editar (`/implantacao/tarefas/:id/editar`) ou Excluir (`confirm()` + remoção da lista sem reload).
**Backend/tabelas:** `GET /api/v1/implantacao/tarefas` (com filtros); `GET /api/v1/implantacao/projetos` (opções do filtro); `DELETE /api/v1/implantacao/tarefas/{id}`; tabelas `IMPL_Tarefa`, `IMPL_Projeto`.
**Resultado esperado:** Grid de cards com ID mono (T123), status e prioridade; "Atrasadas" filtra `apenasAtrasadas`; título do card linka ao projeto.
> **Status:** implementação em andamento no working tree; validação pendente (sem validação runtime).

## IMPLANTAÇÃO — TAREFA-NOVA/EDITAR (`/implantacao/tarefas/novo`, `/implantacao/tarefas/:id/editar`)
**História:** Como implantador, quero preencher o formulário de tarefa (create/edit) com projeto, prioridade, etapa, coluna, responsável, status e vínculo legado para salvar sem erro de payload.
**Passos:** 1. Abre `/implantacao/tarefas/novo` (aceita `?projetoId=` pré-selecionado) ou `/implantacao/tarefas/:id/editar` (pré-preenche via `GET /tarefas/{id}`). 2. Preenche Título* + Projeto* (validação `podeSalvar()`; prioridade 0–3; ordem ≥ 0; motivo obrigatório se bloqueada). 3. Seleciona Projeto (`GET /projetos`), Etapa (`GET /etapas?projetoId=`), Coluna Kanban (`GET /colunas-kanban`), Responsável (`GET /agenda/operadores`); no edit, ajusta Status, datas, horas, bloqueio e `Chamado Legado (ID)`. 4. Salva (navega para `/implantacao/tarefas/:id/editar`) ou Cancela (volta à listagem).
**Backend/tabelas:** `POST /api/v1/implantacao/tarefas` (`TarefaCriarRequest` com `criadorId` do operador logado); `PUT /api/v1/implantacao/tarefas/{id}` (`TarefaAtualizarRequest` com `Status` opcional e `usuarioAlteracao`); validação server-side de `PrioridadeTarefa` (0–3, `Enum.IsDefined`) e `StatusTarefa` (`Backlog`, `AFazer`, `EmAndamento`, `EmHomologacao`, `Concluida`, `Cancelada`, via `Enum.TryParse`); `ChamadoLegadoId` (`TRF_ChamadoLegadoId`, FK lógica p/ `tbchamado.CHAMADO_ID`); escrita em `IMPL_Tarefa`.
**Resultado esperado:** Create exige Título/Projeto; edit preserva campos e valida prioridade/status/bloqueio; vínculo legado salvo quando informado.
> **Status:** implementação em andamento no working tree; validação pendente (sem validação runtime).

## IMPLANTAÇÃO — CADASTROS (`/implantacao/cadastros`)
**História:** Como administrador, quero manter tipos, etapas e colunas do Kanban para configurar a operação.
**Passos:** 1. Acessa `/implantacao/cadastros`. 2. Alterna as abas "Tipos", "Etapas", "Colunas Kanban". 3. Usa os formulários inline (criar/editar/excluir) e reordena colunas.
**Backend/tabelas:** `GET/POST/PUT/DELETE /api/v1/implantacao/tipos-projeto`; `GET/POST/PUT/DELETE /api/v1/implantacao/etapas`; `GET/POST/PUT/DELETE /api/v1/implantacao/colunas-kanban` + `POST /reordenar`; tabelas `IMPL_TipoProjeto`, `IMPL_Etapa`, `IMPL_ColunaKanban` (aba Equipes removida em 2026-09-12).
**Resultado esperado:** CRUD persiste por aba; seeds: 4 tipos, 13 etapas, 5 colunas padrão.

## DATABASE — SHELL (`/database` → `/database/visao-geral`)
**História:** Como operador, quero navegar pelas abas do Database Explorer com status de conexão visível.
**Passos:** 1. Acessa `/database` (redireciona para `visao-geral`). 2. Clica nas abas: "Explorador", "Relacionamentos", "Diagrama", "Consultas", "Query Builder", "Diferenças", "IA Chat", "Configuração". 3. Observa o banner verde (conectado) / vermelho (desconectado).
**Backend/tabelas:** `GET /api/v1/database/status`; `GET /api/v1/database/info`; metadados do SQL Server (`dbActyon_JCA`); sem escrita.
**Resultado esperado:** Abas trocam o conteúdo; banner reflete a conectividade real.

## DATABASE — EXPLORADOR (`/database/explorador`)
**História:** Como operador, quero buscar tabelas/procedures e ver colunas + índices para entender o schema.
**Passos:** 1. Digita em "Buscar tabela, coluna ou procedure…". 2. Clica numa tabela (carrega colunas + índices) ou procedure (abre modal). 3. Clica em "Consultas" (ícone) para pular à aba Consultas com a tabela.
**Backend/tabelas:** `GET /api/v1/database/tables`; `GET /api/v1/database/tables/{schema}/{name}/columns`; `GET /api/v1/database/tables/{schema}/{name}/indexes`; `GET /api/v1/database/procedures`; `GET /api/v1/database/procedures/{schema}/{name}`; `GET /api/v1/database/search`; views `sys.tables`, `sys.columns`, `sys.indexes`, `sys.procedures`; sem escrita.
**Resultado esperado:** Árvore filtrada; painel mostra colunas/índices; modal de procedure exibe definição.

## DATABASE — DETALHE DE TABELA (`/database/tabela/:schema/:tabela`)
**História:** Como operador, quero ver colunas, FKs, dados de exemplo e navegar entre tabelas relacionadas.
**Passos:** 1. Abre `/database/tabela/:schema/:tabela`. 2. Alterna as abas (inclui "Relacionamentos"). 3. Clica numa FK destino para navegar à tabela relacionada. 4. Clica em "Query Builder" ou "Executar".
**Backend/tabelas:** `GET /api/v1/database/tables/{schema}/{name}` (+ `/columns`, `/indexes`, `/dependencies`); `POST /api/v1/database/query` (somente `SELECT` — regex server-side bloqueia DML/DDL); metadados `sys.*`; sem escrita.
**Resultado esperado:** Detalhe + amostra exibidos; navegação por FK funciona; queries não-SELECT são rejeitadas.

## DATABASE — VISÃO GERAL (`/database/visao-geral`)
**História:** Como operador, quero ver os 9 cards de métricas do banco para ter o panorama.
**Passos:** 1. Acessa `/database/visao-geral`. 2. Lê os cards (servidor, tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers).
**Backend/tabelas:** `GET /api/v1/database/info`; `GET /api/v1/database/tables`; `GET /api/v1/database/procedures`; metadados `sys.*`; sem escrita.
**Resultado esperado:** Cards com totais + detalhes; nenhuma escrita.

## DATABASE — RELACIONAMENTOS (`/database/relacionamentos`)
**História:** Como operador, quero ver relacionamentos confirmados × possíveis com score para mapear JOINs.
**Passos:** 1. Acessa `/database/relacionamentos`. 2. Clica em "Buscar". 3. Filtra por coluna.
**Backend/tabelas:** `GET /api/v1/database/relationships`; `GET /api/v1/database/column-usage`; `sys.foreign_keys` + inferência (score 0–99%, BFS até 5 níveis); sem escrita.
**Resultado esperado:** Linha azul contínua (confirmado) × violeta tracejada (possível) com score e motivos.

## DATABASE — DIAGRAMA — ~~REMOVIDA~~ (arquivo `db-diagrama.component.ts` excluído; sem rota)

## DATABASE — CONSULTAS (`/database/consultas`)
**História:** Como operador, quero executar `SELECT` com paginação e timeout para consultar dados.
**Passos:** 1. Acessa `/database/consultas`. 2. Escreve o SQL (só `SELECT`/`WITH`). 3. Ajusta paginação (25/50/100/500) e timeout (5/15/30/60s). 4. Clica em "Executar" ("Executando…" durante a carga); "Sair do Query Builder" sai do modo assistido; "Consultas Recentes" reaproveita SQL.
**Backend/tabelas:** `POST /api/v1/database/query` (`DatabaseService.executarQuery()`); transação ReadUncommitted + ROLLBACK; limite 1–5000; tabelas-alvo lidas conforme o `SELECT`.
**Resultado esperado:** Resultado paginado; DML/DDL rejeitado pelo regex server-side.

## DATABASE — QUERY BUILDER (`/database/consultas`, aba Criador de Consultas)
**História:** Como operador, quero montar o `SELECT` sem escrever JOIN/WHERE para consultar com segurança.
**Passos:** 1. Acessa `/database/consultas` (aba Criador de Consultas) ou "Criar consulta" a partir de uma tabela/relacionamento (pré-preenche tabela principal ou caminho). 2. Escolhe a tabela principal. 3. Marca campos (badges PK/FK, busca, todos/limpar). 4. Adiciona tabelas relacionadas (Confirmada/Sugerida + confiança + evidências; JOIN automático). 5. Adiciona filtros em linguagem simples e ordenação. 6. Confere o resumo. 7. Vê o SQL (copiar), executa e lê o resultado.
**Backend/tabelas:** `POST /api/v1/database/query-builder-advanced` (gera SQL, aliases amigáveis); `POST /api/v1/database/query` (executa, somente leitura); `GET /api/v1/database/tables`; `GET /api/v1/database/graph`; sem escrita.
**Resultado esperado:** SQL gerado e executado (somente leitura).

## DATABASE — DIFERENÇAS (`/database/diferencas`)
**História:** Como operador, quero (1) ver divergências banco × documentação Markdown e (2) comparar o schema de uma tabela JCA com um arquivo CSV/JSON de estrutura esperada.
**Passos (aba Banco × Documentação):** 1. Acessa `/database/diferencas`. 2. Lê o "Resumo" e "Diferenças encontradas". 3. Opcionalmente salva/compara snapshots.
**Passos (aba Sincronização):** 1. Abre a sub-aba "Sincronização". 2. (Opcional) Usa o bloco "Script de exportação": ajusta schema/tabela (auto-fill pela Tabela JCA), copia o T-SSQL, roda no SSMS do banco externo e salva o JSON da célula em `.json`. 3. Seleciona a tabela JCA no dropdown. 4. Envia arquivo `.csv` ou `.json` (≤ 5 MB) com a estrutura esperada. 5. Clica em "Comparar". 6. Lê resumo (críticos/avisos/compatíveis/match %) e lista de diferenças (filtro "apenas diferenças"); opcionalmente exporta CSV.
**Backend/tabelas:** `GET /api/v1/database/tables` (dropdown de tabelas); `POST /api/v1/database/diff` (aba documentação); `POST /api/v1/database/compare-schemas` (multipart `FormData`: `schema`, `tabela`, `arquivo`; parse CSV/JSON no backend; rate limit `validacao`); sem escrita em dados de negócio.
**Resultado esperado:** Lista de divergências (ou vazio); na Sincronização, `SchemaComparisonResultDto` com severidades Critico/Aviso/Ok e % match (colunas/índices/FKs duplicados no arquivo viram `Aviso`, sem erro); bloco de script permite gerar o JSON de exportação (colunas/índices/FKs) no formato aceito pelo upload.

## DATABASE — IA CHAT — ~~REMOVIDA~~ (arquivo `db-ia-chat.component.ts` excluído; sem rota; JOTA global cobre o caso via widget)

## DATABASE — CONFIGURAÇÃO (`/database/configuracao`)
**História:** Como administrador, quero testar a conexão do Explorer para validar o acesso.
**Passos:** 1. Acessa `/database/configuracao`. 2. Lê o aviso "Configuração gerenciada pelo administrador (variáveis de ambiente / user-secrets)". 3. Clica em "Testar conexão" ("Testando…" durante o teste).
**Backend/tabelas:** `POST /api/v1/database/test-connection`; `GET /api/v1/database/config`; `PUT /api/v1/database/config` (requer role Admin); senha via env `DB_EXPLORER_SENHA`, nunca logada; sem escrita em dados de negócio.
**Resultado esperado:** Teste indica sucesso/falha; config real vem de env/user-secrets, não do form.

## EMPRESA (`/empresa` → redirect)
**História:** Como operador, quero abrir a área da empresa e cair no onboarding.
**Passos:** 1. Acessa `/empresa`. 2. É redirecionado para `/empresa/onboarding`.
**Backend/tabelas:** Somente frontend (redirect `pathMatch: full`); sem escrita.
**Resultado esperado:** Cai em `/empresa/onboarding`; não há tela própria de `/empresa` no código.

## ONBOARDING — HOME (`/empresa/onboarding`)
**História:** Como novo colaborador, quero ver boas-vindas e capítulos para começar o onboarding.
**Passos:** 1. Acessa `/empresa/onboarding`. 2. Clica num capítulo ou em começar (`navigateByUrl(/empresa/onboarding/capitulo/{primeiroId})`).
**Backend/tabelas:** Somente leitura local — `CAPITULOS` em `onboarding-data`; sem escrita.
**Resultado esperado:** Lista de capítulos; navegação ao capítulo funciona.

## ONBOARDING — CAPÍTULO (`/empresa/onboarding/capitulo/:id`)
**História:** Como novo colaborador, quero ler um capítulo e navegar entre anterior/próximo.
**Passos:** 1. Abre `/empresa/onboarding/capitulo/:id`. 2. Lê os blocos (`onboarding-section`). 3. Clica em anterior/próximo (`router.navigate(['/empresa/onboarding/capitulo', id])`).
**Backend/tabelas:** Somente leitura local — `CAPITULOS`/`CapituloOnboarding` em `onboarding-data`; sem escrita.
**Resultado esperado:** Conteúdo do capítulo + navegação sequencial; id inexistente mostra vazio.

## CHAT — JOTA (`/chat`)
**História:** Como operador, quero conversar com o JOTA em página cheia (sessões, TTS) sobre suporte.
**Passos:** 1. Acessa `/chat` (`JotaComponent`). 2. Envia mensagem (`workspaceId 'suporte'`, `mode 'query'`). 3. Lê resposta + documentos referenciados.
**Backend/tabelas:** `POST /api/rag-proxy/chat` (`JotaChatService`); endpoints `/sessions*` inexistentes no backend (lista de sessões falha silenciosa); sem escrita local.
**Resultado esperado:** Resposta real do proxy; sem respostas mockadas no frontend.

## JOTA — WIDGET GLOBAL (FAB em todo o `MainLayout`)
**História:** Como operador, quero chamar o JOTA de qualquer tela sem sair do contexto.
**Passos:** 1. Clica no FAB (canto inferior direito). 2. Digita e envia no painel. 3. Expande para `/chat` se precisar de sessão completa.
**Backend/tabelas:** Mesmo `POST /api/rag-proxy/chat`; `sessionId` em memória; erro mostra indisponibilidade honesta; sem escrita.
**Resultado esperado:** Painel abre/fecha, histórico da conversa na sessão, erro sem fake.

## CENTRAL EXECUTIVA (`/executivo`, `/executivo/dashboard`) — ~~DESATIVADA~~
**Status:** rota **comentada** em `features.routes.ts`; código-fonte em `features/executivo/` permanece no repo. Não acessível via URL. Home dos gestores = **Módulo Gestor** `/gestor/entrada` (ver `telas/07-gestao.md`).

## ADMINISTRAÇÃO — GESTÃO DA CENTRAL (`/admin/dashboard`)
**História:** Como administrador, quero os indicadores operacionais e acesso às telas de gestão.
**Passos:** 1. Abre `/admin/dashboard` (link "Gestão da Central", só Administrador). 2. Filtra por função e navega para kanban/tarefas/projetos/cadastros do shell `/admin`.
**Backend/tabelas:** `GET /api/v1/admin/dashboard` (`AdminDashboardService`); sem escrita.
**Resultado esperado:** KPIs + por função + alertas; refresh a cada 30s.

## ADMINISTRATIVO — KANBAN ADM (`/administrativo`) — ~~DESATIVADA~~
**Status:** rota **comentada** em `features.routes.ts`. O link "Kanban ADM" da sidebar usa `/implantacao/kanban?perfil=F` (query param no `KanbanComponent`), não a rota `/administrativo`.
