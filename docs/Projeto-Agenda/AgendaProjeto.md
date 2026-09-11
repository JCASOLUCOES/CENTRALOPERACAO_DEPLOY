📋 PROJETO DE IMPLANTAÇÃO DA AGENDA — ESTRUTURA POR FASES

Formato: Documento completo para submeter ao Claude Code.
Estruturado em fases sequenciais com tarefas, critérios e não-fazer.

📑 ÍNDICE
Visão Geral
Contexto do Projeto
Fases de Implementação
FASE 0: Pré-requisitos & Diagnóstico
FASE 1: Setup & Configuração
FASE 2: Backend — API Endpoints
FASE 3: Frontend — Componente & Template
FASE 4: Frontend — Template HTML & Modal
FASE 5: Integração — Service Frontend
FASE 6: Roteamento & Navegação
FASE 7: Testes & Validação
FASE 8: Documentação & Finalização
Checklist Final de Aceite
🎯 Visão Geral
Objetivo Geral

Implementar uma Agenda funcional, integrada e persistente na Central de Operação Actyon, seguindo os padrões de arquitetura, segurança e UX do projeto existente.

Escopo
Agenda interna (sem integrações externas)
Suporte a múltiplos usuários
CRUD completo (Criar, Ler, Atualizar, Excluir)
Drag-and-drop de eventos
Redimensionamento de eventos
Filtros por responsável e tipo
Tipos de evento: Reunião, Daily, Treinamento, Atendimento, Pessoal, Outro
Visualizações: Dia, Semana, Mês
Navegação (Anterior, Próximo, Hoje)
Tecnologias
Frontend: Angular 18 (standalone components, lazy loading, SSR)
Backend: .NET 8 (Web API versionada, EF Core, rate limiting)
Banco de Dados: SQL Server (tabelas CC_Agenda, CC_AgendaParticipante, CC_TipoEvento)
Calendário: FullCalendar v6.1.x
Autenticação: JWT Bearer [Authorize]
📌 Contexto do Projeto
Arquitetura Existente

Frontend:

Angular 18 standalone components
Lazy loading com loadComponent e dynamic imports
Bootstrap 5 + ng-bootstrap 17
BEM CSS conventions
Tema escuro via [data-theme="dark"]
RxJS com takeUntil pattern
BuscaService para estado global de busca
Interceptor com withCredentials: true
Guard de rotas com refresh silencioso

Backend:

.NET 8 Web API
EF Core com SQL Server
Versionamento de API /api/v{version:apiVersion}/
Rate limiting: login 5/min IP, validação 5/min usuário
[Authorize] em endpoints autenticados
Soft delete (Ativo bit)
Auditoria: CriadoEm, CriadoPor, AlteradoEm, AlteradoPor
AutoMapper para DTOs
Tratamento de erros com mensagens genéricas

Banco de Dados:

