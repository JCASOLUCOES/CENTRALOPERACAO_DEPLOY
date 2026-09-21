> **Parte da documentação de Telas & APIs** — gerada automaticamente, não edite manualmente. O agente `docs-writer` sincroniza com o código. [← Voltar ao índice](../TELAS.md)

---

## 15. Empresa / Onboarding

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

## 16. Agenda

### 16.1 `AgendaComponent`

**Componente:** `src/app/features/agenda/agenda.component.ts`

### O que faz
Tela principal da Agenda com visualização em 4 modos (Dia / Semana / **Operacional 48h** / Mês). Exibe eventos em grid temporal, suporta filtros por responsável, por função e por escopo (Meus/Geral), navegação temporal (anterior/próximo/hoje) e ações de CRUD via modal (`AgendaEventoModalComponent`). A vista **Operacional** mostra janela deslizante `agora → +48h` em grade hora a hora (2 colunas), com cards expandidos (horário, título, responsável, SLA restante) e urgência visual (borda 4px + ícone ⚠️/🔥: explícita `AGD_Prioridade` + início em < 1h = crítico, < 3h = alto).

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AgendaService` | `listarEventos()`, `listarTipos()`, `listarOperadores()`, `listarFuncoes()`, `criarEvento()`, `atualizarEvento()`, `excluirEvento()`, `moverEvento()`, `obterEvento()` | CRUD completo + listas de apoio (tipos, operadores, funções) |
| `AuthService` | `getOperadorLogado()` | Identifica usuário logado |
| `BuscaService` | `fecharBusca()` | Fecha busca global antes de abrir modais |
| `NgbModal` | `open()` | Abre modal de criação/edição de evento |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/agenda/eventos?inicio=X&fim=Y&responsavelId=Z&funcaoId=N` | `AgendaService.listarEventos()` | Lista eventos no intervalo (filtros opcionais: responsável e/ou função) |
| GET | `/api/v1/agenda/eventos/{id}` | `AgendaService.obterEvento()` | Detalhe do evento |
| POST | `/api/v1/agenda/eventos` | `AgendaService.criarEvento()` | Cria evento — 409 `{ mensagem, conflitos, code }` se houver sobreposição de horários do responsável |
| PUT | `/api/v1/agenda/eventos/{id}` | `AgendaService.atualizarEvento()` | Atualiza evento — 409 `{ mensagem, conflitos, code }` se houver sobreposição (exclui o próprio id) |
| DELETE | `/api/v1/agenda/eventos/{id}` | `AgendaService.excluirEvento()` | Exclui evento |
| PATCH | `/api/v1/agenda/eventos/{id}/mover` | `AgendaService.moverEvento()` | Move evento (drag-drop) — 409 `{ mensagem, conflitos, code }` se o novo intervalo conflitar |
| GET | `/api/v1/agenda/tipos` | `AgendaService.listarTipos()` | Lista tipos de evento ativos |
| GET | `/api/v1/agenda/operadores` | `AgendaService.listarOperadores()` | Lista operadores ativos para responsável/participantes |
| GET | `/api/v1/agenda/funcoes` | `AgendaService.listarFuncoes()` | Lista funções ativas com operadores ativos (`CC_Funcao` + `TBOPERADOR`) para as opções do filtro Função (lista de opções; não é a fonte do filtro — ver abaixo) |

### Banco de Dados
- **Conecta:** ✅ Sim — tabelas `IMPL_Agenda`, `CC_TipoEvento`, `CC_AgendaParticipante`, `TBOPERADOR`, `CC_Funcao`, `IMPL_Projeto` + tabela legada `tbfuncionario` (somente leitura, via `FuncionarioLegado` — fonte do filtro por função)

### Dependências Externas
- `NgbModal` (ng-bootstrap) — modal de evento
- `NgbDatepickerModule` (ng-bootstrap) — popup de calendário no botão de intervalo do header (`ngb-datepicker` em `agenda.component.html:30`)
- `FormsModule` — `ngModel` nos selects de filtro e no `ngb-datepicker` (`[ngModel]="dataPickerModel()"`)
- `AgendaEventoModalComponent` (lazy loaded)
- CSS Grid/Flexbox para layout das visões

