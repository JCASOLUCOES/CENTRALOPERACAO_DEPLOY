using System.Text.Json;
using Central_BackEnd.Data;
using Central_BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services;

public class RagProxyService : IRagProxyService
{
    private readonly string _baseUrl;
    private readonly string _apiKey;
    private readonly string _defaultWorkspaceId;
    private readonly int _timeoutSeconds;
    private readonly bool _enableMockFallback;
    private readonly AppDbContext _dbContext;

    public RagProxyService(IConfiguration configuration, AppDbContext dbContext)
    {
        var anythingllm = configuration.GetSection("AnythingLLM");
        _baseUrl = anythingllm["BaseUrl"] ?? "http://localhost:3001/api/v1";
        _apiKey = anythingllm["ApiKey"] ?? string.Empty;
        _defaultWorkspaceId = anythingllm["DefaultWorkspaceId"] ?? "suporte";
        _timeoutSeconds = anythingllm.GetValue<int>("TimeoutSeconds", 30);
        _enableMockFallback = anythingllm.GetValue<bool>("EnableMockFallback", true);
        _dbContext = dbContext;
    }

    public async Task<RagChatResponse> ChatAsync(RagChatRequest request)
    {
        var workspaceId = !string.IsNullOrWhiteSpace(request.WorkspaceId)
            ? request.WorkspaceId
            : _defaultWorkspaceId;

        var payload = new
        {
            message = request.Message,
            workspaceId = workspaceId,
            mode = request.Mode,
            sessionId = request.SessionId
        };

        var jsonPayload = JsonSerializer.Serialize(payload);
        var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

        var requestUrl = $"{_baseUrl}/chat";

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(_timeoutSeconds);

        if (!string.IsNullOrEmpty(_apiKey))
        {
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
        }

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsync(requestUrl, content);
        }
        catch (Exception)
        {
            if (!_enableMockFallback)
                throw;

            return MockResponse(request.Message, workspaceId);
        }

        if (response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<RagChatResponse>(responseBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new RagChatResponse();
        }

        if (_enableMockFallback)
        {
            return MockResponse(request.Message, workspaceId);
        }

        throw new Exception($"AnythingLLM API retornou {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
    }

    private RagChatResponse MockResponse(string message, string workspaceId)
    {
        var lowerMsg = message.ToLowerInvariant();
        var termo = ExtractTerm(message);

        var (registros, glossarioTermo) = GetDatabaseContextInfo(workspaceId);

        var respostaBase = workspaceId switch
        {
            "suporte" => "Para solicitar suporte, acesse o menu Suporte -> Novo chamado e preencha os campos necessarios.",
            "financeiro" => "Para consulta financeira, acesse o menu Financeiro -> Dashboard e revise os relatorios atuais.",
            "implantacao" => "Para implantação, acesse o menu Implantação -> Projetos e verifique o status dos projetos ativos.",
            "glossario" => $"Termo consultado: {termo}",
            _ => "Como posso ajudar?"
        };

        var contextoBanco = registros > 0
            ? $"📊 Contexto do banco: Tabela relevante tem {registros} registros ativos."
            : string.Empty;

        var glossarioInfo = glossarioTermo != null
            ? $"📚 Glossário: {termo} = {glossarioTermo}"
            : string.Empty;

        var documentos = new List<string>
        {
            $"{workspaceId}-faq.md",
            $"{workspaceId}-procedimento.md"
        };

        return new RagChatResponse
        {
            Resposta = $"{respostaBase}\n\n{contextoBanco}\n{glossarioInfo}",
            Documentos = documentos,
            TempoProcessamento = 1.23,
            SessionId = Guid.NewGuid().ToString()
        };
    }

    private (int, string?) GetDatabaseContextInfo(string workspaceId)
    {
        int registros = 0;
        string? glossarioTermo = null;

        switch (workspaceId)
        {
            case "suporte":
                registros = _dbContext.Operadores.Count();
                glossarioTermo = "Devedor: Pessoa juridica ou fisica com obrigacao de pagamento";
                break;
            case "financeiro":
                break;
            case "implantacao":
                break;
            case "glossario":
                registros = _dbContext.Operadores.Count();
                glossarioTermo = "Implantação: Processo de deploy do sistema Actyon";
                break;
        }

        return (registros, glossarioTermo);
    }

    private string ExtractTerm(string message)
    {
        var lower = message.ToLowerInvariant();
        if (lower.Contains("devedor")) return "Devedor";
        if (lower.Contains("cobranca")) return "Cobrança";
        if (lower.Contains("implantação")) return "Implantação";
        if (lower.Contains("glossário")) return "Glossário";
        return "termo";
    }
}