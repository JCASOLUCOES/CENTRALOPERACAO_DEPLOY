using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

/// <summary>
/// Configuracao de conexao SQL Server para o modulo Banco de Dados.
/// Precedencia de leitura:
///   1) Variavel de ambiente (DB_EXPLORER_*)
///   2) Secao "DatabaseExplorer" do appsettings.json
///   3) Vazio (servico nao conectado)
///
/// A senha NUNCA e logada, NUNCA retornada em DTOs e NUNCA commitada.
/// </summary>
public class DatabaseConnectionConfig
{
    public string Servidor { get; set; } = "";
    public int Porta { get; set; } = 1433;
    public string Banco { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string Senha { get; set; } = "";
    public bool Encrypt { get; set; } = false;
    public bool TrustServerCertificate { get; set; } = true;

    public string BuildConnectionString()
    {
        var builder = new SqlConnectionStringBuilder
        {
            DataSource = string.IsNullOrEmpty(Servidor) ? "" : (Porta > 0 ? $"{Servidor},{Porta}" : Servidor),
            InitialCatalog = Banco,
            UserID = Usuario,
            Password = Senha,
            Encrypt = Encrypt,
            TrustServerCertificate = TrustServerCertificate,
            ConnectTimeout = 10,
            ApplicationName = "CentralDeOperacao-DatabaseExplorer"
        };
        return builder.ConnectionString;
    }

    public static DatabaseConnectionConfig FromConfiguration(IConfiguration config)
    {
        // Variaveis de ambiente tem prioridade maxima
        var servidor = Environment.GetEnvironmentVariable("DB_EXPLORER_SERVIDOR")
                       ?? config["DatabaseExplorer:Servidor"] ?? "";
        var portaStr = Environment.GetEnvironmentVariable("DB_EXPLORER_PORTA")
                       ?? config["DatabaseExplorer:Porta"];
        var banco = Environment.GetEnvironmentVariable("DB_EXPLORER_BANCO")
                     ?? config["DatabaseExplorer:Banco"] ?? "";
        var usuario = Environment.GetEnvironmentVariable("DB_EXPLORER_USUARIO")
                      ?? config["DatabaseExplorer:Usuario"] ?? "";
        var senha = Environment.GetEnvironmentVariable("DB_EXPLORER_SENHA")
                    ?? config["DatabaseExplorer:Senha"] ?? "";

        if (string.IsNullOrEmpty(servidor)) servidor = Environment.GetEnvironmentVariable("DB_EXPLORER_SERVIDOR") ?? "";
        if (string.IsNullOrEmpty(banco)) banco = Environment.GetEnvironmentVariable("DB_EXPLORER_BANCO") ?? "";
        if (string.IsNullOrEmpty(usuario)) usuario = Environment.GetEnvironmentVariable("DB_EXPLORER_USUARIO") ?? "";

        if (!int.TryParse(portaStr, out var porta)) porta = 1433;

        return new DatabaseConnectionConfig
        {
            Servidor = servidor,
            Porta = porta,
            Banco = banco,
            Usuario = usuario,
            Senha = senha,
            Encrypt = bool.TryParse(Environment.GetEnvironmentVariable("DB_EXPLORER_ENCRYPT")
                                     ?? config["DatabaseExplorer:Encrypt"], out var e) && e,
            TrustServerCertificate = bool.TryParse(Environment.GetEnvironmentVariable("DB_EXPLORER_TRUST")
                                      ?? config["DatabaseExplorer:TrustServerCertificate"], out var t) && t
        };
    }

    public DatabaseConnectionConfig Sanitized() => new()
    {
        Servidor = Servidor,
        Porta = Porta,
        Banco = Banco,
        Usuario = Usuario,
        Senha = string.IsNullOrEmpty(Senha) ? null! : "***",
        Encrypt = Encrypt,
        TrustServerCertificate = TrustServerCertificate
    };
}

public interface IDatabaseConnectionService
{
    DatabaseConnectionConfig GetConfig();
    Task<SqlConnection> OpenAsync(CancellationToken ct = default);
    bool IsConfigured();
}

public class DatabaseConnectionService : IDatabaseConnectionService
{
    private readonly DatabaseConnectionConfig _config;
    private readonly ILogger<DatabaseConnectionService> _logger;

    public DatabaseConnectionService(IConfiguration config, ILogger<DatabaseConnectionService> logger)
    {
        _config = DatabaseConnectionConfig.FromConfiguration(config);
        _logger = logger;
    }

    public DatabaseConnectionConfig GetConfig() => _config;

    public bool IsConfigured() =>
        !string.IsNullOrWhiteSpace(_config.Servidor) &&
        !string.IsNullOrWhiteSpace(_config.Banco) &&
        !string.IsNullOrWhiteSpace(_config.Usuario);

    public async Task<SqlConnection> OpenAsync(CancellationToken ct = default)
    {
        if (!IsConfigured())
            throw new InvalidOperationException("Conexao SQL Server nao configurada. Va em Banco de Dados > Configuracao.");
        var conn = new SqlConnection(_config.BuildConnectionString());
        await conn.OpenAsync(ct);
        return conn;
    }
}