### Observações Técnicas
- **Rota:** `/agenda` (lazy loading em `features.routes.ts:36-37`)
- **Sidebar:** Link "Agenda" com ícone `bi-calendar-week-fill` em `sidebar.component.ts:47`
- **Visões computadas:**
  - `inicio`/`fim`: intervalo dinâmico conforme visão (dia/semana/**operacional 48h**/mês)
  - `diasSemana`/`diasMes`/`diasOperacionais`: arrays de datas para renderização do grid
  - `eventosDoDia()`, `eventosPorHora()`, `eventosDiaInteiro()`: filtros para renderização; `cobreDia()` (novo): dia-inteiro com span (Férias = linha única) cobre todos os dias entre início e fim; fim exatamente à meia-noite é exclusivo (preserva linhas do lote antigo, que terminam no próprio dia); `eventosDoDia`/`eventosDiaInteiro` incluem span, `eventosPorHora` inalterado (só não-dia-inteiro)
  - `prioridadeEfetiva()` → `'critica'|'alta'|'normal'` (campo `prioridade` + proximidade < 1h/< 3h); `slaRestanteTexto()` (a partir de `slaMinutos` + `dataFim`)
- **Navegação:** `anterior()`, `proximo()`, `hoje()`, `mudarVisao()` + datepicker popup: `mostrarDatePicker` signal (booleano), `dataPickerModel` computed (`NgbDateStruct` derivado de `dataReferencia`), `alternarDatePicker()` alterna o popup, `aoSelecionarData()` aplica a data, fecha o popup e recarrega; intervalo exibido via `intervaloDatas()` (`DD/MM/YYYY – DD/MM/YYYY`)
- **Header em 3 zonas** (`agenda.component.html:4-100`, `agenda.component.scss:21-53` — sem mudança de API):
  - Esquerda (`.agenda-header__zona--esquerda`): título "Agenda" + button-group unificado `< Hoje >` (`.ag-date-nav`, `role="group"`, `aria-label="Navegação de período"`) + intervalo clicável (`.ag-date-range__btn`, fonte mono) que abre o popup `ngb-datepicker` (`.ag-date-range__popup`, `role="dialog"`, `aria-label="Escolher data"`)
  - Centro (`.agenda-header__zona--centro`): pill toggle Meus/Geral (`.ag-scope-toggle`) + selects inline Responsável/Função (`.ag-filter`, label inline + `select.ag-filter__select` + botão limpar `bi-x-lg`)
  - Direita (`.agenda-header__zona--direita`): segmented Dia/Semana/Mês (`.ag-segmented`, `role="group"`, `aria-label="Modo de visualização"`) + botão outline `48h` (`.ag-btn--operacional`, visão `operacional`, `title="Janela operacional de 48 horas"`) + CTA primário "+ Novo evento" (`.ag-btn--primary` → `abrirModalEvento()`)
