# LÓGICA DE RESOLUÇÕES - Central de Operação JCA
**Data:** 2026-09-18  
**Foco:** Prompts + Fluxos lógicos para resolver os 8 problemas identificados

---

## PROBLEMA #1: JOTA Desconexo do Contexto de Tarefa

**Situação Atual:**
- Operador abre tarefa no Kanban
- Precisa clicar no FAB JOTA (canto inferior direito)
- JOTA não sabe de qual tarefa está falando
- Pergunta genérica → resposta genérica

**Lógica de Resolução:**

### Passo 1: Capturar Contexto
```
Quando operador clica em uma tarefa no kanban:
1. Sistema registra: ID da tarefa + Título + Setor + Descrição
2. Sistema armazena em memória: chatContexto = {tipo: 'tarefa', id, titulo, setor}
3. Operador vê indicator no chat: "💬 Chat sobre: [Título da Tarefa]"
```

### Passo 2: Mapear Setor → Workspace
```
Mapear Setores para Workspaces AnythingLLM:

Setor "Suporte" → Workspace "workspace-suporte-abc123"
Setor "Implantação" → Workspace "workspace-implantacao-def456"
Setor "Financeiro" → Workspace "workspace-financeiro-ghi789"
Setor "Comercial" → Workspace "workspace-comercial-jkl012"

Lógica:
IF tarefa.setor = "Suporte" THEN
  USE workspace-suporte-abc123
ELSE
  USE workspace-setor-default
END
```

### Passo 3: Construir Prompt Contextualizado
```
Estrutura do Prompt Enviado ao JOTA:

Contexto Base (Sistema):
==================================================
Você está ajudando um operador do setor [SETOR].
Ele está resolvendo esta tarefa:

Tarefa: [TITULO]
Descrição: [DESCRICAO]
Responsável: [RESPONSAVEL]
Prioridade: [PRIORIDADE]
Status: [STATUS]
Docs Relacionados: [TAGS/CATEGORIAS]

Mantenha respostas curtas (max 3 linhas) se em contexto de tarefa.
Cite sempre a documentação consultada.
==================================================

Pergunta do Usuário: [PERGUNTA DO OPERADOR]
```

### Passo 4: Armazenar Histórico da Sessão
```
Quando operador envia mensagem:
1. Armazenar em sessionStorage:
   chatSessionTarefa[tarefaId] = {
     tarefaId: 123,
     mensagens: [
       {role: 'user', content: 'Como resetar senha?', timestamp: ...},
       {role: 'assistant', content: '...', timestamp: ...}
     ],
     dataAbertura: new Date(),
     documentosConsultados: []
   }

2. Se operador volta à mesma tarefa depois:
   - Histórico é restaurado
   - Não perde conversa
   - Pode continuar de onde parou
```

### Passo 5: Ações Rápidas no Chat
```
Após resposta do JOTA, mostrar botões:
- "👍 Útil" (feedback)
- "❌ Não resolveu" (escalar)
- "📌 Salvar como procedimento" (reutilizar)
- "🔗 Abrir documento" (acessar fonte)
```

**Prompt Completo para Implementação:**

```
ROLE: Você é um assistente de implementação técnica.

TAREFA: Implementar integração de JOTA contextual para tarefas.

COMPONENTES A CRIAR:

1. Serviço: ChatContextoService
   - Armazena contexto atual (tipo, id, titulo, setor, descricao)
   - Mapeia setor para workspace AnythingLLM
   - Constrói prompt com contexto
   - Gerencia histórico de sessão por tarefa

2. Componente: ChatContextoPanel
   - Exibe no modal da tarefa (lado direito)
   - Mostra indicator "💬 Chat sobre: [Tarefa]"
   - Formulário: entrada de texto + enviar
   - Histórico de mensagens (scroll)
   - Botões: Útil / Não Resolveu / Salvar / Abrir Doc

3. Integração no Modal de Tarefa:
   - Modal abre: ChatContextoService.setContexto({...})
   - Panel carrega histórico da tarefa (se existir)
   - Ao fechar: salvar histórico em sessionStorage

FLUXO:
1. Operador clica em tarefa → Modal abre
2. Sistema: ChatContextoService.setContexto({
     tipo: 'tarefa',
     id: tarefa.id,
     titulo: tarefa.titulo,
     setor: usuarioSetor,
     descricao: tarefa.descricao
   })
3. Panel renderiza com título "💬 Chat: Como resetar senha"
4. Operador digita pergunta
5. Sistema constrói prompt:
   "Contexto: Tarefa [titulo] no setor [setor].\n[descricao]\n\nPergunta: [pergunta]"
6. Envia para /api/rag-proxy/chat com workspace mapeado
7. JOTA responde
8. Panel salva em sessionStorage para próxima vez

SUCESSO QUANDO:
- Operador abre tarefa A e faz 3 perguntas
- Fecha a tarefa
- Abre tarefa B (contexto muda)
- Volta à tarefa A (histórico aparece)
- Todas as perguntas estão cientes do contexto (não genéricas)
```

---

## PROBLEMA #2: Admin Dashboard Separado do Kanban

**Situação Atual:**
- Gestor acessa `/admin/dashboard` (tela 1)
- Vê métricas abstratas (KPIs)
- Quer ver kanban em detalhes
- Clica em "Kanban" → vai para `/admin/kanban` (tela 2)
- Perde contexto dos KPIs

**Lógica de Resolução:**

### Passo 1: Dashboard Unificado
```
Estrutura Única:

/admin/dashboard (tela única)
├── Header com filtros
├── Tabs (abas que NÃO navegam)
│   ├── Aba 1: Visão Geral (KPIs)
│   ├── Aba 2: Kanban por Setor (inline)
│   ├── Aba 3: Alertas Críticos
│   └── Aba 4: Métricas Detalhadas
└── [Tudo permanece na mesma URL]

Quando clica na aba "Kanban":
- NÃO navega para outra rota
- Mostra kanban na mesma tela
- Pode ver KPIs da "Visão Geral" simultaneamente (painel lateral)
```

### Passo 2: KPIs com Drill-down
```
Lógica de Correlação:

Card KPI: "12 Tarefas em Progresso"
  ↓ (ao clicar)
Filtra Kanban: mostra só tarefas com status = "Em Progresso"

Card KPI: "3 Tarefas Críticas Vencendo"
  ↓ (ao clicar)
Filtra Kanban: status = qualquer, prioridade = Crítica, dias ≤ 1

Card KPI: "Taxa: 68%"
  ↓ (ao clicar)
Mostra gráfico: "Conclusões por Dia" (últimos 7 dias)
```

### Passo 3: Refresh em Tempo Real
```
Lógica:
1. Dashboard carrega dados: GET /api/admin/dashboard
2. Kanban carrega dados: GET /api/implantacao/kanban
3. Ambas as chamadas em paralelo (forkJoin)
4. A cada 30 segundos: recarregar ambos
5. Se dados mudarem: atualizar visualmente (sem pisca)

Benefício: Gestor vê movimento em tempo real
```

### Passo 4: Alertas em Destaque
```
Lógica:

Alertas Críticos aparecem:
- No topo do dashboard (banner vermelho)
- Se houver ≥1 alerta: som/notificação
- Clicável: expande detalhes + ações

Tipos de Alerta:
1. Tarefa Vencida: "3 tarefas passaram do prazo"
   → Ação: Reatribuir / Estender prazo / Escalacionar

2. Operador Sobrecarregado: "João tem 15 tarefas em progresso"
   → Ação: Reasignar algumas / Adicionar recurso

3. SLA em Risco: "2 tarefas críticas com SLA < 2 horas"
   → Ação: Prioridade máxima / Escalar

4. Bloqueio Detectado: "5 tarefas aguardando aprovação"
   → Ação: Aprovar / Retornar com feedback
```

**Prompt Completo para Implementação:**

