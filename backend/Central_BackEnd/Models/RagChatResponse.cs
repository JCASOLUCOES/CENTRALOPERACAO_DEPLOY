using System.Text.Json.Serialization;

namespace Central_BackEnd.Models;

public class RagChatResponse
{
    [JsonPropertyName("resposta")]
    public string Resposta { get; set; } = string.Empty;

    [JsonPropertyName("documentos")]
    public List<string> Documentos { get; set; } = new();

    [JsonPropertyName("tempoProcessamento")]
    public double TempoProcessamento { get; set; }

    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }
}