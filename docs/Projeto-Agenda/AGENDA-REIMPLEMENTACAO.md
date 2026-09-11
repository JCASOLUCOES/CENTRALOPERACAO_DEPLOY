# Documentação para Reimplementação da Agenda

> **Status**: Feature removida por quebrar o sistema como um todo
> **Commit de referência**: `5e8b5ab` (feat: Agenda V1) até `c3fec9c` (fix: header dropdown)
> **Data da remoção**: 10/09/2026
> **Rollback para**: `8956c57` (fix: login 500 em produção)

---

## Resumo da Feature Original

A Agenda V1 era um módulo completo de calendário com:
- **FullCalendar** (v6+) com suporte a drag & drop
- Filtros avançados (data, participante, status, tipo)
- Gestão de participantes (convidados, obrigatórios, opcionais)
- Overlay de loading customizado
- Estilização de selects nativos e botão "Limpar filtros"
- Integração com perfis de usuário e auditoria

---

## Commits Envolvidos (em ordem cronológica)

| Commit | Hash | Tipo | Descrição |
|--------|------|------|-----------|
| 1 | `5e8b5ab` | `feat` | **Módulo principal** — Agenda V1 com FullCalendar, drag&drop, filtros avançados, participantes |
| 2 | `57976b0` | `docs` | Registra aplicação das migrations `AddAgendaAndPerfis` / `AddAuditoria` em homolog |
| 3 | `214c1b0` | `fix` | Correção CSS FullCalendar e overlay de loading |
| 4 | `c0c002e` | `fix` | Estilização dos filtros (selects nativos) e botão Limpar |
| 5 | `c3fec9c` | `fix` | Header dropdown - z-index, positioning e dark mode |

---

## Migrations de Banco de Dados

> ⚠️ **Já aplicadas em produção** — tabelas órfãs mantidas por decisão

| Migration | Tabelas Criadas | Status |
|-----------|-----------------|--------|
| `AddAgendaAndPerfis` | `CC_Agenda`, `CC_AgendaParticipante`, `CC_Perfil` | ✅ Aplicada |
| `AddAuditoria` | `CC_Auditoria` | ✅ Aplicada |

**Tabelas órfãs atuais** (não usadas pelo código pós-rollback):
- `CC_Agenda`
- `CC_AgendaParticipante`
- `CC_Perfil` (se não usada por outros módulos)
- `CC_Auditoria`

---

## Dependências Adicionadas (package.json)

```json
{
  "@fullcalendar/angular": "^6.x",
  "@fullcalendar/core": "^6.x",
  "@fullcalendar/daygrid": "^6.x",
  "@fullcalendar/interaction": "^6.x",
  "@fullcalendar/timegrid": "^6.x",
  "@fullcalendar/list": "^6.x"
}
```

**Backend**: Nenhuma dependência nova (usa EF Core existente).

---

## Arquivos Principais Afetados

### Frontend (`frontend/src/app/features/agenda/`)
```
agenda/
├── agenda.component.ts
├── agenda.component.html
├── agenda.component.scss
├── agenda.routes.ts
├── services/
│   ├── agenda.service.ts
│   └── agenda-participante.service.ts
├── models/
│   ├── agenda.model.ts
│   └── agenda-participante.model.ts
└── components/
    ├── agenda-filtros.component.ts
    ├── agenda-calendario.component.ts
    └── agenda-participantes.component.ts
```

### Backend (`backend/src/Central_BackEnd/`)
```
Controllers/
├── AgendaController.cs
└── AgendaParticipanteController.cs

Models/
├── Agenda.cs
├── AgendaParticipante.cs
└── Perfil.cs

Migrations/
├── 20260910..._AddAgendaAndPerfis.cs
└── 20260910..._AddAuditoria.cs

Services/
└── AgendaService.cs
```

---

## Problemas Identificados (Motivo da Remoção)

1. **Quebra sistêmica**: Conflitos de CSS/JS afetaram outras funcionalidades (header, dropdowns, dark mode)
2. **Performance**: FullCalendar carregava recursos pesados em todas as rotas
3. **Z-index/Positioning**: Conflitos com header dropdown e modais existentes
4. **Dark mode**: Estilos do FullCalendar não respeitavam variáveis CSS do tema
5. **Bundle size**: Aumento significativo do bundle principal

---

## Checklist para Reimplementação Segura

### Planejamento
- [ ] Criar branch dedicada: `feature/agenda-v2` a partir de `developer`
- [ ] Definir escopo mínimo (MVP): apenas calendário + CRUD básico
- [ ] Avaliar alternativas ao FullCalendar (ex: calendário nativo mais leve)

### Arquitetura
- [ ] **Lazy loading obrigatório**: Módulo Agenda carregado apenas sob demanda
- [ ] **Isolamento de estilos**: CSS Modules ou Shadow DOM para FullCalendar
- [ ] **Feature flag**: Toggle para habilitar/desabilitar Agenda sem deploy
- [ ] **Testes de regressão**: Suite automatizada para header, auth, dark mode

### Banco de Dados
- [ ] Reutilizar tabelas órfãs existentes (`CC_Agenda`, `CC_AgendaParticipante`)
- [ ] Verificar se `CC_Perfil` conflita com outros módulos
- [ ] Criar migration de ajuste (não recriar tabelas)

### Frontend
- [ ] Remover dependências FullCalendar do bundle principal
- [ ] Implementar carregamento dinâmico (`import()`) do FullCalendar
- [ ] Testar dark mode com variáveis CSS customizadas
- [ ] Validar z-index em todos os breakpoints

### Backend
- [ ] Controllers com autorização por perfil
- [ ] Validação de conflitos de horário
- [ ] Auditoria automática (reutilizar `CC_Auditoria`)

### Deploy & QA
- [ ] Testar em homolog **isolado** antes de merge em `developer`
- [ ] Smoke test: login, header, navegação, dark mode
- [ ] Performance: medir bundle size antes/depois
- [ ] Rollback plan documentado

---

## Branches de Backup Disponíveis

| Branch | Commit | Descrição |
|--------|--------|-----------|
| `backup-master-pre-agenda-rollback` | `c3fec9c` | Master completo com Agenda (HEAD antes do rollback) |
| `backup-developer-pre-monorepo` | `a05359e` | Developer no estado submodules (pré-monorepo) |

**Para restaurar código da Agenda**:
```bash
git checkout backup-master-pre-agenda-rollback -- frontend/src/app/features/agenda backend/src/Central_BackEnd/Controllers/AgendaController.cs ...
```

---

## Observações Finais

- **Não reimplementar sobre o código atual** — base limpa em `8956c57` é intencional
- **Priorizar estabilidade do core** (login, header, navegação, dark mode) sobre features novas
- **Considerar micro-frontend ou iframe** se isolamento de CSS/JS for crítico
- **Documentar decisões** neste arquivo conforme evoluir o planejamento

---

*Documento gerado automaticamente durante rollback de 10/09/2026*