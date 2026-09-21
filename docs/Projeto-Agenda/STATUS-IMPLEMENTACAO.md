# Status de Implementação da Agenda — Central de Operação

> **Última atualização**: 11/09/2026  
> **Versão**: MVP (v1.0.0)  
> **Branch base**: `developer` → `feature/agenda-mvp` (a criar)

---

## 📋 Resumo Executivo

Implementação completa do **MVP da Agenda** (calendário interno, CRUD de eventos, 3 visualizações, filtro por responsável) seguindo a arquitetura existente da Central de Operação (Angular 18 + .NET 8 + SQL Server).

**Status geral**: ✅ **Código 100% pronto** | ⏳ **Deploy em homologação pendente** (senha do servidor)

---

## ✅ O que foi Implementado

### **Backend (.NET 8 - ASP.NET Core)**

| Componente | Arquivo | Status |
|------------|---------|--------|
| **Migration EF Core** | `Migrations/20260911215943_AgendaV2_Ajuste.cs` | ✅ |
| **Model: TipoEvento** | `Models/Implantacao/TipoEvento.cs` | ✅ |
| **Model: AgendaParticipante** | `Models/Implantacao/AgendaParticipante.cs` | ✅ |
| **Model: AgendaItem (atualizado)** | `Models/Implantacao/AgendaItem.cs` | ✅ |
| **DTOs MVP** | `Dtos/Implantacao/AgendaDtos.cs` | ✅ |
| **Service: IAgendaService/AgendaService** | `Services/Implantacao/AgendaService.cs` | ✅ |
| **Controller: AgendaController** | `Controllers/AgendaController.cs` | ✅ |
| **AppDbContext (DbSets + Relacionamentos)** | `Data/AppDbContext.cs` | ✅ |
| **Seed Development (6 tipos)** | `Program.cs` (linhas 648-660) | ✅ |
| **Seed Eventos com TipoId** | `Program.cs` (linhas 662-780) | ✅ |

#### **Migration `AgendaV2_Ajuste` Cria:**
- Tabela `CC_TipoEvento` (Id, Nome, Cor, Ativo) + seed de 6 tipos
- Tabela `CC_AgendaParticipante` (Id, AgendaId, ParticipanteId, CriadoEm)
- Coluna `AGD_TipoId` (FK → `CC_TipoEvento`) em `IMPL_Agenda`
- Índices únicos e FKs configuradas

