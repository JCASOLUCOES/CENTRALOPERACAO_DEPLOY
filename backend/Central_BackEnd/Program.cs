using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Central_BackEnd.Data;
using Central_BackEnd.Services;
using Central_BackEnd.Services.Implantacao;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var jwtSettings = builder.Configuration.GetSection("Jwt");
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? jwtSettings["Key"]
    ?? throw new InvalidOperationException("JWT_KEY ou Jwt:Key nao configurada.");
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddControllers();

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-Api-Version")
    );
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Central de Conhecimento API",
        Version = "v1",
        Description = "API de autenticacao JWT para o sistema Central de Conhecimento"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Insira o token JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Registra o provider no momento do uso, nao no registro, para que o EF Tools
// (migrations) consiga resolver o servico mesmo em Production.
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var env = sp.GetRequiredService<IWebHostEnvironment>();
    if (env.IsDevelopment())
    {
        options.UseInMemoryDatabase("CentralDev");
    }
    else
    {
        options.UseSqlServer(config.GetConnectionString("DefaultConnection"));
    }
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireExpirationTime = true,
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IGoogleSheetsService, GoogleSheetsService>();
builder.Services.AddScoped<IPasswordValidationService, PasswordValidationService>();
builder.Services.AddSingleton<BruteForceGuard>();

// Modulo IMPLANTACAO/PROJETOS
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddScoped<IEquipeService, EquipeService>();
builder.Services.AddScoped<ITipoProjetoService, TipoProjetoService>();
builder.Services.AddScoped<IEtapaService, EtapaService>();
builder.Services.AddScoped<IColunaKanbanService, ColunaKanbanService>();
builder.Services.AddScoped<IProjetoService, ProjetoService>();
builder.Services.AddScoped<ITarefaService, TarefaService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ILegacyDataService, LegacyDataService>();
builder.Services.AddScoped<IAgendaService, AgendaService>();
builder.Services.AddScoped<IAuditoriaImplantacaoService, AuditoriaImplantacaoService>();