```
ROLE: Você é arquiteto de dashboard.

TAREFA: Transformar admin dashboard em painel unificado.

LÓGICA:

1. Rota Única:
   /admin/dashboard (permanece a mesma URL)
   - NÃO navegar para subrotas
   - Abas são componentes internos

2. Componentes Principais:
   - AdminDashboard (container)
     └── Tabs (abas internas):
         ├── VisoesGeralComponent (KPIs + gráficos)
         ├── KanbanSetorComponent (kanban filtrado)
         ├── AlertasCriticosComponent (lista de alertas)
         └── MetricasDetalhadasComponent (SLA, produtividade)

3. Interação KPI → Kanban:
   Quando clica em KPI:
   a) Identifique o critério (status, prioridade, dias vencimento)
   b) Navegue para aba "Kanban"
   c) Aplique filtro: kanbanService.setFiltro({status, prioridade, diasVencimento})
   d) Kanban re-renderiza com tarefas filtradas
   e) Breadcrumb mostra: "Dashboard > Kanban > Tarefas Críticas Vencendo"

4. Refresh Automático:
   setInterval(() => {
     forkJoin([
       adminService.getDados(),
       kanbanService.getKanban(),
       alertasService.getAlertas()
     ]).subscribe(([dados, kanban, alertas]) => {
       // Atualizar sem piscar
     });
   }, 30000);  // a cada 30s

5. Alertas com Ações:
   alertaCritico = {
     id: 'alert-1',
     tipo: 'tarefaVencida',
     titulo: '3 tarefas vencidas',
     severidade: 'crítica',
     acoes: [
       {label: 'Reatribuir', onClick: () => ...},
       {label: 'Estender prazo', onClick: () => ...},
       {label: 'Ver detalhes', onClick: () => navegar('kanban', {filtro: vencidas})}
     ]
   }

SUCESSO QUANDO:
- Gestor abre /admin/dashboard
- Vê KPIs no topo
- Clica em "12 em Progresso"
- Aba Kanban abre (mesma tela)
- Kanban mostra só as 12 tarefas
- Pode voltar à Visão Geral (clicando na aba)
- Não houve navegação de rota
- Dados atualizaram a cada 30s
- Alertas piscam apenas se novos críticos
```

---

## PROBLEMA #3: Kanban sem Drag-and-Drop Visual

**Situação Atual:**
- Kanban mostra colunas (Novo, Validação, Em Progresso, Review, Concluído)
- Operador clica no card
- Abre modal
- Clica em dropdown "Status" e seleciona novo
- Fecha modal

**Lógica de Resolução:**

### Passo 1: Drag-and-Drop Nativo
```
Lógica Visual:

┌─────────────────────────────────────────────────┐
│   📝 Novo       ✓ Validação    ⚙️ Em Progresso │
├─────────────────────────────────────────────────┤
│
│ ┌──────────┐  ┌──────────┐  ┌──────────┐
│ │ Tarefa A │  │ Tarefa B │  │ Tarefa C │
│ │ Alta     │  │ Crítica  │  │ Média    │
│ │ João ●   │  │ Maria ●  │  │ Pedro ●  │
│ └──────────┘  └──────────┘  └──────────┘
│      ↑              ↑              ↑
│      └──────────────────────────────┘
│      Pode arrastar para outras colunas

Quando operador arrasta Tarefa A para "Validação":
1. Visual: card se move imediatamente
2. Simultâneo: POST /api/tarefas/123/status {novoStatusId: 2}
3. Se sucesso: card fica na nova coluna
4. Se erro: card volta (rollback visual)
5. Histórico atualizado: "João moveu para Validação às 14:32"
```

### Passo 2: Cores por Prioridade
```
Lógica:

Tarefa.prioridade = "Crítica" → border-left: 4px solid #d03b3b (vermelho escuro)
Tarefa.prioridade = "Alta" → border-left: 4px solid #ec835a (laranja)
Tarefa.prioridade = "Média" → border-left: 4px solid #fab219 (amarelo)
Tarefa.prioridade = "Baixa" → border-left: 4px solid #0ca30c (verde)

Visual:
┌───────────────────┐
│█ Resetar senha    │ ← vermelho = Crítica
│   João Silva      │
│   ⏰ Vence em 2h  │
└───────────────────┘
```

### Passo 3: SLA Indicator
```
Lógica:

IF dataVencimento = NULL THEN
  mostra: "Sem prazo"
ELSE IF hoje > dataVencimento THEN
  mostra: "❌ VENCIDA" (vermelho)
  ativa: alerta + avisa gestor
ELSE IF diasAteVencimento <= 1 THEN
  mostra: "⚠️ VENCENDO" (vermelho)
  exemplo: "Vence em 2h"
ELSE IF diasAteVencimento <= 3 THEN
  mostra: "🟡 ATENÇÃO" (amarelo)
  exemplo: "Vence em 2 dias"
ELSE
  mostra: "✅ NO PRAZO" (verde)
  exemplo: "Vence em 7 dias"
END

Card com SLA:
┌────────────────────┐
│ Tarefa X           │
│ Responsável: João  │
│                    │
│ ⏳ Progresso: 65%  │
│ ▓▓▓▓▓░░░░░░░░░░░ │
│                    │
│ ⚠️ Vence em 2 dias │
└────────────────────┘
```

### Passo 4: Filtros Visuais
```
Lógica:

Dropdown: Filtro por Responsável
  ├─ Todos (default)
  ├─ João Silva (5 tarefas)
  ├─ Maria Santos (8 tarefas)
  └─ Pedro Costa (3 tarefas)

Dropdown: Filtro por Prioridade
  ├─ Todas (default)
  ├─ Crítica (3)
  ├─ Alta (7)
  ├─ Média (12)
  └─ Baixa (25)

Ao selecionar:
- Kanban filtra visualmente
- Colunas mostram só tarefas que match
- Badge no header: "Exibindo 7 de 47"

Lógica de Filtro:
tarefas_filtradas = tarefas
  .filter(t => !filtroResponsavel || t.responsavel === filtroResponsavel)
  .filter(t => !filtroPrioridade || t.prioridade === filtroPrioridade)
```

**Prompt Completo para Implementação:**

```
ROLE: Você é desenvolvedor Angular especialista em UX.

TAREFA: Implementar Kanban com drag-and-drop, cores, SLA e filtros.

LÓGICA:

1. Componente KanbanSetorComponent:
   Inputs:
   - viewMode: 'operador' | 'gestor'
   - setorId: number
   
   Estado Local:
   - colunas: StatusColuna[] = [
       {id: 1, nome: 'Novo', tarefas: [...]},
       {id: 2, nome: 'Validação', tarefas: [...]},
       ...
     ]
   - filtroResponsavel: string = ''
   - filtroPrioridade: string = ''
   
   Dados Carregados de: GET /api/implantacao/kanban?setorId=1

2. Drag-and-Drop:
   Usar: CDK (drag-drop)
   
   Quando operador arrasta card A de Novo para Validação:
   a) Evento: onCardDrop(event)
   b) event.previousContainer.id = 'col-novo'
   c) event.container.id = 'col-validacao'
   d) Novo Status ID = 2
   e) Chamar: kanbanService.moverTarefa(tarefaId: 123, statusId: 2)
   f) POST /api/tarefas/123/status {novoStatusId: 2}
   g) Se sucesso: card fica lá + histórico registrado
   h) Se erro: rollback visual + toast "Erro ao mover"

3. Cores por Prioridade:
   prioridadeCores = {
     'Crítica': '#d03b3b',
     'Alta': '#ec835a',
     'Média': '#fab219',
     'Baixa': '#0ca30c'
   }
   
   Card style: border-left = prioridadeCores[tarefa.prioridade]

4. SLA Indicator:
   getSLAStatus(tarefa.dataVencimento): string {
     if (!dataVencimento) return 'Sem prazo'
     
     const diasAte = (dataVencimento - hoje) / (1000*60*60*24)
     
     if (diasAte < 0) return '❌ VENCIDA'
     if (diasAte <= 1) return '⚠️ VENCENDO'
     if (diasAte <= 3) return '🟡 ATENÇÃO'
     return '✅ NO PRAZO'
   }
   
   Exibir no card: badge com cor/emoji + dias

5. Filtros:
   Dropdowns acima do kanban:
   - Responsável (multiselect ou único)
   - Prioridade (multiselect)
   
   ao mudar:
   aplicarFiltros() {
     colunas.forEach(col => {
       col.tarefas = col.tarefas.filter(t => {
         matchResp = !filtro || t.responsavel === filtro
         matchPrio = !filtro || t.prioridade === filtro
         return matchResp && matchPrio
       })
     })
   }

FLUXO:
1. Operador abre "ATENDIMENTO > Board do Setor"
2. Vê 5 colunas com cards coloridos
3. Arrasta "Resetar Senha" (vermelho) de Novo para Em Progresso
4. Card se move imediatamente
5. Histórico no card: "Movido por João às 14:32"
6. Seleciona filtro "João Silva"
7. Kanban mostra só tarefas de João
8. Card mostra progresso 65% + SLA "Vence em 2 dias"

SUCESSO QUANDO:
- Drag-and-drop é smooth (sem lag)
- Cores indicam prioridade de imediato (operador sabe o que é crítico)
- SLA é visível (operador prioriza vencendo)
- Filtros são instantâneos (sem reload de página)
- Histórico aparece em tempo real
```