#### **Endpoints REST (`/api/v1/agenda`):**
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/eventos?inicio=&fim=&responsavelId=` | Lista eventos no período |
| GET | `/eventos/{id}` | Detalhe do evento |
| POST | `/eventos` | Cria evento |
| PUT | `/eventos/{id}` | Atualiza evento |
| DELETE | `/eventos/{id}` | Exclui evento (hard delete) |
| PATCH | `/eventos/{id}/mover` | Move evento (drag&drop futuro) |
| GET | `/tipos` | Lista 6 tipos de evento |
| GET | `/operadores` | Lista operadores ativos |

#### **Segurança & Qualidade:**
- `[Authorize]` + `[EnableRateLimiting("validacao")]` (100 req/min em Dev, 5 em Prod)
- Error handling genérico (sem stack trace)
- Validações server-side: título obrigatório, data fim > início, tipo válido, responsável ativo

---

### **Frontend (Angular 18 - Standalone + SSR)**

| Componente | Arquivo | Status |
|------------|---------|--------|
| **Service: AgendaService** | `features/agenda/services/agenda.service.ts` | ✅ |
| **Component: AgendaComponent** | `features/agenda/agenda.component.ts` | ✅ |
| **Component: AgendaEventoModal** | `features/agenda/agenda-evento-modal.component.ts` | ✅ |
| **Template: AgendaComponent** | `features/agenda/agenda.component.html` | ✅ |
| **Template: Modal** | `features/agenda/agenda-evento-modal.component.html` | ✅ |
| **Styles: AgendaComponent** | `features/agenda/agenda.component.scss` | ✅ |
| **Styles: Modal** | `features/agenda/agenda-evento-modal.component.scss` | ✅ |
| **Models TypeScript** | `features/agenda/models/agenda.model.ts` | ✅ |

#### **Funcionalidades MVP:**
- ✅ 3 visualizações: **Dia**, **Semana**, **Mês**
- ✅ Navegação temporal: **Anterior**, **Próximo**, **Hoje**
- ✅ CRUD completo via modal: Criar, Editar, Excluir
- ✅ Filtro por **Responsável** (dropdown + botão limpar)
- ✅ Legenda dinâmica de tipos (cores do backend `CC_TipoEvento.Cor`)
- ✅ Tema **Dark/Light** via variáveis CSS (`var(--surface-main)`, etc.)
- ✅ RxJS cleanup: `takeUntil(destroy$)` em todos subscriptions
- ✅ `BuscaService.fecharBusca()` no `ngOnInit` e abertura de modal
- ✅ Lazy loading da rota `/agenda` em `features.routes.ts`
- ✅ Link no Sidebar (seção **Início** → ícone `bi-calendar-week-fill`)

#### **Campos do Modal (MVP):**
| Campo | Obrigatório | Tipo |
|-------|-------------|------|
| Título | ✅ | text (max 200) |
| Tipo | ✅ | radio (6 opções com cor) |
| Responsável | ✅ | select (operadores ativos) |
| Data início | ✅ | date |
| Hora início | ✅ | time |
| Data fim | ❌ | date |
| Hora fim | ❌ | time |
| Dia inteiro | ❌ | checkbox |
| Local | ❌ | text (max 200) |
| Descrição | ❌ | textarea |

---

### **Build & Testes Realizados**

| Etapa | Comando | Resultado |
|-------|---------|-----------|
| Backend build | `dotnet build` | ✅ 0 erros |
| Frontend build | `npm run build` | ✅ 0 erros (warnings CSS budget preexistentes) |
| Backend local (InMemory) | `dotnet run` | ✅ Sobe em `http://localhost:1009` |
| Frontend local | `npm start` | ✅ Sobe em `http://localhost:4200` |
| Login API | `POST /auth/login` | ✅ 200 + accessToken + cookie |
| CRUD Eventos | GET/POST/PUT/DELETE/PATCH | ✅ Todos 200/204 |
| Rate limiting Dev | 15 requests consecutivos | ✅ Sem 429 (limite 100/min) |
| Seed eventos | 5 eventos com `TipoId` populado | ✅ `tipoNome`/`tipoCor` retornados |

---

## ⏳ O que Falta (Próximos Passos)

### **1. Deploy em Homologação (Bloqueado por senha)**
```bash
# Aplicar migration no SQL Server homologação
# Servidor: 192.168.2.154 | Database: dbBUSINESS_HML
# Executar: backend/Central_BackEnd/ImplantacaoInit.sql

# Deploy IIS (senha do usuário JCASRV-SUP no 192.168.2.130)
powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1
```

### **2. Documentação Automática (Delegar ao `docs-writer`)**
Após deploy, o agente `docs-writer` deve atualizar:
- `docs/TELAS.md` — Seção **Agenda** (frontend + endpoints)
- `docs/DOCUMENTACAO-COMPLETA.md` — Seção módulo Agenda
- `backend/README.md` — Endpoints Agenda
- `frontend/README.md` — Componente Agenda

### **3. Validações Pós-Deploy**
- [ ] Login `admin`/`admin123` funciona no IIS
- [ ] Rota `/agenda` carrega calendário
- [ ] CRUD persiste no SQL Server (não InMemory)
- [ ] Tema dark/light no calendário
- [ ] Regressão: header, sidebar, outras rotas intactas

---

## 🗂️ Estrutura de Arquivos Alterados