- **Acessibilidade do header:** `aria-pressed` booleano nos toggles Meus/Geral, Dia/Semana/Mês e 48h (`[attr.aria-pressed]="..."`); `role="group"` nos 3 grupos (navegação de período, escopo, modo de visualização); botão de intervalo com `aria-haspopup="dialog"` + `[attr.aria-expanded]="mostrarDatePicker()"`; `:focus-visible` com outline `#0f4c81` (`.ag-date-nav__btn`, `.ag-date-range__btn`, `.ag-scope-toggle__btn`, `.ag-segmented__btn`, `.ag-btn`, `.ag-filter__select`)
- **Legenda de categorias:** tags neutras `.agenda-legenda__item` (pill branca com borda `#e2e8f0`, fundo `#f8fafc` na barra) com status dot `.agenda-legenda__dot` colorido via variável `--dot-color` (`[style.--dot-color]="t.cor"`, fallback `#0f4c81`), `aria-label="Legenda de categorias"` em `agenda.component.html:102-108`
- **Cores:** prioridade 1) `evento.cor`, 2) `evento.tipoCor`, 3) fallback `#0f4c81`
- **Cards Semana/Mês (só frontend, sem mudança de API):** card compacto da Semana (`.agenda-evento--compacto`: `0.75rem`, `padding 0.4/0.55`, `line-height 1.45`) com ícone dot `.agenda-evento__dot` (`bi-circle-fill` com espaço à direita) + horário + título + linha `<small class="agenda-evento__resp">` com `operadorNome || operadorId` (linha secundária truncada); card mini do Mês (`.agenda-evento--mini`) com atributo `[title]` no formato "HH:mm · título · responsável" (`agenda.component.html:168-177,220-228`, `agenda.component.scss:651-678`)
- **Limpeza no destroy:** remove `.modal-backdrop` e `.modal-open` do `body` (correção overlay residual)
- **Filtro por responsável:** `operadorFiltro` signal + `filtrarPorResponsavel()` / `limparFiltroResponsavel()`
- **Filtro por função:** `funcaoFiltro` signal (`number | null`, inicial `null`) + `funcoes` signal (`FuncaoResumo[]`, carregado via `carregarFuncoes()` → `listarFuncoes()` no `ngOnInit`); `filtrarPorFuncao()` / `limparFiltroFuncao()`; selects "Responsável"/"Função" inline no centro do header (`agenda.component.html:48-71`); enviado como `funcaoId` em `AgendaFiltro`/`listarEventos()` (frontend inalterado); backend filtra via tabela legada `tbfuncionario` por `OPERADOR_ID` exato (`_db.FuncionariosLegado.Any(f => f.OperadorId == a.OperadorId && f.FuncaoId == funcaoId && f.Ativo == "S")` — `AgendaService.cs:47-53`); `TBOPERADOR.FUNCAO_ID` **não** é usado no filtro (coluna criada pela migration `AddFuncao` sem backfill, permanece nula — a função real está em `tbfuncionario.FUNCAO_ID`: 1=Analista de Sistemas, 2=Suporte, 3=Programador)
- **Escopo Meus/Geral:** `escopo` signal (`'meus'|'todos'`, inicial `'meus'`); pill toggle Meus|Geral no centro do header em `agenda.component.html:38-47` (`role="group"`, `aria-pressed` booleano); `responsavelEfetivo()` resolve `operadorFiltro` primeiro, senão o operador logado (`AuthService.getOperadorLogado()`) quando `escopo==='meus'`; `alternarEscopo('todos')` ("Geral") **limpa `operadorFiltro=''` e `funcaoFiltro=null`** para não manter filtro fantasma (antes o dropdown vencia o escopo no request — `agenda.component.ts:175-184`); `alternarEscopo('meus')` só troca o escopo e recarrega via `carregar()`
- **Filtros ativos ("Filtrando:"):** barra `.ag-filtros-ativos` (`role="status"`, `aria-label="Filtros ativos"`, `agenda.component.html:111-123`) visível só quando `operadorFiltro || funcaoFiltro != null`; rótulo "Filtrando:" + chips clicáveis com o nome resolvido via `nomeOperadorFiltro()` / `nomeFuncaoFiltro()` (`agenda.component.ts:186-195`) que limpam via `limparFiltroResponsavel()` / `limparFiltroFuncao()` + `carregar()`
- **Mapeamento de nomes de função (exibição):** método `formatarFuncao(funcao)` em `agenda.component.ts:396-408` prioriza o campo `classificacao` do backend (`FuncaoResumo.classificacao`) para exibição amigável no dropdown do filtro Função (usado em `agenda.component.html:65` via `{{ formatarFuncao(f) }}`). Regras:
  - `classificacao === 'Implantador'` → **"Implantação"**
  - `classificacao === 'Desenvolvimento'` → **"DESENVOLVIMENTO"**
  - Outro `classificacao` não-nulo → retorna o valor original
  - Fallback (sem `classificacao`): mapeia `descricao` legada (minúsculas):
    - `"analista de sistemas"` ou `"analista de sistema"` → **"Implantação"**
    - `"programador"` → **"DESENVOLVIMENTO"**
    - Caso contrário → retorna `descricao` original ou string vazia
  - `FuncaoResumo` expõe `{ id, descricao, classificacao }` (confirmado em `agenda.service.ts:18-22`).