---

## PROBLEMA #4: RAG Chat Não Integrado no Fluxo

**Situação Atual:**
- Operador está resolvendo ticket no Atendimento
- Precisa consultar docs (como resetar senha)
- Clica FAB JOTA (canto inferior direito)
- JOTA abre desconexo da tarefa

**Lógica de Resolução:**

### Passo 1: 3 Formas de Acessar JOTA
```
1. FAB Global (existe, melhorar):
   - Canto inferior direito
   - Clica → painel abre
   - NOVO: mostra "Contexto: Nenhum" se não em tarefa
   - NOVO: se em tarefa, mostra "Contexto: Tarefa X do Setor Suporte"

2. Painel Lateral em Tarefa (novo):
   - Modal de tarefa abre
   - Lado direito: chat panel contextualizado
   - Operador não sai da tarefa para fazer pergunta

3. Aba "Conhecimento do Setor" (novo):
   - Menu: ATENDIMENTO > Conhecimento do Setor
   - RAG search integrado
   - 4 abas: Base + Fraseologias + Procedimentos + FAQ
   - Pré-filtrado para o setor
```

### Passo 2: Conhecimento Setorizado
```
Lógica:

Quando operador acessa "Conhecimento do Setor":
1. Sistema identifica: setor = "Suporte"
2. Ativa workspace: "workspace-suporte-abc123"
3. Mostra 4 abas:

ABA 1: BASE DE CONHECIMENTO
- Search bar
- Digitando "resetar" → busca em RAG
- Retorna: artigos, procedures, FAQs com tag "resetar"
- Cada resultado: clickável → abre em modal

ABA 2: FRASEOLOGIAS
- Frases prontas para cada situação
- "Cliente diz: 'Esqueci a senha'"
  → Fraseologia: "Você pode recuperar pelo email cadastrado..."
- Operador copia + cola no chat/ticket

ABA 3: PROCEDIMENTOS RÁPIDOS
- Passo a passo para tarefas comuns
- "Como resetar senha em 5 passos"
- "Como liberar acesso em 3 passos"
- Clicável: guia em modal

ABA 4: FAQ DINÂMICO
- "Perguntas mais frequentes desta semana"
- Atualizado por setor
- "Top 10 perguntas do setor Suporte"
- Respostas buscadas em RAG
```

### Passo 3: Integração no Fluxo de Atendimento
```
Fluxo Completo:

Operador abre ATENDIMENTO > Board do Setor
  ↓
Clica em tarefa "Cliente diz: não consegue resetar senha"
  ↓
Modal abre com 2 painéis:
  ┌─────────────────────────────────────┐
  │ Esquerda: Dados da Tarefa           │
  │ Título, Descrição, Status, etc      │
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │ Direita: Chat Contextual            │
  │ "💬 Chat sobre: Cliente - senha"    │
  │                                     │
  │ [Histórico de mensagens]            │
  │                                     │
  │ Input: [Digitando...]               │
  │ [Enviar]                            │
  └─────────────────────────────────────┘

Operador digita: "Como guiar cliente para resetar?"
  ↓
Sistema envia ao JOTA:
  "Contexto: Você está ajudando no setor SUPORTE
   com tarefa: 'Cliente não consegue resetar senha'
   
   Pergunta: Como guiar cliente para resetar?"
  ↓
JOTA responde com doc consultada:
  "Solicite que o cliente use o botão 'Esqueci minha senha'.
   Ele receberá email com link. Se não receber, verifique:
   1. Spam
   2. Email correto no sistema
   
   📚 Documento: Procedimento-Reset-Senha.md"
  ↓
Operador clica em "📚 Abrir documento"
  ↓
Documento abre em nova aba (ou modal)
  ↓
Operador copia procedimento → cola na resposta do cliente
```

**Prompt Completo para Implementação:**

```
ROLE: Você é arquiteto de experiência de atendimento.

TAREFA: Integrar RAG Chat em 3 pontos do fluxo de atendimento.

LÓGICA:

1. Melhorar FAB Global JOTA:
   Mudança:
   a) FAB sempre visível (canto inferior direito)
   b) Ao clicar, painel abre
   c) Se em tarefa: painel mostra contexto
   d) Se não em tarefa: mostra "Chat Genérico (Setor: Suporte)"
   
   Implementação:
   - Usar ChatContextoService (problema #1)
   - FAB component injeta o serviço
   - Constrói prompt automaticamente

2. Adicionar Chat Contextual em Modal de Tarefa:
   Nova Aba/Painel no Modal:
   a) Modal de tarefa tem 2 áreas:
      - Esquerda: info + histórico
      - Direita: chat panel (novo)
   
   b) Chat panel herda contexto da tarefa:
      {tipo: 'tarefa', id, titulo, setor, descricao}
   
   c) Ao enviar pergunta:
      - Prompt é construído com contexto
      - Workspace = setor da tarefa
      - Histórico persistido por tarefa

3. Criar Aba "Conhecimento do Setor":
   Localização: ATENDIMENTO > Conhecimento do Setor
   
   Componente: ConhecimentoSetorComponent
   - Input: setorId (pego do usuário logado)
   - 4 abas (não navegam, permanecem na mesma URL)
   
   ABA 1 - BASE DE CONHECIMENTO:
   - Search: <input> "Buscar na base..."
   - Ao digitar: chamada em tempo real
     GET /api/rag-proxy/search?workspace=workspace-suporte&q=resetar
   - Resultados: lista de artigos com score
   - Cada resultado: clickável → abre documento
   
   ABA 2 - FRASEOLOGIAS:
   - Lista de frases prontas
   - Cada frase tem: situação + resposta
   - Botão: "Copiar" → copia para clipboard
   - Operador cola direto na resposta do cliente
   
   ABA 3 - PROCEDIMENTOS:
   - Lista: "Como resetar senha em 5 passos"
   - Clickável: modal com passo a passo
   - Botão: "Ver completo" → abre documento
   
   ABA 4 - FAQ:
   - GET /api/rag-proxy/faq?workspace=workspace-suporte
   - Dinâmico: top 10 perguntas da semana
   - Cada pergunta: busca resposta em RAG
   - Clickável: mostra resposta

FLUXO DE SUCESSO:

Cenário 1: Operador em Tarefa
1. Acessa ATENDIMENTO > Board do Setor
2. Clica em "Cliente quer resetar senha"
3. Modal abre (2 painéis)
4. Digita no chat: "Como guiar?"
5. JOTA responde com doc
6. Clica em documento
7. Lê procedimento
8. Volta ao chat (mesma tela)
9. Copia resposta → cola para cliente
10. Move tarefa para "Concluído"
→ Tudo em 1 modal, 1 URL, sem deixar fluxo

Cenário 2: Operador Aprende Primeiro
1. Acessa ATENDIMENTO > Conhecimento do Setor
2. Aba BASE: busca "resetar senha"
3. Lê 3 artigos
4. Aba PROCEDIMENTOS: lê passo a passo
5. Agora quando receber tarefa, sabe fazer
6. Clica em tarefa → modal
7. Chat panel: faz pergunta de detalhe
8. Resolve em minutos (não em horas)
→ Aprendizado + Resolução integrados

SUCESSO QUANDO:
- Chat contextual em modal aparece instantaneamente
- Operador pergunta "Como?" → JOTA responde com docs certos
- "Conhecimento do Setor" tem 4 abas funcionando
- Operador não precisa sair do fluxo para aprender
- Documentos aparecem em max 2 segundos (cache)
```

---

## PROBLEMA #5: Falta de Kanban para Gestor Acompanhar Equipe

**Situação Atual:**
- Operador vê kanban pessoal (suas tarefas)
- Admin vê tudo (mas isolado no /admin/dashboard)
- Gestor de setor: não vê kanban da equipe em tempo real

**Lógica de Resolução:**

### Passo 1: Duas Visualizações do Mesmo Kanban
```
Lógica:

OPERADOR (view padrão):
├─ Vê: Tarefas atribuídas a ele (filtro automático: responsavel = eu)
├─ Pode: Mover suas tarefas
├─ Interage: Chat contextual por tarefa
└─ URL: /atendimento/board-setor (sem parametro)

GESTOR (view expandida):
├─ Vê: Todas as tarefas do setor
├─ Agrupa: Por responsável (colunas secundárias)
├─ Cores: Vermelhas se vencendo
├─ Pode: Clicar em qualquer tarefa, ver detalhes, reatribuir
├─ Filtros: Por responsável, prioridade, status SLA
└─ URL: /atendimento/board-setor?view=gestor

Mesmo Componente, 2 Comportamentos:
if (usuarioEhGestor && isSetorDele) {
  mostrarTodasAsTarefas()
  ativarFiltros()
  ativarBotoesReatribuir()
} else {
  mostrarApenasMinhasTarefas()
  desativarFiltros()
}
```

