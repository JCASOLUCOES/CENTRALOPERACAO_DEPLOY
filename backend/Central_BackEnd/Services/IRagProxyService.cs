using Central_BackEnd.Models;

namespace Central_BackEnd.Services;

public interface IRagProxyService
{
    Task<RagChatResponse> ChatAsync(RagChatRequest request);
}