- **Estado vazio (sem overlay):** barra inline `.agenda-empty-inline` (`role="status"`) entre a legenda e a grade quando `!carregando() && eventos().length === 0` — texto "Nenhum evento no período. Clique em Novo evento ou em uma célula do calendário."; grade `.agenda-calendario` sempre renderizada mesmo quando a API retorna `[]`; não bloqueia cliques nas células
- **Carregamento:** único overlay absoluto é `.agenda-loading` (`*ngIf="carregando()"`, `agenda.component.html:239`, `agenda.component.scss:739-749`)
- **Autorização de eventos (Owner + Admin):** sinal `isAdmin` (computed → `auth.getCurrentUser()?.perfil === 'Administrador'`); método `podeEditar(e: AgendaResumo)` retorna `true` se `e.operadorId === usuarioLogado || isAdmin()`; `abrirEdicao(evento)` passa `isAdmin` e `somenteLeitura = !podeEditar(evento)` para o modal; cards de evento (Dia/Semana/Operacional/Mês) recebem `[class.agenda-evento--somente-leitura]="!podeEditar(e)"` e `(click)="podeEditar(e) && abrirEdicao(e)"` com tooltip "Apenas o responsável ou um administrador pode editar este evento" quando somente leitura
- **Estilo somente-leitura:** `.agenda-evento--somente-leitura` em `agenda.component.scss` — `cursor: not-allowed`, `opacity: 0.75`, `filter: grayscale(0.4)`, sem hover transform

---

### 16.2 `AgendaEventoModalComponent`

**Componente:** `src/app/features/agenda/agenda-evento-modal.component.ts`

### O que faz
Modal de criação e edição de eventos da Agenda. Carrega detalhes completos ao editar (descrição, local, participantes via `obterEvento()`), valida formulário no cliente e submete via `AgendaService` (`criarEvento()` único, `criarEventosLote()` com repetição, `atualizarEvento()` na edição). Exibe conflitos de horário retornados pelo backend (HTTP 409) em alerta `alert-warning` com a lista de eventos em choque e erros de regra por tipo (HTTP 400 `{ mensagem }` PT-BR) no `alert-danger` via `erroMsg`. Inclui **Prioridade** (radio Normal/Alta/Crítica → `AGD_Prioridade`) e **SLA em minutos** (opcional → `AGD_SLAMinutos`). Aplica **regras rígidas por tipo** (espelho do backend) + **recorrência Diária/Semanal/Mensal** no lote.

### Services Injetados
| Service | Métodos Usados | Finalidade |
|---------|----------------|------------|
| `AgendaService` | `obterEvento()`, `criarEvento()`, `criarEventosLote()`, `atualizarEvento()`, `excluirEvento()` | CRUD evento + lote com recorrência |
| `NgbActiveModal` | `close()`, `dismiss()` | Controle do modal |

### API Endpoints Consumidos
| Método | Rota (v1) | Service | Descrição |
|--------|-----------|---------|-----------|
| GET | `/api/v1/agenda/eventos/{id}` | `AgendaService.obterEvento()` | Carrega detalhes na edição |
| POST | `/api/v1/agenda/eventos` | `AgendaService.criarEvento()` | Cria novo evento — 409 exibe `alert-warning` com `conflitos[]`; 400 exibe `erroMsg` (regra por tipo) |
| POST | `/api/v1/agenda/eventos/lote` | `AgendaService.criarEventosLote()` | Cria N ocorrências (Repetir até + Padrão) — 409/400 com mesmo tratamento |
| PUT | `/api/v1/agenda/eventos/{id}` | `AgendaService.atualizarEvento()` | Atualiza evento existente — 409 exibe `alert-warning` com `conflitos[]`; 400 exibe `erroMsg` |
| DELETE | `/api/v1/agenda/eventos/{id}` | `AgendaService.excluirEvento()` | Exclui evento |

### Banco de Dados
- **Conecta:** ✅ Sim (via backend)

