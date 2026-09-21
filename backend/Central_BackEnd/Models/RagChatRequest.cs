using System.Text.Json.Serialization;

namespace Central_BackEnd.Models;

public class RagChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("workspaceId")]
    public string WorkspaceId { get; set; } = string.Empty;

    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "query";

    [JsonPropertyName("sessionId")]
    public string? SessionId { get; set; }
}