### Passo 2: Visualização em Agrupamento
```
Lógica:

Gestor vê Kanban com Hierarquia:

┌────────────────────────────────────────────┐
│ Board do Setor: Suporte                    │
├────────────────────────────────────────────┤
│
│ JOÃO SILVA (5 tarefas)
│ ┌────────────┬────────────┬────────────┐
│ │ 📝 Novo    │ ⚙️ Em...   │ ✅ Concl   │
│ │ (2)        │ (2)        │ (1)        │
│ └────────────┴────────────┴────────────┘
│
│ MARIA SANTOS (8 tarefas)
│ ┌────────────┬────────────┬────────────┐
│ │ 📝 Novo    │ ⚙️ Em...   │ ✅ Concl   │
│ │ (3) ⚠️     │ (4) ❌     │ (1)        │
│ └────────────┴────────────┴────────────┘
│ [3 críticas com atraso]
│
│ PEDRO COSTA (3 tarefas)
│ ┌────────────┬────────────┬────────────┐
│ │ 📝 Novo    │ ⚙️ Em...   │ ✅ Concl   │
│ │ (1)        │ (1)        │ (1)        │
│ └────────────┴────────────┴────────────┘

Legenda:
⚠️ = Tarefas vencendo (amarelo)
❌ = Tarefas vencidas (vermelho)
```

### Passo 3: Ações de Gestor
```
Lógica:

Ao clicar em tarefa bloqueada/vencida:

Modal Expandido:
┌─────────────────────────────────────┐
│ Tarefa: "Implementar integração"    │
│ Responsável: Maria Santos           │
│ Status: Em Progresso (desde 8d)     │
│ Prioridade: CRÍTICA                 │
│ SLA: VENCIDA (2 dias)               │
├─────────────────────────────────────┤
│ AÇÕES DE GESTOR:                    │
│ [Reatribuir a: ...dropdown...]      │
│ [Estender SLA: ...data...]          │
│ [Adicionar colaborador]             │
│ [Escalar para diretor]              │
│ [Dividir em subtarefas]             │
└─────────────────────────────────────┘

Reatribuir:
1. Gestor clica [Reatribuir a]
2. Dropdown mostra: João (2), Pedro (1), Ana (3)
3. Seleciona Ana
4. Sistema: PUT /api/tarefas/123 {responsavelId: ana.id}
5. Tarefa se move para coluna de Ana
6. Histórico: "Reatribuída por Gestor às 15:30"
7. Ana recebe notificação

Estender SLA:
1. Gestor clica [Estender SLA]
2. Calendário: seleciona novo prazo
3. Sistema: PUT /api/tarefas/123 {dataVencimento: nova}
4. SLA indicator atualiza
5. Histórico: "SLA estendido até 20/09"
```

### Passo 4: Relatório de Equipe
```
Lógica:

Painel ao lado do Kanban (view Gestor):

MÉTRICAS DA EQUIPE:
┌──────────────────────────┐
│ Total: 47 tarefas        │
│ Média por pessoa: 9.4    │
│                          │
│ ✅ Concluídas: 16 (68%)  │
│ ⚠️ Atrasadas: 3          │
│ 🔴 Críticas: 5           │
│                          │
│ SLA Médio: 92%           │
│ (Semana anterior: 85%)   │
│                          │
│ Produção:                │
│ Seg: 8, Ter: 10, Qua: 9, │
│ Qui: 12, Sex: 6          │
└──────────────────────────┘

Ao clicar em "⚠️ Atrasadas":
- Filtra kanban: mostra só atrasadas
- Correlação visual: qual responsável tem mais atraso
```

**Prompt Completo para Implementação:**

```
ROLE: Você é analista de gestor operacional.

TAREFA: Implementar Kanban com view Gestor para acompanhar equipe.

LÓGICA:

1. Componente com 2 Modos:
   KanbanSetorComponent @Input() viewMode: 'operador' | 'gestor'
   
   IF viewMode = 'operador':
     filtro = {responsavel: usuarioAtual.id}
     mostrarApenasMinhasTarefas()
     desativarBotoesReatribuir()
   
   ELSE IF viewMode = 'gestor':
     IF usuarioEhGestorDaSetor:
       filtro = {setor: gestorSetor}
       mostrarTodasAsTarefas()
       agruparPorResponsavel()
       ativarBotoesReatribuir()
     ELSE:
       mostrarErro('Sem permissão')

2. Agrupamento Visual:
   colunas.forEach(coluna => {
     // Para cada status, subdivir por responsável
     coluna.responsaveis = agrupar(coluna.tarefas, 'responsavel')
     // Resultado:
     // JOÃO SILVA: [tarefa1, tarefa2, ...]
     // MARIA SANTOS: [tarefa3, tarefa4, ...]
   })
   
   Render:
   <div *ngFor="let resp of colunas[status].responsaveis">
     <h4>{{resp.nome}} ({{resp.tarefas.length}})</h4>
     <div class="mini-kanban">
       <ng-container *ngFor="let tarefa of resp.tarefas">
         <card [tarefa]="tarefa" [canReasign]="true"></card>
       </ng-container>
     </div>
   </div>

3. Indicadores Visuais:
   Se tarefaVencida:
     borderColor = '#d03b3b'
     badge = '❌'
   
   Se tarefaVencendo (dias <= 1):
     borderColor = '#ec835a'
     badge = '⚠️'
   
   Se tarefaCrítica:
     backgroundColor = 'rgba(208, 59, 59, 0.1)'

4. Ações de Reatribuição:
   No modal de tarefa (view gestor):
   
   <select (change)="reatribuir($event)">
     <option>Reatribuir a:</option>
     <option *ngFor="let usuario of usuariosSetor" value="{{usuario.id}}">
       {{usuario.nome}} ({{usuario.tarefasAtuais}} tarefas)
     </option>
   </select>
   
   reatribuir(novoUsuarioId) {
     POST /api/tarefas/{{tarefaId}}/responsavel
     body: {novoResponsavelId: novoUsuarioId}
     
     onSuccess:
     - Tarefa se move visualmente para coluna do novo responsável
     - Toast: "Reatribuída para Maria"
     - Histórico: "Gestor reatribuiu às 15:30"
   }

5. Painel de Métricas (sidebar no Kanban):
   AdminMetricasComponent:
   - GET /api/implantacao/metricas?setorId=1
   - Mostra: total, concluídas, atrasadas, críticas
   - Gráfico: produção por dia (última semana)
   - Clicáveis: filtram o kanban

FLUXO DE SUCESSO:

Cenário: Gestor de Suporte
1. Acessa TAREFAS & PROJETOS > Kanban do Gestor
2. Sistema detecta: viewMode = 'gestor'
3. Kanban carrega TODAS as tarefas do Suporte (47)
4. Agrupa por responsável:
   - JOÃO SILVA (5)
   - MARIA SANTOS (8) ← com badges ❌
   - PEDRO COSTA (3)
5. Gestor vê: Maria tem 3 tarefas críticas atrasadas
6. Clica em uma: modal abre
7. Clica [Reatribuir a]: dropdown mostra João (2 tarefas)
8. Seleciona João: tarefa se move visualmente
9. Histórico: "Gestor reatribuiu para João às 15:32"
10. Painel lateral mostra métrica atualizada: "Maria: 7 tarefas"
11. Notificação aparece para João (tarefa nova)

SUCESSO QUANDO:
- Gestor acessa 1 URL: /tarefas/kanban?view=gestor
- Vê kanban completo do setor (não precisa ir a outro lugar)
- Reatribuição leva 3 cliques (não modal+save+reload)
- Métricas atualizam em tempo real (refresh a cada 30s)
- Histórico de ações é automático (sem digitação)
```

---

## PROBLEMA #6: Database sem Favoritos/Histórico

**Situação Atual:**
- Operador abre Database Explorer
- Clica em Consultas
- Escreve SQL de novo (ou copia histórico na memória)
- Sem favoritos; queries complexas são esquecidas

**Lógica de Resolução:**