### Dependências Externas
- `NgbActiveModal` (ng-bootstrap)
- `FormsModule` (template-driven forms)
- Inputs: `inicio` (Date), `eventoEdicao` (AgendaResumo), `usuarioLogado`, `tipos` (TipoEventoResponse[]), `operadores` (OperadorResumo[])

### Observações Técnicas
- **Lazy loaded** via `import('./agenda-evento-modal.component')` no `AgendaComponent`
- **Validação cliente:** título, data início, tipo e responsável obrigatórios; fim (data e/ou hora informados) é completado via `combinar(dataFim || dataInicio, horaFim || horaInicio)` e deve ser posterior ao início (`'Data/hora final deve ser posterior à inicial.'`)
- **Formato datas:** `YYYY-MM-DD` para `<input type="date">`, `HH:mm` para `<input type="time">`
- **Combinação data+hora:** `combinar(data, hora)` → `Date` UTC para envio ISO 8601
- **Layout data/hora (2 linhas):** `agenda-evento-modal.component.html:36-56` — duas `.row.agenda-datetime-row`: linha Início (Data `col-md-7` + Hora `col-md-5`) e linha Fim (Data `col-md-7` + Hora `col-md-5`); `horaInicio` e `horaFim` desabilitam apenas com `diaInteiro` (`[disabled]="diaInteiro"`); `dataFim` dispara `(ngModelChange)="aoAlterarDataFim()"` e `horaFim` dispara `(ngModelChange)="aoAlterarHoraFim()"`
- **Comportamento Hora fim (usabilidade):** `horaFim` não exige mais `dataFim` preenchida; `aoAlterarHoraFim()` auto-preenche `dataFim = dataInicio` quando só a hora é informada; `aoAlterarDataFim()` sugere `horaFim = sugerirHoraFim()` (hora início + 1h, com volta à meia-noite) quando só a data é informada; `combinarFim()` completa a parte faltante (`dataFim || dataInicio`, `horaFim || horaInicio`) em vez de descartar o fim, e é usado por `validarFormulario()` e `salvar()`; ambos os handlers limpam o signal `conflitos`
- **Anti-esmagamento:** `agenda-evento-modal.component.scss` — `.agenda-datetime-row .form-label { white-space: nowrap }` e `input[type="date"/"time"] { min-width: 0; width: 100% }`, com `input[type="time"] { min-width: 140px }` para garantir área clicável/legível do seletor de hora nativo
- **Exclusão:** confirmação via `confirm()` nativo antes de chamar API
- **Conflito de horários (Fase 1):** signal `conflitos` (`AgendaResumo[]`, inicial `[]`); `salvar()` limpa a lista antes de submeter; `extrairConflitos(err)` retorna a lista somente se `HttpErrorResponse.status === 409` **e** `body.code === 'CONFLICT_HORARIOS'` (senão `null`); `tratarErroSalvar(err, mensagemPadrao)` preenche `conflitos` + `erroMsg` com `body.mensagem` do backend, ou a mensagem padrão quando não for 409; template `agenda-evento-modal.component.html:11-18` renderiza `alert alert-warning` (`role="alert"`) com `*ngFor` sobre `conflitos()` (`título — dd/MM HH:mm até dd/MM HH:mm` ou `—` quando `dataFim` nula)
- **Autorização (Owner + Admin):** `@Input() isAdmin: boolean` e `@Input() somenteLeitura: boolean` vindos do `AgendaComponent`; `salvar()` e `excluir()` fazem early return se `somenteLeitura === true`; `tratarErroSalvar()` trata HTTP 403 → `"Sem permissão para alterar este evento"` e HTTP 400 → `body.mensagem ?? mensagemPadrao` (regra por tipo do servidor exibida no `alert-danger`); template exibe banner informativo quando `somenteLeitura`: `"Somente leitura: apenas o responsável [nome] ou um administrador pode editar este evento"`; todos os inputs do formulário ficam `[disabled]="somenteLeitura"`; botões "Salvar" e "Excluir" ocultos quando `somenteLeitura` (`*ngIf="!somenteLeitura"`)
- **Regras rígidas por tipo (espelho do backend, `agenda-evento-modal.component.ts:140-183`):** normalização case/acentos-insensível (`normalizarTipo()`); `regraFerias()` (FÉRIAS), `regraComHorario()` (TREINAMENTO/DAILY/REUNIÃO/ATENDIMENTO), `regraDiaUnico()` (REUNIÃO/ATENDIMENTO), `regraPermitePadrao()` (TREINAMENTO/DAILY); `aoAlterarTipo()` no radio de tipo ajusta o form (Férias força `diaInteiro = true` **e limpa `dataRepeticaoFim`**; com-horário força `false`; dia-único limpa `dataRepeticaoFim`; sem-padrão reseta `padraoRecorrencia = 1`); **Férias = formulário mínimo: Título* + Data início* + Data fim* (retorno, full-width `col-md-12`) + Responsável* — sem horas (`*ngIf="!regraFerias()"` em Hora início/fim), sem repetição (`*ngIf="... && !regraDiaUnico() && !regraFerias()"`), linha "Dia inteiro" **oculta** (`*ngIf="!regraFerias()"` em `agenda-evento-modal.component.html:66` — dia inteiro implícito, forçado `true` no payload);** Férias exibe Data fim obrigatória com hint "Data de retorno (obrigatório). Dia inteiro, sem horário e sem repetição."; dia-único oculta Data-fim e o bloco Repetir (`*ngIf="!regraDiaUnico()"`); select de Padrão (Diária 1/Semanal 2/Mensal 3) só quando `regraPermitePadrao() && dataRepeticaoFim`
- **Validação cliente por tipo (`validarFormulario()`, `:228-258`):** Férias exige `dataFim > dataInicio` → `"<Tipo>: defina a data de retorno (após o início)."`; Férias é **isenta** da regra "vários dias → Repetir até" (esta vale só p/ Treinamento/Daily fora de edição: `dataFim > dataInicio && !dataRepeticaoFim` → `"Para vários dias, use o campo Repetir até."`); com-horário + `diaInteiro` → `"<Tipo> exige horário específico e não pode ser dia inteiro."`; com-horário sem `dataFim`/`horaFim` → `"<Tipo>: informe hora de início e fim."`; dia-único com `dataFim`/`dataRepeticaoFim` além do dia inicial → `"<Tipo> permite apenas um dia."`; Férias é **PERÍODO simples (linha única com span, sem repetição)** — multi-dia via lote (N linhas) vale só p/ Treinamento/Daily
- **Envio com regra aplicada (`salvar()`, `:304/325/347`):** `diaInteiro: regraFerias() ? true : diaInteiro`; Férias nunca vai em lote (Repetir oculto + `aoAlterarTipo()` limpa `dataRepeticaoFim`); lote envia `padraoRecorrencia: regraFerias() ? 1 : padraoRecorrencia` + `dataRepeticaoFim` como `combinar(dataRepeticaoFim, "23:59").toISOString()`
- **Fechamento:** emite `closed` Subject + `activeModal.close()` → `AgendaComponent` recarrega lista