// Modulo Banco de Dados (Database Explorer)
builder.Services.AddSingleton<Central_BackEnd.Services.Database.IDatabaseConnectionService, Central_BackEnd.Services.Database.DatabaseConnectionService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseMetadataService, Central_BackEnd.Services.Database.DatabaseMetadataService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseRelationshipInferenceService, Central_BackEnd.Services.Database.DatabaseRelationshipInferenceService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseQueryService, Central_BackEnd.Services.Database.DatabaseQueryService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseSearchService, Central_BackEnd.Services.Database.DatabaseSearchService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseQueryBuilderService, Central_BackEnd.Services.Database.DatabaseQueryBuilderService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseSchemaDiffService, Central_BackEnd.Services.Database.DatabaseSchemaDiffService>();
builder.Services.AddScoped<Central_BackEnd.Services.Database.IDatabaseSnapshotService, Central_BackEnd.Services.Database.DatabaseSnapshotService>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("login", http => RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "anonimo",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    options.AddPolicy("validacao", http =>
    {
        var chave = http.User.Identity?.IsAuthenticated == true
            ? http.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonimo"
            : http.Connection.RemoteIpAddress?.ToString() ?? "anonimo";

        return RateLimitPartition.GetFixedWindowLimiter(chave, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Angular", policy =>
    {
        policy.WithOrigins(
                "http://192.168.2.130:1010",
                "http://localhost:4200",
                "http://localhost:1010")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var swaggerHabilitado = builder.Configuration.GetValue<bool>("SwaggerEnabled");

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(error =>
    {
        error.Run(async context =>
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { mensagem = "Erro interno no servidor." });
        });
    });
    app.UseHsts();
}

app.UseRouting();

app.UseRateLimiter();

app.UseCors("Angular");

if (swaggerHabilitado)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Central de Conhecimento API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (!db.Operadores.Any())
        {
            db.Operadores.Add(new Central_BackEnd.Models.Operador
            {
                OperadorId = "admin",
                Nome = "Administrador Local",
                Senha = "admin123",
                Email = "admin@local.dev",
                SeAtivo = "S",
                SeAdmin = true,
                PerfilSkin = "S",
                DataInclusao = DateTime.Now,
                UsuarioInclusao = "seed",
                PerfilId = "A"
            });
            db.SaveChanges();
        }

        // Seed CC_Funcao: Funcoes do sistema
        if (!db.Funcoes.Any())
        {
            db.Funcoes.AddRange(
                new Central_BackEnd.Models.Funcao { Descricao = "Analista de Sistemas", Classificacao = "Implantador", Ativo = true },
                new Central_BackEnd.Models.Funcao { Descricao = "Suporte", Classificacao = "Atendimento", Ativo = true },
                new Central_BackEnd.Models.Funcao { Descricao = "Programador", Classificacao = "Desenvolvimento", Ativo = true }
            );
            db.SaveChanges();
        }

        // Seed IMPL_Equipe: IMPLANTACAO + CIAA
        if (!db.Equipes.Any())
        {
            db.Equipes.AddRange(
                new Central_BackEnd.Models.Implantacao.Equipe
                {
                    Nome = "IMPLANTACAO",
                    Descricao = "Equipe responsavel por implantacoes em clientes",
                    PrefixoCodigo = "IMP",
                    UsuarioInclusao = "seed",
                    DataInclusao = DateTime.Now
                },
                new Central_BackEnd.Models.Implantacao.Equipe
                {
                    Nome = "CIAA",
                    Descricao = "Centro de Inovacao, Automacao e IA",
                    PrefixoCodigo = "CIAA",
                    UsuarioInclusao = "seed",
                    DataInclusao = DateTime.Now
                }
            );
            db.SaveChanges();
        }

        // Seed IMPL_ColunaKanban: 5 colunas padrao
        if (!db.ColunasKanban.Any())
        {
            db.ColunasKanban.AddRange(
                new Central_BackEnd.Models.Implantacao.ColunaKanban { Nome = "BACKLOG",        Ordem = 1, Cor = "#94a3b8", Padrao = true, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.ColunaKanban { Nome = "A FAZER",       Ordem = 2, Cor = "#60a5fa", Padrao = true, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.ColunaKanban { Nome = "EM ANDAMENTO",  Ordem = 3, Cor = "#fbbf24", Padrao = true, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.ColunaKanban { Nome = "HOMOLOGACAO",   Ordem = 4, Cor = "#a78bfa", Padrao = true, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.ColunaKanban { Nome = "CONCLUIDO",     Ordem = 5, Cor = "#34d399", Padrao = true, UsuarioInclusao = "seed", DataInclusao = DateTime.Now }
            );
            db.SaveChanges();
        }

        // Seed IMPL_TipoProjeto: CLIENTE, CARTEIRA, INTEGRACAO (IMPLANTACAO) + PROJETO_CIAA (CIAA)
        if (!db.TiposProjeto.Any())
        {
            var eqImpl = db.Equipes.FirstOrDefault(e => e.Nome == "IMPLANTACAO");
            var eqCiaa = db.Equipes.FirstOrDefault(e => e.Nome == "CIAA");
            db.TiposProjeto.AddRange(
                new Central_BackEnd.Models.Implantacao.TipoProjeto { Codigo = "CLIENTE",      Nome = "Cliente",      ClienteObrigatorio = true,  Ordem = 1, EquipeId = eqImpl?.Id, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.TipoProjeto { Codigo = "CARTEIRA",     Nome = "Carteira",     ClienteObrigatorio = true,  Ordem = 2, EquipeId = eqImpl?.Id, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.TipoProjeto { Codigo = "INTEGRACAO",   Nome = "Integracao",   ClienteObrigatorio = true,  Ordem = 3, EquipeId = eqImpl?.Id, UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.TipoProjeto { Codigo = "PROJETO_CIAA", Nome = "Projeto CIAA", ClienteObrigatorio = false, Ordem = 1, EquipeId = eqCiaa?.Id, UsuarioInclusao = "seed", DataInclusao = DateTime.Now }
            );
            db.SaveChanges();
        }

        // Seed IMPL_Etapa: 6 etapas IMPLANTACAO + 7 etapas CIAA
        if (!db.Etapas.Any())
        {
            var tipoCliente = db.TiposProjeto.FirstOrDefault(t => t.Codigo == "CLIENTE");
            var tipoCiaa = db.TiposProjeto.FirstOrDefault(t => t.Codigo == "PROJETO_CIAA");
            db.Etapas.AddRange(
                // IMPLANTACAO
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "KICKOFF",        Ordem = 1, TipoProjetoId = tipoCliente?.Id, Cor = "#0f4c81", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "PARAMETRIZACAO", Ordem = 2, TipoProjetoId = tipoCliente?.Id, Cor = "#2563eb", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "TREINAMENTO",    Ordem = 3, TipoProjetoId = tipoCliente?.Id, Cor = "#0ea5e9", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "HOMOLOGACAO",   Ordem = 4, TipoProjetoId = tipoCliente?.Id, Cor = "#7c3aed", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "GO LIVE",        Ordem = 5, TipoProjetoId = tipoCliente?.Id, Cor = "#16a34a", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "ACEITE",         Ordem = 6, TipoProjetoId = tipoCliente?.Id, Cor = "#15803d", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                // CIAA
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "LEVANTAMENTO",   Ordem = 1, TipoProjetoId = tipoCiaa?.Id, Cor = "#7c3aed", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "DESENHO",        Ordem = 2, TipoProjetoId = tipoCiaa?.Id, Cor = "#a855f7", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "DESENVOLVIMENTO", Ordem = 3, TipoProjetoId = tipoCiaa?.Id, Cor = "#d97706", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "TESTES",          Ordem = 4, TipoProjetoId = tipoCiaa?.Id, Cor = "#0891b2", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "HOMOLOGACAO",    Ordem = 5, TipoProjetoId = tipoCiaa?.Id, Cor = "#7c3aed", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "PUBLICACAO",     Ordem = 6, TipoProjetoId = tipoCiaa?.Id, Cor = "#16a34a", UsuarioInclusao = "seed", DataInclusao = DateTime.Now },
                new Central_BackEnd.Models.Implantacao.Etapa { Nome = "MONITORAMENTO",  Ordem = 7, TipoProjetoId = tipoCiaa?.Id, Cor = "#0d9488", UsuarioInclusao = "seed", DataInclusao = DateTime.Now }
            );
            db.SaveChanges();
        }

        // Seed IMPL_Cliente: 3 clientes para IMPLANTACAO
        if (!db.Clientes.Any())
        {
            db.Clientes.AddRange(
                new Central_BackEnd.Models.Implantacao.Cliente
                {
                    Nome = "Tech Solutions S/A",
                    Cnpj = "12.345.678/0001-90",
                    Contato = "contato@techsolutions.com.br",
                    Observacao = "Cliente do segmento de tecnologia. Contrato de 36 meses.",
                    Ativo = true,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Now
                },
                new Central_BackEnd.Models.Implantacao.Cliente
                {
                    Nome = "Indústria Aurora Ltda",
                    Cnpj = "98.765.432/0001-10",
                    Contato = "implantacao@aurora.ind.br",
                    Observacao = "Foco em módulos de cobrança. Implantação em fases.",
                    Ativo = true,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Now
                },
                new Central_BackEnd.Models.Implantacao.Cliente
                {
                    Nome = "Grupo Vértice",
                    Cnpj = "11.222.333/0001-44",
                    Contato = "ti@vertice.com",
                    Observacao = "Cliente novo, em fase de kickoff.",
                    Ativo = true,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Now
                }
            );
            db.SaveChanges();
        }

        // Seed IMPL_Projeto: 1 IMPL + 1 CIAA
        if (!db.Projetos.Any())
        {
            var eqImpl = db.Equipes.FirstOrDefault(e => e.Nome == "IMPLANTACAO");
            var eqCiaa = db.Equipes.FirstOrDefault(e => e.Nome == "CIAA");
            var tipoCliente = db.TiposProjeto.FirstOrDefault(t => t.Codigo == "CLIENTE");
            var tipoCiaa = db.TiposProjeto.FirstOrDefault(t => t.Codigo == "PROJETO_CIAA");
            var colBacklog = db.ColunasKanban.FirstOrDefault(c => c.Nome == "BACKLOG");
            var colAFazer = db.ColunasKanban.FirstOrDefault(c => c.Nome == "A FAZER");
            var colAndamento = db.ColunasKanban.FirstOrDefault(c => c.Nome == "EM ANDAMENTO");
            var colHomologacao = db.ColunasKanban.FirstOrDefault(c => c.Nome == "HOMOLOGACAO");
            var colConcluido = db.ColunasKanban.FirstOrDefault(c => c.Nome == "CONCLUIDO");
            var clienteTech = db.Clientes.FirstOrDefault(c => c.Nome == "Tech Solutions S/A");
            var clienteAurora = db.Clientes.FirstOrDefault(c => c.Nome == "Indústria Aurora Ltda");

            // 1) IMPL-0001 — Implantação Tech Solutions (60% concluído)
            var p1 = new Central_BackEnd.Models.Implantacao.Projeto
            {
                Codigo = "IMP-0001",
                Nome = "Implantação Tech Solutions S/A",
                Descricao = "Implantação completa do Actyon no cliente Tech Solutions.\n\nFases: kickoff → parametrização → treinamento → homologação → go live.\nEscopo inclui 3 carteiras (Cobrança, Financeiro, RH) e 2 integrações bancárias.",
                EquipeId = eqImpl!.Id,
                TipoProjetoId = tipoCliente!.Id,
                ClienteId = clienteTech!.Id,
                ResponsavelId = "admin",
                CriadorId = "admin",
                Status = Central_BackEnd.Models.Implantacao.StatusProjeto.EmAndamento,
                ColunaKanbanId = colAndamento!.Id,
                Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeProjeto.Alta,
                Progresso = 60,
                DataInicio = DateTime.Today.AddDays(-45),
                DataPrevisao = DateTime.Today.AddDays(20),
                HorasPlanejadas = 320,
                HorasRealizadas = 192,
                Observacao = "Cliente receptivo. Parametrização avançando bem. Próximo: agendar treinamento com a equipe financeira.",
                UsuarioInclusao = "admin",
                DataInclusao = DateTime.Today.AddDays(-45)
            };
            db.Projetos.Add(p1);
            db.SaveChanges();

            // Tarefas do IMP-0001
            db.Tarefas.AddRange(
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "KICKOFF").Id,
                    ColunaKanbanId = colConcluido!.Id, Ordem = 1,
                    Titulo = "Kickoff com a diretoria",
                    Descricao = "Alinhamento de objetivos, cronograma e stakeholders do projeto.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.Concluida,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(-40),
                    DataConclusao = DateTime.Today.AddDays(-42),
                    HorasEstimadas = 8, HorasRealizadas = 8,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-45)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "PARAMETRIZACAO").Id,
                    ColunaKanbanId = colConcluido!.Id, Ordem = 2,
                    Titulo = "Levantar parâmetros da carteira de cobrança",
                    Descricao = "Mapear regras de negócio: faixas de atraso, juros, descontos, distribuição.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.Concluida,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(-25),
                    DataConclusao = DateTime.Today.AddDays(-22),
                    HorasEstimadas = 24, HorasRealizadas = 28,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-40)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "PARAMETRIZACAO").Id,
                    ColunaKanbanId = colConcluido!.Id, Ordem = 3,
                    Titulo = "Importar títulos iniciais (abertura)",
                    Descricao = "Carga inicial de 2.500 títulos via planilha de migração.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.Concluida,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Media,
                    DataPrevisao = DateTime.Today.AddDays(-15),
                    DataConclusao = DateTime.Today.AddDays(-12),
                    HorasEstimadas = 12, HorasRealizadas = 10,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-30)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "PARAMETRIZACAO").Id,
                    ColunaKanbanId = colAndamento!.Id, Ordem = 4,
                    Titulo = "Configurar integrações com Sicoob e Caixa",
                    Descricao = "Homologar remessa CNAB 240 e retorno. Validar arquivos com o banco.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.EmAndamento,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Urgente,
                    DataPrevisao = DateTime.Today.AddDays(-3),
                    HorasEstimadas = 40, HorasRealizadas = 28,
                    Bloqueada = true,
                    MotivoBloqueio = "Aguardando retorno do banco sobre layout do arquivo de retorno.",
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-15)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "TREINAMENTO").Id,
                    ColunaKanbanId = colAFazer!.Id, Ordem = 5,
                    Titulo = "Agendar treinamento com equipe financeira",
                    Descricao = "2 turmas, 4h cada, focadas em carteira de cobrança e fechamento diário.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.AFazer,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(10),
                    HorasEstimadas = 16,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-5)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "HOMOLOGACAO").Id,
                    ColunaKanbanId = colAFazer!.Id, Ordem = 6,
                    Titulo = "Homologar fluxo completo com cliente",
                    Descricao = "Roda 5 títulos do início ao fim, com cliente acompanhando.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.AFazer,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Media,
                    DataPrevisao = DateTime.Today.AddDays(15),
                    HorasEstimadas = 12,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-5)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = db.Etapas.First(e => e.Nome == "GO LIVE").Id,
                    ColunaKanbanId = colBacklog!.Id, Ordem = 7,
                    Titulo = "Definir data do go live",
                    Descricao = "Confirmar com diretoria a data de entrada em produção.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.AFazer,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Media,
                    DataPrevisao = DateTime.Today.AddDays(20),
                    HorasEstimadas = 4,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-2)
                }
            );
            db.SaveChanges();

            // Comentários no IMP-0001
            var tar1 = db.Tarefas.First(t => t.Titulo.Contains("Kickoff"));
            var tar2 = db.Tarefas.First(t => t.Titulo.Contains("integrações"));
            db.ComentariosTarefa.AddRange(
                new Central_BackEnd.Models.Implantacao.ComentarioTarefa
                {
                    TarefaId = tar1.Id, AutorId = "admin",
                    Texto = "Cliente aprovou cronograma. Stakeholders definidos: CFO (patrocinador), Controller (gestor), 2 analistas (operadores).",
                    DataInclusao = DateTime.Today.AddDays(-42)
                },
                new Central_BackEnd.Models.Implantacao.ComentarioTarefa
                {
                    TarefaId = tar2.Id, AutorId = "admin",
                    Texto = "Sicoob enviou layout do CNAB 240 em 02/09. Iniciando homologação do arquivo de remessa. Retorno ainda pendente — aberto chamado #4521 com o banco.",
                    DataInclusao = DateTime.Today.AddDays(-1)
                }
            );
            db.SaveChanges();

            // 2) CIAA-0001 — Automação de abertura de chamados (35% concluído)
            var p2 = new Central_BackEnd.Models.Implantacao.Projeto
            {
                Codigo = "CIAA-0001",
                Nome = "Agente IA — Classificação de Chamados",
                Descricao = "Projeto de automação com IA para classificar e rotear chamados automaticamente.\n\nObjetivo: reduzir tempo de triagem em 60% e melhorar a assertividade do primeiro atendimento.\nStack: n8n + API Actyon + prompt engineering + integração com sistema de tickets.",
                EquipeId = eqCiaa!.Id,
                TipoProjetoId = tipoCiaa!.Id,
                ClienteId = null,
                ResponsavelId = "admin",
                CriadorId = "admin",
                Status = Central_BackEnd.Models.Implantacao.StatusProjeto.EmAndamento,
                ColunaKanbanId = colAndamento!.Id,
                Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeProjeto.Alta,
                Progresso = 35,
                DataInicio = DateTime.Today.AddDays(-30),
                DataPrevisao = DateTime.Today.AddDays(45),
                HorasPlanejadas = 200,
                HorasRealizadas = 70,
                Observacao = "MVP em validação. Prompt principal com acurácia de 78% em testes.",
                UsuarioInclusao = "admin",
                DataInclusao = DateTime.Today.AddDays(-30)
            };
            db.Projetos.Add(p2);
            db.SaveChanges();

            db.Tarefas.AddRange(
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = db.Etapas.First(e => e.Nome == "LEVANTAMENTO").Id,
                    ColunaKanbanId = colConcluido!.Id, Ordem = 1,
                    Titulo = "Mapear categorias de chamados dos últimos 6 meses",
                    Descricao = "Amostra de 2.000 chamados para identificar padrões de classificação.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.Concluida,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(-25),
                    DataConclusao = DateTime.Today.AddDays(-23),
                    HorasEstimadas = 16, HorasRealizadas = 14,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-30)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = db.Etapas.First(e => e.Nome == "DESENHO").Id,
                    ColunaKanbanId = colConcluido!.Id, Ordem = 2,
                    Titulo = "Definir arquitetura do agente (n8n + LLM)",
                    Descricao = "Fluxo: webhook → LLM → classificação → router → ticket. Latência alvo: 3s.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.Concluida,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(-20),
                    DataConclusao = DateTime.Today.AddDays(-18),
                    HorasEstimadas = 12, HorasRealizadas = 14,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-25)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = db.Etapas.First(e => e.Nome == "DESENVOLVIMENTO").Id,
                    ColunaKanbanId = colAndamento!.Id, Ordem = 3,
                    Titulo = "Implementar fluxo principal no n8n",
                    Descricao = "Webhook + LLM + tratamento de erros + retry. Logs estruturados.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.EmAndamento,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(-5),
                    HorasEstimadas = 40, HorasRealizadas = 30,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-20)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = db.Etapas.First(e => e.Nome == "DESENVOLVIMENTO").Id,
                    ColunaKanbanId = colAFazer!.Id, Ordem = 4,
                    Titulo = "Construir prompt com few-shot examples",
                    Descricao = "Iterar prompt principal até atingir acurácia >85% em validação.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.AFazer,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Alta,
                    DataPrevisao = DateTime.Today.AddDays(5),
                    HorasEstimadas = 20,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-15)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = db.Etapas.First(e => e.Nome == "TESTES").Id,
                    ColunaKanbanId = colAFazer!.Id, Ordem = 5,
                    Titulo = "Rodar suite de 200 chamados históricos",
                    Descricao = "Comparar classificação do agente vs classificação humana (ground truth).",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.AFazer,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Media,
                    DataPrevisao = DateTime.Today.AddDays(20),
                    HorasEstimadas = 16,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-10)
                },
                new Central_BackEnd.Models.Implantacao.Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = db.Etapas.First(e => e.Nome == "PUBLICACAO").Id,
                    ColunaKanbanId = colBacklog!.Id, Ordem = 6,
                    Titulo = "Publicar agente em produção",
                    Descricao = "Deploy com feature flag. Monitorar 1 semana antes de expandir.",
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = Central_BackEnd.Models.Implantacao.StatusTarefa.AFazer,
                    Prioridade = Central_BackEnd.Models.Implantacao.PrioridadeTarefa.Media,
                    DataPrevisao = DateTime.Today.AddDays(40),
                    HorasEstimadas = 8,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-5)
                }
            );
            db.SaveChanges();

            var tarCiaa = db.Tarefas.First(t => t.Titulo.Contains("prompt principal") || t.Titulo.Contains("n8n"));
            db.ComentariosTarefa.Add(
                new Central_BackEnd.Models.Implantacao.ComentarioTarefa
                {
                    TarefaId = tarCiaa.Id, AutorId = "admin",
                    Texto = "Acurácia subiu de 62% → 78% depois do ajuste no few-shot. Próximo passo: incluir mais exemplos negativos (chamados ambíguos).",
                    DataInclusao = DateTime.Today.AddDays(-2)
                }
            );
            db.SaveChanges();
        }

        // Seed IMPL_Agenda: 5 eventos de exemplo
        if (!db.Agenda.Any())
        {
            var eqImpl = db.Equipes.FirstOrDefault(e => e.Nome == "IMPLANTACAO");
            var eqCiaa = db.Equipes.FirstOrDefault(e => e.Nome == "CIAA");
            var p1 = db.Projetos.FirstOrDefault(p => p.Codigo == "IMP-0001");
            var p2 = db.Projetos.FirstOrDefault(p => p.Codigo == "CIAA-0001");

            db.Agenda.AddRange(
                new Central_BackEnd.Models.Implantacao.AgendaItem
                {
                    OperadorId = "admin",
                    Titulo = "Kickoff Implantação Tech Solutions",
                    Descricao = "Reunião inicial de alinhamento com a diretoria do cliente Tech Solutions.",
                    Local = "Sala de reuniões 1 / Teams",
                    DataInicio = DateTime.Today.AddDays(-30).AddHours(9),
                    DataFim = DateTime.Today.AddDays(-30).AddHours(11),
                    DiaInteiro = false,
                    Cor = "#0f4c81",
                    Tipo = Central_BackEnd.Models.Implantacao.AgendaTipo.Reuniao,
                    Visibilidade = Central_BackEnd.Models.Implantacao.AgendaVisibilidade.Publico,
                    ProjetoId = p1?.Id,
                    Recorrente = false,
                    PadraoRecorrencia = Central_BackEnd.Models.Implantacao.AgendaRecorrencia.Nenhuma,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Today.AddDays(-35)
                },
                new Central_BackEnd.Models.Implantacao.AgendaItem
                {
                    OperadorId = "admin",
                    Titulo = "Treinamento Financeiro - Turma 1",
                    Descricao = "Treinamento da equipe financeira do cliente Tech Solutions sobre o módulo de cobrança.",
                    Local = "Auditório / Teams",
                    DataInicio = DateTime.Today.AddDays(-10).AddHours(14),
                    DataFim = DateTime.Today.AddDays(-10).AddHours(18),
                    DiaInteiro = false,
                    Cor = "#16a34a",
                    Tipo = Central_BackEnd.Models.Implantacao.AgendaTipo.Treinamento,
                    Visibilidade = Central_BackEnd.Models.Implantacao.AgendaVisibilidade.Equipe,
                    ProjetoId = p1?.Id,
                    Recorrente = false,
                    PadraoRecorrencia = Central_BackEnd.Models.Implantacao.AgendaRecorrencia.Nenhuma,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Today.AddDays(-15)
                },
                new Central_BackEnd.Models.Implantacao.AgendaItem
                {
                    OperadorId = "admin",
                    Titulo = "Reunião Semanal CIAA - Agente IA",
                    Descricao = "Acompanhamento semanal do desenvolvimento do Agente IA de classificação de chamados.",
                    Local = "Teams",
                    DataInicio = DateTime.Today.AddDays(-3).AddHours(10),
                    DataFim = DateTime.Today.AddDays(-3).AddHours(11),
                    DiaInteiro = false,
                    Cor = "#7c3aed",
                    Tipo = Central_BackEnd.Models.Implantacao.AgendaTipo.Reuniao,
                    Visibilidade = Central_BackEnd.Models.Implantacao.AgendaVisibilidade.Equipe,
                    ProjetoId = p2?.Id,
                    Recorrente = true,
                    PadraoRecorrencia = Central_BackEnd.Models.Implantacao.AgendaRecorrencia.Semanal,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Today.AddDays(-20)
                },
                new Central_BackEnd.Models.Implantacao.AgendaItem
                {
                    OperadorId = "admin",
                    Titulo = "Atendimento Cliente Aurora - Homologação",
                    Descricao = "Sessão de homologação do fluxo de cobrança com a equipe do cliente Indústria Aurora.",
                    Local = "Cliente / Presencial",
                    DataInicio = DateTime.Today.AddDays(2).AddHours(9),
                    DataFim = DateTime.Today.AddDays(2).AddHours(13),
                    DiaInteiro = false,
                    Cor = "#d97706",
                    Tipo = Central_BackEnd.Models.Implantacao.AgendaTipo.Atendimento,
                    Visibilidade = Central_BackEnd.Models.Implantacao.AgendaVisibilidade.Publico,
                    ProjetoId = p1?.Id,
                    Recorrente = false,
                    PadraoRecorrencia = Central_BackEnd.Models.Implantacao.AgendaRecorrencia.Nenhuma,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Today.AddDays(-1)
                },
                new Central_BackEnd.Models.Implantacao.AgendaItem
                {
                    OperadorId = "admin",
                    Titulo = "Foco Pessoal - Estudo Arquitetura n8n",
                    Descricao = "Bloco de tempo reservado para estudo avançado de workflows n8n e integração com LLMs.",
                    Local = "Remoto",
                    DataInicio = DateTime.Today.AddDays(1).AddHours(8),
                    DataFim = DateTime.Today.AddDays(1).AddHours(12),
                    DiaInteiro = false,
                    Cor = "#94a3b8",
                    Tipo = Central_BackEnd.Models.Implantacao.AgendaTipo.Pessoal,
                    Visibilidade = Central_BackEnd.Models.Implantacao.AgendaVisibilidade.Privado,
                    ProjetoId = null,
                    Recorrente = false,
                    PadraoRecorrencia = Central_BackEnd.Models.Implantacao.AgendaRecorrencia.Nenhuma,
                    UsuarioInclusao = "admin",
                    DataInclusao = DateTime.Today
                }
            );
            db.SaveChanges();
        }
    }
    }

app.Run();