### Passo 1: Armazenar Favoritos
```
Lógica:

Quando operador executa query e acha útil:

1. Query executada retorna resultado
2. Botão destacado: "⭐ Salvar como Favorito"
3. Clica: modal abre
   - Campo: Nome (auto-preenchido: "Query_2026-09-18_14:32")
   - Campo: Descrição (opcional)
   - Tags: (checkbox) "Performance", "Users", "Backup", etc
   - Botão: [Salvar]

4. Sistema armazena em localStorage:
   {
     id: 'fav-123456789',
     nome: 'Listar Usuários Ativos',
     descricao: 'Retorna todos os usuários com login nos últimos 30 dias',
     sql: 'SELECT * FROM usuarios WHERE last_login > DATEADD(day, -30, GETDATE())',
     tags: ['users', 'performance'],
     dataCriacao: '2026-09-18',
     executadoUltimo: '2026-09-18 15:32:00',
     resultados: {...}  // cache dos últimos resultados
   }

5. Favorito aparece em lista (sidebar ou dropdown)
```

### Passo 2: Recuperar e Executar Favorito
```
Lógica:

Aba: "Minhas Queries Favoritas"

Sidebar > Database > Query Favoritos
┌──────────────────────────────┐
│ 📌 Favoritos (7)             │
├──────────────────────────────┤
│ • Listar Usuários Ativos     │
│ • Top 10 Clientes            │
│ • Backup Schedules           │
│ • Performance por Tabela     │
│ • Encontrar Duplicatas       │
│ • Contas Suspensas           │
│ • Relatório de Auditoria     │
└──────────────────────────────┘

Ao clicar em "Listar Usuários Ativos":
1. SQL pré-carregado no editor
2. Botão: [Executar] (destacado)
3. Clica → query rodapela
4. Resultados aparecem em tabela
5. Histórico: adicionado a "Última Execução: 2026-09-18 15:40"

Pode:
- Editar a query (botão 📝)
- Excluir favorito (botão 🗑️)
- Duplicar (botão 📋)
- Copiar SQL (botão 📋)
```

### Passo 3: Histórico de Queries
```
Lógica:

Aba: "Histórico de Consultas"

Amostra:
┌──────────────────────────────────────────────────┐
│ Última Semana (↓ ordenado por recente)          │
├──────────────────────────────────────────────────┤
│ Hoje, 15:40 - SELECT * FROM usuarios...        │
│              ⏱️ 2.3s | 847 linhas                │
│              [Abrir] [Repetir] [Favoritar]      │
│                                                  │
│ Hoje, 14:32 - SELECT TOP 10 clientes...        │
│              ⏱️ 0.8s | 10 linhas                 │
│              [Abrir] [Repetir] [Favoritar]      │
│                                                  │
│ Ontem, 09:15 - WITH cte AS (SELECT...)         │
│              ⏱️ 5.1s | 2341 linhas  ❌ Erro      │
│              [Abrir] [Repetir]                   │
└──────────────────────────────────────────────────┘

Filtra por:
- Data: Esta semana, Últimos 7 dias, Últimos 30 dias
- Status: Sucesso, Erro, Timeout
- Tempo: Rápidas (< 1s), Médias (1-5s), Lentas (> 5s)

Ao clicar [Abrir]:
- SQL carrega no editor
- [Repetir]: executa de novo
- [Favoritar]: salva como favorito
```

### Passo 4: JOTA para SQL
```
Lógica:

Dentro do SQL Helper (Ferramentas Específicas):

Nova Seção: "JOTA SQL Assistant"
┌──────────────────────────────┐
│ Pergunta sobre a query:      │
│ [Text area]                  │
│ "Explicar esta query"        │
│ "Otimizar performance"       │
│ "Adicionar índice para..."   │
│ [Enviar para JOTA]           │
└──────────────────────────────┘

Exemplo:
1. Operador tem query: SELECT * FROM usuarios WHERE...
2. Digita no JOTA: "Essa query está lenta, como otimizo?"
3. JOTA responde: "Crie índice em 'email' e 'status'"
4. JOTA oferece: "Quer que eu gere o script CREATE INDEX?"
5. Operador clica [Gerar]
6. Script aparece em nova aba, pronto para executar
```

**Prompt Completo para Implementação:**

```
ROLE: Você é arquiteto de Database Explorer.

TAREFA: Implementar Favoritos + Histórico + JOTA para SQL.

LÓGICA:

1. Serviço: DatabaseFavoritosService
   Storage: localStorage (key: 'cc.database.favoritos.v1')
   
   Estrutura:
   {
     id: string (gerado)
     nome: string (obrigatório)
     descricao: string (opcional)
     sql: string (SQL completo)
     tags: string[] (opcional)
     dataCriacao: Date
     executadoUltimo: Date (atualizado ao rodar)
     resultadosCache: any[] (cache dos últimos resultados)
   }
   
   Métodos:
   - adicionarFavorito(nome, sql, tags, descricao): void
   - deletarFavorito(id): void
   - listarFavoritos(): FavoritoQuery[]
   - buscarFavoritosPorTag(tag): FavoritoQuery[]
   - executarFavorito(id): Observable<Resultados>
   - duplicarFavorito(id): void
   - atualizarFavorito(id, atualizacoes): void

2. Serviço: DatabaseHistoricoService
   Storage: localStorage (key: 'cc.database.historico.v1')
   
   Estrutura:
   {
     id: string
     sql: string
     dataExecucao: Date
     tempoExecucao: number (ms)
     status: 'sucesso' | 'erro' | 'timeout'
     linhasRetornadas: number
     erro?: string
     executadoFavoritando?: boolean
   }
   
   Métodos:
   - registrarQuery(sql, resultado, tempo): void
   - listarHistorico(filtros): HistoricoQuery[]
   - limparHistorico(): void
   - buscarPorData(dataInicio, dataFim): HistoricoQuery[]

3. Componente: QueryFavoritosComponent
   Localização: Ferramentas > Database > Query Favoritos
   
   Abas (não navegam):
   a) Favoritos
      - Dropdown: "Selecione um favorito"
      - Lista: todos com tags
      - Clique: carrega no editor
      - Botão [Executar], [Editar], [Duplicar], [Excluir]
   
   b) Histórico
      - Lista: últimas 30 queries
      - Filtros: data, status, tempo
      - Cada linha: [Abrir], [Repetir], [Favoritar]
   
   c) SQL Editor
      - Editor com syntax highlighting
      - Botão [Executar]
      - Botão [Salvar como Favorito]
      - Painel: resultados (tabela + paginação)

4. Integração JOTA para SQL:
   No SQL Editor, adicionar painel lateral:
   - Área: "JOTA SQL Assistant"
   - Botões rápidos:
     * "Explicar query"
     * "Otimizar"
     * "Adicionar índice"
   - Text area: pergunta customizada
   - [Enviar para JOTA]
   
   Prompt para JOTA:
   "Analise esta query SQL e responda sobre: [pergunta]
    
    Query:
    [SQL DO EDITOR]
    
    Database: SQL Server
    
    Responda em português, de forma concisa."
   
   JOTA pode oferecer:
   - Script de otimização
   - Índices sugeridos
   - Reescrita da query
   - Análise de performance

FLUXO:

Cenário 1: Operador Usa Favorito
1. Acessa Ferramentas > Database > Query Favoritos
2. Aba "Favoritos"
3. Clica em "Listar Usuários Ativos"
4. SQL carrega no editor automaticamente
5. Clica [Executar]
6. Resultados aparecem em 0.8s
7. Pode editar + salvar nova versão

Cenário 2: Operador Cria Novo Favorito
1. SQL Editor
2. Escreve query complexa
3. Clica [Executar]
4. Resultado: 2341 linhas em 5.3s
5. Clica [Salvar como Favorito]
6. Modal: nome = "Relatório de Auditoria"
7. Tags: "auditoria", "performance", "semanal"
8. [Salvar]
9. Favorito aparece em dropdown instantaneamente

Cenário 3: Operador Otimiza com JOTA
1. Query está lenta (7.2s)
2. Clica "JOTA SQL Assistant"
3. Digita: "Como otimizar essa query?"
4. JOTA responde: "Adicione índice em colunas X, Y, Z"
5. JOTA oferece: "Gerar script CREATE INDEX"
6. Clica [Gerar]
7. Script aparece em aba "Índices"
8. Executa script
9. Re-executa query original
10. Agora: 1.2s (6x mais rápido)

SUCESSO QUANDO:
- Operador pode rodar query favorita com 2 cliques
- Histórico mostra últimas 30 queries (com filtros)
- JOTA ajuda a otimizar SQL
- Favoritos são persistidos entre sessões
- Tags facilitam encontrar queries relacionadas
```