---

### 16.3 `AgendaService` (Frontend)

**Service:** `src/app/features/agenda/services/agenda.service.ts`

### O que faz
Camada de comunicação HTTP com a API `/api/v1/agenda`. Tipagem forte para todos os DTOs (Request/Response). Base URL via `environment.apiBaseUrl`.

### API Endpoints Mapeados
| Método Service | HTTP | Rota | Request | Response |
|----------------|------|------|---------|----------|
| `listarEventos(inicio, fim, responsavelId?, funcaoId?)` | GET | `/eventos` | Query params (`inicio`, `fim`, `responsavelId?`, `funcaoId?`) | `AgendaResumo[]` |
| `obterEvento(id)` | GET | `/eventos/{id}` | — | `AgendaDetalhe` |
| `criarEvento(req)` | POST | `/eventos` | `AgendaCriarRequest` | `AgendaDetalhe` |
| `criarEventosLote(req)` | POST | `/eventos/lote` | `AgendaCriarLoteRequest` (`+ dataRepeticaoFim*`, `padraoRecorrencia?`: 1=Diária, 2=Semanal, 3=Mensal) | `AgendaLoteResponse` (`{ totalCriados, eventos: AgendaDetalhe[] }`) |
| `atualizarEvento(id, req)` | PUT | `/eventos/{id}` | `AgendaAtualizarRequest` | `AgendaDetalhe` |
| `excluirEvento(id)` | DELETE | `/eventos/{id}` | — | `void` |
| `moverEvento(id, req)` | PATCH | `/eventos/{id}/mover` | `AgendaMoverRequest` | `AgendaDetalhe` |
| `listarTipos()` | GET | `/tipos` | — | `TipoEventoResponse[]` |
| `listarOperadores()` | GET | `/operadores` | — | `OperadorResumo[]` |
| `listarFuncoes()` | GET | `/funcoes` | — | `FuncaoResumo[]` |