```
backend/Central_BackEnd/
├── Controllers/
│   └── AgendaController.cs                    # NOVO
├── Data/
│   └── AppDbContext.cs                        # MODIFICADO (DbSets + FKs)
├── Dtos/Implantacao/
│   └── AgendaDtos.cs                          # MODIFICADO (MVP DTOs)
├── Migrations/
│   └── 20260911215943_AgendaV2_Ajuste.cs      # NOVO
├── Models/Implantacao/
│   ├── AgendaItem.cs                          # MODIFICADO (TipoId, Participantes)
│   ├── AgendaParticipante.cs                  # NOVO
│   └── TipoEvento.cs                          # NOVO
├── Program.cs                                 # MODIFICADO (Seed + RateLimit Dev)
├── Services/Implantacao/
│   └── AgendaService.cs                       # REESCRITO (MVP)
└── ImplantacaoInit.sql                        # GERADO (script completo)

frontend/src/app/
├── features/agenda/
│   ├── agenda.component.ts                    # MODIFICADO (MVP + RxJS)
│   ├── agenda.component.html                  # MODIFICADO (filtro + legenda dinâmica)
│   ├── agenda.component.scss                  # MODIFICADO (filtro styles)
│   ├── agenda-evento-modal.component.ts       # MODIFICADO (MVP simplificado)
│   ├── agenda-evento-modal.component.html     # MODIFICADO (campos MVP)
│   ├── agenda-evento-modal.component.scss     # MANTIDO
│   ├── models/agenda.model.ts                 # MODIFICADO (interfaces MVP)
│   └── services/agenda.service.ts             # MODIFICADO (nova URL + interfaces)
├── app.routes.ts / features.routes.ts         # MANTIDO (rota /agenda já existia)
└── layout/sidebar/sidebar.component.ts        # MANTIDO (link Agenda já existia)
```

---

## ⚠️ Pontos de Atenção / Dívida Técnica

| Item | Impacto | Mitigação |
|------|---------|-----------|
| **Senha do servidor** | Bloqueia deploy | Confirmar credencial `JCASRV-SUP` |
| **Eventos seed sem TipoId** | 5 eventos antigos não têm `tipoNome`/`tipoCor` | Popular `AGD_TipoId` via script pós-migration |
| **Rate limiting 429 em produção** | 5 req/min por usuário | Monitorar; ajustar se necessário |
| **CSS budget warnings** | 4 componentes > 10KB | Preexistente, não relacionado à Agenda |
| **Hard delete** | `DELETE` remove registro | Futuro: soft delete (`Ativo=0`) |
| **Participantes não implementados no Front** | `ParticipantesIds` vazio no modal | Futuro: multi-select no modal v2 |

---

## 📌 Decisões Arquiteturais

1. **Calendário Custom (sem FullCalendar)** — Evita regressão CSS/JS/z-index/dark mode que causou rollback anterior
2. **Rota `/api/v1/agenda` (não `/implantacao/agenda`)** — Agenda é transversal, não só implantação
3. **Tabela `IMPL_Agenda` mantida** — Migration já em produção; nova `CC_TipoEvento` separa domínio
4. **MVP sem: visibilidade, recorrência, projeto, cor custom, participantes** — Foco em estabilidade
5. **InMemory em Dev / SQL Server em Prod** — `Program.cs` usa `IsDevelopment()` para alternar

---

## 🔗 Referências

- **Plano original**: `docs/Projeto-Agenda/AgendaProjeto.md`
- **Rollback anterior**: `docs/Projeto-Agenda/AGENDA-REIMPLEMENTACAO.md`
- **Diagnóstico fase 0**: `docs/Diagnostico-Agenda.md`
- **Migration script**: `backend/Central_BackEnd/ImplantacaoInit.sql`

---

*Documento gerado automaticamente durante implementação. Atualizar conforme progresso do deploy.*