---

**CONTINUA NA PRÓXIMA MENSAGEM** (Problemas #7 e #8 + Resumo de Implementação)

Quer que continue com os últimos 2 problemas e o resumo executivo de implementação?

# LÓGICA DE RESOLUÇÕES - CONTINUAÇÃO
## Problemas #7 e #8 + Resumo Executivo

---

## PROBLEMA #7: Confusão Entre Abas "Atendimento" vs "Implantação"

**Situação Atual:**
- Seção "Atendimento" → Resolver, Fraseologias, SQL, Infra
- Seção "Implantação" → Projetos, Kanban, Tarefas, Cadastros
- Operador novo fica perdido: "Onde registrar uma tarefa de suporte?"

**Lógica de Resolução:**

### Passo 1: Renomear e Reorganizar
```
ANTES:
├── ATENDIMENTO (7 itens)
│   ├─ Resolver (para via)
│   ├─ Fraseologias
│   ├─ SQL
│   ├─ Rede
│   └─ Infra
└── IMPLANTAÇÃO (7 itens)
    ├─ Visão Geral
    ├─ Projetos
    ├─ Kanban
    ├─ Tarefas
    └─ Cadastros

DEPOIS:
├── 🎯 ATENDIMENTO (Novo nome: "RESOLVER & APRENDER")
│   ├─ Board do Setor (novo - kanban de tarefas)
│   ├─ Conhecimento do Setor (novo - docs + FAQs)
│   ├─ Ferramentas Específicas (novo menu)
│   │  ├─ SQL Helper (favoritos + histórico)
│   │  ├─ Query Builder
│   │  ├─ Rede & Infra
│   │  └─ Histórico de Consultas
│   └─ [Fraseologias removidas - agora em "Conhecimento"]
│
├── 📦 TAREFAS & PROJETOS (Novo nome: "EXECUTAR")
│   ├─ Meu Kanban (view pessoal - idem ao Board)
│   ├─ Kanban do Gestor (view equipe)
│   ├─ Projetos (timeline + roadmap)
│   ├─ Cadastros
│   └─ Relatório de Produtividade (novo)
│
├── 🔧 FERRAMENTAS
│   ├─ Database Explorer
│   ├─ Acessos
│   └─ Utilitários
│
├── 📚 CONHECIMENTO
│   └─ [Stack, Cursos, etc]
│
└── 👥 JCA / ADMINISTRAÇÃO
    └─ [idem]
```

### Passo 2: Clareza por Emoji + Nomes
```
Lógica de Diferenciação Visual:

🎯 ATENDIMENTO / RESOLVER & APRENDER
   └─ Foco: Resolver tickets, aprender docs, troubleshooting
   └─ Quem usa: Operadores de suporte, analistas técnicos
   └─ O que faz: Atende, pergunta, consulta, repara

📦 TAREFAS & PROJETOS / EXECUTAR
   └─ Foco: Gerenciar projetos, coordenar equipes, entregar
   └─ Quem usa: Gestores, arquitetos, implementadores
   └─ O que faz: Planeja, executa, monitora, entrega

Resumo na Sidebar:
🎯 Resolver         [Você está aqui se]
   → Atendendo cliente
   → Consultando base de conhecimento
   → Troubleshooting

📦 Executar         [Você está aqui se]
   → Gerenciando projeto
   → Delegando tarefas
   → Monitorando equipe
```

### Passo 3: Onboarding Contextual
```
Quando usuário novo entra:

Tela 1: "Qual é seu papel?"
├─ Operador (resolvo tickets)
├─ Gestor (coordeno equipe)
├─ Implementador (entrego projetos)
└─ Admin (administro sistema)

Baseado na resposta:
IF Operador THEN
  Aparecem destacadas: 🎯 ATENDIMENTO (Board + Conhecimento)
  Ocultas: 📦 TAREFAS (pode acessar, mas não destaque)
  Tooltip: "Use o Board do Setor para suas tarefas diárias"

ELSE IF Gestor THEN
  Aparecem destacadas: 📦 TAREFAS (Kanban do Gestor + Relatórios)
  Visível: 🎯 ATENDIMENTO > Board do Setor (para acompanhar)
  Tooltip: "Use o Kanban do Gestor para acompanhar sua equipe"

ELSE IF Admin THEN
  Todas aparecem normalmente
  Destaque em: 👥 ADMINISTRAÇÃO
```

**Prompt Completo para Implementação:**

```
ROLE: Você é UX Designer de sidebar.

TAREFA: Reorganizar navegação para clareza (Resolver vs Executar).

LÓGICA:

1. Estrutura de Navbar v3.0:
   Seção: 🎯 ATENDIMENTO (ou "RESOLVER")
   └─ Icon color: azul (#0066cc)
   └─ Itens:
      • Board do Setor
        - Descrição: "Suas tarefas de atendimento"
        - Icone: 📋
      • Conhecimento do Setor
        - Descrição: "Docs, procedimentos, FAQ"
        - Icone: 📚
      • Ferramentas Específicas
        - Sub-itens:
          * SQL Helper (com favoritos)
          * Query Builder
          * Rede & Infra
          * Histórico de Consultas

   Seção: 📦 TAREFAS & PROJETOS (ou "EXECUTAR")
   └─ Icon color: verde (#0ca30c)
   └─ Itens:
      • Meu Kanban
        - Descrição: "Suas tarefas (idem ao Board)"
      • Kanban do Gestor
        - Descrição: "Equipe em tempo real (só gestor)"
        - Visível apenas se usuarioEhGestor()
      • Projetos
        - Descrição: "Timeline, roadmap"
      • Cadastros
      • Relatório de Produtividade
        - Descrição: "SLA, conclusões, eficiência"

   [resto do sidebar permanece igual]

2. Onboarding com Role:
   Quando usuário faz login (primeira vez):
   
   Dialog: "Qual é seu papel na operação?"
   └─ Radio buttons:
      • Operador (Resolvo tickets e suporto clientes)
      • Gestor (Coordeno uma equipe de operadores)
      • Implementador (Entrego projetos)
      • Admin (Administro o sistema)
   
   [Próximo]
   
   Resultado:
   - Role é salvo no usuário
   - Sidebar é filtrada baseado na role
   - LocalStorage: 'cc.user.role' = salva preferência
   - Pode alterar depois em Perfil

3. Visibilidade por Role:
   
   IF role = 'Operador':
     mostrar: 🎯 ATENDIMENTO (destacado)
     mostrar: 📦 TAREFAS (Meu Kanban apenas)
     ocultar: Kanban do Gestor
     dica: "Use Board do Setor para suas tarefas diárias"
   
   ELSE IF role = 'Gestor':
     mostrar: 📦 TAREFAS (destacado)
     mostrar: 🎯 ATENDIMENTO > Board do Setor (para referência)
     mostrar: Kanban do Gestor (destacado)
     dica: "Acompanhe sua equipe em tempo real"
   
   ELSE IF role = 'Implementador':
     mostrar: 📦 TAREFAS (destacado, foco em Projetos)
     mostrar: 🎯 ATENDIMENTO (base de conhecimento)
   
   ELSE IF role = 'Admin':
     mostrar: Tudo normalmente
     destacar: 👥 ADMINISTRAÇÃO

4. CSS/Visual:
   - Emoji antes do nome da seção (🎯, 📦, etc)
   - Cor do ícone diferente por seção
   - Hover: tooltip com descrição
   - Ativo: background destacado + nome em bold

FLUXO:

Usuário novo faz login:
1. Sistema detecta: primeira vez
2. Dialog: "Qual é seu papel?"
3. Seleciona: "Operador"
4. Sidebar recarrega
5. Destaque em: 🎯 ATENDIMENTO
6. Tooltip: "Comece aqui - Board do Setor"
7. Clica em "Board do Setor"
8. Modal de boas-vindas: "Aqui você vê suas tarefas"
9. Pode começar de imediato

SUCESSO QUANDO:
- Operador novo entende: ir para 🎯 ATENDIMENTO
- Gestor novo entende: ir para 📦 TAREFAS
- Confusão entre "Atendimento" vs "Implantação" desaparece
- Sidebar é mais concisa (menos itens por seção)
- Role é detectada automaticamente
```

---

## PROBLEMA #8: Falta de Relatório de SLA/Produtividade

**Situação Atual:**
- Gestor não tem visibilidade de: "Quantas tarefas acabamos esta semana?"
- Não há métrica de: "Qual responsável é mais produtivo?"
- Sem dados: não consegue fazer feedback objetivo

**Lógica de Resolução:**

### Passo 1: Definir Métricas Chave
```
Lógica:

KPI #1: TAXA DE CONCLUSÃO
├─ Fórmula: (Tarefas Concluídas / Total de Tarefas) * 100
├─ Períodos: Hoje, Esta Semana, Este Mês, Últimos 30 dias
├─ Agregação: Por Setor, Por Pessoa, Total
├─ Tendência: Comparar com período anterior
└─ Exemplo: "68% esta semana (era 65% semana passada) ↑ +3%"

KPI #2: TEMPO MÉDIO POR TAREFA
├─ Fórmula: (Data Conclusão - Data Criação) média
├─ Períodos: Similar a #1
├─ Agregação: Por Status (Novo→Concl, Validação→Concl, etc)
├─ Tendência: Mais rápido ou mais lento
└─ Exemplo: "2.3 dias em média (era 2.8d) ↓ -0.5d"

KPI #3: SLA CUMPRIMENTO
├─ Fórmula: (Tarefas dentro do SLA / Total com SLA) * 100
├─ Períodos: Similar
├─ Agregação: Por Setor, Por Prioridade
├─ Tendência: Melhorando ou piorando
└─ Exemplo: "92% dentro do SLA (era 85%) ↑ +7%"

KPI #4: TAREFAS ATRASADAS
├─ Fórmula: Contagem de tarefas onde (hoje > dataVencimento)
├─ Períodos: Instantâneo (hoje), acumulado na semana
├─ Agregação: Por Setor, Por Pessoa
├─ Tendência: Aumentando ou diminuindo
└─ Exemplo: "3 tarefas atrasadas (eram 5 ontem) ↓ -2"

KPI #5: PRODUTIVIDADE POR PESSOA
├─ Fórmula: (Tarefas Concluídas por Pessoa / Média Setor) * 100
├─ Períodos: Esta Semana, Este Mês
├─ Agregação: Ranking dos operadores
├─ Tendência: Acima/Abaixo da média
└─ Exemplo:
   - João Silva: 110% (acima da média)
   - Maria Santos: 85% (abaixo da média)
   - Pedro Costa: 105% (acima da média)
```

### Passo 2: Dashboard de Relatório
```
Lógica de Layout:

/tarefas/relatorio-produtividade

┌────────────────────────────────────────────────┐
│ RELATÓRIO DE PRODUTIVIDADE - SETOR SUPORTE    │
├────────────────────────────────────────────────┤
│
│ Período: [Esta Semana v] [Este Mês v] [Custom] │
│ Filtro: [Todos os Setores v]                   │
│
│ ┌─────────────────────────────────────────────┐
│ │ RESUMO EXECUTIVO                            │
│ ├─────────────────────────────────────────────┤
│ │ Taxa de Conclusão: 68% ↑ +3% (semana ant)  │
│ │ Tempo Médio: 2.3 dias ↓ (era 2.8d)         │
│ │ SLA Cumprimento: 92% ↑ +7%                  │
│ │ Atrasadas: 3 ↓ -2                           │
│ └─────────────────────────────────────────────┘
│
│ ┌─────────────────────────────────────────────┐
│ │ GRÁFICO: Conclusões por Dia                 │
│ │ (Barras mostrando trend linha)              │
│ │ Seg:8 Ter:10 Qua:9 Qui:12 Sex:6            │
│ │ Média: 9 tarefas/dia                        │
│ └─────────────────────────────────────────────┘
│
│ ┌─────────────────────────────────────────────┐
│ │ PRODUTIVIDADE POR PESSOA                    │
│ ├─────────────────────────────────────────────┤
│ │ João Silva      ████████████░ 110%  ↑       │
│ │ Pedro Costa     ███████░░░░░░ 105%  ↑       │
│ │ Maria Santos    ██████░░░░░░░  85%  ↓       │
│ │ Ana Silva       █████░░░░░░░░  80%  ↓       │
│ │                                             │
│ │ Média Setor: 100%                           │
│ │ Desvio Padrão: ±12%                         │
│ └─────────────────────────────────────────────┘
│
│ ┌─────────────────────────────────────────────┐
│ │ DISTRIBUIÇÃO POR PRIORIDADE                 │
│ ├─────────────────────────────────────────────┤
│ │ Crítica: 5 de 5 (100%) ✅                   │
│ │ Alta: 12 de 15 (80%) ⚠️                     │
│ │ Média: 20 de 25 (80%)                       │
│ │ Baixa: 8 de 10 (80%)                        │
│ └─────────────────────────────────────────────┘
│
│ ┌─────────────────────────────────────────────┐
│ │ TABELA: TAREFAS COM ATRASO                  │
│ ├─────────────────────────────────────────────┤
│ │ Tarefa          Responsável  Atraso  Ação   │
│ │ Resetar BD      Maria        3d      Reat  │
│ │ Novo módulo     João         1d      Ext   │
│ │ Backup diário   Pedro        5d      Esc   │
│ └─────────────────────────────────────────────┘
│
│ [Exportar PDF] [Enviar por Email] [Copiar Link]
└────────────────────────────────────────────────┘
```

### Passo 3: Notificações de Alerta
```
Lógica:

Sistema verifica a cada 6 horas:

IF Taxa_Conclusao < Baseline_Esperada THEN
  Email para Gestor:
  "Alerta: Taxa de conclusão está 15% abaixo da expectativa.
   Esta semana: 53% (esperado: 68%)
   Ação: Revisar carga de trabalho da equipe"

IF Tarefas_Atrasadas > Threshold THEN
  Notificação (app):
  "5 tarefas atrasadas. 3 críticas."
  [Clica] → abre kanban com filtro "atrasadas"

IF SLA_Risco THEN
  Email para Gestor + Operador responsável:
  "SLA em risco: Tarefa X tem 2h até vencimento."
```

**Prompt Completo para Implementação:**

```
ROLE: Você é analista de BI/relatórios.

TAREFA: Criar dashboard de relatório de produtividade com métricas.

LÓGICA:

1. Serviço: RelatorioService
   
   Métodos:
   - getTaxaConclusao(setorId, periodo): number
   - getTempoMedio(setorId, periodo): number (dias)
   - getSLACumprimento(setorId, periodo): number
   - getTarefasAtrasadas(setorId): Tarefa[]
   - getProdutividadePorPessoa(setorId, periodo): {nome, conclusoes, percentual}[]
   - getDistribuicaoPorPrioridade(setorId, periodo): {prioridade, total, concluidas, pct}[]
   - getEvolucaoDiaria(setorId, periodo): {dia, conclusoes}[]

2. Componente: RelatorioComponent
   
   Estrutura:
   ├─ Filtros (período, setor)
   ├─ Cards de KPIs (4 cards principais)
   ├─ Gráfico: Evolução Diária (barras)
   ├─ Gráfico: Produtividade por Pessoa (barras horizontais)
   ├─ Gráfico: Distribuição por Prioridade (pizza)
   ├─ Tabela: Tarefas com Atraso
   └─ Botões: Exportar PDF, Email, Copiar Link

3. Cálculos:
   
   Taxa Conclusão:
   concluidas = COUNT(tarefas WHERE status='Concluído' AND data_conclusao IN período)
   total = COUNT(tarefas WHERE data_criacao IN período)
   pct = (concluidas / total) * 100
   
   Tendência:
   pct_anterior = (concluidas_ant / total_ant) * 100
   delta = pct - pct_anterior
   
   Tempo Médio:
   tempo_array = [data_conclusao - data_criacao] FOR cada tarefa concluída
   media = AVERAGE(tempo_array)
   
   SLA Cumprimento:
   dentro_sla = COUNT(tarefas WHERE dataVencimento >= hoje)
   total_com_sla = COUNT(tarefas WHERE dataVencimento IS NOT NULL)
   pct = (dentro_sla / total_com_sla) * 100
   
   Tarefas Atrasadas:
   atrasadas = SELECT * FROM tarefas WHERE dataVencimento < hoje AND status <> 'Concluído'
   
   Produtividade por Pessoa:
   FOR cada usuario:
     concluidas_user = COUNT(tarefas WHERE responsavel=usuario AND status='Concluído')
     media_setor = SUM(concluidas_all) / COUNT(usuarios)
     percentual = (concluidas_user / media_setor) * 100

4. Período:
   
   Dropdowns: [Esta Semana v] [Este Mês v] [Últimos 30d v] [Custom]
   
   Quando "Custom":
     Date picker: [De] [Até]
   
   Lógica:
   IF "Esta Semana":
     dataInicio = segunda-feira desta semana
     dataFim = domingo desta semana
   ELSE IF "Este Mês":
     dataInicio = dia 1 deste mês
     dataFim = dia 30/31 deste mês
   ...

5. Alertas:
   
   Serviço: AlertasService
   
   A cada 6 horas, roda verificações:
   
   check TaxaConclusao:
     IF taxa < (baseline * 0.85):  // 15% abaixo
       enviaremail(gestor, "Alerta: Taxa de conclusão baixa")
   
   check TarefasAtrasadas:
     IF count > 5:
       notificar(app, "Alerta: 5+ tarefas atrasadas")
   
   check SLARisco:
     FOR cada tarefa:
       IF (dataVencimento - hoje) < 2 horas AND status <> Concluído:
         email(gestor + responsavel, "SLA em risco")

6. Export:
   
   Botão [Exportar PDF]:
   - Gera PDF com: KPIs + gráficos + tabela
   - Rodapé: data/hora de geração
   - Espaço para assinatura (gestor)
   
   Botão [Enviar por Email]:
   - Dialog: [Para: ...@empresa.com]
   - Anexa PDF
   - Envia relatório
   
   Botão [Copiar Link]:
   - Gera URL única: /relatório/123abc
   - Válida por 7 dias
   - Compartilhável

FLUXO:

Gestor abre Relatório (segunda-feira):
1. Acessa TAREFAS > Relatório de Produtividade
2. Período: "Esta Semana" (pré-selecionado)
3. Vê KPIs: Taxa 68%, Tempo 2.3d, SLA 92%
4. Gráfico mostra: Seg 8, Ter 10, Qua 9 tarefas/dia
5. Tabela mostra: João 110%, Maria 85%, Pedro 105%
6. Clica em Maria (85%): quer entender por quê
7. Expandir linha: mostra tarefas de Maria (filtro aplicado)
8. "Ah, ela tinha 3 tarefas críticas bloqueadas"
9. Clica [Exportar PDF]
10. Envia para seu chefe com análise

SUCESSO QUANDO:
- Gestor abre relatório em < 2 segundos
- Números são reais (não mockados)
- Gráficos respondem ao filtro de período
- Pode exportar para apresentar em reunião
- Alertas chegam por email/app quando problemas
- Tendência anterior é calculada automaticamente
```

---

## 📋 RESUMO EXECUTIVO - IMPLEMENTAÇÃO

### Mapa de Implementação

```
PRIORIDADE 1 (CRÍTICA - Semanas 1-2)
================================
□ Problema #1: JOTA Contextual na Tarefa
  └─ Impacto: Operador resolve 40% mais rápido
  └─ Esforço: 16h
  └─ Dependências: Nenhuma (usa JOTA existente)

□ Problema #6: Favoritos para SQL
  └─ Impacto: Operador reutiliza query em 1 clique
  └─ Esforço: 8h
  └─ Dependências: Nenhuma (localStorage)

PRIORIDADE 2 (ALTA - Semanas 2-3)
================================
□ Problema #3: Kanban com Drag-and-Drop
  └─ Impacto: UX 100% melhor, operador move tarefa visualmente
  └─ Esforço: 24h
  └─ Dependências: CDK já instalado

□ Problema #4: RAG Chat Integrado
  └─ Impacto: Operador aprende e resolve na mesma tela
  └─ Esforço: 20h
  └─ Dependências: #1 (JOTA Contextual)

PRIORIDADE 3 (MÉDIA - Semanas 4)
================================
□ Problema #2: Admin Dashboard Fusionado
  └─ Impacto: Gestor vê tudo em 1 tela
  └─ Esforço: 20h
  └─ Dependências: #3 (Kanban com D&D)

□ Problema #5: Kanban para Gestor
  └─ Impacto: Gestor acompanha equipe real-time
  └─ Esforço: 16h
  └─ Dependências: #3, #2

□ Problema #7: Reorganizar Sidebar
  └─ Impacto: Novo usuário entende diferença
  └─ Esforço: 12h
  └─ Dependências: Nenhuma (refactor visual)

PRIORIDADE 4 (COMPLEMENTAR - Semana 4)
======================================
□ Problema #8: Relatório de SLA/Produtividade
  └─ Impacto: Gestor tem dados para decisões
  └─ Esforço: 16h
  └─ Dependências: #2 (métricas agregadas)
```

### Timeline de 4 Semanas

```
SEMANA 1
========
SEG: Problema #1 (JOTA Contextual)
    - ChatContextoService
    - Integração no modal de tarefa
    - Testes unitários

TER: Problema #1 (continuação) + #6 (Favoritos)
    - DatabaseFavoritosService
    - UI: Favoritos dropdown
    - Histórico de queries

QUA: Problema #6 (continuação)
    - Tags para organizar
    - Teste E2E: salvar + recuperar + executar

QUI: Problema #3 (Kanban D&D)
    - Implementar CDK drop zones
    - Movimento visual
    - Cores por prioridade (50%)

SEX: Problema #3 (continuação)
    - SLA indicator
    - Filtros (responsável, prioridade)
    - Testes

SEMANA 2
========
SEG: Problema #4 (RAG Chat Integrado)
    - Aba "Conhecimento do Setor"
    - 4 sub-abas (Base + Fraseologias + Procedimentos + FAQ)
    - Search integrado

TER-QUA: Problema #4 (continuação)
    - Integração com JOTA
    - Cache de documentos
    - Filtro por setor

QUI: Problema #3 Final
    - Ajustes de D&D
    - Performance (virtualization se necessário)
    - Mobile responsivo

SEX: Testes Integrados
    - JOTA + Kanban + Chat
    - Verificação de fluxos completos

SEMANA 3
========
SEG-TER: Problema #2 (Admin Dashboard Fusionado)
    - Estrutura de abas (não navegam)
    - KPIs layout
    - Alertas críticos

QUA-QUI: Problema #5 (Kanban para Gestor)
    - Agrupamento por responsável
    - Filtros de gestor
    - Reatribuição
    - Painel de métricas

SEX: Problema #7 (Reorganizar Sidebar)
    - Renomear seções (RESOLVER vs EXECUTAR)
    - Onboarding com role
    - Filtrar por role

SEMANA 4
========
SEG-TER: Problema #8 (Relatório SLA)
    - Cálculo de métricas
    - Gráficos (evolução, produtividade, distribuição)
    - Tabela de atrasados

QUA: Problema #8 (continuação)
    - Export PDF
    - Email
    - Alertas automáticos

QUI-SEX: QA + Ajustes
    - Testes de performance
    - Correções finais
    - Deploy em staging
```

### Dependências Técnicas

```
Existentes (não criar):
✅ Angular 18 (já usando)
✅ Bootstrap 5.3 (já usando)
✅ CDK (drag-drop, já instalado)
✅ AnythingLLM (já integrado)
✅ /api/rag-proxy/chat (já existe)
✅ localStorage (browser native)

Novas (criar/integrar):
⚠️ RelatorioService (novo)
⚠️ AlertasService (novo)
⚠️ ConhecimentoSetorComponent (novo)
⚠️ RelatorioComponent (novo)

Existentes que refatorar:
🔄 KanbanComponent → separar em KanbanSetorComponent (D&D)
🔄 AdminDashboardComponent → fusionar com kanban (abas)
🔄 SidebarComponent → reorganizar (roles)
```

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

**Ação 1: Validar Prioridades com Time**
```
Reunião com stakeholders:
- Operador: Quer mais JOTA contextual ou D&D no kanban?
- Gestor: Quer relatório SLA ou admin dashboard fusionado?
- Admin: Tem constraintss técnicos que não mencionei?

Ajustar roadmap baseado no feedback.
```

**Ação 2: Setup da Implementação**
```
1. Criar branch: feature/melhorias-central-op-v3
2. Adicionar 4 labels no Jira:
   - problema-1-jota-contextual
   - problema-3-kanban-dnd
   - problema-2-admin-fusionado
   - problema-8-relatorio-sla
3. Estimar (em planning poker)
4. Começar Sprint 1
```

**Ação 3: Comunicação com Usuários**
```
Anúncio na Central de Operação:
"Preparamos novidades para vocês! Nos próximos 4 sprints
você vai poder:
✅ Arrastar tarefas no kanban (sem modal)
✅ Fazer perguntas sobre tarefas (JOTA contextual)
✅ Salvar queries SQL como favorito
✅ Acompanhar equipe em um só lugar (gestor)

Estreia: próxima quarta-feira"
```

---

**Documento Completo:** Todos os 8 problemas com lógica + prompts entregues ✅