### Models Exportados
- `TipoEventoResponse`, `OperadorResumo`, `FuncaoResumo`, `AgendaParticipanteResponse`
- `AgendaResumo`, `AgendaDetalhe`
- `AgendaCriarRequest`, `AgendaAtualizarRequest`, `AgendaMoverRequest`, `AgendaCriarLoteRequest`, `AgendaLoteResponse`, `AgendaFiltro`
- `ErroConflito` (`{ mensagem, conflitos: AgendaResumo[], code }` — corpo do HTTP 409 de sobreposição; HTTP 400 de regra por tipo retorna `{ mensagem }` PT-BR)

### Observações Técnicas
- `providedIn: 'root'` (singleton)
- `HttpParams` para query strings (inicio, fim, responsavelId?, funcaoId? — `funcaoId` só enviado quando não-nulo)
- `HttpClient` com `withCredentials: true` via interceptor global

---

### 16.4 Models Frontend (`agenda.service.ts`)

**Arquivo:** `src/app/features/agenda/services/agenda.service.ts`

> `models/agenda.model.ts` removido em 2026-09-14 (limpeza: duplicata total, 0 imports). Todos os tipos vivem no service.

### Tipos Exportados
| Tipo | Descrição |
|------|-----------|
| `AgendaTipo` | `'Reuniao' | 'Treinamento' | 'Atendimento' | 'Pessoal' | 'Outro'` (enum string) |
| `AgendaVisibilidade` | `'Publico' | 'Privado'` (valor `Equipe` removido em 2026-09-12; backend `AgendaVisibilidade` = `Publico`/`Privado`) |
| `AgendaRecorrencia` | `'Nenhuma' | 'Diario' | 'Semanal' | 'Mensal'` |
| `TipoEventoResponse` | `{ id, nome, cor }` |
| `OperadorResumo` | `{ id, nome, email }` |
| `FuncaoResumo` | `{ id, descricao, classificacao }` (lista do `GET /funcoes` — só funções ativas com operadores ativos) |
| `AgendaParticipanteResponse` | `{ participanteId, participanteNome }` |
| `AgendaResumo` | Lista (id, operadorId, operadorNome, titulo, dataInicio, dataFim, diaInteiro, cor, tipo, tipoId, tipoNome, tipoCor, projetoId, projetoCodigo) |
| `AgendaDetalhe` | Resumo + descricao, local, participantes[], usuarioInclusao, dataInclusao, usuarioAlteracao, dataAlteracao |
| `AgendaCriarRequest` | título, descricao?, local?, dataInicio, dataFim?, diaInteiro, tipoId?, responsavelId, projetoId?, participantesIds? (opcional — pode ser omitido/`undefined`, em sincronia com o backend `List<string>?`) |
| `AgendaAtualizarRequest` | CriarRequest + usuarioAlteracao (participantesIds? permanece opcional) |
| `AgendaMoverRequest` | `novaDataInicio`, `novaDataFim` |
| `AgendaCriarLoteRequest` | CriarRequest + `dataRepeticaoFim*` + `padraoRecorrencia?` (1=Diária, 2=Semanal, 3=Mensal; default 1) |
| `AgendaLoteResponse` | `{ totalCriados, eventos: AgendaDetalhe[] }` |
| `AgendaFiltro` | `inicio`, `fim`, `responsavelId?`, `funcaoId?` |