dbBUSINESS_HML (produção)
Tabelas legadas: TBOPERADOR, TBFUNCIONARIO, TBFUNCAO
Tabelas do sistema: RefreshTokens, AuditoriaAcessos
Tabelas do módulo IMPLANTAÇÃO: IMPL_* (9 tabelas)
Padrões a Seguir
Componentes: standalone com imports: [...]
RxJS: sempre usar takeUntil(this.destroy$) e cleanup em ngOnDestroy
Banco de Dados: soft delete, auditoria em inserts/updates
API: versionamento, [Authorize], validações server-side
Erros: genéricos, sem stack trace exposto
Segurança: rate limiting, SQL parametrizado, SameSite cookies
Lazy Loading: não importar modelos no main bundle
Estilos: importar CSS globalmente em styles.scss
Status Atual
Agenda existente removida no rollback de 10/09/2026 (commit 8956c57)
Tabelas órfãs no banco: IMPL_Agenda, IMPL_MembroPerfil (não usar)
Sem endpoints /api/v1/agenda/* ativos
FullCalendar possivelmente instalado, mas estilos não carregados
Problema visual: textos crus ("PrevNext", "Today", "MonthWeekDay")
Problema interativo: possível overlay invisível bloqueando cliques
🔄 Fases de Implementação
✅ FASE 0: PRÉ-REQUISITOS & DIAGNÓSTICO

Duração: 1 dia
Objetivo: Confirmar estado atual e identificar bloqueadores.

Tarefas
 Verificar instalação FullCalendar
bash
  npm list @fullcalendar
Se não instalado: serão necessários pacotes core, angular, daygrid, timegrid, interaction
Se instalado: verificar versão (recomendado v6.1.x)
Registrar versão no deliverable
 Diagnosticar importação CSS
Abrir frontend/src/styles.scss
Procurar por @import '@fullcalendar
Se não existir: bloqueador crítico (estilos não carregam)
Procurar por sobrescrita de classes .fc-*, .fc-toolbar, .fc-button
Procurar por regras que possam esconder elementos (.fc { display: none }, etc)
Registrar todos os achados
 Verificar tipo de componente Agenda
Abrir frontend/src/app/wiki/pages/agenda/agenda.component.ts
Procurar por standalone: true?
Se standalone: false: será necessário refatorar
Verificar imports: [...]
Registrar status
 Validar banco de dados
sql
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_NAME LIKE 'IMPL_Agenda%' OR TABLE_NAME LIKE 'IMPL_MembroPerfil%';
Tabelas órfãs existem?
Se sim: recomendação: criar novas com prefixo CC_ (não reutilizar órfãs)
Se não: criar do zero com prefixo CC_
Registrar decisão
 Verificar endpoints ativos
No backend, procurar por AgendaController.cs
Verificar se existe e está ativo
Se não: será necessário criar
Se sim: verificar se respeita versionamento /api/v{version}
Registrar estado
 Validar dados de teste
Em backend/Program.cs: procurar por seed de eventos
Se não existe: será necessário criar para testes
Registrar necessidade
Critérios de Aceite
 Documento "Diagnóstico-Agenda.md" criado com:
Estado do FullCalendar (versão, instalado/não instalado)
Problemas CSS identificados
Status do banco (tabelas órfãs, decisão)
Status dos endpoints
Recomendações claras de approach
 Nenhum bloqueador deixado sem documentação
Não Fazer
❌ Não instalar pacotes ainda (apenas diagnosticar)
❌ Não alterar código sem documentar primeiro
❌ Não assumir que tabelas órfãs serão reutilizadas
❌ Não criar endpoints sem revisão do diagnóstico
Deliverable
frontend/
  └─ docs/
      └─ Diagnostico-Agenda.md

backend/
  └─ docs/
      └─ Diagnostico-Agenda.md
🔧 FASE 1: SETUP & CONFIGURAÇÃO

Duração: 1-2 dias
Objetivo: Preparar ambiente, dependências e banco de dados.

1.1 Frontend — Dependências

Tarefas:

 Instalar FullCalendar (se resultado do diagnóstico indicar necessidade)
bash
  cd frontend
  npm install @fullcalendar/core @fullcalendar/angular @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
  npm install --save-dev @types/fullcalendar
 Adicionar imports CSS em src/styles.scss
Se já existem: validar que estão no lugar certo
Se não existem: adicionar ANTES de outras importações:
scss
    // FullCalendar Global Styles
    @import '@fullcalendar/core/index.global.css';
    @import '@fullcalendar/daygrid/index.global.css';
    @import '@fullcalendar/timegrid/index.global.css';
Verificar que não há regra sobrescrevendo .fc-*
Se houver: comentar ou remover
 Criar arquivo src/app/wiki/pages/agenda/agenda.styles.scss
Estilos customizados (integração com Central)
Importar em componente via styleUrls: ['./agenda.styles.scss']
Garantir que classes .fc-button, .fc-toolbar herdam tema (claro/escuro)
1.2 Backend — Banco de Dados

Tarefas:

 Criar migration EF Core: 20260911_AgendaV2.cs
bash
  cd backend/Central_BackEnd
  dotnet ef migrations add AgendaV2
Gerar arquivo em Migrations/20260911_AgendaV2.cs
Tabelas a criar: CC_TipoEvento:
Id (int identity PK)
Nome (nvarchar(50) unique)
Cor (nvarchar(7) nullable, hex color)
Ativo (bit default 1)
CC_Agenda:
Id (int identity PK)
Titulo (nvarchar(200) not null)
TipoId (int FK → CC_TipoEvento)
ResponsavelId (nvarchar(15) FK → TBOPERADOR)
DataInicio (datetime2 not null)
DataFim (datetime2 not null)
Local (nvarchar(200) nullable)
Descricao (nvarchar(max) nullable)
Ativo (bit default 1)
CriadoEm (datetime2 default getdate())
CriadoPor (nvarchar(15) not null)
AlteradoEm (datetime2 nullable)
AlteradoPor (nvarchar(15) nullable)
CC_AgendaParticipante:
Id (int identity PK)
AgendaId (int FK → CC_Agenda)
ParticipanteId (nvarchar(15) FK → TBOPERADOR)
CriadoEm (datetime2 default getdate())
Índices:
CC_Agenda: (ResponsavelId, DataInicio, DataFim)
CC_Agenda: (Ativo, DataInicio)
CC_AgendaParticipante: (AgendaId, ParticipanteId)
 Executar migration
bash
  dotnet ef database update
Validar criação das tabelas no SQL Server
sql
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_NAME LIKE 'CC_%' AND TABLE_NAME LIKE '%Agenda%';
 Seed de tipos de evento
Em Program.cs, adicionar no seeder:
csharp
    if (env.IsDevelopment())
    {
        context.TiposEvento.AddRange(
            new TipoEvento { Nome = "Reunião", Cor = "#0f4c81", Ativo = true },
            new TipoEvento { Nome = "Daily", Cor = "#7c3aed", Ativo = true },
            new TipoEvento { Nome = "Treinamento", Cor = "#059669", Ativo = true },
            new TipoEvento { Nome = "Atendimento", Cor = "#d97706", Ativo = true },
            new TipoEvento { Nome = "Pessoal", Cor = "#8b5cf6", Ativo = true },
            new TipoEvento { Nome = "Outro", Cor = "#6b7280", Ativo = true }
        );
        context.SaveChanges();
    }
1.3 Backend — Models & Context

Tarefas:

 Criar model: Models/Agenda.cs
Propriedades: Id, Titulo, TipoId, ResponsavelId, DataInicio, DataFim, Local, Descricao, Ativo, CriadoEm, CriadoPor, AlteradoEm, AlteradoPor
Validações: [Required], [MaxLength(200)] para Titulo
Relações: public TipoEvento Tipo { get; set; }, public Operador Responsavel { get; set; }, public List<AgendaParticipante> Participantes { get; set; }
 Criar model: Models/AgendaParticipante.cs
Propriedades: Id, AgendaId, ParticipanteId, CriadoEm
ForeignKeys: AgendaId → Agenda, ParticipanteId → Operador
 Criar model: Models/TipoEvento.cs
Propriedades: Id, Nome, Cor, Ativo
Validações: [Required], [MaxLength(50)]
 Adicionar DbSets ao AppDbContext.cs
csharp
  public DbSet<Agenda> Agendas { get; set; }
  public DbSet<AgendaParticipante> AgendaParticipantes { get; set; }
  public DbSet<TipoEvento> TiposEvento { get; set; }
 Configurar relações em OnModelCreating
csharp
  modelBuilder.Entity<Agenda>()
      .HasOne(a => a.Tipo)
      .WithMany()
      .HasForeignKey(a => a.TipoId)
      .OnDelete(DeleteBehavior.Restrict);

  modelBuilder.Entity<Agenda>()
      .HasOne(a => a.Responsavel)
      .WithMany()
      .HasForeignKey(a => a.ResponsavelId)
      .OnDelete(DeleteBehavior.Restrict);

  modelBuilder.Entity<AgendaParticipante>()
      .HasOne<Agenda>()
      .WithMany(a => a.Participantes)
      .HasForeignKey(ap => ap.AgendaId)
      .OnDelete(DeleteBehavior.Cascade);
1.4 Backend — DTOs & Mapping

Tarefas:

 Criar DTO: DTOs/CreateAgendaRequest.cs
csharp
  public class CreateAgendaRequest
  {
      [Required]
      [MaxLength(200)]
      public string Titulo { get; set; }

      [Required]
      public int TipoId { get; set; }

      [Required]
      [MaxLength(15)]
      public string ResponsavelId { get; set; }

      [Required]
      public DateTime DataInicio { get; set; }

      [Required]
      public DateTime DataFim { get; set; }

      [MaxLength(200)]
      public string Local { get; set; }

      public string Descricao { get; set; }

      public List<string> ParticipantesIds { get; set; } = new();
  }
 Criar DTO: DTOs/UpdateAgendaRequest.cs (mesmo que CreateAgendaRequest)
 Criar DTO: DTOs/AgendaResponse.cs
csharp
  public class AgendaResponse
  {
      public int Id { get; set; }
      public string Titulo { get; set; }
      public TipoEventoResponse Tipo { get; set; }
      public OperadorResponse Responsavel { get; set; }
      public DateTime DataInicio { get; set; }
      public DateTime DataFim { get; set; }
      public string Local { get; set; }
      public string Descricao { get; set; }
      public List<OperadorResponse> Participantes { get; set; }
      public bool Ativo { get; set; }
      public DateTime CriadoEm { get; set; }
      public string CriadoPor { get; set; }
  }
 Criar DTO: DTOs/TipoEventoResponse.cs
csharp
  public class TipoEventoResponse
  {
      public int Id { get; set; }
      public string Nome { get; set; }
      public string Cor { get; set; }
  }
 Criar DTO: DTOs/OperadorResponse.cs (simplificado)
csharp
  public class OperadorResponse
  {
      public string Id { get; set; }
      public string Nome { get; set; }
      public string Email { get; set; }
  }
 Criar AutoMapper profile: Profiles/AgendaMappingProfile.cs
csharp
  public class AgendaMappingProfile : Profile
  {
      public AgendaMappingProfile()
      {
          CreateMap<Agenda, AgendaResponse>()
              .ForMember(d => d.Tipo, opt => opt.MapFrom(s => s.Tipo))
              .ForMember(d => d.Responsavel, opt => opt.MapFrom(s => s.Responsavel))
              .ForMember(d => d.Participantes, opt => opt.MapFrom(s => s.Participantes.Select(p => new OperadorResponse 
              { 
                  Id = p.ParticipanteId,
                  Nome = "Participante" // será populado pelo join
              })));

          CreateMap<TipoEvento, TipoEventoResponse>();
          CreateMap<Operador, OperadorResponse>();
      }
  }
Critérios de Aceite
 FullCalendar instalado (se necessário)
 Imports CSS adicionados em styles.scss
 Migration criada e executada com sucesso
 Tabelas CC_Agenda, CC_AgendaParticipante, CC_TipoEvento criadas no banco
 Tipos de evento seedados (6 tipos: Reunião, Daily, Treinamento, Atendimento, Pessoal, Outro)
 Models criados com validações
 DTOs criados
 AutoMapper configurado
 dotnet build sem erros
 npm install sem erros
Não Fazer
❌ Não criar endpoints ainda
❌ Não criar componente Angular
❌ Não fazer seed de eventos fakes (apenas tipos)
❌ Não alterar tabelas órfãs
❌ Não usar prefixo IMPL_ para novas tabelas
Deliverable
backend/
  ├─ Migrations/
  │   └─ 20260911_AgendaV2.cs
  ├─ Models/
  │   ├─ Agenda.cs
  │   ├─ AgendaParticipante.cs
  │   └─ TipoEvento.cs
  ├─ DTOs/
  │   ├─ CreateAgendaRequest.cs
  │   ├─ UpdateAgendaRequest.cs
  │   ├─ AgendaResponse.cs
  │   ├─ TipoEventoResponse.cs
  │   └─ OperadorResponse.cs
  ├─ Profiles/
  │   └─ AgendaMappingProfile.cs
  └─ AppDbContext.cs (atualizado)

frontend/
  ├─ src/
  │   └─ styles.scss (atualizado com imports CSS)
  └─ src/app/wiki/pages/agenda/
      └─ agenda.styles.scss

docs/
  └─ FASE-1-SETUP-CHECKLIST.md
📡 FASE 2: BACKEND — API ENDPOINTS

Duração: 2 dias
Objetivo: Criar endpoints RESTful com validações e segurança.

2.1 Service — Lógica de Negócio

Tarefas:

 Criar Services/AgendaService.cs
Injetar: IDbContextFactory<AppDbContext>, IMapper, IHttpContextAccessor, ILogger<AgendaService>
Método: ListarEventosAsync(DateTime inicio, DateTime fim, string responsavelId = null)
Buscar apenas período especificado (não todos historicamente)
.Where(a => a.Ativo && a.DataInicio < fim && a.DataFim > inicio)
Filtrar por responsável se fornecido
.Include(a => a.Tipo).Include(a => a.Responsavel).Include(a => a.Participantes)
.OrderBy(a => a.DataInicio)
Return: List<AgendaResponse>
Método: CriarEventoAsync(CreateAgendaRequest request, string usuarioId)
Validações:
string.IsNullOrWhiteSpace(request.Titulo) → ArgumentException("Título é obrigatório")
request.DataFim <= request.DataInicio → ArgumentException("Data final deve ser maior que data inicial")
Tipo válido: TiposEvento.Any(t => t.Id == request.TipoId) → ArgumentException("Tipo inválido")
Responsável válido: Operadores.Any(o => o.OPERADOR_ID == request.ResponsavelId && o.SE_ATIVO == 'S') → ArgumentException("Responsável inválido")
Criar evento:
csharp
      var evento = new Agenda
      {
          Titulo = request.Titulo,
          TipoId = request.TipoId,
          ResponsavelId = request.ResponsavelId,
          DataInicio = request.DataInicio,
          DataFim = request.DataFim,
          Local = request.Local,
          Descricao = request.Descricao,
          Ativo = true,
          CriadoEm = DateTime.UtcNow,
          CriadoPor = usuarioId
      };
- **Adicionar participantes** (se fornecido):
csharp
      if (request.ParticipantesIds?.Any() == true)
      {
          evento.Participantes = request.ParticipantesIds
              .Select(id => new AgendaParticipante { ParticipanteId = id })
              .ToList();
      }
- `_context.Agendas.Add(evento)` → `SaveChangesAsync()`
- Return: `_mapper.Map<AgendaResponse>(evento)`
Método: AtualizarEventoAsync(int id, UpdateAgendaRequest request, string usuarioId)
Buscar evento: FindAsync(id) ou FirstOrDefaultAsync(a => a.Id == id)
Se não existe: NotFoundException("Evento não encontrado")
Atualizar campos:
csharp
      evento.Titulo = request.Titulo;
      evento.TipoId = request.TipoId;
      evento.ResponsavelId = request.ResponsavelId;
      evento.DataInicio = request.DataInicio;
      evento.DataFim = request.DataFim;
      evento.Local = request.Local;
      evento.Descricao = request.Descricao;
      evento.AlteradoEm = DateTime.UtcNow;
      evento.AlteradoPor = usuarioId;
- **Atualizar participantes**:
csharp
      evento.Participantes.Clear();
      if (request.ParticipantesIds?.Any() == true)
      {
          evento.Participantes = request.ParticipantesIds
              .Select(id => new AgendaParticipante { ParticipanteId = id })
              .ToList();
      }
- `SaveChangesAsync()`
- Return: `_mapper.Map<AgendaResponse>(evento)`
Método: ExcluirEventoAsync(int id)
Buscar evento
Soft delete: evento.Ativo = false
evento.AlteradoEm = DateTime.UtcNow
SaveChangesAsync()
Sem return
Método: MoverEventoAsync(int id, DateTime novaDataInicio, DateTime novaDataFim)
Validar novaDataFim > novaDataInicio
Buscar evento
evento.DataInicio = novaDataInicio
evento.DataFim = novaDataFim
evento.AlteradoEm = DateTime.UtcNow
SaveChangesAsync()
Return: _mapper.Map<AgendaResponse>(evento)
Método: ListarOperadoresAtivosAsync()
SELECT * FROM TBOPERADOR WHERE SE_ATIVO = 'S' ORDER BY NOME
Return: List<OperadorResponse>
Método: ListarTiposAsync()
SELECT * FROM CC_TipoEvento WHERE Ativo = true ORDER BY Nome
Return: List<TipoEventoResponse>
2.2 Controller — Endpoints

Tarefas:

 Criar Controllers/AgendaController.cs
Decoradores:
csharp
    [ApiController]
    [Route("api/v{version:apiVersion}/agenda")]
    [ApiVersion("1.0")]
    [Authorize]
Injetar: AgendaService, IHttpContextAccessor, ILogger<AgendaController>

Endpoint 1: ListarEventos

csharp
  [HttpGet("eventos")]
  public async Task<ActionResult<List<AgendaResponse>>> ListarEventos(
      [FromQuery] DateTime inicio,
      [FromQuery] DateTime fim,
      [FromQuery] string responsavelId = null)
  {
      var eventos = await _agendaService.ListarEventosAsync(inicio, fim, responsavelId);
      return Ok(eventos);
  }

Endpoint 2: CriarEvento

csharp
  [HttpPost("eventos")]
  public async Task<ActionResult<AgendaResponse>> CriarEvento([FromBody] CreateAgendaRequest request)
  {
      var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      var evento = await _agendaService.CriarEventoAsync(request, usuarioId);
      return CreatedAtAction(nameof(ListarEventos), new { id = evento.Id }, evento);
  }

Endpoint 3: AtualizarEvento

csharp
  [HttpPut("eventos/{id}")]
  public async Task<ActionResult<AgendaResponse>> AtualizarEvento(
      int id,
      [FromBody] UpdateAgendaRequest request)
  {
      var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
      var evento = await _agendaService.AtualizarEventoAsync(id, request, usuarioId);
      return Ok(evento);
  }

Endpoint 4: ExcluirEvento

csharp
  [HttpDelete("eventos/{id}")]
  public async Task<ActionResult> ExcluirEvento(int id)
  {
      await _agendaService.ExcluirEventoAsync(id);
      return NoContent();
  }

Endpoint 5: ListarTipos

csharp
  [HttpGet("tipos")]
  public async Task<ActionResult<List<TipoEventoResponse>>> ListarTipos()
  {
      var tipos = await _agendaService.ListarTiposAsync();
      return Ok(tipos);
  }

Endpoint 6: ListarOperadores

csharp
  [HttpGet("operadores")]
  public async Task<ActionResult<List<OperadorResponse>>> ListarOperadores()
  {
      var operadores = await _agendaService.ListarOperadoresAtivosAsync();
      return Ok(operadores);
  }
2.3 Validações & Error Handling

Tarefas:

 Validações em AgendaService
Titulo: não vazio, max 200 chars
DataFim > DataInicio
Tipo válido
Responsável válido e ativo
DataInicio, DataFim: DateTime válido
 Exception handling em AgendaController
ArgumentException → 400 Bad Request
NotFoundException → 404 Not Found
UnauthorizedException → 401 Unauthorized
Exceção genérica → 500 Internal Server Error (logar stack)
 Mensagens de erro genéricas
Nunca expor: stack trace, SQL, propriedades internas
Exemplos:
✅ "Evento não encontrado"
✅ "Título é obrigatório"
❌ "Null reference exception in..."
❌ "SQL error: foreign key constraint..."
2.4 Rate Limiting

Tarefas:

 Verificar se policy validacao existe em Program.cs
csharp
  var policy = RateLimitPartition.GetFixedWindowLimiter("validacao", 
      _ => new FixedWindowRateLimiterOptions
      {
          PermitLimit = 5,
          Window = TimeSpan.FromMinutes(1),
          QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
          QueueLimit = 2
      });
 Aplicar rate limiting em endpoints de escrita
csharp
  [HttpPost("eventos")]
  [RequireRateLimiting("validacao")]
  public async Task<ActionResult<AgendaResponse>> CriarEvento(...)
 Aplicar em PUT e DELETE também
Critérios de Aceite
 AgendaService.cs implementado com 7 métodos
 AgendaController.cs criado com 6 endpoints
 Validações em todos os endpoints
 Erro handling com mensagens genéricas
 Rate limiting configurado
 dotnet build sem erros
 Smoke test executado:
 GET /api/v1/agenda/tipos → retorna 6 tipos
 GET /api/v1/agenda/operadores → retorna operadores ativos
 POST /api/v1/agenda/eventos com dados válidos → 201 Created
Não Fazer
❌ Não implementar lógica de permissões por enquanto (tudo é público para Agenda V1)
❌ Não criar conflito de horários (permitir sobreposição)
❌ Não fazer soft delete com DELETE lógico em participantes
❌ Não expor stack trace em resposta de erro
Deliverable
backend/
  ├─ Services/
  │   └─ AgendaService.cs
  ├─ Controllers/
  │   └─ AgendaController.cs
  └─ Program.cs (atualizado com services)

docs/
  ├─ FASE-2-ENDPOINTS.md (listando cada endpoint)
  └─ FASE-2-CHECKLIST.md
🎨 FASE 3: FRONTEND — COMPONENTE & TEMPLATE

Duração: 2-3 dias
Objetivo: Criar componente Angular standalone com RxJS cleanup.

3.1 Componente TypeScript

Tarefas:

 Criar src/app/wiki/pages/agenda/agenda.component.ts Decoradores e imports:
typescript
  @Component({
    selector: 'app-agenda',
    templateUrl: './agenda.component.html',
    styleUrls: ['./agenda.component.scss'],
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      NgbModule,
      FullCalendarModule
    ],
    providers: [AgendaService]
  })

Propriedades:

typescript
  calendarOptions: CalendarOptions;
  formulario: FormGroup;
  
  isLoading = false;
  eventos: any[] = [];
  operadores: any[] = [];
  tipos: any[] = [];
  
  filtroResponsavel: string | null = null;
  filtroTipo: number | null = null;
  
  private destroy$ = new Subject<void>();

Constructor:

typescript
  constructor(
    private agendaService: AgendaService,
    private buscaService: BuscaService,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private logger: NgxLoggerService
  ) {
    this.criarFormulario();
  }

OnInit:

typescript
  ngOnInit(): void {
    this.buscaService.fecharBusca();
    this.carregarDados();
    this.inicializarCalendario();
  }

OnDestroy:

typescript
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.buscaService.fecharBusca();
  }

Método: criarFormulario():

typescript
  private criarFormulario(): void {
    this.formulario = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      tipoId: [null, Validators.required],
      responsavelId: [null, Validators.required],
      dataInicio: ['', Validators.required],
      horaInicio: ['09:00', Validators.required],
      horaFim: ['10:00', Validators.required],
      local: ['', Validators.maxLength(200)],
      descricao: [''],
      participantesIds: [[]]
    }, {
      validators: this.validarHorarios()
    });
  }

  private validarHorarios() {
    return (fg: FormGroup) => {
      const horaInicio = fg.get('horaInicio')?.value;
      const horaFim = fg.get('horaFim')?.value;
      if (horaInicio && horaFim && horaFim <= horaInicio) {
        return { horarioInvalido: true };
      }
      return null;
    };
  }

Método: carregarDados():

typescript
  private carregarDados(): void {
    this.isLoading = true;

    this.agendaService.listarOperadores()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (operadores) => {
          this.operadores = operadores;
        },
        error: (err) => {
          this.logger.error('Erro ao carregar operadores', err);
          this.isLoading = false;
        }
      });

    this.agendaService.listarTipos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tipos) => {
          this.tipos = tipos;
          this.isLoading = false;
        },
        error: (err) => {
          this.logger.error('Erro ao carregar tipos', err);
          this.isLoading = false;
        }
      });
  }

Método: inicializarCalendario():

typescript
  private inicializarCalendario(): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      editable: true,
      selectable: true,
      selectConstraint: 'businessHours',
      eventClick: this.handleEventClick.bind(this),
      select: this.handleDateSelect.bind(this),
      eventDrop: this.handleEventDrop.bind(this),
      eventResize: this.handleEventResize.bind(this),
      events: this.carregarEventos.bind(this),
      locale: 'pt-br',
      height: 'auto'
    };
  }

Método: carregarEventos():

typescript
  private carregarEventos(info: any, successCallback: any, failureCallback: any): void {
    const inicio = info.startStr;
    const fim = info.endStr;

    this.agendaService.listarEventos(inicio, fim, this.filtroResponsavel)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (eventos) => {
          this.eventos = eventos;
          const eventosFormatados = eventos.map(e => ({
            id: e.id.toString(),
            title: e.titulo,
            start: e.dataInicio,
            end: e.dataFim,
            backgroundColor: this.obterCorTipo(e.tipo.id),
            extendedProps: e
          }));
          successCallback(eventosFormatados);
        },
        error: (err) => {
          this.logger.error('Erro ao carregar eventos', err);
          failureCallback(err);
        }
      });
  }

Método: handleDateSelect():

typescript
  handleDateSelect(selectInfo: DateSelectArg): void {
    const dataInicio = selectInfo.startStr.split('T')[0];
    const horaInicio = selectInfo.startStr.split('T')[1]?.substring(0, 5) || '09:00';
    
    this.formulario.patchValue({
      dataInicio,
      horaInicio
    });

    this.abrirFormulario();
  }

Método: handleEventClick():

typescript
  handleEventClick(clickInfo: EventClickArg): void {
    const evento = clickInfo.event.extendedProps as any;
    this.abrirFormularioEdicao(evento);
  }

Método: handleEventDrop():

typescript
  handleEventDrop(dropInfo: any): void {
    const evento = dropInfo.event.extendedProps as any;
    const novaDataInicio = dropInfo.event.startStr;
    const novaDataFim = dropInfo.event.endStr;

    if (new Date(novaDataFim) <= new Date(novaDataInicio)) {
      this.logger.warn('Data final deve ser maior que inicial');
      dropInfo.revert();
      return;
    }

    const request = {
      ...evento,
      dataInicio: novaDataInicio,
      dataFim: novaDataFim
    };

    this.agendaService.atualizarEvento(evento.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.info('Evento movido com sucesso');
        },
        error: (err) => {
          this.logger.error('Erro ao mover evento', err);
          dropInfo.revert();
        }
      });
  }

Método: handleEventResize():

typescript
  handleEventResize(resizeInfo: any): void {
    const evento = resizeInfo.event.extendedProps as any;
    const novaDataFim = resizeInfo.event.endStr;

    if (new Date(novaDataFim) <= new Date(evento.dataInicio)) {
      this.logger.warn('Data final deve ser maior que data inicial');
      resizeInfo.revert();
      return;
    }

    const request = {
      ...evento,
      dataFim: novaDataFim
    };

    this.agendaService.atualizarEvento(evento.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.info('Evento redimensionado com sucesso');
        },
        error: (err) => {
          this.logger.error('Erro ao redimensionar evento', err);
          resizeInfo.revert();
        }
      });
  }

Método: abrirFormulario():

typescript
  abrirFormulario(): void {
    this.formulario.reset({
      dataInicio: new Date().toISOString().split('T')[0],
      horaInicio: '09:00',
      horaFim: '10:00'
    });
    // Abrir modal será feito no template via template reference
  }

Método: abrirFormularioEdicao():

typescript
  abrirFormularioEdicao(evento: any): void {
    const dataInicio = evento.dataInicio.split('T')[0];
    const horaInicio = evento.dataInicio.split('T')[1].substring(0, 5);
    const horaFim = evento.dataFim.split('T')[1].substring(0, 5);

    this.formulario.patchValue({
      titulo: evento.titulo,
      tipoId: evento.tipo.id,
      responsavelId: evento.responsavel.id,
      dataInicio,
      horaInicio,
      horaFim,
      local: evento.local,
      descricao: evento.descricao
    });

    this.abrirFormulario();
  }

Método: salvarEvento():

typescript
  salvarEvento(): void {
    if (!this.formulario.valid) {
      this.logger.warn('Formulário inválido');
      return;
    }

    const { titulo, tipoId, responsavelId, dataInicio, horaInicio, horaFim, local, descricao, participantesIds } = this.formulario.value;

    const request: CreateAgendaRequest = {
      titulo,
      tipoId,
      responsavelId,
      dataInicio: `${dataInicio}T${horaInicio}:00`,
      dataFim: `${dataInicio}T${horaFim}:00`,
      local,
      descricao,
      participantesIds
    };

    this.agendaService.criarEvento(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.info('Evento criado com sucesso');
          this.formulario.reset();
          // Fechar modal via template reference
        },
        error: (err) => {
          this.logger.error('Erro ao salvar evento', err);
        }
      });
  }

Método: excluirEvento():

typescript
  excluirEvento(eventoId: number): void {
    if (!confirm('Tem certeza que deseja excluir este evento?')) {
      return;
    }

    this.agendaService.excluirEvento(eventoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.logger.info('Evento excluído com sucesso');
          // Fechar modal e recarregar calendário
        },
        error: (err) => {
          this.logger.error('Erro ao excluir evento', err);
        }
      });
  }

Método: filtrarPorResponsavel():

typescript
  filtrarPorResponsavel(responsavelId: string | null): void {
    this.filtroResponsavel = responsavelId;
    // FullCalendar recarrega via refetchEvents()
  }

Método: filtrarPorTipo():

typescript
  filtrarPorTipo(tipoId: number | null): void {
    this.filtroTipo = tipoId;
    // Filtro aplicado no frontend (não no backend)
  }

Método: obterCorTipo():

typescript
  private obterCorTipo(tipoId: number): string {
    const tipo = this.tipos.find(t => t.id === tipoId);
    return tipo?.cor || '#0f4c81';
  }
Critérios de Aceite
 agenda.component.ts criado com todos os métodos
 Imports: CommonModule, ReactiveFormsModule, NgbModule, FullCalendarModule
 Standalone: true
 takeUntil(this.destroy$) em todos os subscriptions
 ngOnDestroy() completa o destroy$
 RxJS cleanup correto (sem memory leaks)
 dotnet build sem erros
 npm run build sem erros (Angular strict mode)
Não Fazer
❌ Não usar subscribe sem takeUntil
❌ Não esquecer this.destroy$.next() e complete() no ngOnDestroy
❌ Não fazer lógica de negócio no componente (usar service)
❌ Não usar console.log para debug final (remover)
Deliverable
frontend/
  └─ src/app/wiki/pages/agenda/
      └─ agenda.component.ts
📝 FASE 4: FRONTEND — TEMPLATE HTML & MODAL

Duração: 1-2 dias
Objetivo: Criar template e modal do formulário.

4.1 Template Principal

Tarefas:

 Criar src/app/wiki/pages/agenda/agenda.component.html
Estrutura geral: heading, loading spinner, toolbar, filtros, FullCalendar
 Estrutura Heading:
html
  <div class="agenda-header">
    <h1>Agenda</h1>
    <button class="btn btn-primary" (click)="abrirFormulario()">
      + Novo evento
    </button>
  </div>
 Loading Spinner:
html
  <div class="loading" *ngIf="isLoading">
    <div class="spinner"></div>
    Carregando...
  </div>
 Toolbar com Filtros:
html
  <div class="agenda-toolbar">
    <div class="filtros">
      <label>
        Responsável:
        <select (change)="filtrarPorResponsavel($event.target.value)">
          <option value="">Todos</option>
          <option *ngFor="let op of operadores" [value]="op.id">
            {{ op.nome }}
          </option>
        </select>
      </label>

      <label>
        Tipo:
        <select (change)="filtrarPorTipo(+$event.target.value || null)">
          <option [value]="null">Todos</option>
          <option *ngFor="let tipo of tipos" [value]="tipo.id">
            {{ tipo.nome }}
          </option>
        </select>
      </label>
    </div>
  </div>
 FullCalendar Component:
html
  <div class="agenda-calendar">
    <full-calendar [options]="calendarOptions"></full-calendar>
  </div>
 Template Reference para Modal Formulário:
html
  <ng-template #formularioRef let-modal>
    <!-- modal do formulário aqui -->
  </ng-template>
4.2 Modal Formulário

Tarefas:

 Header do Modal:
html
  <div class="modal-header">
    <h4 class="modal-title">
      {{ formulario.get('titulo')?.value ? 'Editar evento' : 'Novo evento' }}
    </h4>
    <button type="button" class="btn-close" 
            (click)="modal.dismiss()">
    </button>
  </div>
 Body do Modal com Formulário:
html
  <div class="modal-body">
    <form [formGroup]="formulario">
      <!-- Titulo -->
      <div class="form-group">
        <label for="titulo">Título *</label>
        <input 
          type="text"
          class="form-control"
          id="titulo"
          formControlName="titulo"
          placeholder="Ex: Daily Suporte"
          maxlength="200">
        <small class="form-text text-danger" 
               *ngIf="formulario.get('titulo')?.hasError('required') && 
                      formulario.get('titulo')?.touched">
          Título é obrigatório
        </small>
      </div>

      <!-- Tipo -->
      <div class="form-group">
        <label for="tipoId">Tipo *</label>
        <select 
          class="form-control"
          id="tipoId"
          formControlName="tipoId">
          <option [value]="null">Selecione um tipo</option>
          <option *ngFor="let tipo of tipos" [value]="tipo.id">
            {{ tipo.nome }}
          </option>
        </select>
        <small class="form-text text-danger"
               *ngIf="formulario.get('tipoId')?.hasError('required') && 
                      formulario.get('tipoId')?.touched">
          Tipo é obrigatório
        </small>
      </div>

      <!-- Responsável -->
      <div class="form-group">
        <label for="responsavelId">Responsável *</label>
        <select 
          class="form-control"
          id="responsavelId"
          formControlName="responsavelId">
          <option [value]="null">Selecione um responsável</option>
          <option *ngFor="let op of operadores" [value]="op.id">
            {{ op.nome }}
          </option>
        </select>
        <small class="form-text text-danger"
               *ngIf="formulario.get('responsavelId')?.hasError('required') && 
                      formulario.get('responsavelId')?.touched">
          Responsável é obrigatório
        </small>
      </div>

      <!-- Data -->
      <div class="form-group">
        <label for="dataInicio">Data *</label>
        <input 
          type="date"
          class="form-control"
          id="dataInicio"
          formControlName="dataInicio">
        <small class="form-text text-danger"
               *ngIf="formulario.get('dataInicio')?.hasError('required') && 
                      formulario.get('dataInicio')?.touched">
          Data é obrigatória
        </small>
      </div>

      <!-- Hora Início -->
      <div class="form-group">
        <label for="horaInicio">Início *</label>
        <input 
          type="time"
          class="form-control"
          id="horaInicio"
          formControlName="horaInicio">
      </div>

      <!-- Hora Fim -->
      <div class="form-group">
        <label for="horaFim">Fim *</label>
        <input 
          type="time"
          class="form-control"
          id="horaFim"
          formControlName="horaFim">
        <small class="form-text text-danger"
               *ngIf="formulario.hasError('horarioInvalido')">
          Hora final deve ser posterior à hora inicial
        </small>
      </div>

      <!-- Local -->
      <div class="form-group">
        <label for="local">Local</label>
        <input 
          type="text"
          class="form-control"
          id="local"
          formControlName="local"
          placeholder="Ex: Sala de reunião"
          maxlength="200">
      </div>

      <!-- Descrição -->
      <div class="form-group">
        <label for="descricao">Descrição</label>
        <textarea 
          class="form-control"
          id="descricao"
          formControlName="descricao"
          rows="3"
          placeholder="Detalhes do evento">
        </textarea>
      </div>
    </form>
  </div>
 Footer do Modal com Botões:
html
  <div class="modal-footer">
    <button type="button" class="btn btn-danger" 
            (click)="excluirEvento(eventoId)"
            *ngIf="ehEdicao">
      Excluir
    </button>
    <button type="button" class="btn btn-secondary" 
            (click)="modal.dismiss()">
      Cancelar
    </button>
    <button type="button" class="btn btn-primary" 
            (click)="salvarEvento()"
            [disabled]="formulario.invalid">
      Salvar
    </button>
  </div>
4.3 Estilos

Tarefas:

 Criar src/app/wiki/pages/agenda/agenda.styles.scss
Integrar com tema da Central (cores, espaçamento, tipografia)
FullCalendar respeitar tema escuro/claro
Modal com background apropriado
Toolbar com flex layout
Exemplo:
scss
    .agenda-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;

      h1 {
        margin: 0;
        font-size: 1.75rem;
      }
    }

    .agenda-toolbar {
      margin-bottom: 1rem;

      .filtros {
        display: flex;
        gap: 1rem;

        label {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          select {
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 0.25rem;
            background: var(--surface-main);
            color: var(--text-color);
          }
        }
      }
    }

    .agenda-calendar {
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1rem;
      background: var(--surface-main);

      // FullCalendar overrides
      ::ng-deep {
        .fc {
          font-family: inherit;
          color: var(--text-color);
        }

        .fc-button-primary {
          background-color: #0f4c81;
          border-color: #0f4c81;

          &:hover {
            background-color: darken(#0f4c81, 10%);
          }
        }

        .fc-daygrid-day {
          background: var(--surface-main);
        }

        .fc-event {
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;

      .spinner {
        width: 2rem;
        height: 2rem;
        border: 4px solid var(--border-color);
        border-top-color: #0f4c81;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
Critérios de Aceite
 agenda.component.html criado
 agenda.styles.scss criado
 Template compila sem erros
 Modal renderiza corretamente
 Formulário mostra validações
 FullCalendar visível (sem textos crus)
 Filtros presentes e funcionais
Não Fazer
❌ Não incluir lógica TypeScript no template (usar property binding)
❌ Não deixar classes .fc- sem estilização
❌ Não esquecer tema escuro no CSS
Deliverable
frontend/
  └─ src/app/wiki/pages/agenda/
      ├─ agenda.component.html
      └─ agenda.styles.scss
🔗 FASE 5: INTEGRAÇÃO — SERVICE FRONTEND

Duração: 1 dia
Objetivo: Criar service que comunica com API do backend.

5.1 Service

Tarefas:

 Criar src/app/core/services/agenda.service.ts
typescript
  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import { environment } from 'src/environments/environment';

  export interface CreateAgendaRequest {
    titulo: string;
    tipoId: number;
    responsavelId: string;
    dataInicio: string; // ISO format
    dataFim: string;    // ISO format
    local?: string;
    descricao?: string;
    participantesIds?: string[];
  }

  export interface UpdateAgendaRequest extends CreateAgendaRequest {}

  export interface AgendaResponse {
    id: number;
    titulo: string;
    tipo: TipoEventoResponse;
    responsavel: OperadorResponse;
    dataInicio: string;
    dataFim: string;
    local?: string;
    descricao?: string;
    ativo: boolean;
    criadoEm: string;
    criadoPor: string;
  }

  export interface TipoEventoResponse {
    id: number;
    nome: string;
    cor: string;
  }

  export interface OperadorResponse {
    id: string;
    nome: string;
    email: string;
  }

  @Injectable({
    providedIn: 'root'
  })
  export class AgendaService {
    private baseUrl = `${environment.apiBaseUrl}/agenda`;

    constructor(private http: HttpClient) {}

    listarEventos(
      inicio: string,
      fim: string,
      responsavelId?: string
    ): Observable<AgendaResponse[]> {
      const params: any = { inicio, fim };
      if (responsavelId) {
        params.responsavelId = responsavelId;
      }

      return this.http.get<AgendaResponse[]>(
        `${this.baseUrl}/eventos`,
        { params }
      );
    }

    criarEvento(request: CreateAgendaRequest): Observable<AgendaResponse> {
      return this.http.post<AgendaResponse>(
        `${this.baseUrl}/eventos`,
        request
      );
    }

    atualizarEvento(
      id: number,
      request: UpdateAgendaRequest
    ): Observable<AgendaResponse> {
      return this.http.put<AgendaResponse>(
        `${this.baseUrl}/eventos/${id}`,
        request
      );
    }

    excluirEvento(id: number): Observable<void> {
      return this.http.delete<void>(
        `${this.baseUrl}/eventos/${id}`
      );
    }

    listarTipos(): Observable<TipoEventoResponse[]> {
      return this.http.get<TipoEventoResponse[]>(
        `${this.baseUrl}/tipos`
      );
    }

    listarOperadores(): Observable<OperadorResponse[]> {
      return this.http.get<OperadorResponse[]>(
        `${this.baseUrl}/operadores`
      );
    }
  }
 Registrar service em providers (já feito via providedIn: 'root')
Critérios de Aceite
 agenda.service.ts criado com 6 métodos
 Interfaces definidas (Request, Response)
 Base URL usando environment.apiBaseUrl
 HttpClient injetado
 Sem console.log
 TypeScript compila sem erros
Não Fazer
❌ Não fazer tratamento de erro no service (deixar pro componente)
❌ Não usar subscribe no service
❌ Não hardcodar URLs
Deliverable
frontend/
  └─ src/app/core/services/
      └─ agenda.service.ts
🛣️ FASE 6: ROTEAMENTO & NAVEGAÇÃO

Duração: 1 dia
Objetivo: Integrar Agenda nas rotas e sidebar.

6.1 Atualizar Routes

Tarefas:

 Atualizar frontend/src/app/wiki/wiki.routes.ts
Adicionar rota com lazy loading:
typescript
    {
      path: 'agenda',
      loadComponent: () => import('./pages/agenda/agenda.component')
        .then(m => m.AgendaComponent)
    }
 Verificar que rota está no lugar certo
Deve estar no array de rotas do wiki (não no layout)
6.2 Sidebar Navigation

Tarefas:

 Atualizar frontend/src/app/layout/sidebar/sidebar.component.html ou dados de navegação
Adicionar item "Agenda" (apropriada na seção, ex: Administrativo)
Link: routerLink="/agenda"
Ícone: calendar-2-event ou similar
 Verificar RouteLink Active
Deve destacar quando rota /agenda está ativa
6.3 Validar Breadcrumb

Tarefas:

 Se houver breadcrumb automático: testar que funciona em /agenda
 Se houver breadcrumb manual: adicionar entrada para Agenda
Critérios de Aceite
 Rota /agenda configurada com lazy loading
 Link na sidebar funciona
 Navegação até /agenda funciona
 Breadcrumb atualizado (se aplicável)
 Sem erros de compilação
Não Fazer
❌ Não remover lazy loading
❌ Não adicionar Agenda em múltiplas seções
Deliverable
frontend/
  └─ src/app/
      ├─ wiki.routes.ts (atualizado)
      └─ layout/sidebar/ (atualizado)
🧪 FASE 7: TESTES & VALIDAÇÃO

Duração: 2-3 dias
Objetivo: Executar todos os critérios de aceite manualmente.

7.1 Teste — Renderização

Tarefas:

 Abrir navegador e ir para /agenda
Verificar: nenhum erro no console
Verificar: calendário renderiza
Verificar: botões visíveis (Novo evento, Dia/Semana/Mês, Hoje, Anterior/Próximo)
Verificar: NÃO aparecem textos crus ("PrevNext", "Today", "MonthWeekDay")
Verificar: estilos CSS aplicados (cores, spacing, fonts)
7.2 Teste — Navegação Calendário

Tarefas:

 Clicar botão "Dia" → calendário muda para vista Dia ✓
 Clicar botão "Semana" → calendário muda para vista Semana ✓
 Clicar botão "Mês" → calendário muda para vista Mês ✓
 Clicar botão "Hoje" → calendário volta para hoje ✓
 Clicar botão "Anterior" → período anterior ✓
 Clicar botão "Próximo" → próximo período ✓
7.3 Teste — Criar Evento

Tarefas:

 Clicar "+ Novo evento"
Modal abre ✓
Campos vazios ✓
Data pré-preenchida com hoje (opcional) ✓
 Preencher campos obrigatórios:
Titulo: "Daily Suporte"
Tipo: "Daily"
Responsável: (selecionar um operador)
Data: 10/09/2026
Início: 08:00
Fim: 08:30
 Clicar "Salvar"
Modal fecha ✓
Evento aparece imediatamente no calendário ✓
Banco de dados: query SELECT * FROM CC_Agenda WHERE Titulo='Daily Suporte'
Evento existe? ✓
CriadoEm preenchido? ✓
CriadoPor preenchido? ✓
 Recarregar página (F5)
Evento continua visível no calendário ✓
Banco confirms evento persistente ✓
7.4 Teste — Criar via Clique na Célula

Tarefas:

 Clique em célula de calendário
Modal abre ✓
Data/hora preenchidas automaticamente ✓
 Preencher título, tipo, responsável, salvar
Evento criado ✓
Data/hora refletem clique ✓
7.5 Teste — Editar Evento

Tarefas:

 Clique em evento existente
Modal abre ✓
Campos preenchidos com dados existentes ✓
 Alterar título, tipo, horário
Ex: "Daily Suporte" → "Daily Suporte - Atualizado"
Ex: horário 08:00-08:30 → 09:00-09:30
 Clicar "Salvar"
Modal fecha ✓
Evento atualizado imediatamente ✓
Banco: query SELECT * FROM CC_Agenda WHERE Id=X
Titulo alterado? ✓
DataInicio alterado? ✓
AlteradoEm preenchido? ✓
 Recarregar página (F5)
Alterações persistem ✓
7.6 Teste — Drag & Drop

Tarefas:

 Arrastar evento para outro dia
Ex: 10/09 → 11/09
 Soltar
Evento move imediatamente ✓
Banco: SELECT DataInicio FROM CC_Agenda WHERE Id=X
Data alterada? ✓
 Se erro em API: evento volta à posição original ✓
7.7 Teste — Redimensionamento

Tarefas:

 Passar mouse sobre fim do evento
Cursor muda (resize cursor) ✓
 Arrastar fim para estender duração
Ex: 08:00-08:30 → 08:00-09:00
 Soltar
Duração alterada imediatamente ✓
Banco: SELECT DataFim FROM CC_Agenda WHERE Id=X
DataFim alterado? ✓
7.8 Teste — Excluir Evento

Tarefas:

 Clique em evento → modal abre
 Clicar "Excluir"
Confirmação solicita? ✓
 Confirmar
Modal fecha ✓
Evento desaparece do calendário ✓
Banco: SELECT Ativo FROM CC_Agenda WHERE Id=X
Ativo=0 (soft delete)? ✓
 Recarregar página (F5)
Evento não retorna ✓
7.9 Teste — Filtros

Tarefas:

 Selecionar Responsável específico
Ex: "Felipe"
Calendário mostra apenas eventos de Felipe ✓
 Mudar para outro responsável
Ex: "Sara"
Calendário atualiza imediatamente ✓
 Selecionar "Todos"
Volta a mostrar todos ✓
 Selecionar Tipo específico
Ex: "Daily"
Calendário filtra (frontend) ✓
7.10 Teste — Operadores Inativos

Tarefas:

 Novo evento → dropdown Responsável
Somente operadores com SE_ATIVO='S' aparecem ✓
Operador inativo não aparece ✓
7.11 Teste — Z-index & Overlays

Tarefas:

 Abrir modal formulário
 Verificar no DevTools (F12)
Elemento .modal-backdrop existe? ✓
Z-index apropriado (> calendário)? ✓
Pointer-events: auto? ✓
 Fechar modal
Calendário totalmente interativo novamente ✓
7.12 Teste — Fluxo Completo

Tarefas:

Executar este fluxo sequencial:

1. Criar evento "Daily Suporte" em 10/09 09:00-09:30
   → Salvo no banco ✓
   → Visível no calendário ✓

2. Editar: alterar para "Daily Suporte - Reunião" e 10:00-10:30
   → Banco atualizado ✓
   → Calendário reflete ✓

3. Arrastar para 11/09
   → Banco atualizado ✓
   → Calendário reflete ✓

4. Recarregar página (F5)
   → Evento continua em 11/09 ✓

5. Clicar evento, aumentar duração 10:00-11:30
   → Banco atualizado ✓
   → Calendário reflete ✓

6. Excluir evento
   → Desaparece calendário ✓
   → Banco atualizado (Ativo=0) ✓

7. Recarregar página (F5)
   → Evento não volta ✓
7.13 Teste Multi-Usuário (Opcional)

Tarefas:

 Usuário A (Felipe) cria evento
 Usuário B (Sara) visualiza agenda
 Usuário B vê evento de Felipe?
Se sim: compartilhamento funciona ✓
Se não: investigar SELECT * FROM CC_Agenda (verificar se INSERT funcionou)
Critérios de Aceite
 Todos os testes 7.1-7.12 com ✓
 Nenhum erro no console do navegador
 Nenhum erro no backend (logs do servidor limpo)
 Banco de dados consistente com UI
Não Fazer
❌ Não deixar um teste com ✗ sem investigar
❌ Não avançar para próxima fase sem tudo funcionando
Deliverable
docs/
  └─ FASE-7-TESTES-CHECKLIST.md (com todos os testes marcados ✓)
📊 FASE 8: DOCUMENTAÇÃO & FINALIZAÇÃO

Duração: 1 dia
Objetivo: Documentar, versionar e preparar para produção.

8.1 Documentação

Tarefas:

 Criar docs/AGENDA-IMPLEMENTACAO.md
Resumo: implementação da Agenda V1 com CRUD, drag-drop, filtros
Problemas corrigidos:
 CSS do FullCalendar (textos crus)
 Z-index modal/backdrop
 Memory leaks RxJS (takeUntil)
 Overlays invisíveis
Tabelas utilizadas: CC_Agenda, CC_AgendaParticipante, CC_TipoEvento
Endpoints:
GET /api/v1/agenda/eventos
POST /api/v1/agenda/eventos
PUT /api/v1/agenda/eventos/{id}
DELETE /api/v1/agenda/eventos/{id}
GET /api/v1/agenda/tipos
GET /api/v1/agenda/operadores
Componentes: AgendaComponent (standalone)
Service: AgendaService
Fluxo de dados: Frontend ↔ Service ↔ API ↔ Backend ↔ Banco
Arquitetura:
Lazy loading via rota
Standalone component
RxJS com takeUntil
Rate limiting 5/min por usuário
Soft delete (Ativo bit)
Auditoria (CriadoPor, AlteradoPor)
 Criar docs/AGENDA-ENDPOINTS.md
Listar cada endpoint com:
URL
Método HTTP
Query/Body params
Response
Status codes
Rate limiting
 Criar docs/AGENDA-SCHEMA.md
Diagrama das tabelas
Relacionamentos
Campos
Tipos de dados
Índices
8.2 Seed Data Production

Tarefas:

 Criar script backend/Scripts/Seed-TiposEvento.sql
sql
  INSERT INTO CC_TipoEvento (Nome, Cor, Ativo)
  VALUES
    ('Reunião', '#0f4c81', 1),
    ('Daily', '#7c3aed', 1),
    ('Treinamento', '#059669', 1),
    ('Atendimento', '#d97706', 1),
    ('Pessoal', '#8b5cf6', 1),
    ('Outro', '#6b7280', 1);
8.3 Atualizar README

Tarefas:

 Abrir frontend/README.md ou Central-Conhecimento-developer/README.md
 Adicionar seção "Agenda":
markdown
  ## Agenda

  ### Como acessar
  - URL: `/agenda`
  - Requisitos: Autenticado com [Authorize]
  - Visões: Dia, Semana, Mês

  ### Criar evento
  1. Clique "+ Novo evento"
  2. Preencha Título, Tipo, Responsável, Data, Horários
  3. Clique "Salvar"
  4. Evento aparece imediatamente no calendário

  ### Editar evento
  1. Clique no evento existente
  2. Altere os campos desejados
  3. Clique "Salvar"

  ### Excluir evento
  1. Clique no evento
  2. Clique "Excluir"
  3. Confirme exclusão

  ### Drag & Drop
  - Arraste evento para outro dia/horário
  - Alteração persiste no banco automaticamente

  ### Filtros
  - Filtre por Responsável
  - Filtre por Tipo de evento
8.4 Versioning

Tarefas:

 Verificar versão atual
Ex: v0.7.0 → incrementar para v0.8.0
 Atualizar frontend/src/app/shared/meta/app-version.ts
typescript
  export const appVersion = '0.8.0'; // v0.8.0-agenda-v1
 Atualizar frontend/package.json
json
  "version": "0.8.0"
 Criar tag no Git
bash
  git tag -a v0.8.0-agenda-v1 -m "feat: implement Agenda V1 with CRUD, drag-drop and filters"
  git push origin v0.8.0-agenda-v1
8.5 Code Review Checklist

Tarefas:

 Nenhuma senha/secrets commitados
grep -r "password\|secret\|key" backend/ (nada hardcoded)
grep -r "apiKey\|Authorization: Bearer" frontend/ (apenas em environment)
 Sem console.log() ou debug statements
grep -r "console\." frontend/src/app/wiki/pages/agenda/
 TypeScript strict mode sem erros
npm run build no frontend (sem erros)
 Angular lint sem warnings graves
ng lint (se ativado no projeto)
 Rate limiting aplicado
POST/PUT/DELETE em AgendaController têm [RequireRateLimiting("validacao")]
 Validações server-side presentes
AgendaService valida titulo, tipo, responsavel, datas
 takeUntil em todos os subscriptions
Procure por .subscribe sem takeUntil(this.destroy$) → NÃO DEVE EXISTIR
 Tratamento de erros
Todos os subscribe têm error: handler
 Nenhum endpoint sem [Authorize]
Agenda é exclusiva de usuários autenticados
 Soft delete, não DELETE físico
ExcluirEventoAsync faz Ativo = false, não DELETE
8.6 Pull Request

Tarefas:

 Criar PR com título descritivo
  Title: feat: implement Agenda V1 with CRUD, drag-drop and filters

  Description:
  - Implementar calendário FullCalendar com vistas Dia/Semana/Mês
  - CRUD completo: criar, editar, excluir eventos
  - Drag-and-drop de eventos entre dias/horários
  - Redimensionamento de eventos (duração)
  - Filtros por responsável e tipo de evento
  - Tipos de evento: Reunião, Daily, Treinamento, Atendimento, Pessoal, Outro
  - Tabelas: CC_Agenda, CC_AgendaParticipante, CC_TipoEvento
  - Endpoints API versionados: /api/v1/agenda/*
  - Rate limiting e soft delete
  - Auditoria de mudanças

  Closes #<issue-number> (se houver)
 Descrever mudanças:
Backend: services, controllers, models, DTOs
Frontend: componente standalone, service, template
Banco: migration, seed
Documentação
 Listar testes executados:
FASE-7-TESTES-CHECKLIST.md
 Solicitar review de pelo menos 1 pessoa
Critérios de Aceite
 Documentação completa
 Seed script criado
 README atualizado
 Tag criada e pusheada
 PR criado com descrição clara
 Code review checklist 100% ✓
 Nenhuma dependência externa (sem Google Agenda, Outlook, etc)
Não Fazer
❌ Não mergear PR sem testes executados (FASE 7)
❌ Não deixar console.log no código
❌ Não committar secrets
❌ Não alterar versão sem tag correspondente
Deliverable
docs/
  ├─ AGENDA-IMPLEMENTACAO.md
  ├─ AGENDA-ENDPOINTS.md
  ├─ AGENDA-SCHEMA.md
  └─ AGENDA-README-UPDATE.md

backend/
  └─ Scripts/
      └─ Seed-TiposEvento.sql

Central-Conhecimento-developer/
  └─ README.md (atualizado)

frontend/
  └─ package.json (version 0.8.0)
✅ Checklist Final de Aceite

Antes de considerar "PRONTO", marcar TODOS:

Renderização
 Calendário renderiza sem erros CSS
 Botões visíveis (Novo evento, Dia/Semana/Mês, Hoje, Anterior/Próximo)
 Nenhum texto cru do FullCalendar ("PrevNext", "Today", etc)
 Estilos carregados corretamente
CRUD
 Criar evento → salvo no banco
 Editar evento → alterações persistem
 Excluir evento → soft delete (Ativo=0)
 Visualizar eventos de período → carrega corretamente
Interatividade
 Drag-drop funciona
 Redimensionamento funciona
 Clique em célula → abre criação
 Clique em evento → abre edição
Filtros
 Filtro por responsável funciona
 Filtro por tipo funciona
 Combinação de filtros funciona
 "Todos" mostra todos os eventos
Banco de Dados
 CC_Agenda tabela criada
 CC_AgendaParticipante tabela criada
 CC_TipoEvento tabela criada e populada (6 tipos)
 Constraints e FKs corretos
 Auditoria registrada (CriadoPor, AlteradoPor, datas)
 Índices para performance
API
 GET /api/v1/agenda/eventos funciona
 POST /api/v1/agenda/eventos funciona (INSERT)
 PUT /api/v1/agenda/eventos/{id} funciona (UPDATE)
 DELETE /api/v1/agenda/eventos/{id} funciona (soft delete)
 GET /api/v1/agenda/tipos funciona
 GET /api/v1/agenda/operadores funciona
 Rate limiting funciona (429 após 5 requisições)
 Erros tratados com mensagens genéricas
Frontend
 Componente standalone
 RxJS cleanup com takeUntil
 Sem memory leaks
 Sem console.log
 Integrado com estilos da Central
 Lazy loading da rota
 Link no sidebar funciona
UX
 Sem overlay invisível bloqueando interações
 Modal funciona corretamente
 Feedback ao usuário (sucesso/erro)
 Responsividade em mobile (testar)
 Tema escuro aplicado
Segurança
 [Authorize] em todos endpoints
 Soft delete (sem remoção física)
 Validações server-side
 Sem SQL injection (parametrizado)
 Sem XSS (Angular sanitize)
 Rate limiting configurado
 Senha/secrets não commitados
Testes
 FASE-7-TESTES-CHECKLIST.md completo
 Todos testes 7.1-7.12 com ✓
 Nenhum ✗ deixado
Documentação
 AGENDA-IMPLEMENTACAO.md completo
 AGENDA-ENDPOINTS.md completo
 AGENDA-SCHEMA.md completo
 README.md atualizado
 Seed script criado
 Tag criada (v0.8.0-agenda-v1)